import * as React from 'react';
import {
  useParticipants,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
  usePinnedTracks,
  GridLayout,
  VideoTrack,
  TrackRefContext,
} from '@livekit/components-react';
import { Track, RoomEvent, Room, Participant } from 'livekit-client';
import { MobileAvatarRow } from './MobileAvatarRow';
import { MobileTabs, TabItem } from './MobileTabs';
import { MobileChat } from './MobileChat';
import { MobileControlPanel } from './MobileControlPanel';
import { HideLiveKitCounters } from './HideLiveKitCounters';
import { isHostOrAdmin, isCameraEnabled, shouldShowInMicList } from '../lib/token-utils';
import { getImagePath } from '../lib/image-path';

// 默认最大麦位数量
const DEFAULT_MAX_MIC_SLOTS = 5;

interface MobileVideoConferenceProps {
  userRole?: number;
  userName?: string;
  userId?: number;
  // 可以添加最大麦位数量参数
  maxMicSlots?: number;
}

export function MobileVideoConference({ userRole, userName, userId, maxMicSlots = DEFAULT_MAX_MIC_SLOTS }: MobileVideoConferenceProps) {
  const { localParticipant } = useLocalParticipant();
  const roomCtx = useRoomContext();
  const room = roomCtx as Room;
  const participants = useParticipants();
  const [pinnedParticipantId, setPinnedParticipantId] = React.useState<string | null>(null);
  // 添加全屏状态
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  
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
  
  // 添加调试状态
  const [debugInfo, setDebugInfo] = React.useState<string>("");
  
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
  
  // 计算麦位状态
  const micStats = React.useMemo(() => {
    // 麦位列表中显示的用户数量
    const micListCount = participants.filter(p => 
      shouldShowInMicList(p.attributes || {})
    ).length;
    
    // 检查是否有可用麦位
    const hasAvailableSlots = micListCount < maxMicSlots;
    
    return {
      micListCount,
      maxSlots: maxMicSlots,
      hasAvailableSlots
    };
  }, [participants, maxMicSlots]);

  // 定义标签页
  const tabs: TabItem[] = [
    {
      key: 'chat',
      // 将标签名改为显示麦位信息
      label: `${micStats.micListCount}/${micStats.maxSlots}`,
      content: <MobileChat />,
      isMicInfo: true // 标记为麦位信息标签
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

  // 切换全屏/横屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    try {
      // 获取屏幕共享容器元素
      const screenShareContainer = document.querySelector('.screen-share-wrapper');
      
      if (screenShareContainer) {
        if (!isFullscreen) {
          // 如果当前不是全屏，则请求横屏
          try {
            if (screen.orientation && 'lock' in screen.orientation) {
              (screen.orientation as any).lock('landscape').catch((err: any) => {
                console.error('无法锁定屏幕方向:', err);
              });
            }
          } catch (orientationError) {
            console.error('屏幕方向API错误:', orientationError);
          }
          
          // 如果支持全屏API，请求全屏
          if (screenShareContainer.requestFullscreen) {
            screenShareContainer.requestFullscreen().catch(err => {
              console.error('无法进入全屏模式:', err);
            });
          } else if ((screenShareContainer as any).webkitRequestFullscreen) {
            (screenShareContainer as any).webkitRequestFullscreen();
          } else if ((screenShareContainer as any).msRequestFullscreen) {
            (screenShareContainer as any).msRequestFullscreen();
          }
        } else {
          // 退出全屏
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => {
              console.error('无法退出全屏模式:', err);
            });
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
          }
          
          // 恢复屏幕方向
          try {
            if (screen.orientation && 'unlock' in screen.orientation) {
              (screen.orientation as any).unlock();
            }
          } catch (orientationError) {
            console.error('屏幕方向API错误:', orientationError);
          }
        }
      }
    } catch (error) {
      console.error('切换全屏模式出错:', error);
    }
  };

  // 监听全屏状态变化
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocumentFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      
      if (!isDocumentFullscreen && isFullscreen) {
        setIsFullscreen(false);
        // 恢复屏幕方向
        try {
          if (screen.orientation && 'unlock' in screen.orientation) {
            (screen.orientation as any).unlock();
          }
        } catch (orientationError) {
          console.error('屏幕方向API错误:', orientationError);
        }
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // 添加调试日志
  React.useEffect(() => {
    console.log("屏幕共享轨道状态:", {
      hasScreenShare,
      tracksCount: screenTracks.length,
      trackDetails: screenTracks.length > 0 ? {
        identity: screenTracks[0].participant?.identity,
        trackId: screenTracks[0].publication?.trackSid,
        isSubscribed: screenTracks[0].publication?.isSubscribed,
      } : "无轨道"
    });
    
    setDebugInfo(`屏幕共享: ${hasScreenShare ? '有' : '无'}, 轨道数: ${screenTracks.length}`);
  }, [screenTracks, hasScreenShare]);

  // 在返回的JSX中，修改屏幕共享部分
  return (
    <div className="mobile-video-conference">
      <div className="mobile-main-video">
        {!shouldShowVideoFrame ? (
          // 主持人已进入但没有视频可显示 - 与PC端保持一致，不显示任何内容
          <div className="empty-video-area"></div>
        ) : (
          // 主持人已进入且有视频可显示
          <div className="mobile-video-container">
            {hasScreenShare && screenTracks.length > 0 ? (
              <div className={`screen-share-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}>
                {/* 替换为LiveKit标准组件 */}
                <GridLayout tracks={screenTracks}>
                  <TrackRefContext.Provider value={screenTracks[0]}>
                    <VideoTrack />
                  </TrackRefContext.Provider>
                </GridLayout>
                
                <div className="mobile-video-name">
                  屏幕共享 ({screenTracks[0].participant?.name || screenTracks[0].participant?.identity || '未知'})
                  {pinnedParticipantId && ' (已固定)'}
                </div>
                
                {/* 全屏/横屏切换按钮 */}
                <div 
                  className="fullscreen-toggle-btn"
                  onClick={toggleFullscreen}
                >
                  <img 
                    src={getImagePath(isFullscreen ? '/images/small.png' : '/images/big.png')}
                    alt={isFullscreen ? '退出全屏' : '全屏'} 
                    title={isFullscreen ? '退出全屏' : '全屏'} 
                  />
                </div>
                
                {/* 添加调试信息 - 仅在开发环境显示 */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="debug-overlay">{debugInfo}</div>
                )}
              </div>
            ) : mainVideoTrack ? (
              <div className="video-wrapper">
                {/* 保留原有的视频显示逻辑 */}
                <video
                  ref={node => {
                    if (node && mainVideoTrack?.publication?.track) {
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
                  {mainVideoTrack.participant?.name || mainVideoTrack.participant?.identity || 'Unknown'}
                  {pinnedParticipantId && ' (已固定)'}
                </div>
              </div>
            ) : (
              <div className="empty-video-area">
                <p>无可用视频</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 参与者头像列表 */}
      <MobileAvatarRow onAvatarClick={handleAvatarClick} />
      
      {/* 选项卡内容区域 */}
      <MobileTabs tabs={tabs} defaultActiveKey="chat" />
      
      {/* 底部操作栏 - 已移至MobileChat组件中，此处隐藏 
      <div className="mobile-controls">
        {/* 麦克风按钮 - 使用SVG矢量图 *//*}
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
            alt={localParticipant.isMicrophoneEnabled ? '静音' : '开麦'} 
            title={localParticipant.isMicrophoneEnabled ? '静音' : '开麦'} 
          />
          <span className="svg-tooltip">
            {localParticipant.isMicrophoneEnabled ? '静音' : '开麦'}
          </span>
        </div>
        
        {/* 申请上麦按钮 - 使用SVG矢量图 *//*}
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
              alt={localParticipant.attributes?.mic_status === 'requesting' ? '申请' : '上麦'} 
              title={localParticipant.attributes?.mic_status === 'requesting' ? '申请' : '上麦'} 
              className="submic-icon"
            />
            <span className="svg-tooltip">
              {localParticipant.attributes?.mic_status === 'requesting' ? '申请' : '上麦'}
            </span>
          </div>
        )}
      </div>
      */}
      
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
          transition: all 0.3s ease;
        }
        
        .mobile-main-video.fullscreen {
          height: 100vh;
          z-index: 1000;
        }
        
        .mobile-video-container {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        /* 新增：视频包装器，控制视频尺寸 */
        .video-wrapper {
          width: 80%;
          height: 80%;
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          background-color: #222;
        }
        
        .video-wrapper video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        /* 屏幕共享容器样式优化 */
        .screen-share-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        /* 确保GridLayout和VideoTrack充满整个容器 */
        .screen-share-wrapper :global(.lk-grid-layout) {
          width: 100% !important;
          height: 100% !important;
        }
        
        .screen-share-wrapper :global(.lk-video-track) {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
        }
        
        /* 全屏模式样式 */
        .screen-share-wrapper.fullscreen-mode {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          background-color: #000;
        }
        
        .mobile-video-name {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 2;
        }
        
        .fullscreen-toggle-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          z-index: 2;
        }
        
        .fullscreen-toggle-btn img {
          width: 20px;
          height: 20px;
        }
        
        .empty-video-area {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #222;
          color: #666;
          font-size: 14px;
        }
        
        .debug-overlay {
          position: absolute;
          top: 8px;
          left: 8px;
          background-color: rgba(0, 0, 0, 0.7);
          color: #ff9800;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          z-index: 10;
        }
        
        /* SVG图标按钮样式 - 也隐藏 */
        .mobile-control-svg {
          display: none; /* 完全隐藏子元素 */
          visibility: hidden;
        }
        
        /* SVG图片样式 */
        .mobile-control-svg img {
          width: 20px;
          height: 20px;
          transition: all 0.3s ease;
          z-index: 5;
          margin-right: 3px;
        }
        
        /* 工具提示样式 */
        .svg-tooltip {
          font-size: 12px;
          text-align: center;
          color: white;
          margin-left: 2px;
        }
        
        /* 麦克风开启状态 */
        .mobile-control-svg.on {
          background-color: #22c55e;
          box-shadow: none;
        }
        
        .mobile-control-svg.on img {
          filter: brightness(0) invert(1);
        }
        
        /* 麦克风关闭状态 */
        .mobile-control-svg.off {
          background-color: #ef4444;
          box-shadow: none;
        }
        
        .mobile-control-svg.off img {
          filter: brightness(0) invert(1);
        }
        
        /* 游客禁用状态 */
        .mobile-control-svg.guest-disabled {
          opacity: 0.7;
          position: relative;
          background-color: #999;
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
          background-color: #eab308;
          box-shadow: none;
        }
        
        .mobile-control-svg.request-mic img {
          filter: brightness(0) invert(1);
        }
        
        /* 申请中状态 */
        .mobile-control-svg.requesting {
          background-color: #eab308;
          box-shadow: none;
          animation: gentle-pulse 1.5s infinite;
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
      
      <RoomAudioRenderer />
      <HideLiveKitCounters />
    </div>
  );
} 