'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRoomContext, useParticipants, useLocalParticipant } from '@livekit/components-react';

interface DebugPanelProps {
  onClose?: () => void;
}

export function DebugPanel({ onClose }: DebugPanelProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [maxMicSlots, setMaxMicSlots] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevRole = useRef<any>(null);
  const prevMicStatus = useRef<any>(null);
  const prevDisplayStatus = useRef<any>(null);
  const prevLastAction = useRef<any>(null);
  const [eventListenerStatus, setEventListenerStatus] = useState('未设置');

  // 监听房间元数据变化
  useEffect(() => {
    if (!room) return;
    
    // 初始加载房间元数据
    try {
      const metadata = room.metadata ? JSON.parse(room.metadata) : {};
      setMaxMicSlots(metadata.maxMicSlots || null);
    } catch (e) {
      console.error('解析房间元数据失败:', e);
    }
    
    // 监听元数据变化
    const handleRoomUpdate = () => {
      try {
        const metadata = room.metadata ? JSON.parse(room.metadata) : {};
        setMaxMicSlots(metadata.maxMicSlots || null);
      } catch (e) {
        console.error('解析房间元数据失败:', e);
      }
    };
    
    room.on('roomMetadataChanged', handleRoomUpdate);
    
    return () => {
      room.off('roomMetadataChanged', handleRoomUpdate);
    };
  }, [room]);

  // 🎯 增强：监听所有相关的状态变化
  useEffect(() => {
    if (!localParticipant) {
      return;
    }

    setEventListenerStatus('已设置');

    const handleAttributesChanged = () => {
      const attrs = localParticipant.attributes;
      
      // 更新当前状态引用
      prevRole.current = attrs.role;
      prevMicStatus.current = attrs.mic_status;
      prevDisplayStatus.current = attrs.display_status;
      prevLastAction.current = attrs.last_action;
    };

    const handleParticipantMetadataChanged = () => {
      // 参与者元数据变化处理
    };

    // 添加所有事件监听器
    localParticipant.on('attributesChanged', handleAttributesChanged);
    localParticipant.on('participantMetadataChanged', handleParticipantMetadataChanged);
    
    // 初始化状态引用
    const attrs = localParticipant.attributes;
    prevRole.current = attrs.role;
    prevMicStatus.current = attrs.mic_status;
    prevDisplayStatus.current = attrs.display_status;
    prevLastAction.current = attrs.last_action;
    
    return () => {
      localParticipant.off('attributesChanged', handleAttributesChanged);
      localParticipant.off('participantMetadataChanged', handleParticipantMetadataChanged);
      setEventListenerStatus('已清理');
    };
  }, [localParticipant]);

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.debug-content')) return;
    
    setIsDragging(true);
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 300, e.clientY - dragOffset.y))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        background: 'rgba(42, 42, 42, 0.95)',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: isMinimized ? '60px' : '500px',
        overflow: 'hidden',
        zIndex: 10000,
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMinimized ? '0' : '15px',
          cursor: 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <h3 style={{ margin: '0', fontSize: '16px' }}>
          🛠️ 踢下麦状态追踪（移动版）
        </h3>
        <div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              marginRight: '10px',
              cursor: 'pointer',
            }}
          >
            {isMinimized ? '📋' : '🗗'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            ✖
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ marginTop: '0', marginBottom: '10px' }}>📊 当前状态</h4>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '10px',
              }}
            >
              <p style={{ margin: '5px 0' }}>
                <strong>用户:</strong> {localParticipant?.name}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>角色:</strong> {localParticipant?.attributes?.role}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>麦位状态:</strong> {localParticipant?.attributes?.mic_status}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>显示状态:</strong> {localParticipant?.attributes?.display_status}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>最后操作:</strong> {localParticipant?.attributes?.last_action || '无'}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>事件监听:</strong> {eventListenerStatus}
              </p>
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ marginTop: '0', marginBottom: '10px' }}>🏠 房间信息</h4>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '10px',
              }}
            >
              <p style={{ margin: '5px 0' }}>
                <strong>房间名称:</strong> {room?.name}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>最大麦位数:</strong> <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{maxMicSlots !== null ? maxMicSlots : '未设置'}</span>
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>参与者数量:</strong> {participants.length}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <h4 style={{ marginTop: '0', marginBottom: '10px' }}>👥 参与者列表</h4>
            <div
              style={{
                maxHeight: '200px',
                overflow: 'auto',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '10px',
                borderRadius: '4px',
              }}
            >
              {participants.map((p) => (
                <div
                  key={p.identity}
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <strong>{p.name}</strong> ({p.identity})
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    {p.attributes?.mic_status === 'on_mic' ? '🎤 上麦' : '🔇 下麦'} | 
                    {p.attributes?.role === '2' ? ' 主持人' : p.attributes?.role === '1' ? ' 会员' : ' 访客'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
} 