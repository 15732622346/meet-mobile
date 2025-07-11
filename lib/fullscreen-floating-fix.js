/**
 * 全屏模式浮动窗口修复
 * 解决浏览器全屏API限制导致的浮动窗口不显示问题
 */

export function initFullscreenFloatingFix() {
  // 检查是否在浏览器环境
  if (typeof document === 'undefined') return;

  // 监听全屏变化事件
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari兼容
  document.addEventListener('mozfullscreenchange', handleFullscreenChange); // Firefox兼容
  document.addEventListener('MSFullscreenChange', handleFullscreenChange); // IE兼容
  
  // 全屏变化时处理浮动窗口
  function handleFullscreenChange() {
    // 获取当前全屏元素
    const fullscreenElement = 
      document.fullscreenElement || 
      document.webkitFullscreenElement || 
      document.mozFullScreenElement ||
      document.msFullscreenElement;
    
    // 获取所有浮动窗口
    const floatingWrappers = document.querySelectorAll('.floating-wrapper');
    
    if (fullscreenElement && floatingWrappers.length > 0) {
      // 全屏模式：将浮动窗口移动到全屏元素内
      console.log('进入全屏模式，移动浮动窗口到全屏元素内');
      
      floatingWrappers.forEach(wrapper => {
        // 保存原始信息，以便退出全屏时恢复
        if (!wrapper.dataset.originalInfo) {
          const originalInfo = {
            parent: wrapper.parentNode ? wrapper.parentNode.id || 'body' : 'body',
            position: {
              left: wrapper.style.left,
              top: wrapper.style.top,
              zIndex: wrapper.style.zIndex
            }
          };
          
          wrapper.dataset.originalInfo = JSON.stringify(originalInfo);
          
          // 调整z-index，确保在全屏元素内部仍然可见
          wrapper.style.zIndex = '10000';
          
          // 将浮动窗口移动到全屏元素内部
          fullscreenElement.appendChild(wrapper);
        }
      });
    } else {
      // 退出全屏模式：恢复浮动窗口的原始位置
      floatingWrappers.forEach(wrapper => {
        if (wrapper.dataset.originalInfo) {
          try {
            const originalInfo = JSON.parse(wrapper.dataset.originalInfo);
            
            // 恢复原始父元素
            let originalParent;
            if (originalInfo.parent === 'body') {
              originalParent = document.body;
            } else {
              originalParent = document.getElementById(originalInfo.parent);
              if (!originalParent) originalParent = document.body;
            }
            
            // 恢复到原始父元素
            originalParent.appendChild(wrapper);
            
            // 恢复原始样式
            wrapper.style.left = originalInfo.position.left;
            wrapper.style.top = originalInfo.position.top;
            wrapper.style.zIndex = originalInfo.position.zIndex;
            
            // 清除临时数据
            delete wrapper.dataset.originalInfo;
            
            console.log('退出全屏模式，恢复浮动窗口位置');
          } catch (err) {
            console.error('恢复浮动窗口位置时出错:', err);
          }
        }
      });
    }
  }

  // 记录初始化完成
  console.log('全屏浮动窗口修复已初始化');
} 