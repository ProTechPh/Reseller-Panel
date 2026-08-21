'use client';

import React, { useEffect, useState } from 'react';
import { Plus, X, AlertCircle, Trash2, KeyRound, Check, FileText, Search, Key, ShoppingBag, Box } from 'lucide-react';
import Modal from '@/components/Modal';
import CopyButton from '@/components/CopyButton';

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

interface ProductType {
  _id: string;
  name: string;
  prices: { duration: string; price: number }[];
}

export default function AdminKeys() {
  const [keys, setKeys] = useState<KeyType[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [rawKeysInput, setRawKeysInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [keysRes, productsRes] = await Promise.all([
        fetch('/api/admin/keys'),
        fetch('/api/admin/products'),
      ]);

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        if (keysData.success) setKeys(keysData.keys);
      }

      if (productsRes.ok) {
        const prodData = await productsRes.json();
        if (prodData.success) {
          setProducts(prodData.products);
        }
      }
    } catch (err) {
      console.error('Failed to load keys data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update selected product's first duration option automatically when product changes
  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find((p) => p._id === selectedProductId);
      if (prod && prod.prices.length > 0) {
        setSelectedDuration(prod.prices[0].duration);
      } else {
        setSelectedDuration('');
      }
    } else {
      setSelectedDuration('');
    }
  }, [selectedProductId, products]);

  const openStockModal = () => {
    setSelectedProductId(products[0]?._id || '');
    setRawKeysInput('');
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedProductId) return setFormError('Please select a product.');
    if (!selectedDuration) return setFormError('Please select a duration option.');
    if (!rawKeysInput.trim()) return setFormError('Please enter at least one license key.');

    // Split input by newlines or commas, filter out empty values
    const parsedKeys = rawKeysInput
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (parsedKeys.length === 0) {
      return setFormError('No valid keys found in your input.');
    }

    setFormSubmitting(true);

    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          duration: selectedDuration,
          keys: parsedKeys,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to stock keys');
      }

      setFormSuccess(`Successfully loaded ${data.insertedCount} keys. ${data.skippedCount > 0 ? `Skipped ${data.skippedCount} duplicate keys.` : ''}`);
      setRawKeysInput('');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while uploading.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteKey = async (id: string, keyString: string) => {
    if (!confirm(`Are you sure you want to delete license key "${keyString}" from stock?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/keys?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete key');
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete key');
    }
  };

  // Filter keys list based on dropdown state and search input
  const filteredKeys = keys.filter((k) => {
    const statusMatch = 
      statusFilter === 'all' || 
      (statusFilter === 'available' && !k.isSold) || 
      (statusFilter === 'sold' && k.isSold);
      
    const productMatch =
      productFilter === 'all' ||
      k.productId?._id === productFilter;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query || 
      k.key.toLowerCase().includes(query) || 
      k.productId?.name?.toLowerCase().includes(query) ||
      (k.resellerId?.username && k.resellerId.username.toLowerCase().includes(query));

    return statusMatch && productMatch && matchesSearch;
  });

  const totalAvailableCount = keys.filter((k) => !k.isSold).length;
  const totalSoldCount = keys.filter((k) => k.isSold).length;
  const totalInventoryCount = keys.length;

  const selectedProductObj = products.find((p) => p._id === selectedProductId);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1>License Key Inventory</h1>
          <p className="subtitle">Upload, monitor, view, and manage your stocked license keys.</p>
        </div>
        <button className="btn btn-primary" onClick={openStockModal} disabled={products.length === 0}>
          <Plus size={16} />
          Stock Keys (Bulk)
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
            <Key size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Stock</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
              {totalAvailableCount} Keys
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 94, 0, 0.12)', border: '1px solid rgba(255, 94, 0, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-orange)' }}>
            <ShoppingBag size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sold Keys</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-orange)', marginTop: '2px' }}>
              {totalSoldCount} Keys
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
            <Box size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Inventory</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalInventoryCount} Keys
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by key, product name, or reseller..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter by Product */}
        <div style={{ width: '190px' }}>
          <select
            className="form-input"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            style={{ background: 'var(--bg-sidebar)' }}
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ width: '170px' }}>
          <select 
            className="form-input" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ background: 'var(--bg-sidebar)' }}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available / Stocked</option>
            <option value="sold">Sold Keys</option>
          </select>
        </div>
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
      ) : keys.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {products.length === 0 
            ? 'Please add products in the Product Catalog first before stocking license keys.' 
            : 'No license keys have been stocked yet. Click "Stock Keys (Bulk)" to add inventory.'
          }
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No license keys match your filters.
        </div>
      ) : (
        <div className="table-card">
          <div className="table-scroller">
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>License Key Code</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Reseller / Price</th>
                  <th>Stocked Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map((keyItem) => (
                  <tr key={keyItem._id}>
                    <td style={{ fontWeight: 700 }}>
                      {keyItem.productId?.name || <span style={{ color: 'var(--text-muted)' }}>Deleted Product</span>}
                    </td>
                    <td>
                      <div className="key-display">
                        <code className="key-tag">{keyItem.key}</code>
                        <CopyButton text={keyItem.key} size={12} />
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-indigo">{keyItem.duration}</span>
                    </td>
                    <td>
                      {keyItem.isSold ? (
                        <span className="badge badge-crimson">Sold</span>
                      ) : (
                        <span className="badge badge-emerald">Available</span>
                      )}
                    </td>
                    <td>
                      {keyItem.isSold ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{keyItem.resellerId?.username || 'Unknown'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                            ₱{keyItem.price?.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(keyItem.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 10px', border: 'none' }}
                        disabled={keyItem.isSold}
                        onClick={() => handleDeleteKey(keyItem._id, keyItem.key)}
                        title={keyItem.isSold ? "Cannot delete sold keys" : "Delete key from stock"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Keys Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="500px">
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={18} color="var(--accent-indigo)" />
            Stock License Keys
          </h2>
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

        {formSuccess && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            color: 'var(--accent-emerald)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
          }}>
            <Check size={15} />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Select Product */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="stock-product">Product</label>
            <select
              id="stock-product"
              className="form-input"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={{ background: 'var(--bg-sidebar)' }}
              required
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Select Pricing Duration Option */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="stock-duration">License Duration</label>
            <select
              id="stock-duration"
              className="form-input"
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              style={{ background: 'var(--bg-sidebar)' }}
              required
            >
              {selectedProductObj?.prices.map((p) => (
                <option key={p.duration} value={p.duration}>
                  {p.duration} — (₱{p.price.toFixed(2)})
                </option>
              )) || <option value="">No durations configured</option>}
            </select>
          </div>

          {/* Paste Keys Textarea */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="stock-keys">Paste Keys (Bulk)</label>
            <textarea
              id="stock-keys"
              className="form-input"
              rows={6}
              placeholder="Paste your license keys here. Separate keys by pressing enter (new lines) or using commas.&#10;e.g.&#10;KEY-ABCD-1234&#10;KEY-EFGH-5678"
              value={rawKeysInput}
              onChange={(e) => setRawKeysInput(e.target.value)}
              style={{ resize: 'vertical', minHeight: '120px' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={formSubmitting || !selectedDuration}>
              {formSubmitting ? 'Stocking...' : 'Add Keys to Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
