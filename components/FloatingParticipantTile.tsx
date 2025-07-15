'use client';

import * as React from 'react';
import Image from 'next/image';
import { getImagePath } from '../lib/image-path';

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
  width = 120,
  height = 120
}: FloatingWrapperProps) {
  const [position, setPosition] = React.useState(initialPosition);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [displayState, setDisplayState] = React.useState<VideoDisplayState>(VideoDisplayState.NORMAL);
  // 添加全屏状态
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
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
          width: 80,  // 减小宽度以适应更短的文字
          height: 44   // 保持相同高度以便于点击
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
    console.log('最小化视频窗口');
    setDisplayState(VideoDisplayState.HIDDEN);
  }, []);

  // 处理恢复
  const handleRestore = React.useCallback(() => {
    console.log('恢复视频窗口');
    setDisplayState(VideoDisplayState.NORMAL);
    
    // 如果是从全屏状态恢复，需要退出全屏
    if (isFullscreen) {
      exitFullscreen();
    }
  }, [isFullscreen]);

  // 新增: 进入全屏模式
  const enterFullscreen = React.useCallback(() => {
    try {
      if (!wrapperRef.current) return;
      
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
      if (wrapperRef.current.requestFullscreen) {
        wrapperRef.current.requestFullscreen()
          .then(onFullscreenSuccess)
          .catch((err: any) => {
            console.error('无法进入全屏模式:', err);
          });
      } else if ((wrapperRef.current as any).webkitRequestFullscreen) {
        (wrapperRef.current as any).webkitRequestFullscreen();
        // WebKit没有Promise返回，使用延时
        setTimeout(onFullscreenSuccess, 100);
      } else if ((wrapperRef.current as any).msRequestFullscreen) {
        (wrapperRef.current as any).msRequestFullscreen();
        setTimeout(onFullscreenSuccess, 100);
      }
      
      setIsFullscreen(true);
    } catch (error) {
      console.error('切换全屏模式出错:', error);
    }
  }, []);
  
  // 新增: 退出全屏模式
  const exitFullscreen = React.useCallback(() => {
    try {
      console.log('请求退出全屏模式');
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err: any) => {
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
      
      setIsFullscreen(false);
    } catch (error) {
      console.error('退出全屏模式出错:', error);
    }
  }, []);

  // 修改: 处理最大化/还原切换
  const handleToggleMaximize = React.useCallback(() => {
    // 如果当前是最大化状态，则恢复正常状态
    if (displayState === VideoDisplayState.MAXIMIZED) {
      setDisplayState(VideoDisplayState.NORMAL);
      // 如果是全屏状态，退出全屏
      if (isFullscreen) {
        exitFullscreen();
      }
      return;
    }
    
    // 如果当前是正常状态，则切换到最大化状态
    // 切换到最大化状态前，先更新屏幕共享区域的位置
    updateScreenShareRef();
    setDisplayState(VideoDisplayState.MAXIMIZED);
    
    // 进入全屏模式
    enterFullscreen();
  }, [displayState, updateScreenShareRef, isFullscreen, exitFullscreen, enterFullscreen]);

  const currentDimensions = getCurrentDimensions();

  // 根据当前状态计算样式
  const getStyles = React.useCallback(() => {
    const dimensions = getCurrentDimensions();
    
    // 检查是否有全屏元素
    const isAnyElementFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    );
    
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      left: `${dimensions.left}px`,
      top: `${dimensions.top}px`,
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      background: '#000',
      border: displayState === VideoDisplayState.MAXIMIZED ? 'none' : '2px solid #444',
      borderRadius: displayState === VideoDisplayState.MAXIMIZED ? '0' : '8px',
      zIndex: 900, // 降低z-index，确保在全屏模式下被屏幕共享区域覆盖
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      cursor: displayState === VideoDisplayState.HIDDEN ? 'pointer' : 'auto',
      userSelect: 'none',
      transition: '0.3s all ease-in-out',
      // 增加浏览器前缀支持，确保在全屏模式下正常渲染
      WebkitTransform: 'translateZ(0)',
      MozTransform: 'translateZ(0)',
      msTransform: 'translateZ(0)',
      transform: 'translateZ(0)',
    };
    
    return baseStyles;
  }, [getCurrentDimensions, displayState]);

  // 全局鼠标事件监听
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // 移动端支持
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 添加触摸事件处理
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (!wrapperRef.current || displayState === VideoDisplayState.MAXIMIZED) return;
    
    const rect = wrapperRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    
    setIsDragging(true);
    e.preventDefault();
  }, [displayState]);

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    
    const panelWidth = width;
    const panelHeight = height;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    const touch = e.touches[0];
    let newX = touch.clientX - dragOffset.x;
    let newY = touch.clientY - dragOffset.y;
    
    // 边界检查
    newX = Math.max(0, Math.min(newX, windowWidth - panelWidth));
    newY = Math.max(0, Math.min(newY, windowHeight - panelHeight));
    
    setPosition({ x: newX, y: newY });
    e.preventDefault();
  }, [isDragging, dragOffset, width, height]);

  const handleTouchEnd = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // 首次加载时获取屏幕共享区域位置
  React.useEffect(() => {
    // 延迟执行，确保DOM已经加载
    const timer = setTimeout(() => {
      updateScreenShareRef();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [updateScreenShareRef]);

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
        // 如果是最大化状态，恢复到正常状态
        if (displayState === VideoDisplayState.MAXIMIZED) {
          setDisplayState(VideoDisplayState.NORMAL);
        }
        
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
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, displayState]);

  return (
    <div 
      ref={wrapperRef}
      className="floating-wrapper"
      style={getStyles()}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={displayState === VideoDisplayState.HIDDEN ? handleRestore : undefined}
    >
      {/* 正常/最大化状态下显示内容 */}
      {displayState !== VideoDisplayState.HIDDEN ? (
        <>
          {children}
          
          {/* 最小化按钮 - 右上角 */}
          {displayState !== VideoDisplayState.MAXIMIZED && (
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
                onClick={handleHide}
              >
                _
              </button>
            </div>
          )}
          
          {/* 最大化/恢复按钮 - 右下角 */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            zIndex: 10001
          }}>
            <button
              title={displayState === VideoDisplayState.MAXIMIZED ? '还原' : '全屏'}
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
                <img
                  alt="还原"
                  src={getImagePath('/images/small.svg')}
                  width={16}
                  height={16}
                  className="svg-icon"
                />
              ) : (
                <img
                  alt="全屏"
                  src={getImagePath('/images/big.svg')}
                  width={16}
                  height={16}
                  className="svg-icon"
                />
              )}
            </button>
          </div>
        </>
      ) : (
        // 最小化状态下只显示恢复按钮
        <button
          style={{
            width: '100%',
            height: '100%',
            background: '#2c9631',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '14px',
            padding: '0 8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            fontWeight: 'bold'
          }}
          onClick={handleRestore}
          title="恢复视频窗口"
        >
          恢复
        </button>
      )}
    </div>
  );
} 

// 添加样式
const styles = `
  .svg-icon {
    width: 16px;
    height: 16px;
    filter: brightness(1);
  }
`;

// 添加样式到文档头
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
} 