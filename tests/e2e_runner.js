import { chromium } from 'playwright';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
const JWT_SECRET = 'demo_ecom_flagship_super_secret_jwt_2026_india';

async function run() {
  console.log('[Playwright] Launching browser verification suite...');
  const browser = await chromium.launch();

  // 1. Desktop Test (1440x900)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('[Playwright] Step 1: Homepage loading...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '01_storefront_home.png'), fullPage: false });

  console.log('[Playwright] Step 2: Navigating to Catalog & applying filters...');
  await page.click('button:has-text("All Products")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '02_catalog_filtered.png'), fullPage: false });

  console.log('[Playwright] Step 3: Opening Product Details Page...');
  await page.click('h3:has-text("Aura Studio Wireless Noise-Cancelling Headphones")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '03_product_details.png'), fullPage: false });

  console.log('[Playwright] Step 4: Adding to Bag & Drawer preview...');
  await page.click('button:has-text("Add to Shopping Bag")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '04_cart_drawer.png') });

  console.log('[Playwright] Step 5: Proceeding to Checkout from Drawer...');
  await page.locator('.w-screen').getByRole('button', { name: /Checkout/ }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '05_checkout_screen.png'), fullPage: false });

  console.log('[Playwright] Step 6: Completing Order Placement & Payment Verification...');
  await page.click('button:has-text("Confirm & Pay")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotsDir, '06_order_confirmation.png') });

  console.log('[Playwright] Step 7: Admin Portal Dashboard...');
  // Authenticate as Super Admin directly via localStorage token
  const adminToken = jwt.sign(
    { id: 1, email: 'admin@demo.in', role: 'SUPER_ADMIN', name: 'Super Administrator' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  await page.evaluate(({ token }) => {
    localStorage.setItem('demo_token', token);
    localStorage.setItem('demo_user', JSON.stringify({ id: 1, name: 'Super Administrator', email: 'admin@demo.in', role: 'SUPER_ADMIN' }));
  }, { token: adminToken });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Navigate to Admin Portal
  await page.click('button:has-text("Admin Portal")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '07_admin_dashboard.png') });

  console.log('[Playwright] Step 8: Admin Product Catalog Management...');
  await page.click('button:has-text("Product Catalog")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '08_admin_products.png') });

  await context.close();

  // 2. Mobile Viewport Test (390x844)
  console.log('[Playwright] Step 9 & 10: Mobile viewports...');
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, '09_mobile_storefront.png') });

  await mobilePage.click('button:has-text("Explore Catalog")');
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, '10_mobile_catalog.png') });

  await mobileContext.close();
  await browser.close();
  console.log('[Playwright] Full test suite executed cleanly with 10 high-resolution verification screenshots!');
}

run().catch(err => {
  console.error('[Playwright Error]', err);
  process.exit(1);
});
