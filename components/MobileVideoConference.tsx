import * as React from 'react';
import {
  useParticipants,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
  usePinnedTracks,
} from '@livekit/components-react';
import { Track, RoomEvent, Room, Participant } from 'livekit-client';
import { MobileAvatarRow } from './MobileAvatarRow';
import { MobileTabs, TabItem } from './MobileTabs';
import { MobileChat } from './MobileChat';
import { MobileMicList } from './MobileMicList';
import { MobileControlPanel } from './MobileControlPanel';
import { HideLiveKitCounters } from './HideLiveKitCounters';
import { isHostOrAdmin, isCameraEnabled } from '../lib/token-utils';

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
  
  // 🎯 新增：检查是否有主持人在线
  const getParticipantRole = (participant: Participant): number => {
    const attributes = participant.attributes || {};
    const role = parseInt(attributes.role || '1');
    return role;
  };

  // 🎯 新增：当前用户是否为主持人
  const currentUserIsHost = userRole && (userRole === 2 || userRole === 3);
  
  // 🎯 新增：查找其他主持人参与者
  const otherHostParticipant = participants.find(p => {
    const role = getParticipantRole(p);
    return role === 2 || role === 3; // 主持人或管理员
  });

  // 🎯 新增：如果当前用户是主持人，或者找到了其他主持人，则认为有主持人
  const hasHost = currentUserIsHost || otherHostParticipant !== undefined;
  
  // 获取主视频轨道
  const mainVideoTrack = React.useMemo(() => {
    // 如果没有主持人，直接返回null
    if (!hasHost) return null;
    
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
  }, [videoTracks, screenTracks, hasScreenShare, pinnedParticipantId, hasHost]);
  
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

  // 🎯 检查主视频轨道的摄像头是否开启
  const shouldShowVideoFrame = React.useMemo(() => {
    if (!mainVideoTrack || !mainVideoTrack.participant) return false;
    
    const participant = mainVideoTrack.participant;
    const attributes = participant.attributes || {};
    const isHostRole = isHostOrAdmin(attributes);
    
    // 如果是主持人，只有在摄像头开启时才显示视频
    if (isHostRole) {
      return isCameraEnabled(participant);
    }
    
    // 非主持人总是显示视频框
    return true;
  }, [mainVideoTrack]);

  return (
    <div className="mobile-video-conference">
      <HideLiveKitCounters />
      <RoomAudioRenderer />
      
      {/* 主视频区域 */}
      <div className="mobile-main-video">
        {!hasHost ? (
          // 🎯 新增：主持人未进入时的等待界面
          <div className="waiting-for-host">
            <div className="waiting-content">
              <div className="waiting-icon">⏳</div>
              <h3>等待主持人进入房间</h3>
              <p>
                {currentUserIsHost 
                  ? '正在检测您的主持人身份，请稍候...' 
                  : '主持人还未进入房间，请稍后等待...'
                }
              </p>
            </div>
          </div>
        ) : mainVideoTrack && mainVideoTrack.publication && shouldShowVideoFrame ? (
          // 主持人已进入且有视频可显示
          <div className="mobile-video-container">
            <div className="video-wrapper">
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
            </div>
            <div className="mobile-video-name">
              {hasScreenShare ? '屏幕共享' : (mainVideoTrack.participant?.name || mainVideoTrack.participant?.identity || 'Unknown')}
              {pinnedParticipantId && ' (已固定)'}
            </div>
          </div>
        ) : (
          // 主持人已进入但没有视频可显示 - 与PC端保持一致，不显示任何内容
          <div className="empty-video-area"></div>
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
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .mobile-video-container {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        /* 新增：视频包装器，控制视频尺寸为原来的1/4 */
        .video-wrapper {
          width: 50%;
          height: 50%;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #111;
          border-radius: 8px;
          overflow: hidden;
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
        
        /* 空视频区域 - 与PC端保持一致，不显示任何内容 */
        .empty-video-area {
          width: 100%;
          height: 100%;
        }
        
        /* 🎯 新增：等待主持人样式 */
        .waiting-for-host {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          background-color: #222;
        }
        
        .waiting-content {
          text-align: center;
          padding: 20px;
        }
        
        .waiting-icon {
          font-size: 32px;
          margin-bottom: 10px;
        }
        
        .waiting-content h3 {
          font-size: 18px;
          margin: 0 0 10px 0;
        }
        
        .waiting-content p {
          font-size: 14px;
          color: #999;
          margin: 0;
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