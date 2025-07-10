import React from 'react';
import { useParticipants } from '@livekit/components-react';
import { Participant } from 'livekit-client';
import { parseParticipantAttributes, isOnMic, isRequestingMic, isMuted, shouldShowInMicList } from '../lib/token-utils';
import Image from 'next/image';

interface MobileAvatarRowProps {
  onAvatarClick?: (participant: Participant) => void;
}

// 获取麦位状态图标
const getMicStatusIcon = (attributes: Record<string, string>): string => {
  const status = parseParticipantAttributes(attributes);
  const micStatus = status.micStatus;
  
  if (micStatus === 'requesting') return '/images/needmic.png';
  if (micStatus === 'on_mic') return '/images/mic.png';
  if (micStatus === 'muted') return '/images/nomic.png';
  return '/images/nomic.png';
};

// 判断是否应该显示麦位图标
const shouldShowMicIcon = (attributes: Record<string, string>): boolean => {
  return isOnMic(attributes) || isRequestingMic(attributes) || isMuted(attributes);
};

export function MobileAvatarRow({ onAvatarClick }: MobileAvatarRowProps) {
  const allParticipants = useParticipants();
  
  // 过滤出应该显示在麦位列表中的参与者（display_status为'visible'的参与者）
  // 这与PC端麦位列表的过滤逻辑保持一致
  const participants = React.useMemo(() => 
    allParticipants.filter(p => shouldShowInMicList(p.attributes || {})),
    [allParticipants]
  );
  
  return (
    <div className="mobile-avatar-row">
      {participants.map((participant) => {
        const displayName = participant.name || participant.identity || 'Unknown';
        const avatarLetter = displayName.charAt(0).toUpperCase() || '?';
        const attributes = participant.attributes || {};
        const showMicIcon = shouldShowMicIcon(attributes);
        const micIconSrc = getMicStatusIcon(attributes);
        
        return (
          <div 
            key={participant.identity} 
            className="mobile-avatar-item"
            onClick={() => onAvatarClick?.(participant)}
          >
            <div className="mobile-avatar">
              {avatarLetter}
              {showMicIcon && (
                <div className="mic-status-icon">
                  <img src={micIconSrc} alt="麦位状态" width={16} height={16} />
                </div>
              )}
            </div>
            <div className="mobile-avatar-name">
              {displayName.length > 4 
                ? `${displayName.substring(0, 4)}..` 
                : displayName}
            </div>
          </div>
        );
      })}
      
      <style jsx>{`
        .mobile-avatar-row {
          display: flex;
          overflow-x: auto;
          padding: 10px 5px;
          background-color: #111;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none; /* Firefox */
        }
        
        .mobile-avatar-row::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Edge */
        }
        
        .mobile-avatar-item {
          flex: 0 0 auto;
          width: 60px;
          margin-right: 5px;
          text-align: center;
        }
        
        .mobile-avatar {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background-color: #22c55e;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin: 0 auto;
        }
        
        .mic-status-icon {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #00CED1; /* 修改为青色背景 */
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #00FFFF; /* 更新边框颜色，与背景色协调 */
        }
        
        .mobile-avatar-name {
          font-size: 12px;
          margin-top: 5px;
          color: white;
          text-overflow: ellipsis;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
} 