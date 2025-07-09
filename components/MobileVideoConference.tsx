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
import { MobileControlPanel } from './MobileControlPanel';
import { HideLiveKitCounters } from './HideLiveKitCounters';
import { isHostOrAdmin, isCameraEnabled } from '../lib/token-utils';
import { getImagePath } from '../lib/image-path';

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
      
      {/* 底部操作栏 - 使用SVG矢量图替换按钮 */}
      <div className="mobile-controls">
        {/* 麦克风按钮 - 使用SVG矢量图 */}
        <div 
          className={`mobile-control-svg ${localParticipant.isMicrophoneEnabled ? 'on' : 'off'} ${userRole === 0 ? 'guest-disabled' : ''}`}
          onClick={() => {
            // 游客无法使用麦克风
            if (userRole === 0) {
              alert('游客需要注册为会员才能使用麦克风功能');
              return;
            }
            
            // 主持人可以直接使用麦克风
            if (userRole && userRole >= 2) {
              localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
              return;
            }
            
            // 普通会员需要检查麦克风状态
            const attributes = localParticipant.attributes || {};
            const micStatus = attributes.mic_status || 'off_mic';
            
            if (micStatus === 'on_mic') {
              // 已上麦可以使用
              localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
            } else {
              // 未上麦提示申请
              alert('您需要先申请上麦才能使用麦克风');
            }
          }}
        >
          <img 
            src={getImagePath('/images/mic.svg')} 
            alt={localParticipant.isMicrophoneEnabled ? '静音' : '解除静音'} 
            title={localParticipant.isMicrophoneEnabled ? '静音' : '解除静音'} 
          />
          <span className="svg-tooltip">
            {localParticipant.isMicrophoneEnabled ? '静音' : '解除静音'}
          </span>
        </div>
        
        {/* 申请上麦按钮 - 使用SVG矢量图 */}
        {userRole === 1 && (
          <div 
            className={`mobile-control-svg ${localParticipant.attributes?.mic_status === 'requesting' ? 'requesting' : 'request-mic'}`}
            onClick={async () => {
              const attributes = localParticipant.attributes || {};
              const micStatus = attributes.mic_status || 'off_mic';
              
              if (micStatus === 'requesting') {
                alert('您已经申请上麦，等待主持人批准');
                return;
              }
              
              if (micStatus === 'on_mic') {
                alert('您已在麦位上');
                return;
              }
              
              if (!hasHost) {
                alert('请等待主持人进入房间后再申请上麦');
                return;
              }
              
              try {
                // 更新麦克风状态为申请中
                await localParticipant.setAttributes({
                  ...attributes,
                  mic_status: 'requesting',
                  display_status: 'visible',
                  request_time: Date.now().toString(),
                  last_action: 'request',
                  user_name: localParticipant.identity
                });
                
                alert('已发送申请，等待主持人批准');
              } catch (error) {
                console.error('申请上麦失败:', error);
                alert('申请上麦失败，请刷新页面重试');
              }
            }}
          >
            <img 
              src={getImagePath('/images/submic.svg')} 
              alt={localParticipant.attributes?.mic_status === 'requesting' ? '申请中...' : '申请上麦'} 
              title={localParticipant.attributes?.mic_status === 'requesting' ? '申请中...' : '申请上麦'} 
              className="submic-icon"
            />
            <span className="svg-tooltip">
              {localParticipant.attributes?.mic_status === 'requesting' ? '申请中...' : '申请上麦'}
            </span>
          </div>
        )}
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
        
        /* SVG图标按钮样式 */
        .mobile-control-svg {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px;
          border-radius: 20px;
          cursor: pointer;
          position: relative;
          width: 70px;
          height: 70px;
          transition: all 0.3s ease;
        }
        
        /* SVG图片样式 */
        .mobile-control-svg img {
          width: 36px;
          height: 36px;
          transition: all 0.3s ease;
          z-index: 5;
        }
        
        /* 工具提示样式 */
        .svg-tooltip {
          font-size: 12px;
          margin-top: 5px;
          text-align: center;
          color: white;
        }
        
        /* 麦克风开启状态 */
        .mobile-control-svg.on {
          background-color: rgba(34, 197, 94, 0.2);
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
        
        .mobile-control-svg.on img {
          filter: invert(70%) sepia(75%) saturate(1000%) hue-rotate(100deg) brightness(90%) contrast(95%);
        }
        
        /* 麦克风关闭状态 */
        .mobile-control-svg.off {
          background-color: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        
        .mobile-control-svg.off img {
          filter: invert(50%) sepia(75%) saturate(2000%) hue-rotate(320deg) brightness(95%) contrast(95%);
        }
        
        /* 游客禁用状态 */
        .mobile-control-svg.guest-disabled {
          opacity: 0.7;
          position: relative;
          background-color: rgba(153, 153, 153, 0.2);
        }
        
        .mobile-control-svg.guest-disabled::after {
          content: "🔒";
          position: absolute;
          top: 5px;
          right: 5px;
          font-size: 10px;
        }
        
        .mobile-control-svg.guest-disabled img {
          filter: grayscale(100%);
        }
        
        /* 申请上麦按钮样式 */
        .mobile-control-svg.request-mic {
          background-color: rgba(234, 179, 8, 0.25); /* 金色背景 */
          box-shadow: 0 0 10px rgba(234, 179, 8, 0.6);
        }
        
        .mobile-control-svg.request-mic img {
          width: 36px;
          height: 36px;
          filter: brightness(1) contrast(1.1) drop-shadow(0 0 2px rgba(255, 255, 255, 0.5));
        }
        
        /* 申请中状态 */
        .mobile-control-svg.requesting {
          background-color: rgba(234, 179, 8, 0.25); /* 金色背景 */
          box-shadow: 0 0 10px rgba(234, 179, 8, 0.6);
          animation: pulse 1.5s infinite;
        }
        
        .mobile-control-svg.requesting img {
          width: 36px;
          height: 36px;
          filter: brightness(1) contrast(1.1) drop-shadow(0 0 2px rgba(255, 255, 255, 0.5));
          animation: glow 1.5s infinite alternate;
        }
        
        @keyframes pulse {
          0% { opacity: 0.7; box-shadow: 0 0 5px rgba(234, 179, 8, 0.4); }
          50% { opacity: 1; box-shadow: 0 0 15px rgba(234, 179, 8, 0.8); }
          100% { opacity: 0.7; box-shadow: 0 0 5px rgba(234, 179, 8, 0.4); }
        }
        
        @keyframes glow {
          0% { filter: brightness(0.9) contrast(1.1) drop-shadow(0 0 2px rgba(255, 255, 255, 0.5)); }
          100% { filter: brightness(1.1) contrast(1.3) drop-shadow(0 0 4px rgba(255, 255, 255, 0.8)); }
        }
        
        /* 增强申请上麦图标显示 */
        .submic-icon {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5 !important;
        }
        
        @keyframes gentle-pulse {
          0% { filter: invert(70%) sepia(75%) saturate(1000%) hue-rotate(25deg) brightness(85%) contrast(95%); opacity: 0.8; }
          50% { filter: invert(70%) sepia(75%) saturate(1000%) hue-rotate(25deg) brightness(120%) contrast(95%); opacity: 1; }
          100% { filter: invert(70%) sepia(75%) saturate(1000%) hue-rotate(25deg) brightness(85%) contrast(95%); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
} 