@echo off
echo 启动前端开发/测试环境...

REM 检查Node.js环境
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未安装Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 复制开发环境配置
if not exist .env.local (
    copy .env.development .env.local
    echo 已复制开发环境配置文件
)

REM 安装依赖
if not exist node_modules (
    echo 安装项目依赖...
    npm install
)

REM 启动开发服务器
echo 启动Next.js开发服务器 (端口: 3000)
npm run dev

pause 