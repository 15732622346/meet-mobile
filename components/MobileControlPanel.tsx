import React from 'react';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { MobileMicList } from './MobileMicList';
import { MobileAvatarRow } from './MobileAvatarRow';

interface MobileControlPanelProps {
  userRole?: number;
  userName?: string;
  userToken?: string;
}

export function MobileControlPanel({ userRole, userName, userToken }: MobileControlPanelProps) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  
  // 当前显示的面板内容
  const [activePanel, setActivePanel] = React.useState<'mic' | 'participants'>('mic');
  
  // 从localParticipant获取用户名，如果没有传入
  const effectiveUserName = userName || localParticipant?.name || localParticipant?.identity;
  
  return (
    <div className="mobile-control-panel">
      <div className="mobile-control-tabs">
        <div
          className={`mobile-control-tab ${activePanel === 'mic' ? 'active' : ''}`}
          onClick={() => setActivePanel('mic')}
        >
          麦位管理
        </div>
        <div
          className={`mobile-control-tab ${activePanel === 'participants' ? 'active' : ''}`}
          onClick={() => setActivePanel('participants')}
        >
          参会者
        </div>
      </div>
      
      <div className="mobile-control-content">
        {activePanel === 'mic' ? (
          <MobileMicList 
            userRole={userRole} 
            userToken={userToken}
            userName={effectiveUserName}
          />
        ) : (
          <div className="mobile-participants-list">
            <MobileAvatarRow />
          </div>
        )}
      </div>
      
      <style jsx>{`
        .mobile-control-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: white;
        }
        
        .mobile-control-tabs {
          display: flex;
          border-bottom: 1px solid #e5e5e5;
        }
        
        .mobile-control-tab {
          flex: 1;
          text-align: center;
          padding: 15px 0;
          font-size: 14px;
          color: #666;
          cursor: pointer;
        }
        
        .mobile-control-tab.active {
          color: #22c55e;
          font-weight: bold;
          border-bottom: 2px solid #22c55e;
        }
        
        .mobile-control-content {
          flex: 1;
          overflow-y: auto;
        }
        
        .mobile-participants-list {
          padding: 10px;
        }
      `}</style>
    </div>
  );
} 