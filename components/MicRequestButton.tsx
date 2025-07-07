'use client';

import React, { useEffect, useState } from 'react';
import { useParticipantContext, useLocalParticipant } from '@livekit/components-react';
import { isUserDisabled } from '../lib/token-utils';

interface MicRequestButtonProps {
  userRole?: number;
  disabled?: boolean;
}

export function MicRequestButton({ userRole = 1, disabled = false }: MicRequestButtonProps) {
  const { localParticipant } = useLocalParticipant();
  const [isDisabled, setIsDisabled] = useState(false);

  // 实时监听属性变化
  useEffect(() => {
    if (!localParticipant) return;
    
    // 初始检查用户是否被禁用
    setIsDisabled(isUserDisabled(localParticipant.attributes || {}));
    
    // 监听属性变化
    const handleAttributesChanged = () => {
      setIsDisabled(isUserDisabled(localParticipant.attributes || {}));
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

  const handleClick = () => {
    console.log(' 麦克风申请按钮点击 - LiveKit版本');
  };

  return (
    <button 
      className="mic-request-button"
      onClick={handleClick}
      disabled={disabled}
    >
       申请上麦
      
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

        .mic-request-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          transform: translateY(-1px);
        }

        .mic-request-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </button>
  );
}
