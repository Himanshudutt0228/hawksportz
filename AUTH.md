# Authentication

Email/password authentication uses Supabase Auth and `@supabase/ssr`. The UI keeps the existing Hawk Sportz branding.

## Routes

- `/sign-up`: registration and confirmation email.
- `/sign-in`: email/password login.
- `/forgot-password`: request a recovery email.
- `/auth/callback`: exchange a one-time PKCE code; only account and password-reset destinations are permitted.
- `/reset-password`: set a password after recovery, or change it from a signed-in account.
- `/account`: verified, email-confirmed users only, with sign-out.

## Required Supabase setup

1. Enable email/password authentication and **Confirm email** in Supabase Auth settings. Set the minimum password length to at least 12. The app checks email confirmation independently on sign-in and protected pages.
2. Set `SITE_URL` in the application's environment to its exact trusted origin. Development defaults to `http://localhost:3000`; production requires an explicit HTTPS origin. Do not derive this from request headers. Existing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY remain required. No service-role key is needed.
3. Set Supabase's Site URL to the deployed origin. Allow these exact redirect URLs for each environment:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?next=/reset-password`
   - The equivalent HTTPS URLs for the deployed domain. Avoid wildcard production redirects.
4. Keep the default confirmation/recovery templates using `{{ .ConfirmationURL }}` for this PKCE flow. Open emailed links in the browser that started the request; PKCE requires its verifier cookie. Links opened elsewhere fail with instructions to request another link.
5. Configure production SMTP and sender identity. Supabase's default email sender has delivery restrictions and is not a production mail setup. Configure provider rate limits; enable CAPTCHA before exposing public registration/reset to abuse (CAPTCHA UI integration is not included yet).

## Security boundaries

- All authentication mutations are Next.js Server Actions, with framework origin checks and server input validation. Do not broaden allowed origins casually.
- Authentication is entirely server-side. Cookies are HTTP-only, SameSite=Lax, Secure in production. There is no browser auth client and no tokens in localStorage. Public catalog queries remain separate and never share a user's session.
- Proxy refreshes sessions; protected pages/actions independently call `auth.getUser()` rather than trusting cookies or user-submitted claims. Auth routes use private/no-store responses and no-referrer headers.
- Account existence is not exposed by registration/recovery messages. Provider errors, passwords, tokens and codes are not logged by application code. Infrastructure/access logs must redact callback query strings and use suitable retention.
- Password changes attempt global sign-out. Already-issued access tokens may remain usable until their configured expiry; use a suitable Supabase JWT lifetime. Ordinary sign-out is for the current browser.
- Admin membership setup and the protected dashboard are documented in `ADMIN.md`. Signing up never creates an admin. Apply and verify the admin migration before provisioning an administrator. Authentication alone does not secure database tables; audit existing policies before launch and before adding product/order writes.

## Verification

`node --experimental-strip-types --test lib/auth/validation.test.mjs` tests input and callback boundaries. `npx playwright test tests/auth.spec.ts` tests anonymous/forged-session access, invalid callbacks, forms, and navigation on desktop/mobile without creating users or sending emails.

Before launch, use a controlled test mailbox to verify successful registration, confirmation, duplicate registration, valid/invalid login, session refresh, recovery, password change, replayed/expired links, and sign-out against the configured Supabase project. These require email delivery and dashboard setup; UI/security boundary tests do not replace them.

Canonical production domain and migration checklist: [DOMAIN_MIGRATION.md](DOMAIN_MIGRATION.md).
