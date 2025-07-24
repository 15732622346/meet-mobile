// 视口调试与修复工具
// 解决移动浏览器中100vh被地址栏遮挡的问题

// 将vh单位调整为实际可见高度的函数
export function setupViewportFix() {
  // 只在客户端执行
  if (typeof window === 'undefined') return;
  
  // iOS Safari防止自动缩放
  const preventZoom = () => {
    // 确保viewport设置正确
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
    
    // 防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd < 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
    
    // 防止手势缩放
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    }, { passive: false });
  };
  
  // 初始执行一次
  preventZoom();
  
  // 创建全局状态管理对象
  if (!window.videoStateManager) {
    window.videoStateManager = {
      isFullscreen: false,
      updateAllButtons: function(isFullscreen) {
        this.isFullscreen = isFullscreen;
        console.log('更新全局全屏状态:', isFullscreen);
        
        // 更新所有全屏按钮的状态
        const allButtons = document.querySelectorAll('.fullscreen-toggle-btn');
        allButtons.forEach(btn => {
          const imgElement = btn.querySelector('img');
          if (imgElement) {
            if (isFullscreen) {
              imgElement.setAttribute('src', '/mobile/images/small.svg');
              imgElement.setAttribute('alt', '退出全屏');
              imgElement.setAttribute('title', '退出全屏');
            } else {
              imgElement.setAttribute('src', '/mobile/images/big.svg');
              imgElement.setAttribute('alt', '全屏');
              imgElement.setAttribute('title', '全屏');
            }
          }
        });
      }
    };
  }
  
  // 计算并设置视口高度
  const calculateViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  // 初始计算
  calculateViewportHeight();
  
  // 添加调整大小事件监听器
  window.addEventListener('resize', calculateViewportHeight);
  window.addEventListener('orientationchange', calculateViewportHeight);
  
  // 添加全屏按钮调试监听
  setupFullscreenButtonDebug();
  
  // 返回清理函数
  return () => {
    window.removeEventListener('resize', calculateViewportHeight);
    window.removeEventListener('orientationchange', calculateViewportHeight);
  };
}

// 添加全屏按钮的全局调试监听器
function setupFullscreenButtonDebug() {
  if (typeof document === 'undefined') return;
  
  // 设置周期性检查
  const periodicFullscreenCheck = () => {
    if (window.videoStateManager) {
      // 检查当前实际全屏状态
      const isActuallyFullscreen = !!(
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.msFullscreenElement ||
        document.body.classList.contains('ios-landscape-active') ||
        document.querySelector('.screen-share-wrapper.fullscreen-mode') ||
        document.querySelector('.screen-share-wrapper.ios-landscape-mode')
      );
      
      // 如果全屏状态与按钮状态不一致，同步它们
      if (window.videoStateManager.isFullscreen !== isActuallyFullscreen) {
        console.log(`检测到全屏状态不一致: 按钮状态=${window.videoStateManager.isFullscreen}, 实际状态=${isActuallyFullscreen}`);
        window.videoStateManager.updateAllButtons(isActuallyFullscreen);
      }
    }
  };
  
  // 每秒检查一次
  setInterval(periodicFullscreenCheck, 1000);
  
  // 创建MutationObserver来检测DOM变化
  const observer = new MutationObserver((mutations) => {
    // 查找所有全屏按钮
    const fullscreenButtons = document.querySelectorAll('.fullscreen-toggle-btn');
    
    // 为每个找到的按钮添加调试点击事件
    fullscreenButtons.forEach(btn => {
      // 检查是否已添加调试监听器
      if (!btn.hasAttribute('data-debug-click')) {
        btn.setAttribute('data-debug-click', 'true');
        
        // 添加点击事件监听器
        btn.addEventListener('click', function(e) {
          // 如果是退出全屏按钮，强制清除所有横屏样式
          if (this.querySelector('img')?.alt === '退出全屏') {
            console.log('检测到退出全屏按钮点击，强制清除横屏样式');
            
            // 更新全局全屏状态
            if (window.videoStateManager) {
              window.videoStateManager.updateAllButtons(false);
            }
            
            // 强制清除所有横屏样式类和内联样式
            function forceCleanupLandscapeStyles() {
              // 清除body上的横屏类
              document.body.classList.remove('ios-landscape-active');
              
              // 保存视频元素的源和内容，用于稍后恢复
              const videoSources = [];
              const videos = document.querySelectorAll('video');
              videos.forEach((video, index) => {
                // 保存当前视频源和状态
                videoSources[index] = {
                  element: video,
                  srcObject: video.srcObject,
                  src: video.src,
                  paused: video.paused,
                  muted: video.muted,
                  playbackRate: video.playbackRate
                };
              });
              
              // 清除所有screen-share-wrapper上的横屏类
              const shareWrappers = document.querySelectorAll('.screen-share-wrapper');
              shareWrappers.forEach(wrapper => {
                // 保存原始显示状态
                const wasVisible = wrapper.style.display !== 'none';
                
                // 移除横屏相关类，但保留其他必要类
                wrapper.classList.remove('ios-landscape-mode');
                wrapper.classList.remove('fullscreen-mode');
                wrapper.classList.remove('device-landscape');
                
                // 确保共享容器可见且有适当的高度
                const element = wrapper;
                element.style.display = wasVisible ? 'flex' : element.style.display;
                element.style.position = '';
                element.style.top = '';
                element.style.left = '';
                element.style.width = '100%';
                element.style.height = '30vh'; // 恢复竖屏高度
                element.style.minHeight = '150px'; // 确保最小高度
                element.style.maxWidth = '';
                element.style.maxHeight = '';
                element.style.transform = '';
                element.style.transformOrigin = '';
                element.style.zIndex = '';
                element.style.overflow = '';
                element.style.visibility = 'visible'; // 确保可见性
              });
              
              // 确保网格布局容器样式正确
              const gridLayouts = document.querySelectorAll('.lk-grid-layout');
              gridLayouts.forEach(grid => {
                grid.style.width = '100%';
                grid.style.height = '100%';
                grid.style.transform = '';
                grid.style.maxWidth = '';
                grid.style.maxHeight = '';
                grid.style.display = 'flex'; // 确保显示
                grid.style.visibility = 'visible'; // 确保可见性
              });
              
              // 处理视频元素 - 首先只恢复样式，不动源
              videos.forEach(video => {
                video.style.transform = '';
                video.style.transformOrigin = '';
                video.style.maxWidth = '';
                video.style.maxHeight = '';
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'contain'; // 确保视频适合容器
                video.style.visibility = 'visible'; // 确保可见性
                video.style.display = 'block'; // 确保显示
                
                // 重置方向属性
                video.removeAttribute('data-lk-orientation');
                video.setAttribute('data-lk-orientation', 'portrait');
              });
              
              // 延迟一点恢复视频源，确保样式已经应用
              setTimeout(() => {
                // 恢复之前保存的视频源和状态
                videoSources.forEach(source => {
                  const { element, srcObject, src, paused, muted, playbackRate } = source;
                  
                  // 如果视频源丢失，恢复它
                  if (!element.srcObject && srcObject) {
                    console.log('恢复视频流连接');
                    element.srcObject = srcObject;
                  }
                  if (!element.src && src) {
                    element.src = src;
                  }
                  
                  // 恢复播放状态
                  element.muted = muted;
                  element.playbackRate = playbackRate;
                  
                  // 恢复播放/暂停状态
                  if (!paused && element.paused) {
                    element.play().catch(err => console.error('恢复播放失败:', err));
                  }
                });
              }, 50);
              
              console.log('已强制清除所有横屏样式，并确保视频可见');
            }
            
            // 尝试立即清除样式
            forceCleanupLandscapeStyles();
            
            // 强制重绘
            document.body.style.display = 'none';
            document.body.offsetHeight; // 触发重排
            document.body.style.display = '';
            
            // 尝试刷新LiveKit视频
            try {
              // 触发LiveKit组件可能使用的resize事件
              window.dispatchEvent(new Event('resize'));
              
              // 尝试查找并刷新LiveKit视频元素
              const lkVideos = document.querySelectorAll('.lk-participant-media-video');
              if (lkVideos.length > 0) {
                console.log('找到LiveKit视频元素，尝试刷新');
                
                lkVideos.forEach(video => {
                  // 保存视频源
                  const srcObject = video.srcObject;
                  
                  // 尝试通过移除并重新添加样式类来触发视频重新渲染
                  const classList = Array.from(video.classList);
                  video.classList.remove(...classList);
                  setTimeout(() => {
                    video.classList.add(...classList);
                    
                    // 确保视频源仍然存在
                    if (!video.srcObject && srcObject) {
                      video.srcObject = srcObject;
                    }
                    
                    // 确保视频元素可见
                    video.style.display = 'block';
                    video.style.visibility = 'visible';
                  }, 10);
                });
                
                // 尝试调用LiveKit可能使用的refreshTracks方法
                if (window.livekitRoom && typeof window.livekitRoom.refreshTracks === 'function') {
                  console.log('尝试调用LiveKit refreshTracks');
                  window.livekitRoom.refreshTracks();
                }
              }
            } catch (e) {
              console.error('尝试刷新LiveKit视频时出错:', e);
            }
            
            // 延时再次清除，确保样式被移除，但保留视频源
            setTimeout(forceCleanupLandscapeStyles, 100);
            setTimeout(forceCleanupLandscapeStyles, 300);
            
            // 尝试触发窗口调整大小事件
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 200);
          }
          // 如果是进入全屏按钮，更新全局状态
          else if (this.querySelector('img')?.alt === '全屏') {
            // 更新全局全屏状态
            if (window.videoStateManager) {
              window.videoStateManager.updateAllButtons(true);
            }
          }
        });
        
        console.log('已为全屏按钮添加调试监听器', btn);
      }
    });
  });
  
  // 开始观察DOM变化
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: false
  });
  
  console.log('已启用全屏按钮全局调试监听');
}

// 视口调试函数
export function ViewportDebug() {
  // 空实现
}

export function enableBottomAlignment() {
  if (typeof document !== 'undefined') {
    document.body.classList.add('bottom-aligned');
  }
}

export function disableBottomAlignment() {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('bottom-aligned');
  }
}

export default {
  setupViewportFix,
  ViewportDebug,
  enableBottomAlignment,
  disableBottomAlignment
}; 