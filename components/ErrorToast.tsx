'use client';

import React from 'react';

interface ErrorToastProps {
  error: string | null;
  onClose: () => void;
  title?: string;
}

export function ErrorToast({ error, onClose, title = "错误" }: ErrorToastProps) {
  if (!error) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#ff4757',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      maxWidth: '400px',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <strong>{title}：</strong> {error}
      </div>
      <div style={{ textAlign: 'right' }}>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          确定
        </button>
      </div>
      
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
} 