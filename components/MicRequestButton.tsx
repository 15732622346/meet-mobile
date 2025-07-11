'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParticipantContext, useLocalParticipant, useParticipants, useRoomContext } from '@livekit/components-react';
import { isUserDisabled, shouldShowInMicList } from '../lib/token-utils';

interface MicRequestButtonProps {
  userRole?: number;
  disabled?: boolean;
  maxMicSlots?: number; // 添加最大麦位数量参数
  userName?: string; // 添加用户名参数
  userToken?: string; // 添加用户Token参数
}

export function MicRequestButton({ 
  userRole = 1, 
  disabled = false, 
  maxMicSlots = 5,
  userName,
  userToken
}: MicRequestButtonProps) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const [isDisabled, setIsDisabled] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isOnMic, setIsOnMic] = useState(false);

  // 计算麦位统计信息
  const micStats = useMemo(() => {
    // 在麦位列表中显示的人数
    const micListCount = participants.filter(p => 
      shouldShowInMicList(p.attributes || {})
    ).length;
    
    // 申请中的用户数量
    const requestingCount = participants.filter(p => 
      p.attributes?.mic_status === 'requesting'
    ).length;
    
    // 是否有主持人在线
    const hasHost = participants.some(p => 
      parseInt(p.attributes?.role || '1') >= 2
    );
    
    return {
      micListCount,
      maxSlots: maxMicSlots,
      hasAvailableSlots: micListCount < maxMicSlots,
      requestingCount,
      hasHost
    };
  }, [participants, maxMicSlots]);

  // 实时监听属性变化
  useEffect(() => {
    if (!localParticipant) return;
    
    // 初始状态检查
    const updateLocalState = () => {
      const attrs = localParticipant.attributes || {};
      setIsDisabled(isUserDisabled(attrs));
      setIsRequesting(attrs.mic_status === 'requesting');
      setIsOnMic(attrs.mic_status === 'on_mic');
    };
    
    // 初始检查
    updateLocalState();
    
    // 监听属性变化
    const handleAttributesChanged = () => {
      updateLocalState();
    };
    
    localParticipant.on('attributesChanged', handleAttributesChanged);
    
    return () => {
      localParticipant.off('attributesChanged', handleAttributesChanged);
    };
  }, [localParticipant]);
  
  // 如果用户是主持人以上角色，不显示申请上麦按钮
  if (userRole >= 2) {
    return null;
  }
  
  // 如果用户被禁用，显示禁用状态按钮
  if (isDisabled) {
    return (
      <button 
        className="mic-request-button disabled"
        disabled={true}
        title="您已被禁用，无法申请上麦"
      >
        无法申请上麦
        
        <style jsx>{`
          .mic-request-button {
            background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .mic-request-button.disabled {
            background: #d1d5db;
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </button>
    );
  }

  // 🔥 申请上麦 - 使用LiveKit原生API
  const requestMic = async () => {
    if (!room || !localParticipant) return;
    
    // 如果用户被禁用，不允许申请上麦
    if (isDisabled) {
      alert('您的账号已被管理员禁用，无法申请上麦');
      return;
    }
    
    // 检查是否有主持人在线
    if (!micStats.hasHost) {
      alert('请等待主持人进入房间后再申请上麦');
      return;
    }
    
    // 检查麦位是否已满
    if (!micStats.hasAvailableSlots) {
      alert(`麦位已满！当前麦位列表已有 ${micStats.micListCount}/${maxMicSlots} 人，请等待有人退出后再申请。`);
      return;
    }
    
    // 检查用户当前状态
    if (isRequesting) {
      alert('您已经在申请中，请等待主持人批准');
      return;
    }
    
    if (isOnMic) {
      alert('您已经在麦位上了');
      return;
    }
    
    try {
      console.log(`🎯 申请上麦检查通过 - 当前麦位使用情况: ${micStats.micListCount}/${maxMicSlots}`);
      
      // 使用LiveKit原生方法直接更新自己的attributes
      await localParticipant.setAttributes({
        ...localParticipant.attributes,
        mic_status: 'requesting',
        display_status: 'visible',
        request_time: Date.now().toString(),
        last_action: 'request',
        user_name: userName || localParticipant.name || localParticipant.identity
      });
      
      setIsRequesting(true);
      console.log('✅ 申请上麦成功 - 使用LiveKit原生API');
    } catch (error) {
      console.error('❌ 申请上麦失败:', error);
      alert('申请上麦失败，请重试');
    }
  };

  // 禁用条件
  const buttonDisabled = disabled || !micStats.hasAvailableSlots || isRequesting || isOnMic || !micStats.hasHost;
  
  // 按钮文本
  let buttonText = '';
  if (isRequesting) {
    buttonText = '申请中...';
  } else if (isOnMic) {
    buttonText = '已上麦';
  } else if (!micStats.hasHost) {
    buttonText = '等待主持人';
  } else if (!micStats.hasAvailableSlots) {
    buttonText = `麦位已满 (${micStats.micListCount}/${micStats.maxSlots})`;
  } else {
    buttonText = `申请上麦 (${micStats.micListCount}/${micStats.maxSlots})`;
  }

  // 按钮样式
  let buttonClass = 'mic-request-button';
  if (isRequesting) buttonClass += ' requesting';
  if (isOnMic) buttonClass += ' on-mic';
  if (!micStats.hasAvailableSlots) buttonClass += ' mic-full';
  if (!micStats.hasHost) buttonClass += ' waiting-host';

  return (
    <button 
      className={buttonClass}
      onClick={requestMic}
      disabled={buttonDisabled}
      title={`申请上麦 (${micStats.micListCount}/${micStats.maxSlots})`}
    >
      <span className="btn-icon">🙋‍♂️</span>
      <span className="btn-label">{buttonText}</span>
      
      <style jsx>{`
        .mic-request-button {
          background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .mic-request-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          transform: translateY(-1px);
        }

        .mic-request-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .mic-request-button.mic-full {
          background: #dc2626;
        }
        
        .mic-request-button.requesting {
          background: #f59e0b;
        }
        
        .mic-request-button.on-mic {
          background: #3b82f6;
        }
        
        .mic-request-button.waiting-host {
          background: #6b7280;
        }
        
        .btn-icon {
          font-size: 16px;
        }
      `}</style>
    </button>
  );
}
