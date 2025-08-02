// 🎯 纯 participant.attributes 麦位管理系统
import React from 'react';
import { useParticipants, useLocalParticipant, useRoomInfo, useRoomContext, useTracks, MessageFormatter, useCreateLayoutContext, WidgetState } from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import { shouldShowInMicList, isRequestingMic, isOnMic, isMuted, canSpeak, isHostOrAdmin, getMicStatusText, getRoleText } from '../../../lib/token-utils';

interface CustomVideoConferenceProps {
  chatMessageFormatter?: MessageFormatter;
  SettingsComponent?: React.ComponentType<{ onClose?: () => void }>;
  userRole?: number;
  userName?: string;
  userId?: number;
}

interface CustomWidgetState extends WidgetState {
  showParticipants: boolean;
  showHostPanel: boolean;
  showMicMenu: boolean;
}

export function CustomVideoConferencePure({
  chatMessageFormatter,
  SettingsComponent,
  userRole,
  userName,
  userId,
}: CustomVideoConferenceProps) {
  // 基础状态
  const [currentMicStatus, setCurrentMicStatus] = React.useState<'disabled' | 'enabled' | 'requesting' | 'muted_by_host'>('disabled');
  const [showChatMenu, setShowChatMenu] = React.useState(false);
  const [chatGlobalMute, setChatGlobalMute] = React.useState(false);
  const [micGlobalMute, setMicGlobalMute] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState<string>('');

  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const roomInfo = useRoomInfo();
  const roomCtx = useRoomContext();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const layoutContext = useCreateLayoutContext();

  // 🎯 基于attributes的麦位列表
  const micListParticipants = React.useMemo(() => {
    return participants.filter(p => shouldShowInMicList(p.attributes || {}));
  }, [participants]);

  // 🎯 申请上麦的参与者
  const requestingParticipants = React.useMemo(() => {
    return participants.filter(p => isRequestingMic(p.attributes || {}));
  }, [participants]);

  // 🎯 已上麦的参与者
  const onMicParticipants = React.useMemo(() => {
    return participants.filter(p => isOnMic(p.attributes || {}));
  }, [participants]);

  // 🎯 被静音的参与者
  const mutedParticipants = React.useMemo(() => {
    return participants.filter(p => isMuted(p.attributes || {}));
  }, [participants]);

  // 🎯 判断当前用户是否为主持人
  const isCurrentUserHost = React.useMemo(() => {
    return userRole === 2 || userRole === 3;
  }, [userRole]);

  // 🎯 申请上麦 - 使用LiveKit原生API
  const handleRequestMic = React.useCallback(async () => {
    if (!localParticipant?.identity) return;

    try {
      // 🔥 使用LiveKit原生方法直接更新自己的attributes
      await localParticipant.setAttributes({
        mic_status: 'requesting',        // 麦克风状态：申请中
        display_status: 'visible',       // 🔑 关键：设为可见，会出现在麦位列表
        request_time: Date.now().toString(),
        action: 'mic_request',
        user_name: userName || localParticipant.name || localParticipant.identity
      });
      
      setDebugInfo(`✅ 申请上麦成功 - 使用LiveKit原生API`);
      setCurrentMicStatus('requesting');
      
    } catch (error) {
      setDebugInfo(`❌ 申请上麦失败: ${error} - 请检查token权限`);
    }
  }, [localParticipant, userName]);

  // 🎯 批准上麦
  const handleApproveMic = React.useCallback(async (participant: Participant) => {
    if (!roomInfo.name || !localParticipant?.identity) return;

    try {
      const response = await fetch('/api/approve-mic.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: roomInfo.name,
          participant_identity: participant.identity,
          operator_identity: localParticipant.identity,
          action: 'approve',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setDebugInfo(`✅ 批准上麦成功: ${participant.name}`);
      } else {
        setDebugInfo(`❌ 批准上麦失败: ${result.error}`);
      }
    } catch (error) {
      setDebugInfo(`❌ 批准上麦异常: ${error}`);
    }
  }, [roomInfo.name, localParticipant?.identity]);

  // 🎯 踢下麦
  const handleKickFromMic = React.useCallback(async (participant: Participant) => {
    if (!roomInfo.name || !localParticipant?.identity) return;

    try {
      // 🔧 修复：调用正确的API来真正踢下麦位并关闭音频
      const response = await fetch('/admin/admin-control-participants.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: roomInfo.name,
          target_identity: participant.identity,
          operator_identity: localParticipant.identity,
          action: 'kick_from_mic'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setDebugInfo(`✅ 踢下麦成功: ${participant.name}`);
      } else {
        setDebugInfo(`❌ 踢下麦失败: ${result.error}`);
      }
    } catch (error) {
      setDebugInfo(`❌ 踢下麦异常: ${error}`);
    }
  }, [roomInfo.name, localParticipant?.identity]);

  // 🎯 数据通道处理（仅保留聊天功能）
  const handleDataReceived = React.useCallback((payload: Uint8Array) => {
    try {
      const text = new TextDecoder().decode(payload).trim();
      if (!text.startsWith('{') || !text.endsWith('}')) {
        return;
      }
      const msg = JSON.parse(text);
      
      // ✅ 保留聊天和麦克风全局静音功能
      if (msg.type === 'chat-mute' && typeof msg.mute === 'boolean') {
        setChatGlobalMute(msg.mute);
      }
      if (msg.type === 'mic-mute' && typeof msg.mute === 'boolean') {
        setMicGlobalMute(msg.mute);
      }
      
    } catch (error) {
      console.warn('解析数据通道消息失败:', error);
    }
  }, []);

  // 🎯 监听participant attributes变化
  React.useEffect(() => {
    if (!roomCtx) return;

    // 监听数据通道
    roomCtx.on('dataReceived', handleDataReceived);
    
    // 🔑 监听participant attributes变化 - 实现实时同步
    const handleAttributesChanged = (
      changedAttributes: Record<string, string>,
      participant: any
    ) => {
      console.log(`🔄 参与者属性变化:`, {
        identity: participant.identity,
        name: participant.name,
        changed: changedAttributes,
        allAttributes: participant.attributes
      });
      
      // 当有人申请上麦或状态改变时，这里会自动触发
      // React会自动重新渲染麦位列表，因为participants数组已更新
      if (changedAttributes.mic_status || changedAttributes.display_status) {
        setDebugInfo(`🔄 ${participant.name || participant.identity} 麦位状态变化: ${changedAttributes.mic_status || '未变化'}`);
      }
    };

    roomCtx.on('participantAttributesChanged', handleAttributesChanged);
    
    return () => {
      roomCtx.off('dataReceived', handleDataReceived);
      roomCtx.off('participantAttributesChanged', handleAttributesChanged);
    };
  }, [roomCtx, handleDataReceived]);

  return (
    <div className="lk-video-conference" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 🎯 调试信息 */}
      {debugInfo && (
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '5px', 
          zIndex: 1000,
          maxWidth: '300px',
          fontSize: '12px'
        }}>
          {debugInfo}
          <button 
            onClick={() => setDebugInfo('')}
            style={{ marginLeft: '10px', fontSize: '10px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* 🎯 主视频区域 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MainVideoDisplay tracks={tracks} />
      </div>

      {/* 🎯 麦位管理面板 */}
      <div style={{ 
        position: 'fixed', 
        right: '20px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '10px',
        padding: '15px',
        minWidth: '250px',
        maxHeight: '60vh',
        overflowY: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>麦位管理</h3>
        
        {/* 申请上麦按钮 */}
        {!isCurrentUserHost && (
          <button 
            onClick={handleRequestMic}
            disabled={currentMicStatus === 'requesting'}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '10px',
              backgroundColor: currentMicStatus === 'requesting' ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: currentMicStatus === 'requesting' ? 'not-allowed' : 'pointer'
            }}
          >
            {currentMicStatus === 'requesting' ? '申请中...' : '申请上麦'}
          </button>
        )}

        {/* 麦位列表 */}
        <div>
          <h4 style={{ fontSize: '12px', margin: '0 0 5px 0' }}>
            麦位列表 ({micListParticipants.length})
          </h4>
          {micListParticipants.map(participant => (
            <div key={participant.identity} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px',
              margin: '2px 0',
              backgroundColor: '#f8f9fa',
              borderRadius: '3px',
              fontSize: '12px'
            }}>
              <div>
                <div>{participant.name}</div>
                <div style={{ color: '#666', fontSize: '10px' }}>
                  {getRoleText(participant.attributes || {})} - {getMicStatusText(participant.attributes || {})}
                </div>
              </div>
              
              {/* 主持人操作按钮 */}
              {isCurrentUserHost && (
                <div style={{ display: 'flex', gap: '5px' }}>
                  {isRequestingMic(participant.attributes || {}) && (
                    <button 
                      onClick={() => handleApproveMic(participant)}
                      style={{
                        padding: '2px 6px',
                        fontSize: '10px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      批准
                    </button>
                  )}
                  
                  {isOnMic(participant.attributes || {}) && (
                    <button 
                      onClick={() => handleKickFromMic(participant)}
                      style={{
                        padding: '2px 6px',
                        fontSize: '10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      踢下麦
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {micListParticipants.length === 0 && (
            <div style={{ color: '#999', fontSize: '12px', textAlign: 'center', padding: '10px' }}>
              暂无人在麦位
            </div>
          )}
        </div>

        {/* 申请列表（仅主持人可见） */}
        {isCurrentUserHost && requestingParticipants.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ fontSize: '12px', margin: '0 0 5px 0', color: '#ff6b35' }}>
              待审核申请 ({requestingParticipants.length})
            </h4>
            {requestingParticipants.map(participant => (
              <div key={participant.identity} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px',
                margin: '2px 0',
                backgroundColor: '#fff3cd',
                borderRadius: '3px',
                fontSize: '12px'
              }}>
                <div>
                  <div>{participant.name}</div>
                  <div style={{ color: '#666', fontSize: '10px' }}>
                    申请上麦
                  </div>
                </div>
                
                <button 
                  onClick={() => handleApproveMic(participant)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  批准
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 🎯 简化的主视频显示组件
function MainVideoDisplay({ tracks }: { tracks: any[] }) {
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {tracks.length > 0 ? (
        <div>视频区域 - {tracks.length} 个轨道</div>
      ) : (
        <div style={{ color: 'white' }}>等待视频流...</div>
      )}
    </div>
  );
}

export default CustomVideoConferencePure; 