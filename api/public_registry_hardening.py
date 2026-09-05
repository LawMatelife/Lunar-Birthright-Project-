from __future__ import annotations

from fastapi.responses import JSONResponse


TARGET_PATHS = {
    "/api/registry/counter",
    "/api/registry/countries",
    "/api/registry/leaderboard",
    "/api/registry/recent-citizens",
    "/api/registry/viral-stats",
}
FOUNDING_GOAL = 1_000_000


def _citizen_number(certificate_number: str) -> int:
    tail = str(certificate_number or "").strip().split("-")[-1]
    return int(tail) if tail.isdigit() else 0


async def _excluded_ids(server) -> list[str]:
    ids = await server.db.registry_exclusions.distinct(
        "target_id", {"target_type": "user", "excluded": True}
    )
    return [str(value) for value in ids if str(value or "").strip()]


def _retained_query(excluded_ids: list[str]) -> dict:
    return {"id": {"$nin": excluded_ids}} if excluded_ids else {}


async def _retained_users(server, excluded_ids: list[str]) -> list[dict]:
    return await server.db.users.find(
        _retained_query(excluded_ids),
        {"_id": 0, "password_hash": 0},
    ).to_list(None)


async def _founding_user_ids(server, retained_ids: list[str]) -> set[str]:
    if not retained_ids:
        return set()
    docs = await server.db.certificates.find(
        {
            "user_id": {"$in": retained_ids},
            "payment_status": {"$in": ["paid", "granted"]},
        },
        {"_id": 0, "user_id": 1},
    ).to_list(None)
    return {str(doc.get("user_id")) for doc in docs if doc.get("user_id")}


async def _counter(server, excluded_ids: list[str]) -> dict:
    query = _retained_query(excluded_ids)
    total_registered = await server.db.users.count_documents(query)
    country_query = dict(query)
    country_query["country"] = {"$nin": [None, ""]}
    countries = await server.db.users.distinct("country", country_query)
    normalized = {str(c).strip() for c in countries if str(c or "").strip()}
    progress = min((total_registered / FOUNDING_GOAL) * 100, 100)
    return {
        "total_registered": int(total_registered),
        "total_countries": int(len(normalized)),
        "founding_goal": FOUNDING_GOAL,
        "progress_percentage": round(progress, 2),
        "remaining": max(FOUNDING_GOAL - int(total_registered), 0),
    }


async def _countries(server, excluded_ids: list[str]) -> dict:
    query = _retained_query(excluded_ids)
    match = dict(query)
    match["country"] = {"$nin": [None, ""]}
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
    ]
    rows = await server.db.users.aggregate(pipeline).to_list(None)
    countries = [
        {"country": str(row.get("_id") or "").strip(), "count": int(row.get("count") or 0)}
        for row in rows
        if str(row.get("_id") or "").strip()
    ]
    return {"countries": countries, "total_countries": len(countries)}


async def _leaderboard(server, excluded_ids: list[str]) -> dict:
    users = await _retained_users(server, excluded_ids)
    retained_ids = [str(user.get("id")) for user in users if user.get("id")]
    founding_ids = await _founding_user_ids(server, retained_ids)
    by_country: dict[str, dict] = {}
    for user in users:
        country = str(user.get("country") or "").strip()
        if not country:
            continue
        bucket = by_country.setdefault(country, {"citizens": 0, "founding_citizens": 0})
        bucket["citizens"] += 1
        if str(user.get("id")) in founding_ids:
            bucket["founding_citizens"] += 1
    ordered = sorted(
        by_country.items(),
        key=lambda item: (-item[1]["citizens"], item[0].lower()),
    )
    leaderboard = [
        {
            "rank": index,
            "country": country,
            "citizens": int(values["citizens"]),
            "founding_citizens": int(values["founding_citizens"]),
        }
        for index, (country, values) in enumerate(ordered, start=1)
    ]
    return {"leaderboard": leaderboard, "total_countries": len(leaderboard)}


async def _recent(server, excluded_ids: list[str]) -> dict:
    users = await server.db.users.find(
        _retained_query(excluded_ids),
        {"_id": 0, "full_name": 1, "country": 1, "created_at": 1, "certificate_number": 1},
    ).sort("created_at", -1).limit(10).to_list(10)
    citizens = []
    for user in users:
        full_name = str(user.get("full_name") or "").strip()
        citizens.append({
            "first_name": full_name.split()[0] if full_name else "Citizen",
            "country": str(user.get("country") or "").strip(),
            "claimed_at": user.get("created_at"),
            "citizen_number": _citizen_number(user.get("certificate_number", "")),
        })
    return {"citizens": citizens}


async def _viral(server, excluded_ids: list[str]) -> dict:
    users = await server.db.users.find(
        _retained_query(excluded_ids),
        {"_id": 0, "id": 1, "country": 1, "certificate_number": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(None)
    retained_ids = [str(user.get("id")) for user in users if user.get("id")]
    founding_ids = await _founding_user_ids(server, retained_ids)
    countries = {str(user.get("country") or "").strip() for user in users}
    countries.discard("")
    total = len(users)
    progress = min((total / FOUNDING_GOAL) * 100, 100)
    latest_citizen_number = 0
    for user in users:
        latest_citizen_number = _citizen_number(user.get("certificate_number", ""))
        if latest_citizen_number:
            break
    return {
        "total_citizens": total,
        "founding_citizens": len(founding_ids),
        "total_countries": len(countries),
        "founding_goal": FOUNDING_GOAL,
        "progress_percentage": round(progress, 2),
        "spots_remaining": max(FOUNDING_GOAL - total, 0),
        "latest_citizen_number": latest_citizen_number,
    }


def install(server) -> None:
    if getattr(server, "_lbp_public_registry_hardening_installed", False):
        return
    server._lbp_public_registry_hardening_installed = True

    @server.app.middleware("http")
    async def audited_public_registry(request, call_next):
        path = request.url.path.rstrip("/") or "/"
        if path not in TARGET_PATHS:
            return await call_next(request)

        excluded_ids = await _excluded_ids(server)
        if path == "/api/registry/counter":
            payload = await _counter(server, excluded_ids)
        elif path == "/api/registry/countries":
            payload = await _countries(server, excluded_ids)
        elif path == "/api/registry/leaderboard":
            payload = await _leaderboard(server, excluded_ids)
        elif path == "/api/registry/recent-citizens":
            payload = await _recent(server, excluded_ids)
        else:
            payload = await _viral(server, excluded_ids)

        return JSONResponse(
            payload,
            headers={"Cache-Control": "no-store, max-age=0"},
        )
