# Lunar Birthright V4 — Release Gates

This file is the cutover checklist for `v4-production-candidate`. A later gate
must never be treated as passed while an earlier gate is red.

## Gate 0 — Reproducible build and source integrity
- V4 frontend source/archive SHA-256 checks pass.
- Backend transport reconstruction checks pass.
- GitHub CI passes with Python 3.12 and Node 24.
- Vercel Preview deployment is `READY`.
- `scripts/security_gate.py` passes.

## Gate 1 — Runtime configuration and Atlas
- `DB_NAME=lunar_birthright` is configured for Preview and Production.
- `MONGO_URL` is configured for Preview and Production using the restricted
  application database user. Do not paste the URI into issues, chat or source.
- `/api/diag` reports `MONGO_URL: true` and Mongo ping `ok: true`.
- `/api/health` returns success from the real application.
- Atlas network access is no broader than required for the deployment.

## Gate 2 — Fresh source snapshot and restore
- Take a fresh, read-only export from the still-live Emergent production DB.
- Record source collection/document counts before import.
- Restore into Atlas without altering the old production database.
- Preserve original IDs, ownership links, citizen numbers and plot coordinates.
- Do not create test claims in the restored production dataset.

## Gate 3 — Exact reconciliation
- Compare source and Atlas collection counts.
- Run `scripts/reconcile_atlas.py` with the confirmed source counts.
- Verify known relationship fields and unique identifiers from the real export.
- Manually spot-check founding citizen record, at least one existing certificate,
  one payment record and one existing plot.
- Treat any mismatch as a release blocker.

## Gate 4 — Functional regression
On the Preview URL only:
- Existing-user login works.
- New free claim works once, creates one user/plot relationship and cannot
  allocate a duplicate plot.
- Birth-date flow produces the Birth Moon signature/region and deterministic
  symbolic coordinates.
- Public verification does not expose the raw birth date.
- Gift flow records the intended recipient and purchaser correctly.
- Purchased certificate uses the recipient's name and registry data, not the
  founder sample identity.
- Certificate PDF/PNG/QR verification resolve to the same certificate record.
- Mobile layout, Moon interaction, loading/error states and accessibility basics
  are checked on a real phone.

## Gate 5 — Stripe live payment
- Configure the production Stripe secret key only after Gates 0–4 pass.
- Configure a dedicated signed webhook endpoint and `STRIPE_WEBHOOK_SECRET`.
- Confirm the amount displayed and charged is NZ$12.
- Perform one real, traceable NZ$12 purchase.
- Confirm webhook signature validation, idempotency and exactly-one payment /
  certificate transition for the Stripe event.
- Refund the smoke-test purchase if appropriate after verification.

## Gate 6 — Digital archive / Polygon mint
- Configure the production Crossmint key only after the payment flow is green.
- Mint only after a verified paid state.
- Confirm retry/idempotency does not create duplicate NFTs.
- Verify token/transaction on Polygon and save the transaction reference.
- Public token metadata may include Birth Moon attributes but must not expose
  the raw birth date or other unnecessary personal information.

## Gate 7 — Security closure before custom-domain cutover
- Remove or disable the detailed `/api/diag` route before production launch.
- Re-run the tracked-secret gate and review Vercel environment scopes.
- Keep API responses `Cache-Control: no-store` and non-indexable.
- Confirm no dump/backup files containing user data are tracked in GitHub.
- Confirm rollback target (existing Emergent deployment) remains available.

## Gate 8 — Domain cutover
- Move `www.lunarbirthrightproject.com` only after Gates 0–7 are green.
- Verify TLS, `/api/health`, login, claim, certificate verification and payment
  callback on the custom domain.
- Keep the old deployment untouched until post-cutover checks are complete.
- If a critical regression appears, roll DNS/domain assignment back immediately.
