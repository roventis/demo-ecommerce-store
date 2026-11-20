# DEMO — System Architecture Documentation
**Flagship Multi-Category Indian E-Commerce Engine**

---

## 1. System Topology Overview

```
+-------------------------------------------------------------------------------+
|                             CLIENT APPLICATION                                |
|   React 19 SPA + Vite + Tailwind CSS v4 + Lucide Icons (Desktop & Mobile)    |
|   - Storefront & Catalog Filter Engine       - Slide-over Cart Drawer         |
|   - Product Detail Page & PIN Validator      - 4-Step Express Checkout        |
|   - Customer Account & Order History         - RBAC Operations Admin Hub      |
+---------------------------------------+---------------------------------------+
                                        |  RESTful JSON API over HTTPS
                                        v
+-------------------------------------------------------------------------------+
|                            NODE.JS EXPRESS 5 BACKEND                          |
|   - HTTP Security Headers (X-Frame-Options, CSP, nosniff)                     |
|   - In-Memory Rate Limiting (Sensitive Auth & Order Endpoints)                |
|   - JWT Token Authentication & Role-Based Access Control Middleware           |
|   - Server-Side Pricing, Discount Quoting & 18% GST Engine                    |
|   - Atomic Order Transactions & Inventory Decrement Ledger                    |
|   - Audit Logging on Critical Administrative Actions                          |
+---------------------------------------+---------------------------------------+
                                        |  Native In-Process Binding
                                        v
+-------------------------------------------------------------------------------+
|                       DATABASE LAYER (Node 24 SQLite Sync)                    |
|   - Write-Ahead Logging (WAL) Mode for High Concurrency Read/Write Isolation  |
|   - Strict Foreign Key Referential Integrity (PRAGMA foreign_keys = ON)       |
|   - 24 Normalized Tables with B-Tree Indexes on Categories, Slugs, & Pincodes |
|   - Monetary Precision in Integer Paise (No Float Drift)                      |
+-------------------------------------------------------------------------------+
```

---

## 2. Component Design & Modularity

### A. Backend Layer (`demo/server/`)
1. **Security & Middleware**:
   - `authenticateToken`: Validates cryptographically signed JWTs from `Authorization: Bearer <token>`.
   - `optionalToken`: Attaches user context if present, without rejecting guest sessions.
   - `requireRole(...roles)`: Verifies role membership before routing to admin actions.
   - `rateLimiter(maxRequests, windowMs)`: Token-bucket in-memory rate limiter preventing brute-force login and checkout denial-of-service.
   - `logAudit(...)`: Appends user, action, entity, details, and IP address to `audit_logs`.
2. **Business Engines**:
   - **Order Engine (`/api/orders/create`)**: Operates inside an explicit SQLite `BEGIN TRANSACTION; ... COMMIT;`. Validates real-time inventory for each item, recalculates subtotal and taxes on server, applies coupon discounts, decrements stock atomically, logs inventory movements, and generates verified order records.
   - **Pricing Engine (`/api/checkout/quote`)**: Never trusts client-submitted prices or totals. Calculates taxes (18% embedded GST for MRP transparency), shipping charges (Free above ₹999, ₹99 standard, +₹49 COD fee), and discounts against database rules.
   - **Pincode Engine (`/api/shipping/check-pincode/:pincode`)**: Checks destination PIN codes against localized delivery rules to return estimated transit business days and COD availability.

### B. Frontend Layer (`demo/client/src/`)
1. **Responsive Storefront (`App.jsx`)**:
   - Built with single-bundle React 19 architecture to eliminate routing flicker and provide desktop/mobile transitions.
   - Live state syncs guest cart across tabs using `x-session-id` and merges with customer account on sign-in.
   - Clean UI design system with Tailwind CSS v4 CSS-first `@theme` configuration.
2. **Slide-Over Cart & Express Checkout**:
   - Immediate drawer opening upon adding an item.
   - Stepper checkout validating Indian mobile numbers (+91) and 6-digit postal PIN codes.
   - Simulates instant Razorpay server-side signature verification for test orders.

---

## 3. Technology Rationale

| Layer | Choice | Rationale |
|---|---|---|
| **Runtime** | Node.js 24 | Long-Term Support with native SQLite support (`node:sqlite`), built-in web standards (`fetch`), and high V8 throughput. |
| **Database** | Native SQLite Sync with WAL | Zero external C++ native build tool dependencies (node-gyp free). Blistering read performance (>50,000 queries/sec), file-level portability, atomic ACID transactions, and zero database server management overhead. |
| **API Framework** | Express 5 | Production battle-tested, robust middleware ecosystem, native Promise resolution in route handlers. |
| **UI Framework** | React 19 | Declarative component model, ultra-fast virtual DOM reconciliation, rich ecosystem. |
| **Styling** | Tailwind CSS v4 | CSS-first configuration, zero JavaScript build footprint, utility-first consistency, built-in responsive breakpoints. |
