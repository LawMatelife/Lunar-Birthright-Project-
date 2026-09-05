from __future__ import annotations

import base64
import hashlib
import hmac
import html
import json
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Any

import resend
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
from pymongo import MongoClient

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

SESSION_COOKIE = "lbp_admin_session"
CHALLENGE_COOKIE = "lbp_admin_challenge"
SESSION_TTL = 12 * 60 * 60
CHALLENGE_TTL = 10 * 60


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def b64d(value: str) -> bytes:
    value += "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value.encode("ascii"))


def secret_key() -> bytes:
    value = (os.getenv("ADMIN_SESSION_SECRET") or "").strip()
    if len(value) < 32:
        raise HTTPException(status_code=503, detail="Admin authentication is not configured")
    return value.encode("utf-8")


def sign_payload(payload: dict[str, Any]) -> str:
    body = b64e(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    sig = hmac.new(secret_key(), body.encode("ascii"), hashlib.sha256).digest()
    return body + "." + b64e(sig)


def verify_payload(token: str | None) -> dict[str, Any] | None:
    if not token or "." not in token:
        return None
    try:
        body, encoded_sig = token.split(".", 1)
        wanted = hmac.new(secret_key(), body.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(wanted, b64d(encoded_sig)):
            return None
        payload = json.loads(b64d(body))
        if float(payload.get("exp") or 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def admin_email() -> str:
    value = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
    if not value or "@" not in value:
        raise HTTPException(status_code=503, detail="Admin email is not configured")
    return value


def db():
    uri = (os.getenv("MONGO_URL") or "").strip()
    name = (os.getenv("DB_NAME") or "lunar_birthright").strip()
    if not uri:
        raise HTTPException(status_code=503, detail="Atlas is not configured")
    if name != "lunar_birthright":
        raise HTTPException(status_code=503, detail="Unexpected database name")
    client = MongoClient(
        uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=5000,
        appname="lunar-birthright-admin",
    )
    client.admin.command("ping")
    return client, client[name]


def no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"


def session(request: Request) -> dict[str, Any] | None:
    payload = verify_payload(request.cookies.get(SESSION_COOKIE))
    if not payload or payload.get("kind") != "admin_session":
        return None
    if str(payload.get("email") or "").lower() != admin_email():
        return None
    return payload


def require_admin(request: Request, mutation: bool = False) -> dict[str, Any]:
    payload = session(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    if mutation:
        csrf = request.headers.get("X-LBP-CSRF") or ""
        if not csrf or not hmac.compare_digest(csrf, str(payload.get("csrf") or "")):
            raise HTTPException(status_code=403, detail="Invalid admin CSRF token")
    return payload


def clean_doc(doc: dict[str, Any]) -> dict[str, Any]:
    secret_fields = {
        "password", "password_hash", "hashed_password", "password_digest",
        "refresh_token", "access_token", "jwt", "secret", "api_key",
    }
    out: dict[str, Any] = {}
    for key, value in doc.items():
        if key.lower() in secret_fields:
            continue
        if key == "_id":
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.astimezone(timezone.utc).isoformat() if value.tzinfo else value.replace(tzinfo=timezone.utc).isoformat()
        else:
            out[key] = value
    return out


def stable_user_id(doc: dict[str, Any]) -> str:
    return str(doc.get("id") or doc.get("user_id") or doc.get("_id") or "")


def recent_docs(collection, limit: int, query: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    query = query or {}
    try:
        cursor = collection.find(query).sort([("created_at", -1), ("_id", -1)]).limit(limit)
        return [clean_doc(x) for x in cursor]
    except Exception:
        return [clean_doc(x) for x in collection.find(query).limit(limit)]


def exclusions_map(database) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in database.registry_exclusions.find({"excluded": True}):
        key = f"{item.get('target_type')}:{item.get('target_id')}"
        result[key] = clean_doc(item)
    return result


def registry_summary(database) -> dict[str, Any]:
    excluded = exclusions_map(database)
    retained_users: list[dict[str, Any]] = []
    countries: set[str] = set()
    for user in database.users.find({}):
        uid = stable_user_id(user)
        if excluded.get(f"user:{uid}"):
            continue
        retained_users.append(user)
        country = str(user.get("country") or user.get("country_code") or "").strip()
        if country:
            countries.add(country.casefold())
    return {
        "citizens": len(retained_users),
        "countries": len(countries),
        "excluded_users": sum(1 for key in excluded if key.startswith("user:")),
        "certificates": database.certificates.count_documents({}),
        "payments": database.payment_transactions.count_documents({}),
        "complimentary_upgrades": database.premium_entitlements.count_documents({"status": "active", "source": "admin_complimentary"}),
        "generated_at": now_iso(),
    }


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class LoginVerify(BaseModel):
    code: str = Field(min_length=6, max_length=12)


class UpgradeRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=200)
    reason: str = Field(default="Owner-approved complimentary premium upgrade", min_length=3, max_length=500)


class ExclusionRequest(BaseModel):
    target_type: str = Field(pattern="^(user|plot|certificate)$")
    target_id: str = Field(min_length=1, max_length=200)
    excluded: bool = True
    reason: str = Field(min_length=3, max_length=500)


def login_html(message: str = "") -> str:
    safe = html.escape(message)
    return f"""<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>
<title>Lunar Birthright Admin</title><meta name='robots' content='noindex,nofollow'><style>
body{{margin:0;background:#050505;color:#f5f0df;font:16px system-ui;display:grid;min-height:100vh;place-items:center}}main{{width:min(92vw,440px);border:1px solid #8c7228;background:#0b0b0b;padding:28px;border-radius:18px;box-shadow:0 20px 70px #000}}h1{{color:#e7c55f;margin-top:0}}input,button{{box-sizing:border-box;width:100%;padding:13px 14px;border-radius:10px;margin:6px 0 10px;font:inherit}}input{{background:#111;color:white;border:1px solid #555}}button{{background:#d4af37;color:#070707;border:0;font-weight:800;cursor:pointer}}small{{color:#aaa}}#status{{min-height:24px;color:#e7c55f}}</style></head><body><main><h1>Lunar Birthright Admin</h1><p>Owner-only access. A one-time code is sent to the configured admin email.</p><div id='status'>{safe}</div><form id='request'><input id='email' type='email' autocomplete='email' placeholder='Admin email' required><button>Send login code</button></form><form id='verify' hidden><input id='code' inputmode='numeric' autocomplete='one-time-code' placeholder='6-digit code' required><button>Sign in</button></form><small>No Lunar password is stored in the site source.</small><script>
const s=document.getElementById('status'),r=document.getElementById('request'),v=document.getElementById('verify');
r.onsubmit=async e=>{{e.preventDefault();s.textContent='Sending code…';const x=await fetch('/admin/auth/request',{{method:'POST',headers:{{'content-type':'application/json'}},body:JSON.stringify({{email:email.value}})}});const j=await x.json().catch(()=>({{}}));s.textContent=j.message||j.detail||'Check your email.';if(x.ok){{r.hidden=true;v.hidden=false}}}};
v.onsubmit=async e=>{{e.preventDefault();s.textContent='Checking code…';const x=await fetch('/admin/auth/verify',{{method:'POST',headers:{{'content-type':'application/json'}},body:JSON.stringify({{code:code.value}})}});if(x.ok)location.href='/admin';else{{const j=await x.json().catch(()=>({{}}));s.textContent=j.detail||'Code not accepted.'}}}};
</script></main></body></html>"""


def dashboard_html(csrf: str) -> str:
    csrf_js = json.dumps(csrf)
    return f"""<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>
<title>Lunar Birthright Admin</title><meta name='robots' content='noindex,nofollow'><style>
:root{{color-scheme:dark}}body{{margin:0;background:#050505;color:#eee;font:14px system-ui}}header{{position:sticky;top:0;z-index:5;background:#080808;border-bottom:1px solid #594817;padding:14px 18px;display:flex;gap:12px;align-items:center;justify-content:space-between}}h1{{font-size:20px;color:#e4c45d;margin:0}}main{{max-width:1180px;margin:auto;padding:18px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}}.card{{border:1px solid #3b3421;background:#0d0d0d;border-radius:12px;padding:14px}}.metric{{font-size:30px;color:#e4c45d;font-weight:800}}nav{{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}}button{{background:#1b1b1b;color:#eee;border:1px solid #66582d;border-radius:9px;padding:9px 12px;cursor:pointer}}button.primary{{background:#d4af37;color:#080808;font-weight:800}}input{{background:#111;color:#fff;border:1px solid #555;border-radius:9px;padding:9px 11px}}table{{width:100%;border-collapse:collapse;font-size:13px}}th,td{{text-align:left;border-bottom:1px solid #292929;padding:9px;vertical-align:top}}th{{color:#e4c45d}}.muted{{color:#999}}.danger{{color:#ffb1b1}}#toast{{position:fixed;right:16px;bottom:16px;background:#181818;border:1px solid #d4af37;padding:12px 16px;border-radius:10px;display:none;max-width:420px}}@media(max-width:700px){{table{{display:block;overflow:auto}}}}</style></head><body><header><h1>Lunar Birthright Admin</h1><div><button onclick='logout()'>Sign out</button></div></header><main><div id='metrics' class='grid'></div><nav><button onclick="show('claims')">Claims</button><button onclick="show('certificates')">Certificates</button><button onclick="show('payments')">Payments</button><button onclick="show('activity')">Notifications & Audit</button></nav><section class='card'><div style='display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px'><input id='q' placeholder='Search email / user / citizen / certificate'><button onclick='loadClaims()'>Search claims</button></div><div id='content' class='muted'>Loading…</div></section></main><div id='toast'></div><script>
const CSRF={csrf_js};let current='claims';
function esc(x){{return String(x??'').replace(/[&<>"']/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]))}}
function toast(x){{const t=document.getElementById('toast');t.textContent=x;t.style.display='block';setTimeout(()=>t.style.display='none',4500)}}
async function api(url,opt={{}}){{opt.headers=Object.assign({{'content-type':'application/json'}},opt.headers||{{}});if(opt.method&&opt.method!=='GET')opt.headers['X-LBP-CSRF']=CSRF;const r=await fetch(url,opt);if(r.status===401)location.reload();const j=await r.json().catch(()=>({{}}));if(!r.ok)throw Error(j.detail||'Request failed');return j}}
async function metrics(){{const s=await api('/admin/api/summary');document.getElementById('metrics').innerHTML=[['Citizens',s.citizens],['Countries',s.countries],['Certificates',s.certificates],['Payments',s.payments],['Complimentary',s.complimentary_upgrades],['Excluded users',s.excluded_users]].map(x=>`<div class='card'><div class='metric'>${{esc(x[1])}}</div><div>${{esc(x[0])}}</div></div>`).join('')}}
function table(rows,cols){{if(!rows.length)return '<p>No records found.</p>';return `<table><thead><tr>${{cols.map(c=>`<th>${{esc(c[0])}}</th>`).join('')}}</tr></thead><tbody>${{rows.map(r=>`<tr>${{cols.map(c=>`<td>${{c[1](r)}}</td>`).join('')}}</tr>`).join('')}}</tbody></table>`}}
async function loadClaims(){{current='claims';const q=encodeURIComponent(document.getElementById('q').value||'');const j=await api('/admin/api/claims?q='+q);content.innerHTML=table(j.items,[['Name',r=>esc(r.name||r.full_name||r.recipient_name)],['Email',r=>esc(r.email)],['User ID',r=>`<code>${{esc(r.id||r.user_id||r._id)}}</code>`],['Citizen',r=>esc(r.citizen_number||r.citizen_no)],['Country',r=>esc(r.country||r.country_code)],['Birth Moon',r=>esc(r.birth_moon||r.birth_moon_phase||r.lunar_sector)],['Actions',r=>`<button class='primary' onclick='upgrade(${{JSON.stringify(r.id||r.user_id||r._id)}})'>Grant Premium Upgrade</button><button onclick='excludeUser(${{JSON.stringify(r.id||r.user_id||r._id)}})'>Exclude/restore</button>`]])}}
async function show(kind){{current=kind;if(kind==='claims')return loadClaims();const j=await api('/admin/api/'+kind);const cols=kind==='certificates'?[['Certificate',r=>esc(r.certificate_id||r.id||r._id)],['User',r=>esc(r.user_id)],['Status',r=>esc(r.payment_status||r.status)],['Issued',r=>esc(r.issue_date||r.created_at)],['Mint',r=>esc(r.nft_minted===true?(r.token_id||r.nft_token_id||'Minted'):'Not minted')]]:kind==='payments'?[['Payment',r=>esc(r.id||r._id)],['User',r=>esc(r.user_id)],['Amount',r=>esc(r.amount)],['Currency',r=>esc(r.currency)],['Status',r=>esc(r.payment_status||r.status)],['Created',r=>esc(r.created_at)]]:[['Type',r=>esc(r.kind||r.action||r.type)],['Detail',r=>esc(r.message||r.reason||r.target_id)],['When',r=>esc(r.created_at||r.granted_at||r.updated_at)]];content.innerHTML=table(j.items,cols)}}
async function upgrade(user){{const reason=prompt('Reason for complimentary premium upgrade:','Owner-approved complimentary premium upgrade');if(!reason)return;try{{const j=await api('/admin/api/upgrade',{{method:'POST',body:JSON.stringify({{user_id:user,reason}})}});toast(j.message);metrics()}}catch(e){{toast(e.message)}}}}
async function excludeUser(user){{const reason=prompt('Reason. Use this to exclude test/admin/system records or restore a previously excluded user.','Registry audit');if(!reason)return;try{{const j=await api('/admin/api/exclusion/toggle',{{method:'POST',body:JSON.stringify({{target_type:'user',target_id:user,excluded:true,reason}})}});toast(j.message);metrics();loadClaims()}}catch(e){{toast(e.message)}}}}
async function logout(){{await fetch('/admin/logout',{{method:'POST',headers:{{'X-LBP-CSRF':CSRF}}}});location.reload()}}
metrics().catch(e=>toast(e.message));loadClaims().catch(e=>{{content.textContent=e.message}});
</script></body></html>"""


@app.middleware("http")
async def headers_middleware(request: Request, call_next):
    response = await call_next(request)
    no_store(response)
    return response


@app.get("/admin", response_class=HTMLResponse)
@app.get("/api/admin", response_class=HTMLResponse)
def admin_home(request: Request):
    payload = session(request)
    return HTMLResponse(dashboard_html(str(payload.get("csrf"))) if payload else login_html())


@app.post("/admin/auth/request")
@app.post("/api/admin/auth/request")
def request_code(body: LoginRequest, request: Request):
    expected = admin_email()
    supplied = body.email.strip().lower()
    response = JSONResponse({"message": "If that address is authorised, a login code has been sent."})
    if supplied != expected:
        return response

    current = verify_payload(request.cookies.get(CHALLENGE_COOKIE))
    if current and time.time() - float(current.get("iat") or 0) < 45:
        return response

    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    sender = (os.getenv("ADMIN_FROM_EMAIL") or "").strip()
    if not api_key or not sender:
        raise HTTPException(status_code=503, detail="Admin email delivery is not configured")

    code = f"{secrets.randbelow(1_000_000):06d}"
    code_hash = hmac.new(secret_key(), code.encode("ascii"), hashlib.sha256).hexdigest()
    challenge = sign_payload({
        "kind": "admin_challenge",
        "email": expected,
        "code_hash": code_hash,
        "iat": time.time(),
        "exp": time.time() + CHALLENGE_TTL,
    })
    resend.api_key = api_key
    resend.Emails.send({
        "from": sender,
        "to": [expected],
        "subject": "Lunar Birthright admin login code",
        "html": f"<p>Your Lunar Birthright admin login code is:</p><p style='font-size:28px;font-weight:700'>{code}</p><p>It expires in 10 minutes.</p>",
    })
    response.set_cookie(CHALLENGE_COOKIE, challenge, max_age=CHALLENGE_TTL, httponly=True, secure=True, samesite="strict", path="/admin")
    return response


@app.post("/admin/auth/verify")
@app.post("/api/admin/auth/verify")
def verify_code(body: LoginVerify, request: Request):
    challenge = verify_payload(request.cookies.get(CHALLENGE_COOKIE))
    if not challenge or challenge.get("kind") != "admin_challenge":
        raise HTTPException(status_code=401, detail="Login challenge expired")
    supplied = hmac.new(secret_key(), body.code.strip().encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(supplied, str(challenge.get("code_hash") or "")):
        raise HTTPException(status_code=401, detail="Login code not accepted")
    csrf = secrets.token_urlsafe(24)
    token = sign_payload({
        "kind": "admin_session",
        "email": admin_email(),
        "csrf": csrf,
        "iat": time.time(),
        "exp": time.time() + SESSION_TTL,
    })
    response = JSONResponse({"ok": True})
    response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_TTL, httponly=True, secure=True, samesite="strict", path="/admin")
    response.delete_cookie(CHALLENGE_COOKIE, path="/admin")
    return response


@app.post("/admin/logout")
@app.post("/api/admin/logout")
def logout(request: Request):
    require_admin(request, mutation=True)
    response = JSONResponse({"ok": True})
    response.delete_cookie(SESSION_COOKIE, path="/admin")
    response.delete_cookie(CHALLENGE_COOKIE, path="/admin")
    return response


@app.get("/api/registry-stats")
def public_registry_stats():
    client, database = db()
    try:
        summary = registry_summary(database)
        return {"citizens": summary["citizens"], "countries": summary["countries"], "generated_at": summary["generated_at"]}
    finally:
        client.close()


@app.get("/admin/api/summary")
@app.get("/api/admin/summary")
def admin_summary(request: Request):
    require_admin(request)
    client, database = db()
    try:
        return registry_summary(database)
    finally:
        client.close()


@app.get("/admin/api/claims")
@app.get("/api/admin/claims")
def admin_claims(request: Request, q: str = ""):
    require_admin(request)
    client, database = db()
    try:
        query: dict[str, Any] = {}
        q = q.strip()
        if q:
            safe = q[:200]
            query = {"$or": [
                {"email": {"$regex": safe, "$options": "i"}},
                {"name": {"$regex": safe, "$options": "i"}},
                {"full_name": {"$regex": safe, "$options": "i"}},
                {"id": safe}, {"user_id": safe}, {"citizen_number": safe}, {"citizen_no": safe},
            ]}
        items = recent_docs(database.users, 250, query)
        excluded = exclusions_map(database)
        for item in items:
            uid = str(item.get("id") or item.get("user_id") or item.get("_id") or "")
            item["registry_excluded"] = bool(excluded.get(f"user:{uid}"))
            entitlement = database.premium_entitlements.find_one({"user_id": uid, "status": "active"})
            item["premium_entitlement"] = clean_doc(entitlement) if entitlement else None
        return {"items": items}
    finally:
        client.close()


@app.get("/admin/api/certificates")
@app.get("/api/admin/certificates")
def admin_certificates(request: Request):
    require_admin(request)
    client, database = db()
    try:
        return {"items": recent_docs(database.certificates, 250)}
    finally:
        client.close()


@app.get("/admin/api/payments")
@app.get("/api/admin/payments")
def admin_payments(request: Request):
    require_admin(request)
    client, database = db()
    try:
        return {"items": recent_docs(database.payment_transactions, 250)}
    finally:
        client.close()


@app.get("/admin/api/activity")
@app.get("/api/admin/activity")
def admin_activity(request: Request):
    require_admin(request)
    client, database = db()
    try:
        items: list[dict[str, Any]] = []
        for user in recent_docs(database.users, 60):
            items.append({"kind": "free_claim", "target_id": user.get("id") or user.get("_id"), "created_at": user.get("created_at"), "message": "Claim recorded"})
        for cert in recent_docs(database.certificates, 60):
            items.append({"kind": "certificate", "target_id": cert.get("certificate_id") or cert.get("id") or cert.get("_id"), "created_at": cert.get("created_at") or cert.get("issue_date"), "message": "Certificate record"})
        for payment in recent_docs(database.payment_transactions, 60):
            items.append({"kind": "payment", "target_id": payment.get("id") or payment.get("_id"), "created_at": payment.get("created_at"), "message": f"Payment {payment.get('payment_status') or payment.get('status') or ''}".strip()})
        items.extend(recent_docs(database.admin_actions, 120))
        items.sort(key=lambda x: str(x.get("created_at") or x.get("updated_at") or x.get("granted_at") or ""), reverse=True)
        return {"items": items[:250]}
    finally:
        client.close()


@app.post("/admin/api/upgrade")
@app.post("/api/admin/upgrade")
def grant_upgrade(body: UpgradeRequest, request: Request):
    actor = require_admin(request, mutation=True)
    client, database = db()
    try:
        user = database.users.find_one({"$or": [{"id": body.user_id}, {"user_id": body.user_id}]})
        if user is None:
            try:
                from bson import ObjectId
                if ObjectId.is_valid(body.user_id):
                    user = database.users.find_one({"_id": ObjectId(body.user_id)})
            except Exception:
                user = None
        if user is None:
            raise HTTPException(status_code=404, detail="Citizen record not found")
        uid = stable_user_id(user)
        entitlement = {
            "user_id": uid,
            "plot_id": user.get("plot_id"),
            "citizen_number": user.get("citizen_number") or user.get("citizen_no"),
            "status": "active",
            "source": "admin_complimentary",
            "payment_status": "complimentary",
            "certificate_status": "pending_generation",
            "reason": body.reason,
            "granted_by": actor.get("email"),
            "granted_at": now_iso(),
        }
        result = database.premium_entitlements.update_one(
            {"user_id": uid, "source": "admin_complimentary"},
            {"$setOnInsert": entitlement},
            upsert=True,
        )
        database.admin_actions.insert_one({
            "action": "grant_premium_upgrade",
            "target_type": "user",
            "target_id": uid,
            "reason": body.reason,
            "actor": actor.get("email"),
            "created_at": now_iso(),
            "created_new_entitlement": result.upserted_id is not None,
        })
        return {"ok": True, "message": "Complimentary premium entitlement recorded. No Stripe payment was created.", "user_id": uid}
    finally:
        client.close()


@app.post("/admin/api/exclusion/toggle")
@app.post("/api/admin/exclusion/toggle")
def toggle_exclusion(body: ExclusionRequest, request: Request):
    actor = require_admin(request, mutation=True)
    client, database = db()
    try:
        existing = database.registry_exclusions.find_one({"target_type": body.target_type, "target_id": body.target_id})
        new_value = not bool(existing and existing.get("excluded")) if body.excluded else False
        database.registry_exclusions.update_one(
            {"target_type": body.target_type, "target_id": body.target_id},
            {"$set": {"excluded": new_value, "reason": body.reason, "actor": actor.get("email"), "updated_at": now_iso()}},
            upsert=True,
        )
        database.admin_actions.insert_one({
            "action": "registry_exclusion_changed",
            "target_type": body.target_type,
            "target_id": body.target_id,
            "reason": body.reason,
            "actor": actor.get("email"),
            "previous_excluded": bool(existing and existing.get("excluded")),
            "new_excluded": new_value,
            "created_at": now_iso(),
        })
        return {"ok": True, "excluded": new_value, "message": "Registry exclusion updated without deleting the source record."}
    finally:
        client.close()
