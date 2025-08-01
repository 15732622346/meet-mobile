'use client';

import * as React from 'react';
import '../styles/globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import '../styles/keyboard-fix.css'; // 导入键盘修复样式
import '../styles/ios-keyboard-override.css'; // iOS键盘行为覆盖
import '../styles/ios-landscape.css'; // 导入iOS横屏样式
import { setupKeyboardFix } from '../lib/keyboard-fix'; // 导入键盘修复函数
import { useEffect } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // 解决输入法键盘弹出再收起后可能出现的各种问题
    if (typeof window !== 'undefined') {
      const cleanup = setupKeyboardFix();
      return cleanup;
    }
  }, []);

  // 处理设备方向变化，显示/隐藏横屏提示覆盖层
  useEffect(() => {
    // 添加横屏提示覆盖层
    const overlay = document.createElement('div');
    overlay.id = 'landscape-overlay';
    overlay.innerHTML = `
      <div class="content">
        <div class="icon"></div>
        <div class="text">请打开设备竖排方向锁定</div>
        <div class="subtext">在设备设置中开启锁定，获得更好体验</div>
      </div>
    `;
    document.body.appendChild(overlay);

    // 检测和处理方向变化
    const handleOrientationChange = () => {
      // 只检测宽高比，判断设备方向
      const isLandscape = window.innerWidth > window.innerHeight;
      
      if (isLandscape) {
        // 设备横屏，显示提示覆盖层
        overlay.style.display = 'block';
        // 锁定滚动
        document.body.style.overflow = 'hidden';
      } else {
        // 设备竖屏，隐藏提示覆盖层
        overlay.style.display = 'none';
        // 恢复滚动
        document.body.style.overflow = '';
      }
    };

    // 初始检查方向
    handleOrientationChange();
    
    // 监听方向变化
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    // 组件卸载时清理
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };
  }, []);

  return (
    <html lang="zh">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body data-lk-theme="default">
        {children}
      </body>
    </html>
  );
}
