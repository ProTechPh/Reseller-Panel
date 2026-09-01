'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, PlusCircle, MinusCircle, AlertCircle, KeyRound, Key, Search, ShoppingBag, Send, Zap } from 'lucide-react';
import Modal from '@/components/Modal';
import CopyButton from '@/components/CopyButton';

interface PriceOption {
  duration: string;
  price: number;
}

interface ProductType {
  _id?: string;
  name: string;
  description: string;
  image?: string;
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

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [keys, setKeys] = useState<KeyType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // View Stock Modal State
  const [isStockViewOpen, setIsStockViewOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<ProductType | null>(null);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  
  // Form State
  const [currentId, setCurrentId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prices, setPrices] = useState<PriceOption[]>([{ duration: '30 Days', price: 10 }]);
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [deliveryType, setDeliveryType] = useState<'instant' | 'telegram'>('instant');
  const [telegramUsername, setTelegramUsername] = useState('Sylvieofficeal');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Load Products and Keys
  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, keysRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/keys'),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success) setProducts(prodData.products);
      }

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        if (keysData.success) setKeys(keysData.keys);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
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
    setPrices(prod.prices.length > 0 ? prod.prices : [{ duration: '30 Days', price: 10 }]);
    setImage(prod.image || '');
    setIsActive(prod.isActive);
    setDeliveryType(prod.deliveryType || 'instant');
    setTelegramUsername(prod.telegramUsername || 'Sylvieofficeal');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openStockViewModal = (prod: ProductType) => {
    setSelectedProductForStock(prod);
    setStockSearchQuery('');
    setIsStockViewOpen(true);
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
        name,
        description,
        prices,
        image,
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

  const getProductStockCount = (productId?: string) => {
    if (!productId) return 0;
    return keys.filter((k) => k.productId?._id === productId && !k.isSold).length;
  };

  const productStockKeys = selectedProductForStock
    ? keys.filter((k) => k.productId?._id === selectedProductForStock._id)
    : [];

  const filteredProductStockKeys = productStockKeys.filter((k) => {
    const q = stockSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return k.key.toLowerCase().includes(q) || k.duration.toLowerCase().includes(q) || (k.resellerId?.username && k.resellerId.username.toLowerCase().includes(q));
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Product Catalog</h1>
          <p className="subtitle">Manage products, pricing tiers, and inspect stocked license keys.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          Create Product
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid rgba(255,255,255,0.05)',
            borderTopColor: 'var(--accent-indigo)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No products listed yet. Click "Create Product" to add your first product.
        </div>
      ) : (
        <div className="table-card">
          <div className="table-scroller">
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Description</th>
                  <th>Pricing Options</th>
                  <th>Available Stock / Method</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
                  const stockCount = getProductStockCount(prod._id);
                  const isTg = prod.deliveryType === 'telegram';
                  return (
                    <tr key={prod._id}>
                      <td style={{ fontWeight: 700 }}>
                        <div>{prod.name}</div>
                        <div style={{ marginTop: '4px' }}>
                          {isTg ? (
                            <span className="badge badge-yellow" style={{ fontSize: '0.65rem', background: 'rgba(34, 158, 217, 0.15)', color: '#29b6f6', border: '1px solid rgba(34, 158, 217, 0.3)' }}>
                              <Send size={9} style={{ marginRight: '3px' }} />
                              TG: @{prod.telegramUsername || 'Sylvieofficeal'}
                            </span>
                          ) : (
                            <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                              <Zap size={9} style={{ marginRight: '3px' }} />
                              Instant Key
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '260px' }}>
                        {prod.description}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {prod.prices.map((p, idx) => (
                            <span key={idx} className="badge badge-indigo">
                              {p.duration}: ₱{p.price.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {isTg ? (
                          <span className="badge badge-yellow" style={{ fontWeight: 600, background: 'rgba(34, 158, 217, 0.12)', color: '#29b6f6', border: '1px solid rgba(34, 158, 217, 0.25)' }}>
                            <Send size={11} style={{ marginRight: '4px' }} />
                            Telegram DM
                          </span>
                        ) : (
                          <span className={stockCount > 0 ? "badge badge-emerald" : "badge badge-crimson"} style={{ fontWeight: 700 }}>
                            <Key size={11} style={{ marginRight: '4px' }} />
                            {stockCount} Available
                          </span>
                        )}
                      </td>
                      <td>
                        {prod.isActive ? (
                          <span className="badge badge-emerald">Active</span>
                        ) : (
                          <span className="badge badge-crimson">Inactive</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {!isTg && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                              onClick={() => openStockViewModal(prod)}
                              title="View Stocked Keys">
                              <KeyRound size={13} style={{ color: 'var(--accent-orange)' }} />
                              View Keys
                            </button>
                          )}
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 10px' }} 
                            onClick={() => openEditModal(prod)}
                            title="Edit Product">
                            <Edit2 size={13} />
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '6px 10px', border: 'none' }} 
                            onClick={() => handleDeleteProduct(prod._id!, prod.name)}
                            title="Delete Product">
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

      {/* View Product Stocked Keys Modal */}
      <Modal isOpen={isStockViewOpen && !!selectedProductForStock} onClose={() => setIsStockViewOpen(false)} maxWidth="700px">
        {selectedProductForStock && (
          <>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)'
                }}>
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Stocked License Keys</h2>
                  <p className="subtitle" style={{ margin: 0, fontSize: '0.8rem' }}>
                    Product: <strong style={{ color: 'white' }}>{selectedProductForStock.name}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsStockViewOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            {/* Search Filter */}
            <div className="input-wrapper" style={{ marginTop: '8px' }}>
              <Search className="input-icon" size={15} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search key code, duration..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Stocked Keys Table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: '380px', overflowY: 'auto' }}>
              {productStockKeys.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No license keys stocked for {selectedProductForStock.name}. Click "Stock Keys (Bulk)" in Manage Keys to add stock.
                </div>
              ) : filteredProductStockKeys.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No keys matched "{stockSearchQuery}".
                </div>
              ) : (
                <table className="table-saas" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>License Key Code</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Purchased By</th>
                      <th>Date Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProductStockKeys.map((k) => (
                      <tr key={k._id}>
                        <td>
                          <div className="key-display">
                            <code className="key-tag" style={{ fontSize: '0.78rem' }}>{k.key}</code>
                            <CopyButton text={k.key} size={12} />
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>{k.duration}</span>
                        </td>
                        <td>
                          {k.isSold ? (
                            <span className="badge badge-crimson" style={{ fontSize: '0.7rem' }}>Sold</span>
                          ) : (
                            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>Available</span>
                          )}
                        </td>
                        <td>
                          {k.isSold ? (
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{k.resellerId?.username || 'Unknown'}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          {new Date(k.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsStockViewOpen(false)}>
                Close
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Edit / Create Product Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="500px">
        <div className="modal-header">
          <h2>{modalMode === 'create' ? 'Create Product' : 'Edit Product'}</h2>
          <button onClick={() => setIsModalOpen(false)} className="modal-close">
            <X size={18} />
          </button>
        </div>

        {formError && (
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
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="prod-name">Product Name</label>
            <input 
              id="prod-name"
              type="text" 
              className="form-input" 
              placeholder="e.g. Apex Legends VIP Hack"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="prod-desc">Description</label>
            <textarea 
              id="prod-desc"
              className="form-input" 
              placeholder="Describe product features..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: '60px', resize: 'vertical' }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="prod-image">Image Path (e.g. /images/mlbb.png)</label>
            <input 
              id="prod-image"
              type="text" 
              className="form-input" 
              placeholder="e.g. /images/mlbb.png"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>

          {/* Delivery Method Selection */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '14px', background: 'rgba(255,255,255,0.01)' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Delivery Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: deliveryType === 'telegram' ? '12px' : '0' }}>
              <button
                type="button"
                onClick={() => setDeliveryType('instant')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: deliveryType === 'instant' ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                  background: deliveryType === 'instant' ? 'rgba(255, 94, 0, 0.1)' : 'transparent',
                  color: deliveryType === 'instant' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'var(--transition)',
                }}
              >
                <Zap size={14} />
                Instant Key Stock
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('telegram')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: deliveryType === 'telegram' ? '1px solid #0088cc' : '1px solid var(--border-color)',
                  background: deliveryType === 'telegram' ? 'rgba(0, 136, 204, 0.15)' : 'transparent',
                  color: deliveryType === 'telegram' ? '#29b6f6' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'var(--transition)',
                }}
              >
                <Send size={14} />
                Telegram DM
              </button>
            </div>

            {deliveryType === 'telegram' && (
              <div>
                <label className="form-label" htmlFor="prod-tg" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Telegram Username / Admin Contact
                </label>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@</span>
                  <input
                    id="prod-tg"
                    type="text"
                    className="form-input"
                    placeholder="Sylvieofficeal"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ''))}
                    style={{ paddingLeft: '28px', fontSize: '0.85rem' }}
                    required={deliveryType === 'telegram'}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Resellers will be directed to message <strong>@{telegramUsername.replace(/^@/, '') || 'Sylvieofficeal'}</strong> on Telegram for key delivery.
                </span>
              </div>
            )}
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '14px', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pricing Structure</span>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={handleAddPriceOption}>
                <PlusCircle size={12} /> Add Row
              </button>
            </div>

            {prices.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 30 Days"
                    value={opt.duration}
                    onChange={(e) => handlePriceOptionChange(idx, 'duration', e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                    required
                  />
                </div>
                <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>₱</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className="form-input" 
                    placeholder="0.00"
                    value={opt.price}
                    onChange={(e) => handlePriceOptionChange(idx, 'price', e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                    required
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemovePriceOption(idx)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-crimson)', display: 'flex' }}
                  title="Remove Row">
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
              style={{ width: '14px', height: '14px', accentColor: 'var(--accent-indigo)' }}
            />
            <label htmlFor="prod-active" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)' }}>
              Active and purchasable by resellers
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
