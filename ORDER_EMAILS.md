# Automatic customer emails

Public support/pickup/returns/privacy contact is the user-confirmed address in `lib/store-contact.ts`. Newly prepared order messages include it in their text and `reply_to`; the sender remains accounts@hawksportz.ca. Previously frozen requests keep their original contents for idempotency. Supabase Auth SMTP configuration is separate and has not been changed by this reply-address update.

Sandbox only. Payment confirmation, ready-for-pickup and shipped notifications are labelled TEST. No picked-up email, tracking, receipt access links, marketing or delivery webhooks. Existing paid orders are not backfilled. Future fulfilment changes on existing paid orders do enqueue their respective notification.

## Setup

1. Run `supabase/order-emails.sql` once as project owner after `order-management.sql`. This creates a private transactional outbox and service-only dispatch functions. It changes no stock, payment or admin permissions.
2. In `.env.local`, set these server-only values (never use NEXT_PUBLIC):

```dotenv
ORDER_EMAILS_ENABLED=true
RESEND_API_KEY=your_domain_scoped_sending_key
ORDER_EMAIL_FROM=accounts@hawksportz.ca
ORDER_EMAIL_WORKER_SECRET=your_random_secret_at_least_32_characters
```

Use a new Resend sending-only API key scoped to hawksportz.ca. Supabase SMTP credentials alone are not available to this website server. Do not share keys in chat. Restart the app after configuring it. The sender is fixed to the already verified domain; it is not a monitored mailbox unless separately configured as one.

3. Start the retry worker locally in another terminal: `node --env-file=.env.local scripts/order-email-worker.mjs`. Keep it and the Stripe listener running while testing. It checks once a minute. For hosting, schedule POST `/api/internal/order-emails` every minute with `Authorization: Bearer <ORDER_EMAIL_WORKER_SECRET>` over HTTPS; hosting/scheduler is not provisioned by this change. Set ORDER_EMAIL_WORKER_URL to the trusted HTTPS origin to use the script remotely.
4. Make a new sandbox purchase with an inbox you control. Verify one payment email, purchased snapshot/CAD totals and TEST labelling. Duplicate Stripe events should produce one queue row and one message. Mark a pickup order ready and a delivery order shipped; verify one notification each and check admin Customer emails statuses. Declined/unpaid orders must send nothing. Check Resend for delivery/bounces. Recipient-provider bounces (including the known university case) still need investigation.

## Reliability and operation

Database triggers queue emails in the same transaction as the status transition. Failed sends never undo payment or fulfilment. UI access alone never grants sending rights. Anonymous/customers cannot read or alter the queue, call dispatch RPCs or query admin email status. Recipient and purchased data come only from settled server order snapshots. Bodies are plain text; no client-supplied recipients/URLs or private receipt cookies are sent. Logs omit addresses, message bodies, secrets and provider errors.

The worker leases up to three jobs per call, uses a 10-second provider timeout and 5-minute retry spacing. It freezes the entire provider request before the first send and uses a stable key per queue job. Concurrent workers skip leased jobs; expired leases can recover crashes. Payment confirmation precedes fulfilment if both are queued. Accepted means provider acceptance, not inbox delivery; use the Resend dashboard for actual delivery and bounces.

Resend retains idempotency keys for 24 hours: automatic retries stop after 23 hours from first attempt or 20 attempts. Invalid payloads/credentials need operator review; transient network/429/5xx failures retry. Do not reset or resend review rows blindly: first check Resend for prior acceptance/delivery, then contact the customer manually if necessary. A review payment email blocks its later fulfilment emails until an operator resolves delivery manually. Expired-window retries deliberately require review to avoid duplicate messages. Queue snapshots/request bodies contain customer purchase data; include this table in retention/backups/access review before production.

Disable dispatch with `ORDER_EMAILS_ENABLED=false`. The queue still records future transitions while disabled; enabling later dispatches queued notifications. Review old pending messages before enabling after a long outage. No production sending or hosting scheduler is claimed ready.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [idempotency and 24-hour retention](https://resend.com/docs/dashboard/emails/idempotency-keys).
