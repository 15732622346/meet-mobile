/**
 * 虚拟键盘布局修复工具
 * 解决移动端键盘弹出时页面布局问题
 */

// 导入现有的视口修复功能
import { setupViewportFix } from './viewport-debug';

// 保存原始滚动位置的全局变量
let originalScrollPosition = 0;

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
      
      handleKeyboardVisibilityChange(isKeyboardVisible);
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
      
      handleKeyboardVisibilityChange(isKeyboardVisible);
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
  
  // 添加viewport meta标签防止iOS缩放和自动调整
  if (isIOS) {
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  }
  
  // 为所有输入元素添加事件监听
  const inputElements = document.querySelectorAll('input, textarea, [contenteditable]');
  
  inputElements.forEach(el => {
    // 输入框获取焦点
    el.addEventListener('focus', () => {
      const isKeyboardVisible = true;
      document.body.classList.add('keyboard-open');
      
      // iOS设备特殊处理 - 增强型防止页面上推
      if (isIOS) {
        handleKeyboardVisibilityChange(isKeyboardVisible);
      }
    });
    
    // 输入框失去焦点
    el.addEventListener('blur', () => {
      // 延迟移除类以确保有过渡效果
      setTimeout(() => {
        const isKeyboardVisible = false;
        document.body.classList.remove('keyboard-open');
        
        // iOS特殊处理
        if (isIOS) {
          handleKeyboardVisibilityChange(isKeyboardVisible);
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
                    const isKeyboardVisible = true;
                    document.body.classList.add('keyboard-open');
                    if (isIOS) {
                      handleKeyboardVisibilityChange(isKeyboardVisible);
                    }
                  });
                  
                  el.addEventListener('blur', () => {
                    setTimeout(() => {
                      const isKeyboardVisible = false;
                      document.body.classList.remove('keyboard-open');
                      if (isIOS) {
                        handleKeyboardVisibilityChange(isKeyboardVisible);
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
    
    return () => observer.disconnect();
  };
  
  // 设置动态输入监视
  const dynamicInputCleanup = setupDynamicInputs();
  
  return () => {
    if (viewportFixCleanup) viewportFixCleanup();
    if (dynamicInputCleanup) dynamicInputCleanup();
  };
}

// 处理键盘可见性变化的函数
function handleKeyboardVisibilityChange(isVisible) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // 仅处理iOS设备
  if (!isIOS) return;
  
  console.log(`键盘状态变化: ${isVisible ? '显示' : '隐藏'}`);
  
  if (isVisible) {
    // 键盘显示时
    
    // 保存当前滚动位置
    originalScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    console.log('保存原始滚动位置:', originalScrollPosition);
    
    // 找到输入容器
    const chatInputContainer = document.querySelector('.chat-input-container');
    if (chatInputContainer) {
      console.log('找到聊天输入容器');
      
      // 1. 固定输入容器在屏幕底部
      chatInputContainer.style.position = 'fixed';
      chatInputContainer.style.bottom = '0';
      chatInputContainer.style.left = '0';
      chatInputContainer.style.width = '100%';
      chatInputContainer.style.zIndex = '1000';
      chatInputContainer.style.backgroundColor = '#fff';
      
      // 2. 固定主体内容，防止滚动
      document.body.style.position = 'fixed';
      document.body.style.top = `-${originalScrollPosition}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // 3. 确保页面不可滚动
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      
      // 4. 强制阻止默认滚动行为
      document.addEventListener('touchmove', preventScroll, { passive: false });
      
      console.log('已应用键盘弹出样式修复');
    }
  } else {
    // 键盘隐藏时
    
    // 找到输入容器
    const chatInputContainer = document.querySelector('.chat-input-container');
    if (chatInputContainer) {
      // 1. 恢复输入容器的正常样式
      chatInputContainer.style.position = '';
      chatInputContainer.style.bottom = '';
      chatInputContainer.style.left = '';
      chatInputContainer.style.width = '';
      chatInputContainer.style.zIndex = '';
      chatInputContainer.style.backgroundColor = '';
    }
    
    // 2. 恢复主体内容的正常滚动
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    
    // 3. 恢复文档的正常滚动
    document.documentElement.style.overflow = '';
    document.documentElement.style.height = '';
    
    // 4. 移除滚动阻止
    document.removeEventListener('touchmove', preventScroll);
    
    // 5. 恢复原始滚动位置
    console.log('恢复原始滚动位置:', originalScrollPosition);
    setTimeout(() => {
      window.scrollTo(0, originalScrollPosition);
    }, 10);
    
    console.log('已恢复正常样式');
  }
}

// 阻止滚动的函数
function preventScroll(e) {
  // 仅当键盘打开时阻止默认滚动
  if (document.body.classList.contains('keyboard-open')) {
    // 允许输入区域内的滚动
    const target = e.target;
    const chatMessages = document.querySelector('.mobile-chat-messages');
    
    // 如果点击的是聊天消息区域则允许滚动，否则阻止
    if (!(chatMessages && chatMessages.contains(target))) {
      e.preventDefault();
    }
  }
} 