'use client';

import React from 'react';

// 添加 crypto.randomUUID polyfill
if (typeof window !== 'undefined' && !window.crypto?.randomUUID) {
  if (!window.crypto) {
    // @ts-ignore
    window.crypto = {};
  }
  
  // @ts-ignore
  window.crypto.randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// 移动端控制台标识
if (typeof window !== 'undefined') {
  console.log('-------------------------------------');
  console.log('移动端应用加载成功！房间页面正在初始化...');
  console.log('版本：2025.07.06');
  console.log('-------------------------------------');
}

import { decodePassphrase, isLowPowerDevice } from '@/lib/client-utils';
import { DebugMode } from '@/lib/Debug';
import { KeyboardShortcuts } from '@/lib/KeyboardShortcuts';
import { RecordingIndicator } from '@/lib/RecordingIndicator';
import { SettingsMenu } from '@/lib/SettingsMenu';
import { ConnectionDetails } from '@/lib/types';
import { SimpleMobileVideoConference } from '../../../components/SimpleMobileVideoConference';
import {
  formatChatMessageLinks,
  LocalUserChoices,
  PreJoin,
  RoomContext,
  VideoConference,
} from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  DisconnectReason,
  RoomConnectOptions,
  RoomEvent,
  TrackPublishDefaults,
  VideoCaptureOptions,
} from 'livekit-client';
import { useRouter, usePathname } from 'next/navigation';
import { useSetupE2EE } from '@/lib/useSetupE2EE';
import { MobileVideoConference } from '../../../components/MobileVideoConference';
import { PermissionHelper } from './PermissionHelper';
import { UserAuthForm } from './UserAuthForm';
import { ErrorToast } from '../../../components/ErrorToast';
import { API_CONFIG } from '@/lib/config';

// const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == 'true';
const SHOW_SETTINGS_MENU = true; // 强制启用设置菜单功能

// 移动端专用版本
const IS_MOBILE_VERSION = true;

export function PageClientImpl() {
  const [roomName, setRoomName] = React.useState<string>('');
  const [region, setRegion] = React.useState<string | undefined>(undefined);
  const [hq, setHq] = React.useState<boolean>(false);
  const [codec, setCodec] = React.useState<VideoCodec>('vp9');
  const [isReady, setIsReady] = React.useState(false);

  // 在客户端获取 URL 参数
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      
      // 从路径中提取房间名
      const pathParts = pathname.split('/');
      const roomNameFromPath = pathParts[pathParts.length - 1];
      if (roomNameFromPath) setRoomName(decodeURIComponent(roomNameFromPath));
      
      // 从查询参数中获取其他参数
      const regionParam = searchParams.get('region');
      const hqParam = searchParams.get('hq');
      const codecParam = searchParams.get('codec');
      
      if (regionParam) setRegion(regionParam);
      if (hqParam === 'true') setHq(true);
      if (codecParam && ['vp8', 'h264', 'vp9', 'av1'].includes(codecParam)) {
        setCodec(codecParam as VideoCodec);
      }
      
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <div>Loading...</div>;
  }

  return <PageClientImplInner roomName={roomName} region={region} hq={hq} codec={codec} />;
}

function PageClientImplInner(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  // 为避免服务端渲染与客户端首次渲染不一致，先假设不支持，挂载后再检测。
  const [mediaSupported, setMediaSupported] = React.useState(false);
  React.useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setMediaSupported(ok);
  }, []);
  const preJoinDefaults = React.useMemo(() => {
    return {
      username: '',
      videoEnabled: mediaSupported,
      audioEnabled: mediaSupported,
    };
  }, [mediaSupported]);
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(
    undefined,
  );
  const [askInvite, setAskInvite] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState('');
  const [showPermissionHelper, setShowPermissionHelper] = React.useState(false);
  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const [showUserAuth, setShowUserAuth] = React.useState(true); // 默认显示用户认证界面
  const [userRole, setUserRole] = React.useState<number | undefined>(undefined);
  const [userName, setUserName] = React.useState<string | undefined>(undefined);
  const [userId, setUserId] = React.useState<number | undefined>(undefined);
  // 移除调试代码，避免误导用户

  const handlePreJoinSubmit = React.useCallback(async (values: LocalUserChoices) => {
    setPreJoinChoices(values);
    setAskInvite(true);
  }, []);
  
  const handlePreJoinError = React.useCallback((e: any) => console.error(e), []);

  const handlePermissionGranted = React.useCallback(() => {
    setShowPermissionHelper(false);
    setPermissionError(null);
  }, []);

  const handlePermissionDenied = React.useCallback((error: string) => {
    setPermissionError(error);
    // 即使权限被拒绝，也允许用户继续，但会以音频模式加入
    // 不再自动隐藏，让用户手动点击确定按钮
    setShowPermissionHelper(false);
  }, []);

  const handleLoginSuccess = React.useCallback((userData: {
    id: number;
    username: string;
    nickname: string;
    token: string;
    user_roles: number;
    ws_url?: string;
  }) => {
    // 登录成功，设置用户选择和连接详情，不设置任何设备ID
    const choices: LocalUserChoices = {
      username: userData.nickname,
      videoEnabled: false,
      audioEnabled: false,
    } as LocalUserChoices;

    // 优先使用后端返回的 LiveKit URL，只有在无效时才使用前端配置
    let serverUrl = userData.ws_url || API_CONFIG.LIVEKIT.URL;
    
    // 验证后端返回的 URL 是否为有效的生产环境地址
    const isValidProductionUrl = userData.ws_url && (
      userData.ws_url.startsWith('wss://') || 
      userData.ws_url.startsWith('ws://') && !userData.ws_url.includes('localhost')
    );
    
    // 在开发环境或者后端返回的是 localhost 时，使用前端配置
    if (!isValidProductionUrl && userData.ws_url?.includes('localhost')) {
      serverUrl = API_CONFIG.LIVEKIT.URL;
      console.warn('后端返回的是开发环境URL，使用前端配置:', serverUrl);
    }

    const conn: ConnectionDetails = {
      serverUrl: serverUrl,
      roomName: props.roomName,
      participantName: userData.nickname,
      participantToken: userData.token,
    };

    console.log('【登录调试】设置用户信息:', {
      nickname: userData.nickname,
      role: userData.user_roles
    });

    setPreJoinChoices(choices);
    setConnectionDetails(conn);
    setUserRole(userData.user_roles);
    setUserName(userData.nickname);
    setUserId(userData.id);
    setShowUserAuth(false);
    setShowPermissionHelper(true);
  }, [props.roomName]);

  const handleGuestMode = React.useCallback(() => {
    // 为游客模式生成随机昵称，避免"缺少用户信息"校验
    const randomName = 'guest_' + Math.random().toString(36).slice(2, 6);
    const guestChoices: LocalUserChoices = {
      username: randomName,
      videoEnabled: false,
      audioEnabled: false,
    } as LocalUserChoices;

    // 保存到状态，后续邀请码验证可直接使用
    setPreJoinChoices(guestChoices);

    setShowUserAuth(false);
    setAskInvite(true);
  }, []);



  const InviteCodeForm = React.useCallback(() => {
    const [loading, setLoading] = React.useState(false);
    
    const handleSubmit = async () => {
      if (!inviteCode.trim()) {
        alert('请输入邀请码');
        return;
      }
      if (!preJoinChoices) {
        alert('缺少用户信息');
        return;
      }
      
      setLoading(true);
      try {

        
        const response = await fetch(`${API_CONFIG.BASE_URL}/join-room.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_id: props.roomName,
            invite_code: inviteCode,
            username: preJoinChoices.username,
          }),
        });


        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('错误响应:', errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || '连接失败');
          } catch {
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
        }

         const data = await response.json();
         
         // 确保用户选择包含正确的设备设置，移除所有设备ID
         const updatedChoices: LocalUserChoices = {
           username: preJoinChoices.username,
           // 默认关闭音视频，避免设备访问问题
           videoEnabled: false,
           audioEnabled: false,
         } as LocalUserChoices;
         setPreJoinChoices(updatedChoices);
         
         // 优先使用后端返回的 LiveKit URL，只有在无效时才使用前端配置
         let serverUrl = data.ws_url || API_CONFIG.LIVEKIT.URL;
         
         // 验证后端返回的 URL 是否为有效的生产环境地址
         const isValidProductionUrl = data.ws_url && (
           data.ws_url.startsWith('wss://') || 
           data.ws_url.startsWith('ws://') && !data.ws_url.includes('localhost')
         );
         
         // 在开发环境或者后端返回的是 localhost 时，使用前端配置
         if (!isValidProductionUrl && data.ws_url?.includes('localhost')) {
           serverUrl = API_CONFIG.LIVEKIT.URL;
           console.warn('后端返回的是开发环境URL，使用前端配置:', serverUrl);
         }
         

         
         const conn: ConnectionDetails = {
           serverUrl: serverUrl,
           roomName: props.roomName,
           participantName: preJoinChoices.username,
           participantToken: data.token,
         };
         
         console.log('游客模式连接信息:', {
           serverUrl,
           roomName: props.roomName,
           participantName: preJoinChoices.username,
           tokenLength: data.token?.length,
           tokenPrefix: data.token?.substring(0, 50) + '...'
         });
         
         setConnectionDetails(conn);
         // 🎯 新增：设置游客角色为0
         setUserRole(0);
         setUserName(preJoinChoices.username);
         setUserId(undefined);
         // 显示权限检查界面
         setShowPermissionHelper(true);
      } catch (err) {
        const errorMessage = (err as Error).message;
        alert('邀请码验证失败: ' + errorMessage);
        console.error('连接错误:', err);
      } finally {
        setLoading(false);
      }
    };
    
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '280px' }}>
          <h3 style={{ textAlign: 'center', margin: 0, color: 'white' }}>请输入邀请码</h3>
          <input
            className="lk-button"
            placeholder="邀请码"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            style={{ padding: '8px' }}
            disabled={loading}
            autoFocus
          />
          <button 
            className="lk-button" 
            onClick={handleSubmit}
            disabled={loading || !inviteCode.trim()}
            style={{ opacity: (loading || !inviteCode.trim()) ? 0.6 : 1 }}
          >
            {loading ? '验证中...' : '验证邀请码'}
          </button>
          <button 
            className="lk-button" 
            onClick={() => {
              setAskInvite(false);
              setShowUserAuth(true);
            }}
            style={{ backgroundColor: '#666' }}
            disabled={loading}
          >
            返回登录
          </button>
        </div>
      </div>
    );
  }, [inviteCode, props.roomName, preJoinChoices]);

  const SimpleJoinForm = () => {
    const [username, setUsername] = React.useState('');
    const [invite, setInvite] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleJoin = async () => {
      if (!username || !invite) {
        alert('请输入昵称和邀请码');
        return;
      }
      
      setLoading(true);
      try {
        // 使用统一的后端接口
        const response = await fetch(`${API_CONFIG.BASE_URL}/join-room.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_id: props.roomName,
            invite_code: invite,
            username: username,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '连接失败');
        }

        const data = await response.json();
        const choices: LocalUserChoices = {
          username,
          videoEnabled: false,
          audioEnabled: false,
        } as any;
        // 确保不设置设备ID，让LiveKit自动选择默认设备
        delete (choices as any).videoDeviceId;
        delete (choices as any).audioDeviceId;
        
        // 优先使用后端返回的 LiveKit URL，只有在无效时才使用前端配置
        let serverUrl = data.ws_url || API_CONFIG.LIVEKIT.URL;
        
        // 验证后端返回的 URL 是否为有效的生产环境地址
        const isValidProductionUrl = data.ws_url && (
          data.ws_url.startsWith('wss://') || 
          data.ws_url.startsWith('ws://') && !data.ws_url.includes('localhost')
        );
        
        // 在开发环境或者后端返回的是 localhost 时，使用前端配置
        if (!isValidProductionUrl && data.ws_url?.includes('localhost')) {
          serverUrl = API_CONFIG.LIVEKIT.URL;
          console.warn('后端返回的是开发环境URL，使用前端配置:', serverUrl);
        }
        

        
        const conn: ConnectionDetails = {
          serverUrl: serverUrl,
          roomName: props.roomName,
          participantName: username,
          participantToken: data.token,
        };
        
        setPreJoinChoices(choices);
        setConnectionDetails(conn);
        // 🎯 新增：设置游客角色为0
        setUserRole(0);
        setUserName(username);
        setUserId(undefined);
        // 显示权限检查界面
        setShowPermissionHelper(true);
      } catch (err) {
        alert('加入房间失败: ' + (err as Error).message);
        console.error('连接错误:', err);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '280px' }}>
          <input
            className="lk-button"
            placeholder="昵称"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '8px' }}
            disabled={loading}
          />
          <input
            className="lk-button"
            placeholder="邀请码"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            style={{ padding: '8px' }}
            disabled={loading}
          />
          <button 
            className="lk-button" 
            onClick={handleJoin}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '连接中...' : '进入房间'}
          </button>
        </div>
      </div>
    );
  };



  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      {showUserAuth ? (
        <UserAuthForm
          onLoginSuccess={handleLoginSuccess}
          onGuestMode={handleGuestMode}
          roomName={props.roomName}
        />
      ) : showPermissionHelper ? (
        <PermissionHelper
          onPermissionGranted={handlePermissionGranted}
          onPermissionDenied={handlePermissionDenied}
        />
      ) : connectionDetails && preJoinChoices ? (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{ codec: props.codec, hq: props.hq }}
          userRole={userRole}
          userName={userName}
          userId={userId}
        />
      ) : askInvite ? (
        <InviteCodeForm />
      ) : !mediaSupported ? (
        connectionDetails ? (
          <VideoConferenceComponent
            connectionDetails={connectionDetails}
            userChoices={preJoinChoices as LocalUserChoices}
            options={{ codec: props.codec, hq: props.hq }}
            userRole={userRole}
            userName={userName}
            userId={userId}
          />
        ) : (
          <SimpleJoinForm />
        )
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <PreJoin
            defaults={preJoinDefaults}
            onSubmit={handlePreJoinSubmit}
            onError={handlePreJoinError}
          />
        </div>
      )}
      
      <ErrorToast 
        message={permissionError}
        onClose={() => setPermissionError(null)}
        title="权限错误"
      />
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
  userRole?: number;
  userName?: string;
  userId?: number;
}) {
  const { userChoices, connectionDetails, options, userRole, userName, userId } = props;
  const [deviceError, setDeviceError] = React.useState<string | null>(null);
  const keyProvider = new ExternalE2EEKeyProvider();
  const { worker, e2eePassphrase } = useSetupE2EE();
  const e2eeEnabled = !!(e2eePassphrase && worker);

  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec ? props.options.codec : 'vp9';
    if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) {
      videoCodec = undefined;
    }
    const videoCaptureDefaults: VideoCaptureOptions = {
      // 只有在设备ID有效时才设置，否则让LiveKit自动选择默认设备
      ...(props.userChoices.videoDeviceId ? { deviceId: props.userChoices.videoDeviceId } : {}),
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };
    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: !e2eeEnabled,
      videoCodec,
    };
    if (isLowPowerDevice()) {
      // on lower end devices, publish at a lower resolution, and disable spatial layers
      // encoding spatial layers adds to CPU overhead
      videoCaptureDefaults.resolution = VideoPresets.h360;
      publishDefaults.simulcast = false;
      publishDefaults.scalabilityMode = 'L1T3';
    }
    return {
      videoCaptureDefaults: videoCaptureDefaults,
      publishDefaults: publishDefaults,
      audioCaptureDefaults: {
        // 只有在设备ID有效时才设置，否则让LiveKit自动选择默认设备
        ...(props.userChoices.audioDeviceId ? { deviceId: props.userChoices.audioDeviceId } : {}),
      },
      adaptiveStream: { pixelDensity: 'screen' },
      dynacast: true,
      e2ee: keyProvider && worker && e2eeEnabled ? { keyProvider, worker } : undefined,
    };
  }, [props.userChoices, props.options.hq, props.options.codec]);

  const room = React.useMemo(() => new Room(roomOptions), []);

  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              setDeviceError('您的浏览器不支持加密会议功能，请更新到最新版本后重试。');
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.EncryptionError, handleEncryptionError);
    room.on(RoomEvent.MediaDevicesError, handleError);
    
    if (e2eeSetupComplete) {
      room
        .connect(
          props.connectionDetails.serverUrl,
          props.connectionDetails.participantToken,
          connectOptions,
        )
        .then(() => {
          // 连接成功
        })
        .catch((error) => {
          console.error('连接LiveKit房间失败:', error);
          console.error('服务器URL:', props.connectionDetails.serverUrl);
          console.error('Token:', props.connectionDetails.participantToken);
          
          // 显示更友好的错误信息
          setDeviceError(`连接会议室失败: ${error.message}。请检查网络连接或联系管理员。`);
        });
      
      if (props.userChoices.videoEnabled) {
        room.localParticipant.setCameraEnabled(true).catch((error) => {
          handleError(error);
        });
      }
      if (props.userChoices.audioEnabled) {
        room.localParticipant.setMicrophoneEnabled(true).catch((error) => {
          handleError(error);
        });
      }
    }
    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.EncryptionError, handleEncryptionError);
      room.off(RoomEvent.MediaDevicesError, handleError);
    };
  }, [e2eeSetupComplete, room, props.connectionDetails, props.userChoices]);

  const router = useRouter();
  const pathname = usePathname();
  
  const handleOnLeave = React.useCallback(async (reason?: DisconnectReason) => {
    // 自动清除session，不再询问用户
    try {
      // 调用后端清除session接口
      const response = await fetch(`${API_CONFIG.BASE_URL}/clear-session.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: props.userId,
          user_name: props.userName
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Session cleared:', result);
      } else {
        console.warn('Failed to clear session:', response.status);
      }
    } catch (error) {
      console.error('Error clearing session:', error);
    }
    
    // 直接刷新页面回到房间登录页面
    window.location.reload();
  }, [props.userId, props.userName]);

  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    
    // 处理设备相关错误
    if (error.message.includes('device not found') || error.message.includes('Requested device not found')) {
      setDeviceError('未找到指定的音视频设备，但仍可进入会议。请检查您的摄像头和麦克风是否正常连接。');
      return;
    }
    
    if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
      setDeviceError('无法访问摄像头或麦克风，请允许浏览器访问您的设备权限。');
      return;
    }
    
    if (error.message.includes('NotFoundError')) {
      setDeviceError('未找到可用的摄像头或麦克风设备。');
      return;
    }
    
    // 其他错误
    setDeviceError(`遇到意外错误: ${error.message}`);
  }, []);

  const handleEncryptionError = React.useCallback((error: Error) => {
    console.error(error);
    setDeviceError(`加密错误: ${error.message}，请检查控制台了解详细信息。`);
  }, []);

  // 移动版使用SimpleMobileVideoConference，简化屏幕共享显示逻辑
  if (IS_MOBILE_VERSION) {
    return (
      <div className="lk-room-container">
        <RoomContext.Provider value={room}>
          <SimpleMobileVideoConference
            userRole={userRole}
            userName={userName}
            userId={userId}
            maxMicSlots={5} // 设置默认最大麦位数
          />
          {deviceError && <ErrorToast message={deviceError} onClose={() => setDeviceError(null)} />}
        </RoomContext.Provider>
        
        {/* 添加调试信息 - 仅在开发环境显示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mobile-debug-panel">
            <div>用户: {userName} (ID: {userId})</div>
            <div>角色: {userRole}</div>
            <div>连接: {connectionDetails.serverUrl}</div>
            <div>房间: {connectionDetails.roomName}</div>
            <div>E2EE: {e2eeEnabled ? '开启' : '关闭'}</div>
          </div>
        )}
        
        <style jsx>{`
          .lk-room-container {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
          }
          
          .mobile-debug-panel {
            position: fixed;
            bottom: 0;
            left: 0;
            background: rgba(0,0,0,0.7);
            color: #00ff00;
            font-size: 10px;
            padding: 5px;
            z-index: 1000;
            max-width: 100%;
            overflow: hidden;
          }
        `}</style>
      </div>
    );
  }

  // PC版使用标准VideoConference
  return (
    <div className="lk-room-container">
      <RoomContext.Provider value={room}>
        <VideoConference chatMessageFormatter={formatChatMessageLinks}>
          {SHOW_SETTINGS_MENU && <SettingsMenu />}
          <RecordingIndicator />
          <KeyboardShortcuts />
          <DebugMode />
        </VideoConference>
        {deviceError && <ErrorToast message={deviceError} onClose={() => setDeviceError(null)} />}
      </RoomContext.Provider>
    </div>
  );
}
