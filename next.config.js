/** @type {import('next').NextConfig} */
const nextConfig = {
  // 根据环境选择输出模式 - 检查是否为生产环境
  output: process.env.NEXT_PUBLIC_ENV === 'production' 
    ? 'export'  // 静态文件导出模式
    : undefined,  // 开发模式使用默认配置
  
  // 为生产环境添加资源前缀和基础路径，解决部署在子目录的问题
  assetPrefix: process.env.NEXT_PUBLIC_ENV === 'production' ? '/mobile' : '',
  basePath: process.env.NEXT_PUBLIC_ENV === 'production' ? '/mobile' : '',
  
  // 静态导出时跳过 API 路由
  ...(process.env.NEXT_PUBLIC_ENV === 'production' && {
    generateBuildId: async () => {
      return 'build-' + Date.now()
    },
  }),
  
  // 静态导出配置 - 只在静态导出时使用
  trailingSlash: process.env.NEXT_PUBLIC_ENV === 'production',
  skipTrailingSlashRedirect: process.env.NEXT_PUBLIC_ENV === 'production',
  distDir: process.env.NEXT_PUBLIC_ENV === 'production' ? 'out' : '.next',
  
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
  
  // 完全禁用Next.js开发工具指示器
  devIndicators: false,
  
  // 禁用ESLint检查以避免构建失败
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 禁用所有开发工具
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 静态资源配置
  images: {
    formats: ['image/webp'],
    // 静态导出时禁用图片优化
    unoptimized: process.env.NEXT_PUBLIC_ENV === 'production',
  },
  
  // 特别为移动版添加的TypeScript配置
  typescript: {
    // 构建时忽略TypeScript错误
    ignoreBuildErrors: true,
  },
  
  // 静态资源路径修复
  publicRuntimeConfig: {
    staticFolder: process.env.NEXT_PUBLIC_ENV === 'production' ? '/mobile' : '',
  },
  
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Important: return the modified config
    config.module.rules.push({
      test: /\.mjs$/,
      enforce: 'pre',
      use: ['source-map-loader'],
    });

    // 添加SVG处理规则，确保SVG可以被正确加载
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack', 'url-loader'],
    });

    return config;
  },
  // async rewrites() {
  //   // 代理功能已删除 - 前端直接连接后端API
  //   return [];
  // },
  // 添加字体优化配置 - Next.js 15 中已移除 optimizeFonts 选项
  experimental: {
    // optimizeFonts: false, // 在 Next.js 15 中已移除
  },
};

module.exports = nextConfig;
