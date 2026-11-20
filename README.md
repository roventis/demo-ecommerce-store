# DEMO — Flagship E-Commerce Platform for India
**The Curated Destination for All Things Quality**

DEMO is a complete, production-grade, full-stack B2C e-commerce platform engineered specifically for the Indian market. Built with an editorial luxury aesthetic, high-velocity Node 24 native SQLite WAL backend, and a modern React 19 / Tailwind CSS v4 responsive storefront.

---

## 1. Quick Start

### Prerequisites
- Node.js 22+ (Tested on Node.js v24.21.0)
- npm or pnpm

### One-Click Launch (Windows)
Double-click `start_demo.bat` inside the `demo` directory, or run:
```bash
cd demo
npm run start
```
The server will start on **`http://localhost:3000`** and serve both the API endpoints and the pre-built, production-optimized React storefront.

### Development Mode
```bash
# Terminal 1: Backend Express Server (Port 3000)
cd demo
npm run server

# Terminal 2: Vite Hot-Reload Client (Port 5174)
cd demo
npm run client
```

### Running Automated Verification Suites
```bash
# Unit & Integration Tests (Vitest)
cd demo
npm test

# Full Playwright Browser Automation Suite (10 Viewport Flows + Screenshots)
node demo/tests/e2e_runner.js
```

---

## 2. Platform Credentials & Defaults

| Role | Email | Password | Access Capabilities |
|---|---|---|---|
| **Super Administrator** | `admin@demo.in` | `Admin@12345` | Complete platform management, metrics, catalog, orders, refunds, settings |
| **Store Admin** | `storeadmin@demo.in` | `Admin@12345` | Catalog curation, inventory alerts, order status transitions |
| **Product Manager** | `catalog@demo.in` | `Admin@12345` | Add/edit products, manage variants, adjust stock |
| **Order Operations** | `orders@demo.in` | `Admin@12345` | Fulfill orders, assign Delhivery tracking numbers |
| **Customer Support** | `support@demo.in` | `Admin@12345` | View customer orders, answer support inquiries |
| **Verified Customer** | `customer@demo.in` | `Customer@12345` | Saved addresses, order history, wishlist, express checkout |

### Active Promotional Coupons
- **`DEMO10`**: 10% discount on all items (min order ₹1,000, max discount ₹1,500)
- **`FIRST500`**: Flat ₹500 off on first purchase above ₹2,500
- **`FESTIVE20`**: Festive 20% savings up to ₹3,000

---

## 3. Architecture Highlights

- **Currency Precision:** All monetary amounts are stored as integer **paise** in the database (1 INR = 100 paise). Eliminates IEEE floating-point rounding errors in commercial transactions.
- **Database Engine:** Embedded high-concurrency Node 24 native `node:sqlite` (`DatabaseSync`) in Write-Ahead-Logging (`PRAGMA journal_mode = WAL`) with foreign key enforcement.
- **India Localization:**
  - Standard 18% Indian GST calculation and transparent itemized breakdown.
  - Indian 6-digit PIN code delivery validation with real-time transit days and COD eligibility.
  - Payment simulation for UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay/Visa/Mastercard Credit/Debit cards, Netbanking, and Cash on Delivery (+₹49 handling fee).
- **Responsive Viewports:** Built with mobile-first CSS supporting 360px, 390px, 768px tablet, 1024px laptop, and 1440px-1920px widescreen desktop resolutions.
