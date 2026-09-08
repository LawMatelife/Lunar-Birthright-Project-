from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field


ALLOWED_CLASSIFICATIONS = {
    "duplicate",
    "fake",
    "test",
    "admin",
    "system",
    "health-check",
    "placeholder",
    "archived",
    "other",
}
ALLOWED_REGISTRY_STATUSES = {
    "active",
    "archived",
    "test",
    "duplicate",
    "pending",
}
ALLOWED_CERTIFICATE_STATUSES = {
    "pending",
    "paid",
    "granted",
    "certificate_issued",
    "mint_pending",
    "minted",
}
CRITICAL_USER_FIELDS = {"certificate_number", "citizen_number"}
CRITICAL_CERTIFICATE_FIELDS = {"certificate_number", "id", "certificate_id"}
IMMUTABLE_PAYMENT_FIELDS = {
    "stripe_session_id",
    "stripe_payment_intent_id",
    "stripe_customer_id",
    "amount_paid",
    "currency",
    "payment_status",
}
IMMUTABLE_MINT_FIELDS = {
    "nft_token_id",
    "token_id",
    "nft_transaction_hash",
    "transaction_hash",
    "nft_minted",
}


class AdminProfileUpdate(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    full_name: Optional[str] = Field(default=None, max_length=150)
    email: Optional[str] = Field(default=None, max_length=254)
    country: Optional[str] = Field(default=None, max_length=100)
    birth_date: Optional[str] = Field(default=None, max_length=40)
    lunar_sector: Optional[str] = Field(default=None, max_length=160)
    message: Optional[str] = Field(default=None, max_length=1000)
    gift_occasion: Optional[str] = Field(default=None, max_length=120)
    is_gift: Optional[bool] = None
    registry_status: Optional[str] = Field(default=None, max_length=40)
    certificate_number: Optional[str] = Field(default=None, max_length=120)
    note: str = Field(default="", max_length=500)
    confirm_critical_change: bool = False


class AdminPlotUpdate(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    birth_date: Optional[str] = Field(default=None, max_length=40)
    lunar_sector: Optional[str] = Field(default=None, max_length=160)
    lunar_coordinates: Optional[str] = Field(default=None, max_length=200)
    birth_moon_phase: Optional[str] = Field(default=None, max_length=100)
    birth_moon_illumination: Optional[float] = None
    birth_moon_region: Optional[str] = Field(default=None, max_length=160)
    note: str = Field(default="", max_length=500)


class AdminCertificateUpdate(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    certificate_status: Optional[str] = Field(default=None, max_length=40)
    gift_message: Optional[str] = Field(default=None, max_length=1000)
    gift_occasion: Optional[str] = Field(default=None, max_length=120)
    certificate_number: Optional[str] = Field(default=None, max_length=120)
    note: str = Field(default="", max_length=500)
    confirm_critical_change: bool = False


class DuplicateCheck(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    canonical_target_id: str = Field(min_length=1, max_length=200)


class RegistryClassification(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    excluded: bool = True
    classification: str = Field(default="other", min_length=2, max_length=40)
    reason: str = Field(default="", max_length=500)
    canonical_target_id: Optional[str] = Field(default=None, max_length=200)


class AdminAddCitizen(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(default="", max_length=254)
    country: str = Field(default="", max_length=100)
    birth_date: str = Field(default="", max_length=40)
    lunar_sector: str = Field(default="", max_length=160)
    message: str = Field(default="", max_length=1000)
    is_gift: bool = False
    gift_occasion: str = Field(default="", max_length=120)
    registry_status: str = Field(default="active", max_length=40)
    note: str = Field(min_length=3, max_length=500)


class AdminGrantUpgrade(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    note: str = Field(min_length=3, max_length=500)


class AdminFulfilmentAction(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    action: str = Field(min_length=3, max_length=40)
    note: str = Field(default="", max_length=500)


class AdminRollback(BaseModel):
    action_id: str = Field(min_length=1, max_length=200)
    note: str = Field(min_length=3, max_length=500)


def _admin_or_403(current_user: dict) -> dict:
    if not current_user or not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _normal(value) -> str:
    return str(value or "").strip().lower()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _founding_record(user: dict) -> bool:
    cert = str(user.get("certificate_number") or "").strip()
    return cert.endswith("000001")


def _stable_duplicate_matches(a: dict, b: dict) -> list[str]:
    """Return stable identifiers that genuinely match. Visible names are never used."""
    matches: list[str] = []
    email_a, email_b = _normal(a.get("email")), _normal(b.get("email"))
    if email_a and email_a == email_b:
        matches.append("email")
    cert_a, cert_b = _normal(a.get("certificate_number")), _normal(b.get("certificate_number"))
    if cert_a and cert_a == cert_b:
        matches.append("certificate_number")
    for key in (
        "account_id", "auth_user_id", "source_user_id", "legacy_user_id",
        "external_user_id", "stripe_customer_id",
    ):
        av, bv = _normal(a.get(key)), _normal(b.get(key))
        if av and av == bv:
            matches.append(key)
    return matches


async def _load_user(server, target_id: str) -> dict:
    user = await server.db.users.find_one({"id": target_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Citizen record not found by stable user ID")
    return user


async def _audit(server, admin: dict, *, action: str, target_type: str, target_id: str,
                 before: Optional[dict] = None, after: Optional[dict] = None,
                 note: str = "", extra: Optional[dict] = None) -> str:
    action_id = str(uuid.uuid4())
    row = {
        "id": action_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "before": before or {},
        "after": after or {},
        "note": note.strip(),
        "actor_id": admin.get("id"),
        "actor_email": admin.get("email", ""),
        "created_at": _now(),
        "immutable": True,
    }
    if extra:
        row.update(extra)
    await server.db.admin_actions.insert_one(row)
    return action_id


def _clean_email(value: str) -> str:
    value = value.strip().lower()
    if value and ("@" not in value or value.startswith("@") or value.endswith("@")):
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    return value


async def _ensure_email_unique(server, target_id: str, email: str) -> None:
    if not email:
        return
    duplicate = await server.db.users.find_one({
        "id": {"$ne": target_id},
        "email": {"$regex": f"^{re.escape(email)}$", "$options": "i"},
    }, {"_id": 0, "id": 1, "certificate_number": 1})
    if duplicate:
        raise HTTPException(status_code=409, detail=(
            "That email already belongs to another citizen record. Use Mark Duplicate or Merge instead of overwriting stable identity."
        ))


def install(server) -> None:
    """Install owner-only Atlas-backed operational registry controls with append-only audit events."""
    if getattr(server, "_lbp_admin_profile_tools_installed", False):
        return
    server._lbp_admin_profile_tools_installed = True

    async def admin_profile_update(payload: AdminProfileUpdate, current_user: dict = Depends(server.get_current_user)):
        admin = _admin_or_403(current_user)
        target_id = payload.target_id.strip()
        user = await _load_user(server, target_id)
        update: dict[str, Any] = {}

        if payload.full_name is not None:
            value = payload.full_name.strip()
            if len(value) < 2:
                raise HTTPException(status_code=422, detail="Citizen name must contain at least 2 characters")
            update["full_name"] = value
        if payload.email is not None:
            value = _clean_email(payload.email)
            await _ensure_email_unique(server, target_id, value)
            update["email"] = value
        if payload.country is not None:
            value = payload.country.strip()
            if value and len(value) < 2:
                raise HTTPException(status_code=422, detail="Country must contain at least 2 characters")
            update["country"] = value
        for key in ("birth_date", "lunar_sector", "message", "gift_occasion"):
            value = getattr(payload, key)
            if value is not None:
                update[key] = value.strip()
        if payload.is_gift is not None:
            update["is_gift"] = bool(payload.is_gift)
        if payload.registry_status is not None:
            status = payload.registry_status.strip().lower()
            if status not in ALLOWED_REGISTRY_STATUSES:
                raise HTTPException(status_code=422, detail="Unsupported registry status")
            update["registry_status"] = status
        if payload.certificate_number is not None:
            if not payload.confirm_critical_change:
                raise HTTPException(status_code=409, detail="Changing citizen/certificate identity requires explicit critical-change confirmation")
            if len(payload.note.strip()) < 3:
                raise HTTPException(status_code=422, detail="An audit reason is required for a critical identifier change")
            value = payload.certificate_number.strip()
            if not value:
                raise HTTPException(status_code=422, detail="Certificate number cannot be blank")
            other = await server.db.users.find_one({"id": {"$ne": target_id}, "certificate_number": value}, {"_id": 0, "id": 1})
            if other:
                raise HTTPException(status_code=409, detail="Certificate number is already assigned to another citizen")
            update["certificate_number"] = value

        if not update:
            raise HTTPException(status_code=422, detail="No editable profile fields were supplied")
        before = {key: user.get(key, "") for key in update}
        if all(str(before.get(key, "")) == str(value) for key, value in update.items()):
            return {"success": True, "target_id": target_id, "changed": False, "record_preserved": True}

        update["admin_profile_updated_at"] = _now()
        await server.db.users.update_one({"id": target_id}, {"$set": update})
        after = {key: update[key] for key in before}
        action_id = await _audit(server, admin, action="admin_profile_updated", target_type="user", target_id=target_id,
                                 before=before, after=after, note=payload.note)
        return {"success": True, "target_id": target_id, "changed": True,
                "updated_fields": sorted(after.keys()), "stable_id_preserved": True,
                "record_preserved": True, "audit_action_id": action_id}

    async def admin_plot_update(payload: AdminPlotUpdate, current_user: dict = Depends(server.get_current_user)):
        admin = _admin_or_403(current_user)
        target_id = payload.target_id.strip()
        await _load_user(server, target_id)
        plot = await server.db.plots.find_one({"owner_id": target_id}, {"_id": 0})
        if not plot:
            raise HTTPException(status_code=404, detail="Lunar plot record not found for this citizen")
        update: dict[str, Any] = {}
        for key in ("birth_date", "lunar_sector", "lunar_coordinates", "birth_moon_phase", "birth_moon_region"):
            value = getattr(payload, key)
            if value is not None:
                update[key] = value.strip()
        if payload.birth_moon_illumination is not None:
            value = float(payload.birth_moon_illumination)
            if value < 0 or value > 100:
                raise HTTPException(status_code=422, detail="Birth Moon illumination must be between 0 and 100")
            update["birth_moon_illumination"] = value
        if not update:
            raise HTTPException(status_code=422, detail="No editable lunar plot fields were supplied")
        before = {key: plot.get(key, "") for key in update}
        update["admin_plot_updated_at"] = _now()
        await server.db.plots.update_one({"owner_id": target_id}, {"$set": update})
        after = {key: update[key] for key in before}
        action_id = await _audit(server, admin, action="admin_plot_updated", target_type="plot", target_id=target_id,
                                 before=before, after=after, note=payload.note)
        return {"success": True, "target_id": target_id, "updated_fields": sorted(after), "audit_action_id": action_id}

    async def admin_certificate_update(payload: AdminCertificateUpdate, current_user: dict = Depends(server.get_current_user)):
        admin = _admin_or_403(current_user)
        target_id = payload.target_id.strip()
        await _load_user(server, target_id)
        cert = await server.db.certificates.find_one({"user_id": target_id}, {"_id": 0}, sort=[("purchased_at", -1), ("created_at", -1)])
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate record not found for this citizen")
        update: dict[str, Any] = {}
        if payload.certificate_status is not None:
            status = payload.certificate_status.strip().lower()
            if status not in ALLOWED_CERTIFICATE_STATUSES:
                raise HTTPException(status_code=422, detail="Unsupported certificate status")
            if status == "minted" and not bool(cert.get("nft_minted")):
                raise HTTPException(status_code=409, detail="Cannot mark minted manually. A verified blockchain mint must set nft_minted first.")
            update["certificate_status"] = status
        for key in ("gift_message", "gift_occasion"):
            value = getattr(payload, key)
            if value is not None:
                update[key] = value.strip()
        if payload.certificate_number is not None:
            if not payload.confirm_critical_change or len(payload.note.strip()) < 3:
                raise HTTPException(status_code=409, detail="Changing a certificate identifier requires confirmation and an audit reason")
            update["certificate_number"] = payload.certificate_number.strip()
        if not update:
            raise HTTPException(status_code=422, detail="No editable certificate fields were supplied")
        before = {key: cert.get(key, "") for key in update}
        update["admin_certificate_updated_at"] = _now()
        cert_filter = {"user_id": target_id}
        if cert.get("id"):
            cert_filter = {"id": cert.get("id")}
        elif cert.get("stripe_session_id"):
            cert_filter = {"user_id": target_id, "stripe_session_id": cert.get("stripe_session_id")}
        await server.db.certificates.update_one(cert_filter, {"$set": update})
        after = {key: update[key] for key in before}
        action_id = await _audit(server, admin, action="admin_certificate_updated", target_type="certificate", target_id=target_id,
                                 before=before, after=after, note=payload.note)
        return {"success": True, "target_id": target_id, "updated_fields": sorted(after), "audit_action_id": action_id}

    async def admin_add_citizen(payload: AdminAddCitizen, current_user: dict = Depends(server.get_current_user)):
        admin = _admin_or_403(current_user)
        email = _clean_email(payload.email)
        if email:
            existing = await server.db.users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}, {"_id": 0, "id": 1})
            if existing:
                raise HTTPException(status_code=409, detail="A citizen with that email already exists. Edit or reconcile the existing record instead.")
        status = payload.registry_status.strip().lower()
        if status not in ALLOWED_REGISTRY_STATUSES:
            raise HTTPException(status_code=422, detail="Unsupported registry status")
        target_id = str(uuid.uuid4())
        now = _now()
        user = {
            "id": target_id,
            "full_name": payload.full_name.strip(),
            "email": email,
            "country": payload.country.strip(),
            "birth_date": payload.birth_date.strip(),
            "lunar_sector": payload.lunar_sector.strip(),
            "message": payload.message.strip(),
            "is_gift": bool(payload.is_gift),
            "gift_occasion": payload.gift_occasion.strip(),
            "registry_status": status,
            "admin_created": True,
            "created_at": now,
            "updated_at": now,
        }
        await server.db.users.insert_one(user)
        if payload.birth_date.strip() or payload.lunar_sector.strip():
            await server.db.plots.insert_one({
                "id": str(uuid.uuid4()), "owner_id": target_id,
                "birth_date": payload.birth_date.strip(), "lunar_sector": payload.lunar_sector.strip(),
                "created_at": now, "admin_created": True,
            })
        action_id = await _audit(server, admin, action="admin_citizen_created", target_type="user", target_id=target_id,
                                 before={}, after={k: v for k, v in user.items() if k != "updated_at"}, note=payload.note)
        return {"success": True, "target_id": target_id, "record_preserved": True, "audit_action_id": action_id}

    async def admin_duplicate_check(payload: DuplicateCheck, current_user: dict = Depends(server.get_current_user)):
        _admin_or_403(current_user)
        target_id = payload.target_id.strip(); canonical_id = payload.canonical_target_id.strip()
        if target_id == canonical_id:
            raise HTTPException(status_code=422, detail="A record cannot be its own duplicate")
        target = await _load_user(server, target_id); canonical = await _load_user(server, canonical_id)
        matches = _stable_duplicate_matches(target, canonical)
        return {"target_id": target_id, "canonical_target_id": canonical_id,
                "stable_identifier_matches": matches, "can_classify_duplicate": bool(matches),
                "name_match_not_used": True}

    async def admin_registry_classify(payload: RegistryClassification, current_user: dict = Depends(server.get_current_user)):
        admin = _admin_or_403(current_user)
        target_id = payload.target_id.strip(); user = await _load_user(server, target_id)
        classification = payload.classification.strip().lower(); reason = payload.reason.strip()
        canonical_id = (payload.canonical_target_id or "").strip() or None
        if payload.excluded:
            if classification not in ALLOWED_CLASSIFICATIONS:
                raise HTTPException(status_code=422, detail="Unsupported registry classification")
            if len(reason) < 3:
                raise HTTPException(status_code=422, detail="A reason is required when excluding a record")
            if _founding_record(user):
                raise HTTPException(status_code=409, detail="Founding Citizen 000001 is protected from exclusion. Correct profile details instead.")
            if classification == "duplicate":
                if not canonical_id or canonical_id == target_id:
                    raise HTTPException(status_code=422, detail="Duplicate classification requires a different retained citizen stable ID")
                canonical = await _load_user(server, canonical_id)
                if not _stable_duplicate_matches(user, canonical):
                    raise HTTPException(status_code=409, detail="No stable identifier matches the retained citizen. Do not classify duplicates from matching names alone.")
            else:
                canonical_id = None
        else:
            classification = "included"; canonical_id = None
        now = _now()
        previous = await server.db.registry_exclusions.find_one({"target_type": "user", "target_id": target_id}, {"_id": 0}) or {}
        await server.db.registry_exclusions.update_one({"target_type": "user", "target_id": target_id}, {
            "$set": {"target_type": "user", "target_id": target_id, "excluded": bool(payload.excluded),
                     "classification": classification, "reason": reason, "canonical_target_id": canonical_id,
                     "updated_at": now, "updated_by": admin.get("id")}, "$setOnInsert": {"created_at": now}}, upsert=True)
        lifecycle = classification if payload.excluded and classification in ALLOWED_REGISTRY_STATUSES else "active"
        await server.db.users.update_one({"id": target_id}, {"$set": {"registry_status": lifecycle, "registry_status_updated_at": now}})
        action_id = await _audit(server, admin, action="registry_classification_changed", target_type="user", target_id=target_id,
                                 before={"excluded": bool(previous.get("excluded", False)), "classification": previous.get("classification", "included")},
                                 after={"excluded": bool(payload.excluded), "classification": classification, "registry_status": lifecycle},
                                 note=reason, extra={"canonical_target_id": canonical_id})
        return {"success": True, "target_id": target_id, "excluded": bool(payload.excluded),
                "classification": classification, "canonical_target_id": canonical_id,
                "record_preserved": True, "public_totals_recalculate_from_exclusions": True,
                "audit_action_id": action_id}

    async def admin_grant_upgrade(payload: AdminGrantUpgrade, current_user: dict = Depends(server.get_current_user)):
        admin = _admin_or_403(current_user)
        target_id = payload.target_id.strip(); user = await _load_user(server, target_id)
        existing = await server.db.certificates.find_one({"user_id": target_id, "payment_status": {"$in": ["paid", "granted"]}}, {"_id": 0})
        if existing:
            return {"success": True, "target_id": target_id, "changed": False, "detail": "Citizen already has a paid or granted premium certificate"}
        now = _now(); cert_id = str(uuid.uuid4())
        cert = {
            "id": cert_id, "user_id": target_id, "payment_status": "granted", "amount_paid": 0,
            "currency": "NZD", "grant_source": "admin", "certificate_status": "pending",
            "fulfillment_status": "pending", "nft_minted": False, "nft_status": "not_requested",
            "created_at": now, "granted_at": now, "granted_by": admin.get("id"),
        }
        await server.db.certificates.insert_one(cert)
        action_id = await _audit(server, admin, action="admin_premium_upgrade_granted", target_type="certificate", target_id=target_id,
                                 before={}, after={"id": cert_id, "payment_status": "granted", "amount_paid": 0}, note=payload.note)
        return {"success": True, "target_id": target_id, "certificate_id": cert_id,
                "stripe_payment_created": False, "audit_action_id": action_id}

    async def admin_fulfilment_action(payload: AdminFulfilmentAction, current_user: dict = Depends(server.get_current_user)):
        admin = _admin_or_403(current_user)
        target_id = payload.target_id.strip(); await _load_user(server, target_id)
        action = payload.action.strip().lower()
        if action not in {"regenerate_certificate", "resend_email", "retry_fulfilment", "request_mint"}:
            raise HTTPException(status_code=422, detail="Unsupported fulfilment action")
        cert = await server.db.certificates.find_one({"user_id": target_id}, {"_id": 0}, sort=[("purchased_at", -1), ("created_at", -1)])
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate record not found")
        payment_status = str(cert.get("payment_status") or "").lower()
        if payment_status not in {"paid", "granted"}:
            raise HTTPException(status_code=409, detail="Fulfilment requires verified paid status or an explicit admin-granted premium upgrade")
        cert_filter = {"id": cert.get("id")} if cert.get("id") else {"user_id": target_id, "stripe_session_id": cert.get("stripe_session_id")}
        now = _now()
        if action == "request_mint":
            if bool(cert.get("nft_minted")):
                return {"success": True, "changed": False, "detail": "Certificate already has a verified mint"}
            await server.db.certificates.update_one(cert_filter, {"$set": {"certificate_status": "mint_pending", "nft_status": "mint_pending", "mint_requested_at": now}})
            action_id = await _audit(server, admin, action="admin_mint_requested", target_type="certificate", target_id=target_id,
                                     before={"nft_status": cert.get("nft_status")}, after={"nft_status": "mint_pending"}, note=payload.note)
            return {"success": True, "target_id": target_id, "minted": False, "mint_requested": True,
                    "token_id_written": False, "audit_action_id": action_id}
        reset = {"fulfillment_status": "pending", "fulfillment_updated_at": now}
        if action in {"resend_email", "retry_fulfilment"}:
            reset.update({"email_delivery_status": "pending", "email_delivery_error": ""})
        if action == "regenerate_certificate":
            reset.update({"certificate_ready": False, "certificate_status": "pending"})
        await server.db.certificates.update_one(cert_filter, {"$set": reset})
        stripe_session_id = str(cert.get("stripe_session_id") or "").strip()
        if payment_status == "paid" and stripe_session_id:
            await server.process_certificate_and_nft(target_id, stripe_session_id)
        else:
            # Admin-granted certificates deliberately do not fabricate Stripe evidence.
            await server.db.certificates.update_one(cert_filter, {"$set": {"certificate_ready": True, "certificate_status": "certificate_issued", "fulfillment_status": "certificate_ready", "fulfillment_updated_at": _now()}})
        action_id = await _audit(server, admin, action=f"admin_{action}", target_type="certificate", target_id=target_id,
                                 before={"fulfillment_status": cert.get("fulfillment_status"), "email_delivery_status": cert.get("email_delivery_status")},
                                 after=reset, note=payload.note)
        return {"success": True, "target_id": target_id, "action": action,
                "stripe_payment_mutated": False, "token_id_written": False, "audit_action_id": action_id}

    async def admin_record_detail(target_id: str = Query(min_length=1, max_length=200), current_user: dict = Depends(server.get_current_user)):
        _admin_or_403(current_user)
        user = await _load_user(server, target_id.strip())
        uid = target_id.strip()
        plot = await server.db.plots.find_one({"owner_id": uid}, {"_id": 0}) or {}
        certs = await server.db.certificates.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(25).to_list(25)
        payments = await server.db.payment_transactions.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(25).to_list(25)
        actions = await server.db.admin_actions.find({"target_id": uid}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
        for payment in payments:
            for key in IMMUTABLE_PAYMENT_FIELDS:
                if key in payment:
                    payment[f"{key}_immutable"] = True
        return {"user": user, "plot": plot, "certificates": certs, "payment_transactions": payments,
                "admin_actions": actions, "immutable_payment_fields": sorted(IMMUTABLE_PAYMENT_FIELDS),
                "immutable_mint_fields": sorted(IMMUTABLE_MINT_FIELDS)}

    async def admin_action_history(target_id: Optional[str] = Query(default=None, max_length=200),
                                   limit: int = Query(default=50, ge=1, le=200),
                                   current_user: dict = Depends(server.get_current_user)):
        _admin_or_403(current_user)
        query = {}
        if target_id:
            query["target_id"] = target_id.strip()
        rows = await server.db.admin_actions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        return {"actions": rows, "limit": limit, "append_only": True}

    async def admin_rollback(payload: AdminRollback, current_user: dict = Depends(server.get_current_user)):
        admin = _admin_or_403(current_user)
        action = await server.db.admin_actions.find_one({"id": payload.action_id.strip()}, {"_id": 0})
        if not action:
            raise HTTPException(status_code=404, detail="Audit action not found")
        if action.get("action") not in {"admin_profile_updated", "admin_plot_updated", "admin_certificate_updated"}:
            raise HTTPException(status_code=409, detail="This action type cannot be rolled back automatically")
        before = dict(action.get("before") or {})
        if not before:
            raise HTTPException(status_code=409, detail="No prior field values are available for rollback")
        if any(key in IMMUTABLE_PAYMENT_FIELDS or key in IMMUTABLE_MINT_FIELDS for key in before):
            raise HTTPException(status_code=409, detail="Payment and blockchain evidence cannot be rolled back through Admin")
        target_id = str(action.get("target_id") or "")
        target_type = action.get("target_type")
        if target_type == "user":
            await server.db.users.update_one({"id": target_id}, {"$set": before})
        elif target_type == "plot":
            await server.db.plots.update_one({"owner_id": target_id}, {"$set": before})
        elif target_type == "certificate":
            await server.db.certificates.update_one({"user_id": target_id}, {"$set": before})
        else:
            raise HTTPException(status_code=409, detail="Unsupported rollback target")
        rollback_id = await _audit(server, admin, action="admin_rollback_applied", target_type=str(target_type), target_id=target_id,
                                   before=dict(action.get("after") or {}), after=before, note=payload.note,
                                   extra={"rollback_of_action_id": action.get("id")})
        return {"success": True, "target_id": target_id, "rollback_of_action_id": action.get("id"), "audit_action_id": rollback_id}

    routes = [
        ("/api/admin/profile-update", admin_profile_update, ["POST"]),
        ("/api/admin/plot-update", admin_plot_update, ["POST"]),
        ("/api/admin/certificate-update", admin_certificate_update, ["POST"]),
        ("/api/admin/citizen-create", admin_add_citizen, ["POST"]),
        ("/api/admin/duplicate-check", admin_duplicate_check, ["POST"]),
        ("/api/admin/registry-classify", admin_registry_classify, ["POST"]),
        ("/api/admin/grant-upgrade", admin_grant_upgrade, ["POST"]),
        ("/api/admin/fulfilment-action", admin_fulfilment_action, ["POST"]),
        ("/api/admin/record-detail", admin_record_detail, ["GET"]),
        ("/api/admin/action-history", admin_action_history, ["GET"]),
        ("/api/admin/rollback", admin_rollback, ["POST"]),
    ]
    for path, endpoint, methods in routes:
        server.app.add_api_route(path, endpoint, methods=methods, include_in_schema=False)
