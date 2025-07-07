'use client';

import * as React from 'react';
import { useParticipants } from '@livekit/components-react';
import { Participant } from 'livekit-client';
import { 
  isHostOrAdmin, 
  isOnMic, 
  isRequestingMic, 
  isMuted 
} from '../lib/token-utils';

/**
 * VideoElementStyleController - 专门控制 lk-participant-media-video 元素样式的组件
 * 
 * 功能：
 * 1. 🎯 监听所有参与者的 attributes 变化
 * 2. 🎨 动态为 lk-participant-media-video 元素添加样式类
 * 3. 🔄 实时更新视频框边框和效果
 * 4. 📱 不影响其他功能，只控制视频元素样式
 */
export function VideoElementStyleController() {
  const participants = useParticipants();
  const [forceUpdate, setForceUpdate] = React.useState(0);

  // 🔄 监听所有参与者的 attributesChanged 事件
  React.useEffect(() => {
    const handleAttributesChanged = (participant: Participant) => {
      console.log(`🎨 参与者 ${participant.identity} 属性变化，更新视频样式`);
      setForceUpdate(prev => prev + 1);
      updateVideoElementStyles();
    };

    // 为所有参与者添加事件监听
    participants.forEach(participant => {
      participant.on('attributesChanged', () => handleAttributesChanged(participant));
    });

    // 初始化样式
    updateVideoElementStyles();

    // 清理函数
    return () => {
      participants.forEach(participant => {
        participant.off('attributesChanged', () => handleAttributesChanged(participant));
      });
    };
  }, [participants]);

  // 🎨 更新所有视频元素的样式
  const updateVideoElementStyles = React.useCallback(() => {
    // 获取所有 lk-participant-media-video 元素
    const videoElements = document.querySelectorAll('.lk-participant-media-video') as NodeListOf<HTMLVideoElement>;
    
    videoElements.forEach((videoElement) => {
      // 清除之前的样式类
      videoElement.classList.remove(
        'video-style-host',
        'video-style-on-mic', 
        'video-style-requesting',
        'video-style-muted',
        'video-style-member'
      );

      // 尝试找到对应的参与者
      const participant = findParticipantForVideoElement(videoElement);
      
      if (participant) {
        const attributes = participant.attributes || {};
        
        // 根据属性添加样式类
        if (isHostOrAdmin(attributes)) {
          videoElement.classList.add('video-style-host');
          console.log(`🎯 为主持人 ${participant.name} 添加样式`);
        } else {
          videoElement.classList.add('video-style-member');
        }
        
        if (isOnMic(attributes)) {
          videoElement.classList.add('video-style-on-mic');
          console.log(`🎤 为已上麦用户 ${participant.name} 添加样式`);
        } else if (isRequestingMic(attributes)) {
          videoElement.classList.add('video-style-requesting');
          console.log(`✋ 为申请中用户 ${participant.name} 添加样式`);
        }
        
        if (isMuted(attributes)) {
          videoElement.classList.add('video-style-muted');
          console.log(`🔇 为静音用户 ${participant.name} 添加样式`);
        }

        // 添加数据属性用于调试
        videoElement.setAttribute('data-participant-role', attributes.role || '1');
        videoElement.setAttribute('data-mic-status', attributes.mic_status || 'off_mic');
        videoElement.setAttribute('data-participant-name', participant.name || '');
      }
    });
  }, [participants]);

  // 🔍 根据视频元素找到对应的参与者
  const findParticipantForVideoElement = (videoElement: HTMLVideoElement): Participant | null => {
    // 方法1: 检查 data-lk-local-participant 属性
    if (videoElement.hasAttribute('data-lk-local-participant')) {
      // 这是本地参与者的视频
      return participants.find(p => p.isLocal) || null;
    }

    // 方法2: 通过父元素查找参与者信息
    let parentElement = videoElement.parentElement;
    while (parentElement) {
      // 查找包含参与者信息的父元素
      const participantId = parentElement.getAttribute('data-lk-participant-id') || 
                           parentElement.getAttribute('data-participant-id');
      
      if (participantId) {
        return participants.find(p => p.identity === participantId) || null;
      }
      
      parentElement = parentElement.parentElement;
    }

    // 方法3: 简化匹配 - 如果没有找到特定的参与者，返回第一个参与者作为后备
    if (participants.length > 0) {
      // 优先返回本地参与者
      const localParticipant = participants.find(p => p.isLocal);
      if (localParticipant) {
        return localParticipant;
      }
      // 否则返回第一个远程参与者
      return participants[0];
    }

    return null;
  };

  // 🔄 定期检查和更新（防止遗漏）
  React.useEffect(() => {
    const interval = setInterval(() => {
      updateVideoElementStyles();
    }, 2000); // 每2秒检查一次

    return () => clearInterval(interval);
  }, [updateVideoElementStyles]);

  // 这个组件不渲染任何UI，只负责样式控制
  return null;
}

// 🎨 CSS 样式注入组件
export function VideoElementStyles() {
  React.useEffect(() => {
    // 动态注入样式到页面
    const styleId = 'video-element-styles';
    
    // 检查是否已经注入过样式
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 🎯 基于 participant.attributes 的视频元素样式 */
      
      /* 基础视频元素样式 */
      .lk-participant-media-video {
        transition: all 0.3s ease;
        border-radius: 8px;
      }
      
      /* 主持人样式 - 橙色边框 */
      .lk-participant-media-video.video-style-host {
        border: 3px solid #ff6b35 !important;
        box-shadow: 0 0 15px rgba(255, 107, 53, 0.4) !important;
      }
      
      /* 已上麦样式 - 绿色边框 */
      .lk-participant-media-video.video-style-on-mic {
        border: 3px solid #4CAF50 !important;
        box-shadow: 0 0 15px rgba(76, 175, 80, 0.4) !important;
      }
      
      /* 申请中样式 - 黄色边框 + 动画 */
      .lk-participant-media-video.video-style-requesting {
        border: 3px solid #FFC107 !important;
        box-shadow: 0 0 15px rgba(255, 193, 7, 0.4) !important;
        animation: requestingPulse 2s infinite !important;
      }
      
      @keyframes requestingPulse {
        0%, 100% { 
          border-color: #FFC107;
          box-shadow: 0 0 15px rgba(255, 193, 7, 0.4);
        }
        50% { 
          border-color: #FFD54F;
          box-shadow: 0 0 25px rgba(255, 193, 7, 0.6);
        }
      }
      
      /* 静音样式 - 红色边框 + 半透明 */
      .lk-participant-media-video.video-style-muted {
        border: 2px solid #f44336 !important;
        box-shadow: 0 0 10px rgba(244, 67, 54, 0.4) !important;
        opacity: 0.7 !important;
        filter: grayscale(0.2) !important;
      }
      
      /* 普通成员样式 - 灰色边框 */
      .lk-participant-media-video.video-style-member {
        border: 1px solid #666 !important;
      }
      
      /* 组合样式 - 主持人 + 已上麦 */
      .lk-participant-media-video.video-style-host.video-style-on-mic {
        border: 3px solid #ff6b35 !important;
        box-shadow: 0 0 20px rgba(255, 107, 53, 0.6) !important;
      }
      
      /* 组合样式 - 主持人 + 静音 */
      .lk-participant-media-video.video-style-host.video-style-muted {
        border: 3px solid #ff6b35 !important;
        box-shadow: 0 0 15px rgba(255, 107, 53, 0.4) !important;
        opacity: 0.8 !important;
      }
      
      /* 悬停效果 */
      .lk-participant-media-video:hover {
        transform: scale(1.02);
      }
      
      /* 调试模式 - 显示参与者信息 */
      .lk-participant-media-video[data-participant-name]:after {
        content: attr(data-participant-name) " (" attr(data-mic-status) ")";
        position: absolute;
        bottom: 5px;
        left: 5px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 5px;
        font-size: 10px;
        border-radius: 3px;
        pointer-events: none;
        z-index: 10;
      }
    `;
    
    document.head.appendChild(style);
    
    console.log('🎨 视频元素样式已注入');
    
    // 清理函数
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
}

// 🔧 调试组件 - 显示当前视频元素状态
export function VideoElementDebugInfo() {
  const [debugInfo, setDebugInfo] = React.useState<string>('');
  
  React.useEffect(() => {
    const updateDebugInfo = () => {
      const videoElements = document.querySelectorAll('.lk-participant-media-video');
      let info = `视频元素总数: ${videoElements.length}\n\n`;
      
      videoElements.forEach((element, index) => {
        const name = element.getAttribute('data-participant-name') || '未知';
        const role = element.getAttribute('data-participant-role') || '1';
        const micStatus = element.getAttribute('data-mic-status') || 'off_mic';
        const isLocal = element.hasAttribute('data-lk-local-participant');
        const classes = Array.from(element.classList).filter(c => c.startsWith('video-style-'));
        
        info += `视频${index + 1}: ${name}\n`;
        info += `  - 角色: ${role === '2' ? '主持人' : role === '3' ? '管理员' : '学生'}\n`;
        info += `  - 麦位: ${micStatus}\n`;
        info += `  - 本地: ${isLocal ? '是' : '否'}\n`;
        info += `  - 样式类: ${classes.join(', ') || '无'}\n\n`;
      });
      
      setDebugInfo(info);
    };
    
    // 初始更新
    updateDebugInfo();
    
    // 定期更新
    const interval = setInterval(updateDebugInfo, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
      maxWidth: '300px',
      maxHeight: '400px',
      overflow: 'auto',
      zIndex: 9999
    }}>
      <strong>🎥 视频元素调试信息</strong>
      <br />
      {debugInfo}
    </div>
  );
} 