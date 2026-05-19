# Dr_Mirror — Product Context

## Product Purpose
Arabic-first e-commerce platform for medical scrubs and uniforms targeting the Egyptian healthcare market. EGP-priced, RTL-primary, dark-first design. Two distinct surfaces: a buyer storefront and an operator admin dashboard.

## Register
product

## Users

### Storefront (Buyers)
- Egyptian healthcare professionals (nurses, doctors, clinic staff)
- Mobile-first, often on budget Android devices on hospital Wi-Fi
- Primary language: Arabic; secondary: English
- Shop for work uniforms; need to see color swatches, sizes, fit
- Upload payment proof (bank transfer is common in Egypt)
- Expect warm, trustworthy, professional feel — not a cold SaaS tool

### Admin Dashboard (Operators)
- Small team of store operators and managers
- Desktop-heavy, occasionally tablet
- Manage catalog, orders, users, audit logs, payment methods
- Need dense, efficient, information-forward UI
- Arabic and English bilingual

## Brand Voice
Professional, warm, Egyptian market-aware. Trustworthy without being clinical. Product photography is the hero — UI gets out of the way. Currency always in EGP. Dates in Arabic format when language is AR.

## Anti-references
- Cold white SaaS (Stripe, Linear default light)
- Rainbow gradients / neon / glassmorphism gimmicks
- Western medical blue-and-white sterility
- Heavy sidebar-obsessed admin panels (Salesforce, old SAP)

## Strategic Principles
- RTL-first: logical CSS only (ms-/me-/ps-/pe-/text-start/text-end)
- Dark-first: all palette decisions start in dark mode, check in light
- Mobile-first: storefront builds from 320px; admin from 768px
- HeroUI v3 only: no raw HTML form controls
- Emerald accent: one hue — no second accent anywhere
- Zero arbitrary Tailwind values without justification comment
