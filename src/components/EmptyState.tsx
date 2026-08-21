import React from 'react';

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="empty-state card">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <p>{message}</p>
    </div>
  );
}
