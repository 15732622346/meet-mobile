'use client';

import React from 'react';

interface LiveKitHostControlPanelProps {
  roomId?: string;
  operatorId?: number;
  operatorName?: string;
  userRole?: number;
  isVisible?: boolean;
  onClose?: () => void;
}

export function LiveKitHostControlPanel({
  roomId,
  operatorId,
  operatorName,
  userRole,
  isVisible,
  onClose
}: LiveKitHostControlPanelProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="host-control-overlay">
      <div className="host-control-panel">
        <div className="panel-header">
          <h3>🎤 LiveKit麦位管理</h3>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        <div className="panel-content">
          <p>基于LiveKit原生API的麦位管理系统</p>
          <p>正在开发中...</p>
        </div>
        
        <style jsx>{`
          .host-control-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .host-control-panel {
            background: #1a1a1a;
            border-radius: 12px;
            padding: 24px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
            border: 1px solid #333;
          }

          .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #333;
            padding-bottom: 16px;
          }

          .panel-header h3 {
            margin: 0;
            color: #fff;
            font-size: 18px;
          }

          .close-btn {
            background: #333;
            border: none;
            color: #fff;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
          }

          .close-btn:hover {
            background: #555;
          }

          .panel-content {
            text-align: center;
            padding: 40px 20px;
            color: #888;
          }
        `}</style>
      </div>
    </div>
  );
}
