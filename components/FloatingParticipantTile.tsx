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

  // 新增: 优化视频元素尺寸和比例
  const optimizeVideoElement = React.useCallback(() => {
    if (!wrapperRef.current) return;
    
    // 查找视频元素
    const videoElement = wrapperRef.current.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return;
    
    // 检查是否在全屏模式
    const isFullscreenMode = wrapperRef.current.classList.contains('fullscreen-mode') ||
                          wrapperRef.current.classList.contains('ios-landscape-mode');
    
    if (isFullscreenMode) {
      console.log('应用全屏视频样式');
      
      // 获取视频原始比例信息
      const videoWidth = videoElement.videoWidth || 1920;
      const videoHeight = videoElement.videoHeight || 1080;
      const videoRatio = videoWidth / videoHeight;
      
      console.log(`应用视频样式 - 分辨率: ${videoWidth}×${videoHeight}, 比例: ${videoRatio.toFixed(2)}`);
      
      // 获取屏幕尺寸
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      console.log(`屏幕尺寸: ${screenW}×${screenH}`);
      
      // 检查是iOS横屏模式
      const isIOSLandscape = wrapperRef.current.classList.contains('ios-landscape-mode');
      
      // 处理iOS横屏模式特殊情况
      if (isIOSLandscape) {
        // 对于iOS横屏模式，我们需要考虑旋转后的尺寸
        // 在iOS模式下，屏幕宽高需要对调
        const actualScreenW = screenH; // 旋转后实际可用宽度是屏幕高度
        const actualScreenH = screenW; // 旋转后实际可用高度是屏幕宽度
        
        console.log(`iOS横屏模式 - 旋转后可用空间: ${actualScreenW}×${actualScreenH}`);
        
        // 基于视频比例计算最佳尺寸
        let optimalWidth, optimalHeight;
        const actualScreenRatio = actualScreenW / actualScreenH;
        
        console.log(`屏幕比例: ${actualScreenRatio.toFixed(2)}, 视频比例: ${videoRatio.toFixed(2)}`);
        
        if (videoRatio > actualScreenRatio) {
          // 视频比例大于屏幕比例（视频较宽），以宽度为基准，高度可能不足
          optimalWidth = actualScreenW;
          optimalHeight = actualScreenW / videoRatio;
          console.log(`视频较宽，以宽度顶满: ${optimalWidth.toFixed(0)}×${optimalHeight.toFixed(0)}`);
        } else {
          // 视频比例小于屏幕比例（视频较窄），以高度为基准，宽度可能不足
          optimalHeight = actualScreenH;
          optimalWidth = actualScreenH * videoRatio;
          console.log(`视频较窄，以高度顶满: ${optimalWidth.toFixed(0)}×${optimalHeight.toFixed(0)}`);
        }
        
        console.log(`计算的最佳尺寸: ${optimalWidth.toFixed(0)}×${optimalHeight.toFixed(0)}`);
        
        // 直接设置内联样式，优先级最高
        videoElement.style.width = optimalWidth + 'px';
        videoElement.style.height = optimalHeight + 'px';
        videoElement.style.maxWidth = 'none';
        videoElement.style.maxHeight = 'none';
        videoElement.style.objectFit = 'contain'; // 使用contain保持比例，避免变形
        videoElement.style.margin = '0 auto'; // 水平居中
        videoElement.style.padding = '0';
        videoElement.style.position = 'relative'; // 相对定位
        videoElement.style.left = '0';
        videoElement.style.right = '0';
        
        // 设置data属性以便CSS选择器识别和调试
        videoElement.setAttribute('data-fullscreen-optimized', 'true');
        videoElement.setAttribute('data-optimization-timestamp', new Date().toISOString());
        videoElement.setAttribute('data-style-setter', 'FloatingWrapper-iOS');
      }
    }
  }, []);

  // 新增: 退出全屏模式 - 恢复独立函数
  const exitFullscreen = React.useCallback(() => {
    try {
      console.log('请求退出全屏模式');
      
      // 检测设备类型
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // 安卓设备
      if (!isIOS) {
        console.log('Android设备退出全屏模式');
        
        // 设置一个退出全屏的通用函数 - 安卓设备专用
        const completeExitFullscreen = () => {
          // 更新状态
          setIsFullscreen(false);
          
          // 恢复屏幕方向
          try {
            if (screen.orientation && 'unlock' in screen.orientation) {
              console.log('解除屏幕方向锁定');
              (screen.orientation as any).unlock();
            }
          } catch (orientationError) {
            console.error('屏幕方向API错误:', orientationError);
          }
          
          // 延迟移除fullscreen-mode类，确保状态和UI同步
          setTimeout(() => {
            if (wrapperRef.current) {
              wrapperRef.current.classList.remove('fullscreen-mode');
            }
          }, 50);
        };
        
        // 先退出全屏API
        if (document.exitFullscreen) {
          document.exitFullscreen()
            .then(completeExitFullscreen)
            .catch((err: any) => {
              console.error('无法退出全屏模式:', err);
              // 即使API调用失败，也尝试恢复状态
              completeExitFullscreen();
            });
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
          // 由于无Promise返回，使用延时
          setTimeout(completeExitFullscreen, 100);
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
          // 由于无Promise返回，使用延时
          setTimeout(completeExitFullscreen, 100);
        } else {
          // 无API可用，直接调用
          completeExitFullscreen();
        }
      }
      // iOS设备
      else {
        console.log('iOS设备退出全屏模式');
        
        // 第一阶段：立即清除CSS类和内联样式
        if (wrapperRef.current) {
          // 移除所有横屏相关的CSS类
          wrapperRef.current.classList.remove('ios-landscape-mode');
          wrapperRef.current.classList.remove('fullscreen-mode');
          wrapperRef.current.classList.remove('device-landscape');
          document.body.classList.remove('ios-landscape-active');
          
          // 重置样式
          (wrapperRef.current as HTMLElement).style.position = '';
          (wrapperRef.current as HTMLElement).style.top = '';
          (wrapperRef.current as HTMLElement).style.left = '';
          (wrapperRef.current as HTMLElement).style.width = '';
          (wrapperRef.current as HTMLElement).style.height = '';
          (wrapperRef.current as HTMLElement).style.transformOrigin = '';
          (wrapperRef.current as HTMLElement).style.transform = '';
          (wrapperRef.current as HTMLElement).style.zIndex = '';
          
          // 处理视频元素
          const videoElement = wrapperRef.current.querySelector('video') as HTMLVideoElement;
          if (videoElement) {
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.maxWidth = '';
            videoElement.style.maxHeight = '';
            videoElement.style.margin = '';
            videoElement.style.padding = '';
            
            videoElement.removeAttribute('data-fullscreen-optimized');
          }
        }
        
        // 尝试退出全屏模式
        if ((document as any).webkitExitFullscreen) {
          try {
            (document as any).webkitExitFullscreen();
          } catch (e) {
            console.log('iOS退出全屏API调用失败，继续使用CSS方法');
          }
        }
        
        // 恢复之前隐藏的UI元素
        const hiddenElements = document.querySelectorAll('.header-bar, .footer-bar, .nav-bar, .tab-bar, .mobile-tabs-container, .mobile-chat, .chat-disabled-notice, .mobile-tabs-nav, .mobile-tabs-content, .mobile-footer, .lk-control-bar, .control-bar, .chat-panel, .participants-panel, .bottom-bar, .top-bar, .sidebar, .mobile-sidebar');
        hiddenElements.forEach((el) => {
          (el as HTMLElement).style.display = '';
        });
        
        // 恢复视口设置
        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (metaViewport) {
          metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
        }
        
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('退出全屏模式出错:', error);
      // 尝试恢复状态
      setIsFullscreen(false);
    }
  }, []);

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
  }, [isFullscreen, exitFullscreen]);
  
  // 新增: 进入全屏模式
  const enterFullscreen = React.useCallback(() => {
    try {
      if (!wrapperRef.current) return;
      
      console.log('请求进入全屏模式');
      
      // 检测设备类型
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // 检测当前设备方向
      const isLandscape = window.innerWidth > window.innerHeight ||
                        (window.orientation !== undefined && 
                        (Math.abs(window.orientation as number) === 90));
      
      // 定义成功进入全屏后的回调 - 用于Android设备
      const onFullscreenSuccess = () => {
        // 设置状态
        setIsFullscreen(true);
        
        // 添加全屏CSS类
        if (wrapperRef.current) {
          wrapperRef.current.classList.add('fullscreen-mode');
        }
        
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
      
      // 安卓设备
      if (!isIOS) {
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
      } 
      // iOS设备 - 使用CSS模拟横屏
      else {
        console.log('iOS设备进入全屏模式 - 使用CSS模拟横屏');
        
        // iOS设备 - 先请求全屏
        if ((wrapperRef.current as any).webkitRequestFullscreen) {
          try {
            (wrapperRef.current as any).webkitRequestFullscreen();
          } catch (e) {
            console.log('iOS全屏请求失败，使用CSS模拟');
          }
        }
        
        // 先同步设置状态，避免状态延迟
        setIsFullscreen(true);
        
        // 移除已存在的样式类以避免叠加
        wrapperRef.current.classList.remove('ios-landscape-mode');
        wrapperRef.current.classList.remove('fullscreen-mode');
        wrapperRef.current.classList.remove('device-landscape');
        
        // 清除之前可能设置的内联样式
        (wrapperRef.current as HTMLElement).style.position = '';
        (wrapperRef.current as HTMLElement).style.top = '';
        (wrapperRef.current as HTMLElement).style.left = '';
        (wrapperRef.current as HTMLElement).style.width = '';
        (wrapperRef.current as HTMLElement).style.height = '';
        (wrapperRef.current as HTMLElement).style.transformOrigin = '';
        (wrapperRef.current as HTMLElement).style.transform = '';
        (wrapperRef.current as HTMLElement).style.zIndex = '';
        
        // 在下一个渲染周期应用新样式，避免闪烁
        setTimeout(() => {
          // 确保在隐藏其他UI元素之前捕获body引用
          const bodyElement = document.body;
        
          // 应用CSS变换模拟横屏 - 使用直接样式和类名
          wrapperRef.current?.classList.add('ios-landscape-mode');
          wrapperRef.current?.classList.add('fullscreen-mode'); // 添加通用全屏类
          
          // 根据设备方向添加device-landscape类
          if (isLandscape) {
            wrapperRef.current?.classList.add('device-landscape');
          }
          
          bodyElement.classList.add('ios-landscape-active');
          
          // 强制隐藏可能遮挡的UI元素
          const elementsToHide = document.querySelectorAll(
            '.header-bar, .footer-bar, .nav-bar, .tab-bar, ' + 
            '.mobile-tabs-container, .mobile-chat, .chat-disabled-notice, ' + 
            '.mobile-tabs-nav, .mobile-tabs-content, .mobile-footer, ' +
            '.lk-control-bar, .control-bar, .chat-panel, .participants-panel, ' +
            '.bottom-bar, .top-bar, .sidebar, .mobile-sidebar'
          );
          elementsToHide.forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
          
          // 直接应用内联样式确保旋转效果生效
          if (wrapperRef.current) {
            (wrapperRef.current as HTMLElement).style.position = 'fixed';
            (wrapperRef.current as HTMLElement).style.top = '0';
            (wrapperRef.current as HTMLElement).style.left = '0';
            (wrapperRef.current as HTMLElement).style.width = '100vh';
            (wrapperRef.current as HTMLElement).style.height = '100vw';
            (wrapperRef.current as HTMLElement).style.transformOrigin = 'left top';
            (wrapperRef.current as HTMLElement).style.transform = 'rotate(-90deg) translateX(-100%)';
            (wrapperRef.current as HTMLElement).style.zIndex = '999999'; // 更高的z-index
            (wrapperRef.current as HTMLElement).style.backgroundColor = '#000'; // 确保背景是黑色
            (wrapperRef.current as HTMLElement).style.overflow = 'hidden'; // 防止内容溢出
            (wrapperRef.current as HTMLElement).style.display = 'flex'; // 使用flex布局
            (wrapperRef.current as HTMLElement).style.alignItems = 'center'; // 垂直居中
            (wrapperRef.current as HTMLElement).style.justifyContent = 'center'; // 水平居中
            (wrapperRef.current as HTMLElement).style.textAlign = 'center'; // 文本居中
            
            // 确保按钮容器保持正确位置
            const buttonContainers = wrapperRef.current.querySelectorAll('div[style*="position: absolute"]');
            buttonContainers.forEach((container) => {
              (container as HTMLElement).style.transform = 'none';
              (container as HTMLElement).style.zIndex = '999999';
              (container as HTMLElement).style.pointerEvents = 'auto';
            });
            
            // 检查安全区域 - 添加与屏幕共享组件相同的处理
            if ('CSS' in window && CSS.supports('padding: env(safe-area-inset-bottom)')) {
              (wrapperRef.current as HTMLElement).style.paddingBottom = 'env(safe-area-inset-bottom)';
              (wrapperRef.current as HTMLElement).style.paddingTop = 'env(safe-area-inset-top)';
            }
            
            // 处理Safari底部导航栏
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
            document.getElementsByTagName('head')[0].appendChild(meta);
            
            // 尝试滚动到顶部，减少地址栏的影响
            window.scrollTo(0, 0);
            
            // 优化视频元素
            optimizeVideoElement();
            // 延迟再次调用，确保视频加载完成后样式被正确应用
            setTimeout(() => optimizeVideoElement(), 300);
            setTimeout(() => optimizeVideoElement(), 1000);
          }
        }, 50);
      }
    } catch (error) {
      console.error('切换全屏模式出错:', error);
    }
  }, [optimizeVideoElement]);
  
  // 修改: 处理最大化/还原切换
  const handleToggleMaximize = React.useCallback(() => {
    // 如果当前是最大化状态，则恢复正常状态
    if (displayState === VideoDisplayState.MAXIMIZED) {
      console.log('从最大化状态切换到正常状态');
      
      // 先退出全屏
      if (isFullscreen) {
        console.log('检测到全屏状态，先退出全屏');
        exitFullscreen();
        
        // 为确保安卓设备上的平滑切换，添加延时
        setTimeout(() => {
          console.log('延迟设置displayState为正常');
          setDisplayState(VideoDisplayState.NORMAL);
        }, 150);
      } else {
        // 如果不是全屏状态，直接切换
        setDisplayState(VideoDisplayState.NORMAL);
      }
      return;
    }
    
    // 如果当前是正常状态，则切换到最大化状态
    console.log('从正常状态切换到最大化状态');
    
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
    if (displayState === VideoDisplayState.MAXIMIZED || (isFullscreen && isAnyElementFullscreen)) {
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
        console.log('检测到全屏状态变更: 用户退出了全屏');
        setIsFullscreen(false);
        // 如果是最大化状态，恢复到正常状态
        if (displayState === VideoDisplayState.MAXIMIZED) {
          console.log('从最大化状态恢复到正常状态');
          setDisplayState(VideoDisplayState.NORMAL);
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
      } else if (isDocumentFullscreen && !isFullscreen) {
        console.log('检测到全屏状态变更: 用户进入了全屏');
        setIsFullscreen(true);
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
  
  // 监听设备方向变化
  React.useEffect(() => {
    const handleOrientationChange = () => {
      // 如果不是全屏模式，不处理
      if (!isFullscreen || !wrapperRef.current) return;
      
      // 检查设备类型
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // 只处理iOS设备
      if (!isIOS) return;
      
      // 检查实际方向
      const isLandscape = window.innerWidth > window.innerHeight ||
                        (window.orientation !== undefined && 
                        (Math.abs(window.orientation as number) === 90));
      
      console.log(`设备方向变化: ${isLandscape ? '横屏' : '竖屏'}`);
      
      // 获取视频元素
      const videoElement = wrapperRef.current.querySelector('video') as HTMLVideoElement;
      
      if (isLandscape) {
        // 设备已物理横屏，移除CSS旋转但保持全屏状态
        wrapperRef.current.classList.remove('ios-landscape-mode');
        wrapperRef.current.classList.add('device-landscape'); // 添加设备物理横屏标记
        
        // 重置旋转样式
        (wrapperRef.current as HTMLElement).style.transform = 'none';
        (wrapperRef.current as HTMLElement).style.transformOrigin = 'center center';
        (wrapperRef.current as HTMLElement).style.width = '100%';
        (wrapperRef.current as HTMLElement).style.height = '100%';
      } else {
        // 设备竖屏，应用CSS旋转
        wrapperRef.current.classList.add('ios-landscape-mode');
        wrapperRef.current.classList.remove('device-landscape'); // 移除设备物理横屏标记
        
        // 重新应用旋转样式
        (wrapperRef.current as HTMLElement).style.position = 'fixed';
        (wrapperRef.current as HTMLElement).style.top = '0';
        (wrapperRef.current as HTMLElement).style.left = '0';
        (wrapperRef.current as HTMLElement).style.width = '100vh';
        (wrapperRef.current as HTMLElement).style.height = '100vw';
        (wrapperRef.current as HTMLElement).style.transformOrigin = 'left top';
        (wrapperRef.current as HTMLElement).style.transform = 'rotate(-90deg) translateX(-100%)';
      }
      
      // 如果有视频元素，优化其尺寸
      if (videoElement) {
        optimizeVideoElement();
      }
    };
    
    // 添加方向变化监听
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // 组件卸载时清理
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isFullscreen, optimizeVideoElement]);

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
              zIndex: 10001,
              pointerEvents: 'auto',
              transform: 'none'  // 防止继承父元素的旋转变换
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
                  fontSize: '10px',
                  padding: 0,
                  margin: 0
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
            zIndex: 10001,
            pointerEvents: 'auto',
            transform: 'none'  // 防止继承父元素的旋转变换
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
                fontSize: '10px',
                padding: 0,
                margin: 0
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
  
  /* 添加过渡效果，使全屏切换更平滑 */
  .floating-wrapper {
    transition: all 0.3s ease-in-out !important;
  }
  
  /* 确保安卓设备上的全屏/非全屏切换平滑 */
  @media screen and (min-width: 600px) {
    .floating-wrapper.fullscreen-mode {
      transition: all 0.3s ease-in-out !important;
    }
  }
  
  /* 对视频元素应用过渡效果 */
  .floating-wrapper video {
    transition: width 0.3s ease-in-out, height 0.3s ease-in-out !important;
  }
  
  /* 确保按钮容器在iOS横屏模式下正确显示 */
  .floating-wrapper.ios-landscape-mode div[style*="position: absolute"] {
    transform: none !important;
    z-index: 999999 !important;
    pointer-events: auto !important;
  }
  
  /* 确保按钮在iOS横屏模式下正确显示 */
  .floating-wrapper.ios-landscape-mode button {
    transform: none !important;
  }
  
  /* 确保按钮在iOS横屏模式下正确定位 */
  .floating-wrapper.ios-landscape-mode div[style*="top: 5px"][style*="right: 5px"],
  .floating-wrapper.ios-landscape-mode div[style*="bottom: 5px"][style*="right: 5px"],
  .floating-wrapper.ios-landscape-mode div[style*="bottom: 15px"][style*="right: 15px"] {
    position: absolute !important;
    z-index: 999999 !important;
  }
`;

// 添加样式到文档头
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
} 