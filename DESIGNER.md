# Hawk Sportz design studio

The default `/custom-apparel` entry now shows product cards first. All custom apparel includes every eligible garment across all audience assignments (and unassigned eligible products) once. Audience filters narrow the catalog. A Customize link opens `?product=<id>` and initializes that garment; the studio uses Change product to return to the filtered catalog, rather than a garment dropdown. Explicit `?design=<id>` links and the browser-local Resume saved design link open saved work. New product selections do not auto-restore unrelated saved garments. Saving also updates the URL to the saved design/product so a reload restores it.

Custom products can belong to multiple audience groups (businesses, schools, sports teams, clubs/groups, hospitality, events). Apply `supabase/product-custom-audiences.sql`, then select groups in Admin New product or Edit → Apparel designer. See CUSTOM_AUDIENCES.md. Homepage audience cards and the custom-apparel filter bar show only the group's eligible garments. Unassigned products stay in All custom apparel; no legacy assignments are guessed. Audience browsing does not automatically restore an unrelated previous garment.

Open `/custom-apparel`. The studio uses apparel rows from the existing `products` table:
categories `tshirts`, `hoodies`, and `jerseys`. Set `customizable` to false on a product to exclude it
if that optional column is present.

Sizes use `sizes` (text array) or the existing `size` (text) column. Colours use `colours`/`colors`
(text array) or `colour`/`color` (text). With no colour data, the only option is “As pictured”.
The preview uses the selected product's actual photo, with `image_url` as the front-view fallback.
The `design_images` JSON stores four required, distinct `front`, `back`, `left` and `right` product-photo URLs.
Run `supabase/product-design-images.sql` in Supabase SQL Editor to add the column and enforce all four
images on new or updated products. It also preserves existing `image_url` values as front photos.
Existing incomplete products remain readable until their missing photos are added; the script lists
these rows. After completing them, validate the constraint using the command at the end of the file.
Product galleries, shop cards and the designer all read the same front/back/left/right photo data.
Use real image URLs on the configured Supabase storage host. Reusing the same URL for multiple
views does not satisfy the four-image requirement. The migration must be applied in Supabase;
frontend code alone cannot enforce requirements on direct database inserts.
Missing views show a clearly marked artwork-only placement area. They do not reuse the front photo
or display a substitute garment. Photo layouts are not calibrated production print templates.
Artwork uploads support PNG and JPEG up to 5 MB. Customers can add text, resize, rotate, drag,
undo/redo, and select front, back, left-sleeve and right-sleeve views. Selected elements have corner
resize handles, direct width/height controls, and Smaller/Larger actions. The quick size actions also
scale a selected group together. Editable JSON files include embedded artwork and can be reopened.
Width and height are independent by default. Enable "Lock proportions" to keep the aspect ratio.
Top/bottom handles change height, left/right handles change width, and unlocked corners stretch
both dimensions. Holding Shift while dragging a corner temporarily preserves proportions.
Each garment view has its own print area. Front/back use the torso; left/right use smaller sleeve
areas named from the wearer's perspective. Positioning, scaling, clipping and zoom follow that area.
Saved design format v2 preserves these positions; older v1 sleeve layouts are migrated from the
former central print area when opened. The default sleeve locations suit a front-facing garment
photo and must be calibrated before production if real side photos use a different composition.
Use "Move print area" to drag the box onto the correct part of the uploaded garment photo, then
choose "Done positioning" to resume artwork editing. The box and its contents move together.
Arrow keys move the focused box; Shift uses larger steps. Positions are independent for all four
views and are included in undo/redo, saved drafts, cart design snapshots and editable downloads.
Area-only adjustments can be saved before adding artwork. "Reset print area" restores the default
position for the active view. These are per-design adjustments, not global changes to the product.
SVG preview downloads show the selected side; these are previews, not production-ready print files.

The editor includes ten system-font choices, multiline text and alignment, bold/italic, letter
spacing, outlines, and straight/arched/wave/circle text. Elements support opacity, horizontal/vertical
flips, duplication, stacking order and positioning. Select-all operates on the active garment
side and can move, center, duplicate or remove the selected elements together. Preview zoom
supports 100%, 150% and 200%; downloads always export the complete garment view.

This is a custom editor, not an InkSoft integration. It does not include InkSoft's full graphic,
font, or text-warp catalog. Garment colours and sizes remain limited to actual product data.

## Printing prices

See [PRINT_PRICING.md](PRINT_PRICING.md) for the current Pocket/Large model. The confirmed CAD bases are T-shirt $12.50, hoodie $27.50 and hat/beanie $15. Each used Pocket area adds $2.50 and each used Large area adds $5 per garment; quantities multiply the resulting unit price. Headwear catalog/templates still need separate setup. Jersey base pricing is unconfirmed.

Choose the size for each view, position its box and add artwork/text. Multiple elements in one view are charged as one print. Empty views are not charged. Saved format v3 retains choices and bounds artwork to the selected preset; v1/v2 imports remain supported. Physical print dimensions/calibration still need confirmation.

The old CUSTOM_PRINT_PRICE_PER_SIDE setting is used only for legacy cart compatibility; it does not configure the current designer. Custom checkout remains disabled until private production artwork storage and independent payment-time validation are complete.

## Storage and next steps

Drafts and immutable cart design snapshots are stored in IndexedDB on the customer's current
browser and device. Cart lines reference these snapshots and keep different designs separate.
No artwork is uploaded to Supabase and no production order is created. The previous quote form
and its unused API/SQL setup have been removed.

Before accepting real custom orders, connect design/asset uploads to private server storage,
validate artwork and pricing on the server, confirm production templates and print dimensions,
and implement orders, stock reservation and payment confirmation. Checkout is still disabled.
The browser-based studio itself needs no InkSoft account or new Supabase tables.

## Standard measurement estimates (2026-10-29)

The customizer now defaults to inches with a centimetre selector (1 inch = 2.54 cm). User-approved adult estimates: Pocket 4x4 in, Large 11x11 in, short sleeve 3.5x3.5 in, long sleeve 2x11.5 in. Width/height entry and selection readouts map existing preview coordinates proportionally along each axis; saved coordinates and pricing are unchanged. These are sizing estimates, not calibrated production templates or guaranteed garment fit. Headwear still uses preview units pending confirmed panel measurements. This supersedes earlier notes that all displayed dimensions are canvas units.

Measurement correction (2026-10-29): the earlier independent-axis conversion incorrectly labelled rectangular boxes as square physical areas. The current implementation preserves existing preview geometry, anchors the estimated width (Large 11 in, Pocket 4 in, short sleeve 3.5 in, long sleeve 2 in), and derives height from the box aspect ratio with one scale for both axes. Thus Large is approximately 11x14.47 in, Pocket 4x4 in, short sleeve 3.5x3.77 in, long sleeve 2x6.15 in. These replace the earlier square/long-sleeve height estimates; they remain uncalibrated estimates, not confirmed equipment limits. Headwear remains in preview units. No saved artwork geometry or prices changed.

Shared-scale correction (2026-10-29): supersedes all earlier per-preset width anchors. Every non-headwear box/view now uses 11/190 inches per preview unit, anchored only to Large width. Derived estimates: Large 11x14.47 in, Pocket 4.05x4.05 in, short sleeve 3.76x4.05 in, long sleeve 3.76x11.58 in. Long sleeve now measures 80% of Large height, matching 200/250 preview units. This does not resize saved geometry or alter prices; existing proofs use the corrected estimate. Headwear still shows preview units. Product photos and real production limits remain uncalibrated.

## Frozen garment views and original artwork (2026-10-29)

New saved designs include a server-signed `garmentProof` with frozen Front/Back/Left/Right garment background images. The editor and Review/checkout/owner sheet all render the same background bytes and saved layer geometry using GarmentPreview. Customer proofs show one combined garment preview with side buttons; owner sheets show four combined views together, including sides marked No print. No separate raw garment-photo gallery is added to customer review. Product photo changes after saving do not replace a saved background. Refresh garment views deliberately updates backgrounds and clears approval. The photos are not recoloured automatically; the selected colour is listed separately, matching current designer behavior.

GET /api/custom-apparel/proof?product=ID reads only the public-RLS product catalog. Background downloads are restricted to the configured Supabase public product-image buckets, refuse redirects, bound bytes/pixels, decode only still raster formats and freeze metadata-free WebP copies for previews. A server-only HMAC binds all four photo bytes to the product. Checkout rejects missing/tampered/swapped-product signatures before reservation. No secrets or private customer artwork are returned by this public photo endpoint. The signing key is the existing server-only Supabase secret; after rotation, refresh garment views and save again before checkout.

The frozen backgrounds travel inside the existing private order-design JSON, so no additional database migration is required. Original PNG/JPEG artwork remains unmodified at uploaded resolution and is downloadable by confirmed admins on paid-order production sheets. Garment backgrounds are normalized for preview; these are separate from original artwork downloads. Existing orders without frozen photos display a clear older-design warning; current product photos are never substituted as though they were the original. Older cart designs must be reopened and saved with garment views before a new checkout. This supersedes the earlier artwork-only owner-preview limitation. Physical sizing and garment fit remain estimates.

Mobile layout (2026-10-29): garment preview appears above tools below 1024px; Design/Sizes/Review steps remain visible while scrolling. At phone widths the editor omits the catalog audience strip and banner, while Change product retains the catalog/audience destination. Review remains proof + summary/comments/confirmation. Inputs use a 16px phone font and HTML buttons have 44px touch height. Desktop column order and payment/approval rules are unchanged.
