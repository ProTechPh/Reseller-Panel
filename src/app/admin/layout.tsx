'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Package, Users, LogOut, KeyRound, Menu } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.replace('/'); return; }
        const data = await res.json();
        if (data.success && data.user && data.user.role === 'admin') {
          setAdminUser(data.user);
        } else {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, [router]);

  // Close sidebar on route change
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
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Resellers', href: '/admin/resellers', icon: Users },
    { name: 'Manage Keys', href: '/admin/keys', icon: KeyRound },
  ];

  return (
    <div className="layout-wrapper">
      {/* Mobile hamburger */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu size={20} />
      </button>

      {/* Overlay for mobile */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

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
            <span style={{ fontWeight: 850, fontSize: '1rem', letterSpacing: '-0.01em', color: '#ffffff' }}>Admin Portal</span>
            <span style={{ fontSize: '0.68rem', color: '#00f0ff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ghosst Management</span>
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
            <div className="profile-avatar">A</div>
            <div className="profile-info">
              <span className="profile-name">{adminUser?.username}</span>
              <span className="profile-role">Administrator</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout"><LogOut size={13} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>

      {/* Admin Mobile Floating Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <Link 
          href="/admin/dashboard" 
          className={`mobile-nav-item ${pathname === '/admin/dashboard' ? 'active' : ''}`}
        >
          <div className="mobile-nav-icon"><LayoutDashboard size={18} /></div>
          <span>Dashboard</span>
        </Link>
        <Link 
          href="/admin/products" 
          className={`mobile-nav-item ${pathname.startsWith('/admin/products') ? 'active' : ''}`}
        >
          <div className="mobile-nav-icon"><Package size={18} /></div>
          <span>Products</span>
        </Link>
        <Link 
          href="/admin/keys" 
          className={`mobile-nav-item ${pathname.startsWith('/admin/keys') ? 'active' : ''}`}
        >
          <div className="mobile-nav-icon"><KeyRound size={18} /></div>
          <span>Keys</span>
        </Link>
        <Link 
          href="/admin/resellers" 
          className={`mobile-nav-item ${pathname.startsWith('/admin/resellers') ? 'active' : ''}`}
        >
          <div className="mobile-nav-icon"><Users size={18} /></div>
          <span>Resellers</span>
        </Link>
        <button 
          type="button" 
          onClick={handleLogout} 
          className="mobile-nav-item"
        >
          <div className="mobile-nav-icon"><LogOut size={18} /></div>
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}