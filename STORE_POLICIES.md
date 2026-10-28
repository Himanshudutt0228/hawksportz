# Store policy pages

## Confirmed details

- Public business contact: hawksportz2026@gmail.com (user confirmed for all enquiries, 2026-10-28). Defined once in lib/store-contact.ts and used on Contact/Shipping/Returns/Privacy and future order email replies. No phone number is published, as requested.
- Canada-wide delivery: CAD $8.99 per order before applicable tax. Free local pickup at the existing shared Kitchener address, 10 AM–8 PM daily/local time, after ready-for-pickup email and arranged pickup time.
- No processing/transit guarantee, carrier, shipping promotion or free-shipping threshold was confirmed. The Shipping page makes none of these commitments.

## Returns decisions still needed

The Returns route is built and linked, with a clear policy-pending/test-checkout notice. It is not a final approved returns policy. User has been asked for the return-request window, required item condition, who pays return shipping and custom-item eligibility. Also settle refunds versus exchanges/store credit, shipping-fee refunds, exceptions, handling of damaged/wrong items and refund timing before enabling live sales. No deadline, final-sale exclusion, fee or refund promise has been invented. Pickup address is not automatically a return destination. Preserve applicable consumer rights.

## Privacy scope and outstanding work

The Privacy notice describes inspected implementation: Supabase authentication and database records, Stripe-hosted checkout, Resend account/order emails, Gmail correspondence, account/guest-access cookies, cart/payment markers and browser-local artwork/design storage. The guest access cookie lasts up to 30 days; this does not imply deletion of server records. No blanket no-tracking, automatic server deletion or Canadian-only processing claim is made. The notice discloses that server-record retention is not yet finalized and that checkout is in test mode.

Before live sales: owner must designate responsibility for privacy requests, approve a retention/deletion schedule and implement it (including orders, outbox bodies, provider records, logs and backups), confirm legal operator details, hosting/providers/regions and fulfilment/carrier disclosures, and ensure staff can handle access/correction/closure/deletion requests received at the confirmed address. No self-service account deletion exists. Provider privacy links do not replace review of their DPAs and actual configurations. Do not describe these pages as legal or production approval.

## Sources reviewed 2026-10-28

- [Ontario returns, exchanges and warranties](https://www.ontario.ca/page/returns-exchanges-and-warranties-ontario): voluntary terms must not be confused with statutory rights; do not invent the owner's policy.
- [Office of the Privacy Commissioner: openness](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_openness/): explain practices and provide accountable contact and request information.
- [OPC retention/disposal guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/gd_rd_201406/): establish appropriate retention/disposal practices; do not promise deletion unsupported by operations.
- [Supabase privacy](https://supabase.com/privacy), [Stripe privacy](https://stripe.com/privacy), [Resend privacy](https://resend.com/legal/privacy-policy).
- [Resend sending API](https://resend.com/docs/api-reference/emails/send-email): reply_to can direct future customer replies to the confirmed Gmail address while keeping the verified domain sender.
