'use client';

import React, { useEffect, useState } from 'react';
import { Users, KeyRound, DollarSign } from 'lucide-react';
import StatCard from '@/components/StatCard';
import CopyButton from '@/components/CopyButton';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalResellers: 0, totalKeysSold: 0, totalRevenue: 0 });
  const [recentKeys, setRecentKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStats(data.stats);
            setRecentKeys(data.recentKeys);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1>Dashboard Overview</h1>
        <p className="subtitle">Real-time analytics and activity for your reseller panel.</p>
      </div>

      <div className="grid-stats">
        <StatCard label="Active Resellers" value={stats.totalResellers} icon={<Users size={18} />} accent="indigo" />
        <StatCard label="Keys Generated" value={stats.totalKeysSold} icon={<KeyRound size={18} />} accent="purple" />
        <StatCard label="Total Revenue" value={`\u20B1${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign size={18} />} accent="emerald" />
      </div>

      <div className="table-card">
        <div className="table-header-row">
          <div>
            <h2>Recent License Purchases</h2>
            <p className="subtitle" style={{ fontSize: '0.8rem' }}>The latest 10 keys purchased by resellers.</p>
          </div>
        </div>
        <div className="table-scroller">
          {recentKeys.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No license keys have been generated yet.
            </div>
          ) : (
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Reseller</th>
                  <th>License Key</th>
                  <th>Duration</th>
                  <th>Price Paid</th>
                  <th>Date Purchased</th>
                </tr>
              </thead>
              <tbody>
                {recentKeys.map((key) => (
                  <tr key={key._id}>
                    <td style={{ fontWeight: 600 }}>
                      {key.productId?.name || <span style={{ color: 'var(--text-muted)' }}>Deleted Product</span>}
                    </td>
                    <td><span className="badge badge-indigo">{key.resellerId?.username || 'System'}</span></td>
                    <td>
                      <div className="key-display">
                        <code className="key-tag">{key.key}</code>
                        <CopyButton text={key.key} />
                      </div>
                    </td>
                    <td>{key.duration}</td>
                    <td><span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{'\u20B1'}{(key.price ?? 0).toFixed(2)}</span></td>
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
