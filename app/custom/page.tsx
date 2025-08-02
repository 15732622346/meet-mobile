"use client";

import { VideoConferenceClientImpl } from './VideoConferenceClientImpl';

export default function CustomRoomConnection() {
  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      <VideoConferenceClientImpl />
      
      {/* 添加全局样式，确保最小化按钮正常工作 */}
      <style jsx global>{`
        /* 浮动视频窗口最小化按钮样式 */
        .floating-wrapper .minimize-btn,
        [style*="position: fixed"] .minimize-btn,
        [style*="position:fixed"] .minimize-btn,
        div[class*="jsx"] .minimize-btn {
          position: absolute !important;
          top: 5px !important;
          right: 5px !important;
          background: rgba(0, 0, 0, 0.6) !important;
          color: white !important;
          border: none !important;
          border-radius: 4px !important;
          width: 24px !important;
          height: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          font-size: 14px !important;
          z-index: 99999 !important;
          font-weight: bold !important;
        }
        
        /* 恢复按钮样式 */
        .restore-camera-btn {
          background: #2c9631 !important;
          color: white !important;
          border: none !important;
          border-radius: 4px !important;
          padding: 8px 12px !important;
          font-size: 14px !important;
          cursor: pointer !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
          position: fixed !important;
          bottom: 70px !important;
          right: 10px !important;
          z-index: 99999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      `}</style>
      
      {/* 添加必要的客户端脚本，为所有浮动窗口添加最小化功能 */}
      <script dangerouslySetInnerHTML={{__html: `
        // 立即执行的函数
        (function() {
          // 在DOM加载完成后执行
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMinimizeFeature);
          } else {
            initMinimizeFeature();
          }
          
          // 初始化最小化功能
          function initMinimizeFeature() {
            console.log('初始化最小化功能');
            // 延迟执行，确保所有元素都已加载
            setTimeout(setupMinimizeButtons, 1000);
            
            // 定期检查新的浮动窗口
            setInterval(setupMinimizeButtons, 1000);
          }
          
          // 设置最小化按钮
          function setupMinimizeButtons() {
            // 查找所有可能的浮动窗口
            const possibleSelectors = [
              'div[style*="position: fixed"]',
              'div[style*="position:fixed"]',
              '.floating-wrapper',
              '.lk-participant-tile',
              'div[class*="jsx"]' // 匹配带有jsx类名的元素
            ];
            
            // 尝试匹配所有可能的浮动窗口
            possibleSelectors.forEach(selector => {
              try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                  // 检查是否包含图像或视频元素，如果是则添加最小化按钮
                  const hasMedia = element.querySelector('img') || element.querySelector('video');
                  const hasRedBorder = element.getAttribute('style')?.includes('border') || false;
                  const isFloatingElement = 
                    element.clientWidth > 30 && 
                    element.clientHeight > 30 && 
                    (hasMedia || hasRedBorder || element.style.borderRadius);
                    
                  if (isFloatingElement && !element.querySelector('.minimize-btn')) {
                    addMinimizeButton(element);
                    console.log('为元素添加了最小化按钮:', element);
                  }
                });
              } catch (e) {
                console.error('查找浮动窗口出错:', e);
              }
            });
          }
          
          // 为元素添加最小化按钮
          function addMinimizeButton(element) {
            // 创建最小化按钮
            const minimizeBtn = document.createElement('button');
            minimizeBtn.className = 'minimize-btn';
            minimizeBtn.textContent = '_';
            minimizeBtn.title = '最小化';
            
            // 添加点击事件
            minimizeBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              e.preventDefault();
              
              // 保存窗口ID
              const windowId = 'window-' + Math.random().toString(36).substr(2, 9);
              element.dataset.windowId = windowId;
              
              // 隐藏窗口
              element.style.display = 'none';
              
              // 创建恢复按钮
              createRestoreButton(windowId);
            });
            
            // 添加按钮到窗口
            element.appendChild(minimizeBtn);
          }
          
          // 创建恢复按钮
          function createRestoreButton(windowId) {
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'restore-camera-btn';
            restoreBtn.textContent = '恢复摄像头区';
            restoreBtn.dataset.targetWindow = windowId;
            
            // 添加恢复功能
            restoreBtn.addEventListener('click', function() {
              const targetWindow = document.querySelector('[data-window-id="' + this.dataset.targetWindow + '"]');
              if (targetWindow) {
                targetWindow.style.display = '';
              }
              this.remove();
            });
            
            // 添加到页面
            document.body.appendChild(restoreBtn);
          }
        })();
      `}} />
    </main>
  );
}
