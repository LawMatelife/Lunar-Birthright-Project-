# Lunar Birthright V4 — Release Gates

This file is the cutover checklist for the Lunar Birthright production migration.
A later gate must never be treated as passed while an earlier gate is red. Never
trade citizen-data integrity for a green deployment.

## Gate 0 — Reproducible build and source integrity
- V4 frontend source/archive SHA-256 checks pass.
- Backend transport reconstruction checks pass.
- GitHub CI passes with the supported Python and Node runtimes.
- `scripts/security_gate.py` passes.
- The public GitHub repository contains no production secrets or database dumps.
- The Lunar deployment must be isolated from LawMate, VoteMate and Data Wallet.
- Do not deploy Lunar through any Vercel project carrying `lawmate.life` or another
  non-Lunar custom domain.

## Gate 1 — Recover post-handoff claims before touching the Atlas registry
The verified Emergent production baseline is **44 users / 44 plots / 9
certificates / 9 payment transactions**. Emergent re-checked that production
source on 5 September 2026 and confirmed it remains unchanged from the 27 August
handoff. A previously discussed figure of 52 is **not** an independently verified
production count and must not be used as a migration target.

The authoritative-registry formula is:

`verified Emergent 44 baseline + verified post-handoff genuine claims - test/admin/system records - proven duplicates = authoritative registry`

Recovery requirements:
- Preserve the same browser/profile and admin environment used after 27 August.
  Do not clear Lunar localStorage, sessionStorage, cookies/site data or browser
  profile data until recovery is complete.
- Export claim-related browser/admin state read-only.
- Recover central post-handoff evidence from the Lunar Site/admin environment if
  available; browser state alone must not be assumed to be the whole registry.
- For each candidate record, capture source/environment, creation timestamp,
  stable user/account ID, normalized email, plot/claim ID, citizen number,
  certificate ID and country where present.
- Never merge or delete genuine people because names match. Duplicate evidence
  must use stable identifiers such as account/user ID, normalized email, plot ID,
  citizen number or certificate ID.
- Classify obvious test, admin, health-check, development, monitoring and
  placeholder records separately from genuine citizens. Preserve the audit
  evidence even when a record is excluded from public totals.
- Do not restore a 44-only dataset as the final current registry while verified
  post-handoff claims may still be missing.

Gate 1 passes only when the recovered candidate set has been reconciled against
all 44 baseline records and every inclusion/exclusion has evidence.

## Gate 2 — Construct the authoritative registry and restore to Atlas
- Keep the dedicated Atlas `LunarBirthright` application database empty until
  Gate 1 is complete.
- Build a reconciliation manifest before any write. The manifest must show every
  baseline record, every post-handoff candidate, match keys, classification and
  the final retained/excluded decision.
- Record source-file and manifest SHA-256 values where exports/files are used.
- Use `scripts/restore_export_to_atlas.py` or an equivalent guarded restore in
  dry-run mode first. The restore must refuse non-empty target collections unless
  an explicit reconciliation plan allows otherwise, and it must never drop the
  database as part of a normal restore.
- Restore source documents while preserving `_id`, application IDs, ownership
  links, citizen numbers, plot coordinates, certificate IDs, historical payments
  and existing NFT/token references.
- Historical USD payment records stay historical USD records. Do not rewrite them
  as NZD merely because the new offer is NZ$12.
- Daniel Heslip remains Original Founding Citizen No. 000001 only.
- Do not create dummy/test claims in the production registry.
- Derive public citizen and country totals from the final retained production
  records; never hard-code an unverified figure.

### Verified historical baseline
The archived migration baseline contains 44 users, 44 plots, 9 certificates and
9 payment transactions with no duplicate application IDs/emails/plot coordinates
and no broken user↔plot or certificate↔payment relationships. It remains a
baseline, not proof that no genuine claims were created after handoff.

Legacy observations must not be silently rewritten during exact restore: known
user/plot `lunar_sector` mismatches, one conservatively parseable non-ISO birth
date, certificate/payment status-vocabulary differences and historical USD
payments are migration inputs, not permission to change commercial history.

## Gate 3 — Isolated Lunar deployment, runtime configuration and health
- Use a Lunar-only Vercel project. No LawMate/VoteMate/Data Wallet domain may be
  attached to it.
- `DB_NAME=lunar_birthright` is configured for Preview and Production.
- `MONGO_URL` is configured with the restricted Lunar application database user.
  Never put the URI in GitHub, `vercel.json`, issues or public logs.
- Atlas network access is no broader than required for the deployment. Do not
  casually use `0.0.0.0/0`.
- Preview deployment reaches `READY`.
- `/api/diag` reports the Mongo configuration present and Mongo ping successful
  while diagnostics are still enabled for the preview gate.
- `/api/health` returns success from the real application against the restored
  Atlas registry.
- Existing-user lookup/login can read migrated records without changing them.

## Gate 4 — Authenticated `/admin` control plane
The production target is `https://lunarbirthrightproject.com/admin`, but it must
not be described as operational until this gate passes.

The admin console must be owner-authorized and server-side backed by the
restored Atlas registry. Browser-local controls are not sufficient.

Required admin capabilities:
- **Claims:** list/search free and paid claims by stable identifiers, with citizen
  number, claim/plot ID, country, Birth Moon and coordinates where appropriate.
- **Certificates:** show free, complimentary-premium and paid certificates,
  certificate ID, issue date, recipient and status.
- **Manual complimentary upgrade:** `Grant Premium Upgrade` creates a complimentary
  premium entitlement/certificate without fabricating a Stripe payment or marking
  the record paid.
- **Paid state:** a record becomes paid only after verified Stripe evidence.
- **Mint state:** no token ID is shown until a real mint succeeds.
- **Audit trail:** record admin action, timestamp, reason, previous state and new
  state for manual upgrades, exclusions and other material changes.
- **Notifications:** surface new free claim, paid purchase, manual upgrade and
  certificate creation events.
- **Registry controls:** allow test/admin/system records to be excluded from public
  totals without silently deleting the underlying record/evidence.
- **Recovery/import review:** show the 44 baseline and recovered post-handoff
  reconciliation manifest with retained/excluded decisions.
- **Dashboard totals:** citizen and country totals come directly from retained
  Atlas production records.

Authentication/session requirements:
- no credentials committed to source;
- authenticated admin sessions use secure, HttpOnly, SameSite cookies or an
  equivalent server-side session mechanism;
- admin write endpoints enforce authorization server-side, not only in the UI;
- no PII-rich admin route is cacheable or indexable;
- rate-limit login and sensitive mutation endpoints where practical.

## Gate 5 — Functional regression on preview
- Existing-user login/lookup works with migrated records.
- New free claim works once, creates exactly one user/plot relationship and cannot
  allocate a duplicate plot.
- **Claim Mine Free** never enters Stripe.
- Birth-date flow produces the Birth Moon signature/region and deterministic
  symbolic coordinates for new claims.
- Existing citizens retain original plot coordinates when Birth Moon data is shown.
- Public verification does not expose raw birth date.
- The premium gift journey uses:
  - headline: **Their Birthday. Their Birth Moon. Their Place on the Moon.**
  - subheading: **Create a personalised symbolic Lunar Birthright gift for only NZ$12.**
  - CTA: **Create a Personalised Gift — NZ$12**
- The supplied black-and-gold founding certificate is the premium visual example,
  but customer certificates use the recipient's own name, birth date, Birth Moon,
  lunar location, citizen number, certificate ID and issue date.
- No NFT/token placeholder appears before a successful mint.
- The symbolic-registry disclaimer is prominent:
  **Symbolic commemorative registry only—no legal ownership of lunar land is conveyed.**
- Certificate PDF/PNG/QR verification resolves to the same certificate record.
- Photoreal Moon rotation/zoom, gold plot markers, Find My Plot, Center Moon and
  Plot Layers work on a real phone as well as desktop.
- Loading/error states and accessibility basics are checked.

## Gate 6 — Stripe NZ$12 checkout and signed webhook
- The verified public checkout targets are:
  - Existing claimant upgrade: `https://buy.stripe.com/bJe7sMgab6j84fEglg93y03`
  - Personalised gift: `https://buy.stripe.com/28E4gA6zBfTIdQe5GC93y04`
- Remove all `STRIPE_SETUP.md` links/references from customer-facing output.
- Confirm the gift and upgrade checkout amounts are explicitly NZD 12.00.
- Configure a **dedicated Lunar** signed webhook endpoint and
  `STRIPE_WEBHOOK_SECRET`; do not alter the Data Wallet webhook.
- Validate webhook signatures and implement replay/idempotency protection.
- A Stripe event must produce exactly one payment/certificate state transition.
- Complimentary admin upgrades must not create fake Stripe records.
- Verify a complete checkout path before calling payments production-ready.
- Do not manufacture or simulate a successful live payment record in Atlas.

## Gate 7 — Digital archive / Polygon mint
- Configure the production Crossmint/Polygon integration only after verified paid
  state and Gate 6 are green.
- Mint only after a verified paid state.
- Confirm retry/idempotency does not create duplicate NFTs.
- Verify the token/transaction on Polygon and save the transaction reference.
- Public token metadata may include Birth Moon attributes but must not expose raw
  birth date or unnecessary personal information.
- Preserve already-minted historical tokens instead of reminting them.

## Gate 8 — Security closure before custom-domain cutover
- Remove or disable detailed `/api/diag` before production launch.
- Re-run tracked-secret/backup checks and review environment scopes.
- Keep API/admin responses `Cache-Control: no-store` and non-indexable.
- Confirm no dump/backup files containing user data are tracked in GitHub.
- Confirm the rollback target remains available until post-cutover acceptance.

## Gate 9 — Domain cutover
- Move `www.lunarbirthrightproject.com` only after Gates 0–8 are green.
- Verify TLS, `/api/health`, login, `/admin`, free claim, certificate verification,
  checkout callback and public totals on the custom domain.
- Keep the old deployment untouched until post-cutover checks are complete.
- If a critical regression appears, roll the domain assignment back immediately.
