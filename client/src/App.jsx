import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Heart, Search, User, Menu, X, Check, Star, ArrowRight,
  ShieldCheck, Truck, RotateCcw, Award, ChevronDown, ChevronRight,
  Plus, Minus, Trash2, Filter, SlidersHorizontal, Eye, ExternalLink,
  Package, Clock, AlertTriangle, CreditCard, Banknote, RefreshCw,
  Settings, BarChart3, Users, Tag, Box, ArrowUpRight, LogOut, CheckCircle2,
  Lock, MapPin, Phone, Mail, HelpCircle, FileText, Send, DollarSign
} from 'lucide-react';

// Format paise to INR (e.g. 1899900 -> ₹18,999)
const formatINR = (paise) => {
  if (paise === undefined || paise === null) return '₹0';
  const rupees = Math.round(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN');
};

export default function App() {
  // Navigation & Core State
  const [activePage, setActivePage] = useState('home'); // home, catalog, product, cart, checkout, account, about, contact, faq, shipping, returns, privacy, terms, admin
  const [selectedProductSlug, setSelectedProductSlug] = useState(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(null);

  // Authentication State
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('demo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('demo_token') || null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login | register

  // Cart & Wishlist State
  const [cart, setCart] = useState({ items: [], subtotal_paise: 0, count: 0 });
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [sessionId] = useState(() => {
    let sid = localStorage.getItem('demo_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('demo_session_id', sid);
    }
    return sid;
  });

  // Global Toast Notification
  const [notification, setNotification] = useState(null);
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  // Data State
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [storeSettings, setStoreSettings] = useState({});

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // ---------------------------------------------------------------------------
  // Load Initial Store Data & Cart
  // ---------------------------------------------------------------------------
  const fetchSettingsAndMetadata = async () => {
    try {
      const resCategories = await fetch('/api/categories').then(r => r.json());
      if (resCategories.categories) setCategories(resCategories.categories);

      const resBanners = await fetch('/api/banners').then(r => r.json());
      if (resBanners.banners) setBanners(resBanners.banners);

      const resSettings = await fetch('/api/settings').then(r => r.json());
      if (resSettings) setStoreSettings(resSettings);
    } catch (e) {
      console.warn('Metadata fetch error:', e);
    }
  };

  const fetchCart = async () => {
    try {
      const headers = { 'x-session-id': sessionId };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/cart', { headers }).then(r => r.json());
      if (res && Array.isArray(res.items)) {
        setCart(res);
      }
    } catch (e) {
      console.warn('Cart fetch error:', e);
    }
  };

  const fetchWishlist = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wishlist', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
      if (res.wishlist) setWishlist(res.wishlist);
    } catch (e) {
      console.warn('Wishlist fetch error:', e);
    }
  };

  useEffect(() => {
    fetchSettingsAndMetadata();
    fetchCart();
    if (token) fetchWishlist();
  }, [token]);

  // Auth helper
  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('demo_user', JSON.stringify(userData));
    localStorage.setItem('demo_token', userToken);
    setAuthModalOpen(false);
    showToast(`Welcome back, ${userData.name}!`);
    fetchCart();
    fetchWishlist();
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_token');
    showToast('You have been logged out.');
    if (activePage === 'admin' || activePage === 'account') setActivePage('home');
  };

  const toggleWishlist = async (productId) => {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    try {
      const res = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId })
      }).then(r => r.json());

      if (res.action === 'added') {
        showToast('Saved to your wishlist');
      } else {
        showToast('Removed from wishlist');
      }
      fetchWishlist();
    } catch (e) {
      showToast('Could not update wishlist', 'error');
    }
  };

  const addToCart = async (productId, variantId = null, quantity = 1) => {
    try {
      const headers = { 'Content-Type': 'application/json', 'x-session-id': sessionId };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers,
        body: JSON.stringify({ product_id: productId, variant_id: variantId, quantity })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to add item', 'error');
        return false;
      }
      showToast('Added to bag');
      fetchCart();
      setCartDrawerOpen(true);
      return true;
    } catch (e) {
      showToast('Could not add to bag', 'error');
      return false;
    }
  };

  const updateCartQty = async (cartItemId, newQty) => {
    try {
      const headers = { 'Content-Type': 'application/json', 'x-session-id': sessionId };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (newQty <= 0) {
        await fetch(`/api/cart/item/${cartItemId}`, { method: 'DELETE', headers });
      } else {
        await fetch(`/api/cart/item/${cartItemId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ quantity: newQty })
        });
      }
      fetchCart();
    } catch (e) {
      showToast('Cart update failed', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 antialiased font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white text-sm font-medium transition-all transform animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'error' ? 'bg-rose-600' : 'bg-stone-900 border border-stone-800'
        }`}>
          {notification.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-200" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* HEADER & NAVIGATION */}
      {/* ----------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        {/* Top Announcement Bar */}
        <div className="bg-stone-900 text-stone-300 text-xs py-2 px-4 text-center tracking-wide font-medium flex items-center justify-center gap-2">
          <span>Free Express Shipping across India on orders over ₹999</span>
          <span className="text-stone-600">•</span>
          <span className="text-stone-400">100% Genuine Certified Quality</span>
          {user && ['SUPER_ADMIN', 'STORE_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER'].includes(user.role) && (
            <button
              onClick={() => setActivePage('admin')}
              className="ml-3 bg-stone-800 hover:bg-stone-700 text-emerald-400 px-2 py-0.5 rounded text-[11px] font-mono tracking-tight flex items-center gap-1 border border-stone-700"
            >
              <Lock className="w-3 h-3" /> Admin Portal ({user.role})
            </button>
          )}
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => { setActivePage('home'); setSelectedCategorySlug(null); }}
              className="flex items-center gap-2 text-left group"
            >
              <div className="w-10 h-10 bg-stone-900 text-white rounded-lg flex items-center justify-center font-heading font-black text-xl tracking-tighter shadow-sm group-hover:bg-teal-700 transition-colors">
                D
              </div>
              <div>
                <span className="text-2xl font-heading font-black tracking-tighter block leading-tight text-stone-900">
                  DEMO
                </span>
                <span className="text-[10px] tracking-widest text-stone-500 uppercase font-mono block -mt-0.5">
                  All Things India
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
              <button
                onClick={() => { setActivePage('catalog'); setSelectedCategorySlug(null); }}
                className={`hover:text-stone-900 transition-colors ${activePage === 'catalog' && !selectedCategorySlug ? 'text-stone-900 font-semibold' : ''}`}
              >
                All Products
              </button>
              {categories.slice(0, 5).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategorySlug(cat.slug); setActivePage('catalog'); }}
                  className={`hover:text-stone-900 transition-colors capitalize ${selectedCategorySlug === cat.slug ? 'text-stone-900 font-semibold' : ''}`}
                >
                  {cat.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Search, Account, Wishlist, Cart Actions */}
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="hidden lg:flex items-center relative w-64">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setActivePage('catalog');
                  }
                }}
                className="w-full bg-stone-100 border border-stone-200 rounded-full pl-9 pr-4 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
              />
            </div>

            {/* Wishlist */}
            <button
              onClick={() => {
                if (!token) setAuthModalOpen(true);
                else setActivePage('account');
              }}
              className="p-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 relative transition-colors"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* User Account */}
            {user ? (
              <div className="relative group">
                <button
                  onClick={() => setActivePage('account')}
                  className="flex items-center gap-2 p-1.5 pl-2.5 rounded-full border border-stone-200 hover:border-stone-400 text-xs font-medium text-stone-700 transition-all"
                >
                  <span className="max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                  <div className="w-7 h-7 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {user.name[0]}
                  </div>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Shopping Cart Drawer Trigger */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-900 px-3.5 py-2 rounded-full font-medium text-xs transition-colors relative"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Bag</span>
              <span className="bg-stone-900 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-0.5">
                {cart.count || 0}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------------- */}
      {/* MAIN VIEW CONTROLLER */}
      {/* ----------------------------------------------------------------------- */}
      <main className="flex-1">
        {activePage === 'home' && (
          <HomePage
            categories={categories}
            banners={banners}
            onSelectCategory={(slug) => { setSelectedCategorySlug(slug); setActivePage('catalog'); }}
            onSelectProduct={(slug) => { setSelectedProductSlug(slug); setActivePage('product'); }}
            onQuickView={(p) => setQuickViewProduct(p)}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            wishlist={wishlist}
          />
        )}

        {activePage === 'catalog' && (
          <CatalogPage
            categories={categories}
            selectedCategory={selectedCategorySlug}
            onSelectCategory={setSelectedCategorySlug}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
            onSelectProduct={(slug) => { setSelectedProductSlug(slug); setActivePage('product'); }}
            onQuickView={(p) => setQuickViewProduct(p)}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            wishlist={wishlist}
          />
        )}

        {activePage === 'product' && selectedProductSlug && (
          <ProductDetailPage
            slug={selectedProductSlug}
            onAddToCart={addToCart}
            onBuyNow={(prodId, varId, qty) => {
              addToCart(prodId, varId, qty).then(() => setActivePage('checkout'));
            }}
            onToggleWishlist={toggleWishlist}
            isWishlisted={wishlist.some(w => w.slug === selectedProductSlug)}
            onSelectProduct={(slug) => setSelectedProductSlug(slug)}
            token={token}
            showToast={showToast}
          />
        )}

        {activePage === 'cart' && (
          <CartPage
            cart={cart}
            onUpdateQty={updateCartQty}
            onProceedCheckout={() => setActivePage('checkout')}
            onContinueShopping={() => setActivePage('catalog')}
          />
        )}

        {activePage === 'checkout' && (
          <CheckoutPage
            cart={cart}
            user={user}
            token={token}
            sessionId={sessionId}
            onOrderComplete={(orderData) => {
              fetchCart();
              showToast('Order confirmed successfully!');
            }}
            onBackToCart={() => setActivePage('cart')}
            showToast={showToast}
          />
        )}

        {activePage === 'account' && (
          <AccountPage
            user={user}
            token={token}
            wishlist={wishlist}
            onLogout={handleLogout}
            onSelectProduct={(slug) => { setSelectedProductSlug(slug); setActivePage('product'); }}
            onAddToCart={addToCart}
            showToast={showToast}
          />
        )}

        {activePage === 'admin' && (
          <AdminDashboardPage
            user={user}
            token={token}
            onExitAdmin={() => setActivePage('home')}
            showToast={showToast}
          />
        )}

        {/* Informational / Legal Pages */}
        {activePage === 'about' && <AboutUsPage />}
        {activePage === 'contact' && <ContactUsPage showToast={showToast} />}
        {activePage === 'faq' && <FaqPage />}
        {activePage === 'shipping' && <ShippingPolicyPage />}
        {activePage === 'returns' && <ReturnsPolicyPage />}
        {activePage === 'privacy' && <PrivacyPolicyPage />}
        {activePage === 'terms' && <TermsPage />}
      </main>

      {/* ----------------------------------------------------------------------- */}
      {/* CART SLIDE-OVER DRAWER */}
      {/* ----------------------------------------------------------------------- */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" onClick={() => setCartDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-6 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-stone-900" />
                  <h2 className="text-lg font-heading font-bold text-stone-900">Your Bag ({cart.count})</h2>
                </div>
                <button onClick={() => setCartDrawerOpen(false)} className="p-2 text-stone-400 hover:text-stone-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.items.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-600 font-medium text-sm">Your shopping bag is empty.</p>
                    <p className="text-stone-400 text-xs mt-1">Explore our curated collections across India.</p>
                    <button
                      onClick={() => { setCartDrawerOpen(false); setActivePage('catalog'); }}
                      className="mt-6 px-5 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  cart.items.map(item => (
                    <div key={item.cart_item_id} className="flex gap-4 pb-6 border-b border-stone-100 last:border-b-0">
                      <img
                        src={item.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg bg-stone-100 flex-shrink-0"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-xs font-semibold text-stone-900 line-clamp-1">{item.name}</h3>
                            <button
                              onClick={() => updateCartQty(item.cart_item_id, 0)}
                              className="text-stone-400 hover:text-rose-500 p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {item.variant_title && (
                            <p className="text-[11px] text-stone-500 mt-0.5">{item.variant_title}</p>
                          )}
                          <p className="text-xs font-mono font-medium text-stone-900 mt-1">
                            {formatINR(item.unit_price_paise)}
                          </p>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-stone-200 rounded-md">
                            <button
                              onClick={() => updateCartQty(item.cart_item_id, item.quantity - 1)}
                              className="p-1 hover:bg-stone-100 text-stone-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-mono font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(item.cart_item_id, item.quantity + 1)}
                              className="p-1 hover:bg-stone-100 text-stone-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-xs text-stone-500 font-mono ml-auto">
                            {formatINR(item.total_price_paise)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              {cart.items.length > 0 && (
                <div className="p-6 border-t border-stone-200 bg-stone-50 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-600">Subtotal</span>
                    <span className="font-mono font-bold text-stone-900 text-base">{formatINR(cart.subtotal_paise)}</span>
                  </div>
                  <p className="text-[11px] text-stone-500">Shipping and taxes calculated during checkout.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setCartDrawerOpen(false); setActivePage('cart'); }}
                      className="flex-1 py-3 border border-stone-300 hover:bg-stone-100 rounded-xl text-xs font-semibold text-stone-800 transition-colors"
                    >
                      View Bag
                    </button>
                    <button
                      onClick={() => { setCartDrawerOpen(false); setActivePage('checkout'); }}
                      className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      Checkout <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* QUICK VIEW MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setQuickViewProduct(null)} />
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl z-10 overflow-hidden">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <img
                src={quickViewProduct.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'}
                alt={quickViewProduct.name}
                className="w-full h-64 md:h-80 object-cover rounded-xl bg-stone-100"
              />
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono tracking-widest text-teal-700 uppercase font-bold">{quickViewProduct.brand}</span>
                  <h3 className="text-lg font-heading font-bold text-stone-900 mt-1">{quickViewProduct.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold text-stone-900 ml-1">{quickViewProduct.rating}</span>
                    </div>
                    <span className="text-xs text-stone-400">({quickViewProduct.review_count || 12} reviews)</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-xl font-heading font-bold text-stone-900">{formatINR(quickViewProduct.price_paise)}</span>
                    {quickViewProduct.original_price_paise > quickViewProduct.price_paise && (
                      <span className="text-xs text-stone-400 line-through">{formatINR(quickViewProduct.original_price_paise)}</span>
                    )}
                    {quickViewProduct.discount_percent > 0 && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {quickViewProduct.discount_percent}% OFF
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-3 line-clamp-3 leading-relaxed">
                    {quickViewProduct.description}
                  </p>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      addToCart(quickViewProduct.id);
                      setQuickViewProduct(null);
                    }}
                    className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Add to Bag
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProductSlug(quickViewProduct.slug);
                      setActivePage('product');
                      setQuickViewProduct(null);
                    }}
                    className="px-4 py-3 border border-stone-300 hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Full Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* AUTHENTICATION MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {authModalOpen && (
        <AuthModal
          mode={authMode}
          onSwitchMode={setAuthMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleLoginSuccess}
          showToast={showToast}
        />
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* FOOTER */}
      {/* ----------------------------------------------------------------------- */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Brand Column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white text-stone-900 rounded flex items-center justify-center font-heading font-black text-lg">
                  D
                </div>
                <span className="text-xl font-heading font-black text-white tracking-tight">DEMO</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
                India's premier digital shopping platform curated for discerning lifestyles. Engineered with precision architecture, verified sourcing, and white-glove customer care.
              </p>
              <div className="pt-2 text-[11px] font-mono text-stone-500 space-y-1">
                <p>GSTIN: 29AABCU9603R1ZM</p>
                <p>Registered Office: Indiranagar, Bengaluru, Karnataka 560038</p>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-stone-200 font-bold mb-4">Shop Categories</h4>
              <ul className="space-y-2.5 text-xs">
                {categories.map(cat => (
                  <li key={cat.id}>
                    <button
                      onClick={() => { setSelectedCategorySlug(cat.slug); setActivePage('catalog'); }}
                      className="hover:text-white transition-colors capitalize"
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Care */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-stone-200 font-bold mb-4">Support & Care</h4>
              <ul className="space-y-2.5 text-xs">
                <li><button onClick={() => setActivePage('about')} className="hover:text-white transition-colors">About DEMO</button></li>
                <li><button onClick={() => setActivePage('contact')} className="hover:text-white transition-colors">Contact Concierge</button></li>
                <li><button onClick={() => setActivePage('faq')} className="hover:text-white transition-colors">Help & FAQs</button></li>
                <li><button onClick={() => setActivePage('shipping')} className="hover:text-white transition-colors">Shipping Information</button></li>
                <li><button onClick={() => setActivePage('returns')} className="hover:text-white transition-colors">7-Day Easy Returns</button></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-stone-200 font-bold mb-4">The DEMO Journal</h4>
              <p className="text-xs text-stone-400 mb-3">Sign up for private drops and editorial releases.</p>
              <NewsletterForm showToast={showToast} />
              <div className="mt-4 flex items-center gap-2 text-[11px] text-stone-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Protected by Razorpay & SSL</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
            <p>© {new Date().getFullYear()} DEMO Technologies Pvt Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <button onClick={() => setActivePage('privacy')} className="hover:text-stone-300">Privacy Policy</button>
              <button onClick={() => setActivePage('terms')} className="hover:text-stone-300">Terms of Service</button>
              <button onClick={() => setActivePage('shipping')} className="hover:text-stone-300">Shipping Rules</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// -----------------------------------------------------------------------------
// NEWSLETTER COMPONENT
// -----------------------------------------------------------------------------
function NewsletterForm({ showToast }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).then(r => r.json());
      showToast(res.message || 'Subscribed successfully!');
      setEmail('');
    } catch {
      showToast('Subscription failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-white"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-white hover:bg-stone-200 text-stone-900 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
      >
        Join
      </button>
    </form>
  );
}

// -----------------------------------------------------------------------------
// HOMEPAGE VIEW
// -----------------------------------------------------------------------------
function HomePage({ categories, banners, onSelectCategory, onSelectProduct, onQuickView, onAddToCart, onToggleWishlist, wishlist }) {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products?limit=8').then(r => r.json()).then(data => {
      if (data.products) {
        setTrendingProducts(data.products.filter(p => p.is_trending));
        setFeaturedProducts(data.products.filter(p => p.is_featured));
      }
    }).catch(console.warn);
  }, []);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative bg-stone-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80"
            alt="Hero background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-900/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 flex flex-col justify-center min-h-[540px]">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase bg-teal-950/80 text-teal-400 border border-teal-800/60 w-max mb-4">
            NEW DROP 2026 • PAN-INDIA DISPATCH
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-black tracking-tight max-w-2xl text-white leading-tight">
            Curated Essentials Engineered for Modern Living.
          </h1>
          <p className="mt-4 text-stone-300 text-sm md:text-base max-w-xl leading-relaxed">
            From precision acoustic chambers and Japanese shuttle-loom denim to single-estate Wayanad Arabica coffees. Designed for those who demand excellence in every detail.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => onSelectCategory(null)}
              className="px-6 py-3.5 bg-white hover:bg-stone-100 text-stone-900 rounded-xl text-xs font-bold tracking-wide transition-all shadow-lg flex items-center gap-2"
            >
              Explore Catalog <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectCategory('electronics')}
              className="px-6 py-3.5 bg-stone-800/80 hover:bg-stone-700/80 text-white border border-stone-700 rounded-xl text-xs font-bold tracking-wide transition-all backdrop-blur-sm"
            >
              Acoustic Studio
            </button>
          </div>
        </div>
      </section>

      {/* Trust Indicators Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center gap-3.5 p-2">
            <Truck className="w-6 h-6 text-teal-700 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-stone-900">Free Express Delivery</h4>
              <p className="text-[11px] text-stone-500">On all orders over ₹999</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 p-2">
            <RotateCcw className="w-6 h-6 text-teal-700 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-stone-900">7-Day Easy Returns</h4>
              <p className="text-[11px] text-stone-500">Hassle-free doorstep pickup</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 p-2">
            <ShieldCheck className="w-6 h-6 text-teal-700 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-stone-900">100% Genuine Certified</h4>
              <p className="text-[11px] text-stone-500">Directly from maker ateliers</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 p-2">
            <CreditCard className="w-6 h-6 text-teal-700 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-stone-900">UPI & COD Available</h4>
              <p className="text-[11px] text-stone-500">Secure Razorpay encryption</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-teal-700">EXPLORE ATELIERS</span>
            <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-stone-900 mt-1">
              Curated Collections
            </h2>
          </div>
          <button
            onClick={() => onSelectCategory(null)}
            className="text-xs font-bold text-stone-900 hover:text-teal-700 flex items-center gap-1 group"
          >
            View all categories <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className="group relative rounded-xl overflow-hidden aspect-[4/5] bg-stone-100 flex flex-col justify-end p-4 text-left border border-stone-200/80 shadow-sm hover:shadow-md transition-all"
            >
              <img
                src={cat.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
              <div className="relative z-10 text-white">
                <h3 className="text-xs font-bold leading-tight">{cat.name}</h3>
                <span className="text-[10px] text-stone-300 font-mono mt-0.5 block">{cat.product_count || 'Curated'} items</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Bestsellers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-teal-700">FLAGSHIP CRAFT</span>
            <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-stone-900 mt-1">
              Best-Selling Creations
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.slice(0, 4).map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={() => onSelectProduct(product.slug)}
              onQuickView={() => onQuickView(product)}
              onAddToCart={() => onAddToCart(product.id)}
              onToggleWishlist={() => onToggleWishlist(product.id)}
              isWishlisted={wishlist.some(w => w.id === product.id)}
            />
          ))}
        </div>
      </section>

      {/* Promotional Editorial Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-stone-900 text-white p-8 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="relative z-10 max-w-xl">
            <span className="text-xs font-mono font-bold tracking-widest text-teal-400 uppercase">THE PROVENANCE COMMITMENT</span>
            <h3 className="text-2xl sm:text-4xl font-heading font-bold mt-2 leading-tight">
              Single-Estate Harvests & Certified Organic Terroirs
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 mt-3 leading-relaxed">
              Every bean, textile thread, and cold-pressed botanical in DEMO is traceable back to its maker origin. We reject synthetic fillers and mass shortcuts.
            </p>
            <button
              onClick={() => onSelectCategory('gourmet')}
              className="mt-6 px-5 py-2.5 bg-white text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors"
            >
              Explore Provisions & Wellness
            </button>
          </div>
          <img
            src="https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80"
            alt="Provisions"
            className="w-full md:w-80 h-64 object-cover rounded-2xl shadow-xl border border-stone-800"
          />
        </div>
      </section>

      {/* Trending Drops */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-teal-700">NEW ARRIVALS</span>
            <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-stone-900 mt-1">
              Trending Releases
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingProducts.slice(0, 4).map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={() => onSelectProduct(product.slug)}
              onQuickView={() => onQuickView(product)}
              onAddToCart={() => onAddToCart(product.id)}
              onToggleWishlist={() => onToggleWishlist(product.id)}
              isWishlisted={wishlist.some(w => w.id === product.id)}
            />
          ))}
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="bg-stone-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-teal-700">VERIFIED CLIENTS</span>
            <h2 className="text-2xl font-heading font-bold text-stone-900 mt-1">Customer Experiences</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-xs text-stone-700 italic leading-relaxed">
                "The Aura Studio headphones surpassed my expectations. The beryllium drivers offer a clean, expansive soundstage that makes conference calls and late-night listening a joy."
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-stone-900">Dr. Vikram Malhotra</h5>
                  <span className="text-[10px] text-stone-500">Bengaluru • Verified Buyer</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-xs text-stone-700 italic leading-relaxed">
                "The Wayanad Reserve whole bean coffee has legitimate stone fruit cupping notes. Shipped in 2 days to South Delhi with roast dates stamped right on the bag."
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-stone-900">Pooja Sengupta</h5>
                  <span className="text-[10px] text-stone-500">New Delhi • Verified Buyer</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-xs text-stone-700 italic leading-relaxed">
                "Aero mechanical keyboard feels like an aerospace monolith. Solid titanium body and ultra-smooth switches. Exactly what my home desk setup was missing."
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-stone-900">Aditya Verma</h5>
                  <span className="text-[10px] text-stone-500">Mumbai • Verified Buyer</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PRODUCT CARD COMPONENT
// -----------------------------------------------------------------------------
function ProductCard({ product, onSelect, onQuickView, onAddToCart, onToggleWishlist, isWishlisted }) {
  return (
    <div className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden cursor-pointer" onClick={onSelect}>
        <img
          src={product.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.discount_percent > 0 && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
              {product.discount_percent}% OFF
            </span>
          )}
          {product.is_featured === 1 && (
            <span className="bg-stone-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
              FEATURED
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md shadow-sm transition-colors ${
            isWishlisted ? 'bg-rose-50 text-rose-500' : 'bg-white/80 hover:bg-white text-stone-600 hover:text-stone-900'
          }`}
          title="Wishlist"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Quick View Floating Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onQuickView(); }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-md hover:bg-white text-stone-900 text-[11px] font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap"
        >
          <Eye className="w-3.5 h-3.5" /> Quick View
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-mono tracking-widest text-teal-700 uppercase font-bold">{product.brand}</span>
            <div className="flex items-center text-amber-500 text-[11px] font-bold">
              <Star className="w-3 h-3 fill-current mr-0.5" />
              <span>{product.rating}</span>
            </div>
          </div>
          <h3
            onClick={onSelect}
            className="text-xs font-semibold text-stone-900 mt-1 cursor-pointer line-clamp-1 hover:text-teal-700 transition-colors"
          >
            {product.name}
          </h3>
          <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">{product.highlights || product.description}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-heading font-bold text-stone-900">{formatINR(product.price_paise)}</span>
              {product.original_price_paise > product.price_paise && (
                <span className="text-[10px] text-stone-400 line-through">{formatINR(product.original_price_paise)}</span>
              )}
            </div>
            <span className="text-[9px] text-stone-400 block -mt-0.5">Incl. 18% GST</span>
          </div>
          <button
            onClick={onAddToCart}
            className="p-2 bg-stone-900 hover:bg-teal-700 text-white rounded-lg transition-colors shadow-sm"
            title="Add to Cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CATALOG & FILTERING PAGE
// -----------------------------------------------------------------------------
function CatalogPage({ categories, selectedCategory, onSelectCategory, searchQuery, onClearSearch, onSelectProduct, onQuickView, onAddToCart, onToggleWishlist, wishlist }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [brandFilter, setBrandFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [ratingFilter, setRatingFilter] = useState('');

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (brandFilter) params.append('brand', brandFilter);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      if (inStockOnly) params.append('in_stock', 'true');
      if (sortBy) params.append('sort', sortBy);
      if (ratingFilter) params.append('rating', ratingFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/products?${params.toString()}`).then(r => r.json());
      if (res.products) setProducts(res.products);
    } catch (e) {
      console.warn('Catalog fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [selectedCategory, brandFilter, minPrice, maxPrice, inStockOnly, sortBy, ratingFilter, searchQuery]);

  const clearAllFilters = () => {
    onSelectCategory(null);
    setBrandFilter('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setRatingFilter('');
    onClearSearch();
  };

  const hasActiveFilters = Boolean(selectedCategory || brandFilter || minPrice || maxPrice || inStockOnly || ratingFilter || searchQuery);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-stone-900 capitalize">
            {selectedCategory ? `${selectedCategory.replace('-', ' ')} Collection` : 'All Products Catalog'}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Displaying {products.length} curated creations ready for India dispatch.
          </p>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500 font-medium">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-stone-200 text-stone-900 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer"
          >
            <option value="featured">Featured & Trending</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Customer Rating</option>
            <option value="discount">Biggest Discount</option>
            <option value="newest">Newest Releases</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 py-4">
          <span className="text-xs text-stone-500 font-medium mr-1">Active filters:</span>
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-200 text-stone-800 text-xs rounded-full font-medium">
              Category: {selectedCategory}
              <button onClick={() => onSelectCategory(null)}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {brandFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-200 text-stone-800 text-xs rounded-full font-medium">
              Brand: {brandFilter}
              <button onClick={() => setBrandFilter('')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {inStockOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-200 text-stone-800 text-xs rounded-full font-medium">
              In Stock Only
              <button onClick={() => setInStockOnly(false)}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-200 text-stone-800 text-xs rounded-full font-medium">
              Query: "{searchQuery}"
              <button onClick={onClearSearch}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-teal-700 hover:text-teal-900 font-semibold ml-2 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Grid & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
        {/* Sidebar Filters */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="text-xs font-mono font-bold tracking-widest text-stone-900 uppercase flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" /> Filters
              </span>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-[11px] text-stone-400 hover:text-stone-700">
                  Reset
                </button>
              )}
            </div>

            {/* Category Picker */}
            <div>
              <h4 className="text-xs font-bold text-stone-900 mb-2.5">Category</h4>
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => onSelectCategory(null)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${!selectedCategory ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:bg-stone-50'}`}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.slug)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors capitalize ${selectedCategory === cat.slug ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-900 mb-2.5">Price Range (₹)</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>
            </div>

            {/* In-Stock Toggle */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <label htmlFor="inStock" className="text-xs font-bold text-stone-900 cursor-pointer">In-Stock Only</label>
              <input
                id="inStock"
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-stone-900 focus:ring-stone-900 border-stone-300 cursor-pointer"
              />
            </div>

            {/* Minimum Rating Filter */}
            <div className="pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-900 mb-2.5">Minimum Rating</h4>
              <div className="space-y-1 text-xs">
                {[4.5, 4.0, 3.5].map(stars => (
                  <button
                    key={stars}
                    onClick={() => setRatingFilter(ratingFilter === String(stars) ? '' : String(stars))}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${ratingFilter === String(stars) ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200' : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {stars}★ & above
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-stone-200 p-4" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-stone-900">No products match your criteria</h3>
              <p className="text-xs text-stone-500 mt-1">Try broadening your filters or clearing search terms.</p>
              <button
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => onSelectProduct(product.slug)}
                  onQuickView={() => onQuickView(product)}
                  onAddToCart={() => onAddToCart(product.id)}
                  onToggleWishlist={() => onToggleWishlist(product.id)}
                  isWishlisted={wishlist.some(w => w.id === product.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PRODUCT DETAIL VIEW (PDP)
// -----------------------------------------------------------------------------
function ProductDetailPage({ slug, onAddToCart, onBuyNow, onToggleWishlist, isWishlisted, onSelectProduct, token, showToast }) {
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Pincode Checker State
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState(null);
  const [checkingPincode, setCheckingPincode] = useState(false);

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${slug}`).then(r => r.json());
      if (res.product) {
        setProductData(res.product);
        if (res.product.variants && res.product.variants.length > 0) {
          setSelectedVariant(res.product.variants[0]);
        }
      }
    } catch (e) {
      console.warn('PDP fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    window.scrollTo(0, 0);
  }, [slug]);

  const handleCheckPincode = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      showToast('Please enter a valid 6-digit Indian PIN code', 'error');
      return;
    }
    setCheckingPincode(true);
    try {
      const res = await fetch(`/api/shipping/check-pincode/${pincode}`).then(r => r.json());
      setPincodeStatus(res);
    } catch {
      showToast('Could not verify PIN code serviceability', 'error');
    } finally {
      setCheckingPincode(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) {
      showToast('Name and review text are required', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product_id: productData.id,
          user_name: reviewName,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment
        })
      });
      showToast('Review submitted! Thank you for your feedback.');
      setReviewComment('');
      setReviewTitle('');
      fetchProduct();
    } catch {
      showToast('Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-stone-500">Loading creation specifications...</p>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-base font-bold text-stone-900">Creation not found</h2>
      </div>
    );
  }

  const currentPricePaise = selectedVariant ? selectedVariant.price_paise : productData.price_paise;
  const currentStock = selectedVariant ? selectedVariant.stock : productData.stock;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Breadcrumb */}
      <nav className="text-xs text-stone-500 flex items-center gap-2">
        <button onClick={() => window.location.reload()} className="hover:text-stone-900">Home</button>
        <ChevronRight className="w-3 h-3 text-stone-400" />
        <span className="capitalize">{productData.category_name}</span>
        <ChevronRight className="w-3 h-3 text-stone-400" />
        <span className="text-stone-900 font-semibold truncate">{productData.name}</span>
      </nav>

      {/* Main PDP Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Gallery & Zoom Showcase */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] bg-stone-100 rounded-2xl overflow-hidden border border-stone-200">
            <img
              src={productData.images && productData.images.length > 0 ? productData.images[activeImageIndex].image_url : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000'}
              alt={productData.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
            {productData.discount_percent > 0 && (
              <span className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded shadow-md">
                {productData.discount_percent}% SAVINGS
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {productData.images && productData.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {productData.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    activeImageIndex === idx ? 'border-stone-900 ring-2 ring-stone-900/20' : 'border-stone-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Buy Box & Options */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-teal-700 uppercase">{productData.brand}</span>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-stone-900 tracking-tight mt-1 leading-snug">
              {productData.name}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center text-amber-500 text-xs font-bold">
                <Star className="w-4 h-4 fill-current mr-1" />
                <span>{productData.rating}</span>
              </div>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">
                {productData.review_count || productData.reviews?.length || 0} Verified Reviews
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs font-mono text-stone-400">SKU: {selectedVariant?.sku || productData.sku}</span>
            </div>
          </div>

          {/* Price Block */}
          <div className="p-4 bg-stone-100 rounded-2xl border border-stone-200/80">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-heading font-black text-stone-900">{formatINR(currentPricePaise)}</span>
              {productData.original_price_paise > currentPricePaise && (
                <span className="text-sm text-stone-400 line-through">{formatINR(productData.original_price_paise)}</span>
              )}
              {productData.discount_percent > 0 && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Save {productData.discount_percent}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Inclusive of all Indian taxes (18% GST itemized on invoice).</p>
          </div>

          {/* Variants Selector */}
          {productData.variants && productData.variants.length > 0 && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-stone-900">Select Edition / Variant:</label>
              <div className="flex flex-wrap gap-2">
                {productData.variants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedVariant?.id === variant.id
                        ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {variant.title} • {formatINR(variant.price_paise)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Alert */}
          <div className="flex items-center gap-2 text-xs">
            {currentStock > 10 ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> In Stock for immediate dispatch
              </span>
            ) : currentStock > 0 ? (
              <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Only {currentStock} units left in stock!
              </span>
            ) : (
              <span className="text-rose-600 font-semibold">Out of Stock</span>
            )}
          </div>

          {/* Quantity & Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-stone-200 rounded-xl bg-white p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 text-xs font-mono font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => onAddToCart(productData.id, selectedVariant?.id, quantity)}
                disabled={currentStock <= 0}
                className="flex-1 py-3.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Add to Shopping Bag
              </button>

              <button
                onClick={() => onToggleWishlist(productData.id)}
                className={`p-3.5 rounded-xl border border-stone-200 transition-colors ${
                  isWishlisted ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-white hover:bg-stone-50 text-stone-600'
                }`}
                title="Save to Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              onClick={() => onBuyNow(productData.id, selectedVariant?.id, quantity)}
              disabled={currentStock <= 0}
              className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              Buy Now with 1-Click Checkout
            </button>
          </div>

          {/* Delivery Availability Checker (Pincode) */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2.5">
            <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-700" /> Check Doorstep Delivery Serviceability:
            </label>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit Indian PIN (e.g. 560038)"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono"
              />
              <button
                type="submit"
                disabled={checkingPincode}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
              >
                {checkingPincode ? 'Checking...' : 'Check'}
              </button>
            </form>

            {pincodeStatus && (
              <div className={`p-3 rounded-lg text-xs mt-2 ${pincodeStatus.serviceable ? 'bg-teal-50 text-teal-900 border border-teal-200' : 'bg-rose-50 text-rose-900'}`}>
                <p className="font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                  {pincodeStatus.message}
                </p>
                <div className="mt-1 text-[11px] text-teal-800 space-x-3">
                  <span>Transit: {pincodeStatus.estimated_days} Days</span>
                  <span>•</span>
                  <span>COD: {pincodeStatus.cod_available ? 'Available' : 'Prepaid Only'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Product Specifications Table */}
          {productData.specifications && Object.keys(productData.specifications).length > 0 && (
            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
              <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 font-bold text-xs text-stone-900">
                Technical Specifications
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(productData.specifications).map(([key, value], idx) => (
                    <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}>
                      <td className="px-4 py-2.5 font-medium text-stone-500 w-1/3 border-b border-stone-100">{key}</td>
                      <td className="px-4 py-2.5 font-semibold text-stone-900 border-b border-stone-100">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews & Feedback Section */}
      <section className="pt-10 border-t border-stone-200 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-heading font-black text-stone-900">Verified Client Reviews</h3>
            <p className="text-xs text-stone-500 mt-0.5">Real feedback from authenticated purchases across India.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Write a Review Form */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono">Write a Review</h4>
            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-5 h-5 ${star <= reviewRating ? 'fill-current' : 'text-stone-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">Review Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Outstanding acoustic separation"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">Detailed Review</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Share details regarding build quality, feel, and usage..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {submittingReview ? 'Submitting...' : 'Post Review'}
              </button>
            </form>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            {productData.reviews && productData.reviews.length > 0 ? (
              productData.reviews.map(rev => (
                <div key={rev.id} className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-stone-200'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">{rev.created_at?.split('T')[0] || 'Verified Purchase'}</span>
                  </div>
                  {rev.title && <h5 className="text-xs font-bold text-stone-900">{rev.title}</h5>}
                  <p className="text-xs text-stone-600 leading-relaxed">{rev.comment}</p>
                  <div className="pt-2 flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{rev.user_name} • Verified Indian Customer</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center">
                <p className="text-xs text-stone-500">No reviews yet. Be the first to share your experience with this creation.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CART FULL PAGE VIEW
// -----------------------------------------------------------------------------
function CartPage({ cart, onUpdateQty, onProceedCheckout, onContinueShopping }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl sm:text-3xl font-heading font-black text-stone-900 tracking-tight mb-8">
        Shopping Bag ({cart.count} items)
      </h1>

      {cart.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center max-w-lg mx-auto">
          <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-stone-900">Your bag is currently empty</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6">Discover artisanal apparel, studio acoustics, and gourmet provisions.</p>
          <button
            onClick={onContinueShopping}
            className="px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors shadow-md"
          >
            Explore Collections
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items Table */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map(item => (
              <div key={item.cart_item_id} className="bg-white p-5 rounded-2xl border border-stone-200 flex gap-5 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <img
                    src={item.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl bg-stone-100 flex-shrink-0"
                  />
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-teal-700 uppercase">{item.brand}</span>
                    <h3 className="text-xs font-semibold text-stone-900 mt-0.5">{item.name}</h3>
                    {item.variant_title && <p className="text-[11px] text-stone-500">{item.variant_title}</p>}
                    <span className="text-xs font-mono font-bold text-stone-900 block mt-1">
                      {formatINR(item.unit_price_paise)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Stepper */}
                  <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50">
                    <button
                      onClick={() => onUpdateQty(item.cart_item_id, item.quantity - 1)}
                      className="p-1.5 hover:bg-stone-200 text-stone-600 rounded-l-lg"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-mono font-bold">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQty(item.cart_item_id, item.quantity + 1)}
                      className="p-1.5 hover:bg-stone-200 text-stone-600 rounded-r-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-xs font-mono font-bold text-stone-900 w-24 text-right">
                    {formatINR(item.total_price_paise)}
                  </span>

                  <button
                    onClick={() => onUpdateQty(item.cart_item_id, 0)}
                    className="p-2 text-stone-400 hover:text-rose-500 rounded-full"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Box */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 h-fit space-y-4">
            <h3 className="text-sm font-bold text-stone-900 pb-3 border-b border-stone-100">Order Summary</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal ({cart.count} items)</span>
                <span className="font-mono font-bold text-stone-900">{formatINR(cart.subtotal_paise)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Estimated Shipping</span>
                <span className="font-medium text-emerald-700">
                  {cart.subtotal_paise >= 99900 ? 'FREE (Orders > ₹999)' : '₹99 standard'}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Included Indian GST (18%)</span>
                <span className="font-mono text-stone-500">
                  {formatINR(Math.round((cart.subtotal_paise * 18) / 118))}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-between items-baseline">
              <span className="text-sm font-bold text-stone-900">Total Payable</span>
              <span className="text-xl font-heading font-black text-stone-900">
                {formatINR(cart.subtotal_paise >= 99900 ? cart.subtotal_paise : cart.subtotal_paise + 9900)}
              </span>
            </div>

            <button
              onClick={onProceedCheckout}
              className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-4"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// CHECKOUT WORKFLOW VIEW
// -----------------------------------------------------------------------------
function CheckoutPage({ cart, user, token, sessionId, onOrderComplete, onBackToCart, showToast }) {
  // Stepper state
  const [customerName, setCustomerName] = useState(user?.name || 'Aarav Sharma');
  const [customerEmail, setCustomerEmail] = useState(user?.email || 'customer@demo.in');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+91 98111 22334');

  // Address
  const [street, setStreet] = useState('Flat 402, Prestige Tower, Indiranagar 100ft Rd');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('560038');

  // Coupon
  const [couponCode, setCouponCode] = useState('DEMO10');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // UPI, CARD, NETBANKING, COD
  const [upiId, setUpiId] = useState('aarav@okhdfcbank');

  // Quote State
  const [quote, setQuote] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Fetch true server quote
  const calculateQuote = async (couponToApply = couponCode) => {
    try {
      const itemsPayload = cart.items.map(it => ({
        product_id: it.product_id,
        variant_id: it.variant_id,
        quantity: it.quantity
      }));

      const res = await fetch('/api/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsPayload,
          coupon_code: couponToApply,
          pincode,
          payment_method: paymentMethod
        })
      }).then(r => r.json());

      if (res && res.total_paise !== undefined) {
        setQuote(res);
      }
    } catch (e) {
      console.warn('Quote error:', e);
    }
  };

  useEffect(() => {
    if (cart.items.length > 0) calculateQuote();
  }, [cart, paymentMethod]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode) return;
    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal_paise: cart.subtotal_paise })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Invalid coupon', 'error');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data);
        showToast(`Coupon applied! ${formatINR(data.discount_paise)} saved`);
        calculateQuote(data.code);
      }
    } catch {
      showToast('Coupon check failed', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!customerName || !customerEmail || !street || !city || !state || !pincode) {
      showToast('Please fill all customer and shipping fields', 'error');
      return;
    }

    setPlacingOrder(true);
    try {
      const headers = { 'Content-Type': 'application/json', 'x-session-id': sessionId };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        customer: { name: customerName, email: customerEmail, phone: customerPhone },
        shipping_address: { recipient_name: customerName, street, city, state, pincode, phone: customerPhone },
        items: cart.items.map(it => ({ product_id: it.product_id, variant_id: it.variant_id, quantity: it.quantity })),
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        payment_method: paymentMethod
      };

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Order placement failed', 'error');
        setPlacingOrder(false);
        return;
      }

      // If Razorpay test flow, simulate instant server verification
      if (paymentMethod !== 'COD') {
        await fetch('/api/payments/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_number: data.order.order_number,
            razorpay_payment_id: data.order.transaction_ref,
            razorpay_signature: 'sig_verified_mock_test'
          })
        });
      }

      setConfirmedOrder(data.order);
      onOrderComplete(data.order);
    } catch (e) {
      showToast('Order processing exception', 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-black text-stone-900">
          Order Confirmed & Placed!
        </h1>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          Thank you, <span className="font-bold text-stone-900">{customerName}</span>. Your order <span className="font-mono font-bold text-teal-700">{confirmedOrder.order_number}</span> has been securely logged and dispatched to Delhivery Express.
        </p>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 text-left space-y-3 text-xs max-w-md mx-auto shadow-sm">
          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">Order Reference</span>
            <span className="font-mono font-bold text-stone-900">{confirmedOrder.order_number}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">Payment Method</span>
            <span className="font-bold text-stone-900">{confirmedOrder.payment_method}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">Payment Status</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">{confirmedOrder.payment_status}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-stone-500">Total Charged</span>
            <span className="font-mono font-black text-stone-900 text-sm">{formatINR(confirmedOrder.total_paise)}</span>
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-semibold"
          >
            Print Tax Invoice
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-2 mb-8">
        <button onClick={onBackToCart} className="text-xs text-stone-500 hover:text-stone-900 font-semibold">
          ← Back to Bag
        </button>
        <span className="text-stone-300">/</span>
        <h1 className="text-xl font-heading font-black text-stone-900">Secure Express Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left 2 Cols: Form Sections */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Customer Information */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-widest text-stone-900 uppercase flex items-center gap-2">
              <span className="w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
              Customer Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 font-medium"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 font-medium"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">Indian Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. Delivery Address */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-widest text-stone-900 uppercase flex items-center gap-2">
              <span className="w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
              Shipping & Delivery Address
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">Flat / Building / Street Address</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">PIN Code (6 Digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Payment Method */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-widest text-stone-900 uppercase flex items-center gap-2">
              <span className="w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-[10px]">3</span>
              Payment Method (India Gateway)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'UPI', label: 'UPI / QR', desc: 'Google Pay, PhonePe', icon: DollarSign },
                { id: 'CARD', label: 'Cards', desc: 'RuPay, Visa, MC', icon: CreditCard },
                { id: 'NETBANKING', label: 'Net Banking', desc: 'HDFC, SBI, ICICI', icon: Banknote },
                { id: 'COD', label: 'Cash on Delivery', desc: '+₹49 Handling', icon: Truck }
              ].map(method => (
                <button
                  type="button"
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    paymentMethod === method.id
                      ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                      : 'border-stone-200 bg-stone-50 hover:bg-white text-stone-700'
                  }`}
                >
                  <method.icon className="w-5 h-5 mb-2" />
                  <h4 className="text-xs font-bold leading-tight">{method.label}</h4>
                  <p className="text-[10px] opacity-75 mt-0.5">{method.desc}</p>
                </button>
              ))}
            </div>

            {paymentMethod === 'UPI' && (
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <label className="text-[11px] font-bold text-stone-700">Enter Virtual Payment Address (UPI ID):</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
                <p className="text-[10px] text-stone-500">Test mode will simulate successful Razorpay UPI authorization.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Summary & Place Order */}
        <div className="space-y-6">
          {/* Coupon Input */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-stone-900 uppercase">Apply Promo Coupon</span>
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. DEMO10, FIRST500"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              <button
                type="submit"
                disabled={validatingCoupon}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold"
              >
                {validatingCoupon ? 'Checking...' : 'Apply'}
              </button>
            </form>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setCouponCode('DEMO10'); calculateQuote('DEMO10'); }} className="text-[10px] font-mono bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded text-stone-600">DEMO10 (10% off)</button>
              <button type="button" onClick={() => { setCouponCode('FIRST500'); calculateQuote('FIRST500'); }} className="text-[10px] font-mono bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded text-stone-600">FIRST500 (₹500 off)</button>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4 shadow-sm">
            <h3 className="text-xs font-mono font-bold tracking-widest text-stone-900 uppercase pb-2 border-b border-stone-100">
              Verified Order Breakdown
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal</span>
                <span className="font-mono font-bold text-stone-900">{formatINR(quote?.subtotal_paise || cart.subtotal_paise)}</span>
              </div>
              {quote?.discount_paise > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount</span>
                  <span className="font-mono">-{formatINR(quote.discount_paise)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>GST (18% itemized)</span>
                <span className="font-mono text-stone-500">{formatINR(quote?.tax_paise || 0)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping Fee</span>
                <span className="font-mono text-stone-900">
                  {quote?.shipping_fee_paise === 0 ? 'FREE' : formatINR(quote?.shipping_fee_paise || 0)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-between items-baseline">
              <span className="text-sm font-bold text-stone-900">Final Total</span>
              <span className="text-xl font-heading font-black text-stone-900">
                {formatINR(quote?.total_paise || cart.subtotal_paise)}
              </span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placingOrder}
              className="w-full py-4 bg-teal-700 hover:bg-teal-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
            >
              {placingOrder ? (
                <>Processing Payment with Razorpay...</>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Confirm & Pay {formatINR(quote?.total_paise || cart.subtotal_paise)}
                </>
              )}
            </button>
            <p className="text-[10px] text-stone-400 text-center">256-Bit SSL Encrypted • Powered by Razorpay India</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CUSTOMER ACCOUNT & ORDERS VIEW
// -----------------------------------------------------------------------------
function AccountPage({ user, token, wishlist, onLogout, onSelectProduct, onAddToCart, showToast }) {
  const [activeTab, setActiveTab] = useState('orders'); // orders, addresses, wishlist, profile
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/my-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
      if (res.orders) setOrders(res.orders);
    } catch (e) {
      console.warn('Orders fetch error:', e);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
      if (res.addresses) setAddresses(res.addresses);
    } catch (e) {
      console.warn('Addresses fetch error:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchAddresses();
      setLoading(false);
    }
  }, [token]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, phone })
      }).then(r => r.json());
      showToast('Profile updated successfully');
    } catch {
      showToast('Update failed', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-stone-900 tracking-tight">
            Customer Account Sanctuary
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Logged in as <span className="font-semibold text-stone-800">{user?.name}</span> ({user?.email})
          </p>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-max"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 h-fit space-y-1">
          {[
            { id: 'orders', label: 'Order History', icon: Package },
            { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
            { id: 'wishlist', label: 'My Wishlist', icon: Heart },
            { id: 'profile', label: 'Profile Settings', icon: User }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-stone-900 mb-2">Past Purchases & Tracking</h3>
              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                  <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-xs text-stone-500">No orders placed yet.</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                      <div>
                        <span className="text-xs font-mono font-bold text-stone-900">{order.order_number}</span>
                        <p className="text-[10px] text-stone-400">Placed on {order.created_at?.split('T')[0]}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {order.order_status}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-stone-900">{formatINR(order.total_paise)}</span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2">
                      {order.items?.map(it => (
                        <div key={it.id} className="flex justify-between text-xs py-1">
                          <span className="text-stone-700">{it.product_name} x {it.quantity}</span>
                          <span className="font-mono text-stone-900">{formatINR(it.total_price_paise)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Delhivery Tracking Pill */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-teal-700" />
                        <span>Courier: {order.courier_name}</span>
                        {order.tracking_number && (
                          <span className="font-mono text-stone-800 font-semibold">({order.tracking_number})</span>
                        )}
                      </div>
                      <span className="text-emerald-700 font-semibold">Payment: {order.payment_status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-stone-900 mb-2">Saved Delivery Locations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map(addr => (
                  <div key={addr.id} className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-stone-900">{addr.label}</span>
                      {addr.is_default === 1 && (
                        <span className="text-[10px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded font-semibold">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-700 font-medium">{addr.recipient_name}</p>
                    <p className="text-xs text-stone-500">{addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>
                    <p className="text-xs text-stone-400 font-mono">Mobile: {addr.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-stone-900 mb-2">My Saved Wishlist ({wishlist.length})</h3>
              {wishlist.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                  <Heart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-xs text-stone-500">Your wishlist is empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {wishlist.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                      <img src={p.primary_image} alt="" className="w-full h-36 object-cover rounded-xl bg-stone-100" />
                      <h4 className="text-xs font-semibold text-stone-900 line-clamp-1">{p.name}</h4>
                      <p className="text-xs font-mono font-bold text-stone-900">{formatINR(p.price_paise)}</p>
                      <button
                        onClick={() => onAddToCart(p.id)}
                        className="w-full py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold"
                      >
                        Add to Bag
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white p-6 rounded-2xl border border-stone-200 max-w-lg space-y-4">
              <h3 className="text-sm font-bold text-stone-900">Personal Details</h3>
              <form onSubmit={handleProfileUpdate} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-xs text-stone-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold"
                >
                  Save Profile Changes
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// COMPLETE ADMIN DASHBOARD VIEW (RBAC)
// -----------------------------------------------------------------------------
function AdminDashboardPage({ user, token, onExitAdmin, showToast }) {
  const [adminTab, setAdminTab] = useState('overview'); // overview, products, orders, customers, inventory, coupons, settings
  const [metrics, setMetrics] = useState(null);
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [adminCoupons, setAdminCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Product Modal State
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdCatId, setNewProdCatId] = useState(1);
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdStock, setNewProdStock] = useState(25);
  const [newProdImg, setNewProdImg] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [metRes, prodRes, ordRes, custRes, coupRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }).then(r => r.json()),
        fetch('/api/admin/products', { headers }).then(r => r.json()),
        fetch('/api/admin/orders', { headers }).then(r => r.json()),
        fetch('/api/admin/customers', { headers }).then(r => r.json()),
        fetch('/api/admin/coupons', { headers }).then(r => r.json())
      ]);

      if (metRes.metrics) setMetrics(metRes.metrics);
      if (prodRes.products) setAdminProducts(prodRes.products);
      if (ordRes.orders) setAdminOrders(ordRes.orders);
      if (custRes.customers) setAdminCustomers(custRes.customers);
      if (coupRes.coupons) setAdminCoupons(coupRes.coupons);
    } catch (e) {
      console.warn('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [adminTab]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: newProdName,
          brand: newProdBrand,
          category_id: newProdCatId,
          price_rupees: newProdPrice,
          sku: newProdSku,
          stock: newProdStock,
          image_urls: [newProdImg]
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create product', 'error');
      } else {
        showToast('New product added to catalog');
        setNewProductOpen(false);
        fetchAdminData();
      }
    } catch {
      showToast('Product creation error', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ order_status: newStatus })
      });
      showToast(`Order status updated to ${newStatus}`);
      fetchAdminData();
    } catch {
      showToast('Status update failed', 'error');
    }
  };

  const handleProcessRefund = async (orderId) => {
    if (!confirm('Are you sure you want to process a full refund for this order?')) return;
    try {
      await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason: 'ADMIN_MANUAL_REFUND' })
      });
      showToast('Refund processed successfully');
      fetchAdminData();
    } catch {
      showToast('Refund failed', 'error');
    }
  };

  return (
    <div className="bg-stone-900 text-stone-100 min-h-screen">
      {/* Top Admin Navbar */}
      <div className="border-b border-stone-800 bg-stone-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 text-stone-950 rounded flex items-center justify-center font-heading font-black text-base">
            D
          </div>
          <div>
            <h2 className="text-sm font-heading font-bold text-white tracking-wide">
              DEMO Operations Console
            </h2>
            <span className="text-[10px] text-teal-400 font-mono">Role: {user?.role}</span>
          </div>
        </div>

        <button
          onClick={onExitAdmin}
          className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-stone-700"
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Return to Storefront
        </button>
      </div>

      <div className="flex">
        {/* Admin Navigation Sidebar */}
        <aside className="w-64 border-r border-stone-800 bg-stone-950 p-4 space-y-1.5 min-h-[calc(100vh-65px)]">
          {[
            { id: 'overview', label: 'Executive Analytics', icon: BarChart3 },
            { id: 'products', label: 'Product Catalog', icon: Box },
            { id: 'orders', label: 'Orders & Shipments', icon: Package },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'inventory', label: 'Inventory Ledger', icon: AlertTriangle },
            { id: 'coupons', label: 'Coupons & Marketing', icon: Tag },
            { id: 'settings', label: 'Store Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                adminTab === tab.id ? 'bg-teal-600 text-white' : 'text-stone-400 hover:bg-stone-900 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Admin Main Body */}
        <main className="flex-1 p-8 space-y-8 overflow-y-auto">
          {adminTab === 'overview' && metrics && (
            <div className="space-y-8">
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-2">
                  <span className="text-[11px] font-mono text-stone-400">Total Gross GMV</span>
                  <h3 className="text-2xl font-mono font-bold text-white">{formatINR(metrics.total_revenue_paise)}</h3>
                  <p className="text-[10px] text-teal-400">Aggregated paid orders</p>
                </div>
                <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-2">
                  <span className="text-[11px] font-mono text-stone-400">Orders Processed</span>
                  <h3 className="text-2xl font-mono font-bold text-white">{metrics.total_orders}</h3>
                  <p className="text-[10px] text-stone-400">100% database persisted</p>
                </div>
                <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-2">
                  <span className="text-[11px] font-mono text-stone-400">Active Customers</span>
                  <h3 className="text-2xl font-mono font-bold text-white">{metrics.total_customers}</h3>
                  <p className="text-[10px] text-stone-400">Verified account records</p>
                </div>
                <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-2">
                  <span className="text-[11px] font-mono text-stone-400">Low-Stock Watchlist</span>
                  <h3 className="text-2xl font-mono font-bold text-amber-400">{metrics.low_stock_products} items</h3>
                  <p className="text-[10px] text-amber-500">Requires restocking threshold</p>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
                <div className="p-5 border-b border-stone-800 font-bold text-xs text-stone-200 uppercase font-mono tracking-wider">
                  Recent Store Transactions
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-900 text-stone-400 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="px-5 py-3">Order Number</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Payment</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {metrics.recent_orders?.map(o => (
                      <tr key={o.id} className="hover:bg-stone-900/50">
                        <td className="px-5 py-3 font-mono font-bold text-teal-400">{o.order_number}</td>
                        <td className="px-5 py-3 text-stone-200">{o.customer_name}</td>
                        <td className="px-5 py-3 font-mono text-white">{formatINR(o.total_paise)}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {o.payment_status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-stone-200">
                            {o.order_status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-stone-500 font-mono">{o.created_at?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Product Catalog ({adminProducts.length} Active Items)</h3>
                <button
                  onClick={() => setNewProductOpen(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add New Creation
                </button>
              </div>

              <div className="bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-900 text-stone-400 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3">Brand</th>
                      <th className="px-5 py-3">Price</th>
                      <th className="px-5 py-3">Stock Units</th>
                      <th className="px-5 py-3">SKU</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {adminProducts.map(p => (
                      <tr key={p.id} className="hover:bg-stone-900/50">
                        <td className="px-5 py-3 text-white font-medium flex items-center gap-3">
                          <img src={p.primary_image} alt="" className="w-8 h-8 rounded object-cover bg-stone-800" />
                          <span className="line-clamp-1">{p.name}</span>
                        </td>
                        <td className="px-5 py-3 text-stone-400">{p.brand}</td>
                        <td className="px-5 py-3 font-mono text-white">{formatINR(p.price_paise)}</td>
                        <td className="px-5 py-3">
                          <span className={`font-mono font-bold ${p.stock <= 10 ? 'text-rose-400' : 'text-stone-300'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-stone-500">{p.sku}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400">
                            {p.is_active ? 'ACTIVE' : 'DRAFT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'orders' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white">Order Pipeline & Fulfillment ({adminOrders.length})</h3>
              <div className="bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-900 text-stone-400 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="px-5 py-3">Order Number</th>
                      <th className="px-5 py-3">Customer & Contact</th>
                      <th className="px-5 py-3">Total Amount</th>
                      <th className="px-5 py-3">Status Transition</th>
                      <th className="px-5 py-3">Tracking</th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {adminOrders.map(ord => (
                      <tr key={ord.id} className="hover:bg-stone-900/50">
                        <td className="px-5 py-3 font-mono font-bold text-teal-400">{ord.order_number}</td>
                        <td className="px-5 py-3 text-stone-300">
                          <p className="font-semibold text-white">{ord.customer_name}</p>
                          <p className="text-[10px] text-stone-500">{ord.customer_email}</p>
                        </td>
                        <td className="px-5 py-3 font-mono text-white">{formatINR(ord.total_paise)}</td>
                        <td className="px-5 py-3">
                          <select
                            value={ord.order_status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className="bg-stone-900 border border-stone-700 text-white text-[11px] rounded px-2 py-1 focus:outline-none"
                          >
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 font-mono text-stone-400 text-[11px]">
                          {ord.tracking_number || 'Pending Dispatch'}
                        </td>
                        <td className="px-5 py-3">
                          {ord.payment_status === 'PAID' && (
                            <button
                              onClick={() => handleProcessRefund(ord.id)}
                              className="text-[10px] bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-2 py-1 rounded font-mono"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'customers' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white">Registered Customer Database ({adminCustomers.length})</h3>
              <div className="bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-900 text-stone-400 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Phone</th>
                      <th className="px-5 py-3">Orders Placed</th>
                      <th className="px-5 py-3">Total Spend</th>
                      <th className="px-5 py-3">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {adminCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-stone-900/50">
                        <td className="px-5 py-3 font-medium text-white">{c.name}</td>
                        <td className="px-5 py-3 text-stone-400">{c.email}</td>
                        <td className="px-5 py-3 font-mono text-stone-500">{c.phone || 'N/A'}</td>
                        <td className="px-5 py-3 font-mono text-white">{c.order_count}</td>
                        <td className="px-5 py-3 font-mono text-teal-400">{formatINR(c.total_spent_paise)}</td>
                        <td className="px-5 py-3 font-mono text-stone-500">{c.created_at?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'inventory' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white">Real-Time Inventory Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminProducts.map(p => (
                  <div key={p.id} className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{p.name}</h4>
                      <p className="text-[10px] font-mono text-stone-400 mt-0.5">SKU: {p.sku}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                      p.stock <= 10 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-stone-900 text-stone-200'
                    }`}>
                      {p.stock} units
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'coupons' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white">Active Promo Coupons</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {adminCoupons.map(cp => (
                  <div key={cp.id} className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-2">
                    <span className="text-sm font-mono font-bold text-teal-400 tracking-wider">{cp.code}</span>
                    <p className="text-xs text-stone-300">{cp.description}</p>
                    <p className="text-[11px] text-stone-500 font-mono">
                      Type: {cp.discount_type} ({cp.discount_type === 'PERCENTAGE' ? `${cp.discount_value}%` : formatINR(cp.discount_value)})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'settings' && (
            <div className="bg-stone-950 p-6 rounded-2xl border border-stone-800 max-w-xl space-y-4">
              <h3 className="text-base font-bold text-white">Store Settings & GST Configuration</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-stone-400 block mb-1">Store Name</label>
                  <input type="text" readOnly value="DEMO" className="w-full bg-stone-900 border border-stone-800 p-2.5 rounded text-white font-mono" />
                </div>
                <div>
                  <label className="text-stone-400 block mb-1">Operating Currency</label>
                  <input type="text" readOnly value="INR (₹) - Indian Rupee" className="w-full bg-stone-900 border border-stone-800 p-2.5 rounded text-white font-mono" />
                </div>
                <div>
                  <label className="text-stone-400 block mb-1">Default GST Rate</label>
                  <input type="text" readOnly value="18% Standard GST" className="w-full bg-stone-900 border border-stone-800 p-2.5 rounded text-white font-mono" />
                </div>
                <div>
                  <label className="text-stone-400 block mb-1">Free Shipping Threshold</label>
                  <input type="text" readOnly value="₹999.00" className="w-full bg-stone-900 border border-stone-800 p-2.5 rounded text-white font-mono" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Product Modal */}
      {newProductOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setNewProductOpen(false)} />
          <div className="relative bg-stone-900 rounded-2xl max-w-md w-full p-6 border border-stone-700 z-10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Add New Product to Catalog</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="text-stone-400 block mb-1">Product Name</label>
                <input required type="text" value={newProdName} onChange={e => setNewProdName(e.target.value)} className="w-full bg-stone-800 border border-stone-700 p-2 rounded text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-stone-400 block mb-1">Brand Name</label>
                <input required type="text" value={newProdBrand} onChange={e => setNewProdBrand(e.target.value)} className="w-full bg-stone-800 border border-stone-700 p-2 rounded text-white focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-stone-400 block mb-1">Price (₹ INR)</label>
                  <input required type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} className="w-full bg-stone-800 border border-stone-700 p-2 rounded text-white focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="text-stone-400 block mb-1">Stock Count</label>
                  <input required type="number" value={newProdStock} onChange={e => setNewProdStock(e.target.value)} className="w-full bg-stone-800 border border-stone-700 p-2 rounded text-white focus:outline-none font-mono" />
                </div>
              </div>
              <div>
                <label className="text-stone-400 block mb-1">SKU</label>
                <input required type="text" value={newProdSku} onChange={e => setNewProdSku(e.target.value)} className="w-full bg-stone-800 border border-stone-700 p-2 rounded text-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="text-stone-400 block mb-1">Image URL</label>
                <input required type="url" value={newProdImg} onChange={e => setNewProdImg(e.target.value)} placeholder="https://..." className="w-full bg-stone-800 border border-stone-700 p-2 rounded text-white focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setNewProductOpen(false)} className="px-4 py-2 border border-stone-700 text-stone-300 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// AUTH MODAL COMPONENT
// -----------------------------------------------------------------------------
function AuthModal({ mode, onSwitchMode, onClose, onSuccess, showToast }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login' ? { email, password } : { name, email, password, phone };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Authentication failed', 'error');
      } else {
        onSuccess(data.user, data.token);
      }
    } catch {
      showToast('Authentication network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl z-10 space-y-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-10 h-10 bg-stone-900 text-white rounded-lg flex items-center justify-center font-heading font-black text-xl mx-auto mb-2">
            D
          </div>
          <h2 className="text-xl font-heading font-black text-stone-900">
            {mode === 'login' ? 'Sign In to DEMO' : 'Create Customer Account'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {mode === 'login' ? 'Access your orders, wishlist, and express checkout' : 'Join India’s premier destination for curated living'}
          </p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="p-3 bg-stone-100 rounded-xl space-y-2 border border-stone-200">
          <span className="text-[10px] font-mono uppercase text-stone-500 block font-bold">1-Click Demo Accounts:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEmail('customer@demo.in'); setPassword('Customer@12345'); }}
              className="flex-1 py-1 bg-white hover:bg-stone-50 text-stone-800 rounded border border-stone-200 text-[11px] font-semibold"
            >
              Demo Customer
            </button>
            <button
              type="button"
              onClick={() => { setEmail('admin@demo.in'); setPassword('Admin@12345'); }}
              className="flex-1 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded text-[11px] font-semibold"
            >
              Super Admin
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-medium text-stone-600 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
          )}
          <div>
            <label className="text-[11px] font-medium text-stone-600 block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-stone-600 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono"
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-medium text-stone-600 block mb-1">Phone Number (+91)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md mt-2"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center text-xs text-stone-500 pt-2 border-t border-stone-100">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button onClick={() => onSwitchMode('register')} className="font-bold text-stone-900 underline">
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button onClick={() => onSwitchMode('login')} className="font-bold text-stone-900 underline">
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// INFORMATIONAL & LEGAL STATIC PAGES
// -----------------------------------------------------------------------------
function AboutUsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-6">
      <span className="text-xs font-mono font-bold tracking-widest text-teal-700 uppercase">OUR PHILOSOPHY</span>
      <h1 className="text-3xl font-heading font-black text-stone-900 tracking-tight">The Story Behind DEMO</h1>
      <p className="text-sm text-stone-700 leading-relaxed">
        DEMO was founded on a singular conviction: that Indian commerce should celebrate craftsmanship, rigorous engineering, and transparent sourcing. Rather than flood the market with disposable mass-produced commodities, we curate timeless essentials spanning acoustics, sartorial apparel, living sanctuaries, and unadulterated food provisions.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
        <div className="p-6 bg-white rounded-2xl border border-stone-200 space-y-2">
          <h3 className="text-xs font-bold text-stone-900 uppercase font-mono">Precision Materials</h3>
          <p className="text-xs text-stone-600">From Grade 5 titanium mechanical chassis to 100% extra-fine 19.5 micron Australian Merino wool knitwear.</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-stone-200 space-y-2">
          <h3 className="text-xs font-bold text-stone-900 uppercase font-mono">Doorstep Pan-India Care</h3>
          <p className="text-xs text-stone-600">Every package leaves our central Bengaluru climate-controlled hub via express transit with real-time tracking.</p>
        </div>
      </div>
    </div>
  );
}

function ContactUsPage({ showToast }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });
      showToast('Support message dispatched. Our concierge team will reply within 4 hours.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      showToast('Failed to dispatch inquiry', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      <div>
        <span className="text-xs font-mono font-bold tracking-widest text-teal-700 uppercase">CLIENT CONCIERGE</span>
        <h1 className="text-3xl font-heading font-black text-stone-900 tracking-tight mt-1">Get in Touch</h1>
        <p className="text-xs text-stone-500 mt-1">We are here to assist with product specifications, orders, or custom gifting inquiries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-3.5 text-xs">
          <div>
            <label className="text-[11px] font-medium text-stone-600 block mb-1">Your Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-stone-900" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-stone-600 block mb-1">Your Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-stone-900" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-stone-600 block mb-1">Subject</label>
            <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-stone-900" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-stone-600 block mb-1">Message</label>
            <textarea rows={4} required value={message} onChange={e => setMessage(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-stone-900" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors">
            {loading ? 'Transmitting...' : 'Send Message'}
          </button>
        </form>

        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-stone-200 space-y-3 text-xs">
            <h4 className="font-bold text-stone-900 uppercase font-mono">Bengaluru Atelier Hub</h4>
            <p className="text-stone-600">Prestige Tech Park, Indiranagar 100ft Road, Bengaluru, Karnataka 560038</p>
            <p className="text-stone-600 font-mono">Email: support@demo.in</p>
            <p className="text-stone-600 font-mono">Phone: +91 98765 43210</p>
          </div>
          <div className="p-6 bg-stone-100 rounded-2xl border border-stone-200 text-xs text-stone-600 space-y-2">
            <h4 className="font-bold text-stone-900 uppercase font-mono">Concierge Hours</h4>
            <p>Monday through Saturday: 9:00 AM – 8:00 PM IST</p>
            <p>Closed Sundays & National Public Holidays</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqPage() {
  const faqs = [
    { q: 'How long does standard delivery take across India?', a: 'Metro cities (Bengaluru, Mumbai, Delhi, Chennai, Hyderabad) receive delivery within 24 to 48 hours. Tier 2 and Tier 3 cities take 3 to 4 business days via our courier partners (Delhivery Express).' },
    { q: 'Are all products authentic and covered under warranty?', a: 'Yes. 100% of our products are certified original and sourced directly from verified manufacturer ateliers. All electronics carry a minimum 2-year manufacturer warranty.' },
    { q: 'What is your 7-Day Easy Return Policy?', a: 'If you receive an item that is defective, damaged in transit, or not as described, initiate a return from your account dashboard within 7 days for a full refund or doorstep replacement.' },
    { q: 'Is Cash on Delivery (COD) supported?', a: 'Yes, Cash on Delivery is supported for over 19,000 Indian PIN codes up to order values of ₹15,000. A standard ₹49 handling fee applies to COD shipments.' },
    { q: 'Do you provide formal GST tax invoices for business claims?', a: 'Yes. Every order comes with an automated, downloadable GST tax invoice itemizing Central and State GST (18%) with our legal corporate GSTIN.' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      <div>
        <span className="text-xs font-mono font-bold tracking-widest text-teal-700 uppercase">HELP CENTER</span>
        <h1 className="text-3xl font-heading font-black text-stone-900 tracking-tight mt-1">Frequently Asked Questions</h1>
      </div>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-2">
            <h4 className="text-sm font-bold text-stone-900">{faq.q}</h4>
            <p className="text-xs text-stone-600 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShippingPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-6 text-xs text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-heading font-black text-stone-900 tracking-tight">Pan-India Shipping Policy</h1>
      <p>All orders placed on DEMO are fulfilled directly from our central climate-controlled facility in Bengaluru, Karnataka. We partner with Delhivery, Blue Dart, and India Post for nationwide coverage.</p>
      <h3 className="text-sm font-bold text-stone-900 font-mono uppercase mt-4">Shipping Charges</h3>
      <p>Orders totaling ₹999 or more receive complimentary standard surface or express air delivery. Orders under ₹999 incur a flat fee of ₹99.</p>
    </div>
  );
}

function ReturnsPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-6 text-xs text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-heading font-black text-stone-900 tracking-tight">7-Day Return & Refund Guarantee</h1>
      <p>We pride ourselves on flawless customer satisfaction. If you are not delighted with your creation, you may request a return or replacement within 7 calendar days of physical delivery.</p>
      <h3 className="text-sm font-bold text-stone-900 font-mono uppercase mt-4">Refund Method</h3>
      <p>Prepaid payments (UPI, Cards, Netbanking) are refunded directly to the original payment source within 3-5 business days upon item return receipt and quality inspection.</p>
    </div>
  );
}

function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-6 text-xs text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-heading font-black text-stone-900 tracking-tight">Privacy Policy</h1>
      <p>DEMO is committed to protecting your personal data in compliance with the Digital Personal Data Protection Act (DPDP), 2023. We never sell, rent, or lease your private personal details to third-party advertising brokers.</p>
    </div>
  );
}

function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-6 text-xs text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-heading font-black text-stone-900 tracking-tight">Terms & Conditions of Service</h1>
      <p>By accessing and purchasing goods on DEMO, you acknowledge and agree to abide by all commercial conditions, intellectual property covenants, and dispute jurisdictions governed by the courts of Bengaluru, Karnataka, India.</p>
    </div>
  );
}
