# Rusti Shack — Product Photo Plan

Source: `The_Rusti_Shack_Dataset.xlsx`, Products tab (197 rows / 45 distinct product families, grouped by ParentSKU + VariantType). See `Rusti_Shack_Photo_Plan.xlsx` for the full working detail and audit notes.

## Product Photo Count by Category

| Category | Number of Product Photos | Recommended Treatment |
|---|---|---|
| Apparel | 15 | Both (on-person + studio) |
| Beach Essentials | 22 | Both (on-person + product-only) |
| Fishing | 8 | Product-only |
| Snorkel & Dive | 12 | Both (on-person + product-only) |
| Surfing | 10 | Both (product-only + lifestyle/action) |

**Total product photos needed: 67**

## Recommended Treatment — Reasoning

- **Apparel — Both.** Shirts, swimwear, bottoms, hats, and footwear are all worn. Customers need an on-person shot for fit/drape, plus a flat/ghost-mannequin studio shot for accurate color and quick comparison across the size grid.
- **Beach Essentials — Both.** Coolers, umbrellas, tents, sun care, and kids' toys are functional gear that reads fine product-only. Sunglasses and water shoes are worn (fit matters), and towels sell better draped/in-use on a beach — so this category splits by subcategory.
- **Fishing — Product-only.** Rods, reels, nets, tackle, and bait are pure gear — nothing is worn, and customers evaluate specs and build quality, not fit.
- **Snorkel & Dive — Both.** Masks, fins, and snorkels (hard gear) work fine as clean product-only shots. The Wetsuit and Snorkel Sets are worn, so those need on-person shots too.
- **Surfing — Both.** Boards, kites, and leashes photograph fine on their own for spec/color accuracy, but surf and kitesurf gear sell heavily on aspiration — action/in-use lifestyle shots add real persuasive value beyond the studio shot.

## Image Organization (delivered set, 2026-07-01)

The full photo set (137 images) has been sorted into the website project at `public/images/products/`, organized into subfolders by category (`apparel`, `beach-essentials`, `fishing`, `snorkel-dive`, `surfing`). The original unzipped download in `Rusti-Shack-Images/` at the repo root is left untouched as the source archive.

**Filename convention:** `{SKU}[-{color-slug}]-{shot-type}.png`, e.g. `APP-004-coral-life.png`, `FSH-001-studio.png`. The color segment is included only for products that actually have a Color attribute in the catalog; shot-type is always one of `studio` (product-only), `life` (lifestyle/in-use), `life-kids` (child-model lifestyle variant), `model-men`, `model-women`, or `model-unisex` (on-person, matched to the catalog's Gender field).

**`image-manifest.csv`** (repo root) maps every organized image back to its source filename, product family, category/subcategory, color, shot type, and the exact catalog SKU rows (including size/gender variants) it represents — use this as the lookup table for wiring images into product pages.

Delivered counts: 137 total images (53 studio, 63 life, 1 life-kids, 8 model-men, 7 model-women, 5 model-unisex) across Apparel (34), Beach Essentials (41), Fishing (16), Snorkel & Dive (25), Surfing (21) — well beyond the 67-photo baseline in the table above, since the shoot also delivered lifestyle and on-person coverage for most families.

`public/images/site/` has been created as an empty placeholder folder for the non-product images listed below, once they're sourced.

## Audit Follow-Up — Judgment Calls & Gaps in the Delivered Set

Cross-checked every delivered image against the Products tab (`image-manifest.csv` build script). Coverage is complete: all 45 product families and every documented color/style variant are represented, with 0 unmatched catalog rows.

- **Judgment call resolved toward more photos:** the 5 gender-only-variation families flagged in the original audit (APP-001, APP-002, APP-007, WET-001, BCH-011) *did* receive separate men's/women's/unisex on-person shots, not just one shared photo. BCH-009 (Polarized Sunglasses) also got a distinct on-person shot per style.
- **Judgment call resolved toward fewer photos:** SUR-003 (Beginner Foam Surfboard) kept a single photo rather than one per length (7'0/8'0/9'0), matching the original 67-photo baseline.
- **Gap — no studio/product-only shot:** 7 families have on-person + lifestyle coverage but *no* flat/product-only shot, even though the Treatment Plan called for one (for color accuracy and size-grid comparison): **APP-001** (Logo Tee), **APP-002** (Souvenir Tee), **APP-007** (Flip Flops), **BCH-009** (Polarized Sunglasses, all 6 styles), **BCH-011** (Water Shoes), **WET-001** (Shorty Wetsuit), **WET-002** (Rashguard). Worth a follow-up shoot or a decision that on-person coverage is sufficient for these.
- **Unclear — shared lifestyle shot:** BCH-003 (Beach Towel) and BCH-004 (Quick-Dry Towel) each have one generic `life` shot not tied to a specific color/print, while their `studio` shots are per-color. Confirm this is intentional (one lifestyle scene reused across colors) rather than missing per-color lifestyle shots.
- **Bonus, not a gap:** SUR-002 (9'0 Longboard) has two lifestyle shots — one adult, one child model (`SUR-002-life-kids.png`) — beyond the 1-photo baseline in the plan. Visually confirmed both show the same board in different use cases; worth keeping both if the site wants to target both audiences.
- **Still entirely unsourced:** all non-product images below — none were included in this photo set.

## Non-Product Images Needed for the Website

- **Logo** and **favicon**
- **Homepage hero image** — likely an Apo Island lifestyle/beach shot to set the tone
- **5 category banner images** — one per catalog category (Snorkel & Dive, Surfing, Beach Essentials, Fishing, Apparel), for nav tiles/collection pages
- **Store/location photography** — 3 real locations (Apo Island Main Shop, Dock-Side Kiosk, International Ship-Out hub); a shop photo builds trust for local buyers
- **Apo Island lifestyle imagery** — general reef/beach/island scenery for About/story content, separate from the hero
- **About/owner photo** — Dani or staff, for an About Us page
- **Seasonal promo banners** — recurring campaigns (Dry Season Kickoff, Back to School, Tournament Bait Bundle, Typhoon Surf Sale) that would benefit from dedicated promo graphics
- **Rental program imagery** — a lifestyle shot showing the same-day rental experience for the rentals page
