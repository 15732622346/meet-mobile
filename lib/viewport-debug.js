// 视口调试与修复工具
// 解决移动浏览器中100vh被地址栏遮挡的问题

export function setupViewportFix() {
  // 只在客户端执行
  if (typeof window === 'undefined') return;
  
  // 设置CSS变量 --vh 为视口高度的1%
  function setViewportHeight() {
    // 基本的视口高度计算
    let vh = window.innerHeight * 0.01;
    
    // 在iOS Safari中特别处理
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      // 检查是否为Safari
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // Safari在iOS上可能需要特殊处理
      if (isSafari) {
        // 获取可视视口高度，可能更准确
        const visualViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        vh = visualViewportHeight * 0.01;
        
        // 在某些情况下尝试检测地址栏高度
        const screenHeight = window.screen.height;
        const addressBarEstimatedHeight = screenHeight - visualViewportHeight;
        
        // 如果地址栏似乎被收起，使用更精确的高度
        if (addressBarEstimatedHeight < 30) {
          vh = visualViewportHeight * 0.01;
        }
      }
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
  
  return () => {
    // 清理函数
    window.removeEventListener('resize', setViewportHeight);
    window.removeEventListener('orientationchange', setViewportHeight);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', setViewportHeight);
      window.visualViewport.removeEventListener('scroll', setViewportHeight);
    }
  };
}

export function ViewportDebug() {
  if (typeof window === 'undefined') return null;
  
  const updateDebugInfo = () => {
    // 窗口高度 - 视口的可见高度
    const windowHeight = window.innerHeight;
    // 文档高度 - 可能会被浏览器UI元素影响
    const documentHeight = document.documentElement.clientHeight;
    // 计算地址栏高度 - 在某些浏览器中可能为0
    const addressBarHeight = windowHeight - documentHeight;
    
    // 检测实际视口高度与CSS变量设置的高度差异
    const cssVh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vh')) * 100;
    const cssVhDiff = windowHeight - cssVh;
    
    // 使用屏幕高度来做额外检测
    const screenHeight = window.screen.height;
    const screenToWindowDiff = screenHeight - windowHeight;
    
    // 估算地址栏实际高度 - 使用多种方法中的最大值
    const estimatedAddressBarHeight = Math.max(
      addressBarHeight, 
      cssVhDiff > 0 ? cssVhDiff : 0,
      screenToWindowDiff > 50 ? screenToWindowDiff : 0 // 如果差值很小可能是其他UI元素
    );
    
    const debugElement = document.getElementById('viewport-debug');
    if (debugElement) {
      debugElement.innerHTML = `
        <div style="background: rgba(0,0,0,0.7); color: white; padding: 8px; font-size: 12px; position: fixed; top: 0; left: 0; z-index: 10000;">
          <div>窗口高度: ${windowHeight}px</div>
          <div>文档高度: ${documentHeight}px</div>
          <div>屏幕高度: ${screenHeight}px</div>
          <div>地址栏高度: ~${addressBarHeight}px</div>
          <div>估计实际高度: ~${estimatedAddressBarHeight}px</div>
          <div>CSS高度(--vh*100): ${cssVh.toFixed(1)}px</div>
          <div>对齐方式: ${document.body.classList.contains('bottom-aligned') ? '底部对齐' : '顶部对齐'}</div>
        </div>
      `;
    } else {
      const div = document.createElement('div');
      div.id = 'viewport-debug';
      document.body.appendChild(div);
      updateDebugInfo();
    }
  };
  
  // 初始更新
  setTimeout(updateDebugInfo, 500);
  
  // 监听变化
  window.addEventListener('resize', updateDebugInfo);
  window.addEventListener('orientationchange', updateDebugInfo);
  
  return () => {
    window.removeEventListener('resize', updateDebugInfo);
    window.removeEventListener('orientationchange', updateDebugInfo);
  };
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