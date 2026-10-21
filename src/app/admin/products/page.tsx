'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, X, PlusCircle, MinusCircle, AlertCircle, 
  KeyRound, Key, Search, ShoppingBag, Send, Zap, Package, 
  LayoutGrid, List, CheckCircle, Info, ExternalLink, Sparkles
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
    setIsActive(prod.isActive !== false);
    setDeliveryType(prod.deliveryType || 'instant');
    setTelegramUsername(prod.telegramUsername || 'Sylvieofficeal');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openStockViewModal = async (prod: ProductType) => {
    if (!prod._id) return;
    setSelectedProductForStock(prod);
    setIsStockViewOpen(true);
    setLoadingKeys(true);
    setStockSearchQuery('');

    try {
      const res = await fetch(`/api/admin/keys?productId=${prod._id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProductKeys(data.keys || []);
        }
      }
    } catch (err) {
      console.error('Failed to load keys for product:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleAddPriceOption = () => {
    setPrices([...prices, { duration: '', price: 0 }]);
  };

  const handleRemovePriceOption = (index: number) => {
    if (prices.length <= 1) {
      alert('Product must have at least one pricing option.');
      return;
    }
    setPrices(prices.filter((_, i) => i !== index));
  };

  const handlePriceOptionChange = (index: number, field: 'duration' | 'price', value: string) => {
    const updated = [...prices];
    if (field === 'price') {
      updated[index].price = parseFloat(value) || 0;
    } else {
      updated[index].duration = value;
    }
    setPrices(updated);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    for (const opt of prices) {
      if (!opt.duration.trim()) {
        setFormError('Duration label cannot be blank.');
        return;
      }
      if (opt.price < 0) {
        setFormError('Price cannot be negative.');
        return;
      }
    }

    setFormSubmitting(true);

    try {
      const payload = {
        id: currentId,
        name: name.trim(),
        description: description.trim(),
        platform,
        image: image.trim(),
        prices,
        isActive,
        deliveryType,
        telegramUsername: deliveryType === 'telegram' ? (telegramUsername.trim() || 'Sylvieofficeal') : undefined
      };

      const res = await fetch('/api/admin/products', {
        method: modalMode === 'create' ? 'POST' : 'PUT',
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
      setFormError(err.message || 'Something went wrong');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete "${prodName}"? This action cannot be undone.`)) {
      return;
    }

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
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto', color: '#f8fafc' }}>
      
      {/* 1. TOP HEADER & CREATE BUTTON */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '26px',
        flexWrap: 'wrap',
        gap: '16px',
        background: '#201a3b',
        border: '1px solid rgba(144, 71, 255, 0.2)',
        borderRadius: '20px',
        padding: '24px 28px',
        boxShadow: '0 12px 32px rgba(10, 8, 20, 0.45)',
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'rgba(144, 71, 255, 0.16)',
            border: '1px solid rgba(144, 71, 255, 0.35)',
            color: '#c084fc',
            fontSize: '0.7rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px'
          }}>
            <Sparkles size={11} /> Admin Catalog Studio
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 850,
            background: 'linear-gradient(180deg, #ffffff 0%, #d8b4fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            Product Catalog
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#a59ec1', marginTop: '4px', margin: 0 }}>
            Manage games, cheats, pricing tiers, Cloudinary cover art, and real-time inventory.
          </p>
        </div>

        <button 
          onClick={openCreateModal}
          style={{
            background: 'linear-gradient(135deg, #9047ff 0%, #6e27d8 100%)',
            border: 'none',
            color: '#fff',
            padding: '12px 22px',
            borderRadius: '999px',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(144, 71, 255, 0.4)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Plus size={18} />
          Create Product
        </button>
      </div>

      {/* 2. OVERVIEW STAT CARDS (Purple theme) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: '#201a3b',
          border: '1px solid rgba(144, 71, 255, 0.16)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(144, 71, 255, 0.16)',
            border: '1px solid rgba(144, 71, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a855f7'
          }}>
            <Package size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#9d94b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Products
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#ffffff', marginTop: '2px' }}>
              {products.length} Items
            </div>
          </div>
        </div>

        <div style={{
          background: '#201a3b',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <Key size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#9d94b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Available Stock
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#34d399', marginTop: '2px' }}>
              {totalStockKeysCount} Keys
            </div>
          </div>
        </div>

        <div style={{
          background: '#201a3b',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Zap size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#9d94b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fulfillment Type
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
              {instantProductsCount} Instant &bull; {telegramProductsCount} TG
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER CONTROLS BAR (Pill styled) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        background: '#201a3b',
        border: '1px solid rgba(144, 71, 255, 0.18)',
        borderRadius: '16px',
        padding: '12px 18px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {/* Search Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#161226',
          border: '1px solid rgba(144, 71, 255, 0.25)',
          borderRadius: '999px',
          padding: '8px 16px',
          flex: 1,
          minWidth: '240px'
        }}>
          <Search size={16} color="#a59ec1" />
          <input
            type="text"
            placeholder="Search products by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.88rem',
              outline: 'none',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#a59ec1', cursor: 'pointer', display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '2px 0' }}>
          {(['all', 'Android', 'iOS', 'PC'] as const).map((plat) => {
            const active = platformFilter === plat;
            return (
              <button
                key={plat}
                type="button"
                onClick={() => setPlatformFilter(plat)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  background: active ? '#9047ff' : '#28204b',
                  border: active ? '1px solid #9047ff' : '1px solid rgba(144, 71, 255, 0.2)',
                  color: active ? '#ffffff' : '#bfa2db',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {plat === 'all' ? 'All Platforms' : plat}
              </button>
            );
          })}

          <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 2px' }} />

          {(['all', 'instant', 'telegram'] as const).map((type) => {
            const active = deliveryFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setDeliveryFilter(type)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  background: active ? '#9047ff' : '#28204b',
                  border: active ? '1px solid #9047ff' : '1px solid rgba(144, 71, 255, 0.2)',
                  color: active ? '#ffffff' : '#bfa2db',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {type === 'all' ? 'All Delivery' : type === 'instant' ? '⚡ Instant' : '✈️ Telegram'}
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div style={{
          display: 'flex',
          background: '#161226',
          borderRadius: '999px',
          padding: '4px',
          border: '1px solid rgba(144, 71, 255, 0.25)'
        }}>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              background: viewMode === 'grid' ? '#9047ff' : 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              background: viewMode === 'table' ? '#9047ff' : 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            <List size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(144, 71, 255, 0.2)',
            borderTopColor: '#9047ff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      ) : products.length === 0 ? (
        <div style={{
          background: '#201a3b',
          border: '1px solid rgba(144, 71, 255, 0.2)',
          borderRadius: '20px',
          padding: '60px 24px',
          textAlign: 'center',
          color: '#bfa2db'
        }}>
          <Package size={44} style={{ margin: '0 auto 14px auto', color: '#9047ff' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>No products in catalog</h3>
          <p style={{ fontSize: '0.88rem', marginTop: '6px' }}>Click "+ Create Product" to add your first game cheat or license.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{
          background: '#201a3b',
          border: '1px solid rgba(144, 71, 255, 0.2)',
          borderRadius: '20px',
          padding: '60px 24px',
          textAlign: 'center',
          color: '#bfa2db'
        }}>
          <p>No products match your search or filter criteria.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= Royal Purple Game Cards Grid ================= */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: '20px',
        }}>
          {filteredProducts.map((prod) => {
            const platform = detectPlatform(prod);
            const thumbnail = getProductThumbnail(prod);
            const isTg = prod.deliveryType === 'telegram';
            const stockCount = getProductStockCount(prod._id);
            const lowestPrice = prod.prices.length > 0 ? Math.min(...prod.prices.map(p => p.price)) : 0;

            return (
              <div
                key={prod._id}
                style={{
                  background: '#201a3b',
                  border: '1px solid rgba(144, 71, 255, 0.18)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4)',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(144, 71, 255, 0.55)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 16px 36px rgba(144, 71, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(144, 71, 255, 0.18)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.4)';
                }}
              >
                <div>
                  {/* Poster / Cover Image */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '180px',
                    background: '#151025',
                    overflow: 'hidden'
                  }}>
                    <ProductImage
                      src={thumbnail}
                      alt={prod.name}
                      width={400}
                      height={240}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease'
                      }}
                    />

                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, #201a3b 0%, rgba(32, 26, 59, 0.4) 60%, transparent 100%)'
                    }} />

                    {/* Platform Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(23, 19, 42, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(144, 71, 255, 0.35)',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: platform === 'Android' ? '#34d399' : platform === 'iOS' ? '#38bdf8' : '#a855f7',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{platform}</span>
                    </div>

                    {/* Active Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: prod.isActive ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)',
                      backdropFilter: 'blur(8px)',
                      padding: '4px 9px',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#ffffff',
                    }}>
                      {prod.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </div>

                    {/* Delivery Pill at Bottom Right of Media */}
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '12px',
                      background: isTg ? 'rgba(56, 189, 248, 0.9)' : 'rgba(144, 71, 255, 0.9)',
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {isTg ? <Send size={10} /> : <Zap size={10} />}
                      <span>{isTg ? 'Telegram DM' : 'Instant Key'}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '16px 18px 12px 18px' }}>
                    <h3 style={{
                      fontSize: '1.15rem',
                      fontWeight: 850,
                      color: '#ffffff',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {prod.name}
                    </h3>

                    <p style={{
                      fontSize: '0.8rem',
                      color: '#a59ec1',
                      lineHeight: '1.35',
                      height: '34px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      marginBottom: '14px'
                    }}>
                      {prod.description || 'No description provided.'}
                    </p>

                    {/* Stock Status Box */}
                    <div style={{
                      background: isTg ? 'rgba(56, 189, 248, 0.1)' : stockCount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${isTg ? 'rgba(56, 189, 248, 0.25)' : stockCount > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      borderRadius: '10px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginBottom: '12px'
                    }}>
                      <span style={{ color: '#9d94b8', fontWeight: 600 }}>Inventory:</span>
                      {isTg ? (
                        <span style={{ color: '#38bdf8', fontWeight: 800 }}>Manual via @{prod.telegramUsername || 'Sylvieofficeal'}</span>
                      ) : (
                        <span style={{ color: stockCount > 0 ? '#34d399' : '#f87171', fontWeight: 850 }}>
                          {stockCount > 0 ? `✓ ${stockCount} keys left` : '⚠ Out of stock'}
                        </span>
                      )}
                    </div>

                    {/* Pricing Tiers Pills */}
                    <div style={{
                      background: '#18132e',
                      border: '1px solid rgba(144, 71, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: '0.7rem', color: '#9d94b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        Pricing Tiers
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {prod.prices.map((p, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: '#28204b',
                              border: '1px solid rgba(144, 71, 255, 0.22)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span style={{ color: '#c084fc' }}>{p.duration}:</span>
                            <strong style={{ color: '#facc15' }}>₱{p.price.toFixed(2)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{
                  padding: '14px 18px',
                  borderTop: '1px solid rgba(144, 71, 255, 0.15)',
                  background: 'rgba(23, 19, 42, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  {!isTg && (
                    <button
                      type="button"
                      onClick={() => openStockViewModal(prod)}
                      style={{
                        flex: 1,
                        background: '#28204b',
                        border: '1px solid rgba(144, 71, 255, 0.3)',
                        color: '#c084fc',
                        borderRadius: '10px',
                        padding: '9px 10px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(144, 71, 255, 0.25)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#28204b')}
                    >
                      <KeyRound size={14} />
                      Keys
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditModal(prod)}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #9047ff 0%, #6e27d8 100%)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '9px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(144, 71, 255, 0.3)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(prod._id!, prod.name)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      borderRadius: '10px',
                      padding: '9px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    title="Delete Product"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= Royal Purple Table List View ================= */
        <div style={{
          background: '#201a3b',
          border: '1px solid rgba(144, 71, 255, 0.18)',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-saas" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#18132e', borderBottom: '1px solid rgba(144, 71, 255, 0.2)' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', color: '#bfa2db', fontSize: '0.8rem', fontWeight: 700 }}>Product</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', color: '#bfa2db', fontSize: '0.8rem', fontWeight: 700 }}>Fulfillment</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', color: '#bfa2db', fontSize: '0.8rem', fontWeight: 700 }}>Stock Left</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', color: '#bfa2db', fontSize: '0.8rem', fontWeight: 700 }}>Pricing Tiers</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', color: '#bfa2db', fontSize: '0.8rem', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', color: '#bfa2db', fontSize: '0.8rem', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => {
                  const stockCount = getProductStockCount(prod._id);
                  const isTg = prod.deliveryType === 'telegram';
                  const thumbnail = getProductThumbnail(prod);
                  const platform = detectPlatform(prod);

                  return (
                    <tr
                      key={prod._id}
                      style={{
                        borderBottom: '1px solid rgba(144, 71, 255, 0.1)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(144, 71, 255, 0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ProductImage
                            src={thumbnail}
                            alt=""
                            width={72}
                            height={72}
                            style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>{prod.name}</div>
                            <span style={{
                              display: 'inline-block',
                              marginTop: '2px',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              background: '#28204b',
                              color: platform === 'Android' ? '#34d399' : platform === 'iOS' ? '#38bdf8' : '#c084fc'
                            }}>
                              {platform}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {isTg ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 9px',
                            borderRadius: '999px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            <Send size={10} /> Telegram DM
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 9px',
                            borderRadius: '999px',
                            background: 'rgba(144, 71, 255, 0.18)',
                            color: '#c084fc',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            <Zap size={10} /> Instant
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {isTg ? (
                          <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700 }}>Manual DM</span>
                        ) : (
                          <span style={{
                            padding: '4px 9px',
                            borderRadius: '999px',
                            fontSize: '0.74rem',
                            fontWeight: 850,
                            background: stockCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: stockCount > 0 ? '#34d399' : '#f87171'
                          }}>
                            {stockCount} Keys Left
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {prod.prices.map((p, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#28204b',
                                border: '1px solid rgba(144, 71, 255, 0.2)',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                color: '#e2e8f0'
                              }}
                            >
                              {p.duration}: <strong style={{ color: '#facc15' }}>₱{p.price.toFixed(2)}</strong>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '4px 9px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: prod.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: prod.isActive ? '#34d399' : '#f87171'
                        }}>
                          {prod.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {!isTg && (
                            <button
                              onClick={() => openStockViewModal(prod)}
                              title="View Stocked Keys"
                              style={{
                                background: '#28204b',
                                border: '1px solid rgba(144, 71, 255, 0.25)',
                                color: '#c084fc',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <KeyRound size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(prod)}
                            title="Edit Product"
                            style={{
                              background: '#9047ff',
                              border: 'none',
                              color: '#ffffff',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(prod._id!, prod.name)}
                            title="Delete Product"
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#f87171',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
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
          <div style={{ background: '#1c1634', borderRadius: '18px', padding: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(144, 71, 255, 0.2)',
                  color: '#c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: '#fff', margin: 0 }}>Stocked License Keys</h2>
                  <p style={{ fontSize: '0.82rem', color: '#a59ec1', margin: '2px 0 0 0' }}>{selectedProductForStock.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsStockViewOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#a59ec1', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Search by key code, duration, or reseller..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#120d24',
                  border: '1px solid rgba(144, 71, 255, 0.25)',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              border: '1px solid rgba(144, 71, 255, 0.2)',
              borderRadius: '12px',
              overflow: 'hidden',
              maxHeight: '360px',
              overflowY: 'auto',
              background: '#151027'
            }}>
              {loadingKeys ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#a59ec1' }}>Loading keys...</div>
              ) : filteredStockKeys.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#a59ec1', fontSize: '0.85rem' }}>
                  No keys found for this product.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#1f183b', borderBottom: '1px solid rgba(144, 71, 255, 0.2)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#c084fc' }}>Key Code</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#c084fc' }}>Duration</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#c084fc' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#c084fc' }}>Reseller</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#c084fc' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockKeys.map((k) => (
                      <tr key={k._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <code style={{ background: '#28204b', padding: '3px 8px', borderRadius: '6px', color: '#fff', fontSize: '0.78rem' }}>
                              {k.key}
                            </code>
                            <CopyButton text={k.key} size={12} />
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 7px', borderRadius: '999px', background: 'rgba(144, 71, 255, 0.2)', color: '#c084fc', fontSize: '0.72rem', fontWeight: 700 }}>
                            {k.duration}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: k.isSold ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: k.isSold ? '#f87171' : '#34d399'
                          }}>
                            {k.isSold ? 'Sold' : 'Available'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#e2e8f0' }}>{k.resellerId?.username || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#9d94b8', fontSize: '0.75rem' }}>
                          {new Date(k.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setIsStockViewOpen(false)}
                style={{
                  background: '#28204b',
                  border: '1px solid rgba(144, 71, 255, 0.25)',
                  color: '#fff',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. CREATE / EDIT PRODUCT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="540px">
        <div style={{ background: '#1c1634', borderRadius: '18px', padding: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#fff', margin: 0 }}>
              {modalMode === 'create' ? 'Create New Product' : 'Edit Product'}
            </h2>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#a59ec1', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {formError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              marginBottom: '14px'
            }}>
              <AlertCircle size={15} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', marginBottom: '6px' }}>
                Product Name
              </label>
              <input
                type="text"
                placeholder="e.g. AC3 CODM GL"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#120d24',
                  border: '1px solid rgba(144, 71, 255, 0.25)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                placeholder="Product highlights, cheat features, instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  background: '#120d24',
                  border: '1px solid rgba(144, 71, 255, 0.25)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  minHeight: '64px',
                  resize: 'vertical'
                }}
                required
              />
            </div>

            {/* Runtime Platform Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', marginBottom: '6px' }}>
                Target Platform
              </label>
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
                        borderRadius: '10px',
                        border: isSelected ? '1px solid #9047ff' : '1px solid rgba(144, 71, 255, 0.2)',
                        background: isSelected ? 'rgba(144, 71, 255, 0.25)' : '#120d24',
                        color: isSelected ? '#ffffff' : '#a59ec1',
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

            {/* Cloudinary Cover Art & Media Uploader */}
            <ImageUploader value={image} onChange={setImage} />

            {/* Fulfillment Mode */}
            <div style={{
              border: '1px solid rgba(144, 71, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              background: '#120d24'
            }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', marginBottom: '8px' }}>
                Fulfillment Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDeliveryType('instant')}
                  style={{
                    padding: '9px',
                    borderRadius: '10px',
                    border: deliveryType === 'instant' ? '1px solid #9047ff' : '1px solid rgba(144, 71, 255, 0.2)',
                    background: deliveryType === 'instant' ? 'rgba(144, 71, 255, 0.25)' : 'transparent',
                    color: deliveryType === 'instant' ? '#fff' : '#a59ec1',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Zap size={14} /> Instant Key
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('telegram')}
                  style={{
                    padding: '9px',
                    borderRadius: '10px',
                    border: deliveryType === 'telegram' ? '1px solid #38bdf8' : '1px solid rgba(144, 71, 255, 0.2)',
                    background: deliveryType === 'telegram' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: deliveryType === 'telegram' ? '#38bdf8' : '#a59ec1',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={14} /> Telegram DM
                </button>
              </div>

              {deliveryType === 'telegram' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#9d94b8', marginBottom: '4px' }}>
                    Telegram Support Handle (without @)
                  </label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="e.g. Sylvieofficeal"
                    style={{
                      width: '100%',
                      background: '#1c1634',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Pricing Tiers Builder */}
            <div style={{
              border: '1px solid rgba(144, 71, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              background: '#120d24'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c084fc' }}>Pricing Tiers</span>
                <button
                  type="button"
                  onClick={handleAddPriceOption}
                  style={{
                    background: '#28204b',
                    border: '1px solid rgba(144, 71, 255, 0.3)',
                    color: '#c084fc',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <PlusCircle size={12} /> Add Row
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {['1 Day', '7 Days', '15 Days', '30 Days', '60 Days', 'Lifetime'].map(dur => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setPrices([...prices, { duration: dur, price: 10 }])}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(144, 71, 255, 0.12)',
                      border: '1px solid rgba(144, 71, 255, 0.25)',
                      color: '#e2e8f0',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer'
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
                    placeholder="e.g. 7 Days"
                    value={opt.duration}
                    onChange={(e) => handlePriceOptionChange(idx, 'duration', e.target.value)}
                    style={{
                      flex: 1,
                      background: '#1c1634',
                      border: '1px solid rgba(144, 71, 255, 0.25)',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                    required
                  />
                  <div style={{ width: '110px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#c084fc', fontSize: '0.85rem' }}>₱</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={opt.price}
                      onChange={(e) => handlePriceOptionChange(idx, 'price', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1c1634',
                        border: '1px solid rgba(144, 71, 255, 0.25)',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        color: '#fff',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePriceOption(idx)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex' }}
                  >
                    <MinusCircle size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Active Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="prod-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#9047ff' }}
              />
              <label htmlFor="prod-active" style={{ fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                Active in Storefront
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: '#28204b',
                  border: '1px solid rgba(144, 71, 255, 0.25)',
                  color: '#fff',
                  padding: '9px 18px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #9047ff 0%, #6e27d8 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '9px 22px',
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(144, 71, 255, 0.35)'
                }}
              >
                {formSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Product' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

    </div>
  );
}
