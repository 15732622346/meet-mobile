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
import { setupViewportFix, enableBottomAlignment } from '../lib/viewport-debug';
import { API_CONFIG } from '../lib/config';
import { DebugPanel } from './DebugPanel'; // 添加导入

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
    
    // 设置麦位信息标签文本（左侧部分）
    let leftLabel = '';
    // 设置房间和主持人信息（右侧部分）
    let rightLabel = '';
    
    if (roomDetails === null) {
      // 数据未加载时显示加载中
      leftLabel = `加载麦位数据...`;
      rightLabel = '';
    } else {
      // 数据已加载，显示详细信息
      leftLabel = `麦位数 ${micStats.micListCount} 上限 ${roomDetails.maxMicSlots}`;
      const hostName = otherHostParticipant?.name || (currentUserIsHost ? userName : '未知');
      rightLabel = `房间:${participants.length}\n主持人:${hostName}`;
    }
    
    const tabItems: TabItem[] = [
      {
        key: 'chat',
        // 使用自定义渲染函数来创建左右布局
        label: '',
        customLabel: (
          <div className="single-line-info">
            <span style={{color: 'black', fontSize: '14px', fontWeight: 'normal'}}>麦位数:{micStats.micListCount}</span>
            <span style={{color: 'black', fontSize: '14px', fontWeight: 'normal', marginLeft: '5px'}}>     上限:{roomDetails?.maxMicSlots || maxMicSlots}</span>
            <span style={{color: 'black', fontSize: '14px', fontWeight: 'normal', marginLeft: '5px'}}>     房间:{participants.length}</span>
            <span style={{color: 'black', fontSize: '14px', fontWeight: 'normal', marginLeft: '5px'}}>     主持人:{otherHostParticipant?.name || (currentUserIsHost ? userName : '未知')}</span>
          </div>
        ),
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

  // 添加调试面板状态
  const [debugPanelVisible, setDebugPanelVisible] = React.useState(false);
  const [debugData, setDebugData] = React.useState<Record<string, any>>({});
  
  // 添加屏幕方向状态
  const [deviceOrientation, setDeviceOrientation] = React.useState<string>('portrait');
  const [orientationListenerActive, setOrientationListenerActive] = React.useState<boolean>(false);
  const fullscreenContainerRef = React.useRef<HTMLElement | null>(null);

  // 处理设备方向变化
  const handleOrientationChange = React.useCallback(() => {
    try {
      // 获取当前的容器元素
      const container = fullscreenContainerRef.current || (
        hasScreenShare && screenTracks.length > 0 
          ? document.querySelector('.screen-share-wrapper')
          : document.querySelector('.video-wrapper')
      );
      
      if (!container) return;
      
      // 检查实际方向
      const isLandscape = window.innerWidth > window.innerHeight ||
                        (window.orientation !== undefined && 
                        (Math.abs(window.orientation as number) === 90));
      
      // 更新方向状态
      setDeviceOrientation(isLandscape ? 'landscape' : 'portrait');
      
      // 检查是否在全屏模式
      const hasFullscreenClass = container.classList.contains('fullscreen-mode') || 
                              container.classList.contains('ios-landscape-mode');
      
      if (!hasFullscreenClass) return; // 如果不是全屏模式，不调整样式
      
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!isIOS) return; // 只对iOS设备进行处理
      
      console.log(`设备方向变化: ${isLandscape ? '横屏' : '竖屏'}`);
      
      // 获取视频元素
      const videoElement = container.querySelector('video');
      if (videoElement) {
        applyVideoStyles(videoElement, container);
      }
      
      if (isLandscape) {
        // 设备已物理横屏，移除CSS旋转但保持全屏状态
        container.classList.remove('ios-landscape-mode');
        container.classList.add('device-landscape'); // 添加设备物理横屏标记
        // 重置旋转相关样式但保持全屏
        (container as HTMLElement).style.transform = '';
        (container as HTMLElement).style.transformOrigin = '';
        (container as HTMLElement).style.width = '100%';
        (container as HTMLElement).style.height = '100%';
        (container as HTMLElement).style.left = '0';
        (container as HTMLElement).style.top = '0';
      } else {
        // 设备竖屏，应用CSS旋转
        container.classList.add('ios-landscape-mode');
        container.classList.remove('device-landscape'); // 移除设备物理横屏标记
        // 重新应用旋转样式
        (container as HTMLElement).style.position = 'fixed';
        (container as HTMLElement).style.top = '0';
        (container as HTMLElement).style.left = '0';
        (container as HTMLElement).style.width = '100vh';
        (container as HTMLElement).style.height = '100vw';
        (container as HTMLElement).style.transformOrigin = 'left top';
        (container as HTMLElement).style.transform = 'rotate(-90deg) translateX(-100%)';
      }
      
      // 收集和显示最新调试信息
      collectDebugInfo(container as HTMLElement);
    } catch (error) {
      console.error('处理屏幕方向变化出错:', error);
    }
  }, [hasScreenShare, screenTracks.length]);
  
  // 设置和清理方向变化监听器
  React.useEffect(() => {
    // 监听屏幕方向变化
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    setOrientationListenerActive(true);
    
    // 初始化方向状态
    const isLandscape = window.innerWidth > window.innerHeight ||
                       (window.orientation !== undefined && 
                       (Math.abs(window.orientation as number) === 90));
    setDeviceOrientation(isLandscape ? 'landscape' : 'portrait');
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      setOrientationListenerActive(false);
    };
  }, [handleOrientationChange]);
  
  // 优化视频比例填充
  const optimizeVideoFit = (container: HTMLElement) => {
    const videoElement = container.querySelector('video');
    if (!videoElement) return;
    
    // 立即应用一次样式
    applyVideoStyles(videoElement, container);
    
    // 延迟处理，确保视频加载完成后再次应用样式
    setTimeout(() => applyVideoStyles(videoElement, container), 500);
    
    // 再次延迟处理，处理可能的异步加载
    setTimeout(() => applyVideoStyles(videoElement, container), 1500);
    
    // 使用MutationObserver监视视频元素的属性变化，确保样式不被覆盖
    try {
      const observer = new MutationObserver((mutations) => {
        // 属性变化时重新应用样式
        applyVideoStyles(videoElement, container);
      });
      
      // 监视视频元素的属性变化
      observer.observe(videoElement, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      // 监视容器元素的属性变化
      observer.observe(container, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      // 监视网格布局容器的变化
      const gridLayout = container.querySelector('.lk-grid-layout');
      if (gridLayout) {
        observer.observe(gridLayout, {
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }
      
      // 30秒后断开观察器，避免长时间占用资源
      setTimeout(() => {
        observer.disconnect();
        console.log('视频样式观察器已断开');
      }, 30000);
    } catch (error) {
      console.error('设置视频样式观察器失败:', error);
    }
  };
  
  // 应用视频样式的函数
  const applyVideoStyles = (videoElement: HTMLElement, container: HTMLElement) => {
    try {
      // 检查是否在全屏模式
      const isFullscreenMode = container.classList.contains('fullscreen-mode') ||
                             container.classList.contains('ios-landscape-mode');
      
      if (isFullscreenMode) {
        console.log('应用全屏视频样式');
        
        // 直接设置内联样式，优先级最高
        videoElement.style.width = '100%';
        videoElement.style.height = 'auto';
        videoElement.style.maxHeight = '100%';
        videoElement.style.objectFit = 'contain';
        videoElement.style.margin = '0';
        videoElement.style.padding = '0';
        
        // 设置data属性以便CSS选择器识别
        videoElement.setAttribute('data-fullscreen-optimized', 'true');
        
        // 调整网格布局容器
        const gridLayout = container.querySelector('.lk-grid-layout');
        if (gridLayout) {
          (gridLayout as HTMLElement).style.width = '100%';
          (gridLayout as HTMLElement).style.height = '100%';
          (gridLayout as HTMLElement).style.display = 'flex';
          (gridLayout as HTMLElement).style.alignItems = 'center';
          (gridLayout as HTMLElement).style.justifyContent = 'center';
          (gridLayout as HTMLElement).style.margin = '0';
          (gridLayout as HTMLElement).style.padding = '0';
        }
        
        // 获取视频原始比例信息
        const videoHTMLVideoElement = videoElement as HTMLVideoElement;
        const videoWidth = videoHTMLVideoElement.videoWidth || 1920;
        const videoHeight = videoHTMLVideoElement.videoHeight || 792;
        const videoRatio = videoWidth / videoHeight;
        
        console.log(`应用视频样式 - 分辨率: ${videoWidth}×${videoHeight}, 比例: ${videoRatio.toFixed(2)}`);
        
        // 在应用样式后触发调试面板更新
        setTimeout(() => {
          collectDebugInfo(container);
          // 确保调试面板可见
          setDebugPanelVisible(true);
        }, 300);
      }
    } catch (error) {
      console.error('应用视频样式失败:', error);
    }
  };

  // 切换全屏/横屏模式
  const toggleFullscreen = () => {
    try {
      // 获取容器元素 - 根据当前显示内容选择不同的容器
      const container = hasScreenShare && screenTracks.length > 0 
        ? document.querySelector('.screen-share-wrapper')
        : document.querySelector('.video-wrapper');
      
      // 保存引用以便方向变化处理函数使用
      if (container) {
        fullscreenContainerRef.current = container as HTMLElement;
      }
      
      // 检测设备类型
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if (container) {
        // 检查当前DOM状态而非React状态
        const isCurrentlyFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).msFullscreenElement
        );
        
        // 检查是否已应用了全屏样式类
        const hasFullscreenClass = container.classList.contains('fullscreen-mode') || 
                                  container.classList.contains('ios-landscape-mode');
        
        // 同步React状态与DOM状态
        if (isCurrentlyFullscreen !== isFullscreen) {
          setIsFullscreen(isCurrentlyFullscreen);
        }
        
        if (!isCurrentlyFullscreen) {
          console.log('请求进入全屏模式');
          
          // 1. 安卓设备：使用API锁定屏幕方向
          if (!isIOS && screen.orientation && 'lock' in screen.orientation) {
            // 安卓设备 - 先请求全屏，然后锁定横屏
            if ((container as any).requestFullscreen) {
              // 先设置状态，避免状态滞后于DOM变化
              setIsFullscreen(true);
              
              (container as any).requestFullscreen()
                .then(() => {
                  // 添加全屏CSS类
                  container.classList.add('fullscreen-mode');
                  
                  setTimeout(() => {
                    try {
                      (screen.orientation as any).lock('landscape').catch((err: any) => {
                        console.error('无法锁定横屏方向:', err);
                      });
                    } catch (orientationError) {
                      console.error('屏幕方向API错误:', orientationError);
                    }
                    
                    // 收集和显示调试信息
                    collectDebugInfo(container as HTMLElement);
                  }, 300);
                })
                .catch((err: any) => {
                  console.error('无法进入全屏模式:', err);
                  // 恢复状态
                  setIsFullscreen(false);
                });
            } else if ((container as any).webkitRequestFullscreen) {
              // 先设置状态
              setIsFullscreen(true);
              
              (container as any).webkitRequestFullscreen();
              // 添加全屏CSS类
              container.classList.add('fullscreen-mode');
              
              setTimeout(() => {
                try {
                  (screen.orientation as any).lock('landscape').catch((err: any) => {
                    console.error('无法锁定横屏方向:', err);
                  });
                } catch (orientationError) {
                  console.error('屏幕方向API错误:', orientationError);
                }
                
                // 收集和显示调试信息
                collectDebugInfo(container as HTMLElement);
              }, 300);
            }
          } 
          // 2. iOS设备：使用CSS旋转模拟横屏
          else if (isIOS) {
            // 先设置状态
            setIsFullscreen(true);
            
            // iOS设备 - 先请求全屏
            if ((container as any).webkitRequestFullscreen) {
              (container as any).webkitRequestFullscreen();
            }
            
            // 应用CSS变换模拟横屏 - 使用直接样式和类名
            container.classList.add('ios-landscape-mode');
            container.classList.add('fullscreen-mode'); // 添加通用全屏类
            document.body.classList.add('ios-landscape-active');
            
            // 直接应用内联样式确保旋转效果生效
            (container as HTMLElement).style.position = 'fixed';
            (container as HTMLElement).style.top = '0';
            (container as HTMLElement).style.left = '0';
            (container as HTMLElement).style.width = '100vh';
            (container as HTMLElement).style.height = '100vw';
            (container as HTMLElement).style.transformOrigin = 'left top';
            (container as HTMLElement).style.transform = 'rotate(-90deg) translateX(-100%)';
            (container as HTMLElement).style.zIndex = '9999';
            
            // 优化视频比例
            optimizeVideoFit(container as HTMLElement);
            
            // 收集和显示调试信息
            setTimeout(() => {
              collectDebugInfo(container as HTMLElement);
            }, 300);
          }
        } else {
          // 退出全屏模式
          
          // 先更新状态
          setIsFullscreen(false);
          
          // 安卓设备
          if (!isIOS) {
            // 退出全屏
            if (document.exitFullscreen) {
              document.exitFullscreen().catch((err: any) => {
                console.error('无法退出全屏模式:', err);
              });
            } else if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen();
            }
            
            // 先移除CSS类
            container.classList.remove('fullscreen-mode');
            
            // 解除屏幕方向锁定
            try {
              if (screen.orientation && 'unlock' in screen.orientation) {
                console.log('解除屏幕方向锁定');
                (screen.orientation as any).unlock();
              }
            } catch (orientationError) {
              console.error('屏幕方向API错误:', orientationError);
            }
          } 
          // iOS设备
          else {
            // 退出全屏
            if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen();
            }
            
            // 移除CSS类
            container.classList.remove('ios-landscape-mode');
            container.classList.remove('fullscreen-mode');
            document.body.classList.remove('ios-landscape-active');
            
            // 重置内联样式
            (container as HTMLElement).style.position = '';
            (container as HTMLElement).style.top = '';
            (container as HTMLElement).style.left = '';
            (container as HTMLElement).style.width = '';
            (container as HTMLElement).style.height = '';
            (container as HTMLElement).style.transformOrigin = '';
            (container as HTMLElement).style.transform = '';
            (container as HTMLElement).style.zIndex = '';
          }
          
          // 收集和显示调试信息
          setTimeout(() => {
            collectDebugInfo(container as HTMLElement);
          }, 300);
        }
      }
    } catch (error) {
      console.error('切换全屏模式出错:', error);
    }
  };
  
  // 收集和显示调试信息的函数
  const collectDebugInfo = (containerElement: HTMLElement) => {
    try {
      // 收集视口信息
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 检查是否支持window.orientation
      let orientationDegree = 'undefined';
      try {
        orientationDegree = (window as any).orientation !== undefined 
          ? `${(window as any).orientation}deg` 
          : 'not supported';
      } catch (e) {
        orientationDegree = 'error getting orientation';
      }
      
      // 获取screen.orientation信息
      let orientationType = 'undefined';
      try {
        orientationType = screen.orientation 
          ? screen.orientation.type 
          : 'not supported';
      } catch (e) {
        orientationType = 'error getting orientation type';
      }
      
      // 获取视频元素信息 - 强制重新获取最新状态
      const videoElement = containerElement.querySelector('video') as HTMLVideoElement;
      
      // 获取视频样式信息
      const videoStyles = videoElement ? {
        objectFit: videoElement.style.objectFit || 'not set',
        inlineWidth: videoElement.style.width || 'not set',
        inlineHeight: videoElement.style.height || 'not set',
        inlineMaxHeight: videoElement.style.maxHeight || 'not set',
        optimized: videoElement.hasAttribute('data-fullscreen-optimized') ? 'yes' : 'no'
      } : 'no video element';
      
      // 原有的视频信息获取
      const videoWidth = videoElement ? videoElement.videoWidth : 'unknown';
      const videoHeight = videoElement ? videoElement.videoHeight : 'unknown';
      const videoClientWidth = videoElement ? videoElement.clientWidth : 'unknown';
      const videoClientHeight = videoElement ? videoElement.clientHeight : 'unknown';
      const videoOffsetWidth = videoElement ? videoElement.offsetWidth : 'unknown';
      const videoOffsetHeight = videoElement ? videoElement.offsetHeight : 'unknown';
      
      // 获取视频的样式
      const videoStyle = videoElement ? window.getComputedStyle(videoElement) : null;
      const videoObjectFit = videoStyle ? videoStyle.objectFit : 'unknown';
      const videoDisplay = videoStyle ? videoStyle.display : 'unknown';
      
      // 获取真实可用视口（排除浏览器UI）
      const availableHeight = window.screen.availHeight;
      const availableWidth = window.screen.availWidth;
      
      // 获取内部容器信息
      const gridLayout = containerElement.querySelector('.lk-grid-layout');
      const gridWidth = gridLayout ? (gridLayout as HTMLElement).offsetWidth : 'unknown';
      const gridHeight = gridLayout ? (gridLayout as HTMLElement).offsetHeight : 'unknown';
      
      // 获取网格布局样式
      const gridStyles = gridLayout ? {
        display: (gridLayout as HTMLElement).style.display || 'not set',
        alignItems: (gridLayout as HTMLElement).style.alignItems || 'not set',
        justifyContent: (gridLayout as HTMLElement).style.justifyContent || 'not set'
      } : 'no grid layout';
      
      // 计算视口和容器的比例
      const containerWidth = containerElement ? containerElement.offsetWidth : 0;
      const containerHeight = containerElement ? containerElement.offsetHeight : 0;
      const containerRatio = containerElement ? 
        (containerWidth / containerHeight).toFixed(2) : 'unknown';
      const viewportRatio = (viewportWidth / viewportHeight).toFixed(2);
      const videoRatio = videoWidth !== 'unknown' && videoHeight !== 'unknown' ? 
        (Number(videoWidth) / Number(videoHeight)).toFixed(2) : 'unknown';
      
      // 获取CSS变换信息
      const computedStyle = containerElement ? window.getComputedStyle(containerElement) : null;
      const transform = computedStyle ? computedStyle.transform : 'unknown';
      const position = computedStyle ? computedStyle.position : 'unknown';
      
      // 检测真实的全屏状态
      const isDocumentFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      
      // 检查实际的CSS类
      const actualClasses = containerElement ? containerElement.className : 'unknown';
      const hasFullscreenClass = containerElement ? 
        containerElement.classList.contains('fullscreen-mode') || 
        containerElement.classList.contains('ios-landscape-mode') : 
        false;
      
      // 内联样式检查
      const inlinePosition = containerElement ? containerElement.style.position : 'none';
      const inlineTransform = containerElement ? containerElement.style.transform : 'none';
      
      // 收集调试数据
      const debugInfo = {
        '设备类型': /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iOS' : 'Android/其他',
        '视口尺寸': `${viewportWidth}×${viewportHeight}`,
        '可用视口': `${availableWidth}×${availableHeight}`,
        '物理方向': deviceOrientation,
        '当前方向监听': orientationListenerActive ? '活跃' : '未活跃',
        'window.orientation': orientationDegree,
        'screen.orientation': orientationType,
        '组件尺寸': `${containerWidth}×${containerHeight}`,
        '组件比例': containerRatio,
        '视口比例': viewportRatio,
        '内层容器': `${gridWidth}×${gridHeight}`,
        '网格布局样式': gridStyles,
        '视频分辨率': `${videoWidth}×${videoHeight}`,
        '视频显示尺寸': `${videoClientWidth}×${videoClientHeight}`,
        '视频布局尺寸': `${videoOffsetWidth}×${videoOffsetHeight}`,
        '视频比例': videoRatio,
        '视频内联样式': videoStyles,
        '视频object-fit': videoObjectFit,
        '视频display': videoDisplay,
        '全屏模式': isDocumentFullscreen,
        '组件类': actualClasses,
        'CSS变换': transform,
        '变换原点': computedStyle ? computedStyle.transformOrigin : 'unknown',
        '内联position': inlinePosition,
        '内联transform': inlineTransform,
        'position': position,
        'React全屏状态': isFullscreen,
        'CSS类包含fullscreen': hasFullscreenClass,
        '显示状态': displayState,
        '屏幕共享': hasScreenShare ? '是' : '否',
        '屏幕共享轨道': screenTracks.length,
        '最后更新': new Date().toLocaleTimeString()
      };
      
      // 更新调试数据并显示面板
      setDebugData(debugInfo);
      
      console.log('调试信息:', debugInfo);
    } catch (err) {
      console.error('获取状态信息出错:', err);
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
                    src={getImagePath(isFullscreen ? '/images/small.svg' : '/images/big.svg')}
                    alt={isFullscreen ? '退出全屏' : '全屏'} 
                    title={isFullscreen ? '退出全屏' : '全屏'} 
                    className="svg-icon"
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
                        src={getImagePath(isLocalCameraExpanded ? '/images/small.svg' : '/images/big.svg')}
                        alt={isLocalCameraExpanded ? '缩小' : '放大'} 
                        title={isLocalCameraExpanded ? '缩小' : '放大'} 
                        className="svg-icon"
                      />
                    </div>
                  </div>
                )}
                
                {/* 添加调试信息 - 在所有环境都显示 */}
                <div className="debug-overlay">{debugInfo}</div>
              </div>
            ) : mainVideoTrack ? (
              <div className={`video-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}>
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
                
                {/* 添加全屏/横屏切换按钮 */}
                <div 
                  className="fullscreen-toggle-btn"
                  onClick={toggleFullscreen}
                >
                  <img 
                    src={getImagePath(isFullscreen ? '/images/small.svg' : '/images/big.svg')}
                    alt={isFullscreen ? '退出全屏' : '全屏'} 
                    title={isFullscreen ? '退出全屏' : '全屏'} 
                    className="svg-icon"
                  />
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
          width: 100%;
          position: relative;
          height: 30vh; /* 默认高度 */
          overflow: hidden;
        }
        
        .video-wrapper.fullscreen-mode {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh; /* 兼容性回退 */
          height: calc(var(--vh, 1vh) * 100);
          z-index: 9999;
          background-color: #000;
        }
        
        .video-wrapper.fullscreen-mode video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
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
          bottom: 5px;
          right: 5px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }
        
        /* 全屏状态下的按钮位置 */
        .fullscreen-mode .fullscreen-toggle-btn {
          bottom: 15px;
          right: 15px;
        }
        
        .fullscreen-toggle-btn img {
          width: 14px;
          height: 14px;
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
        
        /* 移除浮动调试按钮样式 */
        
        .svg-icon {
          width: 24px;
          height: 24px;
          filter: brightness(1);
        }

        .mic-info-bar {
          display: flex;
          justify-content: space-between;
          width: 100%;
          padding: 0 5px;
          background-color: #22c55e;
          color: white;
        }
        
        .left-info {
          font-size: 14px;
          font-weight: 500;
        }
        
        .right-info {
          display: flex;
          font-size: 14px;
        }
        
        .right-info span {
          margin-left: 15px;
        }

        /* 删除info-container样式 */
        
        .mic-info-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 0 5px;
        }
        
        .mic-info {
          font-size: 14px;
          font-weight: 500;
          color: white;
          padding: 0;
          margin-right: 10px;
          display: flex;
          align-items: center;
          border-right: 1px solid rgba(255,255,255,0.5);
          padding-right: 15px;
        }
        
        .host-room-info {
          display: flex;
          flex-direction: row;
          font-size: 14px;
          align-items: center;
          color: white;
        }
        
        .info-item {
          margin-left: 15px;
          white-space: nowrap;
        }
        
        .separator {
          margin: 0 8px;
          color: rgba(255,255,255,0.5);
        }

        .single-line-info {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 0 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .info-item {
          white-space: nowrap;
          color: black;
          font-size: 14px;
          font-weight: normal;
          font-family: sans-serif;
          margin-right: 0;
          margin-left: 0;
          padding-right: 5px;
          padding-left: 5px;
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
      
      {/* 添加调试面板 */}
      <DebugPanel 
        isVisible={debugPanelVisible}
        data={debugData}
        onClose={() => setDebugPanelVisible(false)}
      />
    </div>
  );
} 