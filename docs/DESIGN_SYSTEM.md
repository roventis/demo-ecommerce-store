# DEMO — Design System & Visual Identity
**Brand Identity & UI Specification for DEMO E-Commerce**

---

## 1. Brand Philosophy & Aesthetic Direction
DEMO embodies an editorial, high-end retail experience tailored for the discerning Indian consumer. The design balances timeless minimalist luxury with clear commercial conversion cues: ample whitespace, crisp typography, subtle micro-interactions, high-contrast typography, and purposeful green accent badges for savings.

---

## 2. Color Palette & Tokens

### Primary & Brand Tones
- **Onyx Primary:** `#111827` (`stone-900`) — Primary headings, high-priority action buttons, and header bars.
- **Deep Obsidian Surface:** `#0C0A09` (`stone-950`) — Executive Admin Portal background and footer contrast.
- **Warm Editorial Canvas:** `#FAFAF9` (`stone-50`) / `#FFFFFF` — Primary storefront surface background.

### Brand Accents
- **Deep Teal Accent:** `#0F766E` (`teal-700`) — Category tags, highlights, and primary interactive links.
- **Teal Hover:** `#115E59` (`teal-800`) — Interactive button hover state.
- **Soft Teal Glow:** `#F0FDFA` (`teal-50`) — Category chips and information banners.
- **Savings Emerald:** `#059669` (`emerald-600`) — Discount percentage badges, in-stock indicators, and free delivery callouts.
- **Star Gold:** `#F59E0B` (`amber-500`) — Customer review stars and ratings.

### Neutral Grayscale
- **Text Heading:** `#1C1917` (`stone-900`) — Headings, product names, price tags.
- **Text Body:** `#44403C` (`stone-700`) — Body copy, product descriptions, policies.
- **Text Muted:** `#78716C` (`stone-500`) — Metadata, SKU tags, timestamps.
- **Border Subtle:** `#E7E5E4` (`stone-200`) — Card borders, dividers, form outlines.

---

## 3. Typography Hierarchy

| Role | Font Family | Size / Line Height | Tracking | Weight |
|---|---|---|---|---|
| **Display Hero** | Plus Jakarta Sans | 48px – 60px / 1.1 | -0.03em | 900 (Black) |
| **Section Headings (H2)**| Plus Jakarta Sans | 24px – 32px / 1.2 | -0.02em | 900 (Black) |
| **Product Titles (H3)** | Inter | 14px – 16px / 1.3 | -0.01em | 600 (Semi-bold) |
| **Body Prose** | Inter | 12px – 14px / 1.5 | normal | 400 (Regular) |
| **Pricing & Badges** | Plus Jakarta Sans | 16px – 24px / 1.0 | -0.02em | 800 (Bold) |
| **Monospace / SKU** | JetBrains Mono | 10px – 12px / 1.0 | +0.05em | 500 (Medium) |

---

## 4. Spacing, Radius & Shadows

- **Border Radius:**
  - Standard Cards: `rounded-2xl` (16px) for an organic, approachable feel.
  - Buttons & Inputs: `rounded-xl` (12px) for tactile button targets.
  - Badges & Pills: `rounded-full` (9999px).
- **Shadows:**
  - Rest State: `shadow-sm` (`0 1px 2px 0 rgb(0 0 0 / 0.05)`)
  - Hover State: `shadow-md` / `shadow-lg` (`0 10px 15px -3px rgb(0 0 0 / 0.1)`)
  - Drawers & Modals: `shadow-2xl` (`0 25px 50px -12px rgb(0 0 0 / 0.25)`)

---

## 5. Responsive Grid Breakpoints

```
Breakpoint    Width         Layout Behavior
-------------------------------------------------------------------------
Mobile S      360px - 390px 1-column product feed, full-width drawers
Mobile L      430px         1-column with enhanced padding
Tablet        768px         2-column catalog grid, compact filters
Laptop        1024px        3-column catalog grid, sticky sidebar
Desktop       1440px        4-column grid, max-w-7xl centered container
Widescreen    1920px        Balanced 4-column layout with 80px side margins
```
