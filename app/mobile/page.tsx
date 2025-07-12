'use client';

import { useEffect, useState } from 'react';
import { setupViewportFix, ViewportDebug, enableBottomAlignment } from '../../lib/viewport-debug';
import '../../styles/viewport-fix.css';
import '../mobile/mobile.css';

export default function MobilePage() {
  const [debugMode, setDebugMode] = useState(false);
  
  // 设置视口修复
  useEffect(() => {
    const cleanup = setupViewportFix();
    // 启用底部对齐模式
    enableBottomAlignment();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);
  
  // 启用调试模式
  useEffect(() => {
    if (debugMode) {
      return ViewportDebug();
    }
  }, [debugMode]);
  
  return (
    <div className="mobile-layout-container">
      {/* 页面头部 */}
      <header className="mobile-header">
        <h1>移动端视频会议</h1>
      </header>
      
      {/* 主要内容区 */}
      <main className="mobile-content">
        <div className="content-container">
          <p>主要内容区域 - 自动填充剩余空间</p>
          <p>解决了地址栏遮挡问题的移动页面</p>
        </div>
      </main>
      
      {/* 页面底部 */}
      <footer className="mobile-footer">
        <div className="footer-controls">
          <button onClick={() => setDebugMode(!debugMode)}>
            {debugMode ? '关闭调试' : '打开调试'}
          </button>
          <span>底部控制区 - 不会被地址栏遮挡</span>
        </div>
      </footer>
    </div>
  );
} 