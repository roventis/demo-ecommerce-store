# Render Deployment Guide — DEMO Flagship E-Commerce Platform

This guide outlines how to deploy the **DEMO** full-stack e-commerce platform to [Render](https://render.com) for production hosting with SSL, automated builds, and server-side operations.

---

## Architecture Summary for Render

- **Platform:** Single Web Service (Monolithic Node.js 22+ with Express 5 REST API + Compiled React 19 Frontend)
- **Node Engine:** Requires Node `>=22.5.0` (for built-in high-performance `node:sqlite` WAL engine)
- **Build Command:** `npm run render-build` (Runs `npm install --include=dev && npm run build`)
- **Start Command:** `npm start` (Runs `node server/index.js`)
- **Environment:** Managed Linux Container with automatic HTTPS/TLS certificate

---

## Option 1: Blueprint Deployment via `render.yaml` (Recommended)

The repository includes a ready-to-use [render.yaml](file:///c:/Users/PRAJU/Downloads/client%20website/demo/render.yaml) blueprint specification in the project root.

### Steps:
1. **Push your code to GitHub:**
   ```bash
   # From inside the demo folder:
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
   *(Or run `gh repo create demo-ecommerce --public --source=. --push` if using GitHub CLI)*

2. **Go to Render:**
   - Log in at [dashboard.render.com](https://dashboard.render.com/)
   - Click **New +** in the top navigation and select **Blueprint**
   - Connect your GitHub repository
   - Render will detect `render.yaml` and pre-configure:
     - **Service Type:** Web Service (`demo-ecommerce-platform`)
     - **Runtime:** Node
     - **Node Version:** `22.14.0`
     - **Build Command:** `npm run render-build`
     - **Start Command:** `npm start`
     - **Environment Variables:** Automatic `JWT_SECRET` generation, `NODE_ENV=production`, `GST_RATE=0.18`, currency `INR`, etc.

3. **Click "Apply":**
   Render builds your frontend bundle, verifies dependencies, seeds the database, and exposes your live URL (e.g. `https://demo-ecommerce-platform.onrender.com`).

---

## Option 2: Manual Web Service Setup

If you prefer configuring via the Render web UI:

1. **Create Web Service:**
   - On the Render dashboard, click **New +** -> **Web Service**
   - Connect your Git repository (or select public Git URL)

2. **Configure Service Settings:**
   | Field | Value |
   |---|---|
   | **Name** | `demo-ecommerce` |
   | **Region** | Singapore or Oregon (any preferred region) |
   | **Branch** | `main` |
   | **Root Directory** | *(leave blank if root of repo, or `demo` if deploying from parent)* |
   | **Runtime** | `Node` |
   | **Build Command** | `npm run render-build` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free or Starter |

3. **Add Environment Variables:**
   Under **Environment Variables**, add:
   - `NODE_VERSION` = `22.14.0` *(CRITICAL: Required for `node:sqlite` WAL support)*
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = *(Generate a 32+ character random secret string)*
   - `CURRENCY` = `INR`
   - `TIMEZONE` = `Asia/Kolkata`
   - `GST_RATE` = `0.18`
   - `RAZORPAY_KEY_ID` = `rzp_test_DEMO_STORE_KEY_2026` *(or your live key)*
   - `RAZORPAY_KEY_SECRET` = `rzp_test_secret_DEMO_SEC_2026` *(or your live secret)*

4. **Deploy:**
   - Click **Create Web Service**.
   - Watch the deployment logs. Once the logs show `[DEMO Server] Running on http://localhost:...`, your site is live!

---

## Verifying Your Live Render Deployment

1. **Customer Storefront:** Visit `https://<your-service>.onrender.com/`
2. **Health Check:** `https://<your-service>.onrender.com/api/health`
3. **Products API:** `https://<your-service>.onrender.com/api/products`
4. **Operations Admin Console:** 
   - Login: `admin@demo.com`
   - Password: `Admin@123456`
