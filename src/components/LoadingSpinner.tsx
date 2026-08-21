import React from 'react';

interface LoadingSpinnerProps {
  height?: string;
  size?: string;
}

export default function LoadingSpinner({ height = '200px', size = '24px' }: LoadingSpinnerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
      <div
        className="spinner"
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
}
