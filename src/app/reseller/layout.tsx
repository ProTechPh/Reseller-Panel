'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, ShoppingCart, Key, Receipt, LogOut, Wallet, Menu, Send, Gamepad2, X, Compass, KeyRound, Sparkles } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Modal from '@/components/Modal';

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [reseller, setReseller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);

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

  const isProductsActive = pathname === '/reseller/products';
  const isKeysActive = pathname === '/reseller/keys';

  return (
    <div className="layout-wrapper">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu size={20} />
      </button>
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Desktop Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '22px 20px', borderBottom: '1px solid rgba(0, 240, 255, 0.14)' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.22) 0%, rgba(0, 153, 204, 0.12) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(0, 240, 255, 0.3)',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img src="/images/logo.png?v=3" alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 850, fontSize: '1rem', letterSpacing: '-0.01em', color: '#ffffff' }}>Reseller Panel</span>
            <span style={{ fontSize: '0.68rem', color: '#00f0ff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ghosst Premium</span>
          </div>
        </div>
        <div className="wallet-widget" style={{ border: '1px solid rgba(0, 240, 255, 0.16)', background: 'rgba(8, 15, 24, 0.8)' }}>
          <div className="wallet-icon"><Wallet size={16} /></div>
          <div className="wallet-details">
            <span className="wallet-label">{reseller?.resellerType === 'unlimited' ? 'Account Tier' : 'Your Balance'}</span>
            <span className="wallet-value" style={{ color: '#00f0ff' }}>
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

        {/* Telegram Direct Support Box */}
        <div style={{ padding: '0 12px', marginBottom: '8px' }}>
          <a
            href="https://t.me/Sylvieofficeal"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(34, 158, 217, 0.08)',
              border: '1px solid rgba(34, 158, 217, 0.2)',
              color: '#29b6f6',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'var(--transition)',
            }}
          >
            <Send size={15} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Telegram Support</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>@Sylvieofficeal</span>
            </div>
          </a>
        </div>

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

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile Floating Capsule Navigation Dock */}
      <nav className="mobile-bottom-nav">
        <Link 
          href="/reseller/products" 
          className={`mobile-nav-item ${isProductsActive ? 'active' : ''}`}
        >
          <div className="mobile-nav-icon">
            <Compass size={19} />
          </div>
          <span>Store</span>
        </Link>

        <Link 
          href="/reseller/keys" 
          className={`mobile-nav-item ${isKeysActive ? 'active' : ''}`}
        >
          <div className="mobile-nav-icon">
            <KeyRound size={19} />
          </div>
          <span>Vault</span>
        </Link>

        <button 
          type="button" 
          onClick={() => setBalanceModalOpen(true)} 
          className="mobile-nav-item"
        >
          <div className="mobile-nav-icon">
            <Wallet size={19} />
          </div>
          <span>Wallet</span>
        </button>

        <button 
          type="button" 
          onClick={handleLogout} 
          className="mobile-nav-item"
        >
          <div className="mobile-nav-icon">
            <LogOut size={19} />
          </div>
          <span>Logout</span>
        </button>
      </nav>

      {/* Add Balance Modal */}
      <Modal isOpen={balanceModalOpen} onClose={() => setBalanceModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="modal-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={20} color="var(--accent-emerald)" />
              Add Account Balance
            </h2>
            <button onClick={() => setBalanceModalOpen(false)} className="modal-close">
              <X size={18} />
            </button>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Balance</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 850, color: 'var(--accent-emerald)', marginTop: '4px' }}>
              {reseller?.resellerType === 'unlimited' ? '∞ Unlimited Tier' : `₱${(reseller?.balance || 0).toFixed(2)}`}
            </div>
          </div>

          <div style={{
            background: 'rgba(34, 158, 217, 0.08)',
            border: '1px solid rgba(34, 158, 217, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}>
            <p style={{ margin: 0, color: 'var(--text-primary)' }}>
              Para mag-top up ng inyong balance (GCash, Maya, Bank Transfer, Crypto), mangyaring makipag-ugnayan sa Administrator sa Telegram.
            </p>
          </div>

          <a
            href="https://t.me/Sylvieofficeal"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 18px',
              background: 'linear-gradient(90deg, #229ED9 0%, #0088cc 100%)',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 14px rgba(0, 136, 204, 0.3)',
            }}
          >
            <Send size={16} />
            Top-up via Telegram (@Sylvieofficeal)
          </a>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/reseller/transactions"
              onClick={() => setBalanceModalOpen(false)}
              className="btn btn-secondary"
              style={{ flex: 1, textAlign: 'center', textDecoration: 'none', fontSize: '0.85rem' }}
            >
              Transaction Logs
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setBalanceModalOpen(false)}
              style={{ flex: 1, fontSize: '0.85rem' }}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}