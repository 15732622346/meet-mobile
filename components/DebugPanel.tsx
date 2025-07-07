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
  const [kickLogs, setKickLogs] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevRole = useRef<any>(null);
  const prevMicStatus = useRef<any>(null);
  const prevDisplayStatus = useRef<any>(null);
  const prevLastAction = useRef<any>(null);
  const [eventListenerStatus, setEventListenerStatus] = useState('未设置');

  // 添加踢下麦日志 - 使用"踢踢踢"前缀
  const addKickLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setKickLogs(prev => [`踢踢踢 [${timestamp}] ${message}`, ...prev].slice(0, 30));
  };

  // 🎯 增强：监听所有相关的状态变化
  useEffect(() => {
    if (!localParticipant) {
      addKickLog(`❌ localParticipant 不存在`);
      return;
    }

    addKickLog(`✅ 开始设置事件监听器`);
    setEventListenerStatus('已设置');

    const handleAttributesChanged = () => {
      addKickLog(`🔥 attributesChanged 事件被触发!`);
      const attrs = localParticipant.attributes;
      
      addKickLog(`📊 当前所有attributes: ${JSON.stringify(attrs)}`);
      
      // 🚨 新增：状态一致性检查
      const checkStateConsistency = () => {
        const { last_action, mic_status, display_status } = attrs;
        
        // 检查被批准上麦但没有实际上麦的情况
        if (last_action === 'approved' && mic_status === 'off_mic') {
          addKickLog(`🚨🚨🚨 发现状态不一致问题！`);
          addKickLog(`  ├─ 问题描述: 用户被批准上麦但麦克风状态仍是off_mic`);
          addKickLog(`  ├─ last_action: "${last_action}" (应该是approved)`);
          addKickLog(`  ├─ mic_status: "${mic_status}" (应该是on_mic)`);
          addKickLog(`  ├─ display_status: "${display_status}" (应该是visible)`);
          addKickLog(`  └─ 🔧 这可能是批准操作没有完全执行成功！`);
        }
        
        // 检查被踢下麦但状态不正确的情况
        if (last_action === 'kicked' && mic_status !== 'off_mic') {
          addKickLog(`🚨🚨🚨 发现踢下麦状态不一致！`);
          addKickLog(`  ├─ last_action: "${last_action}" (是kicked)`);
          addKickLog(`  ├─ mic_status: "${mic_status}" (应该是off_mic)`);
          addKickLog(`  └─ 🔧 踢下麦操作可能没有完全执行！`);
        }
        
        // 检查正常状态
        if (last_action === 'approved' && mic_status === 'on_mic') {
          addKickLog(`✅ 状态一致: 用户正确上麦`);
        }
        
        if (last_action === 'kicked' && mic_status === 'off_mic') {
          addKickLog(`✅ 状态一致: 用户正确下麦`);
        }
      };
      
      // 执行状态一致性检查
      checkStateConsistency();
      
      // 🔥 重点关注：被踢下麦的操作
      if (attrs.last_action === 'kicked') {
        addKickLog(`🚨 检测到被踢下麦操作!`);
        addKickLog(`  ├─ mic_status: ${attrs.mic_status}`);
        addKickLog(`  ├─ display_status: ${attrs.display_status}`);
        addKickLog(`  ├─ role: "${attrs.role}" (类型: ${typeof attrs.role})`);
        addKickLog(`  ├─ operator_id: ${attrs.operator_id}`);
        addKickLog(`  └─ kick_time: ${attrs.kick_time}`);
        
        // 检查role是否丢失
        if (attrs.role === undefined) {
          addKickLog(`🚨 严重问题: role字段丢失!`);
        } else if (attrs.role === '0') {
          addKickLog(`🚨 严重问题: role被设为游客(0)!`);
        } else {
          addKickLog(`✅ role字段保持正常: "${attrs.role}"`);
        }
      }
      
      // 🔍 监听role字段的任何变化
      if (prevRole.current !== null && prevRole.current !== attrs.role) {
        addKickLog(`🔄 Role字段变化: "${prevRole.current}" → "${attrs.role}"`);
      }
      prevRole.current = attrs.role;
      
      // 🔍 监听麦位状态变化
      if (prevMicStatus.current !== null && prevMicStatus.current !== attrs.mic_status) {
        addKickLog(`🎤 麦位状态变化: "${prevMicStatus.current}" → "${attrs.mic_status}"`);
      }
      prevMicStatus.current = attrs.mic_status;

      // 🔍 监听显示状态变化
      if (prevDisplayStatus.current !== null && prevDisplayStatus.current !== attrs.display_status) {
        addKickLog(`👁️ 显示状态变化: "${prevDisplayStatus.current}" → "${attrs.display_status}"`);
      }
      prevDisplayStatus.current = attrs.display_status;

      // 🔍 监听最后操作变化
      if (prevLastAction.current !== null && prevLastAction.current !== attrs.last_action) {
        addKickLog(`⚡ 最后操作变化: "${prevLastAction.current}" → "${attrs.last_action}"`);
      }
      prevLastAction.current = attrs.last_action;
    };

    // 🎯 增强：添加多种事件监听
    const handleParticipantMetadataChanged = () => {
      addKickLog(`📝 participantMetadataChanged 事件触发`);
    };

    // 添加所有事件监听器
    localParticipant.on('attributesChanged', handleAttributesChanged);
    localParticipant.on('participantMetadataChanged', handleParticipantMetadataChanged);
    
    // 初始化时记录当前状态
    const attrs = localParticipant.attributes;
    addKickLog(`🔍 初始状态: role="${attrs.role}", mic_status="${attrs.mic_status}"`);
    addKickLog(`🔍 初始完整attributes: ${JSON.stringify(attrs)}`);
    
    // 🚨 初始化时也进行状态一致性检查
    const { last_action, mic_status, display_status } = attrs;
    if (last_action === 'approved' && mic_status === 'off_mic') {
      addKickLog(`🚨🚨🚨 初始状态检查: 发现状态不一致！`);
      addKickLog(`  ├─ 用户被批准上麦但麦克风状态是off_mic`);
      addKickLog(`  ├─ 这可能是批准操作没有完全执行成功的问题`);
      addKickLog(`  └─ 建议: 主持人重新批准一次或用户重新申请`);
    }
    
    // 设置初始值
    prevRole.current = attrs.role;
    prevMicStatus.current = attrs.mic_status;
    prevDisplayStatus.current = attrs.display_status;
    prevLastAction.current = attrs.last_action;
    
    return () => {
      addKickLog(`🧹 清理事件监听器`);
      localParticipant.off('attributesChanged', handleAttributesChanged);
      localParticipant.off('participantMetadataChanged', handleParticipantMetadataChanged);
      setEventListenerStatus('已清理');
    };
  }, [localParticipant]);

  // 🎯 新增：定时检查状态变化（备用方案）
  useEffect(() => {
    const interval = setInterval(() => {
      if (!localParticipant) return;
      
      const attrs = localParticipant.attributes;
      
      // 检查是否有变化但事件未触发
      if (attrs.role !== prevRole.current) {
        addKickLog(`⏰ 定时检查发现Role变化: "${prevRole.current}" → "${attrs.role}" (事件未触发)`);
        prevRole.current = attrs.role;
      }
      
      if (attrs.mic_status !== prevMicStatus.current) {
        addKickLog(`⏰ 定时检查发现麦位状态变化: "${prevMicStatus.current}" → "${attrs.mic_status}" (事件未触发)`);
        prevMicStatus.current = attrs.mic_status;
      }

      if (attrs.display_status !== prevDisplayStatus.current) {
        addKickLog(`⏰ 定时检查发现显示状态变化: "${prevDisplayStatus.current}" → "${attrs.display_status}" (事件未触发)`);
        prevDisplayStatus.current = attrs.display_status;
      }

      if (attrs.last_action !== prevLastAction.current) {
        addKickLog(`⏰ 定时检查发现最后操作变化: "${prevLastAction.current}" → "${attrs.last_action}" (事件未触发)`);
        prevLastAction.current = attrs.last_action;
      }
    }, 2000); // 每2秒检查一次

    return () => clearInterval(interval);
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
        fontSize: '14px',
        fontFamily: 'monospace',
        border: '2px solid #ff6b6b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="debug-content" style={{ cursor: 'default' }}>
        {/* 标题栏 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: isMinimized ? '0' : '15px'
        }}>
          <h3 style={{ margin: 0, color: '#ff6b6b' }}>
            🚨 踢下麦状态追踪调试 (增强版)
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '2px 5px'
              }}
              title={isMinimized ? "展开" : "最小化"}
            >
              {isMinimized ? '⬆️' : '⬇️'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '2px 5px'
              }}
              title="关闭调试面板"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 主要内容 */}
        {!isMinimized && (
          <>
            {/* 当前状态概览 */}
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#FFC107' }}>📊 当前状态</h4>
              <div style={{
                background: '#1a1a1a',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div>👤 用户: {localParticipant?.identity}</div>
                <div>🎯 角色: "{localParticipant?.attributes?.role}" ({typeof localParticipant?.attributes?.role})</div>
                <div>🎤 麦位: {localParticipant?.attributes?.mic_status}</div>
                <div>👁️ 显示: {localParticipant?.attributes?.display_status}</div>
                <div>⚡ 最后操作: {localParticipant?.attributes?.last_action}</div>
                <div>🔧 事件监听状态: {eventListenerStatus}</div>
              </div>
            </div>

            {/* 踢下麦事件日志 */}
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#FF5722' }}>🚨 踢下麦事件日志 (增强版)</h4>
              <div style={{
                background: '#1a1a1a',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '11px',
                maxHeight: '250px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                minHeight: '100px'
              }}>
                {kickLogs.length > 0 ? kickLogs.join('\n') : '踢踢踢 等待踢下麦事件...'}
              </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setKickLogs([])}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🗑️ 清空日志
              </button>
              <button
                onClick={() => {
                  const attrs = localParticipant?.attributes;
                  addKickLog(`🔍 手动检查: role="${attrs?.role}", mic_status="${attrs?.mic_status}", last_action="${attrs?.last_action}"`);
                  addKickLog(`🔍 完整attributes: ${JSON.stringify(attrs)}`);
                }}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🔄 手动检查
              </button>
              <button
                onClick={() => {
                  addKickLog(`🧪 测试事件触发机制`);
                  // 手动触发一次检查
                  if (localParticipant) {
                    const attrs = localParticipant.attributes;
                    addKickLog(`🧪 强制检查所有字段变化`);
                    addKickLog(`🧪 当前attributes: ${JSON.stringify(attrs)}`);
                  }
                }}
                style={{
                  background: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🧪 测试事件
              </button>
              <button
                onClick={() => {
                  if (localParticipant) {
                    addKickLog(`🔐 LiveKit权限检查:`);
                    
                    // 检查权限
                    const permissions = localParticipant.permissions;
                    if (permissions) {
                      addKickLog(`  ├─ canPublish: ${permissions.canPublish}`);
                      addKickLog(`  ├─ canSubscribe: ${permissions.canSubscribe}`);
                      addKickLog(`  ├─ canPublishData: ${permissions.canPublishData}`);
                      addKickLog(`  └─ canUpdateMetadata: ${permissions.canUpdateMetadata}`);
                    } else {
                      addKickLog(`  ❌ 无法获取权限信息`);
                    }
                    
                    // 检查音频轨道状态
                    const audioTracks = Array.from(localParticipant.audioTrackPublications.values());
                    if (audioTracks.length > 0) {
                      addKickLog(`🎤 音频轨道状态:`);
                      audioTracks.forEach((track, index) => {
                        addKickLog(`  音频轨道${index + 1}:`);
                        addKickLog(`    ├─ isEnabled: ${track.isEnabled}`);
                        addKickLog(`    ├─ isMuted: ${track.isMuted}`);
                        addKickLog(`    ├─ isSubscribed: ${track.isSubscribed}`);
                        addKickLog(`    └─ track存在: ${!!track.track}`);
                      });
                    } else {
                      addKickLog(`🎤 ❌ 没有音频轨道`);
                    }
                    
                    // 检查连接状态
                    addKickLog(`🔗 连接状态:`);
                    addKickLog(`  └─ identity: ${localParticipant.identity}`);
                  }
                }}
                style={{
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🔐 检查权限
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 