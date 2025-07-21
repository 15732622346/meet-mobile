'use client';

import * as React from 'react';
import '../styles/globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import '../styles/keyboard-fix.css'; // 导入键盘修复样式
import '../styles/ios-landscape.css'; // 导入iOS横屏样式
import { setupKeyboardFix } from '../lib/keyboard-fix'; // 导入键盘修复函数

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 在客户端加载后初始化键盘修复
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const cleanup = setupKeyboardFix();
      return cleanup;
    }
  }, []);

  return (
    <html lang="zh">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body data-lk-theme="default">
        {children}
      </body>
    </html>
  );
}
