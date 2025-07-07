import * as React from 'react';
import {
  useParticipants,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
  usePinnedTracks,
} from '@livekit/components-react';
import { Track, RoomEvent, Room } from 'livekit-client';
import { MobileAvatarRow } from './MobileAvatarRow';
import { MobileTabs, TabItem } from './MobileTabs';
import { MobileChat } from './MobileChat';
import { MobileMicList } from './MobileMicList';
import { MobileControlPanel } from './MobileControlPanel';

interface MobileVideoConferenceProps {
  userRole?: number;
  userName?: string;
  userId?: number;
}

export function MobileVideoConference({ userRole, userName, userId }: MobileVideoConferenceProps) {
  const { localParticipant } = useLocalParticipant();
  const roomCtx = useRoomContext();
  const room = roomCtx as Room;
  const participants = useParticipants();
  const [pinnedParticipantId, setPinnedParticipantId] = React.useState<string | null>(null);
  
  // 获取用于视频显示的轨道
  const videoTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  
  // 用于屏幕共享的轨道
  const screenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged] },
  );
  
  // 有屏幕共享时显示屏幕共享
  const hasScreenShare = screenTracks.length > 0;
  
  // 获取主视频轨道
  const mainVideoTrack = React.useMemo(() => {
    if (hasScreenShare && screenTracks.length > 0) {
      return screenTracks[0];
    }
    
    if (pinnedParticipantId) {
      return videoTracks.find(track => track?.participant?.identity === pinnedParticipantId);
    }
    
    // 默认显示有视频的参与者，优先显示正在说话的人
    const activeParticipantTrack = videoTracks.find(
      track => track?.participant?.isSpeaking && track?.publication?.isSubscribed
    );
    
    if (activeParticipantTrack) {
      return activeParticipantTrack;
    }
    
    // 没有人说话时，显示有视频的第一个参与者
    return videoTracks.find(track => track?.publication?.isSubscribed) || videoTracks[0];
  }, [videoTracks, screenTracks, hasScreenShare, pinnedParticipantId]);
  
  // 处理头像点击，设置固定显示的参与者
  const handleAvatarClick = (participant: any) => {
    if (pinnedParticipantId === participant.identity) {
      setPinnedParticipantId(null);
    } else {
      setPinnedParticipantId(participant.identity);
    }
  };
  
  // 定义标签页
  const tabs: TabItem[] = [
    {
      key: 'chat',
      label: '聊天',
      content: <MobileChat />
    },
    {
      key: 'mic',
      label: '麦位',
      content: <MobileMicList userRole={userRole} />
    }
  ];
  
  // 如果是主持人，添加控制面板标签
  if (userRole && userRole >= 2) {
    tabs.push({
      key: 'control',
      label: '管理',
      content: <MobileControlPanel userRole={userRole} />
    });
  }

  return (
    <div className="mobile-video-conference">
      <RoomAudioRenderer />
      
      {/* 主视频区域 */}
      <div className="mobile-main-video">
        {mainVideoTrack && mainVideoTrack.publication ? (
          <div className="mobile-video-container">
            <video
              ref={node => {
                if (node && mainVideoTrack.publication?.track) {
                  mainVideoTrack.publication?.track.attach(node);
                  return () => {
                    mainVideoTrack.publication?.track?.detach(node);
                  };
                }
              }}
              autoPlay
              playsInline
            />
            <div className="mobile-video-name">
              {hasScreenShare ? '屏幕共享' : (mainVideoTrack.participant?.name || mainVideoTrack.participant?.identity || 'Unknown')}
              {pinnedParticipantId && ' (已固定)'}
            </div>
          </div>
        ) : (
          <div className="mobile-video-placeholder">
            <div className="mobile-video-placeholder-text">无视频</div>
          </div>
        )}
      </div>
      
      {/* 参与者头像列表 */}
      <MobileAvatarRow onAvatarClick={handleAvatarClick} />
      
      {/* 选项卡内容区域 */}
      <MobileTabs tabs={tabs} defaultActiveKey="chat" />
      
      {/* 底部操作栏 */}
      <div className="mobile-controls">
        <button 
          className={`mobile-control-btn ${localParticipant.isMicrophoneEnabled ? 'on' : 'off'}`}
          onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}
        >
          {localParticipant.isMicrophoneEnabled ? '静音' : '解除静音'}
        </button>
        
        <button 
          className={`mobile-control-btn ${localParticipant.isCameraEnabled ? 'on' : 'off'}`}
          onClick={() => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled)}
        >
          {localParticipant.isCameraEnabled ? '关闭视频' : '开启视频'}
        </button>
        
        <button 
          className="mobile-control-btn leave"
          onClick={() => room.disconnect()}
        >
          离开会议
        </button>
      </div>
      
      <style jsx>{`
        .mobile-video-conference {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #111;
          color: white;
        }
        
        .mobile-main-video {
          height: 30vh;
          width: 100%;
          background-color: #000;
          position: relative;
        }
        
        .mobile-video-container {
          width: 100%;
          height: 100%;
          position: relative;
        }
        
        .mobile-video-container video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .mobile-video-name {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background-color: rgba(0, 0, 0, 0.5);
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .mobile-video-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #222;
        }
        
        .mobile-video-placeholder-text {
          font-size: 18px;
          color: #999;
        }
        
        .mobile-controls {
          display: flex;
          padding: 10px;
          background-color: #222;
          justify-content: space-around;
          border-top: 1px solid #333;
        }
        
        .mobile-control-btn {
          padding: 10px 15px;
          border: none;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .mobile-control-btn.on {
          background-color: #22c55e;
          color: white;
        }
        
        .mobile-control-btn.off {
          background-color: #ef4444;
          color: white;
        }
        
        .mobile-control-btn.leave {
          background-color: #ef4444;
          color: white;
        }
      `}</style>
    </div>
  );
} 