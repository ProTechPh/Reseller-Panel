import React from 'react';
import { AlertCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';

interface AlertBannerProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  icon?: React.ReactNode;
}

const typeStyles = {
  error: {
    bg: 'rgba(244, 63, 94, 0.06)',
    border: '1px solid rgba(244, 63, 94, 0.15)',
    color: 'var(--accent-crimson)',
    Icon: ShieldAlert,
  },
  success: {
    bg: 'rgba(16, 185, 129, 0.06)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    color: 'var(--accent-emerald)',
    Icon: CheckCircle,
  },
  warning: {
    bg: 'rgba(255, 184, 0, 0.06)',
    border: '1px solid rgba(255, 184, 0, 0.15)',
    color: 'var(--accent-yellow)',
    Icon: Info,
  },
  info: {
    bg: 'rgba(0, 212, 178, 0.06)',
    border: '1px solid rgba(0, 212, 178, 0.15)',
    color: 'var(--accent-cyan)',
    Icon: Info,
  },
};

export default function AlertBanner({ type, message, icon }: AlertBannerProps) {
  const config = typeStyles[type];
  const DisplayIcon = icon || <config.Icon size={15} style={{ flexShrink: 0 }} />;

  return (
    <div
      className="alert-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: config.bg,
        border: config.border,
        color: config.color,
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.85rem',
      }}
    >
      {DisplayIcon}
      <span>{message}</span>
    </div>
  );
}
