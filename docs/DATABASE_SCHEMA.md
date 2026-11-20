# DEMO — Database Schema & Data Dictionary
**Persistent SQLite Architecture with Write-Ahead Logging (WAL)**

---

## 1. Architectural Philosophy
All monetary balances are stored as integer **paise** (`price_paise`, `total_paise`, `discount_paise`, `tax_paise`) where `100 paise = 1 INR (₹)`. This guarantees exact currency calculations without floating-point precision loss.

Foreign keys are strictly enforced on every connection via `PRAGMA foreign_keys = ON;`, ensuring referential integrity across users, categories, products, variants, orders, and payments.

---

## 2. Entity-Relationship Overview

```
 [categories] 1 --------< N [products] 1 --------< N [product_images]
                              |       1 --------< N [product_variants]
                              |       1 --------< N [reviews]
                              |       1 --------< N [inventory_logs]
                              v
   [users] 1 ---+----< N [orders] 1 ---+----< N [order_items]
                |                      +----< 1 [payments]
                |                      +----< N [refunds]
                +----< N [addresses]
                +----< N [wishlists]
                +----< 1 [carts] 1 --------< N [cart_items]
```

---

## 3. Data Dictionary (Key Tables)

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user identifier |
| `name` | TEXT | NOT NULL | Customer or staff full name |
| `email` | TEXT | UNIQUE NOT NULL | Normalized lowercase email |
| `password_hash` | TEXT | NOT NULL | Bcrypt salted hash (cost factor 10) |
| `role` | TEXT | NOT NULL CHECK IN (...) | `CUSTOMER`, `SUPER_ADMIN`, `STORE_ADMIN`, `PRODUCT_MANAGER`, `ORDER_MANAGER`, `CUSTOMER_SUPPORT` |
| `phone` | TEXT | NULLABLE | 10-digit Indian mobile number |
| `is_active` | INTEGER | DEFAULT 1 | 1 for active, 0 for blocked account |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

### `products`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique product ID |
| `name` | TEXT | NOT NULL | Product title |
| `slug` | TEXT | UNIQUE NOT NULL | SEO-friendly URL slug |
| `brand` | TEXT | NOT NULL | Brand or atelier name |
| `category_id` | INTEGER | NOT NULL REFERENCES categories(id) | Associated category |
| `description` | TEXT | NOT NULL | Comprehensive marketing description |
| `highlights` | TEXT | NULLABLE | Key bullet points |
| `specifications_json` | TEXT | NULLABLE | JSON key-value technical spec sheet |
| `price_paise` | INTEGER | NOT NULL | Selling price in paise |
| `original_price_paise` | INTEGER | NOT NULL | Strike-through MRP in paise |
| `discount_percent` | INTEGER | DEFAULT 0 | Computed discount percentage |
| `sku` | TEXT | UNIQUE NOT NULL | Unique Stock Keeping Unit |
| `rating` | REAL | DEFAULT 4.5 | Average star rating (1.0 - 5.0) |
| `review_count` | INTEGER | DEFAULT 0 | Count of approved reviews |
| `stock` | INTEGER | NOT NULL DEFAULT 0 | Units on hand |
| `is_featured` | INTEGER | DEFAULT 0 | Spotlight on homepage |
| `is_trending` | INTEGER | DEFAULT 0 | Flagged for trending section |
| `is_active` | INTEGER | DEFAULT 1 | Visible in storefront |

### `orders`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Order ID |
| `order_number` | TEXT | UNIQUE NOT NULL | Human-readable identifier (e.g. `DEMO-2026-88412`) |
| `user_id` | INTEGER | REFERENCES users(id) ON DELETE SET NULL | Associated customer (or NULL for guest) |
| `customer_name` | TEXT | NOT NULL | Buyer name |
| `customer_email` | TEXT | NOT NULL | Order notification email |
| `customer_phone` | TEXT | NOT NULL | Delivery SMS mobile contact |
| `shipping_address_json` | TEXT | NOT NULL | JSON snapshot of street, city, state, pincode |
| `subtotal_paise` | INTEGER | NOT NULL | Item subtotal |
| `discount_paise` | INTEGER | DEFAULT 0 | Applied promo savings |
| `tax_paise` | INTEGER | DEFAULT 0 | Embedded 18% GST calculation |
| `shipping_fee_paise` | INTEGER | DEFAULT 0 | Delivery fee (0 if subtotal >= ₹999) |
| `total_paise` | INTEGER | NOT NULL | Final charged amount |
| `coupon_code` | TEXT | NULLABLE | Applied coupon voucher |
| `payment_method` | TEXT | NOT NULL CHECK IN (...) | `RAZORPAY`, `UPI`, `CARD`, `NETBANKING`, `COD` |
| `payment_status` | TEXT | NOT NULL CHECK IN (...) | `PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| `order_status` | TEXT | NOT NULL CHECK IN (...) | `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED` |
| `tracking_number` | TEXT | NULLABLE | Courier tracking ID (e.g. `DEL-992384711`) |
| `courier_name` | TEXT | DEFAULT 'Delhivery Express' | Primary courier carrier |

---

## 4. Performance Indexes

```sql
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_trending ON products(is_trending);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_pincode_lookup ON pincode_rules(pincode);
```
