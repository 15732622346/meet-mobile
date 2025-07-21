// 视口调试与修复工具
// 解决移动浏览器中100vh被地址栏遮挡的问题

// 将vh单位调整为实际可见高度的函数
export function setupViewportFix() {
  // 只在客户端执行
  if (typeof window === 'undefined') return;
  
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
          // 收集按钮信息
          const buttonInfo = {
            time: new Date().toLocaleTimeString(),
            target: e.target.tagName,
            className: this.className,
            parentClassName: this.parentElement?.className || 'unknown',
            isFullscreenButton: true,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            orientation: window.orientation !== undefined ? window.orientation : 'unknown',
            isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
            fullscreenElement: document.fullscreenElement ? 'yes' : 'no',
            webkitFullscreenElement: document.webkitFullscreenElement ? 'yes' : 'no',
            imageAlt: this.querySelector('img')?.alt || 'unknown'
          };
          
          // 显示信息
          alert(`
【全局监听-全屏按钮点击】
时间: ${buttonInfo.time}
按钮类名: ${buttonInfo.className}
父元素类名: ${buttonInfo.parentClassName}
目标元素: ${buttonInfo.target}
图片alt: ${buttonInfo.imageAlt}
视口尺寸: ${buttonInfo.windowWidth}×${buttonInfo.windowHeight}
方向值: ${buttonInfo.orientation}
设备类型: ${buttonInfo.isIOS ? 'iOS' : '非iOS'}
DOM全屏: ${buttonInfo.fullscreenElement}
webkit全屏: ${buttonInfo.webkitFullscreenElement}
          `);
          
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
              
              // 清除所有screen-share-wrapper上的横屏类
              const shareWrappers = document.querySelectorAll('.screen-share-wrapper');
              shareWrappers.forEach(wrapper => {
                // 保存原始显示状态
                const wasVisible = wrapper.style.display !== 'none';
                
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
              
              // 处理视频元素
              const videos = document.querySelectorAll('video');
              videos.forEach(video => {
                // 保存当前src和srcObject以防它们被清除
                const currentSrc = video.src;
                const currentSrcObject = video.srcObject;
                
                video.style.transform = '';
                video.style.transformOrigin = '';
                video.style.maxWidth = '';
                video.style.maxHeight = '';
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'contain'; // 确保视频适合容器
                video.style.visibility = 'visible'; // 确保可见性
                video.style.display = 'block'; // 确保显示
                
                video.removeAttribute('data-lk-orientation');
                video.setAttribute('data-lk-orientation', 'portrait');
                
                // 如果视频流丢失，尝试重新连接
                if (!video.srcObject && currentSrcObject) {
                  console.log('尝试恢复视频流连接');
                  video.srcObject = currentSrcObject;
                }
                if (!video.src && currentSrc) {
                  video.src = currentSrc;
                }
              });
              
              // 处理网格布局
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
                  // 尝试通过移除并重新添加样式类来触发视频重新渲染
                  const classList = Array.from(video.classList);
                  video.classList.remove(...classList);
                  setTimeout(() => {
                    video.classList.add(...classList);
                    
                    // 尝试强制视频元素刷新
                    if (video.parentNode) {
                      const parent = video.parentNode;
                      const nextSibling = video.nextSibling;
                      parent.removeChild(video);
                      setTimeout(() => {
                        if (nextSibling) {
                          parent.insertBefore(video, nextSibling);
                        } else {
                          parent.appendChild(video);
                        }
                      }, 10);
                    }
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
            
            // 延时再次清除，确保样式被移除
            setTimeout(forceCleanupLandscapeStyles, 100);
            setTimeout(forceCleanupLandscapeStyles, 300);
            setTimeout(forceCleanupLandscapeStyles, 500);
            
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
          
          // 延时收集操作后状态
          setTimeout(() => {
            const afterInfo = {
              time: new Date().toLocaleTimeString(),
              windowWidth: window.innerWidth,
              windowHeight: window.innerHeight,
              orientation: window.orientation !== undefined ? window.orientation : 'unknown',
              fullscreenElement: document.fullscreenElement ? 'yes' : 'no',
              webkitFullscreenElement: document.webkitFullscreenElement ? 'yes' : 'no',
              bodyClasses: document.body.className,
              videoCount: document.querySelectorAll('video').length,
              videoVisible: Array.from(document.querySelectorAll('video')).map(v => {
                return {
                  display: window.getComputedStyle(v).display,
                  visibility: window.getComputedStyle(v).visibility,
                  width: v.offsetWidth,
                  height: v.offsetHeight,
                  hasSrc: !!v.src,
                  hasSrcObject: !!v.srcObject,
                  readyState: v.readyState,
                  paused: v.paused
                };
              }),
              shareWrapperDisplay: Array.from(document.querySelectorAll('.screen-share-wrapper')).map(w => {
                return {
                  display: window.getComputedStyle(w).display,
                  visibility: window.getComputedStyle(w).visibility,
                  width: w.offsetWidth,
                  height: w.offsetHeight,
                };
              })
            };
            
            // 强制再次同步全屏状态
            if (window.videoStateManager && 
                !document.fullscreenElement && 
                !document.webkitFullscreenElement) {
              // 如果浏览器不在全屏模式，确保所有按钮显示"全屏"
              window.videoStateManager.updateAllButtons(false);
            }
            
            alert(`
【全局监听-按钮点击后状态】
时间: ${afterInfo.time}
视口尺寸: ${afterInfo.windowWidth}×${afterInfo.windowHeight}
方向值: ${afterInfo.orientation}
DOM全屏: ${afterInfo.fullscreenElement}
webkit全屏: ${afterInfo.webkitFullscreenElement}
body类名: ${afterInfo.bodyClasses}
视频数量: ${afterInfo.videoCount}
视频可见性: ${afterInfo.videoVisible.map(v => `${v.display}, ${v.visibility}, ${v.width}x${v.height}, ${v.hasSrc ? '有src' : '无src'}, ${v.hasSrcObject ? '有srcObject' : '无srcObject'}, 状态: ${v.readyState}, 暂停: ${v.paused}`).join('; ')}
共享容器显示: ${afterInfo.shareWrapperDisplay.map(w => `${w.display}, ${w.visibility}, ${w.width}x${w.height}`).join('; ')}
            `);
          }, 500);
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