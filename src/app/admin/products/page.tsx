'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, X, PlusCircle, MinusCircle, AlertCircle, 
  KeyRound, Key, Search, ShoppingBag, Send, Zap, Package, 
  LayoutGrid, List, CheckCircle, Info
} from 'lucide-react';
import Modal from '@/components/Modal';
import CopyButton from '@/components/CopyButton';
import ProductImage from '@/components/ProductImage';
import ImageUploader from '@/components/ImageUploader';

interface PriceOption {
  duration: string;
  price: number;
}

interface ProductType {
  _id?: string;
  name: string;
  description: string;
  image?: string;
  platform?: 'Android' | 'iOS' | 'PC';
  prices: PriceOption[];
  isActive: boolean;
  deliveryType?: 'instant' | 'telegram';
  telegramUsername?: string;
}

interface KeyType {
  _id: string;
  key: string;
  productId: {
    _id: string;
    name: string;
  };
  duration: string;
  isSold: boolean;
  resellerId?: {
    username: string;
  };
  price?: number;
  createdAt: string;
}

function detectPlatform(prod: ProductType): 'Android' | 'iOS' | 'PC' {
  if (prod.platform) return prod.platform;
  const text = (prod.name + ' ' + (prod.description || '')).toLowerCase();
  if (text.includes('ios') || text.includes('iphone') || text.includes('ipad')) return 'iOS';
  if (text.includes('android') || text.includes('apk') || text.includes('root')) return 'Android';
  if (text.includes('pc') || text.includes('windows') || text.includes('steam')) return 'PC';
  if (text.includes('codm') || text.includes('dfm') || text.includes('pubg') || text.includes('8ball')) return 'Android';
  return 'PC';
}

function getProductThumbnail(prod: ProductType): string {
  if (prod.image && prod.image.trim()) return prod.image;
  const name = prod.name.toLowerCase();
  if (name.includes('codm') || name.includes('call of duty')) return '/images/codm.png';
  if (name.includes('dfm') || name.includes('delta')) return '/images/deltaforcemobile.png';
  if (name.includes('pubg')) return '/images/pubg.png';
  if (name.includes('8ball') || name.includes('pool')) return '/images/8ballpool.png';
  if (name.includes('ghosst')) return '/images/Ghosst.png';
  return '/images/logo.png';
}

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  
  // View layout: 'grid' or 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'Android' | 'iOS' | 'PC'>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'instant' | 'telegram'>('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // View Stock Modal State
  const [isStockViewOpen, setIsStockViewOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<ProductType | null>(null);
  const [productKeys, setProductKeys] = useState<KeyType[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  
  // Form State
  const [currentId, setCurrentId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<'Android' | 'iOS' | 'PC'>('Android');
  const [prices, setPrices] = useState<PriceOption[]>([{ duration: '30 Days', price: 10 }]);
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [deliveryType, setDeliveryType] = useState<'instant' | 'telegram'>('instant');
  const [telegramUsername, setTelegramUsername] = useState('Sylvieofficeal');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Load Products and Aggregated Stock
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/products');

      if (res.ok) {
        const prodData = await res.json();
        if (prodData.success) {
          setProducts(prodData.products || []);
          if (prodData.stock) {
            setStockMap(prodData.stock);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load products data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentId('');
    setName('');
    setDescription('');
    setPlatform('Android');
    setPrices([{ duration: '30 Days', price: 10 }]);
    setImage('');
    setIsActive(true);
    setDeliveryType('instant');
    setTelegramUsername('Sylvieofficeal');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: ProductType) => {
    setModalMode('edit');
    setCurrentId(prod._id || '');
    setName(prod.name);
    setDescription(prod.description);
    setPlatform(prod.platform || detectPlatform(prod));
    setPrices(prod.prices.length > 0 ? prod.prices : [{ duration: '30 Days', price: 10 }]);
    setImage(prod.image || '');
    setIsActive(prod.isActive);
    setDeliveryType(prod.deliveryType || 'instant');
    setTelegramUsername(prod.telegramUsername || 'Sylvieofficeal');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Stock Modal and fetch keys for this specific product
  const openStockViewModal = async (prod: ProductType) => {
    setSelectedProductForStock(prod);
    setStockSearchQuery('');
    setIsStockViewOpen(true);
    setLoadingKeys(true);
    try {
      const res = await fetch(`/api/admin/keys?productId=${prod._id}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProductKeys(data.keys || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch product keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleAddPriceOption = () => {
    setPrices([...prices, { duration: '1 Day', price: 1 }]);
  };

  const handleRemovePriceOption = (index: number) => {
    if (prices.length <= 1) return;
    setPrices(prices.filter((_, i) => i !== index));
  };

  const handlePriceOptionChange = (index: number, field: 'duration' | 'price', value: string) => {
    const newPrices = [...prices];
    if (field === 'duration') {
      newPrices[index].duration = value;
    } else {
      newPrices[index].price = parseFloat(value) || 0;
    }
    setPrices(newPrices);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) return setFormError('Product name is required.');
    if (!description.trim()) return setFormError('Description is required.');
    if (prices.some((p) => !p.duration.trim() || p.price < 0)) {
      return setFormError('All price options must have a duration name and non-negative price.');
    }

    setFormSubmitting(true);

    try {
      const payload = {
        id: currentId,
        _id: currentId,
        name,
        description,
        prices,
        image,
        platform,
        isActive,
        deliveryType,
        telegramUsername: telegramUsername.trim().replace(/^@/, '') || 'Sylvieofficeal',
      };
      const url = modalMode === 'create' ? '/api/admin/products' : `/api/admin/products?id=${currentId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete "${prodName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Get total unsold keys for a product across all durations
  const getProductStockCount = (productId?: string) => {
    if (!productId || !stockMap[productId]) return 0;
    return Object.values(stockMap[productId]).reduce((sum, count) => sum + count, 0);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const text = (prod.name + ' ' + prod.description).toLowerCase();

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!text.includes(q)) return false;
      }

      // Platform Filter
      if (platformFilter !== 'all') {
        const plat = detectPlatform(prod);
        if (plat !== platformFilter) return false;
      }

      // Delivery Filter
      if (deliveryFilter !== 'all') {
        const type = prod.deliveryType || 'instant';
        if (type !== deliveryFilter) return false;
      }

      return true;
    });
  }, [products, searchQuery, platformFilter, deliveryFilter]);

  // Total in-stock keys across all products
  const totalStockKeysCount = useMemo(() => {
    return Object.values(stockMap).reduce((acc, durMap) => {
      return acc + Object.values(durMap).reduce((s, c) => s + c, 0);
    }, 0);
  }, [stockMap]);

  const instantProductsCount = products.filter(p => p.deliveryType !== 'telegram').length;
  const telegramProductsCount = products.filter(p => p.deliveryType === 'telegram').length;

  const filteredStockKeys = productKeys.filter((k) => {
    const q = stockSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return k.key.toLowerCase().includes(q) || k.duration.toLowerCase().includes(q) || (k.resellerId?.username && k.resellerId.username.toLowerCase().includes(q));
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. TOP HEADER & CREATE BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem' }}>Product Catalog</h1>
          <p className="subtitle">Pamahalaan ang mga laro, cheat packages, presyo, at stock ng mga license key.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={openCreateModal}
          style={{ background: '#e50914', border: 'none', padding: '10px 18px', fontWeight: 800, borderRadius: '10px' }}
        >
          <Plus size={18} />
          Create Product
        </button>
      </div>

      {/* 2. OVERVIEW STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(229, 9, 20, 0.12)', border: '1px solid rgba(229, 9, 20, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e50914' }}>
            <Package size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Products</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 850, color: '#fff', marginTop: '2px' }}>
              {products.length} Products
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <Key size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Available Stock</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 850, color: '#10b981', marginTop: '2px' }}>
              {totalStockKeysCount} Keys
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(34, 158, 217, 0.12)', border: '1px solid rgba(34, 158, 217, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#29b6f6' }}>
            <Zap size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Delivery Mode</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              {instantProductsCount} Instant &bull; {telegramProductsCount} TG
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER CONTROLS BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: '#111116',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '14px',
        padding: '12px 14px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        {/* Search Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#09090d', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '7px 12px', flex: 1, minWidth: '220px' }}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search product name or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', outline: 'none', width: '100%' }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          {(['all', 'Android', 'iOS', 'PC'] as const).map((plat) => (
            <button
              key={plat}
              type="button"
              className={`simple-chip ${platformFilter === plat ? 'active' : ''}`}
              onClick={() => setPlatformFilter(plat)}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              {plat === 'all' ? 'All Platforms' : plat}
            </button>
          ))}

          {(['all', 'instant', 'telegram'] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={`simple-chip ${deliveryFilter === type ? 'active' : ''}`}
              onClick={() => setDeliveryFilter(type)}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              {type === 'all' ? 'All Delivery' : type === 'instant' ? '⚡ Instant' : '✈️ TG'}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: Grid vs Table */}
        <div style={{ display: 'flex', background: '#181820', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: viewMode === 'grid' ? '#e50914' : 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
            title="Card Grid View"
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: viewMode === 'table' ? '#e50914' : 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
            title="Table List View"
          >
            <List size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: '#e50914',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
          <Package size={40} style={{ margin: '0 auto 12px auto', color: '#64748b' }} />
          <h3>No products in catalog</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Click "Create Product" to add your first product.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
          <p>No products match your search or filter.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= Modern Card Grid View ================= */
        <div className="admin-catalog-grid">
          {filteredProducts.map((prod) => {
            const platform = detectPlatform(prod);
            const thumbnail = getProductThumbnail(prod);
            const isTg = prod.deliveryType === 'telegram';
            const stockCount = getProductStockCount(prod._id);

            return (
              <div key={prod._id} className="admin-prod-card">
                <div>
                  {/* Top section: Thumbnail + Meta */}
                  <div className="admin-prod-top">
                    <div className="admin-prod-thumb">
                      <ProductImage src={thumbnail} alt={prod.name} width={200} height={200} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="admin-prod-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className={`simple-platform-tag ${platform.toLowerCase()}`} style={{ position: 'static' }}>
                          {platform}
                        </span>
                        {isTg ? (
                          <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: '8px', background: 'rgba(34, 158, 217, 0.15)', color: '#29b6f6', fontWeight: 800 }}>
                            Telegram DM
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: '8px', background: 'rgba(255, 94, 0, 0.15)', color: 'var(--accent-orange)', fontWeight: 800 }}>
                            Instant Key
                          </span>
                        )}
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '8px', background: prod.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: prod.isActive ? '#10b981' : '#ef4444', fontWeight: 800 }}>
                          {prod.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="admin-prod-name" title={prod.name}>{prod.name}</h3>
                      <p className="admin-prod-desc">{prod.description}</p>
                    </div>
                  </div>

                  {/* Stock Status Indicator */}
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isTg ? 'rgba(34, 158, 217, 0.06)' : stockCount > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                    border: `1px solid ${isTg ? 'rgba(34, 158, 217, 0.2)' : stockCount > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Inventory:</span>
                    {isTg ? (
                      <span style={{ color: '#29b6f6', fontWeight: 800 }}>Manual via @{prod.telegramUsername || 'Sylvieofficeal'}</span>
                    ) : (
                      <span style={{ color: stockCount > 0 ? '#10b981' : '#ef4444', fontWeight: 850 }}>
                        {stockCount > 0 ? `✓ ${stockCount} keys in stock` : '⚠ Out of stock'}
                      </span>
                    )}
                  </div>

                  {/* Pricing Tiers Box */}
                  <div className="admin-prod-prices-box" style={{ marginTop: '10px' }}>
                    <span className="admin-prod-prices-label">Duration & Pricing</span>
                    <div className="admin-prod-prices-list">
                      {prod.prices.map((p, idx) => (
                        <div key={idx} className="admin-price-pill">
                          <span>{p.duration}:</span>
                          <strong>₱{p.price.toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="admin-prod-actions">
                  {!isTg && (
                    <button
                      type="button"
                      onClick={() => openStockViewModal(prod)}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '8px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <KeyRound size={13} style={{ color: 'var(--accent-orange)' }} />
                      View Keys
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditModal(prod)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(prod._id!, prod.name)}
                    className="btn btn-danger"
                    style={{ padding: '8px 10px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Delete Product"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= Modern Table List View ================= */
        <div className="table-card">
          <div className="table-scroller">
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Delivery</th>
                  <th>Stock Available</th>
                  <th>Pricing Tiers</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => {
                  const stockCount = getProductStockCount(prod._id);
                  const isTg = prod.deliveryType === 'telegram';
                  const thumbnail = getProductThumbnail(prod);
                  const platform = detectPlatform(prod);

                  return (
                    <tr key={prod._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ProductImage src={thumbnail} alt="" width={72} height={72} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{prod.name}</div>
                            <span className={`simple-platform-tag ${platform.toLowerCase()}`} style={{ position: 'static', display: 'inline-block', marginTop: '2px' }}>
                              {platform}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isTg ? (
                          <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>
                            <Send size={10} style={{ marginRight: '4px' }} />
                            Telegram
                          </span>
                        ) : (
                          <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                            <Zap size={10} style={{ marginRight: '4px' }} />
                            Instant
                          </span>
                        )}
                      </td>
                      <td>
                        {isTg ? (
                          <span style={{ fontSize: '0.75rem', color: '#29b6f6' }}>Manual DM</span>
                        ) : (
                          <span className={stockCount > 0 ? "badge badge-emerald" : "badge badge-crimson"} style={{ fontWeight: 800 }}>
                            {stockCount} Keys Left
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {prod.prices.map((p, idx) => (
                            <span key={idx} className="admin-price-pill" style={{ fontSize: '0.7rem' }}>
                              {p.duration}: <strong>₱{p.price.toFixed(2)}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${prod.isActive ? 'badge-emerald' : 'badge-crimson'}`}>
                          {prod.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {!isTg && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                              onClick={() => openStockViewModal(prod)}
                              title="View Stocked Keys"
                            >
                              <KeyRound size={13} style={{ color: 'var(--accent-orange)' }} />
                            </button>
                          )}
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                            onClick={() => openEditModal(prod)}
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 10px', border: 'none' }}
                            onClick={() => handleDeleteProduct(prod._id!, prod.name)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. VIEW STOCK MODAL */}
      <Modal isOpen={isStockViewOpen && !!selectedProductForStock} onClose={() => setIsStockViewOpen(false)} maxWidth="680px">
        {selectedProductForStock && (
          <>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(229, 9, 20, 0.12)', color: '#e50914', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem' }}>Stocked License Keys</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedProductForStock.name}</p>
                </div>
              </div>
              <button onClick={() => setIsStockViewOpen(false)} className="modal-close"><X size={18} /></button>
            </div>

            <div style={{ margin: '14px 0 10px 0' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search key code, duration, or reseller..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', maxHeight: '360px', overflowY: 'auto' }}>
              {loadingKeys ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Loading keys...</div>
              ) : filteredStockKeys.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No keys found for this product.
                </div>
              ) : (
                <table className="table-saas" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Key Code</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Reseller</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockKeys.map((k) => (
                      <tr key={k._id}>
                        <td>
                          <div className="key-display">
                            <code className="key-tag" style={{ fontSize: '0.78rem' }}>{k.key}</code>
                            <CopyButton text={k.key} size={12} />
                          </div>
                        </td>
                        <td><span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>{k.duration}</span></td>
                        <td>
                          <span className={`badge ${k.isSold ? 'badge-crimson' : 'badge-emerald'}`} style={{ fontSize: '0.7rem' }}>
                            {k.isSold ? 'Sold' : 'Available'}
                          </span>
                        </td>
                        <td>{k.resellerId?.username || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {new Date(k.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsStockViewOpen(false)}>
                Close
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* 6. CREATE / EDIT PRODUCT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="520px">
        <div className="modal-header">
          <h2>{modalMode === 'create' ? 'Create Product' : 'Edit Product'}</h2>
          <button onClick={() => setIsModalOpen(false)} className="modal-close"><X size={18} /></button>
        </div>

        {formError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)',
            color: 'var(--accent-crimson)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem'
          }}>
            <AlertCircle size={15} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Product Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. AC3 CODM GL"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              placeholder="Product features, compatibility..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: '60px' }}
              required
            />
          </div>

          {/* Runtime Platform Selection */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Runtime Platform</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {(['Android', 'iOS', 'PC'] as const).map((plat) => {
                const isSelected = platform === plat;
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setPlatform(plat)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid #e50914' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(229, 9, 20, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {plat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image Upload & Logo Selector */}
          <ImageUploader value={image} onChange={setImage} />

          {/* Delivery Method Selection */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>Delivery Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeliveryType('instant')}
                style={{
                  padding: '9px', borderRadius: '8px',
                  border: deliveryType === 'instant' ? '1px solid #e50914' : '1px solid var(--border-color)',
                  background: deliveryType === 'instant' ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
                  color: deliveryType === 'instant' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Zap size={14} /> Instant Key
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('telegram')}
                style={{
                  padding: '9px', borderRadius: '8px',
                  border: deliveryType === 'telegram' ? '1px solid #0088cc' : '1px solid var(--border-color)',
                  background: deliveryType === 'telegram' ? 'rgba(0, 136, 204, 0.15)' : 'transparent',
                  color: deliveryType === 'telegram' ? '#29b6f6' : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Send size={14} /> Telegram DM
              </button>
            </div>
          </div>

          {/* Pricing Structure with Presets */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Pricing Structure</span>
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={handleAddPriceOption}>
                <PlusCircle size={12} /> Add Row
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {['1 Day', '7 Days', '15 Days', '30 Days', '60 Days', 'Lifetime'].map(dur => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setPrices([...prices, { duration: dur, price: 10 }])}
                  style={{
                    padding: '3px 7px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  + {dur}
                </button>
              ))}
            </div>

            {prices.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 7 Days"
                  value={opt.duration}
                  onChange={(e) => handlePriceOptionChange(idx, 'duration', e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.82rem' }}
                  required
                />
                <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={opt.price}
                    onChange={(e) => handlePriceOptionChange(idx, 'price', e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePriceOption(idx)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-crimson)', display: 'flex' }}
                >
                  <MinusCircle size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="prod-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#e50914' }}
            />
            <label htmlFor="prod-active" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Active in Storefront</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="btn btn-primary"
              style={{ background: '#e50914', border: 'none', fontWeight: 800, padding: '10px 18px', borderRadius: '8px' }}
            >
              {formSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
