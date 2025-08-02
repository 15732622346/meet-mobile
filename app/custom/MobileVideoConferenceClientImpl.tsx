'use client';

import { RoomContext } from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  LogLevel,
  Room,
  RoomConnectOptions,
  RoomOptions,
  VideoPresets,
  type VideoCodec,
} from 'livekit-client';
import { DebugMode } from '@/lib/Debug';
import { useEffect, useMemo, useState } from 'react';
import { useSetupE2EE } from '@/lib/useSetupE2EE';
import { isVideoCodec } from '@/lib/types';
import { SimpleMobileVideoConference } from '@/components/SimpleMobileVideoConference';

export function MobileVideoConferenceClientImpl() {
  const [liveKitUrl, setLiveKitUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [codec, setCodec] = useState<VideoCodec | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [userRole, setUserRole] = useState<number>(1); // 默认为普通用户
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<number>(0);

  // 在客户端获取 URL 参数
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlParam = searchParams.get('liveKitUrl');
      const tokenParam = searchParams.get('token');
      const codecParam = searchParams.get('codec');
      const roleParam = searchParams.get('role');
      const nameParam = searchParams.get('name');
      const idParam = searchParams.get('id');

      if (urlParam) setLiveKitUrl(urlParam);
      if (tokenParam) setToken(tokenParam);
      if (codecParam && isVideoCodec(codecParam)) setCodec(codecParam);
      if (roleParam) setUserRole(parseInt(roleParam, 10));
      if (nameParam) setUserName(nameParam);
      if (idParam) setUserId(parseInt(idParam, 10));
      
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>正在加载会议...</p>
      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background-color: #111;
          color: white;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          margin-bottom: 20px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>;
  }

  if (!liveKitUrl) {
    return <h2>缺少 LiveKit URL</h2>;
  }
  if (!token) {
    return <h2>缺少 LiveKit token</h2>;
  }

  return <MobileVideoConferenceClientImplInner 
    liveKitUrl={liveKitUrl} 
    token={token} 
    codec={codec} 
    userRole={userRole}
    userName={userName}
    userId={userId}
  />;
}

function MobileVideoConferenceClientImplInner(props: {
  liveKitUrl: string;
  token: string;
  codec: VideoCodec | undefined;
  userRole: number;
  userName: string;
  userId: number;
}) {
  const keyProvider = new ExternalE2EEKeyProvider();
  const { worker, e2eePassphrase } = useSetupE2EE();
  const e2eeEnabled = !!(e2eePassphrase && worker);

  const [e2eeSetupComplete, setE2eeSetupComplete] = useState(false);

  const roomOptions = useMemo((): RoomOptions => {
    return {
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
        red: !e2eeEnabled,
        videoCodec: props.codec,
      },
      adaptiveStream: { pixelDensity: 'screen' },
      dynacast: true,
      e2ee: e2eeEnabled
        ? {
            keyProvider,
            worker,
          }
        : undefined,
    };
  }, [e2eeEnabled, props.codec, keyProvider, worker]);

  const room = useMemo(() => new Room(roomOptions), [roomOptions]);

  const connectOptions = useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  useEffect(() => {
    if (e2eeEnabled) {
      keyProvider.setKey(e2eePassphrase).then(() => {
        room.setE2EEEnabled(true).then(() => {
          setE2eeSetupComplete(true);
        });
      });
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, e2eePassphrase, keyProvider, room, setE2eeSetupComplete]);

  useEffect(() => {
    if (e2eeSetupComplete) {
      room.connect(props.liveKitUrl, props.token, connectOptions).catch((error) => {
        console.error(error);
      });
      room.localParticipant.enableCameraAndMicrophone().catch((error) => {
        console.error(error);
      });
    }
  }, [room, props.liveKitUrl, props.token, connectOptions, e2eeSetupComplete]);

  return (
    <div className="lk-room-container mobile-room-container">
      <RoomContext.Provider value={room}>
        <SimpleMobileVideoConference 
          userRole={props.userRole}
          userName={props.userName}
          userId={props.userId}
          maxMicSlots={5}
          userToken={props.token}
        />
        <DebugMode logLevel={LogLevel.debug} />
      </RoomContext.Provider>
      <style jsx>{`
        .mobile-room-container {
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background-color: #111;
        }
      `}</style>
    </div>
  );
} 