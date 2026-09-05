from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Optional

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
    "other",
}


class AdminProfileUpdate(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    full_name: Optional[str] = Field(default=None, max_length=150)
    email: Optional[str] = Field(default=None, max_length=254)
    country: Optional[str] = Field(default=None, max_length=100)
    note: str = Field(default="", max_length=500)


class DuplicateCheck(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    canonical_target_id: str = Field(min_length=1, max_length=200)


class RegistryClassification(BaseModel):
    target_id: str = Field(min_length=1, max_length=200)
    excluded: bool = True
    classification: str = Field(default="other", min_length=2, max_length=40)
    reason: str = Field(default="", max_length=500)
    canonical_target_id: Optional[str] = Field(default=None, max_length=200)


def _admin_or_403(current_user: dict) -> dict:
    if not current_user or not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _normal(value) -> str:
    return str(value or "").strip().lower()


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
        "account_id",
        "auth_user_id",
        "source_user_id",
        "legacy_user_id",
        "external_user_id",
        "stripe_customer_id",
    ):
        av, bv = _normal(a.get(key)), _normal(b.get(key))
        if av and av == bv:
            matches.append(key)

    return matches


async def _load_user(server, target_id: str) -> dict:
    user = await server.db.users.find_one(
        {"id": target_id},
        {"_id": 0, "password_hash": 0},
    )
    if not user:
        raise HTTPException(status_code=404, detail="Citizen record not found by stable user ID")
    return user


def install(server) -> None:
    """Add owner-only, non-destructive citizen editing and classification tools."""
    if getattr(server, "_lbp_admin_profile_tools_installed", False):
        return
    server._lbp_admin_profile_tools_installed = True

    async def admin_profile_update(
        payload: AdminProfileUpdate,
        current_user: dict = Depends(server.get_current_user),
    ):
        admin = _admin_or_403(current_user)
        target_id = payload.target_id.strip()
        user = await _load_user(server, target_id)

        update: dict = {}
        if payload.full_name is not None:
            value = payload.full_name.strip()
            if len(value) < 2:
                raise HTTPException(status_code=422, detail="Citizen name must contain at least 2 characters")
            update["full_name"] = value

        if payload.email is not None:
            value = payload.email.strip().lower()
            if value and ("@" not in value or value.startswith("@") or value.endswith("@")):
                raise HTTPException(status_code=422, detail="Enter a valid email address")
            if value:
                duplicate_email = await server.db.users.find_one(
                    {
                        "id": {"$ne": target_id},
                        "email": {"$regex": f"^{re.escape(value)}$", "$options": "i"},
                    },
                    {"_id": 0, "id": 1, "certificate_number": 1},
                )
                if duplicate_email:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "That email already belongs to another citizen record. "
                            "Use Mark Duplicate instead of overwriting the stable identity."
                        ),
                    )
            update["email"] = value

        if payload.country is not None:
            value = payload.country.strip()
            if value and len(value) < 2:
                raise HTTPException(status_code=422, detail="Country must contain at least 2 characters")
            update["country"] = value

        if not update:
            raise HTTPException(status_code=422, detail="No editable profile fields were supplied")

        before = {key: user.get(key, "") for key in update}
        if all(str(before.get(key, "")) == str(value) for key, value in update.items()):
            return {"success": True, "target_id": target_id, "changed": False, "record_preserved": True}

        now = datetime.now(timezone.utc).isoformat()
        update["admin_profile_updated_at"] = now
        await server.db.users.update_one({"id": target_id}, {"$set": update})

        after = {key: update[key] for key in before}
        await server.db.admin_actions.insert_one({
            "id": str(uuid.uuid4()),
            "action": "admin_profile_updated",
            "target_type": "user",
            "target_id": target_id,
            "before": before,
            "after": after,
            "note": payload.note.strip(),
            "actor_id": admin.get("id"),
            "actor_email": admin.get("email", ""),
            "created_at": now,
        })
        return {
            "success": True,
            "target_id": target_id,
            "changed": True,
            "updated_fields": sorted(after.keys()),
            "stable_id_preserved": True,
            "record_preserved": True,
        }

    async def admin_duplicate_check(
        payload: DuplicateCheck,
        current_user: dict = Depends(server.get_current_user),
    ):
        _admin_or_403(current_user)
        target_id = payload.target_id.strip()
        canonical_id = payload.canonical_target_id.strip()
        if target_id == canonical_id:
            raise HTTPException(status_code=422, detail="A record cannot be its own duplicate")
        target = await _load_user(server, target_id)
        canonical = await _load_user(server, canonical_id)
        matches = _stable_duplicate_matches(target, canonical)
        return {
            "target_id": target_id,
            "canonical_target_id": canonical_id,
            "stable_identifier_matches": matches,
            "can_classify_duplicate": bool(matches),
            "name_match_not_used": True,
        }

    async def admin_registry_classify(
        payload: RegistryClassification,
        current_user: dict = Depends(server.get_current_user),
    ):
        admin = _admin_or_403(current_user)
        target_id = payload.target_id.strip()
        user = await _load_user(server, target_id)
        classification = payload.classification.strip().lower()
        reason = payload.reason.strip()
        canonical_id = (payload.canonical_target_id or "").strip() or None

        if payload.excluded:
            if classification not in ALLOWED_CLASSIFICATIONS:
                raise HTTPException(status_code=422, detail="Unsupported registry classification")
            if len(reason) < 3:
                raise HTTPException(status_code=422, detail="A reason is required when excluding a record")
            if _founding_record(user):
                raise HTTPException(
                    status_code=409,
                    detail="Founding Citizen 000001 is protected from exclusion. Correct profile details instead.",
                )
            if classification == "duplicate":
                if not canonical_id:
                    raise HTTPException(status_code=422, detail="Duplicate classification requires the retained citizen stable ID")
                if canonical_id == target_id:
                    raise HTTPException(status_code=422, detail="A record cannot be its own duplicate")
                canonical = await _load_user(server, canonical_id)
                matches = _stable_duplicate_matches(user, canonical)
                if not matches:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "No stable identifier matches the retained citizen. "
                            "Do not classify duplicates from matching names alone."
                        ),
                    )
            else:
                canonical_id = None
        else:
            classification = "included"
            canonical_id = None

        now = datetime.now(timezone.utc).isoformat()
        previous = await server.db.registry_exclusions.find_one(
            {"target_type": "user", "target_id": target_id},
            {"_id": 0},
        ) or {}

        await server.db.registry_exclusions.update_one(
            {"target_type": "user", "target_id": target_id},
            {
                "$set": {
                    "target_type": "user",
                    "target_id": target_id,
                    "excluded": bool(payload.excluded),
                    "classification": classification,
                    "reason": reason,
                    "canonical_target_id": canonical_id,
                    "updated_at": now,
                    "updated_by": admin.get("id"),
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        await server.db.admin_actions.insert_one({
            "id": str(uuid.uuid4()),
            "action": "registry_classification_changed",
            "target_type": "user",
            "target_id": target_id,
            "previous_excluded": bool(previous.get("excluded", False)),
            "excluded": bool(payload.excluded),
            "classification": classification,
            "reason": reason,
            "canonical_target_id": canonical_id,
            "actor_id": admin.get("id"),
            "actor_email": admin.get("email", ""),
            "created_at": now,
        })
        return {
            "success": True,
            "target_id": target_id,
            "excluded": bool(payload.excluded),
            "classification": classification,
            "canonical_target_id": canonical_id,
            "record_preserved": True,
            "public_totals_recalculate_from_exclusions": True,
        }

    async def admin_action_history(
        target_id: Optional[str] = Query(default=None, max_length=200),
        limit: int = Query(default=50, ge=1, le=200),
        current_user: dict = Depends(server.get_current_user),
    ):
        _admin_or_403(current_user)
        query = {
            "action": {
                "$in": [
                    "admin_profile_updated",
                    "registry_classification_changed",
                    "registry_exclusion_changed",
                ]
            }
        }
        if target_id:
            query["target_id"] = target_id.strip()
        rows = await server.db.admin_actions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        return {"actions": rows, "limit": limit}

    server.app.add_api_route(
        "/api/admin/profile-update",
        admin_profile_update,
        methods=["POST"],
        include_in_schema=False,
    )
    server.app.add_api_route(
        "/api/admin/duplicate-check",
        admin_duplicate_check,
        methods=["POST"],
        include_in_schema=False,
    )
    server.app.add_api_route(
        "/api/admin/registry-classify",
        admin_registry_classify,
        methods=["POST"],
        include_in_schema=False,
    )
    server.app.add_api_route(
        "/api/admin/action-history",
        admin_action_history,
        methods=["GET"],
        include_in_schema=False,
    )
