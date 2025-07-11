import React from 'react';
import { useParticipants, useRoomContext, useRoomInfo } from '@livekit/components-react';
import { Participant } from 'livekit-client';
import { isRequestingMic, isOnMic, canSpeak, parseParticipantAttributes } from '../lib/token-utils';
import { API_CONFIG } from '../lib/config';

interface MobileMicListProps {
  userRole?: number;
  maxMicSlots?: number;
  userToken?: string;
  userName?: string;
}

export function MobileMicList({ userRole, maxMicSlots = 8, userToken, userName }: MobileMicListProps) {
  const participants = useParticipants();
  const roomCtx = useRoomContext();
  const roomInfo = useRoomInfo();
  const [expandedParticipant, setExpandedParticipant] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<Record<string, boolean>>({});
  
  const isHost = userRole ? userRole >= 2 : false;
  
  // 获取已在麦上的用户
  const activeMicParticipants = React.useMemo(() => {
    return participants.filter(p => isOnMic(p.attributes || {}));
  }, [participants]);
  
  // 获取申请上麦的用户
  const requestingParticipants = React.useMemo(() => {
    return participants.filter(p => isRequestingMic(p.attributes || {}));
  }, [participants]);
  
  // 处理申请上麦请求
  const handleApproveMic = async (participant: Participant) => {
    console.log('批准上麦:', participant.identity);
    
    setIsLoading(prev => ({ ...prev, [participant.identity]: true }));
    
    try {
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // 如果有Token，添加Authorization头
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      
      // 调用API处理上麦请求
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin-control-participants.php`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          room_name: roomInfo.name,
          target_identity: participant.identity,
          operator_identity: userName || 'admin',
          action: 'approve_mic'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 批准上麦成功:', participant.name);
      } else {
        console.error('❌ 批准上麦失败:', result.error);
        alert(`批准上麦失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ 批准上麦网络错误:', error);
      alert('网络错误，请重试');
    } finally {
      setIsLoading(prev => ({ ...prev, [participant.identity]: false }));
    }
  };
  
  // 处理踢下麦请求
  const handleRemoveFromMic = async (participant: Participant) => {
    console.log('踢下麦:', participant.identity);
    
    setIsLoading(prev => ({ ...prev, [participant.identity]: true }));
    
    try {
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // 如果有Token，添加Authorization头
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      
      // 调用API处理踢下麦请求
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin-control-participants.php`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          room_name: roomInfo.name,
          target_identity: participant.identity,
          operator_identity: userName || 'admin',
          action: 'kick_from_mic'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 踢下麦成功:', participant.name);
        setExpandedParticipant(null); // 关闭控制菜单
      } else {
        console.error('❌ 踢下麦失败:', result.error);
        alert(`踢下麦失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ 踢下麦网络错误:', error);
      alert('网络错误，请重试');
    } finally {
      setIsLoading(prev => ({ ...prev, [participant.identity]: false }));
    }
  };
  
  return (
    <div className="mobile-mic-list">
      <div className="mobile-mic-section">
        <div className="mobile-mic-section-title">麦位 ({activeMicParticipants.length}/{maxMicSlots})</div>
        
        <div className="mobile-mic-slots">
          {activeMicParticipants.map(participant => {
            const displayName = participant.name || participant.identity || 'Unknown';
            const avatarLetter = displayName.charAt(0).toUpperCase() || '?';
            const isLoadingAction = isLoading[participant.identity];
            
            return (
              <div 
                key={participant.identity}
                className="mobile-mic-slot"
                onClick={() => isHost ? setExpandedParticipant(
                  expandedParticipant === participant.identity ? null : participant.identity
                ) : null}
              >
                <div className="mobile-mic-avatar">
                  {avatarLetter}
                  {canSpeak(participant.attributes || {}) ? (
                    <div className="mobile-mic-status speaking"></div>
                  ) : (
                    <div className="mobile-mic-status muted"></div>
                  )}
                </div>
                <div className="mobile-mic-name">
                  {displayName}
                </div>
                
                {isHost && expandedParticipant === participant.identity && (
                  <div className="mobile-mic-controls">
                    <button 
                      className="mobile-mic-control-btn remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromMic(participant);
                      }}
                      disabled={isLoadingAction}
                    >
                      {isLoadingAction ? '处理中...' : '踢下麦'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* 显示空麦位 */}
          {Array(Math.max(0, maxMicSlots - activeMicParticipants.length)).fill(0).map((_, idx) => (
            <div key={`empty-${idx}`} className="mobile-mic-slot empty">
              <div className="mobile-mic-avatar empty">
                {idx + activeMicParticipants.length + 1}
              </div>
              <div className="mobile-mic-name">空麦位</div>
            </div>
          ))}
        </div>
      </div>
      
      {isHost && requestingParticipants.length > 0 && (
        <div className="mobile-mic-section">
          <div className="mobile-mic-section-title">麦克风申请 ({requestingParticipants.length})</div>
          
          <div className="mobile-mic-requests">
            {requestingParticipants.map(participant => {
              const displayName = participant.name || participant.identity || 'Unknown';
              const avatarLetter = displayName.charAt(0).toUpperCase() || '?';
              const isLoadingAction = isLoading[participant.identity];
              
              return (
                <div key={participant.identity} className="mobile-mic-request">
                  <div className="mobile-request-info">
                    <div className="mobile-request-avatar">
                      {avatarLetter}
                    </div>
                    <div className="mobile-request-name">
                      {displayName}
                    </div>
                  </div>
                  <button 
                    className="mobile-request-approve"
                    onClick={() => handleApproveMic(participant)}
                    disabled={isLoadingAction}
                  >
                    {isLoadingAction ? '处理中...' : '允许'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .mobile-mic-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 10px;
          background-color: white;
        }
        
        .mobile-mic-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .mobile-mic-section-title {
          font-size: 16px;
          font-weight: bold;
          color: #333;
        }
        
        .mobile-mic-slots {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .mobile-mic-slot {
          width: calc(25% - 8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          position: relative;
        }
        
        .mobile-mic-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background-color: #22c55e;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          position: relative;
        }
        
        .mobile-mic-avatar.empty {
          background-color: #ddd;
          color: #999;
        }
        
        .mobile-mic-status {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          border: 2px solid white;
        }
        
        .mobile-mic-status.speaking {
          background-color: #22c55e;
        }
        
        .mobile-mic-status.muted {
          background-color: #ef4444;
        }
        
        .mobile-mic-name {
          font-size: 12px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
        }
        
        .mobile-mic-controls {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          z-index: 10;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          padding: 5px;
          margin-top: 5px;
        }
        
        .mobile-mic-control-btn {
          width: 100%;
          padding: 8px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }
        
        .mobile-mic-control-btn.remove {
          background-color: #ef4444;
          color: white;
        }
        
        .mobile-mic-requests {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .mobile-mic-request {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 8px;
        }
        
        .mobile-request-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .mobile-request-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #22c55e;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        
        .mobile-request-name {
          font-size: 14px;
        }
        
        .mobile-request-approve {
          padding: 6px 12px;
          background-color: #22c55e;
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
} 