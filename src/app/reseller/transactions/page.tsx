'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface TransactionType {
  _id: string;
  type: 'purchase' | 'balance_add' | 'balance_deduct';
  amount: number;
  description: string;
  createdAt: string;
}

export default function ResellerTransactions() {
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const res = await fetch('/api/reseller/transactions');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setTransactions(data.transactions);
        }
      } catch (err) {
        console.error('Failed to load transactions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTransactions();
  }, []);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1>Transaction History</h1>
        <p className="subtitle">Audit log of all funds credited, debited, and spent on license keys.</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : transactions.length === 0 ? (
        <div className="empty-state card"><p>No transaction history recorded for your account.</p></div>
      ) : (
        <div className="table-card">
          <div className="table-scroller">
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isCredit = tx.type === 'balance_add';
                  return (
                    <tr key={tx._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isCredit ? 'rgba(16, 185, 129, 0.08)' : tx.type === 'purchase' ? 'rgba(255, 94, 0, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                            color: isCredit ? 'var(--accent-emerald)' : tx.type === 'purchase' ? 'var(--accent-orange)' : 'var(--accent-crimson)',
                          }}>
                            {isCredit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.85rem' }}>
                            {tx.type === 'balance_add' ? 'Credit' : tx.type === 'balance_deduct' ? 'Debit' : 'Purchase'}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'white', fontWeight: 500 }}>{tx.description}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: isCredit ? 'var(--accent-emerald)' : 'var(--accent-crimson)' }}>
                          {isCredit ? '+' : '-'}{'\u20B1'}{tx.amount.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
