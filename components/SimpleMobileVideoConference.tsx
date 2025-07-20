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
import { DebugPanel } from './DebugPanel'; // 添加导入

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

  // 切换全屏/横屏模式 - 用于屏幕共享和摄像头视频
  const toggleFullscreen = () => {
    try {
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
                    
                    // 收集和显示调试信息
                    collectDebugInfo(container as HTMLElement);
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
        '浮动面板可见': debugPanelVisible,
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
  }, [isFullscreen]);

  // 在返回的JSX中，修改视频显示逻辑，使用浮动窗口
  return (
    <div className="mobile-video-conference">
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
      <DebugPanel 
        isVisible={debugPanelVisible}
        data={debugData}
        onClose={() => setDebugPanelVisible(false)}
      />
      
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
          width: 100vw;
          height: 100vh; /* 兼容性回退 */
          height: calc(var(--vh, 1vh) * 100);
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