'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLocalParticipant, useParticipants, useRoomInfo } from '@livekit/components-react';
import { API_CONFIG } from '@/lib/config';
import { shouldShowInMicList } from '@/lib/token-utils';
import toast, { Toaster } from 'react-hot-toast';

// 创建统一的toast通知函数
const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const options = {
    duration: 3000,
    position: 'top-center' as const,
    style: {
      padding: '12px 16px',
      borderRadius: '8px',
      background: type === 'success' ? '#10b981' : 
                 type === 'error' ? '#ef4444' : 
                 type === 'warning' ? '#f59e0b' : '#3b82f6',
      color: 'white',
      fontWeight: '500',
      maxWidth: '90%',
      wordBreak: 'break-word' as const
    },
    icon: type === 'success' ? '✅' : 
          type === 'error' ? '❌' : 
          type === 'warning' ? '⚠️' : 'ℹ️',
  };
  
  toast(message, options);
};

// 🎯 纯 Participant 状态管理的 Hook
const useParticipantState = (roomDetails?: { maxMicSlots: number } | null) => {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const roomInfo = useRoomInfo();
  
  return React.useMemo(() => {
    const attributes = localParticipant?.attributes || {};
    
    // 🎯 所有状态都从 participant.attributes 获取
    const role = parseInt(attributes.role || '1');
    const micStatus = attributes.mic_status || 'off_mic';
    const displayStatus = attributes.display_status || 'hidden';
    const lastAction = attributes.last_action;
    
    // 🎯 基于角色的权限计算
    const isGuest = role === 0;
    const isRegularUser = role === 1;
    const isHost = role === 2;
    const isAdmin = role === 3;
    const canUseCamera = role >= 2;
    const canUseScreenShare = role >= 2;
    const canManageRoom = role >= 2;
    
    // 🎯 麦克风权限基于 participant 状态计算
    const canUseMic = React.useMemo(() => {
      // 主持人/管理员总是可以使用麦克风
      if (role >= 2) return true;
      
      // 游客不能使用麦克风
      if (role === 0) return false;
      
      // 已静音状态的用户不能使用麦克风
      if (micStatus === 'muted') return false;
      
      // 普通用户需要检查麦克风状态
      // 1. 已上麦的用户可以使用
      if (micStatus === 'on_mic') return true;
      
      // 2. 检查是否有发布权限
      const hasPublishPermission = localParticipant?.permissions?.canPublish;
      if (hasPublishPermission) return true;
      
      // 3. 其他情况不可用
      return false;
    }, [role, micStatus, localParticipant?.permissions]);
    
    // 🎯 麦位统计基于所有参与者状态
    const micStats = React.useMemo(() => {
      // 🔧 修复：麦位列表中的人数应该是真正上麦的用户数量
      const micListCount = participants.filter(p => 
        p.attributes?.mic_status === 'on_mic'
      ).length;
      
      // 已上麦的用户数量（与micListCount保持一致）
      const onMicCount = participants.filter(p => 
        p.attributes?.mic_status === 'on_mic'
      ).length;
      
      // 申请中的用户数量
      const requestingCount = participants.filter(p => 
        p.attributes?.mic_status === 'requesting'
      ).length;
      
      // 是否有主持人在线
      const hasHost = participants.some(p => 
        parseInt(p.attributes?.role || '1') >= 2
      );
      
      // 🎯 修复：优先使用LiveKit房间元数据中的maxMicSlots
      let maxSlots = 8; // 默认值
      
      try {
        // 1. 首先尝试从房间元数据中读取
        if (roomInfo?.metadata) {
          const metadata = JSON.parse(roomInfo.metadata);
          if (metadata && typeof metadata.maxMicSlots === 'number') {
            maxSlots = metadata.maxMicSlots;
            console.log('🎯 从LiveKit房间元数据获取麦位数量:', maxSlots);
          }
        }
        // 2. 其次从roomDetails中获取
        else if (roomDetails?.maxMicSlots) {
          maxSlots = roomDetails.maxMicSlots;
          console.log('🎯 从roomDetails获取麦位数量:', maxSlots);
        }
      } catch (error) {
        console.error('❌ 解析房间元数据失败:', error);
      }
      
      return {
        micListCount,
        onMicCount,
        requestingCount,
        hasHost,
        maxSlots,
        hasAvailableSlots: micListCount < maxSlots
      };
    }, [participants, roomDetails, roomInfo]);
    
    return {
      // 基础信息
      role,
      micStatus,
      displayStatus,
      lastAction,
      
      // 权限信息
      isGuest,
      isRegularUser,
      isHost,
      isAdmin,
      canUseCamera,
      canUseScreenShare,
      canManageRoom,
      canUseMic,
      
      // 麦位统计
      micStats,
      
      // 原始数据（调试用）
      attributes,
      permissions: localParticipant?.permissions
    };
  }, [localParticipant?.attributes, localParticipant?.permissions, participants, roomDetails, roomInfo]);
};

// 🎯 简化的接口，移除不必要的 props
interface ModernFooterProps {
  isScreenSharing: boolean;
  widgetState: {
    showChat: boolean;
    showParticipants: boolean;
    showHostPanel: boolean;
    unreadMessages: number;
  };
  micGlobalMute: boolean;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleHostPanel: () => void;
  onToggleSettings: () => void;
  onLeaveRoom: () => void;
  onMicStatusChange: (status: string) => void;
  room?: any; // LiveKit Room 对象
  roomDetails?: {
    maxMicSlots: number;
    roomName: string;
    roomState: number;
  } | null; // 🎯 新增：房间配置信息
}

export function ModernFooter({
  isScreenSharing,
  widgetState,
  micGlobalMute,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onToggleHostPanel,
  onToggleSettings,
  onLeaveRoom,
  onMicStatusChange,
  room,
  roomDetails,
}: ModernFooterProps) {
  const { localParticipant } = useLocalParticipant();
  const roomInfo = useRoomInfo();

  // 🎯 使用纯 Participant 状态管理
  const participantState = useParticipantState(roomDetails);

  // 🎯 游客权限检查函数 - 基于 participant 角色
  const handleGuestRestriction = (actionName: string): boolean => {
    if (participantState.isGuest) {
      // 🎯 使用 confirm 对话框，让用户选择是否前往注册登录
      if (confirm(`游客必须注册为会员才能使用${actionName}功能，是否前往注册登录？`)) {
        // 用户选择"是" - 刷新页面，跳转到登录页面
        window.location.reload();
      }
      // 用户选择"否" - 什么都不做，对话框自动关闭
      return true; // 阻止原本的操作
    }
    return false; // 允许操作
  };

  // 🎯 麦克风可用性 - 完全基于 participant 状态
  const isMicAvailable = React.useMemo(() => {
    // 主持人/管理员不受限制
    if (participantState.canManageRoom) return true;
    
    // 如果全员禁麦，普通用户不可用
    if (micGlobalMute && !participantState.canManageRoom) return false;
    
    // 使用 participant 状态计算的权限
    return participantState.canUseMic;
  }, [participantState.canManageRoom, participantState.canUseMic, micGlobalMute]);

  // 🎯 麦克风申请处理 - 使用 LiveKit 原生 API
  const handleMicRequest = async () => {
    console.log('🎤 申请上麦 - 纯 Participant 状态管理');
    
    // 🎯 游客权限检查 - 放在最前面
    if (handleGuestRestriction('上麦申请')) return;
    
    // 基础检查
    if (!participantState.micStats.hasHost) {
      showToast('请等待主持人进入房间后再申请上麦', 'info');
      return;
    }
    
    // 🎯 麦位数量限制检查
    if (!participantState.micStats.hasAvailableSlots) {
      showToast(`麦位已满！当前麦位列表已有 ${participantState.micStats.micListCount}/${participantState.micStats.maxSlots} 人，请等待有人退出后再申请。`, 'warning');
      return;
    }
    
    // 🎯 检查用户当前状态
    if (participantState.micStatus === 'requesting') {
      showToast('您已经在申请中，请等待主持人批准', 'info');
      return;
    }
    
    if (participantState.micStatus === 'on_mic') {
      showToast('您已经在麦位上了', 'info');
      return;
    }
    
    if (!localParticipant) {
      console.error('❌ 申请上麦失败：localParticipant 不存在');
      return;
    }

    try {
      console.log(`🎯 申请上麦检查通过 - 当前麦位: ${participantState.micStats.micListCount}/${participantState.micStats.maxSlots}`);
      
      // 🎯 使用 LiveKit 原生方法更新 attributes
      await localParticipant.setAttributes({
        mic_status: 'requesting',
        display_status: 'visible',
        request_time: Date.now().toString(),
        last_action: 'request',
        user_name: localParticipant?.identity || 'unknown'
      });
      
      // 更新本地状态
      onMicStatusChange('requesting');
      console.log('✅ 申请上麦成功 - 已更新 participant attributes');

    } catch (error) {
      console.error('❌ 申请上麦失败:', error);
      showToast('申请上麦失败，请刷新页面重新登录', 'error');
    }
  };

  // 🎯 麦克风按钮点击处理 - 基于 participant 状态
  const handleMicClick = React.useCallback(async () => {
    // 🔍 调试：记录按钮点击事件
    console.log('🎯 麦克风按钮点击', {
      room: room?.name,
      participant: localParticipant?.identity,
      enabled: localParticipant?.isMicrophoneEnabled,
      canUseMic: participantState.canUseMic,
      micStatus: participantState.micStatus,
      role: participantState.role,
      attributes: participantState.attributes,
      permissions: participantState.permissions
    });

    // 🎯 游客权限检查
    if (handleGuestRestriction('麦克风')) return;
    
    // 🎯 权限检查
    if (!isMicAvailable) {
      console.log('🎯 麦克风不可用，显示提示信息');
      
      if (participantState.micStatus === 'requesting') {
        showToast('⏳ 您的上麦申请正在等待主持人批准', 'info');
      } else if (participantState.micStatus === 'off_mic' && participantState.role === 1) {
        showToast('⚠️ 您需要先申请上麦权限才能使用麦克风', 'warning');
      } else if (micGlobalMute && !participantState.canManageRoom) {
        showToast('⚠️ 主持人已启用全员禁麦', 'warning');
      } else {
        showToast('⚠️ 麦克风当前不可用，请联系主持人', 'warning');
      }
      return;
    }
    
    // 🎯 状态一致性检查和修复
    if (participantState.micStatus === 'on_mic' && !localParticipant?.permissions?.canPublish) {
      console.warn('🔧 检测到状态不一致：已上麦但无发布权限，尝试修复');
      
      try {
        const apiUrl = `${window.location.origin}/admin/admin-control-participants.php`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          credentials: 'include',
          body: new URLSearchParams({
            action: 'approve_mic',
            room_name: room?.name || '',
            target_identity: localParticipant?.identity || ''
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ 权限修复成功，等待权限更新生效...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.warn('⚠️ 权限修复失败:', result.error);
          }
        }
      } catch (error) {
        console.error('❌ 权限修复异常:', error);
      }
    }
    
    // 🎯 执行麦克风切换
    try {
      await localParticipant?.setMicrophoneEnabled(!localParticipant?.isMicrophoneEnabled);
      console.log('✅ 麦克风状态切换成功');
    } catch (error) {
      console.error('❌ 麦克风切换失败:', error);
      
      if (error instanceof Error && error.message.includes('insufficient permissions')) {
        console.error('🚨 权限不足详情:', {
          error: error.message,
          permissions: localParticipant?.permissions,
          attributes: localParticipant?.attributes
        });
        showToast(`⚠️ 麦克风权限不足！\n\n可能的解决方案：\n1. 联系主持人重新批准上麦\n2. 刷新页面重新登录\n3. 检查您的用户角色权限\n\n错误详情: ${error.message}`, 'warning');
      } else {
        showToast(`❌ 麦克风操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
      }
    }
  }, [localParticipant, participantState, isMicAvailable, micGlobalMute, room, handleGuestRestriction]);

  return (
    <div className="modern-footer">
      {/* Toast通知组件 */}
      <Toaster />
      <div className="control-buttons">
        {/* 麦克风按钮 - 🎯 基于 participant 状态显示 */}
        <button 
          className={`control-btn mic ${localParticipant?.isMicrophoneEnabled ? 'active' : 'inactive'} ${!isMicAvailable ? 'no-permission' : ''} ${participantState.isGuest ? 'guest-restricted' : ''}`}
          onClick={handleMicClick}
          disabled={!isMicAvailable && participantState.role !== 0} // 修改：只有游客状态下不禁用按钮
          title={
            participantState.isGuest ? 
              '游客需要注册为会员' : 
              (!isMicAvailable ? 
                (micGlobalMute && !participantState.canManageRoom ? '已启用全员禁麦' : 
                 participantState.micStatus === 'muted' ? '您已被主持人禁麦' : '需要申请麦克风权限') : 
                (localParticipant?.isMicrophoneEnabled ? '静音' : '取消静音')
              )
          }
        >
          <span className="btn-icon">🎤</span>
          <span className="btn-label">麦克风</span>
        </button>

        {/* 摄像头按钮 - 只有主持人和管理员可见 */}
        {participantState.canUseCamera && (
          <button 
            className={`control-btn camera ${localParticipant?.isCameraEnabled ? 'active' : 'inactive'}`}
            onClick={() => localParticipant?.setCameraEnabled(!localParticipant?.isCameraEnabled)}
            title={localParticipant?.isCameraEnabled ? "关闭摄像头" : "开启摄像头"}
          >
            <span className="btn-icon">📹</span>
            <span className="btn-label">摄像头</span>
          </button>
        )}

        {/* 申请上麦按钮 - 游客和普通用户可见 */}
        {(participantState.isGuest || participantState.isRegularUser) && (
          <button 
            className={`control-btn request-mic ${participantState.micStatus === 'requesting' ? 'requesting' : ''} ${participantState.isGuest ? 'guest-restricted' : ''} ${!participantState.micStats.hasHost || !participantState.micStats.hasAvailableSlots ? 'disabled' : ''}`}
            onClick={handleMicRequest}
            disabled={(!participantState.micStats.hasHost || !participantState.micStats.hasAvailableSlots) && !participantState.isGuest} // 游客不禁用按钮，让其可以点击查看提示
            title={
              participantState.isGuest 
                ? '游客需要注册为会员' 
                : !participantState.micStats.hasHost 
                  ? '等待主持人进入后可申请上麦'
                  : !participantState.micStats.hasAvailableSlots
                    ? `麦位已满 (${participantState.micStats.micListCount}/${participantState.micStats.maxSlots})`
                    : `申请上麦 (${participantState.micStats.micListCount}/${participantState.micStats.maxSlots})`
            }
          >
            <span className="btn-icon">🙋‍♂️</span>
            <span className="btn-label">
              {!participantState.micStats.hasHost 
                ? '等待主持人' 
                : !participantState.micStats.hasAvailableSlots 
                  ? `麦位已满 (${participantState.micStats.micListCount}/${participantState.micStats.maxSlots})`
                  : participantState.micStatus === 'requesting'
                    ? '申请中...'
                    : `申请上麦 (${participantState.micStats.micListCount}/${participantState.micStats.maxSlots})`
              }
            </span>
          </button>
        )}

        {/* 屏幕共享按钮 - 只有主持人和管理员可见 */}
        {participantState.canUseScreenShare && (
          <button 
            className={`control-btn screen-share ${isScreenSharing ? 'active' : 'inactive'}`}
            onClick={onToggleScreenShare}
            title={isScreenSharing ? "停止屏幕共享" : "开始屏幕共享"}
          >
            <span className="btn-icon">🖥️</span>
            <span className="btn-label">共享</span>
          </button>
        )}

        {/* 设置按钮 - 所有用户可见 */}
        <button 
          className="control-btn settings"
          onClick={onToggleSettings}
          title="设置"
        >
          <span className="btn-icon">⚙️</span>
          <span className="btn-label">设置</span>
        </button>

        {/* 结束会议按钮 - 所有用户可见 */}
        <button className="control-btn end-meeting" onClick={onLeaveRoom}>
          <span className="btn-icon">📞</span>
          <span className="btn-label">结束</span>
        </button>
      </div>

      <style jsx>{`
        .modern-footer {
          position: relative;
          width: 100%;
          height: 65px;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 30px;
          user-select: none;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
          border-top: 1px solid #333;
        }

        .control-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .control-btn {
          min-width: 80px;
          height: 45px;
          border-radius: 8px;
          border: none;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 6px;
          position: relative;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          padding: 8px 12px;
        }

        .btn-icon {
          font-size: 16px;
          line-height: 1;
          flex-shrink: 0;
        }

        .btn-label {
          font-size: 12px;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
        }

        .control-btn.request-mic.requesting {
          background: #f39c12;
          animation: pulse 2s infinite;
        }

        .control-btn.request-mic:not(.requesting) {
          background: #00d4aa;
        }

        .control-btn.active {
          background: #00d4aa;
          box-shadow: 0 4px 12px rgba(0, 212, 170, 0.4);
        }

        .control-btn.inactive {
          background: #555;
        }

        .control-btn.mic.inactive {
          background: #e74c3c;
        }

        .control-btn.camera.inactive {
          background: #e74c3c;
        }

        .control-btn.end-meeting {
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          min-width: 70px;
        }

        .control-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0, 212, 170, 0.4);
        }

        .control-btn.inactive:hover {
          box-shadow: 0 6px 16px rgba(85, 85, 85, 0.4);
        }

        .control-btn.mic.inactive:hover,
        .control-btn.camera.inactive:hover {
          box-shadow: 0 6px 16px rgba(231, 76, 60, 0.4);
        }

        .control-btn.end-meeting:hover {
          box-shadow: 0 6px 16px rgba(231, 76, 60, 0.4);
        }

        .control-btn.host-panel.active {
          background: #f39c12;
        }

        /* 新增：无权限状态样式 */
        .control-btn.no-permission {
          background: #666 !important;
          opacity: 0.5;
          cursor: not-allowed !important;
        }

        .control-btn.no-permission:hover {
          transform: none !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
        }

        .control-btn.no-permission .btn-icon {
          opacity: 0.6;
        }

        .control-btn.no-permission .btn-label {
          opacity: 0.6;
        }

        /* 🎯 新增：游客受限状态样式 */
        .control-btn.guest-restricted {
          border: 2px dashed #ffa500 !important;
          position: relative;
          background: linear-gradient(135deg, #777 0%, #555 100%) !important;
        }

        .control-btn.guest-restricted::after {
          content: "🔒";
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ffa500;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border: 2px solid #333;
          z-index: 1;
        }

        .control-btn.guest-restricted:hover {
          border-color: #ff6b35 !important;
          box-shadow: 0 6px 16px rgba(255, 165, 0, 0.3) !important;
        }

        .control-btn.guest-restricted .btn-label {
          color: #ffa500 !important;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
          .modern-footer {
            padding: 0 15px;
            height: 60px;
          }
          
          .control-buttons {
            gap: 10px;
          }
          
          .control-btn {
            min-width: 70px;
            height: 40px;
            padding: 6px 8px;
            gap: 4px;
          }
          
          .btn-icon {
            font-size: 14px;
          }
          
          .btn-label {
            font-size: 10px;
          }
        }

        @media (max-width: 480px) {
          .modern-footer {
            height: 55px;
          }
          
          .control-buttons {
            gap: 8px;
          }
          
          .control-btn {
            min-width: 60px;
            height: 35px;
            padding: 4px 6px;
            gap: 3px;
          }
          
          .btn-icon {
            font-size: 12px;
          }
          
          .btn-label {
            font-size: 9px;
          }
        }

        /* 🎯 新增：等待主持人时的disabled状态样式 */
        .control-btn.disabled {
          background: #666 !important;
          opacity: 0.5;
          cursor: not-allowed !important;
        }

        .control-btn.disabled:hover {
          transform: none !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
        }

        .control-btn.disabled .btn-icon,
        .control-btn.disabled .btn-label {
          opacity: 0.6;
        }

        /* 🎯 新增：麦位已满状态的特殊样式 */
        .control-btn.request-mic.disabled {
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
          border: 2px solid #fca5a5;
        }

        .control-btn.request-mic.disabled:hover {
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3) !important;
        }

        .control-btn.request-mic.disabled .btn-label {
          color: #fca5a5 !important;
          font-weight: 600;
        }

        /* 设置按钮样式 */
        .control-btn.settings {
          background: #555;
        }

        .control-btn.settings:hover {
          box-shadow: 0 6px 16px rgba(85, 85, 85, 0.4);
        }
      `}</style>
    </div>
  );
} 