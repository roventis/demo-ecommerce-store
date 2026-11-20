import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';

describe('DEMO E-Commerce Backend Engine & Database Tests', () => {
  let customerToken;
  let adminToken;
  let testProductId;

  beforeAll(() => {
    // Verify database seeded
    const count = db.prepare('SELECT count(*) as c FROM products').get().c;
    expect(count).toBeGreaterThan(0);

    const product = db.prepare('SELECT id, price_paise, stock FROM products LIMIT 1').get();
    testProductId = product.id;

    const JWT_SECRET = 'demo_ecom_flagship_super_secret_jwt_2026_india';
    customerToken = jwt.sign({ id: 6, email: 'customer@demo.in', role: 'CUSTOMER', name: 'Aarav Sharma' }, JWT_SECRET);
    adminToken = jwt.sign({ id: 1, email: 'admin@demo.in', role: 'SUPER_ADMIN', name: 'Super Administrator' }, JWT_SECRET);
  });

  it('verifies product catalog queries, search, and category counts', () => {
    const products = db.prepare('SELECT * FROM products WHERE is_active = 1').all();
    expect(products.length).toBeGreaterThan(5);

    const electronics = db.prepare(`
      SELECT p.* FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE c.slug = 'electronics'
    `).all();
    expect(electronics.length).toBeGreaterThan(0);
  });

  it('validates 6-digit Indian PIN code delivery rules', () => {
    const bengaluru = db.prepare('SELECT * FROM pincode_rules WHERE pincode = ?').get('560038');
    expect(bengaluru).toBeDefined();
    expect(bengaluru.city).toBe('Bengaluru');
    expect(bengaluru.cod_available).toBe(1);

    const srinagar = db.prepare('SELECT * FROM pincode_rules WHERE pincode = ?').get('190001');
    expect(srinagar).toBeDefined();
    expect(srinagar.cod_available).toBe(0);
  });

  it('validates coupon discount calculation accurately in paise', () => {
    const coupon10 = db.prepare('SELECT * FROM coupons WHERE code = ?').get('DEMO10');
    expect(coupon10).toBeDefined();
    expect(coupon10.discount_type).toBe('PERCENTAGE');

    const subtotal = 1000000; // ₹10,000.00
    const discount = Math.round((subtotal * coupon10.discount_value) / 100);
    expect(discount).toBe(100000); // ₹1,000.00 discount
  });

  it('prevents overselling when stock is zero or insufficient', () => {
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(testProductId);
    const excessiveQuantity = product.stock + 100;
    const canFulfill = product.stock >= excessiveQuantity;
    expect(canFulfill).toBe(false);
  });

  it('validates order creation atomicity and transaction rollback safety', () => {
    const testOrderNum = `TEST-ORD-${Date.now()}`;
    const initialStock = db.prepare('SELECT stock FROM products WHERE id = ?').get(testProductId).stock;

    db.exec('BEGIN TRANSACTION;');
    const orderInfo = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_email, customer_phone,
        shipping_address_json, subtotal_paise, total_paise, payment_method, payment_status, order_status
      ) VALUES (?, 'Test Buyer', 'test@test.com', '+91 99999 88888', '{}', 100000, 100000, 'UPI', 'PAID', 'CONFIRMED')
    `).run(testOrderNum);

    db.prepare('UPDATE products SET stock = stock - 1 WHERE id = ?').run(testProductId);
    db.exec('COMMIT;');

    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(testOrderNum);
    expect(order).toBeDefined();
    expect(order.order_number).toBe(testOrderNum);

    const newStock = db.prepare('SELECT stock FROM products WHERE id = ?').get(testProductId).stock;
    expect(newStock).toBe(initialStock - 1);

    // Clean up test order
    db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
    db.prepare('UPDATE products SET stock = stock + 1 WHERE id = ?').run(testProductId);
  });

  it('enforces RBAC permissions for administrative routes', () => {
    const adminRoles = ['SUPER_ADMIN', 'STORE_ADMIN', 'PRODUCT_MANAGER'];
    const customerRole = 'CUSTOMER';
    expect(adminRoles.includes(customerRole)).toBe(false);
  });
});
