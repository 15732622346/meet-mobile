import * as React from 'react';
import { Participant } from 'livekit-client';
import { useParticipants } from '@livekit/components-react';
import { isHostOrAdmin, parseParticipantAttributes } from '../lib/token-utils';

interface MobileControlPanelProps {
  userRole?: number;
}

export function MobileControlPanel({ userRole }: MobileControlPanelProps) {
  const participants = useParticipants();
  const [chatMuted, setChatMuted] = React.useState(false);
  const [micMuted, setMicMuted] = React.useState(false);
  
  // 只有主持人或管理员可以使用控制面板
  const isHost = userRole ? userRole >= 2 : false;
  
  if (!isHost) {
    return null;
  }
  
  // 假设处理全局禁言功能
  const handleToggleChatMute = () => {
    setChatMuted(!chatMuted);
    // 这里应该发送指令到LiveKit服务器
    console.log('全局禁言状态：', !chatMuted);
  };
  
  // 假设处理全局静音功能
  const handleToggleMicMute = () => {
    setMicMuted(!micMuted);
    // 这里应该发送指令到LiveKit服务器
    console.log('全局麦克风静音状态：', !micMuted);
  };

  return (
    <div className="mobile-host-panel">
      <div className="mobile-host-panel-title">主持人控制面板</div>
      
      <div className="mobile-host-controls">
        <button 
          className={`mobile-host-control-btn ${chatMuted ? 'active' : ''}`} 
          onClick={handleToggleChatMute}
        >
          {chatMuted ? '解除全局禁言' : '全局禁言'}
        </button>
        
        <button 
          className={`mobile-host-control-btn ${micMuted ? 'active' : ''}`} 
          onClick={handleToggleMicMute}
        >
          {micMuted ? '解除全局静音' : '全局静音'}
        </button>
      </div>
      
      <style jsx>{`
        .mobile-host-panel {
          padding: 15px;
          background-color: #f8f8f8;
        }
        
        .mobile-host-panel-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          text-align: center;
          color: #333;
        }
        
        .mobile-host-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .mobile-host-control-btn {
          padding: 12px;
          border-radius: 8px;
          border: none;
          background-color: #eee;
          color: #333;
          font-weight: 500;
          font-size: 14px;
        }
        
        .mobile-host-control-btn.active {
          background-color: #ff6b6b;
          color: white;
        }
      `}</style>
    </div>
  );
} 