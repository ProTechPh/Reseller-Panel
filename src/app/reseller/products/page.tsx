'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, CheckCircle, AlertCircle, X, Wallet, Copy, Check, Info,
  Search, Shield, Laptop, Globe, Flame, Gamepad, Layers, DollarSign, Send, Zap
} from 'lucide-react';
import Modal from '@/components/Modal';

interface PriceOption {
  duration: string;
  price: number;
}

interface ProductType {
  _id: string;
  name: string;
  description: string;
  image?: string;
  prices: PriceOption[];
  deliveryType?: 'instant' | 'telegram';
  telegramUsername?: string;
}

export default function ResellerProducts() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [balance, setBalance] = useState(0);
  const [resellerType, setResellerType] = useState<'budget' | 'unlimited'>('budget');
  const [stock, setStock] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  
  // Success state
  const [successKey, setSuccessKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);

  // Client-Side Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['PC']);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['GLOBAL']);

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
      console.error('Failed to load shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPurchaseModal = (product: ProductType) => {
    setSelectedProduct(product);
    setSelectedDuration(product.prices[0]?.duration || '');
    setPurchaseError(null);
    setSuccessKey(null);
    setCopiedKey(false);
  };

  const closePurchaseModal = () => {
    setSelectedProduct(null);
    setSuccessKey(null);
  };

  const getSelectedPrice = (): number => {
    if (!selectedProduct || !selectedDuration) return 0;
    const option = selectedProduct.prices.find((p) => p.duration === selectedDuration);
    return option ? option.price : 0;
  };

  const getStockCount = (productId: string, duration: string): number => {
    return stock[productId]?.[duration] || 0;
  };

  const handleConfirmPurchase = async () => {
    if (!selectedProduct || !selectedDuration) return;
    
    const price = getSelectedPrice();
    if (balance < price) {
      setPurchaseError('Insufficient balance to complete this purchase.');
      return;
    }

    const availableStock = getStockCount(selectedProduct._id, selectedDuration);
    if (availableStock <= 0) {
      setPurchaseError('This item is currently out of stock.');
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

      if (data.success && data.licenseKey) {
        setSuccessKey(data.licenseKey.key);
        setBalance(data.newBalance);
        
        // Refresh stock counts
        const stockRes = await fetch('/api/reseller/products/stock');
        if (stockRes.ok) {
          const stockData = await stockRes.json();
          if (stockData.success) setStock(stockData.stock);
        }

        // Trigger balance update in sidebar
        window.dispatchEvent(new Event('balance-update'));
      }
    } catch (err: any) {
      setPurchaseError(err.message || 'An unexpected error occurred.');
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

  // Toggle checklist filters
  const toggleFilter = (value: string, state: string[], setState: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (state.includes(value)) {
      setState(state.filter((x) => x !== value));
    } else {
      setState([...state, value]);
    }
  };

  // Filter products based on search query and sidebar options
  const filteredProducts = products.filter((prod) => {
    // 1. Search Query Filter
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || prod.name.toLowerCase().includes(query) || prod.description.toLowerCase().includes(query);

    // 2. Category Filter (infer from product name/description keywords)
    const matchesCategory = 
      selectedCategories.length === 0 ||
      selectedCategories.some((cat) => {
        if (cat === 'Cheats') return prod.name.toLowerCase().includes('cheat') || prod.name.toLowerCase().includes('hack');
        if (cat === 'Spoofers') return prod.name.toLowerCase().includes('spoofer') || prod.description.toLowerCase().includes('spoofer');
        if (cat === 'Bypassers') return prod.name.toLowerCase().includes('bypass') || prod.description.toLowerCase().includes('cleaner');
        return true;
      });

    return matchesSearch && matchesCategory;
  });

  const selectedPrice = getSelectedPrice();
  const remainingBalance = balance - selectedPrice;
  const isBalanceSufficient = resellerType === 'unlimited' ? true : remainingBalance >= 0;
  const currentItemStock = selectedProduct ? getStockCount(selectedProduct._id, selectedDuration) : 0;
  const isStockAvailable = currentItemStock > 0;

  return (
    <div className="animate-fade-in">
      {/* Search Header Bar (Eneba Style) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <h1>CD-Key Storefront</h1>
        <p className="subtitle">Search and buy verified license keys instantly. Instant electronic delivery.</p>

        {/* Eneba Central Search Box */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          alignItems: 'center',
          maxWidth: '650px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ padding: '0 12px', color: 'var(--text-secondary)' }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            className="form-input"
            placeholder="Search game, product name, spoofer, bypass..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: '10px 4px',
              fontSize: '0.95rem'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                marginRight: '8px'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid rgba(255,255,255,0.05)',
            borderTopColor: 'var(--accent-orange)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No active products are currently available in the catalog.
        </div>
      ) : (
        /* Double Column Grid Layout (Eneba Store Style) */
        <div className="store-container">
          
          {/* Left Filters Panel */}
          <aside className="store-filters">
            {/* Category Filter */}
            <div className="filter-section">
              <div className="filter-title">Category</div>
              <div className="filter-options">
                {['Cheats', 'Spoofers', 'Bypassers'].map((cat) => {
                  const checked = selectedCategories.includes(cat);
                  return (
                    <div 
                      key={cat} 
                      className="filter-item" 
                      onClick={() => toggleFilter(cat, selectedCategories, setSelectedCategories)}
                    >
                      <div className={`filter-checkbox ${checked ? 'checked' : ''}`}>
                        {checked && <Check size={11} />}
                      </div>
                      <span>{cat}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platform Filter */}
            <div className="filter-section">
              <div className="filter-title">Platform</div>
              <div className="filter-options">
                {['PC', 'Steam', 'Xbox', 'PlayStation'].map((plat) => {
                  const checked = selectedPlatforms.includes(plat);
                  return (
                    <div 
                      key={plat} 
                      className="filter-item" 
                      onClick={() => toggleFilter(plat, selectedPlatforms, setSelectedPlatforms)}
                    >
                      <div className={`filter-checkbox ${checked ? 'checked' : ''}`}>
                        {checked && <Check size={11} />}
                      </div>
                      <span>{plat}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Region Filter */}
            <div className="filter-section">
              <div className="filter-title">Region</div>
              <div className="filter-options">
                {['GLOBAL', 'EUROPE', 'NORTH AMERICA', 'ASIA'].map((reg) => {
                  const checked = selectedRegions.includes(reg);
                  return (
                    <div 
                      key={reg} 
                      className="filter-item" 
                      onClick={() => toggleFilter(reg, selectedRegions, setSelectedRegions)}
                    >
                      <div className={`filter-checkbox ${checked ? 'checked' : ''}`}>
                        {checked && <Check size={11} />}
                      </div>
                      <span>{reg}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Right Product Grid */}
          <section className="store-grid">
            {filteredProducts.length === 0 ? (
              <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No keys match your filters or search keywords.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px',
              }}>
                {filteredProducts.map((product) => {
                  const pricesSorted = [...product.prices].sort((a, b) => a.price - b.price);
                  const lowestPrice = pricesSorted[0];
                  const isTgDelivery = product.deliveryType === 'telegram';

                  // Count total stock available across all durations for this product
                  const totalProductStock = isTgDelivery ? 0 : product.prices.reduce((sum, p) => sum + getStockCount(product._id, p.duration), 0);

                  return (
                    <div key={product._id} className="card card-hover" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      padding: '16px' // Padded card
                    }}>
                      <div>
                        {/* Cover Banner Art */}
                        <div className="product-cover">
                          <img 
                            src={
                              product.image && product.image.trim() 
                                ? product.image 
                                : product.name.toLowerCase().includes('mobile legends') || product.name.toLowerCase().includes('mlbb') ? '/images/mlbb.png'
                                : product.name.toLowerCase().includes('call of duty') || product.name.toLowerCase().includes('codm') ? '/images/codm.png'
                                : product.name.toLowerCase().includes('pubg') ? '/images/pubg.png'
                                : product.name.toLowerCase().includes('8 ball') || product.name.toLowerCase().includes('pool') ? '/images/8ballpool.png'
                                : product.name.toLowerCase().includes('blood') ? '/images/bloodstrike.png'
                                : product.name.toLowerCase().includes('crossfire') ? '/images/crossfire.png'
                                : product.name.toLowerCase().includes('free fire') ? '/images/freefire.png'
                                : product.name.toLowerCase().includes('delta') ? '/images/deltaforcemobile.png'
                                : '/images/logo.png'
                            } 
                            alt={product.name} 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/logo.png';
                            }}
                          />
                        </div>

                        {/* Title */}
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '6px', lineHeight: '1.25' }}>
                          {product.name}
                        </h3>

                        {/* Badges / Game Attributes */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                          {isTgDelivery ? (
                            <span className="badge badge-yellow" style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(34, 158, 217, 0.15)', color: '#29b6f6', border: '1px solid rgba(34, 158, 217, 0.3)' }}>
                              <Send size={10} style={{ marginRight: '4px' }} />
                              TELEGRAM DM
                            </span>
                          ) : (
                            <span className="badge badge-indigo" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                              <Zap size={10} style={{ marginRight: '4px' }} />
                              INSTANT KEY
                            </span>
                          )}
                          <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                            <Globe size={10} style={{ marginRight: '4px' }} />
                            GLOBAL
                          </span>
                        </div>

                        <p style={{ fontSize: '0.8rem', marginBottom: '20px', color: 'var(--text-secondary)', minHeight: '36px', lineBreak: 'anywhere' }}>
                          {product.description.length > 70 ? product.description.substring(0, 68) + '...' : product.description}
                        </p>
                      </div>

                      <div>
                        {/* Pricing details and Buy CTA */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          marginBottom: '12px',
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '12px',
                        }}>
                          <span style={{ fontSize: '0.7rem', color: isTgDelivery ? '#29b6f6' : 'var(--text-secondary)', fontWeight: isTgDelivery ? 600 : 400 }}>
                            {isTgDelivery ? 'Direct TG Order' : (totalProductStock === 0 ? 'Out of stock' : `${totalProductStock} keys left`)}
                          </span>
                          <div>
                            <span style={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--accent-orange)' }}>
                              ₱{lowestPrice?.price.toFixed(2)}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              /{lowestPrice?.duration}
                            </span>
                          </div>
                        </div>

                        {isTgDelivery ? (
                          <button
                            onClick={() => openPurchaseModal(product)}
                            className="btn btn-primary"
                            style={{
                              width: '100%',
                              padding: '9px 16px',
                              fontSize: '0.85rem',
                              background: 'linear-gradient(90deg, #229ED9 0%, #0088cc 100%)',
                              border: 'none',
                              color: '#fff',
                            }}
                          >
                            <Send size={13} />
                            Order via Telegram
                          </button>
                        ) : (
                          <button
                            onClick={() => openPurchaseModal(product)}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '9px 16px', fontSize: '0.85rem' }}
                          >
                            <ShoppingCart size={13} />
                            Buy License Key
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      )}

      {/* Purchase Modal Overlay */}
      <Modal isOpen={!!selectedProduct} onClose={closePurchaseModal}>
        {selectedProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedProduct.deliveryType === 'telegram' ? (
              /* Telegram Direct Delivery Modal */
              <>
                <div className="modal-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={18} color="#29b6f6" />
                    Order via Telegram
                  </h2>
                  <button onClick={closePurchaseModal} className="modal-close">
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Selected Product</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedProduct.name}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {selectedProduct.description}
                  </p>
                </div>

                {/* Duration & Pricing Options */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Select Pricing Option</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedProduct.prices.map((p) => {
                      const isSelected = selectedDuration === p.duration;
                      return (
                        <div
                          key={p.duration}
                          onClick={() => setSelectedDuration(p.duration)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1px solid #0088cc' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(0, 136, 204, 0.12)' : 'rgba(255, 255, 255, 0.01)',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.duration}</span>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? '#29b6f6' : 'white' }}>
                            ₱{p.price.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Telegram Guidance Box */}
                <div style={{
                  background: 'rgba(34, 158, 217, 0.08)',
                  border: '1px solid rgba(34, 158, 217, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#29b6f6', fontWeight: 700, fontSize: '0.85rem' }}>
                    <Send size={15} />
                    <span>Direct Message Fulfillment</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                    Ang keys para sa product na ito ay ibinibigay nang <strong>direct message sa Telegram</strong> ng admin.
                    I-click ang button sa ibaba para mag-chat kay <strong>@{(selectedProduct.telegramUsername || 'Sylvieofficeal').replace(/^@/, '')}</strong>.
                  </p>
                </div>

                {/* Telegram Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
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
                      padding: '12px 18px',
                      background: 'linear-gradient(90deg, #229ED9 0%, #0088cc 100%)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: '0 4px 14px rgba(0, 136, 204, 0.3)',
                    }}
                  >
                    <Send size={15} />
                    Message @{(selectedProduct.telegramUsername || 'Sylvieofficeal').replace(/^@/, '')} on Telegram
                  </a>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(`@${(selectedProduct.telegramUsername || 'Sylvieofficeal').replace(/^@/, '')}`);
                        setCopiedTg(true);
                        setTimeout(() => setCopiedTg(false), 2000);
                      }}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {copiedTg ? <Check size={13} /> : <Copy size={13} />}
                      {copiedTg ? 'Username Copied!' : 'Copy Username'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closePurchaseModal}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            ) : !successKey ? (
              /* Phase 1: Configure & Confirm Purchase */
              <>
                <div className="modal-header">
                  <h2>Buy License Key</h2>
                  <button onClick={closePurchaseModal} className="modal-close">
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Selected Product</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedProduct.name}
                  </div>
                </div>

                {purchaseError && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(244, 63, 94, 0.06)',
                    border: '1px solid rgba(244, 63, 94, 0.15)',
                    color: 'var(--accent-crimson)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}>
                    <AlertCircle size={15} />
                    <span>{purchaseError}</span>
                  </div>
                )}

                {/* Duration Selection Buttons */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="dur-select">Select Duration</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedProduct.prices.map((p) => {
                      const isSelected = selectedDuration === p.duration;
                      const stockForThisDur = getStockCount(selectedProduct._id, p.duration);
                      const hasStock = stockForThisDur > 0;

                      return (
                        <div
                          key={p.duration}
                          onClick={() => hasStock && setSelectedDuration(p.duration)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(255, 94, 0, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                            cursor: hasStock ? 'pointer' : 'not-allowed',
                            opacity: hasStock ? 1 : 0.4,
                            transition: 'var(--transition)',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.duration}</span>
                            <div style={{ fontSize: '0.75rem', color: hasStock ? 'var(--accent-cyan)' : 'var(--accent-crimson)' }}>
                              {hasStock ? `${stockForThisDur} in stock` : 'Out of stock'}
                            </div>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--accent-orange)' : 'white' }}>
                            ₱{p.price.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing & Balance Calculation Breakdown */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.85rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Item Price:</span>
                    <span style={{ fontWeight: 600 }}>{resellerType === 'unlimited' ? '₱0.00 (Unlimited Tier)' : `₱${selectedPrice.toFixed(2)}`}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Account Mode:</span>
                    <span style={{ fontWeight: 600, color: resellerType === 'unlimited' ? 'var(--accent-orange)' : 'white' }}>
                      {resellerType === 'unlimited' ? '∞ Unlimited Generation' : `₱${balance.toFixed(2)} Balance`}
                    </span>
                  </div>
                  <div style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700
                  }}>
                    <span>Remaining Balance:</span>
                    <span style={{ color: isBalanceSufficient ? 'var(--accent-emerald)' : 'var(--accent-crimson)' }}>
                      {resellerType === 'unlimited' ? '∞ Unlimited' : `₱${remainingBalance.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Stock Level Warning with Telegram contact fallback */}
                {!isStockAvailable && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '0.8rem',
                    color: 'var(--accent-crimson)',
                    padding: '10px 12px',
                    background: 'rgba(244, 63, 94, 0.04)',
                    border: '1px solid rgba(244, 63, 94, 0.15)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Info size={14} style={{ flexShrink: 0 }} />
                      <span>Out of stocked keys in panel for this duration.</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '22px' }}>
                      Need key immediately? Message{' '}
                      <a
                        href="https://t.me/Sylvieofficeal"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#29b6f6', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        @Sylvieofficeal on Telegram
                      </a>
                    </div>
                  </div>
                )}

                {!isBalanceSufficient && isStockAvailable && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.8rem',
                    color: 'var(--accent-crimson)',
                    padding: '8px 10px',
                    background: 'rgba(244, 63, 94, 0.04)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <Info size={13} style={{ flexShrink: 0 }} />
                    <span>Please contact an administrator to top up your balance.</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={closePurchaseModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={purchasing || !isBalanceSufficient || !isStockAvailable}
                    onClick={handleConfirmPurchase}
                    style={{ minWidth: '130px' }}>
                    {purchasing ? 'Purchasing...' : 'Confirm Purchase'}
                  </button>
                </div>
              </>
            ) : (
              /* Phase 2: Purchase Success Display Key */
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.08)',
                  color: 'var(--accent-emerald)',
                  margin: '0 auto',
                }}>
                  <CheckCircle size={28} />
                </div>
                
                <div>
                  <h2>Purchase Successful</h2>
                  <p className="subtitle" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Your license key for <strong>{selectedProduct.name}</strong> ({selectedDuration}) has been claimed.
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                }}>
                  <code style={{
                    fontFamily: 'monospace',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--accent-orange)',
                    wordBreak: 'break-all',
                    display: 'block',
                  }}>
                    {successKey}
                  </code>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCopySuccessKey}
                    style={{ width: '100%' }}
                  >
                    {copiedKey ? <Check size={16} /> : <Copy size={16} />}
                    {copiedKey ? 'Copied!' : 'Copy License Key'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closePurchaseModal}
                    style={{ width: '100%' }}
                  >
                    Close Store Modal
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
