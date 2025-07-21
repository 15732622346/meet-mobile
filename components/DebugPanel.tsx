'use client';

import React from 'react';

interface DebugPanelProps {
  isVisible: boolean;
  data: Record<string, any>;
  onClose: () => void;
  onAction?: (action: string) => void;
}

export function DebugPanel({ isVisible, data, onClose, onAction }: DebugPanelProps) {
  if (!isVisible) return null;
  
  // 触发操作处理函数
  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action);
    }
  };

  // 递归渲染调试数据，支持嵌套对象
  const renderDebugData = (data: Record<string, any>, level = 0): JSX.Element[] => {
    return Object.entries(data).map(([key, value]) => {
      // 处理嵌套对象
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return (
          <div key={key} style={{ marginBottom: level === 0 ? '16px' : '8px' }}>
            <div style={{ 
              color: '#ffcc00', 
              fontWeight: 'bold', 
              fontSize: level === 0 ? '14px' : '12px',
              borderBottom: level === 0 ? '1px solid #444' : 'none',
              paddingBottom: level === 0 ? '4px' : '0',
              marginBottom: level === 0 ? '8px' : '4px'
            }}>
              {key}
            </div>
            <div style={{ paddingLeft: '12px' }}>
              {renderDebugData(value, level + 1)}
            </div>
          </div>
        );
      } 
      
      // 处理基本类型值
      let displayValue = value;
      let valueColor = '#ffffff';
      
      if (typeof value === 'boolean') {
        displayValue = value ? '是' : '否';
        valueColor = value ? '#88ff88' : '#ff8888';
      } else if (value === null || value === undefined) {
        displayValue = '未定义';
        valueColor = '#aaaaaa';
      } else if (typeof value === 'object') {
        try {
          displayValue = JSON.stringify(value);
        } catch (e) {
          displayValue = '无法序列化';
        }
      }
      
      return (
        <div key={key} style={{ marginBottom: '6px' }}>
          <span style={{ 
            color: '#88ccff', 
            fontWeight: 'bold',
            fontSize: '12px' 
          }}>
            {key}:
          </span>{' '}
          <span style={{ color: valueColor }}>
            {displayValue}
          </span>
        </div>
      );
    });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        maxWidth: '90%',
        maxHeight: '80%',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>视频尺寸调试面板</h3>
        <button 
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '0',
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>
      
      {onAction && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '16px',
          flexWrap: 'wrap',
          borderBottom: '1px solid #444',
          paddingBottom: '12px'
        }}>
          <button 
            onClick={() => handleAction('refresh-video-style')}
            style={{
              background: '#2a6fdb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            强制刷新视频样式
          </button>
        </div>
      )}
      
      <div>
        {renderDebugData(data)}
      </div>
    </div>
  );
} 