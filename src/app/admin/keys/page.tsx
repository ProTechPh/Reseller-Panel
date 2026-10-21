'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, X, AlertCircle, Trash2, KeyRound, Check, FileText, Search, Key, ShoppingBag, Box, Trash, Sparkles, Copy, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
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

  // Generator State
  const [inputMode, setInputMode] = useState<'manual' | 'generate'>('manual');
  const [genPrefix, setGenPrefix] = useState('');
  const [genQuantity, setGenQuantity] = useState(10);
  const [genLength, setGenLength] = useState(8);
  const [genFormat, setGenFormat] = useState<'alphanumeric_upper' | 'alphanumeric_lower' | 'mixed' | 'numbers' | 'segmented'>('alphanumeric_upper');
  const [copiedAll, setCopiedAll] = useState(false);

  // Filter & Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInventoryCount, setTotalInventoryCount] = useState(0);
  const [totalAvailableCount, setTotalAvailableCount] = useState(0);
  const [totalSoldCount, setTotalSoldCount] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Delete State
  const [bulkDeleteProductId, setBulkDeleteProductId] = useState('');
  const [bulkDeleteDuration, setBulkDeleteDuration] = useState('');
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Fetch paginated keys from server
  const fetchKeys = useCallback(async (
    page = currentPage,
    limit = itemsPerPage,
    status = statusFilter,
    prodId = productFilter,
    search = searchQuery
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status,
        productId: prodId,
        search,
      });

      const res = await fetch(`/api/admin/keys?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKeys(data.keys || []);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1);
            setTotalInventoryCount(data.pagination.totalKeys || 0);
            setTotalAvailableCount(data.pagination.availableCount || 0);
            setTotalSoldCount(data.pagination.soldCount || 0);
            setFilteredTotal(data.pagination.filteredTotal || 0);
            setCurrentPage(data.pagination.page || 1);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load keys data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, productFilter, searchQuery]);

  // Load products list once on mount
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/admin/products');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setProducts(data.products || []);
        }
      } catch (err) {
        console.error('Failed to load products list:', err);
      }
    }
    loadProducts();
  }, []);

  // Debounced fetch when search query or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchKeys(1, itemsPerPage, statusFilter, productFilter, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, productFilter, itemsPerPage]);

  const loadData = () => {
    fetchKeys(currentPage, itemsPerPage, statusFilter, productFilter, searchQuery);
  };

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

  // Auto-select first duration for bulk delete product
  useEffect(() => {
    if (bulkDeleteProductId) {
      const prod = products.find((p) => p._id === bulkDeleteProductId);
      if (prod && prod.prices.length > 0) {
        setBulkDeleteDuration(prod.prices[0].duration);
      } else {
        setBulkDeleteDuration('');
      }
    } else {
      setBulkDeleteDuration('');
    }
  }, [bulkDeleteProductId, products]);

  const getSuggestedPrefix = (prodId: string, dur: string) => {
    const prod = products.find((p) => p._id === prodId);
    if (!prod) return '';
    const cleanProd = prod.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const cleanDur = dur
      .toLowerCase()
      .replace(/\s*days?/gi, 'd')
      .replace(/\s*hours?/gi, 'h')
      .replace(/\s*weeks?/gi, 'w')
      .replace(/\s*months?/gi, 'm')
      .replace(/[^a-z0-9]/g, '');
    return `${cleanProd}-${cleanDur}-`;
  };

  const handleAutoSuggestPrefix = () => {
    const suggested = getSuggestedPrefix(selectedProductId, selectedDuration);
    if (suggested) {
      setGenPrefix(suggested);
    }
  };

  const handleGenerateKeys = (append = false) => {
    const count = Math.min(Math.max(1, Number(genQuantity) || 1), 500);
    const prefix = genPrefix || '';

    const upperChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const lowerChars = 'abcdefghijkmnopqrstuvwxyz23456789';
    const mixedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const numChars = '0123456789';
    const segChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    const existingKeys = rawKeysInput
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);
    const existingSet = new Set(append ? existingKeys : []);

    const generated: string[] = [];
    let attempts = 0;

    while (generated.length < count && attempts < count * 25) {
      attempts++;
      let randStr = '';

      if (genFormat === 'segmented') {
        const p1 = Array.from({ length: 4 }, () => segChars.charAt(Math.floor(Math.random() * segChars.length))).join('');
        const p2 = Array.from({ length: 4 }, () => segChars.charAt(Math.floor(Math.random() * segChars.length))).join('');
        randStr = `${p1}-${p2}`;
      } else if (genFormat === 'alphanumeric_lower') {
        randStr = Array.from({ length: genLength }, () => lowerChars.charAt(Math.floor(Math.random() * lowerChars.length))).join('');
      } else if (genFormat === 'mixed') {
        randStr = Array.from({ length: genLength }, () => mixedChars.charAt(Math.floor(Math.random() * mixedChars.length))).join('');
      } else if (genFormat === 'numbers') {
        randStr = Array.from({ length: genLength }, () => numChars.charAt(Math.floor(Math.random() * numChars.length))).join('');
      } else {
        randStr = Array.from({ length: genLength }, () => upperChars.charAt(Math.floor(Math.random() * upperChars.length))).join('');
      }

      const fullKey = `${prefix}${randStr}`;
      if (!existingSet.has(fullKey)) {
        existingSet.add(fullKey);
        generated.push(fullKey);
      }
    }

    if (append && rawKeysInput.trim()) {
      setRawKeysInput((prev) => `${prev.trim()}\n${generated.join('\n')}`);
    } else {
      setRawKeysInput(generated.join('\n'));
    }
  };

  const handleCopyAll = () => {
    if (!rawKeysInput.trim()) return;
    navigator.clipboard.writeText(rawKeysInput.trim());
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const openStockModal = () => {
    const initialProdId = products[0]?._id || '';
    const initialDur = products[0]?.prices[0]?.duration || '';
    setSelectedProductId(initialProdId);
    setSelectedDuration(initialDur);
    setGenPrefix(getSuggestedPrefix(initialProdId, initialDur));
    setRawKeysInput('');
    setFormError(null);
    setFormSuccess(null);
    setInputMode('manual');
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

  const handleBulkDelete = async () => {
    if (!bulkDeleteProductId || !bulkDeleteDuration) return;

    const product = products.find((p) => p._id === bulkDeleteProductId);
    const matchingCount = keys.filter(
      (k) => k.productId?._id === bulkDeleteProductId && k.duration === bulkDeleteDuration && !k.isSold
    ).length;

    if (matchingCount === 0) {
      alert('No available keys found for this product and duration.');
      return;
    }

    if (!confirm(`Are you sure you want to DELETE ALL ${matchingCount} available key(s) for "${product?.name}" (${bulkDeleteDuration})? This action cannot be undone.`)) {
      return;
    }

    setBulkDeleteLoading(true);
    try {
      const params = new URLSearchParams({ productId: bulkDeleteProductId, duration: bulkDeleteDuration, type: 'available' });
      const res = await fetch(`/api/admin/keys/bulk?${params}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete keys');
      alert(data.message || `Successfully deleted ${data.deletedCount} keys.`);
      setBulkDeleteProductId('');
      setBulkDeleteDuration('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete keys');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

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

      {/* Bulk Delete Section */}
      <div className="card" style={{ padding: '18px 22px', marginBottom: '24px', background: 'rgba(244, 63, 94, 0.04)', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-crimson)' }}>
            <Trash size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Bulk Delete Keys</h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>Delete all available (unsold) keys by product and duration</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '180px', flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Product</label>
            <select
              className="form-input"
              value={bulkDeleteProductId}
              onChange={(e) => setBulkDeleteProductId(e.target.value)}
              style={{ background: 'var(--bg-sidebar)' }}
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: '160px', flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Duration</label>
            <select
              className="form-input"
              value={bulkDeleteDuration}
              onChange={(e) => setBulkDeleteDuration(e.target.value)}
              style={{ background: 'var(--bg-sidebar)' }}
              disabled={!bulkDeleteProductId}
            >
              <option value="">Select duration...</option>
              {products.find((p) => p._id === bulkDeleteProductId)?.prices.map((p) => (
                <option key={p.duration} value={p.duration}>{p.duration}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-danger"
            onClick={handleBulkDelete}
            disabled={!bulkDeleteProductId || !bulkDeleteDuration || bulkDeleteLoading}
            style={{ padding: '8px 16px', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash size={14} />
            {bulkDeleteLoading ? 'Deleting...' : 'Delete All'}
          </button>
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
            width: '28px',
            height: '28px',
            border: '2px solid rgba(255,255,255,0.05)',
            borderTopColor: '#e50914',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      ) : totalInventoryCount === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {products.length === 0 
            ? 'Please add products in the Product Catalog first before stocking license keys.' 
            : 'No license keys have been stocked yet. Click "Stock Keys (Bulk)" to add inventory.'
          }
        </div>
      ) : keys.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No license keys match your search or filter.
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
                {keys.map((keyItem) => (
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

          {/* Pagination Controls */}
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing <strong>{filteredTotal === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
              <strong>{Math.min(currentPage * itemsPerPage, filteredTotal)}</strong> of{' '}
              <strong>{filteredTotal}</strong> keys
            </div>

            <div className="pagination-controls">
              <div className="pagination-limit-wrap">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Show:</span>
                <select
                  className="form-input"
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value, 10);
                    setItemsPerPage(newLimit);
                    fetchKeys(1, newLimit, statusFilter, productFilter, searchQuery);
                  }}
                  style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto', background: 'var(--bg-sidebar)' }}
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>

              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn-page"
                  disabled={currentPage <= 1}
                  onClick={() => fetchKeys(1, itemsPerPage, statusFilter, productFilter, searchQuery)}
                  title="First Page"
                >
                  <ChevronsLeft size={15} />
                </button>

                <button
                  type="button"
                  className="btn-page"
                  disabled={currentPage <= 1}
                  onClick={() => fetchKeys(Math.max(1, currentPage - 1), itemsPerPage, statusFilter, productFilter, searchQuery)}
                  title="Previous Page"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="pagination-page-indicator">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  className="btn-page"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchKeys(Math.min(totalPages, currentPage + 1), itemsPerPage, statusFilter, productFilter, searchQuery)}
                  title="Next Page"
                >
                  <ChevronRight size={15} />
                </button>

                <button
                  type="button"
                  className="btn-page"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchKeys(totalPages, itemsPerPage, statusFilter, productFilter, searchQuery)}
                  title="Last Page"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Keys Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="580px">
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
          {/* Select Product & Duration Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
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
          </div>

          {/* Mode Switcher Tabs */}
          <div style={{
            display: 'flex',
            gap: '6px',
            padding: '4px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
          }}>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                background: inputMode === 'manual' ? 'var(--accent-orange)' : 'transparent',
                color: inputMode === 'manual' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'var(--transition)',
              }}
            >
              <FileText size={14} />
              Manual Paste
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('generate');
                if (!genPrefix && selectedProductId && selectedDuration) {
                  const suggested = getSuggestedPrefix(selectedProductId, selectedDuration);
                  setGenPrefix(suggested);
                }
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                background: inputMode === 'generate' ? 'var(--accent-orange)' : 'transparent',
                color: inputMode === 'generate' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'var(--transition)',
              }}
            >
              <Sparkles size={14} />
              Auto Generator
            </button>
          </div>

          {/* Generator Controls Panel */}
          {inputMode === 'generate' && (
            <div style={{
              padding: '14px 16px',
              background: 'rgba(255, 94, 0, 0.04)',
              border: '1px solid rgba(255, 94, 0, 0.15)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {/* Prefix Row */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                    Key Prefix / Custom Format
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoSuggestPrefix}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-yellow)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                    title="Auto-suggest prefix from product and duration"
                  >
                    <RefreshCw size={11} />
                    Suggest Prefix
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. chrns-mlbb-3d- or VIP-"
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value)}
                  style={{ background: 'var(--bg-sidebar)' }}
                />
              </div>

              {/* Format, Length, Quantity Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Format</label>
                  <select
                    className="form-input"
                    value={genFormat}
                    onChange={(e) => setGenFormat(e.target.value as any)}
                    style={{ background: 'var(--bg-sidebar)', fontSize: '0.8rem' }}
                  >
                    <option value="alphanumeric_upper">UPPERCASE (A9B2X)</option>
                    <option value="alphanumeric_lower">lowercase (a9b2x)</option>
                    <option value="mixed">Mixed Case (aB9xK)</option>
                    <option value="numbers">Numbers Only (84920)</option>
                    <option value="segmented">Blocks (XXXX-XXXX)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Random Length {genFormat === 'segmented' ? '(Fixed 8)' : ''}
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min={4}
                    max={32}
                    value={genLength}
                    disabled={genFormat === 'segmented'}
                    onChange={(e) => setGenLength(Math.max(4, parseInt(e.target.value) || 4))}
                    style={{ background: 'var(--bg-sidebar)', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Quantity (Keys)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={500}
                    value={genQuantity}
                    onChange={(e) => setGenQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ background: 'var(--bg-sidebar)', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Generate & Append Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleGenerateKeys(false)}
                  style={{ flex: 2, padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Sparkles size={14} />
                  Generate {genQuantity} {genQuantity === 1 ? 'Key' : 'Keys'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleGenerateKeys(true)}
                  disabled={!rawKeysInput.trim()}
                  style={{ flex: 1, padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  title="Append newly generated keys to the current list"
                >
                  + Append More
                </button>
              </div>
            </div>
          )}

          {/* Paste / Generated Keys Textarea */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" htmlFor="stock-keys" style={{ marginBottom: 0 }}>
                {inputMode === 'generate' ? 'License Keys Preview' : 'Paste Keys (Bulk)'}
                {rawKeysInput.trim() && (
                  <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                    ({rawKeysInput.split(/[\n,]/).map((k) => k.trim()).filter(Boolean).length} keys)
                  </span>
                )}
              </label>
              {rawKeysInput.trim() && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedAll ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                    title="Copy all keys in preview"
                  >
                    {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                    {copiedAll ? 'Copied all!' : 'Copy All'}
                  </button>
                  <span style={{ color: 'var(--border-color-hover)' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setRawKeysInput('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-crimson)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title="Clear keys text"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <textarea
              id="stock-keys"
              className="form-input"
              rows={inputMode === 'generate' ? 5 : 6}
              placeholder={
                inputMode === 'generate'
                  ? 'Click "Generate Keys" above to auto-create random keys here. You can also manually edit them.'
                  : 'Paste your license keys here. Separate keys by pressing enter (new lines) or using commas.\ne.g.\nKEY-ABCD-1234\nKEY-EFGH-5678'
              }
              value={rawKeysInput}
              onChange={(e) => setRawKeysInput(e.target.value)}
              style={{ resize: 'vertical', minHeight: '110px', fontFamily: 'monospace', fontSize: '0.82rem' }}
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
