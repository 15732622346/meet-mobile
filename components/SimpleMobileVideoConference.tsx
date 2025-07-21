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
  
  // 切换全屏/横屏模式 - 用于屏幕共享和摄像头视频
  const toggleFullscreen = () => {
    try {
      // 根据当前显示的内容选择合适的容器
      const container = screenTracks.length > 0
        ? document.querySelector('.screen-share-wrapper')
        : document.querySelector('.floating-wrapper'); // 浮动窗口用于摄像头视频
      
      if (container) {
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
          if (container.requestFullscreen) {
            container.requestFullscreen()
              .then(onFullscreenSuccess)
              .catch(err => {
                console.error('无法进入全屏模式:', err);
              });
          } else if ((container as any).webkitRequestFullscreen) {
            (container as any).webkitRequestFullscreen();
            // WebKit没有Promise返回，使用延时
            setTimeout(onFullscreenSuccess, 100);
          } else if ((container as any).msRequestFullscreen) {
            (container as any).msRequestFullscreen();
            setTimeout(onFullscreenSuccess, 100);
          }
        } else {
          // 退出全屏
          console.log('请求退出全屏模式');
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
              console.log('解除屏幕方向锁定');
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
    
    // 更新全屏状态
    setIsFullscreen(!isFullscreen);
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