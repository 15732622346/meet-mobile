@echo off
echo ===================================================
echo 移动版LiveKit客户端构建脚本
echo ===================================================

echo 1. 复制临时TypeScript配置
copy /Y tsconfig.livekit-fix.json tsconfig.json

echo 2. 清理旧的构建文件
rmdir /S /Q .next 2>nul
rmdir /S /Q out 2>nul

echo 3. 设置环境变量
set NEXT_PUBLIC_ENV=production
set STATIC_EXPORT=true

echo 4. 安装依赖
call npm install --legacy-peer-deps

echo 5. 执行静态构建
call npm run build:static

echo 6. 构建完成！
echo 输出文件位于 /out 目录
echo =================================================== 