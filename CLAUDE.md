# CLAUDE.md — The Rusti Shack Website

This file gives Claude (and any other developer) the standing context and rules for building and maintaining **therustishack.com** — the real, public-facing website for The Rusti Shack, a family-run dive and snorkeling shop on Apo Island, Philippines.

Read this before writing any code in this repo. If a request conflicts with something below, flag the conflict instead of silently picking one side.

## 1. What this business is

The Rusti Shack sells and rents beach, snorkel, dive, surf, and fishing gear out of three locations:

- **Apo Island Main Shop** (walk-in) — the flagship store
- **Dock-Side Kiosk** (walk-in) — smaller satellite spot near the boat dock
- **International Ship-Out** — not a physical shop; this is how online orders get packed and shipped worldwide

Customers are a mix of locals, tourists visiting Apo Island, and international online shoppers. The shop has real regulars and a loyalty program — this isn't a faceless storefront, it's a small business people come back to.

Product data lives in `The_Rusti_Shack_Dataset.xlsx` (Products, Stores, Promotions, etc. — treat this as the source of truth for catalog structure until there's a real backend). Product photography lives in `public/images/products/`, organized by category and mapped to SKUs via `image-manifest.csv`. `PHOTO_PLAN.md` tracks which product photos exist and which are still missing — check it before assuming an image exists.

## 2. Brand voice

Warm, clear, simple, and consistent — like a friendly local who knows the reef and wants you to have a good day out on the water, not a salesperson.

- Write like a person, not a catalog. "Perfect for your first snorkel trip" beats "Engineered for optimal aquatic performance."
- Keep sentences short. Avoid retail jargon, hype words ("amazing deals!!"), and excessive exclamation points.
- Be specific and honest about the island and the gear — real place names (Apo Island, Dumaguete, the reef, the dock), real details, no generic stock-photo-agency copy.
- It's OK to sound a little informal and personal (this is Dani's shop), but never sloppy or unprofessional.
- When in doubt, read copy out loud — if it sounds like a form letter, rewrite it.

## 3. Visual design system

Coastal, calm, clean — never a generic dark-mode SaaS template or a cluttered big-box ecommerce grid.

**Color direction** (starting palette — adjust for contrast/accessibility, but stay in this family):
- Ocean blue/teal as the primary color (calm, trustworthy) — think shallow reef water, not neon.
- Warm sand/off-white as the background neutral — avoid stark white, it reads cold and generic.
- Deep navy or charcoal for body text (not pure black — softer, warmer contrast).
- One warm coral or sunset-orange accent, used sparingly for calls to action (Buy, Add to Cart) so it actually stands out.
- Avoid saturated primary red/green/purple — nothing that feels like a coupon site.

**Typography:**
- A clean, rounded, highly readable sans-serif for body text (e.g. system font stack, or something like Inter/Nunito Sans/Karla). Legibility on a small phone screen in bright sunlight matters more than personality.
- Headings can have slightly more character (a friendly humanist or rounded display font) but must stay easy to read — no script or novelty fonts.
- Generous line height and font size. Assume some customers are reading this on a phone at the beach.

**Layout:**
- Generous whitespace and padding — let content breathe, don't cram.
- Mobile-first: design and build for a phone screen first, then scale up to tablet/desktop. Never the reverse.
- Large, obviously-tappable buttons and controls (minimum ~44px touch target).
- Real photography over stock icons wherever possible — use the product and lifestyle photos in `public/images/products/`.

## 4. Critical business rule — sale vs. rental (do not get this wrong)

This is the most important functional rule on the whole site.

Every product can be:
- **Sale only** — can be bought online or in person.
- **Both** — can be bought online *or* rented in person at Apo Island (same-day rental: picked up and returned the same day).

(The data model also allows "Rental only," even though no current SKUs use it — build for it anyway.)

**Rules:**
1. **Every product page and product card must clearly and visibly state** whether the item is for sale, available to rent in person on Apo Island, or both. Don't bury this in fine print.
2. **Online checkout only ever supports buying.** There is no online rental flow, no rental reservation system, no "reserve for pickup" cart action — rentals are walk-in only, arranged in person at the shop.
3. If an item is rentable, say so as clearly-labeled *information* ("Also available to rent in person at our Apo Island shop") — never as a clickable online action that implies you can book or pay for a rental through the website.
4. Only the two walk-in locations (Apo Island Main Shop, Dock-Side Kiosk) rent gear. The Ship-Out/online channel never rents — don't reference rental availability in a shipping/checkout context.
5. If you're ever unsure whether a feature is "selling" or "renting," stop and ask — don't guess. Accidentally letting someone "rent" online is a real customer-trust problem, not a cosmetic bug.

## 5. Responsive & mobile QA

- Build mobile-first. Every page — home, category, product detail, cart, checkout, about, contact — must be checked at phone width before it's considered done.
- Check common breakpoints: small phone (~375px), large phone (~430px), tablet (~768px), desktop (~1280px+).
- Watch specifically for: text wrapping/overflow, tap targets too small or too close together, images that don't scale, horizontal scroll (should never happen), and forms that are painful to fill out on a phone keyboard.
- When you finish a page or component, explicitly state that you checked it at mobile width — don't assume desktop-first work "just works" on phones.

## 6. Secrets & security

- **Never** put passwords, API keys, tokens, or any other secret directly in code, config files, or commit history.
- All secrets go in environment variables (`.env.local` or equivalent), and that file must be in `.gitignore` — never committed.
- If a feature needs a secret (payment processor key, shipping API key, email service key, etc.), use a placeholder/env variable reference in code and tell the user to set the real value themselves outside of chat.
- Before committing or pushing anything, double-check no secret values are staged.

## 7. Current project state (as of 2026-07-01)

- No application code exists yet — a prior Next.js scaffold was intentionally removed. This repo currently holds product data (`The_Rusti_Shack_Dataset.xlsx`, `The_Rusti_Shack_Apr2026_Update.xlsx`), organized product photography (`public/images/products/`), and planning docs (`PHOTO_PLAN.md`, `image-manifest.csv`, this file).
- `public/images/site/` is a placeholder for non-product images (logo, homepage hero, category banners, store photos, About photo, promo banners) that haven't been sourced yet — check `PHOTO_PLAN.md` for the current list before assuming they exist.
- Do not scaffold or build the actual site until asked — this file exists so that whenever building starts, it starts with the right foundation instead of a generic template.

Follow every rule in SECURITY.md.

Follow every rule in AI_MANAGEMENT_SECURITY.md.
