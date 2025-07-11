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
  ParticipantTile
} from '@livekit/components-react';
import { Track, RoomEvent, Room, Participant } from 'livekit-client';
import { MobileAvatarRow } from './MobileAvatarRow';
import { MobileTabs, TabItem } from './MobileTabs';
import { MobileChat } from './MobileChat';
import { MobileControlPanel } from './MobileControlPanel';
import { HideLiveKitCounters } from './HideLiveKitCounters';
import { isHostOrAdmin, isCameraEnabled, shouldShowInMicList } from '../lib/token-utils';
import { getImagePath } from '../lib/image-path';
import { initFullscreenFloatingFix } from '../lib/fullscreen-floating-fix';

// 视频显示状态枚举
enum VideoDisplayState {
  NORMAL = 'normal',
  MINIMIZED = 'minimized'
}

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
  // 新增: 本地摄像头是否放大显示
  const [isLocalCameraExpanded, setIsLocalCameraExpanded] = React.useState<boolean>(false);
  // 添加显示摄像头面板状态
  const [showCameraPanel, setShowCameraPanel] = React.useState<boolean>(false);
  // 添加视频显示状态
  const [displayState, setDisplayState] = React.useState<VideoDisplayState>(VideoDisplayState.NORMAL);
  
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
  
  // 过滤出摄像头轨道，用于摄像头面板
  const cameraOnlyTracks = React.useMemo(() => {
    return videoTracks.filter(track => {
      return (track.source === Track.Source.Camera && 
              track.participant?.identity !== localParticipant?.identity);
    });
  }, [videoTracks, localParticipant]);
  
  // 切换摄像头面板显示
  const toggleCameraPanel = () => {
    setShowCameraPanel(!showCameraPanel);
  };
  
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

  // 处理最小化视频区域
  const handleMinimizeVideo = React.useCallback(() => {
    console.log('最小化视频区域');
    setDisplayState(VideoDisplayState.MINIMIZED);
  }, []);

  // 处理恢复视频区域
  const handleRestoreVideo = React.useCallback(() => {
    console.log('恢复视频区域');
    setDisplayState(VideoDisplayState.NORMAL);
  }, []);
  
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
  
  // 新增: 获取本地摄像头轨道
  const localCameraTrack = React.useMemo(() => {
    if (!localParticipant) return null;
    
    const cameraPublication = localParticipant.getTrackPublication(Track.Source.Camera);
    if (cameraPublication?.track) {
      return cameraPublication;
    }
    return null;
  }, [localParticipant]);
  
  // 新增: 本地摄像头是否开启
  const isLocalCameraEnabled = React.useMemo(() => {
    return !!(
      localParticipant && 
      localParticipant.isCameraEnabled && 
      localCameraTrack && 
      !localCameraTrack.isMuted
    );
  }, [localParticipant, localCameraTrack]);
  
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
          if ((screenShareContainer as any).requestFullscreen) {
            (screenShareContainer as any).requestFullscreen().catch((err: any) => {
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
            document.exitFullscreen().catch((err: any) => {
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
      
      // 更新全屏状态
      setIsFullscreen(!isFullscreen);
    } catch (error) {
      console.error('切换全屏模式出错:', error);
    }
  };
    
  // 新增: 切换本地摄像头显示大小
  const toggleLocalCameraSize = () => {
    setIsLocalCameraExpanded(!isLocalCameraExpanded);
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

  // 打印当前状态用于调试
  React.useEffect(() => {
    console.log("当前视频显示状态:", displayState);
  }, [displayState]);

  // 添加全屏浮动窗口修复
  React.useEffect(() => {
    // 初始化全屏浮动窗口修复功能
    initFullscreenFloatingFix();
    
    // 组件卸载时清理事件监听
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', () => {});
        document.removeEventListener('webkitfullscreenchange', () => {});
        document.removeEventListener('mozfullscreenchange', () => {});
        document.removeEventListener('MSFullscreenChange', () => {});
      }
    };
  }, []);

  // 这里是重构后的渲染逻辑
  if (displayState === VideoDisplayState.MINIMIZED) {
    // 最小化状态 - 只显示一个恢复按钮
    return (
      <div className="mobile-video-conference minimized">
        <button 
          onClick={handleRestoreVideo} 
          className="restore-video-button"
          aria-label="恢复摄像头区"
        >
          恢复摄像头区
        </button>
        
        <RoomAudioRenderer />
        <HideLiveKitCounters />
        
        <style jsx>{`
          .mobile-video-conference.minimized {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: transparent;
            pointer-events: none;
            z-index: 1000;
            height: 100vh;
            width: 100vw;
          }
          
          .restore-video-button {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(74, 158, 255, 0.9);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 2000;
            pointer-events: auto;
          }
          
          .restore-video-button:active {
            background: rgba(50, 120, 230, 0.9);
            transform: scale(0.98);
          }
        `}</style>
        
        <style jsx global>{`
          /* 隐藏LiveKit默认的参与者名称标签 */
          .lk-participant-name {
            display: none !important;
          }
          
          /* 隐藏包含麦克风状态和用户名的元数据项 */
          .lk-participant-metadata-item {
            display: none !important;
          }
        `}</style>
      </div>
    );
  }

  // 正常显示状态
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
                
                {/* 添加最小化按钮 */}
                <div 
                  className="minimize-video-btn"
                  onClick={handleMinimizeVideo}
                  role="button"
                  aria-label="最小化视频窗口"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="minimize-icon">_</span>
                </div>
                
                {/* 新增: 本地摄像头视频小窗口 */}
                {isLocalCameraEnabled && (
                  <div 
                    className={`local-camera-container ${isLocalCameraExpanded ? 'expanded' : ''}`}
                    onClick={toggleLocalCameraSize}
                  >
                    <video
                      ref={node => {
                        if (node && localCameraTrack?.track) {
                          localCameraTrack.track.attach(node);
                          return () => {
                            localCameraTrack.track?.detach(node);
                          };
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                    />
                    
                    <div className="local-video-name">
                      我的摄像头
                    </div>
                    
                    {/* 摄像头大小切换按钮 */}
                    <div className="camera-toggle-btn">
                      <img 
                        src={getImagePath(isLocalCameraExpanded ? '/images/small.png' : '/images/big.png')}
                        alt={isLocalCameraExpanded ? '缩小' : '放大'} 
                        title={isLocalCameraExpanded ? '缩小' : '放大'} 
                      />
                    </div>
                  </div>
                )}
                
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
                
                {/* 添加最小化按钮 */}
                <div 
                  className="minimize-video-btn"
                  onClick={handleMinimizeVideo}
                  role="button"
                  aria-label="最小化视频窗口"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="minimize-icon">_</span>
                </div>
                
                {/* 直接嵌入式摄像头面板 - 视频轨道情况 */}
                {cameraOnlyTracks.length > 0 && showCameraPanel && (
                  <div className="inline-floating-video-panel">
                    {/* 浮动窗口头部 */}
                    <div className="floating-panel-header">
                      <div className="floating-panel-title">
                        摄像头 ({cameraOnlyTracks.length})
                      </div>
                      
                      <div className="floating-panel-controls">
                        {/* 关闭按钮 */}
                        <button
                          onClick={toggleCameraPanel}
                          className="floating-panel-close"
                          title="隐藏摄像头面板"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    
                    {/* 视频显示区域 */}
                    <div className="floating-panel-content">
                      <div className="floating-panel-grid">
                        {cameraOnlyTracks.slice(0, 4).map((track, index) => (
                          <div
                            key={track.participant?.identity || index}
                            className="floating-panel-item"
                          >
                            <ParticipantTile 
                              {...track}
                              style={{
                                width: '100%',
                                height: '100%'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 添加摄像头面板切换按钮 */}
                <div 
                  className="camera-panel-toggle-btn"
                  onClick={toggleCameraPanel}
                >
                  <img 
                    src={getImagePath('/images/camera.svg')}
                    alt={showCameraPanel ? '隐藏摄像头' : '显示摄像头'} 
                    title={showCameraPanel ? '隐藏摄像头' : '显示摄像头'}
                    style={{ width: '16px', height: '16px' }}
                  />
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
      
      <RoomAudioRenderer />
      <HideLiveKitCounters />
      
      {/* 添加自定义样式 */}
      <style jsx>{`
        .mobile-video-conference {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background-color: #1a1a1a;
        }
        
        .mobile-main-video {
          flex: 1;
          position: relative;
          background-color: #000;
          overflow: hidden;
          min-height: 0;
        }
        
        .mobile-video-container {
          width: 100%;
          height: 100%;
          position: relative;
        }
        
        .screen-share-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          background-color: #000;
        }
        
        .screen-share-wrapper.fullscreen-mode {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9000; /* 降低z-index，确保浮动窗口可以显示在上面 */
        }
        
        .video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        
        .video-wrapper video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .mobile-video-name {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 10;
        }
        
        .fullscreen-toggle-btn {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }
        
        .fullscreen-toggle-btn img {
          width: 16px;
          height: 16px;
        }
        
        /* 最小化按钮样式 */
        .minimize-video-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }
        
        .minimize-icon {
          color: white;
          font-size: 14px;
          line-height: 1;
        }
                
        .local-camera-container {
          position: absolute;
          bottom: 60px;
          right: 8px;
          width: 80px;
          height: 120px;
          background: #000;
          border: 1px solid #444;
          border-radius: 4px;
          overflow: hidden;
          z-index: 10;
          transition: all 0.3s ease;
        }
        
        .local-camera-container.expanded {
          width: 160px;
          height: 240px;
        }
        
        .local-camera-container video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .local-video-name {
          position: absolute;
          bottom: 4px;
          left: 4px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 10px;
          z-index: 2;
        }
        
        .camera-toggle-btn {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 2;
        }
        
        .camera-toggle-btn img {
          width: 12px;
          height: 12px;
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
        
        /* 浮动面板样式 */
        .inline-floating-video-panel {
          position: absolute;
          left: 20px;
          top: 60px;
          width: 180px;
          height: 135px;
          background: rgba(0, 0, 0, 0.8);
          border: 2px solid #444;
          border-radius: 8px;
          z-index: 10500;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          cursor: grab;
          user-select: none;
          overflow: hidden;
          transition: 0.3s;
        }
        
        .floating-panel-header {
          height: 20px;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          border-bottom: 1px solid #444;
          flex-shrink: 0;
          border-radius: 6px 6px 0 0;
        }
        
        .floating-panel-title {
          color: #fff;
          font-size: 10px;
          font-weight: bold;
        }
        
        .floating-panel-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .floating-panel-close {
          background: transparent;
          border: none;
          color: #888;
          font-size: 14px;
          cursor: pointer;
          padding: 2px;
          border-radius: 2px;
          line-height: 1;
        }
        
        .floating-panel-content {
          flex: 1;
          overflow: hidden;
          background: #000;
          border-radius: 0 0 6px 6px;
          position: relative;
        }
        
        .floating-panel-grid {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 2px;
        }
        
        .floating-panel-item {
          position: relative;
          background: #2a2a2a;
          border-radius: 4px;
          overflow: hidden;
          min-height: 0;
        }
        
        .camera-panel-toggle-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.6);
          color: #fff;
          padding: 4px;
          border-radius: 4px;
          cursor: pointer;
          z-index: 20;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
      
      <style jsx global>{`
        /* 隐藏LiveKit默认的参与者名称标签 */
        .lk-participant-name {
          display: none !important;
        }
        
        /* 隐藏包含麦克风状态和用户名的元数据项 */
        .lk-participant-metadata-item {
          display: none !important;
        }
      `}</style>
    </div>
  );
} 