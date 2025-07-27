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
  useRoomInfo,
} from '@livekit/components-react';
import { Track, RoomEvent, Room, Participant } from 'livekit-client';
import { MobileAvatarRow } from './MobileAvatarRow';
import { MobileTabs, TabItem } from './MobileTabs';
import { MobileChat } from './MobileChat';
import { MobileControlPanel } from './MobileControlPanel';
import { FloatingVideoPanel } from './FloatingVideoPanel';
import { HideLiveKitCounters } from './HideLiveKitCounters';
import { FloatingWrapper } from './FloatingParticipantTile'; // 引入FloatingWrapper组件
import { isHostOrAdmin, isCameraEnabled, shouldShowInMicList } from '../lib/token-utils';
import { getImagePath } from '../lib/image-path';
import { setupViewportFix, enableBottomAlignment } from '../lib/viewport-debug';
import { API_CONFIG } from '../lib/config';
// 导入VideoElementStyleController组件
import { VideoElementStyleController } from './VideoElementStyleController';
// 移除DebugPanel导入

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

export function SimpleMobileVideoConference({ 
  userRole, 
  userName, 
  userId, 
  maxMicSlots = DEFAULT_MAX_MIC_SLOTS,
  userToken
}: MobileVideoConferenceProps) {
  // 🚀 版本标识 - 移动端浮动视频窗口版本
  console.log('🚀🚀🚀 SimpleMobileVideoConference 版本: v2024.07.01.01 - 移动端浮动视频窗口 🚀🚀🚀');
  
  const { localParticipant } = useLocalParticipant();
  const roomCtx = useRoomContext();
  const room = roomCtx as Room;
  const participants = useParticipants();
  const roomInfo = useRoomInfo();
  const [pinnedParticipantId, setPinnedParticipantId] = React.useState<string | null>(null);
  // 添加全屏状态
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  // 删除调试模式状态
  
  // 删除调试模式useEffect
  
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
  
  // 用于屏幕共享的轨道 - 直接使用PC端的方式获取，确保一致性
  const screenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: true },
  );
  
  // 有屏幕共享时显示屏幕共享
  const hasScreenShare = screenTracks.length > 0;
  
  // 🎯 检查是否有主持人在线
  const getParticipantRole = (participant: Participant): number => {
    const attributes = participant.attributes || {};
    const role = parseInt(attributes.role || '1');
    return role;
  };

  // 当前用户是否为主持人
  const currentUserIsHost = userRole && (userRole === 2 || userRole === 3);
  
  // 查找其他主持人参与者
  const otherHostParticipant = participants.find(p => {
    const role = getParticipantRole(p);
    return role === 2 || role === 3; // 主持人或管理员
  });

  // 如果当前用户是主持人，或者找到了其他主持人，则认为有主持人
  const hasHost = currentUserIsHost || otherHostParticipant !== undefined;
  
  // 🎯 获取主持人视频轨道 - 用于浮动窗口显示
  const hostVideoTracks = React.useMemo(() => {
    if (!hasHost) return [];
    
    // 找到所有主持人的摄像头轨道
    return videoTracks.filter(track => {
      if (!track || !track.participant) return false;
      
      const attributes = track.participant.attributes || {};
      const isHostRole = isHostOrAdmin(attributes);
      
      return isHostRole && track.source === Track.Source.Camera;
    });
  }, [videoTracks, hasHost]);
  
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
    console.log('🎯 计算麦位状态(SimpleMobileVideoConference):', {
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
    console.log('🔄 重新计算tabs(Simple) - micStats:', micStats, 'forceUpdateTrigger:', forceUpdateTrigger);
    
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
  
  // 调试面板状态已移除
  // const [debugPanelVisible, setDebugPanelVisible] = React.useState(false);
  // const [debugData, setDebugData] = React.useState<Record<string, any>>({});
  
  // 调试面板操作已移除
  /*const handleDebugAction = (action: string) => {
    console.log(`调试面板动作: ${action}`);
    if (action === 'refresh-video-style') {
      forceRefreshVideoStyle();
    }
  };*/
  
  // 添加屏幕方向状态
  const [deviceOrientation, setDeviceOrientation] = React.useState<'portrait' | 'landscape'>('portrait');
  const [orientationListenerActive, setOrientationListenerActive] = React.useState<boolean>(false);
  const fullscreenContainerRef = React.useRef<HTMLElement | null>(null);
  
  // 添加标志变量，控制方向变化处理
  const [isExitingFullscreen, setIsExitingFullscreen] = React.useState<boolean>(false);
  
  // 添加状态变量保存原始尺寸
  const [originalContainerSize, setOriginalContainerSize] = React.useState<{
    width: string;
    height: string;
    position: string;
    display: string;
  }>({
    width: '',
    height: '',
    position: '',
    display: ''
  });
  
  // 添加强制刷新视频样式的函数
  const forceRefreshVideoStyle = React.useCallback(() => {
    try {
      // 获取当前活动的容器
      const container = hasScreenShare && screenTracks.length > 0 
        ? document.querySelector('.screen-share-wrapper')
        : document.querySelector('.video-wrapper');
        
      if (!container) {
        console.error('找不到视频容器，无法刷新样式');
        return;
      }
      
      // 获取视频元素
      const videoElement = container.querySelector('video');
      if (!videoElement) {
        console.error('找不到视频元素，无法刷新样式');
        return;
      }
      
      console.log('🔄 强制刷新视频样式');
      
      // 先移除所有优化标记
      videoElement.removeAttribute('data-fullscreen-optimized');
      
      // 延迟执行，确保先清理再应用
      setTimeout(() => {
        // 重新应用样式优化
        applyVideoStyles(videoElement as HTMLElement, container as HTMLElement);
        
        // 调试信息收集已移除
        // collectDebugInfo(container as HTMLElement);
        
        console.log('✅ 视频样式刷新完成');
      }, 100);
    } catch (error) {
      console.error('强制刷新视频样式失败:', error);
    }
  }, [hasScreenShare, screenTracks.length]);

  // 处理设备方向变化
  const handleOrientationChange = React.useCallback(() => {
    try {
      // 获取当前的容器元素
      const container = fullscreenContainerRef.current || (
        screenTracks.length > 0
          ? document.querySelector('.screen-share-wrapper')
          : document.querySelector('.floating-wrapper')
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
        applyVideoStyles(videoElement, container as HTMLElement);
      }
      
      if (isLandscape) {
        // 设备已物理横屏，移除CSS旋转但保持全屏状态
        container.classList.remove('ios-landscape-mode');
        container.classList.add('device-landscape'); // 添加设备物理横屏标记
      } else {
        // 设备竖屏，应用CSS旋转
        container.classList.add('ios-landscape-mode');
        container.classList.remove('device-landscape'); // 移除设备物理横屏标记
      }
      
      // 调试信息收集已移除
      // collectDebugInfo(container as HTMLElement);
    } catch (error) {
      console.error('处理屏幕方向变化出错:', error);
    }
  }, [screenTracks.length]);
  
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
        
        // 转换为HTMLVideoElement类型
        const videoHTMLVideoElement = videoElement as HTMLVideoElement;
        
        // 获取视频原始比例信息
        const videoWidth = videoHTMLVideoElement.videoWidth || 1920;
        const videoHeight = videoHTMLVideoElement.videoHeight || 1080;
        const videoRatio = videoWidth / videoHeight;
        
        console.log(`应用视频样式 - 分辨率: ${videoWidth}×${videoHeight}, 比例: ${videoRatio.toFixed(2)}`);
        
        // 获取屏幕尺寸
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        console.log(`屏幕尺寸: ${screenW}×${screenH}`);
        
        // 检查是iOS横屏模式
        const isIOSLandscape = container.classList.contains('ios-landscape-mode');
        
        // iOS横屏模式和常规模式使用相同的计算逻辑
        // window.innerWidth 和 window.innerHeight 已经反映了当前实际的视口尺寸
        const screenRatio = screenW / screenH;
        console.log(`屏幕比例: ${screenRatio.toFixed(2)}, 视频比例: ${videoRatio.toFixed(2)}`);
        
        let optimalWidth, optimalHeight;
        
        if (videoRatio > screenRatio) {
          // 视频比例大于屏幕比例（视频较宽），以宽度为基准
          optimalWidth = screenW;
          optimalHeight = screenW / videoRatio;
          console.log(`视频较宽，以宽度顶满: ${optimalWidth.toFixed(0)}×${optimalHeight.toFixed(0)}`);
        } else {
          // 视频比例小于屏幕比例（视频较窄），以高度为基准
          optimalHeight = screenH;
          optimalWidth = screenH * videoRatio;
          console.log(`视频较窄，以高度顶满: ${optimalWidth.toFixed(0)}×${optimalHeight.toFixed(0)}`);
        }
        
        // 设置视频元素样式
        videoElement.style.width = optimalWidth + 'px';
        videoElement.style.height = optimalHeight + 'px';
        videoElement.style.maxWidth = 'none';
        videoElement.style.maxHeight = 'none';
        videoElement.style.objectFit = 'contain'; // 使用contain保持比例
        videoElement.style.margin = '0';
        videoElement.style.padding = '0';
        
        // 设置调试属性
        videoElement.setAttribute('data-fullscreen-optimized', 'true');
        videoElement.setAttribute('data-optimization-timestamp', new Date().toISOString());
        videoElement.setAttribute('data-style-setter', isIOSLandscape ? 'applyVideoStyles-iOS-Simple-Fixed' : 'applyVideoStyles-Standard-Simple');
        videoElement.setAttribute('data-video-ratio', videoRatio.toFixed(2));
        
        // 调整网格布局容器
        const gridLayout = container.querySelector('.lk-grid-layout');
        if (gridLayout) {
          (gridLayout as HTMLElement).style.width = optimalWidth + 'px';
          (gridLayout as HTMLElement).style.height = optimalHeight + 'px';
          (gridLayout as HTMLElement).style.maxWidth = 'none';
          (gridLayout as HTMLElement).style.maxHeight = 'none';
          (gridLayout as HTMLElement).style.display = 'flex';
          (gridLayout as HTMLElement).style.alignItems = 'center';
          (gridLayout as HTMLElement).style.justifyContent = 'center';
          (gridLayout as HTMLElement).style.margin = '0';
          (gridLayout as HTMLElement).style.padding = '0';
        }
        
        
      } else {
        // 退出全屏模式时，清除所有内联样式，让CSS接管
        console.log('清除全屏视频样式，恢复正常显示');
        
        // 清除视频元素的内联样式
        videoElement.style.width = '';
        videoElement.style.height = '';
        videoElement.style.maxWidth = '';
        videoElement.style.maxHeight = '';
        videoElement.style.objectFit = '';
        videoElement.style.margin = '';
        videoElement.style.padding = '';
        
        // 清除调试属性
        videoElement.removeAttribute('data-fullscreen-optimized');
        videoElement.removeAttribute('data-optimization-timestamp');
        videoElement.removeAttribute('data-style-setter');
        videoElement.removeAttribute('data-video-ratio');
        
        // 清除网格布局容器的内联样式
        const gridLayout = container.querySelector('.lk-grid-layout');
        if (gridLayout) {
          (gridLayout as HTMLElement).style.width = '';
          (gridLayout as HTMLElement).style.height = '';
          (gridLayout as HTMLElement).style.maxWidth = '';
          (gridLayout as HTMLElement).style.maxHeight = '';
          (gridLayout as HTMLElement).style.minWidth = '';
          (gridLayout as HTMLElement).style.minHeight = '';
          (gridLayout as HTMLElement).style.display = '';
          (gridLayout as HTMLElement).style.alignItems = '';
          (gridLayout as HTMLElement).style.justifyContent = '';
          (gridLayout as HTMLElement).style.margin = '';
          (gridLayout as HTMLElement).style.padding = '';
        }
      }
    } catch (error) {
      console.error('应用视频样式失败:', error);
    }
  };

  // 切换全屏/横屏模式 - 用于屏幕共享和摄像头视频
  const toggleFullscreen = React.useCallback(() => {
    try {
      // 在按钮点击时立即记录关键信息
      const clickInfo = {
        time: new Date().toLocaleTimeString(),
        fullscreenState: isFullscreen,
        deviceOrientation,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        orientation: window.orientation !== undefined ? window.orientation : '未知',
        isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent)
      };
      
      console.log('全屏切换按钮点击', clickInfo);
      
      // 根据当前显示的内容选择合适的容器
      const container = screenTracks.length > 0
        ? document.querySelector('.screen-share-wrapper')
        : document.querySelector('.floating-wrapper'); // 浮动窗口用于摄像头视频
      
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
          
          // 保存原始尺寸
          const computedStyle = window.getComputedStyle(container);
          setOriginalContainerSize({
            width: computedStyle.width,
            height: computedStyle.height,
            position: computedStyle.position,
            display: computedStyle.display
          });
          console.log(`保存原始尺寸详情:`, {
            width: computedStyle.width,
            height: computedStyle.height,
            position: computedStyle.position,
            display: computedStyle.display,
            time: new Date().toLocaleTimeString()
          });
          
          // 1. 安卓设备：使用API锁定屏幕方向
          if (!isIOS && screen.orientation && 'lock' in screen.orientation) {
            // 安卓设备 - 先请求全屏，然后锁定横屏
            if (container.requestFullscreen) {
              // 先设置状态，避免状态滞后于DOM变化
              setIsFullscreen(true);
              
              container.requestFullscreen()
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
                    
                    // 调试信息收集已移除
                    // collectDebugInfo(container as HTMLElement);
                  }, 300);
                })
                .catch(err => {
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
                
                // 调试信息收集已移除
                // collectDebugInfo(container as HTMLElement);
              }, 300);
            }
          } 
          // 2. iOS设备：使用CSS旋转模拟横屏
          else if (isIOS) {
            // 先同步设置状态，避免状态延迟
            setIsFullscreen(true);
            
            // 同步标记状态更新完成，用于调试信息收集
            (window as any).__isFullscreenStateUpdated = true;
            
            // iOS设备 - 先请求全屏
            if ((container as any).webkitRequestFullscreen) {
              try {
                (container as any).webkitRequestFullscreen();
              } catch (e) {
                console.log('iOS全屏请求失败，使用CSS模拟');
              }
            }
            
            // 移除已存在的样式类以避免叠加
            container.classList.remove('ios-landscape-mode');
            container.classList.remove('fullscreen-mode');
            container.classList.remove('device-landscape');
            
            // 清除之前可能设置的内联样式
            (container as HTMLElement).style.position = '';
            (container as HTMLElement).style.top = '';
            (container as HTMLElement).style.left = '';
            (container as HTMLElement).style.width = '';
            (container as HTMLElement).style.height = '';
            (container as HTMLElement).style.transformOrigin = '';
            (container as HTMLElement).style.transform = '';
            (container as HTMLElement).style.zIndex = '';
            
            // 在下一个渲染周期应用新样式，避免闪烁
            setTimeout(() => {
              // 确保在隐藏其他UI元素之前捕获body引用
              const bodyElement = document.body;
            
              // 应用CSS变换模拟横屏 - 使用直接样式和类名
              container.classList.add('ios-landscape-mode');
              container.classList.add('fullscreen-mode'); // 添加通用全屏类
              bodyElement.classList.add('ios-landscape-active');
              
              // 强制隐藏可能遮挡的UI元素
              const elementsToHide = document.querySelectorAll('.header-bar, .footer-bar, .nav-bar, .tab-bar');
              elementsToHide.forEach((el) => {
                (el as HTMLElement).style.display = 'none';
              });
              
              // 直接应用内联样式确保旋转效果生效
              (container as HTMLElement).style.position = 'fixed';
              (container as HTMLElement).style.top = '0';
              (container as HTMLElement).style.left = '0';
              // 使用安全的视口尺寸 - 回退到直接获取CSS变量
              const actualVh = getComputedStyle(document.documentElement).getPropertyValue('--actual-vh') || `${window.innerHeight}px`;
              const actualVw = getComputedStyle(document.documentElement).getPropertyValue('--actual-vw') || `${window.innerWidth}px`;
              (container as HTMLElement).style.width = actualVh;
              (container as HTMLElement).style.height = actualVw;
              (container as HTMLElement).style.transformOrigin = 'left top';
              (container as HTMLElement).style.transform = 'rotate(-90deg) translateX(-100%)';
              (container as HTMLElement).style.zIndex = '99999'; // 最高层级
              
              // 检查安全区域
              if ('CSS' in window && CSS.supports('padding: env(safe-area-inset-bottom)')) {
                (container as HTMLElement).style.paddingBottom = 'env(safe-area-inset-bottom)';
                (container as HTMLElement).style.paddingTop = 'env(safe-area-inset-top)';
              }
              
              // 优化视频比例
              optimizeVideoFit(container as HTMLElement);
              
              // 调试信息收集已移除
              // setTimeout(() => {
              //   collectDebugInfo(container as HTMLElement);
              // }, 300);
            }, 50);
          }
        } else {
          // 退出全屏模式
          
          // 先更新状态
          setIsFullscreen(false);
          
          // 检测设备类型
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          
          // 显示调试信息
          const debugInfo = {
            '点击时间': new Date().toLocaleTimeString(),
            '设备类型': isIOS ? 'iOS' : '非iOS',
            '视口尺寸': `${window.innerWidth}×${window.innerHeight}`,
            '方向值': window.orientation !== undefined ? window.orientation : '不支持',
            '设备方向': deviceOrientation,
            'DOM全屏元素': document.fullscreenElement ? '有' : '无',
            'webkit全屏元素': (document as any).webkitFullscreenElement ? '有' : '无',
            'React全屏状态': isFullscreen ? '是' : '否',
            '容器类名': container ? container.className : '未知',
            'body类名': document.body.className,
            '按钮CSS类名': document.querySelector('.fullscreen-toggle-btn')?.className || '未找到'
          };
          
          // 移除alert调用
          console.log('【SimpleMobile退出全屏按钮点击】', debugInfo);
          
          // 安卓设备
          if (!isIOS) {
            // 退出全屏
            if (document.exitFullscreen) {
              document.exitFullscreen().catch(err => {
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
            console.log('iOS设备退出全屏模式');
            
            // 收集退出全屏前的信息
            const beforeExitInfo = {
              viewport: `${window.innerWidth} × ${window.innerHeight}`,
              orientation: window.orientation !== undefined ? window.orientation : 'unknown',
              isFullscreen: isFullscreen,
              hasScreenShare: screenTracks.length > 0,
              containerClasses: container ? container.className : 'unknown',
              deviceOrientation,
              bodyClasses: document.body.className
            };
            
            // 先更新状态并设置锁定标志，防止方向变化事件干扰
            setIsFullscreen(false);
            setIsExitingFullscreen(true);
            // 重置状态标记
            (window as any).__isFullscreenStateUpdated = false;
            
            // 暂时移除方向变化和resize事件监听器，防止重新应用横屏样式
            window.removeEventListener('orientationchange', handleOrientationChange);
            window.removeEventListener('resize', handleOrientationChange);
            
            // 显示退出前的信息
            const alertMsg = `
【退出全屏前信息】
视口尺寸: ${beforeExitInfo.viewport}
设备方向: ${beforeExitInfo.orientation}度
React全屏状态: ${beforeExitInfo.isFullscreen}
屏幕共享状态: ${beforeExitInfo.hasScreenShare}
容器类名: ${beforeExitInfo.containerClasses}
方向状态: ${beforeExitInfo.deviceOrientation}
body类名: ${beforeExitInfo.bodyClasses}
            `;
            
            // 移除alert调用
            console.log('【退出全屏前信息】', beforeExitInfo);
            
            // 确保退出全屏API调用
            if ((document as any).webkitExitFullscreen) {
              try {
                (document as any).webkitExitFullscreen();
              } catch (e) {
                console.log('iOS退出全屏API调用失败，继续使用CSS方法');
              }
            }
            
            // 第一阶段：立即清除CSS类和内联样式
            const clearStyles = () => {
              console.log('清除CSS样式 - 阶段1');
              // 移除所有横屏相关的CSS类
              container.classList.remove('ios-landscape-mode');
              container.classList.remove('fullscreen-mode');
              container.classList.remove('device-landscape');
              document.body.classList.remove('ios-landscape-active');
              
              // 直接移除所有可能影响布局的内联样式
              const elementsToClear = [container, document.body];
              
              elementsToClear.forEach(el => {
                if (el) {
                  (el as HTMLElement).style.position = '';
                  (el as HTMLElement).style.top = '';
                  (el as HTMLElement).style.left = '';
                  (el as HTMLElement).style.width = '';
                  (el as HTMLElement).style.height = '';
                  (el as HTMLElement).style.transformOrigin = '';
                  (el as HTMLElement).style.transform = '';
                  (el as HTMLElement).style.zIndex = '';
                  (el as HTMLElement).style.margin = '';
                  (el as HTMLElement).style.padding = '';
                  (el as HTMLElement).style.overflow = '';
                }
              });
              
              // 对视频容器特别处理
              const videoElement = container.querySelector('video');
              if (videoElement) {
                (videoElement as HTMLElement).style.transform = '';
                (videoElement as HTMLElement).style.transformOrigin = '';
                (videoElement as HTMLElement).style.width = '';
                (videoElement as HTMLElement).style.height = '';
                (videoElement as HTMLElement).style.objectFit = '';
                
                // 移除data-lk-orientation属性或设置为portrait
                if (videoElement.hasAttribute('data-lk-orientation')) {
                  videoElement.setAttribute('data-lk-orientation', 'portrait');
                }
              }
              
              // 处理屏幕共享包装器
              const screenShareWrapper = document.querySelector('.screen-share-wrapper');
              if (screenShareWrapper) {
                                  // 优先应用之前保存的原始尺寸
                  if (originalContainerSize.width && originalContainerSize.height) {
                   console.log(`应用保存的原始尺寸详情:`, {
                     width: originalContainerSize.width,
                     height: originalContainerSize.height,
                     position: originalContainerSize.position || 'relative',
                     display: originalContainerSize.display || 'flex',
                     time: new Date().toLocaleTimeString(),
                     location: '第一阶段清除样式'
                   });
                   
                   // 使用!important强制应用样式
                   (screenShareWrapper as HTMLElement).style.cssText += `
                     width: ${originalContainerSize.width} !important;
                     height: ${originalContainerSize.height} !important;
                     max-width: none !important;
                     min-width: ${originalContainerSize.width} !important;
                     max-height: none !important;
                     min-height: ${originalContainerSize.height} !important;
                     position: ${originalContainerSize.position || 'relative'} !important;
                   `;
                } else {
                  // 使用默认尺寸作为回退方案
                  (screenShareWrapper as HTMLElement).style.position = 'relative';
                  (screenShareWrapper as HTMLElement).style.width = '100%';
                  (screenShareWrapper as HTMLElement).style.height = '30vh'; // 恢复竖屏高度
                }
                
                // 清除全屏相关样式
                (screenShareWrapper as HTMLElement).style.transform = '';
                (screenShareWrapper as HTMLElement).style.transformOrigin = '';
                (screenShareWrapper as HTMLElement).style.top = '';
                (screenShareWrapper as HTMLElement).style.left = '';
                (screenShareWrapper as HTMLElement).style.right = '';
                (screenShareWrapper as HTMLElement).style.bottom = '';
                (screenShareWrapper as HTMLElement).style.zIndex = '';
              }
              
              // 处理grid布局
              const gridLayout = document.querySelector('.lk-grid-layout');
              if (gridLayout) {
                (gridLayout as HTMLElement).style.width = '100%';
                (gridLayout as HTMLElement).style.height = '100%';
                (gridLayout as HTMLElement).style.maxWidth = '';
                (gridLayout as HTMLElement).style.maxHeight = '';
                (gridLayout as HTMLElement).style.padding = '';
                (gridLayout as HTMLElement).style.margin = '';
                (gridLayout as HTMLElement).style.transform = '';
              }
              
              // 处理mobile-video-container
              const mobileVideoContainer = document.querySelector('.mobile-video-container');
              if (mobileVideoContainer) {
                (mobileVideoContainer as HTMLElement).style.width = '100%';
                (mobileVideoContainer as HTMLElement).style.height = '';
                (mobileVideoContainer as HTMLElement).style.position = 'relative';
              }
              
              // 恢复隐藏的UI元素
              const hiddenElements = document.querySelectorAll('.header-bar, .footer-bar, .nav-bar, .tab-bar');
              hiddenElements.forEach((el) => {
                (el as HTMLElement).style.display = '';
              });
            };
            
            // 立即执行第一阶段
            clearStyles();
            
            // 强制重绘整个页面
            document.body.style.display = 'none';
            const forceReflow = document.body.offsetHeight;
            document.body.style.display = '';
            
            // 第二阶段：延时200ms后再次清除，防止被重新应用
            setTimeout(() => {
              console.log('清除CSS样式 - 阶段2');
              clearStyles();
              
              // 再次应用保存的原始尺寸
              const screenShareWrapper = document.querySelector('.screen-share-wrapper');
              if (screenShareWrapper && originalContainerSize.width && originalContainerSize.height) {
                console.log(`再次应用保存的原始尺寸详情:`, {
                  width: originalContainerSize.width,
                  height: originalContainerSize.height,
                  position: originalContainerSize.position || 'relative',
                  display: originalContainerSize.display || 'flex',
                  time: new Date().toLocaleTimeString(),
                  location: '第二阶段延时处理'
                });
                
                // 使用!important强制应用样式
                (screenShareWrapper as HTMLElement).style.cssText += `
                  width: ${originalContainerSize.width} !important;
                  height: ${originalContainerSize.height} !important;
                  max-width: none !important;
                  min-width: ${originalContainerSize.width} !important;
                  max-height: none !important;
                  min-height: ${originalContainerSize.height} !important;
                  position: ${originalContainerSize.position || 'relative'} !important;
                `;
                
                // 强制重绘
                (screenShareWrapper as HTMLElement).style.display = 'none';
                void (screenShareWrapper as HTMLElement).offsetHeight; // 触发重排
                (screenShareWrapper as HTMLElement).style.display = originalContainerSize.display || 'flex';
              }
              
              // 第四阶段：恢复事件监听
              setTimeout(() => {
                console.log('恢复方向监听');
                window.addEventListener('orientationchange', handleOrientationChange);
                window.addEventListener('resize', handleOrientationChange);
                setIsExitingFullscreen(false);
                
                // 收集最终状态信息
                const screenShareWrapper = document.querySelector('.screen-share-wrapper');
                const videoElement = container.querySelector('video');
                const gridLayout = document.querySelector('.lk-grid-layout');
                
                const afterExitInfo = {
                  viewport: `${window.innerWidth} × ${window.innerHeight}`,
                  orientation: window.orientation !== undefined ? window.orientation : 'unknown',
                  isFullscreen: isFullscreen,
                  containerClasses: container ? container.className : 'unknown',
                  deviceOrientation,
                  bodyClasses: document.body.className,
                  videoElement: videoElement ? {
                    style: {
                      width: videoElement.style.width,
                      height: videoElement.style.height,
                      transform: videoElement.style.transform,
                      objectFit: videoElement.style.objectFit
                    },
                    orientation: videoElement.getAttribute('data-lk-orientation')
                  } : 'none',
                  screenShareWrapper: screenShareWrapper ? {
                    style: {
                      position: (screenShareWrapper as HTMLElement).style.position,
                      width: (screenShareWrapper as HTMLElement).style.width,
                      height: (screenShareWrapper as HTMLElement).style.height
                    }
                  } : 'none'
                };
                
                // 显示退出后的信息
                const alertMsg = `
【退出全屏后信息】
视口尺寸: ${afterExitInfo.viewport}
设备方向: ${afterExitInfo.orientation}度
React全屏状态: ${afterExitInfo.isFullscreen}
容器类名: ${afterExitInfo.containerClasses}
方向状态: ${afterExitInfo.deviceOrientation}
视频orientation: ${typeof afterExitInfo.videoElement === 'object' ? afterExitInfo.videoElement.orientation : 'none'}
屏幕共享容器高度: ${typeof afterExitInfo.screenShareWrapper === 'object' ? afterExitInfo.screenShareWrapper.style.height : 'none'}
                `;
                
                // 移除alert调用
                console.log('【退出全屏后信息】', afterExitInfo);
                
              }, 1000);
              
            }, 500);
            
            // 尝试强制刷新视图结构
            if (typeof window !== 'undefined' && window.requestAnimationFrame) {
              window.requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
              });
            }
            
            // 最终强制应用原始尺寸，确保不被其他代码覆盖
            setTimeout(() => {
              const screenShareWrapper = document.querySelector('.screen-share-wrapper');
              if (screenShareWrapper && originalContainerSize.width) {
                // 使用!important强制应用样式
                (screenShareWrapper as HTMLElement).style.cssText += `
                  width: ${originalContainerSize.width} !important;
                  height: ${originalContainerSize.height} !important;
                  max-width: none !important;
                  min-width: ${originalContainerSize.width} !important;
                  max-height: none !important;
                  min-height: ${originalContainerSize.height} !important;
                  position: ${originalContainerSize.position || 'relative'} !important;
                `;
                
                // 强制重排
                void (screenShareWrapper as HTMLElement).offsetHeight;
                
                console.log('最终强制应用原始尺寸:', {
                  width: originalContainerSize.width,
                  height: originalContainerSize.height,
                  time: new Date().toLocaleTimeString(),
                  cssText: (screenShareWrapper as HTMLElement).style.cssText
                });
              }
            }, 600); // 延迟600ms确保在其他所有处理后执行
          }
          
          // 调试信息收集已移除
          // setTimeout(() => {
          //   collectDebugInfo(container as HTMLElement);
          // }, 300);
            
          // 显示退出全屏后的状态
          const afterExitInfo = {
            '点击后时间': new Date().toLocaleTimeString(),
            '视口尺寸': `${window.innerWidth}×${window.innerHeight}`,
            '方向值': window.orientation !== undefined ? window.orientation : '不支持',
            '设备方向': deviceOrientation,
            'DOM全屏元素': document.fullscreenElement ? '有' : '无',
            'webkit全屏元素': (document as any).webkitFullscreenElement ? '有' : '无',
            'React全屏状态': isFullscreen ? '是' : '否',
            '容器类名': container ? container.className : '未知',
            'body类名': document.body.className,
            '内联样式position': (container as HTMLElement).style.position || '无',
            '内联样式transform': (container as HTMLElement).style.transform || '无',
            '视频objectFit': document.querySelector('video')?.style.objectFit || '无',
            '按钮类名': document.querySelector('.fullscreen-toggle-btn')?.className || '未找到'
          };
          
          // 移除alert调用
          console.log('【SimpleMobile退出全屏后状态】', afterExitInfo);
        }
      }
    } catch (error) {
      console.error('切换全屏模式出错:', error);
    }
  }, [isFullscreen, deviceOrientation, screenTracks, hasScreenShare]);
  
  // 收集和显示调试信息的函数
  const collectDebugInfo = (containerElement: HTMLElement) => {
    try {
      // 获取视口信息
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 判断当前是否为横屏模式
      const isLandscapeMode = containerElement.classList.contains('ios-landscape-mode') || 
                             containerElement.classList.contains('fullscreen-mode') ||
                             containerElement.classList.contains('device-landscape');
      
      // 获取组件尺寸
      const containerWidth = containerElement.offsetWidth;
      const containerHeight = containerElement.offsetHeight;
      const containerRatio = (containerWidth / containerHeight).toFixed(2);
      
      // 获取视频元素
      const videoElement = containerElement.querySelector('video') as HTMLVideoElement;
      
      // 获取视频流尺寸和比例
      const videoWidth = videoElement ? videoElement.videoWidth : 'unknown';
      const videoHeight = videoElement ? videoElement.videoHeight : 'unknown';
      const videoRatio = videoWidth !== 'unknown' && videoHeight !== 'unknown' ? 
        (Number(videoWidth) / Number(videoHeight)).toFixed(2) : 'unknown';
      
      // 获取视频元素实际显示尺寸
      const videoClientWidth = videoElement ? videoElement.clientWidth : 'unknown';
      const videoClientHeight = videoElement ? videoElement.clientHeight : 'unknown';
      const videoDisplayRatio = videoClientWidth !== 'unknown' && videoClientHeight !== 'unknown' ?
        (Number(videoClientWidth) / Number(videoClientHeight)).toFixed(2) : 'unknown';
        
      // 获取 screen-share-wrapper 的尺寸
      const screenShareWrapper = containerElement.closest('.screen-share-wrapper') as HTMLElement;
      const wrapperWidth = screenShareWrapper ? screenShareWrapper.offsetWidth : 'unknown';
      const wrapperHeight = screenShareWrapper ? screenShareWrapper.offsetHeight : 'unknown';
      const wrapperRatio = wrapperWidth !== 'unknown' && wrapperHeight !== 'unknown' ?
        (Number(wrapperWidth) / Number(wrapperHeight)).toFixed(2) : 'unknown';
      
      // 清空原有调试信息，只保留组件和视频流的尺寸信息
      const debugInfo = {
        [isLandscapeMode ? '横屏模式' : '竖屏模式']: {
          '容器尺寸': `${containerWidth} × ${containerHeight}`,
          '容器比例': containerRatio,
          'screen-share-wrapper尺寸': `${wrapperWidth} × ${wrapperHeight}`,
          'screen-share-wrapper比例': wrapperRatio,
          '视频流尺寸': `${videoWidth} × ${videoHeight}`,
          '视频流比例': videoRatio,
          '视频元素尺寸': `${videoClientWidth} × ${videoClientHeight}`,
          '视频元素比例': videoDisplayRatio,
          '视口尺寸': `${viewportWidth} × ${viewportHeight}`,
          '视口比例': (viewportWidth / viewportHeight).toFixed(2)
        }
      };
      
      // 更新调试数据并显示面板
      // setDebugData(debugInfo);
      // setDebugPanelVisible(true);
      
      console.log('视频尺寸调试信息:', debugInfo);
    } catch (err) {
      console.error('获取状态信息出错:', err);
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
        
        // 如果是屏幕共享并且有保存的尺寸，应用原始尺寸
        setTimeout(() => {
          if (screenTracks.length > 0 && originalContainerSize.width && originalContainerSize.height) {
            const screenShareWrapper = document.querySelector('.screen-share-wrapper');
            if (screenShareWrapper) {
              console.log(`全屏事件处理中恢复尺寸详情:`, {
                width: originalContainerSize.width,
                height: originalContainerSize.height,
                position: originalContainerSize.position || 'relative',
                display: originalContainerSize.display || 'flex',
                time: new Date().toLocaleTimeString(),
                location: '全屏事件处理'
              });
              
              // 使用!important强制应用样式
              (screenShareWrapper as HTMLElement).style.cssText += `
                width: ${originalContainerSize.width} !important;
                height: ${originalContainerSize.height} !important;
                max-width: none !important;
                min-width: ${originalContainerSize.width} !important;
                max-height: none !important;
                min-height: ${originalContainerSize.height} !important;
                position: ${originalContainerSize.position || 'relative'} !important;
              `;
              
              // 强制重排
              void (screenShareWrapper as HTMLElement).offsetHeight;
            }
          }
        }, 300);
        
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
    
    // 初始化视口修复
    const viewportCleanup = setupViewportFix();
    
    // 启用底部对齐模式
    enableBottomAlignment();
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      // 清理视口修复
      if (viewportCleanup) viewportCleanup();
      
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, screenTracks, originalContainerSize]);



  // 在返回的JSX中，修改视频显示逻辑，使用浮动窗口
  return (
    <div className="mobile-video-conference">
      {/* 添加VideoElementStyleController组件 */}
      <VideoElementStyleController originalSize={originalContainerSize} />
      
      {/* 申请上麦按钮已移除 */}
      {/* 移除固定视频区域，改为使用浮动窗口 */}
      <div className="mobile-video-container">
        {/* 始终渲染屏幕共享区域，而不是条件渲染 */}
        <div className={`screen-share-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}>
          {screenTracks.length > 0 ? (
            <>
              {/* PC端风格的屏幕共享组件 */}
              <GridLayout tracks={screenTracks}>
                <VideoTrack />
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
            </>
          ) : (
            /* 没有屏幕共享时显示的占位内容 */
            <div className="placeholder-content">
              <p>等待屏幕分享...</p>
              <p className="placeholder-hint">主持人开启屏幕分享后将显示在此区域</p>
              {hasHost ? (
                <p className="placeholder-status">主持人已在线，可以请求分享</p>
              ) : (
                <p className="placeholder-status waiting">等待主持人加入会议...</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 主持人视频使用浮动窗口显示 */}
      {hostVideoTracks.map((track, index) => {
        // 检查是否应该显示这个主持人的视频
        const participant = track.participant;
        if (!participant) return null;
        
        // 检查主持人摄像头是否开启
        const cameraEnabled = isCameraEnabled(participant);
        if (!cameraEnabled) return null;
        
        // 计算不同浮动窗口的位置，避免重叠
        const initialPosition = { 
          x: 20 + (index * 30), 
          y: 80 + (index * 20)
        };
        
        // 使用FloatingWrapper包装主持人视频
        return (
          <FloatingWrapper
            key={participant.identity}
            title={`${participant.name || participant.identity}`}
            initialPosition={initialPosition}
            width={100} // 移动端窗口宽度更小，已调整为方形
            height={100} // 移动端窗口高度更小，已调整为方形
          >
            <div style={{ 
              width: '100%', 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000',
              position: 'relative'
            }}>
              <TrackRefContext.Provider value={track}>
                <ParticipantTile 
                  style={{ width: '100%', height: '100%' }} 
                />
              </TrackRefContext.Provider>
            </div>
          </FloatingWrapper>
        );
      })}
      
      {/* 参与者头像列表 */}
      <MobileAvatarRow onAvatarClick={handleAvatarClick} />
      
      {/* 选项卡内容区域 */}
      <MobileTabs tabs={tabs} defaultActiveKey="chat" />
      
      {/* 移除调试按钮 */}
      
      {/* 添加调试面板 */}
      {/* <DebugPanel 
        isVisible={debugPanelVisible}
        data={debugData}
        onClose={() => setDebugPanelVisible(false)}
        onAction={handleDebugAction}
      /> */}
      
      <style jsx>{`
        .mobile-video-conference {
          display: flex;
          flex-direction: column;
          height: 100vh; /* 兼容性回退 */
          height: calc(var(--vh, 1vh) * 100);
          background-color: #111;
          color: white;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        
        .mobile-video-container {
          width: 100%;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: visible;
        }
        
        /* 屏幕共享容器样式优化 */
        .screen-share-wrapper {
          width: 100%;
          height: 30vh;
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #000;
        }
        
        /* 确保GridLayout和VideoTrack充满整个容器 */
        .screen-share-wrapper :global(.lk-grid-layout) {
          width: 100% !important;
          height: 100% !important;
        }
        
        .screen-share-wrapper :global(.lk-video-track) {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        
        /* 全屏模式样式 */
        .screen-share-wrapper.fullscreen-mode {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh; /* 兼容性回退 */
          height: calc(var(--vh, 1vh) * 100);
          z-index: 99999; /* 提高z-index，确保在最顶层 */
          background-color: #000;
          max-width: none;
          max-height: none;
        }
        
        /* 移除可能导致屏幕共享被截断的样式 */
        .mobile-video-container {
          width: 100%;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: visible;
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
          bottom: 5px;
          right: 5px;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          z-index: 2;
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
        
        /* 添加占位内容样式 */
        .placeholder-content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: #222;
          color: #aaa;
          padding: 20px;
          text-align: center;
        }
        
        .placeholder-content p {
          margin: 5px 0;
        }
        
        .placeholder-content p:first-child {
          font-size: 18px;
          font-weight: bold;
          color: #ccc;
        }
        
        .placeholder-hint {
          font-size: 14px;
          color: #888;
        }
        
        .placeholder-status {
          margin-top: 10px;
          font-size: 12px;
          color: #22c55e;
        }
        
        .placeholder-status.waiting {
          color: #eab308;
        }
          
        .svg-icon {
          width: 24px;
          height: 24px;
          filter: brightness(1);
        }

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
        
        .mic-info {
          font-size: 14px;
          font-weight: 500;
          color: white;
          padding-right: 10px;
        }
        
        .info-item {
          white-space: nowrap;
          color: black;
          font-size: 14px;
          font-weight: normal;
          margin-right: 15px;
        }
        
        .separator {
          margin: 0 8px;
          color: rgba(255,255,255,0.5);
        }
      `}</style>
      
      <RoomAudioRenderer />
      <HideLiveKitCounters />
    </div>
  );
} 