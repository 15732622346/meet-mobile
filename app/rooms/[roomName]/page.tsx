import * as React from 'react';
import { PageClientImpl } from './PageClientImpl';

// 为静态导出生成一个默认的房间参数
export async function generateStaticParams() {
  // 返回一个默认的房间名称，实际运行时会被客户端路由覆盖
  return [
    { roomName: 'default' }
  ];
}

export default function Page() {
  return <PageClientImpl />;
}
