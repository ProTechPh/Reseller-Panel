'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import LoadingSpinner from '@/components/LoadingSpinner';

interface KeyType {
  _id: string;
  key: string;
  productId: { _id: string; name: string };
  duration: string;
  price: number;
  createdAt: string;
}

export default function ResellerKeys() {
  const [keys, setKeys] = useState<KeyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadKeys() {
      try {
        const res = await fetch('/api/reseller/keys');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setKeys(data.keys);
        }
      } catch (err) {
        console.error('Failed to load keys:', err);
      } finally {
        setLoading(false);
      }
    }
    loadKeys();
  }, []);

  const filteredKeys = keys.filter((keyItem) => {
    const pName = keyItem.productId?.name?.toLowerCase() || '';
    const keyVal = keyItem.key?.toLowerCase() || '';
    const query = searchQuery.toLowerCase().trim();
    return pName.includes(query) || keyVal.includes(query);
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>My Key Inventory</h1>
          <p className="subtitle">Retrieve and manage all license keys purchased by your account.</p>
        </div>
        <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <Search size={15} />
          </span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by product or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : keys.length === 0 ? (
        <div className="empty-state card"><p>You have not purchased any license keys yet.</p></div>
      ) : filteredKeys.length === 0 ? (
        <div className="empty-state card"><p>No keys match your search query: &quot;{searchQuery}&quot;</p></div>
      ) : (
        <div className="table-card">
          <div className="table-scroller">
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>License Key</th>
                  <th>Duration</th>
                  <th>Price Paid</th>
                  <th>Purchase Date</th>
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
                        <CopyButton text={keyItem.key} />
                      </div>
                    </td>
                    <td><span className="badge badge-indigo">{keyItem.duration}</span></td>
                    <td><span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{'\u20B1'}{keyItem.price.toFixed(2)}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(keyItem.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
