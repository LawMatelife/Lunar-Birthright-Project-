import base64
import html
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field


DISCLAIMER = "Symbolic commemorative registry only—no legal ownership of lunar land is conveyed."


class RegistryDecision(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    excluded: bool
    reason: str = Field(default="", max_length=500)


def _mint_gate_open() -> bool:
    enabled = os.getenv("ENABLE_POLYGON_MINT", "false").strip().lower() == "true"
    approved = os.getenv("MINTING_RELEASE_GATE", "closed").strip().lower() == "approved"
    return enabled and approved


def _admin_or_403(current_user: dict) -> dict:
    if not current_user or not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _certificate_number(user: dict) -> str:
    return str(user.get("certificate_number") or "").strip()


def _citizen_number(cert_number: str) -> int:
    tail = cert_number.split("-")[-1] if cert_number else "0"
    return int(tail) if tail.isdigit() else 0


def _issue_date(certificate: dict) -> str:
    value = certificate.get("purchased_at") or certificate.get("issued_at") or ""
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).strftime("%d %B %Y")
    text = str(value).strip()
    if not text:
        return datetime.now(timezone.utc).strftime("%d %B %Y")
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed.strftime("%d %B %Y")
    except Exception:
        return text[:10]


def _safe_email_html(user: dict, plot: dict, cert_number: str, verification_url: str) -> str:
    name = html.escape(str(user.get("full_name") or "Lunar Citizen"))
    certificate_id = html.escape(cert_number)
    lunar_sector = html.escape(str(user.get("lunar_sector") or plot.get("lunar_sector") or "Recorded lunar location"))
    birth_moon = html.escape(str(plot.get("birth_moon_phase") or "Recorded Birth Moon"))
    verify = html.escape(verification_url, quote=True)
    return f"""<!doctype html>
<html><body style="margin:0;background:#050508;color:#f7f1df;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px">
<table role="presentation" width="100%" style="max-width:620px;background:#0b0b0f;border:1px solid #d4af37;border-radius:14px">
<tr><td style="padding:32px">
<p style="color:#d4af37;font-weight:700;letter-spacing:2px;margin:0 0 10px">LUNAR BIRTHRIGHT</p>
<h1 style="font-size:27px;margin:0 0 18px;color:#fff">Your personalised certificate is ready</h1>
<p style="font-size:17px;line-height:1.6">{name}, your Lunar Birthright certificate has been issued and a PDF copy is attached to this email.</p>
<table role="presentation" width="100%" style="margin:24px 0;background:#121218;border-radius:10px;padding:18px">
<tr><td style="padding:6px;color:#bda864">Certificate ID</td><td style="padding:6px;color:#fff">{certificate_id}</td></tr>
<tr><td style="padding:6px;color:#bda864">Birth Moon</td><td style="padding:6px;color:#fff">{birth_moon}</td></tr>
<tr><td style="padding:6px;color:#bda864">Lunar location</td><td style="padding:6px;color:#fff">{lunar_sector}</td></tr>
</table>
<p><a href="{verify}" style="display:inline-block;background:#d4af37;color:#080808;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Verify certificate</a></p>
<p style="color:#d9c98f;font-size:13px;line-height:1.5;margin-top:28px">{DISCLAIMER}</p>
</td></tr></table></td></tr></table></body></html>"""


def install(server) -> None:
    """Install production hardening without creating a second auth or registry system."""
    if getattr(server, "_lbp_runtime_hardening_installed", False):
        return
    server._lbp_runtime_hardening_installed = True

    original_process_certificate_and_nft = server.process_certificate_and_nft

    async def process_paid_certificate(user_id: str, stripe_session_id: str):
        # Polygon/Crossmint is a separate release gate. It cannot be entered just
        # because Stripe payment succeeds.
        if _mint_gate_open():
            return await original_process_certificate_and_nft(user_id, stripe_session_id)

        cert_filter = {
            "user_id": user_id,
            "stripe_session_id": stripe_session_id,
            "payment_status": "paid",
        }
        certificate = await server.db.certificates.find_one(cert_filter, {"_id": 0})
        if not certificate:
            server.logger.warning("Paid certificate record not found for fulfillment: %s", stripe_session_id)
            return

        user = await server.db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            server.logger.error("User not found for paid certificate fulfillment: %s", user_id)
            await server.db.certificates.update_one(
                cert_filter,
                {"$set": {"fulfillment_status": "failed", "fulfillment_error": "user_not_found"}},
            )
            return

        plot = await server.db.plots.find_one({"owner_id": user_id}, {"_id": 0}) or {}
        cert_number = _certificate_number(user)
        urls = server._build_certificate_urls(user_id, cert_number) if cert_number else {}
        now = datetime.now(timezone.utc).isoformat()

        # Certificate delivery is independent of the blockchain layer. No token
        # placeholder or invented token value is written while the mint gate is closed.
        await server.db.certificates.update_one(
            cert_filter,
            {"$set": {
                "certificate_ready": True,
                "fulfillment_status": "certificate_ready",
                "fulfillment_updated_at": now,
                "nft_minted": False,
                "nft_status": "not_requested",
                "nft_mocked": False,
                **urls,
            }},
        )
        certificate = await server.db.certificates.find_one(cert_filter, {"_id": 0}) or certificate

        # Email exactly one PDF copy at a time. Failed/skipped delivery can be
        # retried by a later verified status check without duplicating successful mail.
        email_claim = await server.db.certificates.update_one(
            {
                **cert_filter,
                "email_delivery_status": {"$nin": ["sending", "success"]},
            },
            {"$set": {"email_delivery_status": "sending", "email_delivery_attempted_at": now}},
        )
        if email_claim.modified_count:
            try:
                pdf_bytes = server.generate_premium_certificate_pdf(
                    full_name=user.get("full_name", "Lunar Citizen"),
                    citizen_number=_citizen_number(cert_number),
                    certificate_number=cert_number,
                    message_to_future=user.get("message", "") or user.get("message_to_the_future", "") or "",
                    issue_date=_issue_date(certificate),
                    lunar_sector=user.get("lunar_sector") or plot.get("lunar_sector") or "Recorded lunar location",
                    birth_date=plot.get("birth_date", user.get("birth_date", "")),
                    birth_moon_phase=plot.get("birth_moon_phase", ""),
                    birth_moon_illumination=plot.get("birth_moon_illumination"),
                    birth_moon_region=plot.get("birth_moon_region", ""),
                    is_gift=bool(user.get("is_gift")),
                    gift_occasion=user.get("gift_occasion", "") or "",
                )
                verification_url = urls.get("verification_url") or f"{server.FRONTEND_URL}/verify/{cert_number}"
                email_result = await server.send_email_async(
                    to_email=user.get("email"),
                    subject="🌙 Your Lunar Birthright certificate is ready",
                    html_content=_safe_email_html(user, plot, cert_number, verification_url),
                    attachments=[{
                        "content": base64.b64encode(pdf_bytes).decode("ascii"),
                        "filename": f"Lunar-Birthright-{cert_number or 'Certificate'}.pdf",
                    }],
                )
                email_status = str((email_result or {}).get("status") or "error")
                email_update = {
                    "email_delivery_status": email_status,
                    "email_delivery_updated_at": datetime.now(timezone.utc).isoformat(),
                }
                if email_status == "success":
                    email_update["email_delivered_at"] = datetime.now(timezone.utc).isoformat()
                    email_update["email_message_id"] = (email_result or {}).get("email_id")
                else:
                    email_update["email_delivery_error"] = str((email_result or {}).get("error") or (email_result or {}).get("reason") or "delivery_not_completed")[:500]
                await server.db.certificates.update_one(cert_filter, {"$set": email_update})
            except Exception as exc:
                server.logger.exception("Certificate email delivery failed for %s", stripe_session_id)
                await server.db.certificates.update_one(
                    cert_filter,
                    {"$set": {
                        "email_delivery_status": "error",
                        "email_delivery_updated_at": datetime.now(timezone.utc).isoformat(),
                        "email_delivery_error": str(exc)[:500],
                    }},
                )

        # One admin alert per fulfilled payment, independent of email retries.
        notification_claim = await server.db.certificates.update_one(
            {**cert_filter, "admin_purchase_notified": {"$ne": True}},
            {"$set": {"admin_purchase_notified": True, "admin_purchase_notified_at": now}},
        )
        if notification_claim.modified_count:
            notification_id = await server.create_admin_notification(
                notification_type="new_upgrade",
                title="New Lunar Birthright purchase",
                message=f"{user.get('full_name', 'A citizen')} completed a verified certificate purchase.",
                user_id=user_id,
                user_name=user.get("full_name", ""),
                amount=float(certificate.get("amount_paid") or 0),
            )
            if not notification_id:
                await server.db.certificates.update_one(cert_filter, {"$set": {"admin_purchase_notified": False}})

        latest = await server.db.certificates.find_one(cert_filter, {"_id": 0, "email_delivery_status": 1}) or {}
        final_status = "complete" if latest.get("email_delivery_status") == "success" else "complete_email_pending"
        await server.db.certificates.update_one(
            cert_filter,
            {"$set": {"fulfillment_status": final_status, "fulfilled_at": datetime.now(timezone.utc).isoformat()}},
        )

    # Existing webhook and return-page verification both perform a global lookup
    # of this function, so patching it keeps one payment path while closing minting.
    server.process_certificate_and_nft = process_paid_certificate

    async def registry_stats():
        excluded_ids = await server.db.registry_exclusions.distinct(
            "target_id", {"target_type": "user", "excluded": True}
        )
        retained_query = {"id": {"$nin": excluded_ids}} if excluded_ids else {}
        citizens = await server.db.users.count_documents(retained_query)
        country_query = dict(retained_query)
        country_query["country"] = {"$nin": [None, ""]}
        countries = await server.db.users.distinct("country", country_query)
        countries = [str(c).strip() for c in countries if str(c or "").strip()]
        return {
            "citizens": int(citizens),
            "countries": int(len(set(countries))),
            "excluded_records": int(len(excluded_ids)),
            "source": "audited_atlas_registry",
        }

    async def registry_audit(
        q: Optional[str] = Query(default=None, max_length=120),
        limit: int = Query(default=100, ge=1, le=250),
        current_user: dict = Depends(server.get_current_user),
    ):
        _admin_or_403(current_user)
        query = {}
        if q:
            query["$or"] = [
                {"id": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"certificate_number": {"$regex": q, "$options": "i"}},
                {"full_name": {"$regex": q, "$options": "i"}},
            ]
        users = await server.db.users.find(
            query,
            {"_id": 0, "password_hash": 0},
        ).sort("created_at", -1).limit(limit).to_list(limit)
        user_ids = [str(u.get("id") or "") for u in users if u.get("id")]
        decisions = await server.db.registry_exclusions.find(
            {"target_type": "user", "target_id": {"$in": user_ids}},
            {"_id": 0},
        ).to_list(max(limit, 1))
        decision_map = {str(d.get("target_id")): d for d in decisions}
        records = []
        for user in users:
            uid = str(user.get("id") or "")
            decision = decision_map.get(uid, {})
            records.append({
                "id": uid,
                "full_name": user.get("full_name", ""),
                "email": user.get("email", ""),
                "country": user.get("country", ""),
                "certificate_number": user.get("certificate_number", ""),
                "created_at": user.get("created_at", ""),
                "is_admin": bool(user.get("is_admin", False)),
                "excluded": bool(decision.get("excluded", False)),
                "exclusion_reason": decision.get("reason", ""),
                "decision_updated_at": decision.get("updated_at"),
            })
        total = await server.db.users.count_documents(query)
        return {"records": records, "total": total, "limit": limit}

    async def registry_decision(
        decision: RegistryDecision,
        current_user: dict = Depends(server.get_current_user),
    ):
        admin = _admin_or_403(current_user)
        target_id = decision.target_id.strip()
        reason = decision.reason.strip()
        if decision.excluded and len(reason) < 3:
            raise HTTPException(status_code=422, detail="A reason is required when excluding a registry record")
        user = await server.db.users.find_one({"id": target_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Registry record not found by stable user ID")

        now = datetime.now(timezone.utc).isoformat()
        await server.db.registry_exclusions.update_one(
            {"target_type": "user", "target_id": target_id},
            {"$set": {
                "target_type": "user",
                "target_id": target_id,
                "excluded": bool(decision.excluded),
                "reason": reason,
                "updated_at": now,
                "updated_by": admin.get("id"),
            }, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        await server.db.admin_actions.insert_one({
            "id": str(uuid.uuid4()),
            "action": "registry_exclusion_changed",
            "target_type": "user",
            "target_id": target_id,
            "excluded": bool(decision.excluded),
            "reason": reason,
            "actor_id": admin.get("id"),
            "actor_email": admin.get("email", ""),
            "created_at": now,
        })
        return {
            "success": True,
            "target_id": target_id,
            "excluded": bool(decision.excluded),
            "reason": reason,
            "record_preserved": True,
        }

    async def release_health(current_user: dict = Depends(server.get_current_user)):
        _admin_or_403(current_user)
        return {
            "database_configured": bool(os.getenv("MONGO_URL")),
            "stripe_secret_configured": bool(os.getenv("STRIPE_SECRET_KEY")),
            "stripe_webhook_configured": bool(os.getenv("STRIPE_WEBHOOK_SECRET")),
            "email_configured": bool(os.getenv("RESEND_API_KEY")),
            "crossmint_configured": bool(os.getenv("CROSSMINT_API_KEY")),
            "mint_gate_open": _mint_gate_open(),
            "mint_gate": os.getenv("MINTING_RELEASE_GATE", "closed"),
        }

    server.app.add_api_route("/api/registry-stats", registry_stats, methods=["GET"], include_in_schema=False)
    server.app.add_api_route("/api/admin/registry-audit", registry_audit, methods=["GET"], include_in_schema=False)
    server.app.add_api_route("/api/admin/registry-decision", registry_decision, methods=["POST"], include_in_schema=False)
    server.app.add_api_route("/api/admin/release-health", release_health, methods=["GET"], include_in_schema=False)
