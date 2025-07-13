'use client';

import * as React from 'react';
import { ParticipantTile } from '@livekit/components-react';

// 视频显示状态枚举
enum VideoDisplayState {
  NORMAL = 'normal',
  MINIMIZED = 'minimized'
}

interface DraggableVideoTileProps {
  track: any;
  initialPosition?: { x: number; y: number };
  width?: number;
  height?: number;
}

export function DraggableVideoTile({ 
  track, 
  initialPosition = { x: 100, y: 100 },
  width = 120,
  height = 120
}: DraggableVideoTileProps) {
  const [position, setPosition] = React.useState(initialPosition);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const tileRef = React.useRef<HTMLDivElement>(null);
  const [displayState, setDisplayState] = React.useState<VideoDisplayState>(VideoDisplayState.NORMAL);

  // 拖拽开始
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (!tileRef.current) return;
    
    const rect = tileRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
  }, []);

  // 拖拽移动
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // 边界检查
    newX = Math.max(0, Math.min(newX, windowWidth - width));
    newY = Math.max(0, Math.min(newY, windowHeight - height));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset, width, height]);

  // 拖拽结束
  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // 处理最小化
  const handleMinimize = React.useCallback(() => {
    console.log('最小化视频窗口');
    setDisplayState(VideoDisplayState.MINIMIZED);
  }, []);

  // 处理恢复
  const handleRestore = React.useCallback(() => {
    console.log('恢复视频窗口');
    setDisplayState(VideoDisplayState.NORMAL);
  }, []);

  // 全局鼠标事件监听
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!track || !track.participant) {
    return null;
  }

  // 最小化状态
  if (displayState === VideoDisplayState.MINIMIZED) {
    return (
      <div
        ref={tileRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          cursor: 'pointer'
        }}
      >
        <button
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}
          onClick={handleRestore}
          title="恢复视频窗口"
        >
          恢复摄像头区
        </button>
      </div>
    );
  }

  // 正常显示状态
  return (
    <div 
      ref={tileRef}
      className="draggable-video-tile"
      style={{ 
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: width,
        height: height,
        background: '#1a1a1a',
        border: '2px solid #444',
        borderRadius: '8px',
        zIndex: 1000,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 标题栏 */}
      <div style={{
        height: '30px',
        background: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #444',
        flexShrink: 0,
        borderRadius: '6px 6px 0 0',
        cursor: 'grab'
      }}>
        <span style={{ 
          color: '#fff', 
          fontSize: '12px', 
          fontWeight: 'bold',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          maxWidth: '90%'
        }}>
          📹 {track.participant?.name || '参与者'}
        </span>

        {/* 最小化按钮 */}
        <button
          style={{
            position: 'absolute',
            top: '5px',
            right: '8px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: '1'
          }}
          onClick={handleMinimize}
          title="最小化"
        >
          _
        </button>
      </div>
      
      {/* 视频内容区域 */}
      <div style={{ 
        flex: '1',
        overflow: 'hidden',
        background: '#000',
        borderRadius: '0 0 6px 6px',
        position: 'relative',
        height: `${height - 30}px`
      }}>
        <ParticipantTile 
          {...track}
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      </div>
    </div>
  );
} 