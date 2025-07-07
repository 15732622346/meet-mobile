import React from 'react';
import { useParticipants } from '@livekit/components-react';
import { Participant } from 'livekit-client';

interface MobileAvatarRowProps {
  onAvatarClick?: (participant: Participant) => void;
}

export function MobileAvatarRow({ onAvatarClick }: MobileAvatarRowProps) {
  const participants = useParticipants();
  
  return (
    <div className="mobile-avatar-row">
      {participants.map((participant) => {
        const displayName = participant.name || participant.identity || 'Unknown';
        const avatarLetter = displayName.charAt(0).toUpperCase() || '?';
        
        return (
          <div 
            key={participant.identity} 
            className="mobile-avatar-item"
            onClick={() => onAvatarClick?.(participant)}
          >
            <div className="mobile-avatar">
              {avatarLetter}
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