# Lunar Birthright Registry Recovery Checkpoint — 7 September 2026

## Purpose
Preserve the exact recovery state so work can resume without guessing which dataset is authoritative.

## Confirmed source datasets

### Emergent production export
Fresh export supplied 5 September 2026:
- `moon-registry-1-test_database_dump_20260905_224817.zip`
- users: 44
- plots: 44
- certificates: 9
- payment_transactions: 9

The downloaded 5 September ZIP and all four collection payloads are byte-for-byte identical to the earlier verified August baseline. Treat it as the immutable historical Emergent baseline, not as evidence of later claims.

### Later live/admin claimant dataset
A signed-in `/admin` browser view on 5 September showed 52 total citizens, with recent claim references reaching 000051 and 000052. This dataset was not present in the Emergent production dump. The full authenticated row export was not captured before the previous session ended.

On 7 September the project owner reports the live/current count has subsequently reached about 54. These later claims must be recovered from the authenticated admin/browser data source before any production migration.

## Recovery tools
- `scripts/admin_persistence_probe_bookmarklet.txt` — read-only authenticated admin endpoint probe.
- `scripts/browser_claim_state_bookmarklet.txt` — read-only same-browser claim-state exporter.
- `scripts/reconcile_browser_claims.py` — compares browser evidence against the Emergent baseline.
- `scripts/reconcile_admin_probe.py` — compares authenticated admin-probe records against the Emergent baseline. Console output is counts only; optional local private output contains claimant fields required for migration review.
- `scripts/audit_export.py` — audits the four-collection Emergent ZIP without changing it.
- `scripts/restore_export_to_atlas.py` — existing restore tool; DO NOT run against production until later claimant reconciliation is complete.

## Atlas state
Atlas cluster `LunarBirthright` is reachable but the intended `lunar_birthright` application database is currently empty. Do not populate it from the 44-record baseline alone while newer claims remain unrecovered.

## V4 state
The recovery/admin V4 preview can render the hardened admin UI, but Vercel currently does not expose a valid `MONGO_URL` to that runtime. The admin UI therefore cannot yet serve as the authoritative production registry.

## Non-destructive recovery sequence
1. On the exact browser/profile that displays the later `/admin` citizen list, run the existing read-only Admin Persistence Probe.
2. Preserve the downloaded `lunar-admin-persistence-probe-<timestamp>.json` unchanged.
3. Run `reconcile_admin_probe.py` against the verified 44-record Emergent ZIP.
4. Confirm the recovered admin total and classify records as baseline-existing, genuinely new, ambiguous, or insufficient.
5. Resolve only ambiguous records using stable identifiers. Never merge/delete based on matching visible names alone.
6. Build a private migration dataset preserving the original 44 records exactly and adding verified later claimants with their stable identifiers/claim references.
7. Integrity-check user↔plot↔certificate/payment relationships and citizen numbering.
8. Only then restore the reconciled dataset to Atlas.
9. Configure Vercel `MONGO_URL` securely and verify `/api/registry-stats` and authenticated `/admin` against Atlas.
10. Keep the old live database/site available until browser acceptance proves the Atlas-backed registry contains every current genuine claimant.

## Safety rule
No production delete, merge, renumber, domain cutover, or partial 44-record Atlas migration until the later admin claimant dataset has been captured and reconciled.
