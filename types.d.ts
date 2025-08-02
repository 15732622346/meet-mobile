import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// 解决模块导入问题
declare module '@livekit/components-react' {
  export * from '@livekit/components-react';
}

declare module 'livekit-client' {
  export * from 'livekit-client';
} 