# Product

## Users

**Primary buyers — healthcare professionals in Egypt.** Doctors, nurses, dentists, lab technicians, students entering clinical rotations. They shop in Arabic, on phones during clinic downtime or at home after long shifts. They need apparel that fits, lasts a wash cycle, and ships to an Egyptian address paid in EGP via Cash on Delivery, Instapay, or mobile wallet. They are not casual browsers; they arrive with a category in mind (scrub top, lab coat, surgical headwear, footwear) and want to compare colour, size, and price without being marketed to.

**Operators — Dr_Mirror admins.** Run the store from a desktop. Their workday is order triage: which payment proofs need review, which orders are stuck in Pending, which products need a stock or price update, which inquiries need a reply. They scan tables, not cards. They live at `/admin` and never see the storefront unless they sign out.

**Out of scope.** Equipment, refurbished devices, spare parts, surplus inventory, or any non-apparel commerce. The catalog is medical apparel only — that boundary is load-bearing for naming, copy, SEO, and category structure.

## Product Purpose

Dr_Mirror is an Arabic-first e-commerce product for medical scrubs and uniforms. Two surfaces, one product:

- **Storefront** — buyers browse the catalog by category, gender, size, and colour; pick a Size × Colour variant; cart; check out across a three-step flow (address → payment → review); upload a payment proof when the method requires one; and track the order through an eight-state lifecycle (`Pending` → `Confirmed` / `PendingPaymentReview` → `Paid` → `Preparing` → `Shipped` → `Delivered`, with `Cancelled` terminal).
- **Admin dashboard** — operators run the queue: approve or reject payment proofs, transition orders through the state machine, CRUD products and categories, manage payment methods, read inquiries, audit users by role, and review the full admin audit log (every order transition and catalog mutation is recorded).

Success looks like a buyer who finds their scrubs in three taps and an admin who clears the proof queue without leaving the keyboard. Both happen in Arabic by default, on a dark theme by default, in EGP by default.

## Brand Personality

**Premium, trustworthy, clinical, practical, Arabic-first.** The voice borrows the discipline of Linear, Vercel Dashboard, Stripe, and Notion without copying their layouts — restraint, tight spacing rhythm, single accent, one weight per moment. The product feel borrows from FIGS (confident apparel photography), Aesop (typographic restraint), and Hermès (editorial product pages) — not from generic e-commerce templates.

Three-word personality: **confident, clinical, calm.**

The storefront is editorial and quiet — premium without being precious. The admin is dense and operational — fast without being austere. They share typography, palette, and component grammar; they part company on density and chrome.

## Anti-references

The product fails the moment it starts looking like any of these. They are immediate-reject signals:

- **Generic SaaS storefront** — gradient blob hero, three feature cards, two CTAs, stock smiling-team photo. Dr_Mirror sells uniforms, not a platform.
- **"AI assistant" aesthetic** — floating orbs, particle effects, glassmorphism panels, twinkling stars, glow halos. We are an apparel store, not a chatbot.
- **Bargain-bin medical e-commerce** — clip-art stethoscope icons, healthcare-blue gradients, "lowest prices guaranteed!" badges, four-star-review carousels above the fold.
- **Pastel wellness fashion** — pink/cream/sage washes, smiling-model lifestyle photography, fashion-magazine layouts. Buyers are scrubbing in, not unwinding.
- **Generic Shopify minimal** — centred-everything, oversized hero type with no point of view, "Shop Collection" CTA, stock testimonial slider.
- **Corporate hospital portal** — flat institutional blue, dense-but-ugly forms, 1990s table chrome, government-website aesthetic.
- **Template admin dashboards** — purple-gradient sidebars, hero-metric cards with rainbow charts, neon line graphs, kanban-as-decoration.

If a reviewer can say "AI made that" or guess the category from the palette alone, the design has failed.

## Design Principles

1. **Borrow discipline, not layouts.** Linear, Vercel, Stripe, and Notion are our quality bar — copy their rigor (spacing rhythm, single accent, keyboard density, restrained chrome), invent our own forms. Dr_Mirror has its own identity: Arabic-first, dark-first, medical-clinical, premium-restrained.
2. **Arabic and RTL are first-class, not adaptations.** Every screen ships in four states — `(dark, rtl)`, `(dark, ltr)`, `(light, rtl)`, `(light, ltr)` — and is reviewed in all four before merge. Logical CSS only. Directional icons mirror; symbolic icons don't. Numerics stay Western, tabular, in both locales.
3. **Two surfaces, one system, separate moods.** Storefront and admin share tokens, type, and components; they diverge on density and chrome. Storefront breathes (comfortable spacing, editorial type, single accent used surgically). Admin packs (dense rows, small text, borderless tables, status badges that scan). A buyer should never feel admin density; an admin should never feel storefront editorial polish.
4. **HeroUI is the system; use it, do not fight it.** HeroUI v3 is the only component library. Use the components as-is and restyle through tokens. No mixed UI systems. No raw HTML controls when a HeroUI equivalent exists. No reinventing buttons, inputs, modals, popovers, tables for flavour. Lucide is the only icon set.
5. **Restraint is the aesthetic.** One accent hue per page. At most three font weights. At most two levels of card nesting. No glows, neon, glassmorphism, autoplay, parallax, scroll-jacking, or page-load animations. When in doubt, remove rather than add — a blank surface, well-spaced, is more on-brand than a busy one.
6. **Trust is earned by craft, not claimed by copy.** The product is sold by typography, photography, and the way the interface behaves under thumb. No trust badges, no "as seen in" carousels, no five-star testimonials above the fold. The premium feel comes from the silence of the chrome and the precision of the type.

## Accessibility & Inclusion

**WCAG 2.1 AA** is the floor for both surfaces. Production requirements (not aspirations):

- **Contrast.** Body text ≥ 4.5:1 against its surface; secondary text ≥ 3:1. Verified in both dark and light.
- **Keyboard.** Every interactive element is reachable via Tab/Shift-Tab in logical (RTL-aware) order. Focus rings are visible — never suppressed. Variant pickers (colour, size) are RAC `radiogroup`s with arrow-key navigation.
- **Screen readers.** Form labels are always present (not placeholder-only). Status badges include text, not colour alone. Out-of-stock variants stay rendered but disabled + line-through so the system is legible non-visually.
- **Motion.** All animation respects `prefers-reduced-motion`. Default transition duration ≤ 200 ms; no bounce, no spring, no parallax, no autoplay.
- **Bilingual parity.** Every key in `locales/en/*.json` exists in `locales/ar/*.json`; `npm run i18n:check` fails CI on a missing key. Arabic and English content render with equal care — no second-class locale.
- **Numerics.** Western digits everywhere (`numberingSystem: 'latn'`), tabular on prices, tables, counters — so a column of scrubs aligns whether the surrounding prose is Arabic or English.
