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
  width = 100,
  height = 100
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
    type Dimensions = {
      left: number;
      top: number;
      width: number | string;
      height: number | string;
      minWidth?: string;
      minHeight?: string;
    };
    
    switch (displayState) {
      case VideoDisplayState.MAXIMIZED:
        // 如果已获取屏幕共享区域的位置，则使用它
        if (screenShareRef.current) {
          return {
            left: screenShareRef.current.left,
            top: screenShareRef.current.top,
            width: screenShareRef.current.width,
            height: screenShareRef.current.height
          } as Dimensions;
        }
        // 否则覆盖整个视口
        return {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight  // 使用100%的高度以充分利用全屏空间
        } as Dimensions;
      case VideoDisplayState.HIDDEN:
        return {
          left: position.x,
          top: position.y,
          width: 'auto',  // 改为自动宽度适应内容
          height: 'auto',   // 改为自动高度适应内容
          minWidth: '44px', // 添加最小宽度确保可点击性
          minHeight: '28px' // 添加最小高度确保可点击性
        } as Dimensions;
      case VideoDisplayState.NORMAL:
      default:
        return {
          left: position.x,
          top: position.y,
          width: width,
          height: height
        } as Dimensions;
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
      
      // 检测设备类型
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // 安卓设备使用screen.orientation API
      if (!isIOS && screen.orientation && 'lock' in screen.orientation) {
        // 请求全屏并处理成功情况
        if (wrapperRef.current.requestFullscreen) {
          wrapperRef.current.requestFullscreen()
            .then(() => {
              // 延迟一小段时间再锁定屏幕方向
              setTimeout(() => {
                try {
                  // 强制锁定为横屏模式
                  (screen.orientation as any).lock('landscape').catch((err: any) => {
                    console.error('无法锁定横屏方向:', err);
                  });
                } catch (orientationError) {
                  console.error('屏幕方向API错误:', orientationError);
                }
              }, 300);
            })
            .catch((err: any) => {
              console.error('无法进入全屏模式:', err);
            });
        } else if ((wrapperRef.current as any).webkitRequestFullscreen) {
          (wrapperRef.current as any).webkitRequestFullscreen();
          // WebKit没有Promise返回，使用延时
          setTimeout(() => {
            try {
              (screen.orientation as any).lock('landscape').catch((err: any) => {
                console.error('无法锁定横屏方向:', err);
              });
            } catch (orientationError) {
              console.error('屏幕方向API错误:', orientationError);
            }
          }, 300);
        }
      }
      // iOS设备使用CSS模拟横屏
      else if (isIOS) {
        // iOS设备 - 先请求全屏
        if ((wrapperRef.current as any).webkitRequestFullscreen) {
          (wrapperRef.current as any).webkitRequestFullscreen();
        }
        
        // 应用CSS变换模拟横屏
        wrapperRef.current.classList.add('ios-landscape-mode');
        document.body.classList.add('ios-landscape-active');
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
      
      // 检测设备类型
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // 安卓设备
      if (!isIOS) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err: any) => {
            console.error('无法退出全屏模式:', err);
          });
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
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
      // iOS设备
      else {
        // 退出全屏
        if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
        
        // 移除CSS变换
        if (wrapperRef.current) {
          wrapperRef.current.classList.remove('ios-landscape-mode');
        }
        document.body.classList.remove('ios-landscape-active');
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
    
    // 如果是最大化/全屏状态，使用视口单位而不是像素
    if (displayState === VideoDisplayState.MAXIMIZED || isFullscreen) {
      return {
        position: 'fixed' as const,
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        border: 'none',
        borderRadius: 0,
        zIndex: 9999,
        overflow: 'hidden',
        boxShadow: 'none',
        cursor: 'auto',
        userSelect: 'none' as const,
        transition: '0.3s all ease-in-out',
        WebkitTransform: 'translateZ(0)',
        MozTransform: 'translateZ(0)',
        msTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
      } as React.CSSProperties;
    }
    
    // 最小化状态使用自适应宽度
    if (displayState === VideoDisplayState.HIDDEN) {
      return {
        position: 'fixed' as const,
        left: `${dimensions.left}px`,
        top: `${dimensions.top}px`,
        width: 'auto',
        height: 'auto',
        minWidth: dimensions.minWidth || 'auto',
        minHeight: dimensions.minHeight || 'auto',
        background: 'transparent', // 改为透明背景
        border: 'none', // 移除边框
        borderRadius: '8px',
        zIndex: 900,
        overflow: 'hidden',
        boxShadow: 'none', // 移除阴影效果
        cursor: 'pointer',
        userSelect: 'none' as const,
        transition: '0.3s all ease-in-out',
        WebkitTransform: 'translateZ(0)',
        MozTransform: 'translateZ(0)',
        msTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
      } as React.CSSProperties;
    }
    
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      left: `${dimensions.left}px`,
      top: `${dimensions.top}px`,
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      background: '#000',
      border: '2px solid #444',
      borderRadius: '8px',
      zIndex: 900,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      cursor: displayState.toString() === 'hidden' ? 'pointer' : 'auto',
      userSelect: 'none',
      transition: '0.3s all ease-in-out',
      WebkitTransform: 'translateZ(0)',
      MozTransform: 'translateZ(0)',
      msTransform: 'translateZ(0)',
      transform: 'translateZ(0)',
    };
    
    return baseStyles;
  }, [getCurrentDimensions, displayState, isFullscreen]);

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
      className={`floating-wrapper ${displayState === VideoDisplayState.MAXIMIZED ? 'fullscreen-mode' : ''}`}
      style={getStyles()}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={displayState.toString() === 'hidden' ? handleRestore : undefined}
    >
      {/* 正常/最大化状态下显示内容 */}
      {displayState.toString() !== 'hidden' ? (
        <>
          {children}
          
          {/* 最小化按钮 - 右上角 */}
          {displayState !== VideoDisplayState.MAXIMIZED && (
            <div style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              zIndex: 10001
            }}>
              <button
                title="最小化"
                style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '10px'
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
            bottom: displayState === VideoDisplayState.MAXIMIZED ? '15px' : '5px',
            right: displayState === VideoDisplayState.MAXIMIZED ? '15px' : '5px',
            zIndex: 10001
          }}>
            <button
              title={displayState === VideoDisplayState.MAXIMIZED ? '还原' : '全屏'}
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '10px'
              }}
              onClick={handleToggleMaximize}
            >
              {displayState === VideoDisplayState.MAXIMIZED ? (
                <img
                  alt="还原"
                  src={getImagePath('/images/small.svg')}
                  width={12}
                  height={12}
                  className="svg-icon"
                />
              ) : (
                <img
                  alt="全屏"
                  src={getImagePath('/images/big.svg')}
                  width={12}
                  height={12}
                  className="svg-icon"
                />
              )}
            </button>
          </div>
        </>
      ) : (
        // 最小化状态下只显示恢复按钮
        <button
          className="restore-button"
          style={{
            width: 'auto',
            height: 'auto', // 改为auto，根据内容自适应高度
            background: '#2c9631',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '14px',
            padding: '2px 4px', // 减小上下内边距为2px
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            fontWeight: 'bold',
            lineHeight: '1.1' // 添加紧凑的行高
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
  
  .floating-wrapper.fullscreen-mode {
    z-index: 9999;
  }
  
  .floating-wrapper.fullscreen-mode video {
    width: 100vw !important;
    height: 100vh !important;
    object-fit: cover !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
  }
  
  .floating-wrapper.fullscreen-mode .lk-video-element,
  .floating-wrapper.fullscreen-mode .lk-participant-tile {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }
  
  /* 恢复按钮紧凑样式 */
  .floating-wrapper button.restore-button {
    width: auto !important;
    height: auto !important; 
    padding: 2px 4px !important;
    white-space: nowrap !important;
    min-width: fit-content !important;
    line-height: 1.1 !important;
  }
`;

// 添加样式到文档头
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
} 