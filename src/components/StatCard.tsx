import React from 'react';

type AccentColor = 'indigo' | 'emerald' | 'purple';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: AccentColor;
}

export default function StatCard({ label, value, icon, accent }: StatCardProps) {
  return (
    <div className={`stat-item ${accent}`}>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-number">{value}</span>
      </div>
      <div className={`stat-icon-wrap ${accent}`}>
        {icon}
      </div>
    </div>
  );
}
