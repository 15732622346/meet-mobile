/**
 * 图片路径处理工具
 * 
 * 根据环境变量动态生成正确的图片路径
 * 解决开发环境与生产环境路径不一致的问题
 */

// 检测是否为生产环境
const isProduction = process.env.NEXT_PUBLIC_ENV === 'production';

/**
 * 生成正确的图片路径
 * @param path 图片路径，不含前缀，如 '/images/mic.svg'
 * @returns 完整的图片路径
 */
export function getImagePath(path: string): string {
  // 确保路径以斜杠开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 生产环境在路径前添加/mobile前缀
  // 开发环境直接使用路径
  return isProduction ? `/mobile${normalizedPath}` : normalizedPath;
}

/**
 * 使用示例:
 * import { getImagePath } from '../lib/image-path';
 * 
 * <img src={getImagePath('/images/mic.svg')} alt="麦克风" />
 */ 