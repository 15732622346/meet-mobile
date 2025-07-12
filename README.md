<a href="https://livekit.io/">
  <img src="./.github/assets/livekit-mark.png" alt="LiveKit logo" width="100" height="100">
</a>

# LiveKit Meet

<p>
  <a href="https://meet.livekit.io"><strong>Try the demo</strong></a>
  •
  <a href="https://github.com/livekit/components-js">LiveKit Components</a>
  •
  <a href="https://docs.livekit.io/">LiveKit Docs</a>
  •
  <a href="https://livekit.io/cloud">LiveKit Cloud</a>
  •
  <a href="https://blog.livekit.io/">Blog</a>
</p>

<br>

LiveKit Meet is an open source video conferencing app built on [LiveKit Components](https://github.com/livekit/components-js), [LiveKit Cloud](https://cloud.livekit.io/), and Next.js. It's been completely redesigned from the ground up using our new components library.

![LiveKit Meet screenshot](./.github/assets/livekit-meet.jpg)

## Tech Stack

- This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).
- App is built with [@livekit/components-react](https://github.com/livekit/components-js/) library.

## Demo

Give it a try at https://meet.livekit.io.

## Dev Setup

Steps to get a local dev setup up and running:

1. Run `pnpm install` to install all dependencies.
2. Copy `.env.example` in the project root and rename it to `.env.local`.
3. Update the missing environment variables in the newly created `.env.local` file.
4. Run `pnpm dev` to start the development server and visit [http://localhost:3000](http://localhost:3000) to see the result.
5. Start development 🎉

## 移动浏览器视口问题解决方案

### 问题描述

在移动浏览器中，使用 `height: 100vh` 时，页面底部可能会被浏览器地址栏遮挡。这是因为：

1. 移动浏览器中的 `vh` 单位基于"理论视口高度"，不考虑浏览器界面（如地址栏、导航栏）占用的空间
2. 当用户滚动页面时，地址栏可能会收起或展开，导致可视区域高度变化
3. iOS Safari 和一些 Android 浏览器中此问题尤为明显

### 解决方案

本项目实现了完整的视口高度修复解决方案：

#### 1. CSS 变量替代 vh 单位

```css
:root {
  --vh: 1vh;
}

.element {
  height: 100vh; /* 兼容性回退 */
  height: calc(var(--vh, 1vh) * 100);
}
```

#### 2. JavaScript 计算实际视口高度

```js
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// 监听窗口大小变化和方向变化
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);
```

#### 3. 底部对齐布局方案

通过 `position: fixed; bottom: 0;` 确保页面从底部对齐，不被地址栏遮挡：

```css
body.bottom-aligned .mobile-layout-container {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--vh, 1vh) * 100);
  display: flex;
  flex-direction: column;
}
```

### 使用方法

1. 引入样式和脚本：

```jsx
import { setupViewportFix, enableBottomAlignment } from '../lib/viewport-debug';
import '../styles/viewport-fix.css';

// 在组件中初始化
useEffect(() => {
  const cleanup = setupViewportFix();
  enableBottomAlignment(); // 如需底部对齐
  return cleanup;
}, []);
```

2. 应用于布局容器：

```jsx
<div className="mobile-layout-container">
  <header className="mobile-header">...</header>
  <main className="mobile-content">...</main>
  <footer className="mobile-footer">...</footer>
</div>
```

3. 调试工具（可选）：

```jsx
import { ViewportDebug } from '../lib/viewport-debug';

// 启用调试工具
useEffect(() => {
  return ViewportDebug();
}, []);
```

### 文件结构

- `lib/viewport-debug.js` - 核心功能模块
- `styles/viewport-fix.css` - 视口修复样式
- `app/mobile/page.tsx` - 示例实现
