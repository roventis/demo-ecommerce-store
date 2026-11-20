# DEMO — Flagship E-Commerce Platform for India
**The Curated Destination for All Things Quality**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/roventis/demo-ecommerce-store)

DEMO is a complete, production-grade, full-stack B2C e-commerce platform engineered specifically for the Indian market. Built with an editorial luxury aesthetic, high-velocity Node 24 native SQLite WAL backend, and a modern React 19 / Tailwind CSS v4 responsive storefront.

---

## 1. Quick Start

### 1-Click Cloud Deployment (Render)
Deploy directly using the [Render Blueprint](https://render.com/deploy?repo=https://github.com/roventis/demo-ecommerce-store):
1. Click the **Deploy to Render** button above or open: [https://render.com/deploy?repo=https://github.com/roventis/demo-ecommerce-store](https://render.com/deploy?repo=https://github.com/roventis/demo-ecommerce-store)
2. Log into Render and click **Apply**
3. Your live store with SSL will be provisioned automatically!

---

### Local Quick Start
- Prerequisites: Node.js 22+ (tested on Node.js v24.21.0)
- Double-click `start.bat` or run:
```bash
cd demo
npm start
```
The server will start on **`http://localhost:3000`** and serve both the API endpoints and the pre-built, production-optimized React storefront.

---

## 2. Key Architecture & Features

- **Monolith Deployment:** Express 5 handles both secure REST APIs and static serving of compiled React 19 SPA with client-side routing fallback.
- **Node 22+ Native SQLite (`node:sqlite`):** 24 normalized tables running WAL mode with zero external native compilation dependencies.
- **Indian Market Localization:** INR (₹), 18% GST calculation, 6-digit Indian PIN delivery validation (e.g. `560038`, `110001`, `400001`).
- **Payment Gateway:** Razorpay simulation + Cash on Delivery (COD) with idempotent order creation.
- **Operations Console:** Complete Admin dashboard with live GMV metrics, order pipeline transitions, catalog management, and stock adjustments.

---

## 3. Credentials & Logins

- **Super Admin:** `admin@demo.com` / `Admin@123456`
- **Customer Account:** `priya@example.com` / `Customer@123`
