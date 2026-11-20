# DEMO — Master Architecture & Implementation Plan
**Platform:** DEMO — "ALL THINGS" Flagship Indian E-Commerce Engine
**Target Market:** India (INR ₹, GST, 6-digit Pincodes, UPI/Cards/Netbanking/COD)

## 1. Executive Architecture Summary
DEMO is a complete, production-grade, full-stack B2C e-commerce platform designed for multi-category retail in India. Built with clean separation of concerns, zero mock APIs, zero hardcoded catalogs, and resilient database-backed transactions.

### Core Stack
- **Database:** Node 24 Native `node:sqlite` (`DatabaseSync`) in Write-Ahead-Logging (WAL) mode with foreign keys enabled.
- **Backend API:** Node.js Express 5 with JWT authentication, role-based authorization (Super Admin, Store Admin, Product Manager, Order Manager, Customer Support), atomic order checkout, rate limiting, and audit logging.
- **Frontend Client:** React 19 SPA with Tailwind CSS v4, Lucide Icons, responsive layouts (Mobile 360px-430px, Tablet 768px, Desktop 1024px-1920px).
- **Payment & Checkout:** Idempotent checkout with server-side validation, Indian currency formatting (paise in DB, ₹ on UI), Razorpay payment verification simulation and COD flows with PIN code serviceability validation.
- **Admin Dashboard:** Deep management console for Products, Inventory, Orders, Shipments, Customer Support, Discount Coupons, Content Banners, and System Settings.

---

## 2. Team & Skill Activation Matrix
| Functional Role | Assigned Skill(s) | Architectural Focus |
|---|---|---|
| Lead Architect | `agency-software-architect`, `agency-agents-orchestrator` | Overall system design, component hierarchy, modular routes |
| Backend Architect | `agency-backend-architect`, `agency-database-optimizer` | Node.js Express API, atomic transactions, foreign keys, indexes |
| Payment Engineer | `agency-payments-billing-engineer` | Idempotent orders, server-side signature verification, failure handling |
| Security Engineer | `agency-security-architect` | Password hashing (bcrypt), JWT verification, input sanitization, RBAC |
| UI/UX & Design | `tailwind-design-system`, `web-design-guidelines`, `agency-ui-designer` | Tailwind v4 tokens, responsive layouts, accessible semantic markup |
| Test Automation | `agency-test-automation-engineer` | Unit tests, integration tests, E2E browser flows |
| SEO Specialist | `agency-seo-specialist` | JSON-LD schema, OpenGraph tags, sitemap, meta tags |

---

## 3. Phased Execution Roadmap
1. **Phase 1 — Workspace & Baseline Configuration:** Verify node modules, scripts, configs.
2. **Phase 2 — Database Schema & Data Seeding:**
   - Define normalized schema covering users, roles, addresses, categories, products, variants, images, inventory logs, carts, wishlists, orders, payments, coupons, reviews, support tickets, banners, settings, audit logs.
   - Comprehensive seed data across 6 diverse categories (Electronics, Apparel, Home & Living, Gourmet & Groceries, Beauty & Grooming, Sports & Fitness) with high-res royalty-free imagery and specifications.
3. **Phase 3 — Robust Backend API Engine:**
   - Auth endpoints (Register, Login, Profile, Addresses, Password Reset).
   - Product & Category endpoints (Search, Filter by price/brand/availability/color/size, Sorting, Pagination, Quick View).
   - Cart & Checkout endpoints (Server-side price calculations, Coupon engine, Tax/GST calculation, Address validation, Order persistence, Idempotent payment intent).
   - Customer account endpoints (Order history, Tracking, Returns, Wishlist management).
   - Admin management endpoints (Product CRUD, Inventory alerts & adjustments, Order status transitions, Refund processing, Analytics & KPIs).
4. **Phase 4 — Storefront Application:**
   - Header with Announcement bar, Category drawer, Search with live debounce, Cart drawer badge, Wishlist counter, User avatar.
   - Homepage: Hero with CTA, Category grid, Best Sellers, Trending, Brand story, Trust badges, Newsletter.
   - Product Catalog: Multi-filter sidebar (Price slider, in-stock, category, brand, rating), grid/list views, sort dropdown.
   - Product Details: Image gallery with thumbnail selection, variant picker, pincode delivery checker, spec sheet, reviews, add-to-cart, buy now.
   - Cart & Checkout: Multi-step checkout with address form, coupon code apply, payment selection (UPI / Card / Netbanking / COD), order confirmation receipt.
   - Account Hub: Profile, saved addresses, orders list with tracking timeline, return request modal.
   - Informational Pages: About, Contact, FAQs with accordion, Shipping policy, Returns/Refund policy, Terms, Privacy.
5. **Phase 5 — Complete Admin Dashboard:**
   - KPI metrics cards: Revenue, Orders, Average Order Value, Total Customers, Inventory alerts.
   - Products Manager: Add/Edit products, variant manager, stock updater, image links, toggle active/featured.
   - Orders Manager: Order status pipeline (Confirmed -> Processing -> Shipped -> Delivered / Cancelled), tracking assignment, refund processor, printable invoice view.
   - Inventory Manager: Low stock thresholds, stock ledger.
   - Coupons Manager: Create percentage or flat coupons with minimum spends.
   - Content & Store Settings: Banner headlines, maintenance toggle, GST rates.
6. **Phase 6 — Testing & Verification:**
   - Automated backend unit and integration test suite.
   - UI build and bundle verification.
   - E2E Playwright validation across viewport sizes.
7. **Phase 7 — Documentation & Delivery:**
   - Full suite of required markdown docs.
