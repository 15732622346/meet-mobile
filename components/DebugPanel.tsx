'use client';

import React from 'react';

interface DebugPanelProps {
  isVisible: boolean;
  data: Record<string, any>;
  onClose: () => void;
}

export function DebugPanel({ isVisible, data, onClose }: DebugPanelProps) {
  if (!isVisible) return null;

  // 格式化数据显示
  const formattedData = Object.entries(data).map(([key, value]) => {
    // 处理不同类型的数据
    let displayValue = value;
    if (typeof value === 'boolean') {
      displayValue = value ? '是' : '否';
    } else if (value === null || value === undefined) {
      displayValue = '未定义';
    } else if (typeof value === 'object') {
      try {
        displayValue = JSON.stringify(value);
      } catch (e) {
        displayValue = '无法序列化';
      }
    }
    
    return { key, value: displayValue };
  });

  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        maxWidth: '80%',
        maxHeight: '80%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        zIndex: 10000,
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>调试信息</h3>
        <button 
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0'
          }}
        >
          ✕
        </button>
      </div>
      <div>
        {formattedData.map(({ key, value }) => (
          <div key={key} style={{ marginBottom: '6px' }}>
            <span style={{ color: '#88ccff', fontWeight: 'bold' }}>{key}:</span>{' '}
            <span style={{ 
              color: typeof value === 'boolean' 
                ? (value ? '#88ff88' : '#ff8888') 
                : '#ffffff' 
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 