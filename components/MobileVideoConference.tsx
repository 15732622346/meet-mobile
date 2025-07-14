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
  ParticipantTile,
  useRoomInfo
} from '@livekit/components-react';
import { Track, RoomEvent, Room, Participant } from 'livekit-client';
import { MobileAvatarRow } from './MobileAvatarRow';
import { MobileTabs, TabItem } from './MobileTabs';
import { MobileChat } from './MobileChat';
import { MobileControlPanel } from './MobileControlPanel';
import { HideLiveKitCounters } from './HideLiveKitCounters';
import { isHostOrAdmin, isCameraEnabled, shouldShowInMicList } from '../lib/token-utils';
import { getImagePath } from '../lib/image-path';
import { setupViewportFix, ViewportDebug, enableBottomAlignment } from '../lib/viewport-debug';
import { API_CONFIG } from '../lib/config';

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
  // 添加userToken参数
  userToken?: string;
}

export function MobileVideoConference({ 
  userRole, 
  userName, 
  userId, 
  maxMicSlots = DEFAULT_MAX_MIC_SLOTS,
  userToken
}: MobileVideoConferenceProps) {
  const { localParticipant } = useLocalParticipant();
  const roomCtx = useRoomContext();
  const room = roomCtx as Room;
  const participants = useParticipants();
  const roomInfo = useRoomInfo();
  const [pinnedParticipantId, setPinnedParticipantId] = React.useState<string | null>(null);
  // 添加全屏状态
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  // 新增: 本地摄像头是否放大显示
  const [isLocalCameraExpanded, setIsLocalCameraExpanded] = React.useState<boolean>(false);
  // 添加显示摄像头面板状态
  const [showCameraPanel, setShowCameraPanel] = React.useState<boolean>(false);
  // 添加视频显示状态
  const [displayState, setDisplayState] = React.useState<VideoDisplayState>(VideoDisplayState.NORMAL);
  
  // 添加调试模式状态
  const [debugModeEnabled, setDebugModeEnabled] = React.useState<boolean>(false);
  
  // 启用调试模式时显示视口信息
  React.useEffect(() => {
    if (debugModeEnabled) {
      // 返回清理函数
      return ViewportDebug();
    }
    // 如果不是调试模式，不需要清理
    return undefined;
  }, [debugModeEnabled]);
  
  // 🎯 新增：房间详情信息管理
  const [roomDetails, setRoomDetails] = React.useState<{
    maxMicSlots: number;
    roomName: string;
    roomState: number;
  } | null>(null);
  
  // 🎯 从服务器获取房间详情
  React.useEffect(() => {
    if (!roomInfo.name) {
      console.log('⏭️ 跳过房间详情获取 - 没有房间ID');
      return;
    }

    console.log('🚀 开始获取房间详情 - room_id:', roomInfo.name);

    const fetchRoomDetails = async () => {
      try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROOM_INFO}?room_id=${roomInfo.name}`;
        console.log('🔗 请求URL:', url);

        const response = await fetch(url);
        console.log('📥 响应状态:', response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          console.log('📦 收到数据:', data);

          if (data.success) {
            console.log('✅ 成功！设置房间详情:', data.data);
            setRoomDetails({
              maxMicSlots: data.data.max_mic_slots || DEFAULT_MAX_MIC_SLOTS,
              roomName: data.data.room_name,
              roomState: data.data.room_state
            });
          }
        }
      } catch (error) {
        console.error('❌ 获取房间详情失败:', error);
      }
    };

    fetchRoomDetails();
  }, [roomInfo.name]);
  
  // 🎯 新增：监听房间元数据变化，更新roomDetails
  React.useEffect(() => {
    if (!roomCtx) return;
    
    const handleMetadataChanged = () => {
      try {
        console.log('🔄 房间元数据更新:', roomCtx.metadata);
        if (!roomCtx.metadata) return;
        
        const metadata = JSON.parse(roomCtx.metadata);
        if (metadata && typeof metadata.maxMicSlots === 'number') {
          console.log('✅ 从元数据更新最大麦位数:', metadata.maxMicSlots);
          
          // 更新roomDetails中的maxMicSlots，确保类型安全
          setRoomDetails(prev => {
            if (!prev) return {
              maxMicSlots: metadata.maxMicSlots,
              roomName: roomInfo.name || '',
              roomState: 1 // 默认值
            };
            
            return {
              ...prev,
              maxMicSlots: metadata.maxMicSlots
            };
          });
          
          // 添加强制更新触发器，确保UI更新
          setForceUpdateTrigger(prev => prev + 1);
        }
      } catch (error) {
        console.error('❌ 解析房间元数据失败:', error);
      }
    };
    
    // 初始化时处理当前元数据
    handleMetadataChanged();
    
    // 添加自定义事件监听 - 使用 @ts-ignore 避免类型错误
    // @ts-ignore - LiveKit类型定义中可能缺少这些事件
    roomCtx.on('metadataChanged', handleMetadataChanged);
    
    // @ts-ignore - LiveKit类型定义中可能缺少这些事件
    roomCtx.on('metadata_changed', handleMetadataChanged);
    
    // @ts-ignore - LiveKit类型定义中可能缺少这些事件
    roomCtx.on('metadataChange', handleMetadataChanged);
    
    // 每30秒轮询一次服务器，确保数据同步
    const pollingInterval = setInterval(async () => {
      try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROOM_INFO}?room_id=${roomInfo.name}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.max_mic_slots) {
            // 检查是否有变化
            if (roomDetails?.maxMicSlots !== data.data.max_mic_slots) {
              console.log('🔄 轮询检测到麦位数变化:', data.data.max_mic_slots);
              setRoomDetails(prev => ({
                maxMicSlots: data.data.max_mic_slots,
                roomName: data.data.room_name,
                roomState: data.data.room_state
              }));
              // 强制更新UI
              setForceUpdateTrigger(prev => prev + 1);
            }
          }
        }
      } catch (error) {
        console.error('轮询房间详情失败:', error);
      }
    }, 30000); // 30秒轮询一次
    
    // 清理函数
    return () => {
      // @ts-ignore - LiveKit类型定义中可能缺少这些事件
      roomCtx.off('metadataChanged', handleMetadataChanged);
      // @ts-ignore - LiveKit类型定义中可能缺少这些事件
      roomCtx.off('metadata_changed', handleMetadataChanged);
      // @ts-ignore - LiveKit类型定义中可能缺少这些事件
      roomCtx.off('metadataChange', handleMetadataChanged);
      clearInterval(pollingInterval);
    };
  }, [roomCtx, roomInfo.name, roomDetails?.maxMicSlots]);

  // 添加强制更新触发器状态
  const [forceUpdateTrigger, setForceUpdateTrigger] = React.useState(0);
  
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
    
    // 获取最大麦位数 - 优先使用服务器配置的值
    const configuredMaxMicSlots = roomDetails?.maxMicSlots || maxMicSlots;
    
    // 检查是否有可用麦位
    const hasAvailableSlots = micListCount < configuredMaxMicSlots;
    
    // 添加日志，帮助调试
    console.log('🎯 计算麦位状态:', {
      micListCount,
      configuredMaxMicSlots,
      roomDetailsMaxSlots: roomDetails?.maxMicSlots,
      defaultMaxSlots: maxMicSlots,
      hasAvailableSlots
    });
    
    return {
      micListCount,
      maxSlots: configuredMaxMicSlots,
      hasAvailableSlots
    };
  }, [participants, maxMicSlots, roomDetails]);

  // 定义标签页
  const tabs = React.useMemo(() => {
    // 添加日志，帮助调试
    console.log('🔄 重新计算tabs - micStats:', micStats, 'forceUpdateTrigger:', forceUpdateTrigger);
    
    // 设置麦位信息标签文本
    let micInfoLabel = '';
    if (roomDetails === null) {
      // 数据未加载时显示加载中
      micInfoLabel = `加载麦位数据...`;
    } else {
      // 数据已加载，显示详细信息
      micInfoLabel = `当前麦位数 ${micStats.micListCount} 最大麦位数 ${roomDetails.maxMicSlots}`;
    }
    
    const tabItems: TabItem[] = [
      {
        key: 'chat',
        // 将标签名改为带描述的麦位数量
        label: micInfoLabel,
        content: <MobileChat userRole={userRole} maxMicSlots={roomDetails?.maxMicSlots || maxMicSlots} />,
        isMicInfo: true // 标记为麦位信息标签
      }
    ];
    
    // 如果是主持人，添加控制面板标签
    if (userRole && userRole >= 2) {
      tabItems.push({
        key: 'control',
        label: '管理',
        content: <MobileControlPanel 
          userRole={userRole} 
          userName={userName}
          userToken={userToken}
        />
      });
    }
    
    return tabItems;
  }, [micStats, userRole, userName, userToken, forceUpdateTrigger]);
  
  // 申请上麦按钮已移除

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
          // 先请求全屏，然后在成功回调中锁定横屏
          console.log('请求进入全屏模式');
          
          // 定义成功进入全屏后的回调
          const onFullscreenSuccess = () => {
            // 延迟一小段时间再锁定屏幕方向，等待全屏模式完全建立
            setTimeout(() => {
              try {
                // 强制锁定为横屏模式
                if (screen.orientation && 'lock' in screen.orientation) {
                  console.log('请求锁定横屏方向');
                  (screen.orientation as any).lock('landscape').catch((err: any) => {
                    console.error('无法锁定屏幕方向:', err);
                  });
                }
              } catch (orientationError) {
                console.error('屏幕方向API错误:', orientationError);
              }
            }, 300); // 300ms延迟，等待全屏模式稳定和提示条显示完成
          };
          
          // 请求全屏并处理成功情况
          if ((screenShareContainer as any).requestFullscreen) {
            (screenShareContainer as any).requestFullscreen()
              .then(onFullscreenSuccess)
              .catch((err: any) => {
                console.error('无法进入全屏模式:', err);
              });
          } else if ((screenShareContainer as any).webkitRequestFullscreen) {
            (screenShareContainer as any).webkitRequestFullscreen();
            // WebKit没有Promise返回，使用延时
            setTimeout(onFullscreenSuccess, 100);
          } else if ((screenShareContainer as any).msRequestFullscreen) {
            (screenShareContainer as any).msRequestFullscreen();
            setTimeout(onFullscreenSuccess, 100);
          }
        } else {
          // 退出全屏
          console.log('请求退出全屏模式');
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
              console.log('解除屏幕方向锁定');
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
    // 初始化视口修复
    const viewportCleanup = setupViewportFix();
    
    // 启用底部对齐模式
    enableBottomAlignment();
    
    // 组件卸载时清理事件监听
    return () => {
      if (viewportCleanup) viewportCleanup();
      
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
      {/* 申请上麦按钮已移除 */}
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
                
                {/* 添加调试信息 - 在所有环境都显示 */}
                <div className="debug-overlay">{debugInfo}</div>
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
      
      {/* 添加浮动调试按钮 */}
      <div className="floating-debug-button" onClick={() => {
        // 切换调试模式
        setDebugModeEnabled(!debugModeEnabled);
      }}>
        {debugModeEnabled ? '关闭调试' : '调试'}
      </div>
      
      <RoomAudioRenderer />
      <HideLiveKitCounters />
      
      {/* 添加自定义样式 */}
      <style jsx>{`
        .mobile-video-conference {
          display: flex;
          flex-direction: column;
          height: calc(var(--vh, 1vh) * 100);
          width: 100vw;
          overflow: hidden;
          background-color: #1a1a1a;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          top: 0;
          margin: 0;
          padding: 0;
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
          z-index: 9500; /* 提高z-index，确保覆盖浮动窗口 */
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
          object-fit: cover;
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
        
        /* 浮动调试按钮样式 */
        .floating-debug-button {
          position: fixed;
          bottom: 80px;
          right: 20px;
          background: rgba(0, 150, 255, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          z-index: 9999;
          cursor: pointer;
          user-select: none;
        }
        
        .floating-debug-button:active {
          transform: scale(0.95);
          background: rgba(0, 120, 230, 0.8);
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