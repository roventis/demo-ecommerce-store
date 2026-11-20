# DEMO — REST API Specification & Reference
**Base URL:** `http://localhost:3000/api`

---

## 1. System & Settings

### `GET /api/health`
Checks server and database availability.
- **Response:** `200 OK`
```json
{
  "status": "healthy",
  "platform": "DEMO Flagship E-Commerce Engine",
  "version": "1.0.0",
  "market": "India (INR)",
  "timestamp": "2026-11-20T20:43:54.649Z"
}
```

### `GET /api/settings`
Retrieves public store configuration.
- **Response:** `200 OK`
```json
{
  "store_name": "DEMO",
  "currency": "INR",
  "gst_rate_percent": "18",
  "free_shipping_threshold_paise": "99900"
}
```

---

## 2. Authentication & Profile

### `POST /api/auth/register`
Creates a new customer account.
- **Body:** `{ "name": "string", "email": "string", "password": "string", "phone": "string" }`
- **Response:** `201 Created` with JWT `token` and `user` object.

### `POST /api/auth/login`
Authenticates existing credentials.
- **Body:** `{ "email": "string", "password": "string" }`
- **Response:** `200 OK` with JWT `token` and `user` object.

### `GET /api/auth/me`
Retrieves current session user profile.
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK`

---

## 3. Product Catalog & Categories

### `GET /api/categories`
Lists all active categories with product counts.
- **Response:** `200 OK`

### `GET /api/products`
Queries products with multi-faceted filtering.
- **Query Params:**
  - `category` (string, e.g. `electronics`)
  - `brand` (string)
  - `min_price` (integer in rupees)
  - `max_price` (integer in rupees)
  - `rating` (float, e.g. `4.5`)
  - `in_stock` (`true` | `false`)
  - `search` (text search query)
  - `sort` (`featured` | `price_asc` | `price_desc` | `rating` | `discount` | `newest`)
  - `page` (default 1)
  - `limit` (default 20)
- **Response:** `200 OK` with `products` array and `pagination` metadata.

### `GET /api/products/:slug`
Fetches complete product specifications, image gallery, variants, and reviews.
- **Response:** `200 OK`

---

## 4. Shipping & Postal Code Checker

### `GET /api/shipping/check-pincode/:pincode`
Validates 6-digit Indian postal code delivery feasibility.
- **Response:** `200 OK`
```json
{
  "serviceable": true,
  "city": "Bengaluru",
  "state": "Karnataka",
  "estimated_days": 1,
  "cod_available": true,
  "shipping_charge_paise": 0,
  "message": "Delivery available in 1 business days to Bengaluru, Karnataka."
}
```

---

## 5. Shopping Bag & Checkout

### `GET /api/cart`
Fetches verified cart items, quantities, and server-calculated totals.
- **Headers:** `x-session-id: <session>` or `Authorization: Bearer <token>`
- **Response:** `200 OK`

### `POST /api/cart/add`
Adds an item to the shopping bag.
- **Body:** `{ "product_id": 1, "variant_id": 2, "quantity": 1 }`
- **Response:** `200 OK`

### `POST /api/checkout/quote`
Calculates true server-side order amounts, discounts, 18% GST, and shipping charges.
- **Body:** `{ "items": [...], "coupon_code": "DEMO10", "pincode": "560038", "payment_method": "UPI" }`
- **Response:** `200 OK`

### `POST /api/orders/create`
Idempotent atomic order placement. Decrements inventory atomically and generates order record.
- **Body:**
```json
{
  "customer": { "name": "Aarav Sharma", "email": "customer@demo.in", "phone": "+91 98111 22334" },
  "shipping_address": { "recipient_name": "Aarav Sharma", "street": "Indiranagar", "city": "Bengaluru", "state": "Karnataka", "pincode": "560038" },
  "items": [{ "product_id": 1, "quantity": 1 }],
  "coupon_code": "DEMO10",
  "payment_method": "UPI"
}
```
- **Response:** `201 Created`

---

## 6. Admin Management Endpoints (RBAC)
*Requires `Authorization: Bearer <admin_token>`*

- `GET /api/admin/metrics`: Gross GMV, order volume, low stock alerts, recent transactions.
- `GET /api/admin/products`: Full catalog with management metadata.
- `POST /api/admin/products`: Create a new product.
- `PUT /api/admin/products/:id`: Update product attributes.
- `PUT /api/admin/products/:id/stock`: Adjust stock count and record in inventory ledger.
- `GET /api/admin/orders`: Query orders with status filters and customer search.
- `PUT /api/admin/orders/:id/status`: Transition order status (`CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- `POST /api/admin/orders/:id/refund`: Execute refund workflow.
- `GET /api/admin/customers`: Query registered customer list with order counts.
- `GET /api/admin/coupons`: Query all active and past coupons.
- `POST /api/admin/coupons`: Create a new discount code.
- `GET /api/admin/audit-logs`: Review administrative action audit trail.
