# DEMO — Application Security & Threat Model
**Engineering Controls & Defensive Architecture**

---

## 1. Security Architecture Summary
DEMO is engineered with defense-in-depth principles across transport, authentication, authorization, business logic, and persistent storage layers.

---

## 2. Threat Mitigation Matrix

| Vulnerability Threat | Mitigation in DEMO Platform | Verification Mechanism |
|---|---|---|
| **SQL Injection (SQLi)** | 100% of database interactions use parameterized prepared statements (`db.prepare('... WHERE col = ?').run(val)`). Zero dynamic string concatenation in SQL queries. | Automated Vitest test suite and static analysis. |
| **Authentication Bypass** | Cryptographic JWT signatures verified on every protected route. Passwords hashed using `bcryptjs` with salt rounds = 10. | `authenticateToken` middleware returns 401/403 on tampering. |
| **Broken Access Control (BOLA/BFLA)** | Server-side Role-Based Access Control (`requireRole`) checks the token's authenticated claim against permitted roles (`SUPER_ADMIN`, `STORE_ADMIN`, etc.). Interface hiding is never treated as security. | Verified by negative test scenarios. |
| **Price & Coupon Manipulation** | Client-submitted prices and totals are completely discarded. All subtotals, coupon limits, 18% GST, and shipping thresholds are recalculated on the server during checkout quote and order creation. | Server quotes tested against mock submissions. |
| **Inventory Race Conditions** | Orders run within explicit SQLite ACID transactions (`BEGIN TRANSACTION; ... COMMIT;`). Stock is checked and decremented atomically with `stock = MAX(0, stock - ?)`. Rollback occurs on insufficient inventory. | Transaction rollback test in Vitest. |
| **Cross-Site Scripting (XSS)** | React JSX automatically escapes dangerous text nodes. HTTP headers include `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`. | Browser execution tests. |
| **Brute-Force & Denial of Service** | In-memory IP rate limiter restricts login, registration, and order submission endpoints to 10-15 requests per minute per IP. | Rate limiter unit tests. |
| **Sensitive Data Exposure** | Password hashes are stripped before returning user objects. Database excludes plain credit card numbers (tokenized simulated gateway references only). | User profile API audit. |
| **Administrative Audit Trail** | Sensitive admin actions (product creation, stock changes, order status transitions, refunds) are logged to the `audit_logs` table with admin user ID, timestamp, entity ID, action, and client IP. | Audit log inspection. |
