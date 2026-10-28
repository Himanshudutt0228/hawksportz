# Admin access

Custom apparel can be assigned to multiple audience groups in New product or Edit → Apparel designer after running `supabase/product-custom-audiences.sql`. See [CUSTOM_AUDIENCES.md](CUSTOM_AUDIENCES.md). Clothing type and audience groups are separate settings.

For public homepage/collection/page images, use **Admin → Website images** after applying `supabase/site-images.sql`. See [WEBSITE_IMAGES.md](WEBSITE_IMAGES.md) for setup, image locations and security checks. Product/gallery/designer photos remain under each product's Edit page.

Automatic order emails are now implemented separately: see [ORDER_EMAILS.md](ORDER_EMAILS.md) for the required migration, credentials and retry worker. Until enabled, staff must still contact customers manually. Order reads/fulfilment writes continue to use the current admin's RLS client; email dispatch uses separate service-only queue RPCs after a successful update.

Admin membership is stored in `public.store_admins`. It is independent of email/password sign-up and user-editable metadata. The application uses the signed-in user's normal publishable-key client and RLS; no service-role key is needed.

## Setup

### Sandbox order management

After the existing admin and checkout migrations, run `supabase/order-management.sql` once as project owner. It adds fulfilment status/last-update time/actor to existing orders and indexes paid orders; it does not change payments or stock. The app's existing admin accounts remain unchanged. No admin is granted automatically.

Open **Admin dashboard → Manage orders** (`/admin/orders`) for a 25-order paginated list of paid sandbox orders. Open an order for purchased item snapshots, totals, customer contact and delivery destination. Payment status is read-only. Delivery orders support **To fulfil → Shipped**; pickup supports **To fulfil → Ready for pickup → Picked up**. Each change asks for confirmation. Dates use Kitchener time. No customer emails, pickup scheduling, tracking integration or refunds are sent/performed; staff must contact the customer separately. Changes record only the latest actor/time, not a full immutable fulfilment audit trail. Status correction/backward transitions are not supported in this first step.

Each page/action independently calls `requireAdmin()`. Order reads and the fulfilment RPC use the normal signed-in RLS client, never the server checkout secret. Database reads require current admin membership and confirmed email, including under older permissive policies. Allowed column grants omit guest access hashes, Stripe session IDs, user IDs and raw request lines; no direct authenticated order INSERT/UPDATE/DELETE is granted. The definer fulfilment RPC rechecks confirmed membership, locks the order, requires paid status and the expected current fulfilment status, permits only the delivery-method-specific forward transition and updates only fulfilment fields. It cannot mark payment paid, release inventory or refund. Public sign-up/metadata never grants these privileges.

Local tests execute the real migration in isolated PostgreSQL (PGlite), including malicious old permissive policy/column grants, anon/customer/revoked/unconfirmed access denial, hidden-column and direct-write denial, allowed transitions, invalid/stale/unpaid changes and unchanged payment totals. Checkout SQL regression tests also run after this migration. Action tests cover direct unauthorized calls and ignored submitted identity/payment/stock fields. Browser checks cover anonymous/forged sessions on list/detail pages. These do not replace applying the migration or signed-in live admin/customer checks. No remote order-management SQL or fulfilment changes have been made by the agent.

After setup, verify existing paid sandbox orders appear; open a pickup test order, mark it ready, then picked up; verify a delivery order can only be marked shipped. Check the customer account and revoked admin are denied pages and direct reads/RPC calls. A second admin tab with an outdated state must be rejected until refresh. Existing public customer receipts stay protected and unchanged; customer-facing fulfilment status/notification integration is future work.

### Initial admin setup

1. Run `supabase/admin-access.sql` once in the Supabase SQL Editor. It creates a table with row-level security and no public insert/update/delete permissions. No one is made an administrator automatically.
2. In Authentication > Users, find the intended **email-confirmed** account and copy its User UID. In SQL Editor, replace `USER_UUID_HERE` with that UID and run:

   ```sql
   insert into public.store_admins (user_id)
   select id from auth.users
   where id = 'USER_UUID_HERE'::uuid and email_confirmed_at is not null
   on conflict (user_id) do nothing
   returning user_id;
   ```

   One returned row confirms a new grant. No returned rows means the account is unconfirmed/missing, or membership already exists. Verify it with:

   ```sql
   select user_id from public.store_admins where user_id = 'USER_UUID_HERE'::uuid;
   ```

3. Refresh `/account` and use the Admin dashboard link, or open `/admin`. A new sign-in is not required: membership is read from the database on each protected request.

## Change administrators later

Grant the new account access using the same SQL, verify that account can open `/admin`, then revoke the old account:

```sql
delete from public.store_admins where user_id = 'OLD_USER_UUID_HERE'::uuid;
```

Only trusted project operators using the Supabase dashboard should manage membership. Do not expose a public role-update endpoint or add client write grants/policies to store_admins. No customer self-service admin promotion or in-app admin assignment exists.

## Enforcement and current scope

- `requireAdmin()` verifies identity with Supabase and checks current database membership before rendering the dashboard. Missing table, query error, or absent membership denies access. Signed-out users go to sign-in; signed-in non-admin users return to their account.
- The Account link is conditional for convenience; the page independently checks permissions even for direct URLs.
- Call `requireAdmin()` inside every admin page and action, and add appropriate RLS policies for each operation. Do not rely solely on layouts or Proxy. Its read-only cookie adapter prevents cookie changes during page rendering; database writes still use the verified session and database permissions. Proxy handles session refresh.
- The dashboard lists products and links to `/admin/products/[id]` to edit name, description, CAD price, and stock. Both the page and save action independently require current admin membership. Inputs are validated on the server and updates explicitly allow only these four fields. No service-role key is used.
- Run `supabase/product-editing.sql` once before saving products. It enables products RLS, removes existing table/column update grants for public roles, grants only the four editable columns to authenticated users, and restricts updates to database admin membership even if an older permissive policy exists. Existing storefront read policies are preserved. Product INSERT/DELETE, storage policies, and any custom database functions remain outside this migration and require a separate live audit. Existing restrictive policies can still deny an admin update; investigate those rather than weakening them.
- Do not cache admin membership across requests. Revocation takes effect on subsequent server checks; already-rendered pages may remain visible until navigation/refresh.

## Verification

### Product deletion

Run `supabase/product-deletion.sql` once. It enables product RLS, removes public/anonymous DELETE grants, grants DELETE to authenticated users only under an admin membership policy, and adds a restrictive admin guard so older broad policies cannot allow customer deletion. Anonymous deletion is explicitly denied. The migration deletes no rows.

Use **Admin → Edit product → Delete product**. The browser asks for confirmation with the product name. The independent server action rechecks admin access, validates the bound product ID and confirmation value, deletes only that ID, checks the returned row, revalidates the storefront, and returns to the product list with a success notice. A submitted alternate ID is ignored. Existing foreign-key restrictions produce a clear error; no application cascade is added. Review any existing database cascades/triggers separately before production deletion. Product photos are retained to avoid breaking other references; trusted operators manage unused files later. Deleted items are removed from saved carts on their next availability refresh, and saved designs remain local but cannot be ordered for a missing product.

Local checks cover unauthorized invocation, malformed IDs/missing confirmation, exact target filtering, missing products and database/foreign-key failures. Verify the confirmation Cancel path and a disposable product deletion after applying SQL, then confirm the product disappears from catalog/designer, its direct page no longer exists, and customer/anonymous/revoked-admin direct DELETE is denied. Agent has not applied the migration or deleted any live product.

### Designer availability

Clothing Edit pages include an independent Apparel designer checkbox and Save designer availability action. Saving it requires current admin access and updates only `customizable`, restricted to clothing categories, without changing stock/photos. Run `supabase/product-designer-settings.sql` once to grant this column under the existing restrictive admin UPDATE guard and restore the specific older T-shirt (ID 1) reported missing from the designer.

The original creation migration introduced `customizable` with a false default, which could disable previously eligible legacy clothing. That migration now adds a nullable column without a default, preserving the preexisting `customizable !== false` behavior. The repair script removes the false default/not-null requirement and restores only the identified product, leaving all other explicit choices intact. New-product forms still send true/false explicitly. Refresh the designer after applying SQL and confirm both T-shirts are selectable. The agent inspected public eligibility flags but has not applied the repair remotely.

### Stock by size

Run `supabase/product-size-stock.sql` once after product-creation.sql and the earlier editing migrations. If creation setup has not been applied, the script stops with an explicit prerequisite error. It adds nullable `stock_by_size` JSONB, grants reads through the existing product RLS and writes under the existing admin-only INSERT/UPDATE guards, and installs a validation trigger. Size keys must match the product's available sizes, counts must be nonnegative integers, and total stock is derived in the database (maximum 999,999,999). New sized products need a count for every size; configured sized inventory cannot revert to a shared pool. No existing quantities are split or invented.

New product and Edit forms show one stock field per size and an automatic total. Products without sizes keep one stock field. Existing sized products with a null map retain legacy shared-stock behavior until an admin enters actual counts on Edit; the form explains this and requires all counts before saving. Added sizes in the creation form immediately show corresponding count fields. On Edit, accepted size keys come from a fresh database read, ignoring any submitted size-list or total overrides. Existing product photo constraints still apply.

Product selection disables sold-out sizes. Cart additions, quantity changes, restoration and server-data refresh apply both size-specific and overall caps. Ready-made and all custom-design lines share the same size inventory. The designer limits each size, rechecks current availability through the server before adding, and carries size counts into the cart. Legacy products remain bounded by their old shared total until configured. This remains a cart availability check, not a stock reservation; checkout/order-time validation and atomic stock deduction are still required before real purchasing.

Run `supabase/tests/product-size-stock.sql` as owner to test trigger validation/derived totals on a rolled-back temporary table. This does not test live role boundaries or mutate real inventory. Live verification must still cover admin count saves, customer/revoked-admin direct write denial, public size display, cart corrections after size stock decreases, and custom/ready-made competition for a size. Agent has not applied the migration or changed live stock.

### New products

Run `supabase/product-creation.sql` once after the editing/image migrations. It adds optional catalog columns if missing (sizes/colours arrays and a customizable flag), verifies existing array-compatible types, creates a unique slug index, revokes broad and column-level INSERT grants, and grants only the creation fields to authenticated users. Restrictive RLS still requires current database admin membership even if older permissive policies exist. Anonymous INSERT is explicitly denied. Numeric sequence usage is granted where needed; the product ID remains database-generated. Existing duplicate slugs or incompatible column types stop the migration instead of changing live product data automatically.

Use **Admin → New product**. The form supports a name, description, one of the existing four categories, CAD price, total stock, comma-separated sizes/colours, optional clothing designer eligibility, and four required real photos. The product URL is generated automatically from the name with a UUID suffix; staff do not enter a slug, and products may share a display name. Clothing needs sizes; equipment cannot be enabled in the apparel designer. Creation makes the product public immediately; there is no draft/publish workflow. The schema's existing defaults must supply an ID and any other required fields. Unexpected schema requirements fail safely with an error, requiring operator review.

The page and action independently require admin access. The server validates every field, ignores submitted IDs/privilege fields/slugs, validates every photo before any upload, uploads new immutable photos, and then inserts the product. The database unique index catches collisions; the action tries a fresh generated URL up to three times without reuploading photos. Successful creation redirects to the new Edit page. Failed/uncertain inserts can leave unlinked uploads, as described below; check the product list before retrying an uncertain response.

Local tests verify direct unauthorized action denial, field validation, missing photo no-write paths, safe URL generation across accents/symbols/long/non-Latin names, image-link completeness and field allowlisting on success, automatic collision retry, and bounded persistent-conflict failure. Live verification remains required after migration: admin creation and storefront/designer display, customer/anonymous/revoked-admin INSERT denial through direct APIs, and database uniqueness. No remote creation or migration was performed by the agent.

### Product photos

Run `supabase/product-image-editing.sql` once after the earlier product-editing and product-design-images migrations. It grants image-column access under the existing admin-only UPDATE guard and creates a dedicated public `admin-product-images` bucket (5 MB, WebP only). Admins may insert new objects; restrictive policies block customer/anonymous uploads and prevent app users from updating/deleting these immutable objects, including through older broad policies. Existing storage buckets are unchanged.

On a product's Edit page, use **Product photos** to select replacement front/back/left/right files and **Save photos**. Empty fields retain current views. The front photo also updates `image_url` to keep the main image consistent. Products missing views must have every missing view supplied together, preserving the existing four-view constraint. Sleeve sides use the wearer's perspective. No image-generation or placeholder substitution occurs.

The save action independently authorizes the user, validates product IDs, decodes still PNG/JPEG/WebP files, rejects more than 5 MB or 16 million pixels per file, strips metadata, and writes resized WebP files up to 2400 pixels on either edge. Sharp is an explicit dependency. The Server Action body limit is 21 MB to accommodate four 5 MB photos plus form overhead; individual files are checked on the server. The browser also rejects oversized files before submission. Object names are generated on the server. No external image URL fetching or privileged storage key is used. Product links are updated only after all uploads succeed, with a comparison against the previous image values to reject conflicting edits.

Old images are retained. Failed or conflicting saves can leave unlinked uploads; this deliberately avoids deleting an object after an uncertain database commit. Trusted operators can review and remove unreferenced objects through the Storage dashboard later. App users cannot delete files. Do not delete referenced photos.

After applying SQL, verify an admin replacement appears both on the storefront and in the designer; a normal customer and a revoked admin must be denied upload/link updates through direct APIs as well as the edit page. Verify unchanged views remain, missing views produce a useful error, and a save failure preserves current product links. No remote image migration, storage upload, or database role test has been run by the agent. Local tests cover image decoding/rejection, metadata stripping, resizing, direct unauthorized action invocation, corrupt-upload side effects, and browser denial.

Run `supabase/tests/product-editing.sql` after the editing migration to verify customer denial, admin update, forbidden-column denial, immediate revocation, and anonymous denial. It rolls back all changes, including temporary membership changes and the no-op product update. Existing product constraints/triggers apply; an admin update failure may indicate incomplete legacy product data. No live SQL execution has been performed by the agent.

Customer order history uses a separate read-only ownership-checked RPC after `supabase/customer-orders.sql`; see CHECKOUT.md. It leaves admin order RLS and fulfilment permissions intact. Customers can view their own paid snapshots/status from Account → Your orders but cannot change status or read other customers' orders. Admin changes appear when the customer reloads their order page; no notification is sent.

`npx playwright test tests/admin.spec.ts` checks anonymous and forged-session access on desktop and mobile. Live tests still require applying the migration: verify normal users are denied, approved users are admitted, membership cannot be edited through the public API, and revoking membership removes access. These database-backed checks are not replaced by the anonymous browser tests.

Run `supabase/tests/admin-access.sql` in SQL Editor to check self-only reads, other-user isolation, and denied membership writes under actual authenticated/anonymous database roles. It uses an existing confirmed account as a temporary test member inside a transaction and rolls all changes back. If an assertion fails, roll back the failed transaction before continuing. This script has not been executed locally because no direct database connection is configured.
