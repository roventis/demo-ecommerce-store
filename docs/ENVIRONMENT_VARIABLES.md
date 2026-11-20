# DEMO — Environment Variables Configuration

Copy `.env.example` to `.env` in the root of the `demo/` project directory. Never commit real production secrets into version control.

---

## Environment Variables Template

```ini
# ==============================================================================
# SERVER CONFIGURATION
# ==============================================================================
PORT=3000
NODE_ENV=production

# Cryptographic secret for signing and verifying JWT tokens (min 32 characters)
JWT_SECRET=demo_ecom_flagship_super_secret_jwt_2026_india

# ==============================================================================
# DATABASE CONFIGURATION
# ==============================================================================
# Path to SQLite database file (defaults to demo/database/demo.db)
DATABASE_PATH=./database/demo.db

# ==============================================================================
# PAYMENT GATEWAY (RAZORPAY INDIA)
# ==============================================================================
# Obtain from Razorpay Dashboard (https://dashboard.razorpay.com/)
RAZORPAY_KEY_ID=rzp_test_YourTestKeyIdHere
RAZORPAY_KEY_SECRET=YourTestKeySecretHere
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecretHere

# ==============================================================================
# LOGISTICS & SHIPPING INTEGRATION
# ==============================================================================
# Delhivery Express B2C API credentials
DELHIVERY_API_KEY=your_delhivery_production_token
DELHIVERY_CLIENT_ID=DEMO_RETAIL

# Shiprocket alternative shipping credentials
SHIPROCKET_EMAIL=shipping@demo.in
SHIPROCKET_PASSWORD=your_secure_password

# ==============================================================================
# STORE & GST SETTINGS
# ==============================================================================
STORE_NAME="DEMO"
STORE_LEGAL_NAME="DEMO Technologies Pvt Ltd"
STORE_GSTIN="29AABCU9603R1ZM"
STORE_STATE="Karnataka"
STORE_TIMEZONE="Asia/Kolkata"
STORE_CURRENCY="INR"
```
