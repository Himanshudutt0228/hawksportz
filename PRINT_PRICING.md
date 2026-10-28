# Pocket and large print pricing

Sleeve correction (2026-10-28): left/right sleeves have one option labelled Small at the $2.50 small/pocket rate. Both use the former Large sleeve preview dimensions (65×70 canvas units). Front/back keep Pocket and Large. Old sleeve Large metadata normalizes to Small, and older 45×45 sleeve boxes remain importable; current studio fits them to the selected 65×70 sleeve box. Review/cart label sleeves Small. This supersedes the two-size sleeve description below.

User-confirmed CAD pricing (2026-10-28): T-shirt base $12.50; hoodie base $27.50; hat/beanie base $15.00. “Weeney” was interpreted as beanie and can be corrected by the user. Each Pocket area with artwork adds $2.50 per garment; each Large area with artwork adds $5.00 per garment. Total is per-item price times selected quantities, with shipping/tax separate. No volume discount or embroidery pricing was specified. A jersey base is not confirmed, so its current designer price remains unavailable.

Shared integer-cent rules live in `lib/print-pricing.ts`. The category profiles drive the designer, custom product-card base labels and server cart API. They do not change ready-made product prices. Hat/beanie rates are recorded for those category keys; headwear catalog/admin category support and appropriate photo/print templates still need separate work before these products can actually be offered in the current apparel catalog. Current clothing categories remain T-shirts, hoodies and jerseys.

## Designer

Choose Pocket or Large for the active front/back/left/right view. The selected box changes size. Move it, finish positioning, then add artwork/text inside it. Artwork resizing and rotation are bounded to that box; choosing Pocket cannot retain a full-sized canvas area. One print area per view is currently supported. Any number of supported artwork/text elements in one area counts as one print charge. Empty areas do not add a charge. Side, size and area movement changes participate in undo/redo; review shows pocket/large counts, base, unit and quantity subtotal.

The canvas presets are visual layouts only: front/back Large 190×250 versus Pocket 70×70; sleeve Large 65×70 versus Pocket 45×45. These are preview coordinates, NOT physical dimensions. Real pocket/full print dimensions and garment-specific calibration remain unconfirmed. Do not advertise inches, production accuracy or headwear/sleeve capacities from these preview boxes.

## Persistence and cart

Garment layouts follow the product category and garment_style: short sleeves keep 65x70 sleeve boxes; long-sleeve T-shirts/jerseys and hoodies use 65x200 sleeve boxes. Hats/beanies expose Front only with one 70x70 Small box. These are canvas coordinates, not physical dimensions. Sleeves and headwear retain the $2.50 small rate; headwear base is $15. Jersey base remains unconfirmed.

Admin can enable hats/beanies and assign audiences after applying `supabase/headwear-customization.sql` following product-custom-audiences.sql. Headwear must be explicitly enabled. Existing product photo management still requires four real photos; only Front appears in the headwear editor. Saved v3 includes an allowlisted printTemplate; reopening fits artwork to the current product template. Incompatible non-front headwear files fail without deleting the original. Headwear cart pricing rejects non-front and Large print metadata.

Saved design v3 carries printSizes and printAreas. Import validation rejects unknown print sizes and enlarged Pocket areas and bounds every element to the canonical selected area, including rotated content. Older v1/v2 designs remain readable and load into the current studio as Large areas, with content fitted to the current box before new saves. Previous artwork is not silently deleted. Editable files, browser drafts and immutable custom cart snapshots retain selections.

Custom cart metadata carries the print size for each used view. `/api/cart/products` supplies current trusted category pricing; pre-add verification and cart refresh recompute the unit price from it, ignoring stale client prices. Legacy flat-side cart entries can be updated to Large area pricing where a new profile exists; old fixture/compatibility behavior stays available when only a legacy flat rate is supplied. Unknown or unavailable size policies fail closed.

This is not the final payment authority for custom orders. Artwork is still browser-local; custom checkout remains rejected by the existing server checkout parser and no custom payment/order production storage was enabled. Before accepting real custom payments, persist artwork privately, validate the saved full design and calibrated placement server-side, compute totals independently from trusted records and complete the existing checkout work. Browser/cart price previews alone do not authorize a charge. No remote stock/order/photo/schema changes were made for this feature.

## Checks

Examples: T-shirt Pocket $15; Large $17.50; Pocket+Large $20; two Large $22.50; two Large plus two Pocket sleeve areas $27.50. Hoodie Pocket $30; Large $32.50. Multiple text/image elements in one area do not multiply the fee. Save/reload and review must preserve both sizes and totals; changing local cart price must be corrected by refresh.
