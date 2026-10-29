# Real payment readiness

Status: requested by user on 2026-10-29; live payments remain disabled. This is an inspection checklist, not a completed rollout or approved tax policy.

## Decisions and external configuration still needed

- Owner confirms Stripe live activation and bank/payout setup.
- Owner confirms the tax treatment for real Canadian orders. Existing sandbox_no_tax is test-only and cannot automatically become the live policy. Previous notes about revenue/registration are not a complete production tax decision.
- Verify canonical production SITE_URL=https://www.hawksportz.ca, Supabase callbacks and current deployed revision. Recent local features have not been deployed by the agent.
- Configure live keys privately in Vercel Production and a separate live custom-domain webhook with completed, expired and applicable async-success events. Preserve the existing sandbox endpoint for outstanding test sessions. Never paste secrets in chat.

## Repository changes required before enabling live charges

- Explicit payment mode and enable flag, fail-closed key/mode/tax configuration, and persistent order-mode identity. Existing rows remain sandbox. Do not infer old orders' mode from the currently configured API key.
- Update session creation, resume/cancel, receipt resume links and webhook validation together. Verify event/session/order modes agree; test notifications must never settle real orders. Keep signature verification, exact Origin checks, private receipt identity, amount/currency and database stock checks.
- Add an additive reviewed SQL migration for live session binding/settlement. Current database functions require cs_test_ session IDs. Keep existing call compatibility, guest hash binding and payment-state/idempotency guards. Do not simply remove session checks.
- Make customer/admin/receipt/production-sheet/email labels depend on the stored order mode. Existing sandbox receipts and frozen email bodies must stay labelled TEST. Include stored mode in new email snapshots; do not relabel old queued messages when switching modes.
- Confirm failed or uncertain creating reservations can be reconciled against Stripe before releasing stock. Existing docs identify scheduled reconciliation/admin review as outstanding. Do not release an ambiguous reservation just because a request timed out.
- Confirm custom garment calibration and owner workflow before offering actual fulfilment; current inches/cm are uncalibrated estimates. Verify owner approval email delivery and scheduled outbox retries.

## Validation and rollout

Test mode/key mismatches and missing settings, valid/invalid webhook signatures, cross-mode events, duplicate and late events, totals/tax/currency mismatches, private receipt isolation, own-account access, resume/cancel/expiry stock handling, frozen artwork and original downloads, owner approval/outbox deduplication and email retry. Preserve local sandbox testing. Establish operational refund/reconciliation handling and confirm deployed settings before enabling live checkout. Any real purchase needs its own explicit agreed amount and test/refund procedure; none has been authorized or performed by this checklist.

Primary references: https://docs.stripe.com/keys and https://docs.stripe.com/webhooks .
