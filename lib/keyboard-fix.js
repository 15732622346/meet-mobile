/**
 * 虚拟键盘布局修复工具
 * 解决移动端键盘弹出时页面布局问题
 */

// 导入现有的视口修复功能
import { setupViewportFix } from './viewport-debug';

// 导出初始化函数
export function setupKeyboardFix() {
  if (typeof window === 'undefined') return; // 仅在浏览器环境执行
  
  console.log('🔤 初始化虚拟键盘修复工具...');
  
  // 首先调用已有的视口高度修复功能
  const viewportFixCleanup = setupViewportFix();
  
  // 方法1：使用 VirtualKeyboard API (Chrome 94+)
  if ("virtualKeyboard" in navigator) {
    console.log('✅ 使用 VirtualKeyboard API');
    
    // 告诉浏览器我们将自己处理键盘遮挡问题
    navigator.virtualKeyboard.overlaysContent = true;
    
    // 监听键盘几何形状变化
    navigator.virtualKeyboard.addEventListener("geometrychange", (event) => {
      const { height } = event.target.boundingRect;
      const isKeyboardVisible = height > 0;
      
      document.body.classList.toggle('keyboard-open', isKeyboardVisible);
      document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
      
      console.log(`🔤 键盘${isKeyboardVisible ? '显示' : '隐藏'}, 高度: ${height}px`);
      
      // 如果键盘显示，确保输入框在视野内
      if (isKeyboardVisible && document.activeElement) {
        setTimeout(() => {
          document.activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    });
    
    return () => {
      if (viewportFixCleanup) viewportFixCleanup();
    };
  }
  
  // 方法2：使用 Visual Viewport API
  if (window.visualViewport) {
    console.log('✅ 使用 Visual Viewport API');
    
    const viewportHandler = () => {
      // 如果视口高度比窗口高度小很多，通常意味着键盘已弹出
      const isKeyboardVisible = window.innerHeight - window.visualViewport.height > 150;
      const keyboardHeight = isKeyboardVisible ? window.innerHeight - window.visualViewport.height : 0;
      
      document.body.classList.toggle('keyboard-open', isKeyboardVisible);
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      
      console.log(`🔤 键盘${isKeyboardVisible ? '显示' : '隐藏'}, 估计高度: ${keyboardHeight}px`);
      
      if (isKeyboardVisible && document.activeElement) {
        // 计算元素相对于视口的位置
        const activeElement = document.activeElement;
        const rect = activeElement.getBoundingClientRect();
        const isElementVisible = rect.bottom < window.visualViewport.height;
        
        if (!isElementVisible) {
          setTimeout(() => {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    };
    
    // 添加事件监听
    window.visualViewport.addEventListener('resize', viewportHandler);
    window.visualViewport.addEventListener('scroll', viewportHandler);
    
    // 设置清理函数
    return () => {
      window.visualViewport.removeEventListener('resize', viewportHandler);
      window.visualViewport.removeEventListener('scroll', viewportHandler);
      if (viewportFixCleanup) viewportFixCleanup();
    };
  }
  
  // 方法3：传统兼容方法 (针对iOS和旧版Android)
  console.log('✅ 使用传统兼容方法');
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // 为所有输入元素添加事件监听
  const inputElements = document.querySelectorAll('input, textarea, [contenteditable]');
  
  inputElements.forEach(el => {
    // 输入框获取焦点
    el.addEventListener('focus', () => {
      document.body.classList.add('keyboard-open');
      
      // iOS设备特殊处理
      if (isIOS) {
        // 延迟后确保元素滚动到可见区域
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    });
    
    // 输入框失去焦点
    el.addEventListener('blur', () => {
      // 延迟移除类以确保有过渡效果
      setTimeout(() => {
        document.body.classList.remove('keyboard-open');
        
        // iOS特殊处理：通过微小滚动触发视图重绘
        if (isIOS) {
          setTimeout(() => {
            // 向上滚动1px后再滚回，触发布局重新计算
            const scrollHeight = document.documentElement.scrollTop || document.body.scrollTop || 0;
            window.scrollTo(0, Math.max(scrollHeight - 1, 0));
            window.scrollTo(0, scrollHeight);
          }, 100);
        }
      }, 100);
    });
  });
  
  // 添加用于处理新添加到DOM中的输入元素
  const setupDynamicInputs = () => {
    // 使用 MutationObserver 监听DOM变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            // 检查是否是元素节点
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 查找新添加的输入元素
              const newInputs = node.querySelectorAll('input, textarea, [contenteditable]');
              if (newInputs.length > 0) {
                newInputs.forEach(el => {
                  // 添加与上面相同的事件处理
                  el.addEventListener('focus', () => {
                    document.body.classList.add('keyboard-open');
                    if (isIOS) {
                      setTimeout(() => {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 300);
                    }
                  });
                  
                  el.addEventListener('blur', () => {
                    setTimeout(() => {
                      document.body.classList.remove('keyboard-open');
                      if (isIOS) {
                        setTimeout(() => {
                          const scrollHeight = document.documentElement.scrollTop || document.body.scrollTop || 0;
                          window.scrollTo(0, Math.max(scrollHeight - 1, 0));
                          window.scrollTo(0, scrollHeight);
                        }, 100);
                      }
                    }, 100);
                  });
                });
              }
            }
          });
        }
      });
    });
    
    // 开始观察文档变化
    observer.observe(document.body, { 
      childList: true,
      subtree: true
    });
    
    // 返回清理函数
    return () => {
      observer.disconnect();
      if (viewportFixCleanup) viewportFixCleanup();
    };
  };
  
  // 为动态添加的元素设置事件处理
  const cleanup = setupDynamicInputs();
  
  return cleanup;
}

// 默认导出
export default setupKeyboardFix; 