'use client';

import { useEffect } from 'react';

/**
 * HideLiveKitCounters组件
 * 此组件会在DOM加载后直接查找并隐藏LiveKit组件中显示的计数器
 * 特别针对chat和participants标题中显示的"0"
 * 移动端版本
 */
export function HideLiveKitCounters() {
  useEffect(() => {
    // 定义一个函数来查找并隐藏计数器
    const hideCounters = () => {
      // 查找Chat标题中的计数器
      const chatHeaderElements = document.querySelectorAll('.lk-chat-header, .chat-header, .mobile-chat-header');
      chatHeaderElements.forEach(header => {
        const spans = header.querySelectorAll('span');
        spans.forEach(span => {
          // 检查是否是只包含数字的span
          if (/^\d+$/.test(span.textContent || '')) {
            span.style.display = 'none';
            span.textContent = '';
            console.log('隐藏了Chat标题中的计数器');
          }
        });
      });

      // 查找参与者列表标题中的计数器
      const participantsHeaderElements = document.querySelectorAll(
        '.lk-participants-header, .participants-header, .right-header, .mobile-mic-section-title'
      );
      participantsHeaderElements.forEach(header => {
        const spans = header.querySelectorAll('span');
        spans.forEach(span => {
          // 检查是否是只包含数字的span
          if (/^\d+$/.test(span.textContent || '')) {
            span.style.display = 'none';
            span.textContent = '';
            console.log('隐藏了参与者列表标题中的计数器');
          }
        });
        
        // 检查标题后面的同级元素
        let nextSibling = header.nextElementSibling;
        while (nextSibling) {
          if (nextSibling instanceof HTMLElement && 
              nextSibling.tagName === 'SPAN' && 
              /^\d+$/.test(nextSibling.textContent || '')) {
            nextSibling.style.display = 'none';
            nextSibling.textContent = '';
            console.log('隐藏了标题后的计数器');
          }
          nextSibling = nextSibling.nextElementSibling;
        }
      });
    };

    // 初始执行
    hideCounters();

    // 设置一个观察器来监视DOM变化，确保新添加的元素也能被处理
    const observer = new MutationObserver(() => {
      hideCounters();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 清理函数
    return () => {
      observer.disconnect();
    };
  }, []);

  // 这个组件不渲染任何内容，只是执行副作用
  return null;
}

export default HideLiveKitCounters; 