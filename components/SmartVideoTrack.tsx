'use client';

import * as React from 'react';
import { VideoTrack } from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';

interface SmartVideoTrackProps {
  participant?: Participant;
  trackRef?: any;
  // 传递给 VideoTrack 的其他属性
  [key: string]: any;
}

/**
 * SmartVideoTrack - 智能视频轨道组件
 * 自动检测视频流状态，无视频流时自动隐藏
 * 
 * 使用方式：
 * 1. 在有上下文的地方：组件会自动检测并隐藏无视频流的元素
 * 2. 在没有上下文的地方：直接渲染 VideoTrack，保持原有行为
 */
export function SmartVideoTrack({ participant, trackRef, ...props }: SmartVideoTrackProps) {
  const [hasVideoStream, setHasVideoStream] = React.useState(true); // 默认显示
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    // 如果没有提供参与者信息，直接显示 VideoTrack
    if (!participant && !trackRef) {
      setHasVideoStream(true);
      setIsLoading(false);
      return;
    }

    const currentParticipant = participant || trackRef?.participant;
    
    if (!currentParticipant) {
      setHasVideoStream(true);
      setIsLoading(false);
      return;
    }

    // 开始检测视频流
    setIsLoading(true);
    
    // 检查视频流状态的函数
    const checkVideoStream = () => {
      // 检查是否有视频轨道
      const videoTrack = currentParticipant.getTrackPublication(Track.Source.Camera);
      const hasVideo = !!(
        videoTrack && 
        videoTrack.track &&
        !videoTrack.isMuted && 
        currentParticipant.isCameraEnabled
      );
      
      console.log(`🎥 视频流状态检查 - ${currentParticipant.identity}:`, {
        hasVideoTrack: !!videoTrack,
        hasTrackObject: !!videoTrack?.track,
        isMuted: videoTrack?.isMuted,
        isCameraEnabled: currentParticipant.isCameraEnabled,
        结果: hasVideo ? '✅ 有视频流' : '❌ 无视频流'
      });
      
      setHasVideoStream(hasVideo);
      setIsLoading(false);
    };

    // 初始检查
    checkVideoStream();

    // 监听轨道订阅事件
    const handleTrackSubscribed = (track: any) => {
      if (track.source === Track.Source.Camera) {
        console.log(`📹 视频轨道已订阅 - ${currentParticipant.identity}`);
        checkVideoStream();
      }
    };

    // 监听轨道取消订阅事件
    const handleTrackUnsubscribed = (track: any) => {
      if (track.source === Track.Source.Camera) {
        console.log(`📹 视频轨道已取消订阅 - ${currentParticipant.identity}`);
        checkVideoStream();
      }
    };

    // 监听轨道静音事件
    const handleTrackMuted = (publication: any) => {
      if (publication.source === Track.Source.Camera) {
        console.log(`🔇 视频轨道已静音 - ${currentParticipant.identity}`);
        setHasVideoStream(false);
      }
    };

    // 监听轨道取消静音事件
    const handleTrackUnmuted = (publication: any) => {
      if (publication.source === Track.Source.Camera) {
        console.log(`🔊 视频轨道已取消静音 - ${currentParticipant.identity}`);
        checkVideoStream();
      }
    };

    // 监听轨道发布状态变化
    const handleTrackPublished = (publication: any) => {
      if (publication.source === Track.Source.Camera) {
        console.log(`📷 摄像头轨道已发布 - ${currentParticipant.identity}`);
        checkVideoStream();
      }
    };

    // 添加事件监听器
    currentParticipant.on('trackSubscribed', handleTrackSubscribed);
    currentParticipant.on('trackUnsubscribed', handleTrackUnsubscribed);
    currentParticipant.on('trackMuted', handleTrackMuted);
    currentParticipant.on('trackUnmuted', handleTrackUnmuted);
    currentParticipant.on('localTrackPublished', handleTrackPublished);
    currentParticipant.on('localTrackUnpublished', handleTrackUnsubscribed);
    currentParticipant.on('trackPublished', handleTrackPublished);

    // 清理函数
    return () => {
      currentParticipant.off('trackSubscribed', handleTrackSubscribed);
      currentParticipant.off('trackUnsubscribed', handleTrackUnsubscribed);
      currentParticipant.off('trackMuted', handleTrackMuted);
      currentParticipant.off('trackUnmuted', handleTrackUnmuted);
      currentParticipant.off('localTrackPublished', handleTrackPublished);
      currentParticipant.off('localTrackUnpublished', handleTrackUnsubscribed);
      currentParticipant.off('trackPublished', handleTrackPublished);
    };
  }, [participant, trackRef]);

  // 如果正在加载，显示占位符
  if (isLoading) {
    return (
      <div style={{ 
        display: 'none' // 加载时也隐藏，避免闪烁
      }} />
    );
  }

  // 如果没有视频流，隐藏组件
  if (!hasVideoStream) {
    return null; // 返回 null 完全不渲染
  }

  // 有视频流时，渲染原始的 VideoTrack 组件
  return <VideoTrack {...props} />;
}

// 导出一个包装组件，用于在有上下文的环境中使用
export function SmartVideoTrackWithContext(props: any) {
  // 这个组件需要在正确的上下文中使用
  // 暂时先直接返回 VideoTrack，避免错误
  return <VideoTrack {...props} />;
}

// 导出一个便捷的 Hook，用于在其他组件中检测视频流状态
export function useVideoStreamDetection(participant?: Participant) {
  const [hasVideoStream, setHasVideoStream] = React.useState(false);

  React.useEffect(() => {
    if (!participant) {
      setHasVideoStream(false);
      return;
    }

    const checkVideoStream = () => {
      const videoTrack = participant.getTrackPublication(Track.Source.Camera);
      const hasVideo = !!(
        videoTrack && 
        videoTrack.track &&
        !videoTrack.isMuted && 
        participant.isCameraEnabled
      );
      setHasVideoStream(hasVideo);
    };

    // 初始检查
    checkVideoStream();

    // 监听事件
    const handleUpdate = () => checkVideoStream();
    
    participant.on('trackSubscribed', handleUpdate);
    participant.on('trackUnsubscribed', handleUpdate);
    participant.on('trackMuted', handleUpdate);
    participant.on('trackUnmuted', handleUpdate);
    participant.on('localTrackPublished', handleUpdate);
    participant.on('localTrackUnpublished', handleUpdate);
    participant.on('trackPublished', handleUpdate);

    return () => {
      participant.off('trackSubscribed', handleUpdate);
      participant.off('trackUnsubscribed', handleUpdate);
      participant.off('trackMuted', handleUpdate);
      participant.off('trackUnmuted', handleUpdate);
      participant.off('localTrackPublished', handleUpdate);
      participant.off('localTrackUnpublished', handleUpdate);
      participant.off('trackPublished', handleUpdate);
    };
  }, [participant]);

  return hasVideoStream;
} 