# Lunar Birthright V4 — Release Gates

This file is the cutover checklist for `v4-production-candidate`. A later gate
must never be treated as passed while an earlier gate is red.

## Gate 0 — Reproducible build and source integrity
- V4 frontend source/archive SHA-256 checks pass.
- Backend transport reconstruction checks pass.
- GitHub CI passes with Python 3.12 and Node 24.
- Vercel Preview deployment is `READY`.
- `scripts/security_gate.py` passes.
- The public GitHub repository contains no production secrets or database dumps.

## Gate 1 — Runtime configuration and Atlas
- `DB_NAME=lunar_birthright` is configured for Preview and Production.
- `MONGO_URL` is configured for Preview and Production using the restricted
  application database user. Do not paste the URI into issues, chat or source.
- `/api/diag` reports `MONGO_URL: true` and Mongo ping `ok: true`.
- `/api/health` returns success from the real application.
- Atlas network access is no broader than required for the deployment.

## Gate 2 — Fresh source snapshot and exact restore
- Keep the Emergent production site/database unchanged while migration is tested.
- Take a fresh, read-only export from the live Emergent production DB immediately
  before the final migration attempt.
- Audit every export before restore, for example:
  `python scripts/audit_export.py fresh-export.zip --manifest export-audit.json`.
- Record the ZIP SHA-256, per-file SHA-256 and collection counts.
- Use `scripts/restore_export_to_atlas.py` in dry-run mode first. The guarded
  restore refuses non-empty target collections and never drops a database.
- Restore source documents exactly, preserving `_id`, application IDs, ownership
  links, citizen numbers, plot coordinates, historical payments and NFT records.
- Do not create test claims in the restored production dataset.

### Verified 15 August migration baseline
The archived source snapshot `moon-registry-1-test_database_dump_20260815_092957.zip`
was independently audited and is recorded in
`migration/baselines/source-export-2026-08-15.json`.
It contains 44 users, 44 plots, 9 certificates and 9 payment transactions with
no duplicate application IDs/emails/plot coordinates and no broken user↔plot or
certificate↔payment relationships. This is a baseline only; the fresh final
pre-cutover export is authoritative if counts have changed.

The baseline also contains legacy state that must not be silently rewritten during
restore: 37 user/plot `lunar_sector` mismatches, one conservatively parseable
non-ISO birth date, eight certificate/payment status-vocabulary differences, and
nine historical payment records denominated in USD. These are migration inputs,
not permission to change historical commercial records.

## Gate 3 — Reconciliation and controlled V4 normalization
- Compare source and Atlas collection counts.
- Run `scripts/reconcile_atlas.py` with counts from the fresh source audit.
- Verify known relationships and unique identifiers from the real export.
- Manually spot-check the founding-citizen record, at least one existing
  certificate, one payment record and one existing plot.
- Treat any unexplained source-versus-Atlas mismatch as a release blocker.
- Only after exact restore/reconciliation, dry-run `scripts/migrate_v4_legacy.py`.
- The controlled migration may normalize an unambiguous legacy birth-date string
  and synchronize `user.lunar_sector` to the already-referenced plot sector.
- It must never change plot IDs, ownership, plot coordinates, historical payment
  amounts/currencies/statuses, certificate history or NFT/token identifiers.
- Existing citizens keep their original plots. Birth Moon is an added personal
  layer, never a reason to reallocate a migrated plot.

## Gate 4 — Functional regression
On the Preview URL only:
- Existing-user login works with migrated password hashes.
- New free claim works once, creates one user/plot relationship and cannot
  allocate a duplicate plot.
- Birth-date flow produces the Birth Moon signature/region and deterministic
  symbolic coordinates for new claims.
- Existing users retain original plot coordinates when Birth Moon data is shown.
- Public verification does not expose the raw birth date.
- Gift flow records the intended recipient and purchaser correctly.
- Purchased certificate uses the recipient's name and registry data, not the
  founder sample identity.
- Certificate PDF/PNG/QR verification resolve to the same certificate record.
- Photoreal Moon rotation/zoom, gold plot markers, Find My Plot, Center Moon and
  Plot Layers work on a real phone as well as desktop.
- Loading/error states and accessibility basics are checked.

## Gate 5 — Stripe live payment
- Configure the production Stripe secret key only after Gates 0–4 pass.
- Configure a dedicated signed webhook endpoint and `STRIPE_WEBHOOK_SECRET`.
- Confirm the NEW checkout is explicitly **NZD 12.00**. Historical source
  payments are USD records and must not be rewritten merely to match the new offer.
- Perform one real, traceable NZ$12 purchase.
- Confirm webhook signature validation, replay/idempotency protection and exactly
  one payment/certificate transition for the Stripe event.
- Refund the smoke-test purchase if appropriate after verification.

## Gate 6 — Digital archive / Polygon mint
- Configure the production Crossmint key only after the payment flow is green.
- Mint only after a verified paid state.
- Confirm retry/idempotency does not create duplicate NFTs.
- Verify token/transaction on Polygon and save the transaction reference.
- Public token metadata may include Birth Moon attributes but must not expose
  the raw birth date or other unnecessary personal information.
- Preserve the already-minted historical token instead of reminting it.

## Gate 7 — Security closure before custom-domain cutover
- Remove or disable the detailed `/api/diag` function and route before production
  launch. The CI security gate intentionally blocks diagnostics on `main`.
- Re-run the tracked-secret/backup gate and review Vercel environment scopes.
- Keep API responses `Cache-Control: no-store` and non-indexable.
- Confirm no dump/backup files containing user data are tracked in GitHub.
- Confirm the rollback target (existing Emergent deployment) remains available.

## Gate 8 — Domain cutover
- Move `www.lunarbirthrightproject.com` only after Gates 0–7 are green.
- Verify TLS, `/api/health`, login, claim, certificate verification and payment
  callback on the custom domain.
- Keep the old deployment untouched until post-cutover checks are complete.
- If a critical regression appears, roll the domain assignment back immediately.
