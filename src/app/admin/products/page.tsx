'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';
import Modal from '@/components/Modal';

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
}

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Form State
  const [currentId, setCurrentId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prices, setPrices] = useState<PriceOption[]>([{ duration: '30 Days', price: 10 }]);
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Load Products
  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/products');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProducts(data.products);
        }
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentId('');
    setName('');
    setDescription('');
    setPrices([{ duration: '30 Days', price: 10 }]);
    setImage('');
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductType) => {
    setModalMode('edit');
    setCurrentId(product._id || '');
    setName(product.name);
    setDescription(product.description);
    setImage(product.image || '');
    setPrices(product.prices.map(p => ({ ...p }))); // clone prices
    setIsActive(product.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddPriceOption = () => {
    setPrices([...prices, { duration: '', price: 0 }]);
  };

  const handleRemovePriceOption = (index: number) => {
    if (prices.length === 1) {
      setFormError('A product must have at least one pricing option.');
      return;
    }
    const updated = prices.filter((_, i) => i !== index);
    setPrices(updated);
  };

  const handlePriceOptionChange = (index: number, field: keyof PriceOption, value: any) => {
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

    // Validations
    if (!name.trim()) return setFormError('Product name is required.');
    if (!description.trim()) return setFormError('Description is required.');
    
    for (let i = 0; i < prices.length; i++) {
      if (!prices[i].duration.trim()) {
        return setFormError(`Pricing option #${i + 1} is missing a duration.`);
      }
      if (prices[i].price < 0) {
        return setFormError(`Pricing option #${i + 1} price cannot be negative.`);
      }
    }

    setFormSubmitting(true);

    try {
      const url = '/api/admin/products';
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      const payload = modalMode === 'create' 
        ? { name, description, image, prices, isActive }
        : { id: currentId, name, description, image, prices, isActive };

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
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete product "${productName}"?`)) {
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
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>Product Catalog</h1>
          <p className="subtitle">Manage all product details and their duration pricing models.</p>
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
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => (
                  <tr key={prod._id}>
                    <td style={{ fontWeight: 700 }}>{prod.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px' }}>
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
                      {prod.isActive ? (
                        <span className="badge badge-emerald">Active</span>
                      ) : (
                        <span className="badge badge-crimson">Inactive</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
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
