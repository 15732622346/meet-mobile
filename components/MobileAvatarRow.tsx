import React, { useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 过滤出应该显示在麦位列表中的参与者（display_status为'visible'的参与者）
  // 这与PC端麦位列表的过滤逻辑保持一致
  const participants = React.useMemo(() => 
    allParticipants.filter(p => shouldShowInMicList(p.attributes || {})),
    [allParticipants]
  );
  
  // 滚动到右侧查看更多头像
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += 120; // 一次滚动两个头像的宽度
    }
  };
  
  return (
    <div className="mobile-avatar-container">
      <div className="mobile-avatar-row" ref={scrollContainerRef}>
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
                    <img src={micIconSrc} alt="麦位状态" width={12} height={12} />
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
      </div>
      
      <div className="scroll-indicator" onClick={scrollRight}>
        <div className="triangle-right"></div>
      </div>
      
      <style jsx>{`
        .mobile-avatar-container {
          display: flex;
          align-items: center;
          background-color: #333333;
        }
        
        .mobile-avatar-row {
          display: flex;
          overflow-x: auto;
          padding: 3px 5px; /* 只修改上下内边距为3px */
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none; /* Firefox */
          flex: 1;
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
          width: 39px;
          height: 39px;
          border-radius: 50%;
          background-color: #22c55e;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px; /* 减小字体大小以适应较小的头像 */
          margin: 0 auto;
          border: none; /* 移除边框 */
        }
        
        .mic-status-icon {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: #00CED1; /* 修改为青色背景 */
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #00FFFF; /* 更新边框颜色，与背景色协调 */
        }
        
        .mobile-avatar-name {
          font-size: 12px;
          margin-top: 1px; /* 从5px减少到1px */
          color: white;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        
        .scroll-indicator {
          width: 30px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding-right: 8px;
        }
        
        .triangle-right {
          width: 0;
          height: 0;
          border-top: 8px solid transparent;
          border-left: 12px solid #22c55e;
          border-bottom: 8px solid transparent;
        }
      `}</style>
    </div>
  );
}