# Website layout and image management

The homepage now also includes six custom-apparel audience cards. After the original image setup, run `supabase/custom-apparel-cards.sql` once to add their six independent upload controls. Existing seven image controls continue to work before this extension is applied. Cards open the existing custom-apparel designer; their images use the same admin checks, validation and immutable storage rules. No reference-site photographs are copied.

## Setup

Run `supabase/site-images.sql` once as the Supabase project owner after `admin-access.sql`. It creates seven empty public image slots, a separate public storage bucket and protected upload/save permissions. It grants no new admin, changes no product permissions and copies no reference-site images. Until applied, the storefront uses its text/colour fallbacks and Admin shows setup guidance.

Open **Admin → Website images**. Upload a still PNG, JPEG or WebP up to 5 MB and 16 megapixels, enter an accessible image description, and Save image. Each slot gives a recommended shape:

| Control | Used on |
| --- | --- |
| Homepage main image | Homepage hero |
| T-shirt / Hoodie / Jersey / Hat / Beanie / Sweatshirt / Equipment collection | Homepage category card, shop-by-category card, corresponding collection banner |
| Design Your Own / Custom Apparel image | Homepage Design Your Own card and Custom Apparel page |
| About page image | About page |

Square collection photos are cropped differently in wide banners. Choose photos with the main subject near the centre. To remove an image, tick Confirm removal and choose Remove image; the website restores its fallback or omits the optional banner. Original uploads remain retained.

Existing **Admin → Products → Edit → Product photos** continues to manage product cards, product galleries and garment-designer views. These refer to the same saved product photos rather than separate uploads. Customer artwork, built-in editor vectors and interface icons are separate from public website photography. The current logo is text, not an uploaded image. Any new image section should be registered as a managed slot rather than hardcoded.

To add website photos for **Hats**, **Beanies**, **Sweatshirts**, and the separate **Design Your Own** homepage card, run `supabase/shop-category-images.sql` after `supabase/custom-apparel-cards.sql`. If the six Custom Apparel audience image options have not been installed yet, apply both scripts in that order. The shop script adds four empty slots and extends the existing allowlisted upload policies without changing prior images or administrator rules. Jerseys already has its own image option. Each category image is shared by its homepage card and collection banner. Design Your Own's photo is separate from the Custom Apparel page banner.

## Permissions and handling

Every image page/action requires current server-verified admin membership. The application uses that admin's authenticated client; it adds no service key. A database helper separately requires current membership and confirmed email. Public readers get slot/path/description/version only, never the last admin actor. App roles cannot directly insert/update/delete settings rows. The version-checked RPC verifies an uploaded object exists and the table constraint binds it to the correct allowlisted slot/UUID WebP path; changing someone else's version fails.

Uploads reuse the existing Sharp decode/re-encode pipeline: no SVG/animation, 5 MB/16M pixel bounds, metadata removed, rotated, resized to at most 2400 pixels and converted to WebP. Client filenames and submitted paths/identities are ignored. Storage restrictive policies deny anonymous/customer/unconfirmed/revoked-admin uploads even if older broad policies exist; overwrite/delete and moves into this bucket are also blocked for app users. Other buckets are not changed. This is a public artwork bucket: never upload customer artwork or private files to it.

Immutable filenames prevent stale cached photos. Saving revalidates the root layout. Public display uses only configured Supabase bucket paths and the existing allowed image host. Missing setup/read failures fall back without exposing database details. A failed or uncertain link can leave an unlinked upload; keep it for trusted-operator review rather than deleting an image after an uncertain commit. Cleanup/retention and full audit history are not automated.

## Layout

`.store-container` uses the full available width with responsive 20–64px side gutters. Header/nav/footer, homepage sections, catalog/search/category/product pages, About/Contact, cart and custom studio use it. Reading and authentication/admin forms keep sensible content widths. Brand and actual business facts remain Hawk Sportz. TeePrintHouse was used as the user's width/layout reference; its images, policies, statistics and production promises were not imported.

## Live checks after migration

As admin, upload a homepage image and check the refreshed homepage on desktop/mobile, replace it, change its description, verify dismissing removal confirmation preserves it, then remove it. Repeat a category photo and check all three placements, plus About/custom apparel banners. Verify normal customers cannot open `/admin/website-images`, upload to the bucket or invoke the save RPC. Revoked/unconfirmed admin access must fail too. Existing product-photo controls remain the path for product/gallery/designer images. Remote migration/storage and signed-in saves need this user verification; local checks alone do not establish remote permissions.
