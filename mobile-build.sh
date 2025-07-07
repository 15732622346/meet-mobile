#!/bin/bash

echo "==================================================="
echo "移动版LiveKit客户端构建脚本"
echo "==================================================="

echo "1. 复制临时TypeScript配置"
cp -f tsconfig.livekit-fix.json tsconfig.json

echo "2. 清理旧的构建文件"
rm -rf .next
rm -rf out

echo "3. 设置环境变量"
export NEXT_PUBLIC_ENV=production
export STATIC_EXPORT=true

echo "4. 安装依赖"
npm install --legacy-peer-deps

echo "5. 执行静态构建"
npm run build:static

echo "6. 构建完成！"
echo "输出文件位于 /out 目录"
echo "===================================================" 