import bcrypt from 'bcryptjs';
import db from './db.js';

console.log('[DEMO Seed] Seeding production-ready demo database...');

// 1. Seed Store Settings
const settings = [
  ['store_name', 'DEMO'],
  ['store_tagline', 'The Curated Destination for All Things Quality'],
  ['contact_email', 'support@demo.in'],
  ['contact_phone', '+91 98765 43210'],
  ['currency', 'INR'],
  ['currency_symbol', '₹'],
  ['timezone', 'Asia/Kolkata'],
  ['gst_rate_percent', '18'],
  ['gst_number', '29AABCU9603R1ZM'],
  ['free_shipping_threshold_paise', '99900'], // Free shipping above ₹999
  ['standard_shipping_paise', '9900'],       // ₹99 standard shipping
  ['cod_fee_paise', '4900'],                 // ₹49 COD handling fee
  ['cod_enabled', 'true'],
  ['maintenance_mode', 'false'],
  ['return_window_days', '7'],
  ['support_hours', 'Mon - Sat, 9:00 AM - 8:00 PM IST']
];

for (const [key, value] of settings) {
  db.prepare(`
    INSERT INTO store_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, value);
}

// 2. Seed Users (Roles: SUPER_ADMIN, STORE_ADMIN, PRODUCT_MANAGER, ORDER_MANAGER, CUSTOMER_SUPPORT, CUSTOMER)
const adminHash = bcrypt.hashSync('Admin@12345', 10);
const userHash = bcrypt.hashSync('Customer@12345', 10);

const users = [
  ['Super Administrator', 'admin@demo.in', adminHash, 'SUPER_ADMIN', '+91 98765 00001'],
  ['Store Admin', 'storeadmin@demo.in', adminHash, 'STORE_ADMIN', '+91 98765 00002'],
  ['Product Catalog Lead', 'catalog@demo.in', adminHash, 'PRODUCT_MANAGER', '+91 98765 00003'],
  ['Order Operations Manager', 'orders@demo.in', adminHash, 'ORDER_MANAGER', '+91 98765 00004'],
  ['Customer Care Lead', 'support@demo.in', adminHash, 'CUSTOMER_SUPPORT', '+91 98765 00005'],
  ['Aarav Sharma', 'customer@demo.in', userHash, 'CUSTOMER', '+91 98111 22334'],
  ['Ananya Iyer', 'ananya.iyer@gmail.com', userHash, 'CUSTOMER', '+91 98222 33445'],
  ['Rohan Mehta', 'rohan.mehta@yahoo.in', userHash, 'CUSTOMER', '+91 98333 44556']
];

for (const [name, email, hash, role, phone] of users) {
  db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role
  `).run(name, email, hash, role, phone);
}

// 3. Seed Addresses for demo customer
const customerUser = db.prepare('SELECT id FROM users WHERE email = ?').get('customer@demo.in');
if (customerUser) {
  db.prepare(`DELETE FROM addresses WHERE user_id = ?`).run(customerUser.id);
  db.prepare(`
    INSERT INTO addresses (user_id, label, recipient_name, street, city, state, pincode, phone, is_default)
    VALUES 
      (?, 'Home', 'Aarav Sharma', 'Flat 402, Prestige Tower, Indiranagar 100ft Rd', 'Bengaluru', 'Karnataka', '560038', '+91 98111 22334', 1),
      (?, 'Office', 'Aarav Sharma', '6th Floor, Embassy Golf Links, Domlur', 'Bengaluru', 'Karnataka', '560071', '+91 98111 22334', 0)
  `).run(customerUser.id, customerUser.id);
}

// 4. Seed Categories
const categories = [
  ['Electronics & Tech', 'electronics', 'High-performance audio, premium computing, smart home accessories', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 1],
  ['Fashion & Apparel', 'apparel', 'Minimalist organic cotton essentials, bespoke tailoring, timeless silhouettes', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80', 2],
  ['Home & Living', 'home-living', 'Artisan ceramic tableware, ergonomic desks, sculptural ambient illumination', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80', 3],
  ['Gourmet & Wellness', 'gourmet', 'Single-estate artisanal coffees, cold-pressed cold brews, organic botanicals', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80', 4],
  ['Personal Care', 'beauty-grooming', 'Clean dermatological formulations, botanical serums, natural grooming', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80', 5],
  ['Sports & Movement', 'fitness', 'Precision aerospace fitness gear, carbon recovery tools, performance wear', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80', 6]
];

for (const [name, slug, desc, img, order] of categories) {
  db.prepare(`
    INSERT INTO categories (name, slug, description, image_url, display_order)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, image_url = excluded.image_url
  `).run(name, slug, desc, img, order);
}

// 5. Seed Products & Variants & Images
const categoryMap = {};
db.prepare('SELECT id, slug FROM categories').all().forEach(c => { categoryMap[c.slug] = c.id; });

const products = [
  {
    name: 'Aura Studio Wireless Noise-Cancelling Headphones',
    slug: 'aura-studio-wireless-headphones',
    brand: 'Aura Acoustics',
    category: 'electronics',
    description: 'Masterfully engineered 45mm beryllium drivers deliver reference-grade acoustic immersion. Custom adaptive ANC filters 98% of ambient noise while preserving spatial stage depth. 40-hour battery life with USB-C hyper-charge.',
    highlights: 'Active Noise Cancellation; 45mm Beryllium Acoustic Chamber; 40-Hour Playback; Ultra-Soft Vegan Leather Memory Foam',
    specs: JSON.stringify({ "Bluetooth": "5.3 with LDAC & aptX HD", "Battery": "850mAh (40h playback)", "Weight": "248g", "Warranty": "2 Years International" }),
    price: 1899900, // ₹18,999.00
    origPrice: 2499900,
    discount: 24,
    sku: 'AUR-NC-01',
    rating: 4.9,
    reviews: 142,
    stock: 45,
    featured: 1,
    trending: 1,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1000&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1000&q=80'
    ],
    variants: [
      { title: 'Matte Onyx Black', sku: 'AUR-NC-01-BLK', price: 1899900, stock: 25, attr: { color: 'Matte Onyx Black' } },
      { title: 'Champagne Silver', sku: 'AUR-NC-01-SLV', price: 1899900, stock: 20, attr: { color: 'Champagne Silver' } }
    ]
  },
  {
    name: 'Aero Titanium Ultra-Slim Mechanical Keyboard',
    slug: 'aero-titanium-mechanical-keyboard',
    brand: 'DEMO Studio',
    category: 'electronics',
    description: 'CNC machined unibody Grade 5 titanium housing with pre-lubricated hot-swappable low-profile mechanical switches. PBT dye-sublimated keycaps, triple-mode wireless connectivity (Bluetooth, 2.4GHz, Type-C).',
    highlights: 'Grade 5 Titanium Chassis; Low-profile Mechanical Switches; 2.4GHz + BT 5.2 Multi-device; Mac & Windows Layouts',
    specs: JSON.stringify({ "Layout": "75% Compact (84 Keys)", "Switches": "Gateron Low Profile Brown", "Battery": "3000mAh", "Backlight": "Subtle Warm White LED" }),
    price: 1249900, // ₹12,499.00
    origPrice: 1599900,
    discount: 21,
    sku: 'AER-KB-75',
    rating: 4.8,
    reviews: 89,
    stock: 30,
    featured: 1,
    trending: 0,
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1000&q=80',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=1000&q=80'
    ],
    variants: [
      { title: 'Space Grey / Tactile Brown', sku: 'AER-KB-75-GRY', price: 1249900, stock: 18, attr: { color: 'Space Grey', switch: 'Tactile' } },
      { title: 'Arctic Silver / Linear Red', sku: 'AER-KB-75-SIL', price: 1249900, stock: 12, attr: { color: 'Arctic Silver', switch: 'Linear' } }
    ]
  },
  {
    name: 'Merino Wool Structured Oversized Knit Cardigan',
    slug: 'merino-wool-oversized-cardigan',
    brand: 'Atelier DEMO',
    category: 'apparel',
    description: 'Spun from 100% extra-fine Australian Merino wool (19.5 micron). Hand-finished horn buttons, dropped shoulder construction, and ribbed cuffs. Provides thermal regulation and supreme handfeel.',
    highlights: '100% Extra-fine Merino Wool; Genuine Natural Horn Buttons; Relaxed Architectural Silhouette; Pre-shrunk Wool',
    specs: JSON.stringify({ "Material": "100% Merino Wool", "Care": "Dry clean or hand-wash cold", "Origin": "Knit in Himachal Pradesh, India", "Fit": "Relaxed Oversized" }),
    price: 649900, // ₹6,499.00
    origPrice: 899900,
    discount: 27,
    sku: 'ATL-CDG-M01',
    rating: 4.7,
    reviews: 54,
    stock: 60,
    featured: 1,
    trending: 1,
    images: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=1000&q=80',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&q=80'
    ],
    variants: [
      { title: 'Oatmeal Heather / M', sku: 'ATL-CDG-OAT-M', price: 649900, stock: 20, attr: { color: 'Oatmeal', size: 'M' } },
      { title: 'Oatmeal Heather / L', sku: 'ATL-CDG-OAT-L', price: 649900, stock: 20, attr: { color: 'Oatmeal', size: 'L' } },
      { title: 'Midnight Navy / M', sku: 'ATL-CDG-NVY-M', price: 649900, stock: 20, attr: { color: 'Navy', size: 'M' } }
    ]
  },
  {
    name: 'Raw Selvedge Japanese Denim Tapered Trousers',
    slug: 'raw-selvedge-denim-trousers',
    brand: 'Atelier DEMO',
    category: 'apparel',
    description: '14.5oz shuttle-loom woven Japanese red-line selvedge denim. Unwashed raw finish that develops distinctive personalized wear fades over time. Solid brass rivets and chain-stitched hems.',
    highlights: '14.5oz Kurabo Selvedge Denim; Red-line Selvedge ID; Custom Brass Hardware; Classic Tapered Cut',
    specs: JSON.stringify({ "Fabric": "100% Cotton Selvedge", "Weft": "Shuttle Loom Woven", "Hem": "Chain Stitched Union Special", "Origin": "Okayama, Japan" }),
    price: 799900, // ₹7,999.00
    origPrice: 999900,
    discount: 20,
    sku: 'ATL-DNM-32',
    rating: 4.9,
    reviews: 78,
    stock: 40,
    featured: 0,
    trending: 1,
    images: [
      'https://images.unsplash.com/photo-1542272604-780c96856592?w=1000&q=80',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1000&q=80'
    ],
    variants: [
      { title: 'Indigo Raw / 30', sku: 'ATL-DNM-IND-30', price: 799900, stock: 10, attr: { waist: '30' } },
      { title: 'Indigo Raw / 32', sku: 'ATL-DNM-IND-32', price: 799900, stock: 15, attr: { waist: '32' } },
      { title: 'Indigo Raw / 34', sku: 'ATL-DNM-IND-34', price: 799900, stock: 15, attr: { waist: '34' } }
    ]
  },
  {
    name: 'Handcrafted Ceramic Pour-Over & Decanter Set',
    slug: 'handcrafted-ceramic-coffee-set',
    brand: 'Komorebi Living',
    category: 'home-living',
    description: 'Wheel-thrown stoneware glazed in speckled matte volcanic ash. Custom 60-degree ribbed conical dripper paired with a 650ml serving decanter with precision drip spout and heat-resistant walnut collar.',
    highlights: 'Hand-thrown Natural Stoneware; 60-degree Precision Flow Ribs; 650ml Decanter; Solid Walnut Collar',
    specs: JSON.stringify({ "Capacity": "650ml (2-4 Cups)", "Finish": "Matte Volcanic Ash Glaze", "Dishwasher Safe": "Decanter yes, collar hand-wash", "Included": "Dripper, Carafe, 40 Filters" }),
    price: 389900, // ₹3,899.00
    origPrice: 499900,
    discount: 22,
    sku: 'KOM-CF-SET',
    rating: 4.8,
    reviews: 62,
    stock: 35,
    featured: 1,
    trending: 1,
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1000&q=80',
      'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=1000&q=80'
    ],
    variants: [
      { title: 'Speckled Sandstone', sku: 'KOM-CF-SND', price: 389900, stock: 20, attr: { glaze: 'Sandstone' } },
      { title: 'Volcanic Basalt Black', sku: 'KOM-CF-BLK', price: 389900, stock: 15, attr: { glaze: 'Basalt' } }
    ]
  },
  {
    name: 'Cast Brass Ambient Task Lamp with Dimmer',
    slug: 'cast-brass-ambient-task-lamp',
    brand: 'Komorebi Living',
    category: 'home-living',
    description: 'Weighted solid brushed brass silhouette designed for reading nooks and desktop sanctuaries. Warm 2700K integrated OLED panel with stepless rotary brass potentiometer for smooth dimming.',
    highlights: 'Solid Brushed Brass; Stepless Rotary Dimmer; 2700K Warm Museum Light; Braided Textile Cord',
    specs: JSON.stringify({ "Lumen": "450lm (Stepless Dimming)", "Color Temp": "2700K Warm Sunset", "Power": "9W High CRI 95+", "Cord": "2m Braided Linen" }),
    price: 849900, // ₹8,499.00
    origPrice: 1199900,
    discount: 29,
    sku: 'KOM-LMP-BRS',
    rating: 4.9,
    reviews: 39,
    stock: 25,
    featured: 0,
    trending: 0,
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&q=80',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1000&q=80'
    ],
    variants: [
      { title: 'Natural Brushed Brass', sku: 'KOM-LMP-NAT', price: 849900, stock: 15, attr: { finish: 'Brushed Brass' } },
      { title: 'Aged Patina Bronze', sku: 'KOM-LMP-BRZ', price: 849900, stock: 10, attr: { finish: 'Aged Bronze' } }
    ]
  },
  {
    name: 'Single-Estate Arabica Beans (Wayanad Reserve, 500g)',
    slug: 'single-estate-arabica-wayanad-500g',
    brand: 'DEMO Provisions',
    category: 'gourmet',
    description: 'Grown under native evergreen canopy at 1,450 meters elevation in Kerala. Medium-roast with cupping notes of dark stone fruit, roasted cacao nibs, and wild wildflower honey. Freshly roasted upon dispatch.',
    highlights: '100% Single-Estate Arabica; Specialty Grade (87.5 SCAA); Roasted in Small Batches; Shade Grown Canopy',
    specs: JSON.stringify({ "Altitude": "1,450 MASL", "Varietal": "S.795 & Selection 9", "Roast Level": "Medium Dark", "Weight": "500g Whole Bean" }),
    price: 89900, // ₹899.00
    origPrice: 109900,
    discount: 18,
    sku: 'PRV-COF-500',
    rating: 4.9,
    reviews: 210,
    stock: 120,
    featured: 1,
    trending: 1,
    images: [
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=1000&q=80',
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1000&q=80'
    ],
    variants: [
      { title: 'Whole Beans / 500g', sku: 'PRV-COF-WHL-500', price: 89900, stock: 80, attr: { grind: 'Whole Bean' } },
      { title: 'Medium Grind (Pour Over/AeroPress)', sku: 'PRV-COF-MED-500', price: 89900, stock: 40, attr: { grind: 'Medium' } }
    ]
  },
  {
    name: 'Wild Himalayan Raw Forest Honey with Comb (400g)',
    slug: 'wild-himalayan-raw-honey-400g',
    brand: 'DEMO Provisions',
    category: 'gourmet',
    description: 'Cold-extracted directly from wild Apis dorsata bee colonies in high-altitude pine forests of Uttarakhand. Unpasteurized, unfiltered, containing intact pollen granules and raw honeycomb slice.',
    highlights: '100% Raw Forest Harvest; Contains Intact Honeycomb Slice; Zero Antibiotics or Sugar Feeds; Rich Enzymatic Profile',
    specs: JSON.stringify({ "Source": "Garhwal Himalayas (2,200m)", "Purity": "Unpasteurized Raw", "Net Weight": "400g", "FSSAI": "10020042001928" }),
    price: 119900, // ₹1,199.00
    origPrice: 149900,
    discount: 20,
    sku: 'PRV-HNY-400',
    rating: 4.9,
    reviews: 115,
    stock: 75,
    featured: 0,
    trending: 1,
    images: [
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1000&q=80',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=1000&q=80'
    ],
    variants: [
      { title: 'Glass Hex Jar / 400g', sku: 'PRV-HNY-JAR-400', price: 119900, stock: 75, attr: { size: '400g' } }
    ]
  },
  {
    name: 'Bakuchiol & Peptides Cellular Restorative Night Elixir (30ml)',
    slug: 'bakuchiol-cellular-restorative-elixir',
    brand: 'Botanica Studio',
    category: 'beauty-grooming',
    description: 'A 1% pure botanical Bakuchiol phyto-retinol alternative complex combined with copper tripeptide-1 and cold-pressed cold-filtered rosehip seed oil. Rejuvenates cellular elasticity without redness or sun sensitivity.',
    highlights: 'Clean Phyto-Retinol Alternative; 1% Active Ayurvedic Bakuchiol; Hexapeptide Elasticity Matrix; ECOCERT Ingredients',
    specs: JSON.stringify({ "Volume": "30ml (1 fl oz)", "Texture": "Lightweight Silky Lipid", "Skin Type": "All / Sensitive Tolerant", "Cruelty Free": "100% Leaping Bunny Certified" }),
    price: 249900, // ₹2,499.00
    origPrice: 320000,
    discount: 22,
    sku: 'BOT-SRM-30',
    rating: 4.8,
    reviews: 98,
    stock: 85,
    featured: 1,
    trending: 1,
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1000&q=80',
      'https://images.unsplash.com/photo-1608248597359-216a9a7a9355?w=1000&q=80'
    ],
    variants: [
      { title: 'Standard Bottle / 30ml', sku: 'BOT-SRM-30ML', price: 249900, stock: 85, attr: { size: '30ml' } }
    ]
  },
  {
    name: 'Hand-Milled Cold-Process Charcoal & Cedarwood Soap Duo',
    slug: 'charcoal-cedarwood-soap-duo',
    brand: 'Botanica Studio',
    category: 'beauty-grooming',
    description: 'Cured for 6 weeks with saponified organic virgin coconut oil, activated bamboo charcoal for gentle detoxification, and steam-distilled Himalayan cedarwood essential oil.',
    highlights: '6-Week Cold-Process Cured; Activated Bamboo Charcoal; Himalayan Cedarwood & Vetiver; Biodegradable Kraft Packaging',
    specs: JSON.stringify({ "Pack": "2 x 125g Bars", "Base": "Organic Coconut & Shea Butter", "Sulfates/Parabens": "0% / SLS Free", "Origin": "Dehradun, India" }),
    price: 69900, // ₹699.00
    origPrice: 85000,
    discount: 17,
    sku: 'BOT-SOP-2PK',
    rating: 4.7,
    reviews: 47,
    stock: 140,
    featured: 0,
    trending: 0,
    images: [
      'https://images.unsplash.com/photo-1607006314649-6f97d312bc85?w=1000&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1000&q=80'
    ],
    variants: [
      { title: 'Twin Pack (2 x 125g)', sku: 'BOT-SOP-TWIN', price: 69900, stock: 140, attr: { pack: '2-Pack' } }
    ]
  },
  {
    name: 'High-Density Natural Cork & Rubber Yoga Mat',
    slug: 'natural-cork-rubber-yoga-mat',
    brand: 'Kinesis Athletics',
    category: 'fitness',
    description: '5mm thick performance mat featuring sustainably harvested Mediterranean oak cork bonded to a dense natural tree-rubber base. The wetter your hands get with sweat, the more traction the cork provides.',
    highlights: '100% Sustainable Oak Cork Surface; Slip-Resistant Natural Tree Rubber Base; 5mm Anti-Fatigue Cushioning; Anti-Microbial',
    specs: JSON.stringify({ "Dimensions": "183cm x 66cm x 5mm", "Weight": "2.4kg", "Materials": "Natural Cork + FSC Rubber", "Included": "Organic Cotton Carrying Strap" }),
    price: 349900, // ₹3,499.00
    origPrice: 449900,
    discount: 22,
    sku: 'KIN-MAT-CRK',
    rating: 4.9,
    reviews: 83,
    stock: 50,
    featured: 1,
    trending: 0,
    images: [
      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1000&q=80',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1000&q=80'
    ],
    variants: [
      { title: 'Natural Cork / 5mm Pro', sku: 'KIN-MAT-5MM', price: 349900, stock: 50, attr: { thickness: '5mm' } }
    ]
  },
  {
    name: 'Carbon Fiber Deep-Tissue Percussion Massage Device',
    slug: 'carbon-fiber-massage-gun',
    brand: 'Kinesis Athletics',
    category: 'fitness',
    description: 'Brushless quiet-glide motor delivering 14mm amplitude stroke at up to 3200 percussions per minute. Aerospace carbon fiber casing prevents overheating while keeping device weight under 800 grams.',
    highlights: 'QuietGlide 45dB Brushless Motor; 14mm Deep-Tissue Amplitude; 6 Interchangeable Medical Silicone Heads; 6-Hour Battery',
    specs: JSON.stringify({ "Speeds": "5 Dynamic Gear Modes (1400-3200 RPM)", "Battery": "2600mAh LG Cell", "Stall Force": "45 lbs", "Case": "Aerospace Carbon Fiber" }),
    price: 999900, // ₹9,999.00
    origPrice: 1499900,
    discount: 33,
    sku: 'KIN-MSG-CARB',
    rating: 4.8,
    reviews: 67,
    stock: 35,
    featured: 1,
    trending: 1,
    images: [
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1000&q=80',
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1000&q=80'
    ],
    variants: [
      { title: 'Graphite Carbon / 6 Heads', sku: 'KIN-MSG-GPH', price: 999900, stock: 35, attr: { color: 'Graphite Carbon' } }
    ]
  }
];

for (const p of products) {
  const catId = categoryMap[p.category];
  const info = db.prepare(`
    INSERT INTO products (
      name, slug, brand, category_id, description, highlights, specifications_json,
      price_paise, original_price_paise, discount_percent, sku, rating, review_count, stock,
      is_featured, is_trending, meta_title, meta_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET 
      price_paise = excluded.price_paise,
      stock = excluded.stock,
      description = excluded.description
  `).run(
    p.name, p.slug, p.brand, catId, p.description, p.highlights, p.specs,
    p.price, p.origPrice, p.discount, p.sku, p.rating, p.reviews, p.stock,
    p.featured, p.trending, `${p.name} | Buy Online at DEMO India`, p.highlights
  );

  const prodId = info.lastInsertRowid || db.prepare('SELECT id FROM products WHERE slug = ?').get(p.slug).id;

  // Insert Images
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(prodId);
  p.images.forEach((img, idx) => {
    db.prepare('INSERT INTO product_images (product_id, image_url, alt_text, display_order) VALUES (?, ?, ?, ?)')
      .run(prodId, img, `${p.name} view ${idx + 1}`, idx);
  });

  // Insert Variants
  db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(prodId);
  p.variants.forEach(v => {
    db.prepare(`
      INSERT INTO product_variants (product_id, title, sku, price_paise, stock, attributes_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(prodId, v.title, v.sku, v.price, v.stock, JSON.stringify(v.attr));
  });
}

// 6. Seed Indian Pincode Delivery Rules
const pincodes = [
  ['560001', 'Bengaluru', 'Karnataka', 1, 2, 1, 0],
  ['560038', 'Bengaluru', 'Karnataka', 1, 1, 1, 0],
  ['560071', 'Bengaluru', 'Karnataka', 1, 1, 1, 0],
  ['110001', 'New Delhi', 'Delhi', 1, 2, 1, 0],
  ['110020', 'New Delhi', 'Delhi', 1, 2, 1, 0],
  ['400001', 'Mumbai', 'Maharashtra', 1, 2, 1, 0],
  ['400050', 'Mumbai', 'Maharashtra', 1, 2, 1, 0],
  ['700001', 'Kolkata', 'West Bengal', 1, 3, 1, 0],
  ['600001', 'Chennai', 'Tamil Nadu', 1, 2, 1, 0],
  ['500001', 'Hyderabad', 'Telangana', 1, 2, 1, 0],
  ['411001', 'Pune', 'Maharashtra', 1, 2, 1, 0],
  ['380001', 'Ahmedabad', 'Gujarat', 1, 3, 1, 0],
  ['302001', 'Jaipur', 'Rajasthan', 1, 3, 1, 0],
  ['682001', 'Kochi', 'Kerala', 1, 3, 1, 0],
  ['190001', 'Srinagar', 'Jammu & Kashmir', 1, 5, 0, 15000] // Higher transit, no COD
];

for (const [code, city, state, serv, days, cod, fee] of pincodes) {
  db.prepare(`
    INSERT INTO pincode_rules (pincode, city, state, is_serviceable, estimated_days, cod_available, shipping_charge_paise)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(pincode) DO UPDATE SET is_serviceable = excluded.is_serviceable, estimated_days = excluded.estimated_days
  `).run(code, city, state, serv, days, cod, fee);
}

// 7. Seed Active Promo Coupons
const coupons = [
  ['DEMO10', 'Welcome to DEMO — 10% off on all items', 'PERCENTAGE', 10, 100000, 150000, '2027-12-31', 5000],
  ['FIRST500', 'Flat ₹500 off on your first order above ₹2,500', 'FLAT', 50000, 250000, 50000, '2027-12-31', 2000],
  ['FESTIVE20', 'Festive Special 20% savings up to ₹3,000', 'PERCENTAGE', 20, 200000, 300000, '2027-12-31', 1000],
  ['FREESHIP', 'Free standard shipping on any order', 'FLAT', 9900, 0, 9900, '2027-12-31', 10000]
];

for (const [code, desc, type, val, minO, maxD, exp, limit] of coupons) {
  db.prepare(`
    INSERT INTO coupons (code, description, discount_type, discount_value, min_order_paise, max_discount_paise, expiry_date, usage_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET discount_value = excluded.discount_value
  `).run(code, desc, type, val, minO, maxD, exp, limit);
}

// 8. Seed Promotional Banners
const banners = [
  [
    'Aesthetics Meets Precision Engineering',
    'Explore curated essentials spanning acoustics, sartorial knitwear, coffee gear, and movement science.',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80',
    'Explore The Catalog',
    '/products',
    'NEW COLLECTION 2026',
    1
  ],
  [
    'Studio Audio & Acoustic Reference',
    'Experience pure auditory depth with beryllium acoustic chambers and lossless transmission.',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&q=80',
    'Shop Audio Lab',
    '/products?category=electronics',
    'AUDIOPHILE SERIES',
    2
  ]
];

db.prepare('DELETE FROM banners').run();
for (const [title, sub, img, ctaT, ctaL, badge, order] of banners) {
  db.prepare(`
    INSERT INTO banners (title, subtitle, image_url, cta_text, cta_link, badge_text, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, sub, img, ctaT, ctaL, badge, order);
}

// 9. Seed Sample Reviews
const sampleProduct = db.prepare('SELECT id FROM products WHERE slug = ?').get('aura-studio-wireless-headphones');
if (sampleProduct) {
  db.prepare('DELETE FROM reviews WHERE product_id = ?').run(sampleProduct.id);
  db.prepare(`
    INSERT INTO reviews (product_id, user_name, rating, title, comment, is_verified_purchase)
    VALUES 
      (?, 'Vikram Malhotra', 5, 'Unrivaled soundstage and build quality', 'The beryllium drivers have unmatched transient response. Highs are shimmering without fatigue. Battery lasted my entire flight to Tokyo and back.', 1),
      (?, 'Pooja Hegde', 5, 'Best ANC in its class', 'The noise cancellation completely blocks out street honking in Koramangala. Beautiful luxury unboxing experience as well.', 1)
  `).run(sampleProduct.id, sampleProduct.id);
}

// 10. Seed Realistic Seed Order for demo customer
if (customerUser && sampleProduct) {
  const existingOrder = db.prepare('SELECT id FROM orders WHERE order_number = ?').get('ORD-2026-88412');
  if (!existingOrder) {
    const orderInfo = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address_json, subtotal_paise, discount_paise, tax_paise, shipping_fee_paise,
        total_paise, coupon_code, payment_method, payment_status, order_status, tracking_number, courier_name
      ) VALUES (
        'ORD-2026-88412', ?, 'Aarav Sharma', 'customer@demo.in', '+91 98111 22334',
        ?, 1899900, 189990, 307784, 0,
        2017694, 'DEMO10', 'UPI', 'PAID', 'DELIVERED', 'DEL-992384711', 'Delhivery Express'
      )
    `).run(
      customerUser.id,
      JSON.stringify({
        recipient_name: 'Aarav Sharma',
        street: 'Flat 402, Prestige Tower, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        phone: '+91 98111 22334'
      })
    );

    const orderId = Number(orderInfo.lastInsertRowid);
    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, sku, unit_price_paise, quantity, total_price_paise)
      VALUES (?, ?, 'Aura Studio Wireless Noise-Cancelling Headphones', 'AUR-NC-01-BLK', 1899900, 1, 1899900)
    `).run(orderId, sampleProduct.id);

    db.prepare(`
      INSERT INTO payments (order_id, transaction_ref, payment_gateway, amount_paise, status, gateway_signature)
      VALUES (?, 'pay_demo_test_88412', 'RAZORPAY_TEST', 2017694, 'SUCCESS', 'sig_test_verified_9918237')
    `).run(orderId);
  }
}

console.log('[DEMO Seed] Finished successfully! Seeded products, categories, users, pincodes, banners, and sample orders.');
