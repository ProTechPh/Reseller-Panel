'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, DollarSign, X, ShieldAlert, Sparkles, UserPlus, ShoppingBag, Search, Ban, CheckCircle, Trash2, ShieldCheck, UserCheck, Settings, Lock, Unlock, Infinity as InfinityIcon, Layers, Users } from 'lucide-react';
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

interface ProductType {
  _id: string;
  name: string;
  image?: string;
}

interface UserAccountType {
  _id: string;
  username: string;
  role: 'admin' | 'reseller';
  balance: number;
  isBanned?: boolean;
  resellerType?: 'budget' | 'unlimited';
  allowedProducts?: ProductType[];
  createdAt: string;
  totalPurchases?: number;
  totalSpent?: number;
  purchases?: PurchasedKey[];
}

export default function AdminResellers() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as 'all' | 'budget' | 'unlimited' | 'admin' || 'all';

  const [users, setUsers] = useState<UserAccountType[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Navigation Tabs State: 'all' | 'budget' | 'unlimited' | 'admin'
  const [activeTab, setActiveTab] = useState<'all' | 'budget' | 'unlimited' | 'admin'>(initialTab);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [isEditSettingsOpen, setIsEditSettingsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccountType | null>(null);
  const [salesSearch, setSalesSearch] = useState('');

  // Create User Form State
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'reseller' | 'admin'>('reseller');
  const [createResellerType, setCreateResellerType] = useState<'budget' | 'unlimited'>('budget');
  const [createAllowedProducts, setCreateAllowedProducts] = useState<string[]>([]);
  const [createBalance, setCreateBalance] = useState('0');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit Settings Form State
  const [editResellerType, setEditResellerType] = useState<'budget' | 'unlimited'>('budget');
  const [editAllowedProducts, setEditAllowedProducts] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Adjust Balance Form State
  const [adjustType, setAdjustType] = useState<'balance_add' | 'balance_deduct'>('balance_add');
  const [adjustAmount, setAdjustAmount] = useState('0');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, prodRes] = await Promise.all([
        fetch('/api/admin/resellers'),
        fetch('/api/admin/products'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.success) {
          setUsers(data.resellers);
          if (data.currentAdminId) setCurrentAdminId(data.currentAdminId);
        }
      }

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success) {
          setProducts(prodData.products);
        }
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
    setCreateUsername('');
    setCreatePassword('');
    setCreateRole('reseller');
    setCreateResellerType('budget');
    setCreateAllowedProducts([]);
    setCreateBalance('0');
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const openEditSettingsModal = (user: UserAccountType) => {
    setSelectedUser(user);
    setEditResellerType(user.resellerType || 'budget');
    setEditAllowedProducts(user.allowedProducts ? user.allowedProducts.map(p => p._id) : []);
    setEditError(null);
    setIsEditSettingsOpen(true);
  };

  const openAdjustModal = (user: UserAccountType) => {
    setSelectedUser(user);
    setAdjustType('balance_add');
    setAdjustAmount('0');
    setAdjustReason('');
    setAdjustError(null);
    setIsAdjustOpen(true);
  };

  const openSalesModal = (user: UserAccountType) => {
    setSelectedUser(user);
    setSalesSearch('');
    setIsSalesOpen(true);
  };

  const toggleCreateProductSelection = (productId: string) => {
    if (createAllowedProducts.includes(productId)) {
      setCreateAllowedProducts(createAllowedProducts.filter(id => id !== productId));
    } else {
      setCreateAllowedProducts([...createAllowedProducts, productId]);
    }
  };

  const toggleEditProductSelection = (productId: string) => {
    if (editAllowedProducts.includes(productId)) {
      setEditAllowedProducts(editAllowedProducts.filter(id => id !== productId));
    } else {
      setEditAllowedProducts([...editAllowedProducts, productId]);
    }
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
    if (createRole === 'reseller' && createResellerType === 'budget' && (isNaN(balanceNum) || balanceNum < 0)) {
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
          role: createRole,
          resellerType: createResellerType,
          allowedProducts: createAllowedProducts,
          initialBalance: createRole === 'reseller' && createResellerType === 'budget' ? balanceNum : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!selectedUser) return;

    setEditSubmitting(true);

    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_reseller',
          userId: selectedUser._id,
          resellerType: editResellerType,
          allowedProducts: editAllowedProducts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update reseller settings');
      }

      setIsEditSettingsOpen(false);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'An error occurred');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleBan = async (user: UserAccountType) => {
    const actionText = user.isBanned ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${actionText} user "${user.username}"?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_ban',
          userId: user._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${actionText} user`);
      }

      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isBanned: data.isBanned } : u))
      );
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update ban status');
    }
  };

  const handleDeleteUser = async (user: UserAccountType) => {
    if (!confirm(`Are you sure you want to permanently delete user "${user.username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/resellers?id=${user._id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);

    if (!selectedUser) return;
    
    const amountNum = parseFloat(adjustAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return setAdjustError('Amount must be greater than zero.');
    }

    if (adjustType === 'balance_deduct' && selectedUser.balance < amountNum) {
      return setAdjustError(`Deduction amount exceeds user's balance (₱${selectedUser.balance.toFixed(2)}).`);
    }

    setAdjustSubmitting(true);

    try {
      const res = await fetch('/api/admin/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_balance',
          resellerId: selectedUser._id,
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
      loadData();
    } catch (err: any) {
      setAdjustError(err.message || 'An error occurred');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Filter users based on active Tab
  const budgetResellers = users.filter((u) => u.role === 'reseller' && (u.resellerType || 'budget') === 'budget');
  const unlimitedResellers = users.filter((u) => u.role === 'reseller' && u.resellerType === 'unlimited');
  const adminUsers = users.filter((u) => u.role === 'admin');

  const filteredUsers = users.filter((u) => {
    if (activeTab === 'budget') return u.role === 'reseller' && (u.resellerType || 'budget') === 'budget';
    if (activeTab === 'unlimited') return u.role === 'reseller' && u.resellerType === 'unlimited';
    if (activeTab === 'admin') return u.role === 'admin';
    return true;
  });

  const totalBudgetSpent = budgetResellers.reduce((sum, u) => sum + (u.totalSpent || 0), 0);
  const totalUnlimitedKeys = unlimitedResellers.reduce((sum, u) => sum + (u.totalPurchases || 0), 0);

  const filteredPurchases = selectedUser?.purchases?.filter((item) => {
    const q = salesSearch.toLowerCase().trim();
    if (!q) return true;
    return item.productName.toLowerCase().includes(q) || item.key.toLowerCase().includes(q) || item.duration.toLowerCase().includes(q);
  }) || [];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>User & Account Management</h1>
          <p className="subtitle">Separate sales tracking for Per-Budget (₱) vs Unlimited (∞) Resellers.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <UserPlus size={16} />
          Create User Account
        </button>
      </div>

      {/* Tier Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Card 1: Budget Tier Sales */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Per Budget Sales (₱)
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
              ₱{totalBudgetSpent.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {budgetResellers.length} Budget Resellers
            </div>
          </div>
        </div>

        {/* Card 2: Unlimited Tier Claimed Keys */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 94, 0, 0.12)', border: '1px solid rgba(255, 94, 0, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-orange)' }}>
            <InfinityIcon size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Unlimited Keys Claimed (∞)
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-orange)', marginTop: '2px' }}>
              {totalUnlimitedKeys} Keys
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {unlimitedResellers.length} Unlimited Resellers
            </div>
          </div>
        </div>

        {/* Card 3: Total Accounts */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
            <Users size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total User Accounts
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {users.length} Accounts
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {adminUsers.length} Administrators
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar (Separated Sales Pages) */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px',
        overflowX: 'auto'
      }}>
        <button
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('all')}
          style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Layers size={15} />
          All Accounts ({users.length})
        </button>

        <button
          className={`btn ${activeTab === 'budget' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('budget')}
          style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <DollarSign size={15} color={activeTab === 'budget' ? 'white' : 'var(--accent-emerald)'} />
          Per Budget Sales (₱) ({budgetResellers.length})
        </button>

        <button
          className={`btn ${activeTab === 'unlimited' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('unlimited')}
          style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <InfinityIcon size={15} color={activeTab === 'unlimited' ? 'white' : 'var(--accent-orange)'} />
          Unlimited Sales (∞) ({unlimitedResellers.length})
        </button>

        <button
          className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('admin')}
          style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ShieldCheck size={15} color={activeTab === 'admin' ? 'white' : 'var(--accent-orange)'} />
          Admins ({adminUsers.length})
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
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No accounts found for the selected view tab.
        </div>
      ) : (
        <div className="table-card">
          <div className="table-scroller">
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Reseller Tier Mode</th>
                  <th>Allowed / Locked Products</th>
                  <th>Status</th>
                  <th>Balance / Mode</th>
                  <th>Keys Bought</th>
                  <th>Total Spent</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isCurrentAdmin = user._id === currentAdminId;
                  const isUnlimited = user.resellerType === 'unlimited';
                  const allowedList = user.allowedProducts || [];

                  return (
                    <tr key={user._id} style={{ opacity: user.isBanned ? 0.65 : 1 }}>
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{user.username}</span>
                          {isCurrentAdmin && (
                            <span style={{ fontSize: '0.65rem', background: 'rgba(255,94,0,0.15)', color: 'var(--accent-orange)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,94,0,0.3)' }}>
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {user.role === 'admin' ? (
                          <span className="badge badge-orange">
                            <ShieldCheck size={11} style={{ marginRight: '3px' }} />
                            Admin
                          </span>
                        ) : (
                          <span className="badge badge-indigo">
                            <UserCheck size={11} style={{ marginRight: '3px' }} />
                            Reseller
                          </span>
                        )}
                      </td>
                      <td>
                        {user.role === 'reseller' ? (
                          isUnlimited ? (
                            <span className="badge badge-orange" style={{ fontWeight: 800 }}>
                              <InfinityIcon size={12} style={{ marginRight: '4px' }} />
                              Unlimited Generation
                            </span>
                          ) : (
                            <span className="badge badge-indigo">
                              <DollarSign size={11} style={{ marginRight: '3px' }} />
                              Per Budget (₱)
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {user.role === 'reseller' ? (
                          allowedList.length === 0 ? (
                            <span className="badge badge-emerald">
                              <Unlock size={11} style={{ marginRight: '4px' }} />
                              All Products Unlocked
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                              {allowedList.map((p) => (
                                <span key={p._id} className="badge badge-indigo" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                  <Lock size={9} style={{ marginRight: '3px' }} />
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {user.isBanned ? (
                          <span className="badge badge-crimson">
                            <Ban size={11} style={{ marginRight: '3px' }} />
                            Banned
                          </span>
                        ) : (
                          <span className="badge badge-emerald">
                            <CheckCircle size={11} style={{ marginRight: '3px' }} />
                            Active
                          </span>
                        )}
                      </td>
                      <td>
                        {user.role === 'reseller' ? (
                          isUnlimited ? (
                            <span style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>
                              ∞ Unlimited
                            </span>
                          ) : (
                            <span style={{ fontWeight: 700, color: user.balance > 0 ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                              ₱{user.balance.toFixed(2)}
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {user.role === 'reseller' ? `${user.totalPurchases || 0} Keys` : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: user.role === 'reseller' ? (isUnlimited ? 'var(--accent-orange)' : 'var(--accent-emerald)') : 'var(--text-muted)' }}>
                          {user.role === 'reseller' ? (isUnlimited ? '₱0.00 (Unli)' : `₱${(user.totalSpent || 0).toFixed(2)}`) : 'N/A'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {user.role === 'reseller' && (
                            <>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }} 
                                onClick={() => openEditSettingsModal(user)}
                                title="Configure Reseller Mode & Product Locking">
                                <Settings size={13} style={{ color: 'var(--accent-indigo)' }} />
                                Tier & Locks
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }} 
                                onClick={() => openSalesModal(user)}
                                title="View Sales & Purchased Items">
                                <ShoppingBag size={13} style={{ color: 'var(--accent-orange)' }} />
                                Sales
                              </button>
                              {!isUnlimited && (
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 10px', fontSize: '0.8rem' }} 
                                  onClick={() => openAdjustModal(user)}
                                  title="Adjust Balance">
                                  <DollarSign size={13} style={{ color: 'var(--accent-emerald)' }} />
                                  Balance
                                </button>
                              )}
                            </>
                          )}

                          {!isCurrentAdmin && (
                            <>
                              <button
                                className={user.isBanned ? "btn btn-secondary" : "btn btn-danger"}
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                onClick={() => handleToggleBan(user)}
                                title={user.isBanned ? "Unban User Account" : "Ban User Account"}
                              >
                                <Ban size={13} />
                                {user.isBanned ? 'Unban' : 'Ban'}
                              </button>

                              <button
                                className="btn btn-danger"
                                style={{ padding: '6px 10px' }}
                                onClick={() => handleDeleteUser(user)}
                                title="Delete User Account"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
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

      {/* Edit Tier Mode & Allowed Products Modal */}
      <Modal isOpen={isEditSettingsOpen && !!selectedUser} onClose={() => setIsEditSettingsOpen(false)} maxWidth="550px">
        {selectedUser && (
          <>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="var(--accent-indigo)" />
                Configure Reseller Tier & Product Locks
              </h2>
              <button onClick={() => setIsEditSettingsOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.85rem',
            }}>
              Reseller Account: <strong style={{ color: 'white' }}>{selectedUser.username}</strong>
            </div>

            {editError && (
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
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSettingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Select Reseller Mode: Per Budget vs Unlimited */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="edit-tier">Reseller Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditResellerType('budget')}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: editResellerType === 'budget' ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                      background: editResellerType === 'budget' ? 'rgba(255, 94, 0, 0.08)' : 'var(--bg-input)',
                      color: 'white',
                      fontWeight: 650,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <DollarSign size={14} color="var(--accent-emerald)" />
                      <span>Per Budget (₱)</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      Pays using account balance
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditResellerType('unlimited')}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: editResellerType === 'unlimited' ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                      background: editResellerType === 'unlimited' ? 'rgba(255, 94, 0, 0.08)' : 'var(--bg-input)',
                      color: 'white',
                      fontWeight: 650,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <InfinityIcon size={14} color="var(--accent-orange)" />
                      <span>Unlimited (∞)</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      Unli generate keys (₱0 cost)
                    </span>
                  </button>
                </div>
              </div>

              {/* Product Access Locking */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="edit-prods">
                  Allowed Products Restriction
                </label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '-4px', marginBottom: '8px' }}>
                  Uncheck all products to allow ALL products. Check specific products to lock reseller to selected products only.
                </p>

                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  background: 'var(--bg-input)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {products.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No products in catalog.</span>
                  ) : (
                    products.map((prod) => {
                      const isChecked = editAllowedProducts.includes(prod._id);
                      return (
                        <div 
                          key={prod._id}
                          onClick={() => toggleEditProductSelection(prod._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            background: isChecked ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ width: '15px', height: '15px', accentColor: 'var(--accent-indigo)' }}
                          />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{prod.name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditSettingsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* Create User Modal (Admin or Reseller) */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="550px">
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} color="var(--accent-indigo)" />
            Create User Account
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
          {/* Account Role Selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="create-role">Account Role</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCreateRole('reseller')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: createRole === 'reseller' ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                  background: createRole === 'reseller' ? 'rgba(255, 94, 0, 0.08)' : 'var(--bg-input)',
                  color: 'white',
                  fontWeight: 650,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <UserCheck size={15} color="var(--accent-indigo)" />
                Reseller
              </button>
              <button
                type="button"
                onClick={() => setCreateRole('admin')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: createRole === 'admin' ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                  background: createRole === 'admin' ? 'rgba(255, 94, 0, 0.08)' : 'var(--bg-input)',
                  color: 'white',
                  fontWeight: 650,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={15} color="var(--accent-orange)" />
                Administrator
              </button>
            </div>
          </div>

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

          {createRole === 'reseller' && (
            <>
              {/* Reseller Mode: Per Budget vs Unlimited */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="create-mode">Reseller Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCreateResellerType('budget')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: createResellerType === 'budget' ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                      background: createResellerType === 'budget' ? 'rgba(255, 94, 0, 0.08)' : 'var(--bg-input)',
                      color: 'white',
                      fontWeight: 650,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <DollarSign size={13} color="var(--accent-emerald)" />
                    Per Budget (₱)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateResellerType('unlimited')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: createResellerType === 'unlimited' ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                      background: createResellerType === 'unlimited' ? 'rgba(255, 94, 0, 0.08)' : 'var(--bg-input)',
                      color: 'white',
                      fontWeight: 650,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <InfinityIcon size={13} color="var(--accent-orange)" />
                    Unlimited (∞)
                  </button>
                </div>
              </div>

              {createResellerType === 'budget' && (
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
              )}

              {/* Product Access Restrictions */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="create-allowed">Product Access Restriction</label>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '-4px', marginBottom: '6px' }}>
                  Uncheck all products to allow ALL products. Check specific products to lock reseller to selected products only.
                </p>
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  background: 'var(--bg-input)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '140px',
                  overflowY: 'auto'
                }}>
                  {products.map((prod) => {
                    const isChecked = createAllowedProducts.includes(prod._id);
                    return (
                      <div 
                        key={prod._id}
                        onClick={() => toggleCreateProductSelection(prod._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: isChecked ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: '14px', height: '14px', accentColor: 'var(--accent-indigo)' }}
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{prod.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
              {createSubmitting ? 'Creating...' : `Create ${createRole === 'admin' ? 'Admin' : 'Reseller'}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Sales & Purchased Items Modal */}
      <Modal isOpen={isSalesOpen && !!selectedUser} onClose={() => setIsSalesOpen(false)} maxWidth="750px">
        {selectedUser && (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Reseller: <strong style={{ color: 'white' }}>{selectedUser.username}</strong>
                    </span>
                    {selectedUser.resellerType === 'unlimited' ? (
                      <span className="badge badge-orange" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                        <InfinityIcon size={10} style={{ marginRight: '3px' }} /> Unlimited Tier
                      </span>
                    ) : (
                      <span className="badge badge-indigo" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                        <DollarSign size={10} style={{ marginRight: '2px' }} /> Per Budget Tier
                      </span>
                    )}
                  </div>
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
                  {selectedUser.resellerType === 'unlimited' ? '∞ Unlimited' : `₱${selectedUser.balance.toFixed(2)}`}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Keys Bought</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '2px' }}>
                  {selectedUser.totalPurchases || 0} Keys
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Funds Spent</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-orange)', marginTop: '2px' }}>
                  {selectedUser.resellerType === 'unlimited' ? '₱0.00 (Unli)' : `₱${(selectedUser.totalSpent || 0).toFixed(2)}`}
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
              {!selectedUser.purchases || selectedUser.purchases.length === 0 ? (
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
                          {selectedUser.resellerType === 'unlimited' ? '₱0.00 (Unli)' : `₱${item.price.toFixed(2)}`}
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

      {/* Adjust Balance Modal */}
      <Modal isOpen={isAdjustOpen && !!selectedUser} onClose={() => setIsAdjustOpen(false)}>
        {selectedUser && (
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
              <div>Reseller: <strong style={{ color: 'white' }}>{selectedUser.username}</strong></div>
              <div style={{ marginTop: '4px' }}>Current Balance: <strong style={{ color: 'var(--accent-emerald)' }}>₱{selectedUser.balance.toFixed(2)}</strong></div>
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
