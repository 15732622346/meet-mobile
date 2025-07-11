'use client';

import * as React from 'react';
import Image from 'next/image';

interface FloatingWrapperProps {
  children: React.ReactNode;
  title?: string;
  initialPosition?: { x: number; y: number };
  width?: number;
  height?: number;
}

// 视频显示状态枚举
enum VideoDisplayState {
  NORMAL = 'normal',
  MAXIMIZED = 'maximized', 
  HIDDEN = 'hidden'
}

export function FloatingWrapper({ 
  children,
  title = '参与者',
  initialPosition = { x: 100, y: 100 },
  width = 300,
  height = 200
}: FloatingWrapperProps) {
  const [position, setPosition] = React.useState(initialPosition);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [displayState, setDisplayState] = React.useState<VideoDisplayState>(VideoDisplayState.NORMAL);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  
  // 新增: 屏幕共享区域引用
  const screenShareRef = React.useRef<DOMRect | null>(null);

  // 拖拽功能
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (!wrapperRef.current || displayState === VideoDisplayState.MAXIMIZED) return;
    
    const rect = wrapperRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    setIsDragging(true);
    e.preventDefault();
  }, [displayState]);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const panelWidth = width;
    const panelHeight = height;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // 边界检查
    newX = Math.max(0, Math.min(newX, windowWidth - panelWidth));
    newY = Math.max(0, Math.min(newY, windowHeight - panelHeight));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset, width, height]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // 新增: 查找并存储屏幕共享区域的位置和尺寸
  const updateScreenShareRef = React.useCallback(() => {
    // 查找屏幕共享区域
    const screenShareElement = document.querySelector('.screen-share-wrapper') as HTMLElement;
    if (screenShareElement) {
      screenShareRef.current = screenShareElement.getBoundingClientRect();
      console.log('找到屏幕共享区域:', screenShareRef.current);
    } else {
      console.log('未找到屏幕共享区域');
      // 如果找不到，尝试其他可能的选择器
      const mainVideoContainer = document.querySelector('.mobile-video-container') as HTMLElement;
      if (mainVideoContainer) {
        screenShareRef.current = mainVideoContainer.getBoundingClientRect();
        console.log('使用主视频容器作为替代:', screenShareRef.current);
      }
    }
  }, []);

  // 获取当前显示尺寸
  const getCurrentDimensions = React.useCallback(() => {
    switch (displayState) {
      case VideoDisplayState.MAXIMIZED:
        // 如果已获取屏幕共享区域的位置，则使用它
        if (screenShareRef.current) {
          return {
            left: screenShareRef.current.left,
            top: screenShareRef.current.top,
            width: screenShareRef.current.width,
            height: screenShareRef.current.height
          };
        }
        // 否则覆盖整个视口
        return {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight * 0.6  // 覆盖60%的高度，避免完全遮挡UI
        };
      case VideoDisplayState.HIDDEN:
        return {
          left: position.x,
          top: position.y,
          width: 40,
          height: 40
        };
      case VideoDisplayState.NORMAL:
      default:
        return {
          left: position.x,
          top: position.y,
          width: width,
          height: height
        };
    }
  }, [displayState, position.x, position.y, width, height]);

  // 处理最小化
  const handleHide = React.useCallback(() => {
    setDisplayState(VideoDisplayState.HIDDEN);
  }, []);

  // 处理恢复
  const handleRestore = React.useCallback(() => {
    setDisplayState(VideoDisplayState.NORMAL);
  }, []);

  // 处理最大化/还原切换
  const handleToggleMaximize = React.useCallback(() => {
    // 切换到最大化状态前，先更新屏幕共享区域的位置
    if (displayState !== VideoDisplayState.MAXIMIZED) {
      updateScreenShareRef();
    }
    
    setDisplayState(prev => 
      prev === VideoDisplayState.MAXIMIZED 
        ? VideoDisplayState.NORMAL 
        : VideoDisplayState.MAXIMIZED
    );
  }, [displayState, updateScreenShareRef]);

  const currentDimensions = getCurrentDimensions();

  // 根据当前状态计算样式
  const getStyles = React.useCallback(() => {
    const dimensions = getCurrentDimensions();
    
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      left: `${dimensions.left}px`,
      top: `${dimensions.top}px`,
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      background: '#000',
      border: displayState === VideoDisplayState.MAXIMIZED ? 'none' : '2px solid #444',
      borderRadius: displayState === VideoDisplayState.MAXIMIZED ? '0' : '8px',
      zIndex: displayState === VideoDisplayState.MAXIMIZED ? 1500 : 1000, // 提高最大化时的z-index
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      cursor: displayState === VideoDisplayState.HIDDEN ? 'grab' : 'auto',
      userSelect: 'none',
      transition: '0.3s'
    };
    
    return baseStyles;
  }, [getCurrentDimensions, displayState]);

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

  // 首次加载时获取屏幕共享区域位置
  React.useEffect(() => {
    // 延迟执行，确保DOM已经加载
    const timer = setTimeout(() => {
      updateScreenShareRef();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [updateScreenShareRef]);

  return (
    <div 
      ref={wrapperRef}
      className="floating-wrapper"
      style={getStyles()}
    >
      {children}
      
      {/* 最小化/最大化按钮 */}
      {displayState !== VideoDisplayState.HIDDEN && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 10001
        }}>
          <button
            title={displayState === VideoDisplayState.MAXIMIZED ? '还原' : '最小化'}
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              color: '#fff',
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
            onClick={displayState === VideoDisplayState.MAXIMIZED ? handleRestore : handleHide}
          >
            {displayState === VideoDisplayState.MAXIMIZED ? '❐' : '_'}
          </button>
        </div>
      )}
      
      {/* 最大化/恢复按钮 */}
      {displayState !== VideoDisplayState.HIDDEN && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          zIndex: 10001
        }}>
          <button
            title={displayState === VideoDisplayState.MAXIMIZED ? '还原' : '最大化'}
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              color: '#fff',
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
            onClick={handleToggleMaximize}
          >
            {displayState === VideoDisplayState.MAXIMIZED ? (
              <span>❐</span>
            ) : (
              <img
                alt="最大化"
                src="/images/big.png"
                width={16}
                height={16}
              />
            )}
          </button>
        </div>
      )}
      
      {/* 恢复按钮 (仅在最小化状态显示) */}
      {displayState === VideoDisplayState.HIDDEN && (
        <button
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '16px'
          }}
          onClick={handleRestore}
          title="恢复视频窗口"
        >
          📹
        </button>
      )}
    </div>
  );
} 