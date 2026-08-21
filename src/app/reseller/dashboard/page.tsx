'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, Key, ShoppingBag, ArrowRight } from 'lucide-react';
import StatCard from '@/components/StatCard';
import CopyButton from '@/components/CopyButton';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ResellerDashboard() {
  const [balance, setBalance] = useState(0);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, keysRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/reseller/keys')
        ]);
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.success) setBalance(meData.user.balance);
        }
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          if (keysData.success) setKeys(keysData.keys);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalKeysPurchased = keys.length;
  const totalMoneySpent = keys.reduce((sum, key) => sum + (key.price || 0), 0);
  const recentPurchases = keys.slice(0, 5);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1>Welcome Back!</h1>
        <p className="subtitle">Manage your license keys and buy new keys from the product list.</p>
      </div>

      <div className="grid-stats">
        <StatCard label="Current Balance" value={`\u20B1${balance.toFixed(2)}`} icon={<Wallet size={18} />} accent="emerald" />
        <StatCard label="Total Keys Bought" value={totalKeysPurchased} icon={<Key size={18} />} accent="indigo" />
        <StatCard label="Total Funds Spent" value={`\u20B1${totalMoneySpent.toFixed(2)}`} icon={<ShoppingBag size={18} />} accent="purple" />
      </div>

      <div className="quick-actions">
        <Link href="/reseller/products" className="quick-action-link">
          <div className="card card-hover quick-action-card">
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>Store Catalog</h3>
              <p className="subtitle" style={{ fontSize: '0.8rem' }}>Purchase new license keys instantly</p>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--accent-orange)' }} />
          </div>
        </Link>
        <Link href="/reseller/keys" className="quick-action-link">
          <div className="card card-hover quick-action-card">
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>My Key Inventory</h3>
              <p className="subtitle" style={{ fontSize: '0.8rem' }}>View and copy your purchased license keys</p>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--accent-orange)' }} />
          </div>
        </Link>
      </div>

      <div className="table-card">
        <div className="table-header-row">
          <div>
            <h2>Recent Purchases</h2>
            <p className="subtitle" style={{ fontSize: '0.8rem' }}>Your last 5 license key purchases.</p>
          </div>
        </div>
        <div className="table-scroller">
          {recentPurchases.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              You haven't bought any license keys yet. Go to the{' '}
              <Link href="/reseller/products" style={{ color: 'var(--accent-orange)', textDecoration: 'underline' }}>Store Catalog</Link>{' '}
              to make your first purchase.
            </div>
          ) : (
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>License Key</th>
                  <th>Duration</th>
                  <th>Cost</th>
                  <th>Date Purchased</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchases.map((key) => (
                  <tr key={key._id}>
                    <td style={{ fontWeight: 600 }}>
                      {key.productId?.name || <span style={{ color: 'var(--text-muted)' }}>Deleted Product</span>}
                    </td>
                    <td>
                      <div className="key-display">
                        <code className="key-tag">{key.key}</code>
                        <CopyButton text={key.key} />
                      </div>
                    </td>
                    <td><span className="badge badge-indigo">{key.duration}</span></td>
                    <td><span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{'\u20B1'}{key.price?.toFixed(2)}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(key.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
