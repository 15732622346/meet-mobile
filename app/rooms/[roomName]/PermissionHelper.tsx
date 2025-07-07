'use client';

import React from 'react';

interface PermissionHelperProps {
  onPermissionGranted: () => void;
  onPermissionDenied: (error: string) => void;
}

export function PermissionHelper({ onPermissionGranted, onPermissionDenied }: PermissionHelperProps) {
  const [checking, setChecking] = React.useState(true); // 默认开始检查
  const [success, setSuccess] = React.useState(false); // 权限获取成功状态
  const [permissionStatus, setPermissionStatus] = React.useState<{
    camera: PermissionState | 'unknown';
    microphone: PermissionState | 'unknown';
  }>({
    camera: 'unknown',
    microphone: 'unknown'
  });

  const checkPermissions = async () => {
    setChecking(true);
    try {
      // 检查权限状态
      if ('permissions' in navigator) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          setPermissionStatus({
            camera: cameraPermission.state,
            microphone: microphonePermission.state
          });

          // 如果权限已经被授予，直接通过
          if (cameraPermission.state === 'granted' && microphonePermission.state === 'granted') {
            setSuccess(true);
            setTimeout(() => {
              onPermissionGranted();
            }, 1000);
            return;
          }
        } catch (err) {
          // 权限查询失败，继续尝试获取权限
        }
      }

      // 尝试获取媒体设备访问权限
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        // 立即停止流，我们只是在测试权限
        stream.getTracks().forEach(track => track.stop());
        setSuccess(true);
        // 添加一个短暂的延迟，让用户看到成功状态
        setTimeout(() => {
          onPermissionGranted();
        }, 1000);
      } catch (error: any) {
        console.error('媒体权限获取失败:', error);
        
        let errorMessage = '无法访问摄像头和麦克风';
        
        if (error.name === 'NotAllowedError') {
          errorMessage = '您拒绝了摄像头和麦克风的访问权限。可以选择跳过以仅音频模式加入会议。';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '未找到摄像头或麦克风设备。将以仅音频模式加入会议。';
        } else if (error.name === 'NotReadableError') {
          errorMessage = '摄像头或麦克风被其他应用程序占用。可以选择跳过以仅音频模式加入。';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = '设备不支持请求的约束条件。将以兼容模式加入会议。';
        } else if (error.name === 'SecurityError') {
          errorMessage = '安全限制：请确保网站使用 HTTPS 连接。';
        }
        
        onPermissionDenied(errorMessage);
      }
    } finally {
      setChecking(false);
    }
  };

  const skipPermissions = () => {
    onPermissionGranted();
  };

  // 组件挂载时自动检查权限
  React.useEffect(() => {
    checkPermissions();
  }, []);

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ 
        display: 'grid', 
        placeItems: 'center', 
        height: '100%',
        background: '#1a1a1a',
        color: 'white'
      }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        width: '400px',
        textAlign: 'center'
      }}>
                 <h2 style={{ margin: 0 }}>
           {success ? '权限获取成功！' : checking ? '正在检查设备权限...' : '设备权限检查'}
         </h2>
         
         <p style={{ color: '#ccc', lineHeight: '1.5' }}>
           {success ? (
             '已成功获取摄像头和麦克风权限，正在进入会议...'
           ) : checking ? (
             '正在获取摄像头和麦克风的访问权限，请在浏览器弹窗中点击"允许"。'
           ) : (
             <>
               为了获得最佳的会议体验，请允许访问您的摄像头和麦克风。
               {location.protocol !== 'https:' && (
                 <><br/><span style={{ color: '#ff6b6b' }}>
                   注意：当前使用的是 HTTP 连接，某些浏览器可能限制媒体设备访问。
                 </span></>
               )}
             </>
           )}
         </p>

        {permissionStatus.camera !== 'unknown' && (
          <div style={{ 
            background: '#2a2a2a', 
            padding: '15px', 
            borderRadius: '8px',
            textAlign: 'left'
          }}>
            <div>摄像头权限: <span style={{ 
              color: permissionStatus.camera === 'granted' ? '#4ade80' : '#ef4444' 
            }}>
              {permissionStatus.camera === 'granted' ? '已允许' : 
               permissionStatus.camera === 'denied' ? '已拒绝' : '待确认'}
            </span></div>
            <div>麦克风权限: <span style={{ 
              color: permissionStatus.microphone === 'granted' ? '#4ade80' : '#ef4444' 
            }}>
              {permissionStatus.microphone === 'granted' ? '已允许' : 
               permissionStatus.microphone === 'denied' ? '已拒绝' : '待确认'}
            </span></div>
          </div>
        )}

                 {success ? (
           <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
             <div style={{
               width: '20px',
               height: '20px',
               backgroundColor: '#4ade80',
               borderRadius: '50%',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               color: 'white',
               fontSize: '12px'
             }}>✓</div>
             <span style={{ color: '#4ade80' }}>权限获取成功，正在进入会议...</span>
           </div>
         ) : checking ? (
           <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
             <div style={{
               width: '20px',
               height: '20px',
               border: '2px solid #4ade80',
               borderTop: '2px solid transparent',
               borderRadius: '50%',
               animation: 'spin 1s linear infinite'
             }}></div>
             <span>正在获取权限...</span>
           </div>
         ) : (
           <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
             <button 
               className="lk-button"
               onClick={checkPermissions}
               style={{ 
                 padding: '12px 24px',
                 backgroundColor: '#4ade80',
                 border: 'none',
                 borderRadius: '6px',
                 color: 'white',
                 cursor: 'pointer'
               }}
             >
               重新检查权限
             </button>
             
             <button 
               className="lk-button"
               onClick={skipPermissions}
               style={{ 
                 padding: '12px 24px',
                 backgroundColor: '#6b7280',
                 border: 'none',
                 borderRadius: '6px',
                 color: 'white',
                 cursor: 'pointer'
               }}
             >
               跳过（仅音频）
             </button>
           </div>
         )}

        <div style={{ fontSize: '14px', color: '#888' }}>
          <p>如果权限被拒绝，请：</p>
          <ol style={{ textAlign: 'left', paddingLeft: '20px' }}>
            <li>点击地址栏左侧的锁图标</li>
            <li>将摄像头和麦克风设置为"允许"</li>
            <li>刷新页面重试</li>
          </ol>
        </div>
      </div>
    </div>
    </>
  );
} 