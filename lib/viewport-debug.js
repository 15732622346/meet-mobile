// 视口调试与修复工具
// 解决移动浏览器中100vh被地址栏遮挡的问题

export function setupViewportFix() {
  // 只在客户端执行
  if (typeof window === 'undefined') return;
  
  // 设置CSS变量 --vh 为视口高度的1%
  function setViewportHeight() {
    // 基本的视口高度计算
    let vh = window.innerHeight * 0.01;
    
    // 检测浏览器类型
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edge\//.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    console.log(`📱 设备检测: iOS=${isIOS}, Android=${isAndroid}, Chrome=${isChrome}, Safari=${isSafari}`);
    
    // 获取可视视口高度，可能更准确
    const visualViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const windowHeight = window.innerHeight;
    const screenHeight = window.screen.height;
    
    // 估算地址栏高度
    const addressBarEstimatedHeight = screenHeight - visualViewportHeight;
    
    console.log(`📏 高度数据: 视口=${visualViewportHeight}px, 窗口=${windowHeight}px, 屏幕=${screenHeight}px, 估计地址栏=${addressBarEstimatedHeight}px`);
    
    // 特殊浏览器处理
    if (isIOS) {
      // iOS Safari特殊处理
      if (isSafari) {
        vh = visualViewportHeight * 0.01;
        
        // 如果地址栏似乎被收起，使用更精确的高度
        if (addressBarEstimatedHeight < 30) {
          vh = visualViewportHeight * 0.01;
        }
      }
    } else if (isAndroid && isChrome) {
      // Android Chrome特殊处理
      // Chrome在Android上的地址栏会动态变化
      vh = visualViewportHeight * 0.01;
      
      // 检测是否处于全屏模式
      const isFullscreen = !!(
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.msFullscreenElement
      );
      
      if (isFullscreen) {
        // 全屏模式使用屏幕高度
        vh = screenHeight * 0.01;
        console.log(`🖥️ 全屏模式: 使用屏幕高度 ${screenHeight}px`);
      }
    } else {
      // 其他浏览器使用visualViewport或innerHeight
      vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
    }
    
    console.log(`📏 设置视口高度 --vh = ${vh}px (总高度: ${vh * 100}px)`);
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  // 初始设置
  setViewportHeight();
  
  // 当窗口大小改变或设备旋转时更新
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', setViewportHeight);
  
  // 如果存在visualViewport API，使用它来更准确地检测高度变化
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportHeight);
    window.visualViewport.addEventListener('scroll', setViewportHeight);
  }
  
  // 监听全屏变化，更新视口高度
  document.addEventListener('fullscreenchange', setViewportHeight);
  document.addEventListener('webkitfullscreenchange', setViewportHeight);
  document.addEventListener('mozfullscreenchange', setViewportHeight);
  document.addEventListener('MSFullscreenChange', setViewportHeight);
  
  // 在页面加载完成后再次设置，确保正确
  window.addEventListener('load', () => {
    // 延迟执行，等待浏览器UI稳定
    setTimeout(setViewportHeight, 300);
  });
  
  return () => {
    // 清理函数
    window.removeEventListener('resize', setViewportHeight);
    window.removeEventListener('orientationchange', setViewportHeight);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', setViewportHeight);
      window.visualViewport.removeEventListener('scroll', setViewportHeight);
    }
    document.removeEventListener('fullscreenchange', setViewportHeight);
    document.removeEventListener('webkitfullscreenchange', setViewportHeight);
    document.removeEventListener('mozfullscreenchange', setViewportHeight);
    document.removeEventListener('MSFullscreenChange', setViewportHeight);
  };
}

export function ViewportDebug() {
  // 返回一个空函数，不执行任何操作
  return () => {};
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