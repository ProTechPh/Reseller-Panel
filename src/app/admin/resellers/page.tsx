'use client';

import React, { useEffect, useState } from 'react';
import { Plus, DollarSign, X, ShieldAlert, Sparkles, UserPlus, ShoppingBag, Search } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import Modal from '@/components/Modal';

interface PurchasedKey {
  _id: string;
  key: string;
  productName: string;
  duration: string;
  price: number;
  soldAt: string;
}

interface ResellerType {
  _id: string;
  username: string;
  balance: number;
  createdAt: string;
  totalPurchases?: number;
  totalSpent?: number;
  purchases?: PurchasedKey[];
}

export default function AdminResellers() {
  const [resellers, setResellers] = useState<ResellerType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<ResellerType | null>(null);
  const [salesSearch, setSalesSearch] = useState('');

  // Create Reseller Form State
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createBalance, setCreateBalance] = useState('0');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Adjust Balance Form State
  const [adjustType, setAdjustType] = useState<'balance_add' | 'balance_deduct'>('balance_add');
  const [adjustAmount, setAdjustAmount] = useState('0');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const loadResellers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/resellers');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setResellers(data.resellers);
        }
      }
    } catch (err) {
      console.error('Failed to load resellers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResellers();
  }, []);

  const openCreateModal = () => {
    setCreateUsername('');
    setCreatePassword('');
    setCreateBalance('0');
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const openAdjustModal = (reseller: ResellerType) => {
    setSelectedReseller(reseller);
    setAdjustType('balance_add');
    setAdjustAmount('0');
    setAdjustReason('');
    setAdjustError(null);
    setIsAdjustOpen(true);
  };

  const openSalesModal = (reseller: ResellerType) => {
    setSelectedReseller(reseller);
    setSalesSearch('');
    setIsSalesOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createUsername.trim()) return setCreateError('Username is required.');
    if (createUsername.trim().length < 3) return setCreateError('Username must be at least 3 characters.');
    if (!createPassword.trim() || createPassword.length < 5) {
      return setCreateError('Password must be at least 5 characters.');
    }
    
    const balanceNum = parseFloat(createBalance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      return setCreateError('Initial balance cannot be negative.');
    }

    setCreateSubmitting(true);

    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          username: createUsername.trim(),
          password: createPassword,
          initialBalance: balanceNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create reseller');
      }

      setIsCreateOpen(false);
      loadResellers();
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);

    if (!selectedReseller) return;
    
    const amountNum = parseFloat(adjustAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return setAdjustError('Amount must be greater than zero.');
    }

    if (adjustType === 'balance_deduct' && selectedReseller.balance < amountNum) {
      return setAdjustError(`Deduction amount exceeds reseller's balance (₱${selectedReseller.balance.toFixed(2)}).`);
    }

    setAdjustSubmitting(true);

    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_balance',
          resellerId: selectedReseller._id,
          type: adjustType,
          amount: amountNum,
          description: adjustReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust balance');
      }

      setIsAdjustOpen(false);
      loadResellers();
    } catch (err: any) {
      setAdjustError(err.message || 'An error occurred');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const filteredPurchases = selectedReseller?.purchases?.filter((item) => {
    const q = salesSearch.toLowerCase().trim();
    if (!q) return true;
    return item.productName.toLowerCase().includes(q) || item.key.toLowerCase().includes(q) || item.duration.toLowerCase().includes(q);
  }) || [];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>Reseller Accounts</h1>
          <p className="subtitle">Register new resellers, monitor sales history, and manage panel balances.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <UserPlus size={16} />
          Create Reseller
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
      ) : resellers.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No resellers registered yet. Click "Create Reseller" to add your first reseller.
        </div>
      ) : (
        <div className="table-card">
          <div className="table-scroller">
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Registration Date</th>
                  <th>Balance</th>
                  <th>Keys Bought</th>
                  <th>Total Spent</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map((reseller) => (
                  <tr key={reseller._id}>
                    <td style={{ fontWeight: 700 }}>{reseller.username}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(reseller.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: reseller.balance > 0 ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                        ₱{reseller.balance.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-indigo">
                        {reseller.totalPurchases || 0} Keys
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>
                        ₱{(reseller.totalSpent || 0).toFixed(2)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }} 
                          onClick={() => openSalesModal(reseller)}
                          title="View Purchased Items & Sales History">
                          <ShoppingBag size={13} style={{ color: 'var(--accent-orange)' }} />
                          Sales & Items
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }} 
                          onClick={() => openAdjustModal(reseller)}
                          title="Adjust Reseller Balance">
                          <DollarSign size={13} style={{ color: 'var(--accent-emerald)' }} />
                          Adjust Balance
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

      {/* Sales & Purchased Items Modal */}
      <Modal isOpen={isSalesOpen && !!selectedReseller} onClose={() => setIsSalesOpen(false)} maxWidth="750px">
        {selectedReseller && (
          <>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 94, 0, 0.1)', border: '1px solid rgba(255, 94, 0, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-orange)'
                }}>
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Sales & Purchases Overview</h2>
                  <p className="subtitle" style={{ margin: 0, fontSize: '0.8rem' }}>
                    Reseller: <strong style={{ color: 'white' }}>{selectedReseller.username}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSalesOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            {/* Summary Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Current Balance</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                  ₱{selectedReseller.balance.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Keys Bought</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '2px' }}>
                  {selectedReseller.totalPurchases || 0} Keys
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Funds Spent</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-orange)', marginTop: '2px' }}>
                  ₱{(selectedReseller.totalSpent || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Search Filter */}
            <div className="input-wrapper" style={{ marginTop: '8px' }}>
              <Search className="input-icon" size={15} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search by product name or key..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Purchases Table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: '350px', overflowY: 'auto' }}>
              {!selectedReseller.purchases || selectedReseller.purchases.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  This reseller has not purchased any license keys yet.
                </div>
              ) : filteredPurchases.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No purchases matched "{salesSearch}".
                </div>
              ) : (
                <table className="table-saas" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>License Key</th>
                      <th>Duration</th>
                      <th>Price Paid</th>
                      <th>Date Purchased</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.map((item) => (
                      <tr key={item._id}>
                        <td style={{ fontWeight: 600 }}>{item.productName}</td>
                        <td>
                          <div className="key-display">
                            <code className="key-tag" style={{ fontSize: '0.75rem' }}>{item.key}</code>
                            <CopyButton text={item.key} size={12} />
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>{item.duration}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          ₱{item.price.toFixed(2)}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          {new Date(item.soldAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsSalesOpen(false)}>
                Close
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Create Reseller Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} color="var(--accent-indigo)" />
            Create Reseller
          </h2>
          <button onClick={() => setIsCreateOpen(false)} className="modal-close">
            <X size={18} />
          </button>
        </div>

        {createError && (
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
            <ShieldAlert size={15} style={{ flexShrink: 0 }} />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="res-user">Username</label>
            <input 
              id="res-user"
              type="text" 
              className="form-input" 
              placeholder="Enter username"
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="res-pass">Password</label>
            <input 
              id="res-pass"
              type="password" 
              className="form-input" 
              placeholder="Enter password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="res-bal">Initial Balance (₱)</label>
            <input 
              id="res-bal"
              type="number" 
              step="0.01"
              min="0"
              className="form-input" 
              placeholder="0.00"
              value={createBalance}
              onChange={(e) => setCreateBalance(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
              {createSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Balance Modal */}
      <Modal isOpen={isAdjustOpen && !!selectedReseller} onClose={() => setIsAdjustOpen(false)}>
        {selectedReseller && (
          <>
            <div className="modal-header">
              <h2>Adjust Balance</h2>
              <button onClick={() => setIsAdjustOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '0.85rem',
            }}>
              <div>Reseller: <strong style={{ color: 'white' }}>{selectedReseller.username}</strong></div>
              <div style={{ marginTop: '4px' }}>Current Balance: <strong style={{ color: 'var(--accent-emerald)' }}>₱{selectedReseller.balance.toFixed(2)}</strong></div>
            </div>

            {adjustError && (
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
                <ShieldAlert size={15} />
                <span>{adjustError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Type Switch (Add / Deduct) */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem' }}>
                  <input 
                    type="radio" 
                    name="adjust-type" 
                    value="balance_add"
                    checked={adjustType === 'balance_add'}
                    onChange={() => setAdjustType('balance_add')}
                    style={{ accentColor: 'var(--accent-indigo)', width: '15px', height: '15px' }}
                  />
                  Credit Balance (+)
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem' }}>
                  <input 
                    type="radio" 
                    name="adjust-type" 
                    value="balance_deduct"
                    checked={adjustType === 'balance_deduct'}
                    onChange={() => setAdjustType('balance_deduct')}
                    style={{ accentColor: 'var(--accent-crimson)', width: '15px', height: '15px' }}
                  />
                  Debit Balance (-)
                </label>
              </div>

              {/* Amount */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="adj-amt">Amount (₱)</label>
                <input 
                  id="adj-amt"
                  type="number" 
                  step="0.01"
                  min="0.01"
                  className="form-input" 
                  placeholder="0.00"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="adj-desc">Description / Reason</label>
                <input 
                  id="adj-desc"
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Top up via crypto payment"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={adjustSubmitting}>
                  {adjustSubmitting ? 'Processing...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
