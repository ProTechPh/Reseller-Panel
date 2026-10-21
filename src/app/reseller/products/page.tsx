'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, CheckCircle, AlertCircle, X, Wallet, Copy, Check, Info,
  Search, Send, Zap, Gamepad2, LayoutGrid
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

// Simple filter categories
const CATEGORY_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'codm', label: 'CODM' },
  { id: 'dfm', label: 'DFM' },
  { id: 'pubg', label: 'PUBG' },
  { id: '8ball', label: '8-Ball' },
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
  { id: 'pc', label: 'PC' },
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
  const [resellerType, setResellerType] = useState<'budget' | 'unlimited'>('budget');
  const [stock, setStock] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);

  // Simple Filter State
  const [activeChip, setActiveChip] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Purchase Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [successKey, setSuccessKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

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
          setBalance(meData.user.balance);
          if (meData.user.resellerType) setResellerType(meData.user.resellerType);
        }
      }

      if (stockRes.ok) {
        const stockData = await stockRes.json();
        if (stockData.success) setStock(stockData.stock);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
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

  // Open Buy Modal with first duration pre-selected
  const handleOpenBuy = (product: ProductType) => {
    setSelectedProduct(product);
    // Find first duration that has stock, or default to first
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
      setPurchaseError('Kulang ang inyong balance para sa pagbili.');
      return;
    }

    const availableStock = getStockCount(selectedProduct._id, selectedDuration);
    if (availableStock <= 0) {
      setPurchaseError('Wala nang stock para sa duration na ito.');
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
      setPurchaseError(err.message || 'May error sa pag-proseso.');
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

  // Filter products by active chip and search query
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const text = (prod.name + ' ' + (prod.description || '')).toLowerCase();

      // Chip filter
      if (activeChip !== 'all') {
        if (activeChip === 'android' || activeChip === 'ios' || activeChip === 'pc') {
          const plat = detectPlatform(prod).toLowerCase();
          if (plat !== activeChip) return false;
        } else {
          // Game keyword
          if (!text.includes(activeChip)) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [products, activeChip, searchQuery]);

  const selectedPrice = getSelectedPrice();
  const remainingBalance = balance - selectedPrice;
  const isBalanceSufficient = resellerType === 'unlimited' ? true : remainingBalance >= 0;
  const currentItemStock = selectedProduct && selectedDuration ? getStockCount(selectedProduct._id, selectedDuration) : 0;
  const isStockAvailable = currentItemStock > 0;

  return (
    <div className="simple-storefront animate-fade-in">

      {/* 1. SIMPLE COMPACT TOP SECTION (Search + Filter Chips) */}
      <section className="simple-top-section">
        <div className="simple-search-box">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search game or cheat name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Clean horizontal single-row filter chips */}
        <div className="simple-chips-row">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`simple-chip ${activeChip === chip.id ? 'active' : ''}`}
              onClick={() => setActiveChip(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {/* 2. HEADER BAR */}
      <div className="simple-header-row">
        <div className="simple-header-title">
          <Gamepad2 size={20} color="#e50914" />
          <span>Available Products</span>
        </div>
        <span className="simple-count-badge">{filteredProducts.length}</span>
      </div>

      {/* 3. ULTRA-SIMPLE PRODUCT GRID (2 columns on mobile, 1 clean button per card) */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: '#e50914',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', background: '#111116', borderRadius: '16px' }}>
          <p>Walang nakitang products para sa filter na ito.</p>
        </div>
      ) : (
        <div className="simple-grid">
          {filteredProducts.map((product) => {
            const platform = detectPlatform(product);
            const thumbnail = getThumbnail(product);
            const isTg = product.deliveryType === 'telegram';
            const lowestPrice = [...product.prices].sort((a, b) => a.price - b.price)[0]?.price || 0;

            return (
              <div key={product._id} className="simple-card">
                <div>
                  {/* Thumbnail Image + Platform Tag */}
                  <div className="simple-card-image">
                    <ProductImage
                      src={thumbnail}
                      alt={product.name}
                      width={400}
                      height={260}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span className={`simple-platform-tag ${platform.toLowerCase()}`}>
                      {platform}
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3 className="simple-card-title" title={product.name}>
                    {product.name}
                  </h3>
                </div>

                {/* Pricing & Single Action Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="simple-card-price-row">
                    <span className="simple-card-price-label">Starts at</span>
                    <span className="simple-card-price-val">₱{lowestPrice.toFixed(2)}</span>
                  </div>

                  {isTg ? (
                    <button
                      type="button"
                      onClick={() => handleOpenBuy(product)}
                      className="btn-simple-tg"
                    >
                      <Send size={14} />
                      <span>Order via TG</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenBuy(product)}
                      className="btn-simple-buy"
                    >
                      <ShoppingCart size={15} />
                      <span>Buy Key</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. CLEAN 2-STEP PURCHASE MODAL */}
      <Modal isOpen={!!selectedProduct} onClose={closePurchaseModal}>
        {selectedProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedProduct.deliveryType === 'telegram' ? (
              /* Telegram Direct Order Modal */
              <>
                <div className="modal-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                    <Send size={18} color="#29b6f6" />
                    Order via Telegram
                  </h2>
                  <button onClick={closePurchaseModal} className="modal-close"><X size={18} /></button>
                </div>

                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{selectedProduct.name}</div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="simple-duration-picker">
                  {selectedProduct.prices.map((p) => (
                    <div
                      key={p.duration}
                      className={`simple-duration-pill ${selectedDuration === p.duration ? 'active' : ''}`}
                      onClick={() => setSelectedDuration(p.duration)}
                    >
                      <span style={{ fontWeight: 700 }}>{p.duration}</span>
                      <span style={{ fontWeight: 800, color: '#fbbf24' }}>₱{p.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={`https://t.me/${(selectedProduct.telegramUsername || 'Sylvieofficeal').replace(/^@/, '')}?text=${encodeURIComponent(
                    `Hello Admin! I would like to order "${selectedProduct.name}" (${selectedDuration}) from the Reseller Panel.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#0088cc',
                    border: 'none',
                    fontWeight: 800,
                    textDecoration: 'none',
                    color: '#fff',
                  }}
                >
                  <Send size={15} />
                  Chat on Telegram (@{(selectedProduct.telegramUsername || 'Sylvieofficeal').replace(/^@/, '')})
                </a>
              </>
            ) : !successKey ? (
              /* Phase 1: Pick Duration & 1-Tap Confirm */
              <>
                <div className="modal-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                    <ShoppingCart size={18} color="#e50914" />
                    Buy License Key
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

                {/* Product Name Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#16161c',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#09090b' }}>
                    <ProductImage src={getThumbnail(selectedProduct)} alt={selectedProduct.name} width={88} height={88} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{selectedProduct.name}</div>
                    <span className={`simple-platform-tag ${detectPlatform(selectedProduct).toLowerCase()}`} style={{ position: 'static' }}>
                      {detectPlatform(selectedProduct)}
                    </span>
                  </div>
                </div>

                {/* Duration Picker Pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Pumili ng Duration:</span>
                  <div className="simple-duration-picker">
                    {selectedProduct.prices.map((p) => {
                      const isSelected = selectedDuration === p.duration;
                      const stockCount = getStockCount(selectedProduct._id, p.duration);
                      const isOut = stockCount <= 0;

                      return (
                        <div
                          key={p.duration}
                          className={`simple-duration-pill ${isSelected ? 'active' : ''} ${isOut ? 'out' : ''}`}
                          onClick={() => !isOut && setSelectedDuration(p.duration)}
                        >
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{p.duration}</span>
                            <div style={{ fontSize: '0.7rem', color: isOut ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                              {isOut ? 'Out of stock' : `${stockCount} available`}
                            </div>
                          </div>
                          <span style={{ fontWeight: 850, fontSize: '1rem', color: '#fbbf24' }}>
                            ₱{p.price.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Balance Summary */}
                <div style={{
                  background: '#16161c',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                }}>
                  <span style={{ color: '#94a3b8' }}>Your Balance:</span>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>
                    {resellerType === 'unlimited' ? '∞ Unlimited' : `₱${balance.toFixed(2)}`}
                  </span>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  disabled={purchasing || !isBalanceSufficient || !isStockAvailable}
                  onClick={handleConfirmPurchase}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '10px',
                    background: '#e50914',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 850,
                    fontSize: '0.95rem',
                    cursor: (purchasing || !isBalanceSufficient || !isStockAvailable) ? 'not-allowed' : 'pointer',
                    opacity: (purchasing || !isBalanceSufficient || !isStockAvailable) ? 0.5 : 1,
                    boxShadow: '0 4px 14px rgba(229, 9, 20, 0.4)',
                  }}
                >
                  {purchasing ? 'Processing...' : `Confirm Purchase (₱${selectedPrice.toFixed(2)})`}
                </button>
              </>
            ) : (
              /* Phase 2: Instant License Key Display */
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  margin: '0 auto',
                }}>
                  <CheckCircle size={30} />
                </div>

                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 850 }}>Purchase Successful!</h2>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                    {selectedProduct.name} ({selectedDuration})
                  </p>
                </div>

                {/* Big Monospace Key Display */}
                <div style={{
                  background: '#09090c',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '12px',
                  padding: '14px',
                }}>
                  <code style={{
                    fontFamily: 'monospace',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#10b981',
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
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '10px',
                    background: copiedKey ? '#059669' : '#10b981',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  {copiedKey ? <Check size={18} /> : <Copy size={18} />}
                  {copiedKey ? 'Key Copied!' : 'Copy License Key'}
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    href="/reseller/keys"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px', textAlign: 'center', textDecoration: 'none', fontSize: '0.82rem', borderRadius: '10px' }}
                  >
                    View in My Keys
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

    </div>
  );
}
