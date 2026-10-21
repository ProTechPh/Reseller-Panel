'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, CheckCircle, AlertCircle, X, Wallet, Copy, Check, Info,
  Search, Send, Zap, Heart, User, ChevronDown, ChevronUp, Layers, CheckSquare, Square,
  Gamepad2, Sparkles, SlidersHorizontal, ArrowUpDown
} from 'lucide-react';
import Modal from '@/components/Modal';
import ProductImage from '@/components/ProductImage';

interface PriceOption {
  duration: string;
  price: number;
}

interface ProductType {
  _id: string;
  name: string;
  description: string;
  image?: string;
  platform?: 'Android' | 'iOS' | 'PC';
  prices: PriceOption[];
  deliveryType?: 'instant' | 'telegram';
  telegramUsername?: string;
}

// Category filter chips (matching reference UI pill row)
const FILTER_CHIPS = [
  { id: 'all', label: 'All Games' },
  { id: 'codm', label: 'CODM' },
  { id: 'dfm', label: 'Delta Force' },
  { id: 'pubg', label: 'PUBG' },
  { id: '8ball', label: '8-Ball' },
  { id: 'ghosst', label: 'Ghosst' },
  { id: 'mlbb', label: 'MLBB' },
  { id: 'bloodstrike', label: 'Blood Strike' },
];

function detectPlatform(prod: ProductType): 'Android' | 'iOS' | 'PC' {
  if (prod.platform) return prod.platform;
  const text = (prod.name + ' ' + (prod.description || '')).toLowerCase();
  if (text.includes('ios') || text.includes('iphone') || text.includes('ipad')) return 'iOS';
  if (text.includes('android') || text.includes('apk') || text.includes('root')) return 'Android';
  if (text.includes('pc') || text.includes('windows') || text.includes('steam')) return 'PC';
  if (text.includes('codm') || text.includes('dfm') || text.includes('pubg') || text.includes('8ball')) return 'Android';
  return 'PC';
}

function getThumbnail(prod: ProductType): string {
  if (prod.image && prod.image.trim()) return prod.image;
  const name = prod.name.toLowerCase();
  if (name.includes('codm') || name.includes('call of duty')) return '/images/codm.png';
  if (name.includes('dfm') || name.includes('delta')) return '/images/deltaforcemobile.png';
  if (name.includes('pubg')) return '/images/pubg.png';
  if (name.includes('8ball') || name.includes('pool')) return '/images/8ballpool.png';
  if (name.includes('ghosst')) return '/images/Ghosst.png';
  return '/images/logo.png';
}

export default function ResellerProducts() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [balance, setBalance] = useState(0);
  const [username, setUsername] = useState('');
  const [resellerType, setResellerType] = useState<'budget' | 'unlimited'>('budget');
  const [stock, setStock] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');

  // Sidebar Filter Checkboxes
  const [platformFilters, setPlatformFilters] = useState<string[]>([]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [instantDeliveryOnly, setInstantDeliveryOnly] = useState(false);

  // Accordion Toggle States
  const [platformAccordionOpen, setPlatformAccordionOpen] = useState(true);
  const [deliveryAccordionOpen, setDeliveryAccordionOpen] = useState(true);

  // Favorites state (stored in local state)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Purchase Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [successKey, setSuccessKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Balance Top-up Modal State
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, meRes, stockRes] = await Promise.all([
        fetch('/api/reseller/products'),
        fetch('/api/auth/me'),
        fetch('/api/reseller/products/stock')
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success) {
          setProducts(prodData.products);
          if (prodData.resellerType) setResellerType(prodData.resellerType);
        }
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success) {
          setBalance(meData.user.balance || 0);
          if (meData.user.username) setUsername(meData.user.username);
          if (meData.user.resellerType) setResellerType(meData.user.resellerType);
        }
      }

      if (stockRes.ok) {
        const stockData = await stockRes.json();
        if (stockData.success) setStock(stockData.stock);
      }
    } catch (err) {
      console.error('Failed to load catalog data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStockCount = (productId: string, duration: string): number => {
    return stock[productId]?.[duration] || 0;
  };

  const getTotalProductStock = (productId: string): number => {
    if (!stock[productId]) return 0;
    return Object.values(stock[productId]).reduce((sum, c) => sum + c, 0);
  };

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const togglePlatformFilter = (plat: string) => {
    setPlatformFilters(prev => 
      prev.includes(plat) ? prev.filter(p => p !== plat) : [...prev, plat]
    );
  };

  // Open Buy Modal with first duration pre-selected
  const handleOpenBuy = (product: ProductType) => {
    setSelectedProduct(product);
    const firstInStock = product.prices.find(p => getStockCount(product._id, p.duration) > 0);
    setSelectedDuration(firstInStock ? firstInStock.duration : (product.prices[0]?.duration || ''));
    setPurchaseError(null);
    setSuccessKey(null);
    setCopiedKey(false);
  };

  const closePurchaseModal = () => {
    setSelectedProduct(null);
    setSelectedDuration('');
    setPurchaseError(null);
    setSuccessKey(null);
  };

  const getSelectedPrice = (): number => {
    if (!selectedProduct || !selectedDuration) return 0;
    const option = selectedProduct.prices.find((p) => p.duration === selectedDuration);
    return option ? option.price : 0;
  };

  const handleConfirmPurchase = async () => {
    if (!selectedProduct || !selectedDuration) return;

    const price = getSelectedPrice();
    if (resellerType !== 'unlimited' && balance < price) {
      setPurchaseError('Insufficient balance to complete purchase.');
      return;
    }

    const availableStock = getStockCount(selectedProduct._id, selectedDuration);
    if (availableStock <= 0) {
      setPurchaseError('Out of stock for this duration.');
      return;
    }

    setPurchasing(true);
    setPurchaseError(null);

    try {
      const res = await fetch('/api/reseller/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct._id,
          duration: selectedDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete purchase.');
      }

      if (data.success && (data.licenseKey || data.key)) {
        const keyVal = typeof data.licenseKey === 'string'
          ? data.licenseKey
          : data.licenseKey?.key || data.key;
        setSuccessKey(keyVal);
        setBalance(data.newBalance);

        // Auto copy to clipboard for convenience
        if (keyVal && navigator?.clipboard?.writeText) {
          navigator.clipboard.writeText(keyVal).catch(() => {});
        }

        // Refresh stock
        const stockRes = await fetch('/api/reseller/products/stock');
        if (stockRes.ok) {
          const stockData = await stockRes.json();
          if (stockData.success) setStock(stockData.stock);
        }

        window.dispatchEvent(new Event('balance-update'));
      }
    } catch (err: any) {
      setPurchaseError(err.message || 'Error processing purchase.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleCopySuccessKey = () => {
    if (!successKey) return;
    navigator.clipboard.writeText(successKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((prod) => {
        const text = (prod.name + ' ' + (prod.description || '')).toLowerCase();
        const plat = detectPlatform(prod);
        const totalStock = getTotalProductStock(prod._id);

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          if (!text.includes(q)) return false;
        }

        // Horizontal Category Chip
        if (activeChip !== 'all') {
          if (!text.includes(activeChip)) return false;
        }

        // Platform Checkbox Filter
        if (platformFilters.length > 0) {
          if (!platformFilters.includes(plat)) return false;
        }

        // In Stock Only
        if (onlyInStock && prod.deliveryType !== 'telegram') {
          if (totalStock <= 0) return false;
        }

        // Instant Delivery Only
        if (instantDeliveryOnly) {
          if (prod.deliveryType === 'telegram') return false;
        }

        return true;
      })
      .sort((a, b) => {
        const lowestA = [...a.prices].sort((x, y) => x.price - y.price)[0]?.price || 0;
        const lowestB = [...b.prices].sort((x, y) => x.price - y.price)[0]?.price || 0;
        if (sortBy === 'price-asc') return lowestA - lowestB;
        if (sortBy === 'price-desc') return lowestB - lowestA;
        return 0; // default order
      });
  }, [products, searchQuery, activeChip, platformFilters, onlyInStock, instantDeliveryOnly, sortBy]);

  const selectedPrice = getSelectedPrice();
  const remainingBalance = balance - selectedPrice;
  const isBalanceSufficient = resellerType === 'unlimited' ? true : remainingBalance >= 0;
  const currentItemStock = selectedProduct && selectedDuration ? getStockCount(selectedProduct._id, selectedDuration) : 0;
  const isStockAvailable = currentItemStock > 0;

  return (
    <div className="play-catalog-root animate-fade-in">

      {/* Main Game Catalog Window Container */}
      <div className="play-window">

        {/* 1. TOP NAVIGATION BAR */}
        <header className="play-topbar">
          <div className="play-topbar-left">
            <div className="play-logo-icon" title="Sylvie Reseller Hub">
              <Sparkles size={20} />
            </div>

            <nav className="play-nav-links">
              <button type="button" className="play-nav-tab active">
                Catalog
              </button>
              <Link href="/reseller/keys" className="play-nav-tab" style={{ textDecoration: 'none' }}>
                My Vault
              </Link>
              <button type="button" onClick={() => setBalanceModalOpen(true)} className="play-nav-tab">
                Top Up
              </button>
            </nav>
          </div>

          <div className="play-topbar-right">
            {/* Pill Search Bar */}
            <div className="play-search-pill">
              <input
                type="text"
                className="play-search-input"
                placeholder="Search games, packages, keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#938ab8', cursor: 'pointer' }}
                >
                  <X size={15} />
                </button>
              ) : (
                <Search size={16} color="#938ab8" />
              )}
            </div>

            {/* Circular Action Buttons */}
            <button
              type="button"
              className="play-circle-btn"
              title="Saved Items"
              onClick={() => alert('Saved items list is active.')}
            >
              <Heart size={16} />
            </button>

            <button
              type="button"
              className="play-circle-btn"
              title="User Account"
            >
              <User size={16} />
            </button>

            <button
              type="button"
              className="play-circle-btn highlight"
              onClick={() => setBalanceModalOpen(true)}
              title="Current Balance"
              style={{ padding: '0 12px', width: 'auto', borderRadius: '9999px', gap: '6px', fontSize: '0.78rem', fontWeight: 800 }}
            >
              <Wallet size={15} />
              <span>{resellerType === 'unlimited' ? '∞' : `₱${balance.toFixed(0)}`}</span>
            </button>
          </div>
        </header>

        {/* 2. SUBNAV: Breadcrumb + Filter Chips + Sorting Bar */}
        <section className="play-subnav-section">
          <div className="play-subnav-row1">
            <div className="play-breadcrumb">
              <span>Home</span>
              <span>&gt;</span>
              <span className="active">Game Catalog</span>
            </div>

            {/* Category Filter Chips */}
            <div className="play-filter-chips">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`play-pill-chip ${activeChip === chip.id ? 'active' : ''}`}
                  onClick={() => setActiveChip(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="play-subnav-row2">
            {/* Sorting Tabs */}
            <div className="play-sorter-tabs">
              <button
                type="button"
                className={`play-sorter-tab ${sortBy === 'popular' ? 'active' : ''}`}
                onClick={() => setSortBy('popular')}
              >
                By Popularity
              </button>
              <button
                type="button"
                className={`play-sorter-tab ${sortBy === 'price-asc' ? 'active' : ''}`}
                onClick={() => setSortBy('price-asc')}
              >
                Price: Low to High
              </button>
              <button
                type="button"
                className={`play-sorter-tab ${sortBy === 'price-desc' ? 'active' : ''}`}
                onClick={() => setSortBy('price-desc')}
              >
                Price: High to Low
              </button>
            </div>

            <span className="play-items-counter">
              {filteredProducts.length} items available
            </span>
          </div>
        </section>

        {/* 3. CATALOG MAIN BODY: Left Filter Sidebar + Right Cards Grid */}
        <div className="play-catalog-layout">

          {/* Left Sidebar Filters */}
          <aside className="play-sidebar">
            <h3 className="play-sidebar-title">Filters</h3>

            {/* Accordion: Platform & OS */}
            <div className="play-accordion">
              <button
                type="button"
                className="play-accordion-header"
                onClick={() => setPlatformAccordionOpen(!platformAccordionOpen)}
              >
                <span>Platform / Device</span>
                {platformAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {platformAccordionOpen && (
                <div className="play-accordion-body">
                  {[
                    { id: 'Android', label: 'Android' },
                    { id: 'iOS', label: 'iOS / Apple' },
                    { id: 'PC', label: 'Windows PC' },
                  ].map((plat) => {
                    const isChecked = platformFilters.includes(plat.id);
                    return (
                      <div
                        key={plat.id}
                        className="play-checkbox-label"
                        onClick={() => togglePlatformFilter(plat.id)}
                      >
                        <div className={`play-checkbox-box ${isChecked ? 'checked' : ''}`}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span>{plat.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Accordion: Availability & Delivery */}
            <div className="play-accordion">
              <button
                type="button"
                className="play-accordion-header"
                onClick={() => setDeliveryAccordionOpen(!deliveryAccordionOpen)}
              >
                <span>Delivery & Stock</span>
                {deliveryAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {deliveryAccordionOpen && (
                <div className="play-accordion-body">
                  <div
                    className="play-checkbox-label"
                    onClick={() => setOnlyInStock(!onlyInStock)}
                  >
                    <div className={`play-checkbox-box ${onlyInStock ? 'checked' : ''}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>In Stock Only</span>
                  </div>

                  <div
                    className="play-checkbox-label"
                    onClick={() => setInstantDeliveryOnly(!instantDeliveryOnly)}
                  >
                    <div className={`play-checkbox-box ${instantDeliveryOnly ? 'checked' : ''}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>Instant Key Delivery</span>
                  </div>
                </div>
              )}
            </div>

            {/* Reseller Wallet Box in Sidebar */}
            <div style={{
              background: '#201a3b',
              border: '1px solid rgba(144, 71, 255, 0.2)',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <span style={{ fontSize: '0.68rem', color: '#9d94c2', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                Reseller Wallet
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#10b981' }}>
                {resellerType === 'unlimited' ? '∞ Unlimited' : `₱${balance.toFixed(2)}`}
              </div>
              <button
                type="button"
                onClick={() => setBalanceModalOpen(true)}
                className="btn-play-buy"
                style={{ padding: '8px 10px', fontSize: '0.78rem' }}
              >
                <Wallet size={13} />
                <span>Add Funds</span>
              </button>
            </div>
          </aside>

          {/* Right Game Cards Grid */}
          <main className="play-grid">
            {loading ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderTopColor: '#9047ff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '80px 20px', textAlign: 'center', color: '#938ab8', background: '#201a3b', borderRadius: '18px' }}>
                <p>No games found matching your filter criteria.</p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const platform = detectPlatform(product);
                const thumbnail = getThumbnail(product);
                const isTg = product.deliveryType === 'telegram';
                const lowestPrice = [...product.prices].sort((a, b) => a.price - b.price)[0]?.price || 0;
                const oldPrice = lowestPrice > 0 ? (lowestPrice * 1.35).toFixed(0) : '0';
                const isFav = !!favorites[product._id];

                return (
                  <div key={product._id} className="play-card" onClick={() => handleOpenBuy(product)}>
                    <div>
                      {/* Portrait Poster Cover */}
                      <div className="play-card-media">
                        <ProductImage
                          src={thumbnail}
                          alt={product.name}
                          width={400}
                          height={530}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />

                        {/* Favorite Heart Button */}
                        <button
                          type="button"
                          className={`play-card-fav ${isFav ? 'active' : ''}`}
                          onClick={(e) => toggleFavorite(product._id, e)}
                          title="Save to favorites"
                        >
                          <Heart size={14} fill={isFav ? '#ffffff' : 'none'} />
                        </button>

                        {/* Platform Tag on Cover */}
                        <span className="play-card-platform">
                          {platform}
                        </span>

                        {/* Hover Quick Action Button (Like Dribbble Ref) */}
                        <div className="play-card-hover-action">
                          {isTg ? <Send size={13} /> : <Zap size={13} />}
                          <span>{isTg ? 'Order on TG' : 'Get License'}</span>
                        </div>
                      </div>

                      {/* Product Title */}
                      <h4 className="play-card-title" title={product.name}>
                        {product.name}
                      </h4>
                    </div>

                    {/* Pricing Row with Purple Discount Pill */}
                    <div>
                      <div className="play-card-price-row">
                        <div className="play-price-left">
                          <span className="play-price-old">₱{oldPrice}</span>
                          <span className="play-price-current">₱{lowestPrice.toFixed(0)}</span>
                        </div>
                        <span className="play-discount-badge">
                          {product.prices[0]?.duration || '-30%'}
                        </span>
                      </div>

                      {/* Mobile View Action Button */}
                      <div style={{ marginTop: '8px' }}>
                        {isTg ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenBuy(product); }}
                            className="btn-play-tg"
                          >
                            <Send size={13} />
                            <span>Order TG</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenBuy(product); }}
                            className="btn-play-buy"
                          >
                            <Zap size={13} />
                            <span>Buy Key</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </main>

        </div>
      </div>

      {/* 4. PURCHASE MODAL (Matching Purple Dribbble Theme) */}
      <Modal isOpen={!!selectedProduct} onClose={closePurchaseModal}>
        {selectedProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedProduct.deliveryType === 'telegram' ? (
              /* Telegram Direct Order Modal */
              <>
                <div className="modal-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                    <Send size={18} color="#9047ff" />
                    Order via Telegram
                  </h2>
                  <button onClick={closePurchaseModal} className="modal-close"><X size={18} /></button>
                </div>

                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedProduct.name}</div>
                  <p style={{ fontSize: '0.8rem', color: '#9d94c2', marginTop: '4px' }}>
                    {selectedProduct.description}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedProduct.prices.map((p) => (
                    <div
                      key={p.duration}
                      className={`play-accordion-header ${selectedDuration === p.duration ? 'active' : ''}`}
                      onClick={() => setSelectedDuration(p.duration)}
                      style={{
                        background: selectedDuration === p.duration ? 'rgba(144, 71, 255, 0.25)' : '#201a3b',
                        border: selectedDuration === p.duration ? '1px solid #9047ff' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{p.duration}</span>
                      <span style={{ fontWeight: 850, color: '#9047ff' }}>₱{p.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={`https://t.me/${(selectedProduct.telegramUsername || 'Sylvieofficeal').replace(/^@/, '')}?text=${encodeURIComponent(
                    `Hello Admin! I would like to order "${selectedProduct.name}" (${selectedDuration}) from the Reseller Panel.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-play-buy"
                  style={{ textDecoration: 'none', padding: '12px' }}
                >
                  <Send size={15} />
                  Chat on Telegram (@{(selectedProduct.telegramUsername || 'Sylvieofficeal').replace(/^@/, '')})
                </a>
              </>
            ) : !successKey ? (
              /* Phase 1: Pick Duration & 1-Tap Confirm */
              <>
                <div className="modal-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                    <Zap size={18} color="#9047ff" />
                    Purchase License Key
                  </h2>
                  <button onClick={closePurchaseModal} className="modal-close"><X size={18} /></button>
                </div>

                {purchaseError && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{purchaseError}</span>
                  </div>
                )}

                {/* Product Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#201a3b',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                }}>
                  <div style={{ width: '46px', height: '58px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#110d22' }}>
                    <ProductImage src={getThumbnail(selectedProduct)} alt={selectedProduct.name} width={92} height={116} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff' }}>{selectedProduct.name}</div>
                    <span className="play-discount-badge" style={{ display: 'inline-block', marginTop: '4px' }}>
                      {detectPlatform(selectedProduct)}
                    </span>
                  </div>
                </div>

                {/* Duration Picker Tiles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#9d94c2', fontWeight: 700 }}>Choose Plan Duration:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedProduct.prices.map((p) => {
                      const isSelected = selectedDuration === p.duration;
                      const stockCount = getStockCount(selectedProduct._id, p.duration);
                      const isOut = stockCount <= 0;

                      return (
                        <div
                          key={p.duration}
                          onClick={() => !isOut && setSelectedDuration(p.duration)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: isSelected ? 'rgba(144, 71, 255, 0.25)' : '#201a3b',
                            border: isSelected ? '1px solid #9047ff' : '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: isSelected ? '0 0 14px rgba(144, 71, 255, 0.25)' : 'none',
                            cursor: isOut ? 'not-allowed' : 'pointer',
                            opacity: isOut ? 0.45 : 1,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{p.duration}</span>
                            <div style={{ fontSize: '0.7rem', color: isOut ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                              {isOut ? 'Out of stock' : `${stockCount} available keys`}
                            </div>
                          </div>
                          <span style={{ fontWeight: 850, fontSize: '1.05rem', color: '#ffffff' }}>
                            ₱{p.price.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Balance Summary */}
                <div style={{
                  background: '#201a3b',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                }}>
                  <span style={{ color: '#9d94c2' }}>Your Available Balance:</span>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>
                    {resellerType === 'unlimited' ? '∞ Unlimited Tier' : `₱${balance.toFixed(2)}`}
                  </span>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  disabled={purchasing || !isBalanceSufficient || !isStockAvailable}
                  onClick={handleConfirmPurchase}
                  className="btn-play-buy"
                  style={{
                    padding: '13px',
                    fontSize: '0.95rem',
                    cursor: (purchasing || !isBalanceSufficient || !isStockAvailable) ? 'not-allowed' : 'pointer',
                    opacity: (purchasing || !isBalanceSufficient || !isStockAvailable) ? 0.5 : 1,
                  }}
                >
                  {purchasing ? 'Claiming Key...' : `Confirm Purchase (₱${selectedPrice.toFixed(2)})`}
                </button>
              </>
            ) : (
              /* Phase 2: Instant License Key Display */
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(144, 71, 255, 0.2)',
                  color: '#9047ff',
                  boxShadow: '0 0 20px rgba(144, 71, 255, 0.3)',
                  margin: '0 auto',
                }}>
                  <CheckCircle size={32} />
                </div>

                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 850 }}>Purchase Successful!</h2>
                  <p style={{ fontSize: '0.8rem', color: '#9d94c2', marginTop: '2px' }}>
                    {selectedProduct.name} &bull; {selectedDuration}
                  </p>
                </div>

                {/* Glowing Monospace Key Display */}
                <div style={{
                  background: '#110d22',
                  border: '1px solid rgba(144, 71, 255, 0.4)',
                  borderRadius: '14px',
                  padding: '16px',
                  boxShadow: '0 0 20px rgba(144, 71, 255, 0.2)',
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#9d94c2', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                    Your License Key
                  </span>
                  <code style={{
                    fontFamily: 'monospace',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    wordBreak: 'break-all',
                    display: 'block',
                  }}>
                    {successKey}
                  </code>
                </div>

                {/* 1-Tap Copy Key Button */}
                <button
                  type="button"
                  onClick={handleCopySuccessKey}
                  className="btn-play-buy"
                  style={{
                    padding: '13px',
                    fontSize: '0.95rem',
                    background: copiedKey ? '#059669' : '#9047ff',
                  }}
                >
                  {copiedKey ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copiedKey ? 'Copied to Clipboard!' : 'Copy License Key'}</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    href="/reseller/keys"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px', textAlign: 'center', textDecoration: 'none', fontSize: '0.82rem', borderRadius: '10px' }}
                  >
                    View in Vault
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closePurchaseModal}
                    style={{ flex: 1, padding: '10px', fontSize: '0.82rem', borderRadius: '10px' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 5. TOP UP MODAL */}
      <Modal isOpen={balanceModalOpen} onClose={() => setBalanceModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="modal-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={20} color="#9047ff" />
              Add Reseller Balance
            </h2>
            <button onClick={() => setBalanceModalOpen(false)} className="modal-close">
              <X size={18} />
            </button>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Balance</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 850, color: '#10b981', marginTop: '4px' }}>
              {resellerType === 'unlimited' ? '∞ Unlimited Tier' : `₱${balance.toFixed(2)}`}
            </div>
          </div>

          <div style={{
            background: 'rgba(144, 71, 255, 0.08)',
            border: '1px solid rgba(144, 71, 255, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}>
            <p style={{ margin: 0, color: '#ffffff' }}>
              To top up your reseller account balance using <strong>GCash, Maya, Bank Transfer, or Crypto</strong>, please contact Administrator via Telegram.
            </p>
          </div>

          <a
            href="https://t.me/Sylvieofficeal"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-play-buy"
            style={{
              padding: '12px',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            <Send size={16} />
            Chat Admin on Telegram (@Sylvieofficeal)
          </a>
        </div>
      </Modal>

    </div>
  );
}
