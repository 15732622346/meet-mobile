@echo off
echo 启动前端生产环境...

REM 检查Node.js环境
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未安装Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 复制生产环境配置
copy .env.production .env.local
echo 已复制生产环境配置文件

REM 安装依赖
if not exist node_modules (
    echo 安装项目依赖...
    npm install
)

REM 构建生产版本
echo 构建生产版本...
npm run build:prod

REM 启动生产服务器
echo 启动Next.js生产服务器 (端口: 3000)
npm run start:prod

pause 