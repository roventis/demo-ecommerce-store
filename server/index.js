import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'demo_ecom_flagship_super_secret_jwt_2026_india';

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors());
app.use(express.json());

// In-memory basic rate limiter for auth & checkout
const rateLimits = new Map();
function rateLimiter(maxRequests = 50, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const entry = rateLimits.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + windowMs;
    } else {
      entry.count++;
    }

    rateLimits.set(key, entry);

    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    next();
  };
}

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[DEMO API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Audit logger helper
function logAudit(userId, action, entityType, entityId, details, req) {
  try {
    const ip = req ? (req.ip || req.socket.remoteAddress) : 'system';
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId || null, action, entityType, String(entityId || ''), JSON.stringify(details || {}), ip);
  } catch (err) {
    console.error('[Audit Log Error]', err.message);
  }
}

// Auth Middlewares
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session' });
    req.user = user;
    next();
  });
}

function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires role in [${roles.join(', ')}]` });
    }
    next();
  };
}

// -----------------------------------------------------------------------------
// Health Check & System Settings
// -----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'DEMO Flagship E-Commerce Engine',
    version: '1.0.0',
    market: 'India (INR)',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM store_settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

// -----------------------------------------------------------------------------
// Authentication Endpoints
// -----------------------------------------------------------------------------
app.post('/api/auth/register', rateLimiter(10, 60000), (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Email is already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone)
    VALUES (?, ?, ?, 'CUSTOMER', ?)
  `).run(name.trim(), email.toLowerCase().trim(), hash, phone ? phone.trim() : null);

  const userId = Number(info.lastInsertRowid);
  const token = jwt.sign(
    { id: userId, email: email.toLowerCase().trim(), role: 'CUSTOMER', name: name.trim() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logAudit(userId, 'REGISTER', 'USER', userId, { email }, req);

  res.status(201).json({
    message: 'Registration successful',
    token,
    user: { id: userId, name: name.trim(), email: email.toLowerCase().trim(), role: 'CUSTOMER', phone: phone || null }
  });
});

app.post('/api/auth/login', rateLimiter(15, 60000), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password credentials' });
  }

  if (user.is_active === 0) {
    return res.status(403).json({ error: 'Account has been restricted. Please contact support.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logAudit(user.id, 'LOGIN', 'USER', user.id, { role: user.role }, req);

  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.prepare(`
    UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(name.trim(), phone ? phone.trim() : null, req.user.id);

  const updated = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(req.user.id);
  res.json({ message: 'Profile updated successfully', user: updated });
});

// -----------------------------------------------------------------------------
// Address Book Endpoints
// -----------------------------------------------------------------------------
app.get('/api/addresses', authenticateToken, (req, res) => {
  const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user.id);
  res.json({ addresses });
});

app.post('/api/addresses', authenticateToken, (req, res) => {
  const { label, recipient_name, street, city, state, pincode, phone, is_default } = req.body;
  if (!recipient_name || !street || !city || !state || !pincode || !phone) {
    return res.status(400).json({ error: 'All address fields are required' });
  }

  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }

  const info = db.prepare(`
    INSERT INTO addresses (user_id, label, recipient_name, street, city, state, pincode, phone, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    label || 'Home',
    recipient_name.trim(),
    street.trim(),
    city.trim(),
    state.trim(),
    pincode.trim(),
    phone.trim(),
    is_default ? 1 : 0
  );

  res.status(201).json({ message: 'Address created', id: Number(info.lastInsertRowid) });
});

app.delete('/api/addresses/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Address removed' });
});

app.put('/api/addresses/:id/default', authenticateToken, (req, res) => {
  db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Default address updated' });
});

// -----------------------------------------------------------------------------
// Categories & Banners
// -----------------------------------------------------------------------------
app.get('/api/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
    WHERE c.is_active = 1
    GROUP BY c.id
    ORDER BY c.display_order ASC
  `).all();
  res.json({ categories });
});

app.get('/api/banners', (req, res) => {
  const banners = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY display_order ASC').all();
  res.json({ banners });
});

// -----------------------------------------------------------------------------
// Product Catalog & Search
// -----------------------------------------------------------------------------
app.get('/api/products', (req, res) => {
  const { category, brand, min_price, max_price, rating, in_stock, search, sort, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT p.*, c.name as category_name, c.slug as category_slug,
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY display_order ASC LIMIT 1) as primary_image
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (category) {
    query += ` AND c.slug = ?`;
    params.push(category);
  }

  if (brand) {
    query += ` AND p.brand = ?`;
    params.push(brand);
  }

  if (min_price) {
    query += ` AND p.price_paise >= ?`;
    params.push(Number(min_price) * 100);
  }

  if (max_price) {
    query += ` AND p.price_paise <= ?`;
    params.push(Number(max_price) * 100);
  }

  if (rating) {
    query += ` AND p.rating >= ?`;
    params.push(Number(rating));
  }

  if (in_stock === 'true') {
    query += ` AND p.stock > 0`;
  }

  if (search) {
    query += ` AND (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR p.highlights LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  // Sorting
  switch (sort) {
    case 'price_asc':
      query += ` ORDER BY p.price_paise ASC`;
      break;
    case 'price_desc':
      query += ` ORDER BY p.price_paise DESC`;
      break;
    case 'rating':
      query += ` ORDER BY p.rating DESC, p.review_count DESC`;
      break;
    case 'newest':
      query += ` ORDER BY p.created_at DESC`;
      break;
    case 'discount':
      query += ` ORDER BY p.discount_percent DESC`;
      break;
    default:
      query += ` ORDER BY p.is_featured DESC, p.is_trending DESC, p.id DESC`;
  }

  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (parsedPage - 1) * parsedLimit;

  // Total count
  const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
  const total = db.prepare(countQuery).get(...params).count;

  query += ` LIMIT ? OFFSET ?`;
  params.push(parsedLimit, offset);

  const products = db.prepare(query).all(...params);

  res.json({
    products,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit)
    }
  });
});

app.get('/api/products/:slug', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ? AND p.is_active = 1
  `).get(req.params.slug);

  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Load images
  const images = db.prepare('SELECT id, image_url, alt_text, display_order FROM product_images WHERE product_id = ? ORDER BY display_order ASC').all(product.id);

  // Load variants
  const variants = db.prepare('SELECT id, title, sku, price_paise, stock, attributes_json FROM product_variants WHERE product_id = ?').all(product.id);
  const parsedVariants = variants.map(v => ({
    ...v,
    attributes: v.attributes_json ? JSON.parse(v.attributes_json) : {}
  }));

  // Load reviews
  const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY id DESC').all(product.id);

  res.json({
    product: {
      ...product,
      specifications: product.specifications_json ? JSON.parse(product.specifications_json) : {},
      images,
      variants: parsedVariants,
      reviews
    }
  });
});

app.get('/api/products/:slug/related', (req, res) => {
  const current = db.prepare('SELECT id, category_id FROM products WHERE slug = ?').get(req.params.slug);
  if (!current) return res.status(404).json({ error: 'Product not found' });

  const related = db.prepare(`
    SELECT p.*, c.name as category_name,
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY display_order ASC LIMIT 1) as primary_image
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
    ORDER BY p.is_featured DESC
    LIMIT 4
  `).all(current.category_id, current.id);

  res.json({ products: related });
});

// -----------------------------------------------------------------------------
// Pincode Delivery Availability Checker
// -----------------------------------------------------------------------------
app.get('/api/shipping/check-pincode/:pincode', (req, res) => {
  const pincode = req.params.pincode.trim();
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ error: 'Invalid Indian PIN code. Must be 6 digits.' });
  }

  const rule = db.prepare('SELECT * FROM pincode_rules WHERE pincode = ?').get(pincode);

  if (rule) {
    res.json({
      serviceable: Boolean(rule.is_serviceable),
      city: rule.city,
      state: rule.state,
      estimated_days: rule.estimated_days,
      cod_available: Boolean(rule.cod_available),
      shipping_charge_paise: rule.shipping_charge_paise,
      message: `Delivery available in ${rule.estimated_days} business days to ${rule.city}, ${rule.state}.`
    });
  } else {
    // Standard nationwide tier
    res.json({
      serviceable: true,
      city: 'Nationwide Tier',
      state: 'India',
      estimated_days: 4,
      cod_available: true,
      shipping_charge_paise: 0,
      message: 'Standard delivery available in 4-5 business days across India via Delhivery Express.'
    });
  }
});

// -----------------------------------------------------------------------------
// Cart System (Authenticated & Guest)
// -----------------------------------------------------------------------------
function getOrCreateCart(userId, sessionId) {
  let cart;
  if (userId) {
    cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
    if (!cart) {
      const info = db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
      cart = { id: Number(info.lastInsertRowid), user_id: userId };
    }
  } else if (sessionId) {
    cart = db.prepare('SELECT * FROM carts WHERE session_id = ?').get(sessionId);
    if (!cart) {
      const info = db.prepare('INSERT INTO carts (session_id) VALUES (?)').run(sessionId);
      cart = { id: Number(info.lastInsertRowid), session_id: sessionId };
    }
  }
  return cart;
}

app.get('/api/cart', optionalToken, (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  const userId = req.user ? req.user.id : null;

  if (!userId && !sessionId) {
    return res.json({ items: [], subtotal_paise: 0, count: 0 });
  }

  const cart = getOrCreateCart(userId, sessionId);
  if (!cart) return res.json({ items: [], subtotal_paise: 0, count: 0 });

  const items = db.prepare(`
    SELECT ci.id as cart_item_id, ci.quantity,
           p.id as product_id, p.name, p.slug, p.brand, p.price_paise, p.original_price_paise, p.stock,
           pv.id as variant_id, pv.title as variant_title, pv.price_paise as variant_price_paise, pv.stock as variant_stock,
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY display_order ASC LIMIT 1) as primary_image
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE ci.cart_id = ?
    ORDER BY ci.id DESC
  `).all(cart.id);

  let subtotal = 0;
  let totalCount = 0;

  const enrichedItems = items.map(item => {
    const unitPrice = item.variant_price_paise || item.price_paise;
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    totalCount += item.quantity;
    return {
      ...item,
      unit_price_paise: unitPrice,
      total_price_paise: itemTotal
    };
  });

  res.json({
    cart_id: cart.id,
    items: enrichedItems,
    subtotal_paise: subtotal,
    count: totalCount
  });
});

app.post('/api/cart/add', optionalToken, (req, res) => {
  const { product_id, variant_id, quantity = 1 } = req.body;
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;
  const userId = req.user ? req.user.id : null;

  if (!product_id) return res.status(400).json({ error: 'product_id is required' });

  const product = db.prepare('SELECT id, stock FROM products WHERE id = ? AND is_active = 1').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not available' });

  if (product.stock < quantity) {
    return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
  }

  const cart = getOrCreateCart(userId, sessionId);

  // Check if item already exists in cart
  const existing = db.prepare(`
    SELECT id, quantity FROM cart_items
    WHERE cart_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
  `).get(cart.id, product_id, variant_id || null, variant_id || null);

  if (existing) {
    const newQty = existing.quantity + Number(quantity);
    if (newQty > product.stock) {
      return res.status(400).json({ error: `Cannot add more than ${product.stock} units` });
    }
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
  } else {
    db.prepare(`
      INSERT INTO cart_items (cart_id, product_id, variant_id, quantity)
      VALUES (?, ?, ?, ?)
    `).run(cart.id, product_id, variant_id || null, Number(quantity));
  }

  res.json({ message: 'Product added to cart successfully' });
});

app.put('/api/cart/item/:id', optionalToken, (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be greater than zero' });
  }

  const item = db.prepare('SELECT * FROM cart_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not in cart' });

  const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
  if (product && quantity > product.stock) {
    return res.status(400).json({ error: `Only ${product.stock} units in stock` });
  }

  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(Number(quantity), req.params.id);
  res.json({ message: 'Cart item updated' });
});

app.delete('/api/cart/item/:id', optionalToken, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Cart item removed' });
});

app.delete('/api/cart/clear', optionalToken, (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  const userId = req.user ? req.user.id : null;
  const cart = getOrCreateCart(userId, sessionId);
  if (cart) {
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
  }
  res.json({ message: 'Cart cleared' });
});

// -----------------------------------------------------------------------------
// Coupons & Server-Side Price Calculation
// -----------------------------------------------------------------------------
app.post('/api/coupons/apply', (req, res) => {
  const { code, subtotal_paise } = req.body;
  if (!code) return res.status(400).json({ error: 'Coupon code required' });

  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(code.toUpperCase().trim());
  if (!coupon) {
    return res.status(404).json({ error: 'Invalid or expired coupon code' });
  }

  if (subtotal_paise < coupon.min_order_paise) {
    const minRupees = Math.round(coupon.min_order_paise / 100);
    return res.status(400).json({ error: `Coupon requires minimum purchase of ₹${minRupees}` });
  }

  let discount = 0;
  if (coupon.discount_type === 'PERCENTAGE') {
    discount = Math.round((subtotal_paise * coupon.discount_value) / 100);
    if (coupon.max_discount_paise > 0 && discount > coupon.max_discount_paise) {
      discount = coupon.max_discount_paise;
    }
  } else {
    discount = Math.min(coupon.discount_value, subtotal_paise);
  }

  res.json({
    valid: true,
    code: coupon.code,
    description: coupon.description,
    discount_paise: discount
  });
});

// Quote checkout fees (taxes, shipping, discounts)
app.post('/api/checkout/quote', (req, res) => {
  const { items, coupon_code, pincode, payment_method } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: 'Cart items required for quote' });
  }

  // Calculate true server-side subtotal
  let subtotal = 0;
  for (const item of items) {
    const product = db.prepare('SELECT price_paise FROM products WHERE id = ?').get(item.product_id);
    if (product) {
      subtotal += product.price_paise * (item.quantity || 1);
    }
  }

  // Coupon discount
  let discount = 0;
  if (coupon_code) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(coupon_code.toUpperCase().trim());
    if (coupon && subtotal >= coupon.min_order_paise) {
      if (coupon.discount_type === 'PERCENTAGE') {
        discount = Math.round((subtotal * coupon.discount_value) / 100);
        if (coupon.max_discount_paise > 0 && discount > coupon.max_discount_paise) {
          discount = coupon.max_discount_paise;
        }
      } else {
        discount = Math.min(coupon.discount_value, subtotal);
      }
    }
  }

  // Shipping fees
  let shippingFee = 0;
  if (subtotal < 99900) { // Free shipping over ₹999
    shippingFee = 9900;   // ₹99 standard
  }

  // COD fee
  if (payment_method === 'COD') {
    shippingFee += 4900;  // ₹49 COD handling fee
  }

  // GST 18% included or added (in Indian retail, MRP is tax-inclusive; we break it down for GST invoice transparency)
  const taxableValue = subtotal - discount;
  const gstPaise = Math.round((taxableValue * 18) / 118); // Embedded 18% GST calculation
  const totalPaise = taxableValue + shippingFee;

  res.json({
    subtotal_paise: subtotal,
    discount_paise: discount,
    tax_paise: gstPaise,
    shipping_fee_paise: shippingFee,
    total_paise: totalPaise
  });
});

// -----------------------------------------------------------------------------
// Order Creation & Payment Processing
// -----------------------------------------------------------------------------
app.post('/api/orders/create', optionalToken, rateLimiter(10, 60000), (req, res) => {
  const { customer, shipping_address, items, coupon_code, payment_method } = req.body;

  if (!customer || !customer.email || !customer.name || !shipping_address || !items || !items.length) {
    return res.status(400).json({ error: 'Customer details, shipping address, and cart items are required' });
  }

  // Server-side inventory & price calculation
  let subtotal = 0;
  const verifiedOrderItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT id, name, sku, price_paise, stock FROM products WHERE id = ?').get(item.product_id);
    if (!product) {
      return res.status(400).json({ error: `Product ID ${item.product_id} is no longer available` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for "${product.name}". Only ${product.stock} available.` });
    }

    let unitPrice = product.price_paise;
    let variantTitle = null;

    if (item.variant_id) {
      const variant = db.prepare('SELECT title, price_paise, stock FROM product_variants WHERE id = ?').get(item.variant_id);
      if (variant) {
        unitPrice = variant.price_paise || unitPrice;
        variantTitle = variant.title;
      }
    }

    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    verifiedOrderItems.push({
      product_id: product.id,
      variant_id: item.variant_id || null,
      product_name: product.name,
      variant_title: variantTitle,
      sku: product.sku,
      unit_price_paise: unitPrice,
      quantity: item.quantity,
      total_price_paise: itemTotal
    });
  }

  // Coupon check
  let discount = 0;
  if (coupon_code) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(coupon_code.toUpperCase().trim());
    if (coupon && subtotal >= coupon.min_order_paise) {
      if (coupon.discount_type === 'PERCENTAGE') {
        discount = Math.round((subtotal * coupon.discount_value) / 100);
        if (coupon.max_discount_paise > 0 && discount > coupon.max_discount_paise) {
          discount = coupon.max_discount_paise;
        }
      } else {
        discount = Math.min(coupon.discount_value, subtotal);
      }
      // Increment coupon usage
      db.prepare('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?').run(coupon.id);
    }
  }

  // Shipping
  let shippingFee = subtotal >= 99900 ? 0 : 9900;
  if (payment_method === 'COD') shippingFee += 4900;

  const taxableValue = subtotal - discount;
  const taxPaise = Math.round((taxableValue * 18) / 118);
  const totalPaise = taxableValue + shippingFee;

  const orderNumber = `DEMO-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const userId = req.user ? req.user.id : null;
  const paymentStatus = payment_method === 'COD' ? 'PENDING' : 'PAID';

  // Transaction: decrement inventory, insert order, insert items
  db.exec('BEGIN TRANSACTION;');
  try {
    const orderInfo = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address_json, subtotal_paise, discount_paise, tax_paise, shipping_fee_paise,
        total_paise, coupon_code, payment_method, payment_status, order_status, courier_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'Delhivery Express')
    `).run(
      orderNumber,
      userId,
      customer.name.trim(),
      customer.email.toLowerCase().trim(),
      customer.phone ? customer.phone.trim() : '',
      JSON.stringify(shipping_address),
      subtotal,
      discount,
      taxPaise,
      shippingFee,
      totalPaise,
      coupon_code || null,
      payment_method || 'UPI',
      paymentStatus
    );

    const orderId = Number(orderInfo.lastInsertRowid);

    // Insert order items and decrement product inventory
    for (const oi of verifiedOrderItems) {
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_title, sku, unit_price_paise, quantity, total_price_paise)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(orderId, oi.product_id, oi.variant_id, oi.product_name, oi.variant_title, oi.sku, oi.unit_price_paise, oi.quantity, oi.total_price_paise);

      // Decrement stock
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(oi.quantity, oi.product_id);

      // Inventory log
      db.prepare(`
        INSERT INTO inventory_logs (product_id, variant_id, change_qty, reason, adjusted_by)
        VALUES (?, ?, ?, 'ORDER_PURCHASE', ?)
      `).run(oi.product_id, oi.variant_id, -oi.quantity, `ORDER_${orderNumber}`);
    }

    // Payment record
    const txnRef = `pay_demo_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    db.prepare(`
      INSERT INTO payments (order_id, transaction_ref, payment_gateway, amount_paise, status, gateway_signature)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(orderId, txnRef, 'RAZORPAY_TEST', totalPaise, paymentStatus === 'PAID' ? 'SUCCESS' : 'PENDING', `sig_${txnRef}`);

    db.exec('COMMIT;');

    logAudit(userId, 'CREATE_ORDER', 'ORDER', orderId, { order_number: orderNumber, total: totalPaise }, req);

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: orderId,
        order_number: orderNumber,
        total_paise: totalPaise,
        payment_status: paymentStatus,
        payment_method,
        transaction_ref: txnRef
      }
    });
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('[Order Creation Failed]', err);
    res.status(500).json({ error: 'Order could not be processed. Please try again.' });
  }
});

app.post('/api/payments/razorpay/verify', (req, res) => {
  const { order_number, razorpay_payment_id, razorpay_signature } = req.body;
  if (!order_number) return res.status(400).json({ error: 'order_number is required' });

  const order = db.prepare('SELECT id, payment_status FROM orders WHERE order_number = ?').get(order_number);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Update order to PAID
  db.prepare(`
    UPDATE orders SET payment_status = 'PAID', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(order.id);

  db.prepare(`
    UPDATE payments SET status = 'SUCCESS', gateway_signature = ? WHERE order_id = ?
  `).run(razorpay_signature || 'verified_test_sig', order.id);

  res.json({ message: 'Payment verified successfully', order_number, status: 'PAID' });
});

// -----------------------------------------------------------------------------
// Customer Order History & Tracking
// -----------------------------------------------------------------------------
app.get('/api/orders/my-orders', authenticateToken, (req, res) => {
  const orders = db.prepare(`
    SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC
  `).all(req.user.id);

  const enriched = orders.map(ord => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(ord.id);
    return {
      ...ord,
      shipping_address: JSON.parse(ord.shipping_address_json || '{}'),
      items
    };
  });

  res.json({ orders: enriched });
});

app.get('/api/orders/:order_number', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(req.params.order_number);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const payment = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(order.id);

  res.json({
    order: {
      ...order,
      shipping_address: JSON.parse(order.shipping_address_json || '{}'),
      items,
      payment
    }
  });
});

app.post('/api/orders/:order_number/cancel', authenticateToken, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ? AND user_id = ?').get(req.params.order_number, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });

  if (order.order_status === 'SHIPPED' || order.order_status === 'DELIVERED') {
    return res.status(400).json({ error: 'Cannot cancel an order that has already shipped' });
  }

  db.prepare(`UPDATE orders SET order_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(order.id);

  // Restore inventory
  const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(order.id);
  for (const it of items) {
    db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.quantity, it.product_id);
    db.prepare(`
      INSERT INTO inventory_logs (product_id, change_qty, reason, adjusted_by)
      VALUES (?, ?, 'ORDER_CANCELLED', ?)
    `).run(it.product_id, it.quantity, `CANCEL_${order.order_number}`);
  }

  res.json({ message: 'Order cancelled successfully' });
});

// -----------------------------------------------------------------------------
// Wishlist
// -----------------------------------------------------------------------------
app.get('/api/wishlist', authenticateToken, (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name,
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY display_order ASC LIMIT 1) as primary_image
    FROM wishlists w
    JOIN products p ON w.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    WHERE w.user_id = ?
    ORDER BY w.id DESC
  `).all(req.user.id);

  res.json({ wishlist: products });
});

app.post('/api/wishlist/toggle', authenticateToken, (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id required' });

  const existing = db.prepare('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
  if (existing) {
    db.prepare('DELETE FROM wishlists WHERE id = ?').run(existing.id);
    res.json({ action: 'removed', product_id });
  } else {
    db.prepare('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
    res.json({ action: 'added', product_id });
  }
});

// -----------------------------------------------------------------------------
// Customer Reviews
// -----------------------------------------------------------------------------
app.post('/api/reviews', optionalToken, (req, res) => {
  const { product_id, user_name, rating, title, comment } = req.body;
  if (!product_id || !rating || !comment || !user_name) {
    return res.status(400).json({ error: 'Product, name, rating (1-5), and review text are required' });
  }

  const userId = req.user ? req.user.id : null;
  db.prepare(`
    INSERT INTO reviews (product_id, user_id, user_name, rating, title, comment, is_verified_purchase, is_approved)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1)
  `).run(product_id, userId, user_name.trim(), Number(rating), title ? title.trim() : null, comment.trim());

  // Update product average rating & review count
  const stats = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ? AND is_approved = 1').get(product_id);
  if (stats) {
    db.prepare(`
      UPDATE products SET rating = ROUND(?, 1), review_count = ? WHERE id = ?
    `).run(stats.avg_rating || 5, stats.count, product_id);
  }

  res.status(201).json({ message: 'Review submitted successfully' });
});

// -----------------------------------------------------------------------------
// Support & Newsletter
// -----------------------------------------------------------------------------
app.post('/api/support/ticket', (req, res) => {
  const { name, email, subject, message, order_id } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Name, email, subject, and message are required' });
  }

  db.prepare(`
    INSERT INTO support_tickets (name, email, subject, message, order_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), email.toLowerCase().trim(), subject.trim(), message.trim(), order_id || null);

  res.status(201).json({ message: 'Support inquiry logged. Our team will respond within 4 business hours.' });
});

app.post('/api/newsletter/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  try {
    db.prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)').run(email.toLowerCase().trim());
    res.json({ message: 'Subscribed to DEMO Journal & Exclusive Drops' });
  } catch (err) {
    res.json({ message: 'Already subscribed' });
  }
});

// -----------------------------------------------------------------------------
// ADMIN MANAGEMENT CONSOLE (RBAC)
// -----------------------------------------------------------------------------
const ADMIN_ROLES = ['SUPER_ADMIN', 'STORE_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT'];

app.get('/api/admin/metrics', authenticateToken, requireRole(...ADMIN_ROLES), (req, res) => {
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(total_paise), 0) as rev FROM orders WHERE payment_status = 'PAID'`).get().rev;
  const totalOrders = db.prepare(`SELECT COUNT(*) as count FROM orders`).get().count;
  const totalCustomers = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'CUSTOMER'`).get().count;
  const totalProducts = db.prepare(`SELECT COUNT(*) as count FROM products WHERE is_active = 1`).get().count;
  const lowStockCount = db.prepare(`SELECT COUNT(*) as count FROM products WHERE stock <= 10 AND is_active = 1`).get().count;

  const ordersByStatus = db.prepare(`
    SELECT order_status, COUNT(*) as count FROM orders GROUP BY order_status
  `).all();

  const recentOrders = db.prepare(`
    SELECT id, order_number, customer_name, total_paise, payment_status, order_status, created_at
    FROM orders
    ORDER BY id DESC
    LIMIT 6
  `).all();

  const topProducts = db.prepare(`
    SELECT p.name, p.brand, p.price_paise, p.stock,
           COALESCE(SUM(oi.quantity), 0) as units_sold
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    GROUP BY p.id
    ORDER BY units_sold DESC
    LIMIT 5
  `).all();

  res.json({
    metrics: {
      total_revenue_paise: totalRevenue,
      total_orders: totalOrders,
      total_customers: totalCustomers,
      total_products: totalProducts,
      low_stock_products: lowStockCount,
      orders_by_status: ordersByStatus,
      recent_orders: recentOrders,
      top_products: topProducts
    }
  });
});

app.get('/api/admin/products', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN', 'PRODUCT_MANAGER'), (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name,
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY display_order ASC LIMIT 1) as primary_image
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY p.id DESC
  `).all();
  res.json({ products });
});

app.post('/api/admin/products', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN', 'PRODUCT_MANAGER'), (req, res) => {
  const { name, brand, category_id, description, highlights, price_rupees, original_price_rupees, sku, stock, is_featured, image_urls } = req.body;

  if (!name || !brand || !category_id || !price_rupees || !sku) {
    return res.status(400).json({ error: 'Name, brand, category, price, and SKU are required' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000);
  const pricePaise = Math.round(Number(price_rupees) * 100);
  const origPricePaise = Math.round(Number(original_price_rupees || price_rupees) * 100);
  const discount = origPricePaise > pricePaise ? Math.round(((origPricePaise - pricePaise) / origPricePaise) * 100) : 0;

  const info = db.prepare(`
    INSERT INTO products (name, slug, brand, category_id, description, highlights, price_paise, original_price_paise, discount_percent, sku, stock, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    slug,
    brand.trim(),
    category_id,
    description || name,
    highlights || '',
    pricePaise,
    origPricePaise,
    discount,
    sku.trim(),
    Number(stock || 0),
    is_featured ? 1 : 0
  );

  const prodId = Number(info.lastInsertRowid);

  if (image_urls && Array.isArray(image_urls)) {
    image_urls.forEach((url, idx) => {
      if (url) {
        db.prepare('INSERT INTO product_images (product_id, image_url, display_order) VALUES (?, ?, ?)').run(prodId, url.trim(), idx);
      }
    });
  }

  logAudit(req.user.id, 'CREATE_PRODUCT', 'PRODUCT', prodId, { name, sku }, req);

  res.status(201).json({ message: 'Product created successfully', id: prodId, slug });
});

app.put('/api/admin/products/:id', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN', 'PRODUCT_MANAGER'), (req, res) => {
  const { name, brand, category_id, description, highlights, price_rupees, original_price_rupees, stock, is_featured, is_active } = req.body;

  const pricePaise = Math.round(Number(price_rupees) * 100);
  const origPricePaise = Math.round(Number(original_price_rupees || price_rupees) * 100);
  const discount = origPricePaise > pricePaise ? Math.round(((origPricePaise - pricePaise) / origPricePaise) * 100) : 0;

  db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name),
      brand = COALESCE(?, brand),
      category_id = COALESCE(?, category_id),
      description = COALESCE(?, description),
      highlights = COALESCE(?, highlights),
      price_paise = COALESCE(?, price_paise),
      original_price_paise = COALESCE(?, original_price_paise),
      discount_percent = ?,
      stock = COALESCE(?, stock),
      is_featured = COALESCE(?, is_featured),
      is_active = COALESCE(?, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    brand ? brand.trim() : null,
    category_id || null,
    description || null,
    highlights || null,
    pricePaise || null,
    origPricePaise || null,
    discount,
    stock !== undefined ? Number(stock) : null,
    is_featured !== undefined ? (is_featured ? 1 : 0) : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    req.params.id
  );

  logAudit(req.user.id, 'UPDATE_PRODUCT', 'PRODUCT', req.params.id, { name, stock }, req);

  res.json({ message: 'Product updated successfully' });
});

app.put('/api/admin/products/:id/stock', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN', 'PRODUCT_MANAGER'), (req, res) => {
  const { stock, reason } = req.body;
  if (stock === undefined) return res.status(400).json({ error: 'stock is required' });

  const current = db.prepare('SELECT stock FROM products WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Product not found' });

  const diff = Number(stock) - current.stock;
  db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(Number(stock), req.params.id);

  db.prepare(`
    INSERT INTO inventory_logs (product_id, change_qty, reason, adjusted_by)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, diff, reason || 'MANUAL_OVERRIDE', req.user.email);

  res.json({ message: 'Inventory updated' });
});

app.get('/api/admin/orders', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT'), (req, res) => {
  const { status, search } = req.query;
  let q = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status && status !== 'ALL') {
    q += ' AND order_status = ?';
    params.push(status);
  }

  if (search) {
    q += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  q += ' ORDER BY id DESC LIMIT 100';
  const orders = db.prepare(q).all(...params);

  const enriched = orders.map(ord => ({
    ...ord,
    shipping_address: JSON.parse(ord.shipping_address_json || '{}'),
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(ord.id)
  }));

  res.json({ orders: enriched });
});

app.put('/api/admin/orders/:id/status', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN', 'ORDER_MANAGER'), (req, res) => {
  const { order_status, tracking_number, courier_name } = req.body;
  if (!order_status) return res.status(400).json({ error: 'order_status required' });

  db.prepare(`
    UPDATE orders SET
      order_status = ?,
      tracking_number = COALESCE(?, tracking_number),
      courier_name = COALESCE(?, courier_name),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(order_status, tracking_number || null, courier_name || null, req.params.id);

  logAudit(req.user.id, 'UPDATE_ORDER_STATUS', 'ORDER', req.params.id, { order_status, tracking_number }, req);

  res.json({ message: `Order status transitioned to ${order_status}` });
});

app.post('/api/admin/orders/:id/refund', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN'), (req, res) => {
  const { amount_rupees, reason } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const refundPaise = amount_rupees ? Math.round(Number(amount_rupees) * 100) : order.total_paise;

  db.prepare(`
    INSERT INTO refunds (order_id, amount_paise, reason, status, processed_by)
    VALUES (?, ?, ?, 'PROCESSED', ?)
  `).run(order.id, refundPaise, reason || 'CUSTOMER_REQUEST', req.user.email);

  db.prepare(`
    UPDATE orders SET payment_status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(order.id);

  logAudit(req.user.id, 'PROCESS_REFUND', 'ORDER', order.id, { amount_paise: refundPaise, reason }, req);

  res.json({ message: `Refund of ₹${refundPaise / 100} processed successfully` });
});

app.get('/api/admin/customers', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN', 'CUSTOMER_SUPPORT'), (req, res) => {
  const customers = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
           COUNT(o.id) as order_count,
           COALESCE(SUM(o.total_paise), 0) as total_spent_paise
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id AND o.payment_status = 'PAID'
    WHERE u.role = 'CUSTOMER'
    GROUP BY u.id
    ORDER BY u.id DESC
  `).all();
  res.json({ customers });
});

app.put('/api/admin/customers/:id/status', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN'), (req, res) => {
  const { is_active } = req.body;
  db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(is_active ? 1 : 0, req.params.id);
  res.json({ message: 'Customer account status updated' });
});

app.get('/api/admin/coupons', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN', 'PRODUCT_MANAGER'), (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
  res.json({ coupons });
});

app.post('/api/admin/coupons', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN'), (req, res) => {
  const { code, description, discount_type, discount_value, min_order_rupees, max_discount_rupees, expiry_date, usage_limit } = req.body;
  if (!code || !description || !discount_type || !discount_value) {
    return res.status(400).json({ error: 'Code, description, type, and discount value are required' });
  }

  const val = discount_type === 'FLAT' ? Math.round(Number(discount_value) * 100) : Number(discount_value);
  const minO = min_order_rupees ? Math.round(Number(min_order_rupees) * 100) : 0;
  const maxD = max_discount_rupees ? Math.round(Number(max_discount_rupees) * 100) : 0;

  db.prepare(`
    INSERT INTO coupons (code, description, discount_type, discount_value, min_order_paise, max_discount_paise, expiry_date, usage_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code.toUpperCase().trim(), description.trim(), discount_type, val, minO, maxD, expiry_date || null, usage_limit || 1000);

  res.status(201).json({ message: 'Coupon created successfully' });
});

app.delete('/api/admin/coupons/:id', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN'), (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ message: 'Coupon deleted' });
});

app.get('/api/admin/audit-logs', authenticateToken, requireRole('SUPER_ADMIN'), (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all();
  res.json({ logs });
});

app.get('/api/admin/inventory-logs', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN', 'PRODUCT_MANAGER'), (req, res) => {
  const logs = db.prepare(`
    SELECT il.*, p.name as product_name, p.sku
    FROM inventory_logs il
    JOIN products p ON il.product_id = p.id
    ORDER BY il.id DESC
    LIMIT 100
  `).all();
  res.json({ logs });
});

app.put('/api/admin/settings', authenticateToken, requireRole('SUPER_ADMIN', 'STORE_ADMIN'), (req, res) => {
  const updates = req.body;
  for (const [key, val] of Object.entries(updates)) {
    db.prepare(`
      INSERT INTO store_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, String(val));
  }
  res.json({ message: 'Store settings saved successfully' });
});

// -----------------------------------------------------------------------------
// Client Static Serving & SPA Fallback
// -----------------------------------------------------------------------------
const distPath = fs.existsSync(path.join(__dirname, '../client/dist'))
  ? path.join(__dirname, '../client/dist')
  : path.join(__dirname, '../dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Exception]', err);
  res.status(500).json({ error: 'Internal server error occurred' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[DEMO Server] Running on http://localhost:${PORT}`);
});
