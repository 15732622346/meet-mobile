// 前端统一配置文件
// 生产环境时修改这个文件即可

export const API_CONFIG = {
  // 后端API服务器地址
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://meet.pge006.com/admin',
  
  // LiveKit服务器配置 - 使用NEXT_PUBLIC_前缀以便在客户端访问
  LIVEKIT: {
    URL: process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880',
    API_KEY: process.env.NEXT_PUBLIC_LIVEKIT_API_KEY || 'devkey',
    API_SECRET: process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET || 'developmentSecretKeyFor32Chars2024',
  },
  
  // API端点配置
  ENDPOINTS: {
    // 用户认证
    LOGIN: '/login.php',
    REGISTER: '/register.php',
    JOIN_ROOM: '/join-room.php',
    CLEAR_SESSION: '/clear-session.php',
    
    // 控麦系统 - LiveKit原生API
    REQUEST_MIC: '/api/request-mic.php',      // 申请麦位
    APPROVE_MIC: '/api/approve-mic.php',      // 批准/拒绝麦位
    KICK_MIC: '/api/kick-mic.php',            // 踢下麦位
    GET_PARTICIPANT_ROLES: '/get-participant-roles.php', // 获取参与者角色
    
    // 房间管理
    CREATE_ROOM: '/create-room.php',
    DELETE_ROOM: '/delete-room.php',
    GET_TOKEN_PUBLIC: '/get-token-public.php',
    ROOM_INFO: '/room-info.php',
  }
};

// 获取完整API URL的工具函数
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// 环境配置检查
export function validateConfig(): boolean {
  const requiredEnvVars = [
    'NEXT_PUBLIC_LIVEKIT_URL',
    'NEXT_PUBLIC_LIVEKIT_API_KEY', 
    'NEXT_PUBLIC_LIVEKIT_API_SECRET'
  ];
  
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('Missing environment variables:', missing);
    console.warn('Using default development values');
    console.warn('Current LIVEKIT_URL:', process.env.NEXT_PUBLIC_LIVEKIT_URL);
  }
  
  return missing.length === 0;
}

// 生产环境配置示例
export const PRODUCTION_CONFIG = {
  // 生产环境示例配置
  BASE_URL: 'https://your-domain.com/api',
  LIVEKIT_URL: 'wss://your-livekit-domain.com',
  // 其他生产环境配置...
}; 