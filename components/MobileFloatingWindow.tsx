'use client';

import * as React from 'react';

// 视频显示状态枚举
enum VideoDisplayState {
  NORMAL = 'normal',
  MINIMIZED = 'minimized'
}

interface MobileFloatingWindowProps {
  children: React.ReactNode;
  title?: string;
  initialPosition?: { x: number; y: number };
  width?: number;
  height?: number;
}

export function MobileFloatingWindow({
  children,
  title = '参与者',
  initialPosition = { x: 20, y: 80 },
  width = 200,
  height = 150
}: MobileFloatingWindowProps) {
  const [position, setPosition] = React.useState(initialPosition);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [displayState, setDisplayState] = React.useState<VideoDisplayState>(VideoDisplayState.NORMAL);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  
  // 拖拽功能
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (!wrapperRef.current) return;
    
    const rect = wrapperRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
  }, []);

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

  // 最小化状态
  if (displayState === VideoDisplayState.MINIMIZED) {
    return (
      <div
        ref={wrapperRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000
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
  
  // 正常状态
  return (
    <div
      ref={wrapperRef}
      className="floating-wrapper"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width,
        height,
        background: 'rgb(0, 0, 0)',
        border: '2px solid rgb(68, 68, 68)',
        borderRadius: '8px',
        zIndex: 10500, // 提高z-index，确保在全屏模式下也显示在最上层
        overflow: 'hidden',
        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 4px 20px',
        cursor: isDragging ? 'grabbing' : 'auto',
        userSelect: 'none',
        transition: '0.3s'
      }}
    >
      {/* 视频内容 */}
      <div 
        className="jsx-4e74496e9c95c646"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgb(0, 0, 0)',
          position: 'relative'
        }}
      >
        {children}
      </div>
      
      {/* 最小化按钮 */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: 10001
      }}>
        <button
          title="最小化"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'rgb(255, 255, 255)',
            border: 'none',
            borderRadius: '4px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onClick={handleMinimize}
        >
          _
        </button>
      </div>
      
      {/* 最大化按钮 */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        zIndex: 10001
      }}>
        <button
          title="最大化"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'rgb(255, 255, 255)',
            border: 'none',
            borderRadius: '4px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <img alt="最大化" width="16" height="16" src="/images/big.png" />
        </button>
      </div>
    </div>
  );
} 