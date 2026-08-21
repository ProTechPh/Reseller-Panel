'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, ShoppingCart, Key, Receipt, LogOut, Wallet, Menu } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [reseller, setReseller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/');
        return;
      }
      const data = await res.json();
      if (data.success && data.user && data.user.role === 'reseller') {
        setReseller(data.user);
      } else {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/');
      }
    } catch {
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    const handleBalanceUpdate = () => fetchUserData();
    window.addEventListener('balance-update', handleBalanceUpdate);
    return () => window.removeEventListener('balance-update', handleBalanceUpdate);
  }, [router]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) router.replace('/');
    } catch (err) { console.error('Logout error:', err); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', href: '/reseller/dashboard', icon: LayoutDashboard },
    { name: 'Shop Products', href: '/reseller/products', icon: ShoppingCart },
    { name: 'My License Keys', href: '/reseller/keys', icon: Key },
    { name: 'Transactions', href: '/reseller/transactions', icon: Receipt },
  ];

  return (
    <div className="layout-wrapper">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu size={20} />
      </button>
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
            <img src="/images/logo.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>Reseller Panel</span>
        </div>
        <div className="wallet-widget">
          <div className="wallet-icon"><Wallet size={16} /></div>
          <div className="wallet-details">
            <span className="wallet-label">{reseller?.resellerType === 'unlimited' ? 'Account Tier' : 'Your Balance'}</span>
            <span className="wallet-value" style={{ color: reseller?.resellerType === 'unlimited' ? 'var(--accent-orange)' : 'var(--accent-emerald)' }}>
              {reseller?.resellerType === 'unlimited' ? '∞ Unlimited' : `₱${(reseller?.balance || 0).toFixed(2)}`}
            </span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href} className={`nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={16} /><span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="profile-avatar">{reseller?.username?.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <span className="profile-name">{reseller?.username}</span>
              <span className="profile-role">Reseller Partner</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout"><LogOut size={13} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}