import * as React from 'react';
import { useChat, useLocalParticipant, useParticipants, useRoomContext } from '@livekit/components-react';
import { isUserDisabled, isHostOrAdmin, shouldShowInMicList } from '../lib/token-utils';
import { getImagePath } from '../lib/image-path';
import { API_CONFIG } from '../lib/config';
import { RoomEvent } from 'livekit-client';
// 导入专用样式文件
import '../styles/MobileChat.css';
// 导入toast通知
import toast, { Toaster } from 'react-hot-toast';
// 移除调试功能导入
// import { ViewportDebug } from '../lib/viewport-debug';

// 创建统一的toast通知函数
const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const options = {
    duration: 3000,
    position: 'top-center' as const,
    style: {
      padding: '12px 16px',
      borderRadius: '8px',
      background: type === 'success' ? '#10b981' : 
                 type === 'error' ? '#ef4444' : 
                 type === 'warning' ? '#f59e0b' : '#3b82f6',
      color: 'white',
      fontWeight: '500',
      maxWidth: '90%',
      wordBreak: 'break-word' as const
    },
    icon: type === 'success' ? '✅' : 
          type === 'error' ? '❌' : 
          type === 'warning' ? '⚠️' : 'ℹ️',
  };
  
  toast(message, options);
};

export function MobileChat({ userRole = 1, maxMicSlots = 5 }) {
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const roomCtx = useRoomContext();
  const [message, setMessage] = React.useState('');
  const [inputFocused, setInputFocused] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // 添加键盘状态跟踪
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  
  // 移除调试模式状态
  // const [debugMode, setDebugMode] = React.useState(false);
  
  // 添加房间数据加载状态
  const [dataLoaded, setDataLoaded] = React.useState(false);
  
  // 检测数据是否加载完成
  React.useEffect(() => {
    // 当接收到roomCtx的metadata或者participants数量超过1时，认为数据已加载
    if (roomCtx?.metadata || participants.length > 1) {
      setDataLoaded(true);
    }
  }, [roomCtx?.metadata, participants.length]);
  
  // 与PC端保持一致，默认启用全局禁言
  const [chatGlobalMute, setChatGlobalMute] = React.useState(true);

  // 检查用户是否被禁用
  const isDisabled = localParticipant && isUserDisabled(localParticipant.attributes || {});
  
  // 检查当前用户是否为主持人
  const isHost = React.useMemo(() => {
    if (!localParticipant) return false;
    const role = parseInt(localParticipant.attributes?.role || '1');
    return role >= 2; // 主持人或管理员
  }, [localParticipant]);
  
  // 检查是否有主持人在线
  const hasHost = React.useMemo(() => {
    return participants.some(p => {
      const attributes = p.attributes || {};
      const role = parseInt(attributes.role || '1');
      return role >= 2; // 主持人或管理员
    });
  }, [participants]);
  
  // 计算麦位状态
  const micStats = React.useMemo(() => {
    // 麦位列表中显示的用户数量
    const micListCount = participants.filter(p => 
      shouldShowInMicList(p.attributes || {})
    ).length;
    
    // 检查是否已加载完成
    if (!dataLoaded) {
      console.log('🔄 数据未完全加载，等待获取麦位配置...');
      return {
        micListCount,
        maxSlots: 0 // 未加载前显示0，不使用默认值
      };
    }
    
    console.log('✅ 数据加载完成，当前麦位信息:', {
      micListCount,
      maxSlots: maxMicSlots
    });
    
    return {
      micListCount,
      maxSlots: maxMicSlots
    };
  }, [participants, maxMicSlots, dataLoaded]);
  
  // 监听全局禁言状态变化
  React.useEffect(() => {
    if (!roomCtx) return;
    
    // 当有参与者加入或属性变化时，检查全局禁言状态
    const handleAttributesChanged = () => {
      // 寻找主持人
      const hostParticipant = participants.find(p => {
        const role = parseInt(p.attributes?.role || '1');
        return role >= 2; // 主持人或管理员
      });
      
      if (hostParticipant && hostParticipant.attributes?.chatGlobalMute) {
        const muteState = hostParticipant.attributes.chatGlobalMute === "true";
        console.log(`📢 从主持人属性获取聊天禁言状态: ${muteState ? '禁言' : '恢复发言'}`);
        setChatGlobalMute(muteState);
      }
    };
    
    // 初始检查
    handleAttributesChanged();
    
    // 添加事件监听
    roomCtx.on(RoomEvent.ParticipantConnected, handleAttributesChanged);
    roomCtx.on(RoomEvent.ParticipantMetadataChanged, handleAttributesChanged);
    roomCtx.on(RoomEvent.ParticipantAttributesChanged, handleAttributesChanged);
    
    return () => {
      roomCtx.off(RoomEvent.ParticipantConnected, handleAttributesChanged);
      roomCtx.off(RoomEvent.ParticipantMetadataChanged, handleAttributesChanged);
      roomCtx.off(RoomEvent.ParticipantAttributesChanged, handleAttributesChanged);
    };
  }, [roomCtx, participants]);
  
  // 监听本地参与者的麦克风状态和权限变化
  React.useEffect(() => {
    if (!localParticipant || !roomCtx) return;
    
    // 保存上一次的状态，用于比较变化
    let previousState = {
      micStatus: localParticipant.attributes?.mic_status || 'off_mic',
      canPublish: !!localParticipant.permissions?.canPublish
    };
    
    // 检查麦克风可用性的条件
    const isMicAvailable = (status, canPublish) => {
      return status === 'on_mic' && canPublish === true;
    };
    
    const handleStateChange = () => {
      // 获取当前状态
      const currentMicStatus = localParticipant.attributes?.mic_status || 'off_mic';
      const currentCanPublish = !!localParticipant.permissions?.canPublish;
      
      console.log('🔍 属性变化检测:', {
        micStatus: {previous: previousState.micStatus, current: currentMicStatus},
        canPublish: {previous: previousState.canPublish, current: currentCanPublish}
      });
      
      // 检查是否从不可用变为可用
      const wasMicAvailable = isMicAvailable(previousState.micStatus, previousState.canPublish);
      const isMicNowAvailable = isMicAvailable(currentMicStatus, currentCanPublish);
      
      if (!wasMicAvailable && isMicNowAvailable) {
        console.log('🎉 麦克风权限已满足！', {
          micStatus: currentMicStatus,
          canPublish: currentCanPublish
        });
        showToast('您的上麦申请已被批准！现在可以使用麦克风了。', 'success');
      }
      
      // 更新上一次状态
      previousState = {
        micStatus: currentMicStatus,
        canPublish: currentCanPublish
      };
    };
    
    // 添加事件监听
    localParticipant.on('attributesChanged', handleStateChange);
    
    // 监听房间级别的权限变更事件
    roomCtx.on(RoomEvent.ParticipantPermissionsChanged, handleStateChange);
    
    // 初始检查
    handleStateChange();
    
    // 设置定期检查，因为权限变化可能没有直接的事件通知
    const intervalCheck = setInterval(() => {
      const currentCanPublish = !!localParticipant.permissions?.canPublish;
      if (previousState.canPublish !== currentCanPublish) {
        console.log('🔄 定期检查发现权限变化:', {
          previous: previousState.canPublish,
          current: currentCanPublish
        });
        handleStateChange();
      }
    }, 1000); // 每秒检查一次
    
    return () => {
      localParticipant.off('attributesChanged', handleStateChange);
      roomCtx.off(RoomEvent.ParticipantPermissionsChanged, handleStateChange);
      clearInterval(intervalCheck);
    };
  }, [localParticipant, roomCtx]);
  
  // 监听用户属性变化，实时响应禁用状态
  React.useEffect(() => {
    if (isDisabled && message) {
      setMessage(''); // 如果用户被禁用，清空消息框
    }
  }, [isDisabled]);

  React.useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 检查消息是否包含敏感词
  const checkBlockedWords = async (message: string): Promise<{blocked: boolean, word?: string}> => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/check-blocked-words.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('敏感词检查失败:', error);
      return { blocked: false }; // 出错时不阻止消息发送
    }
  };
  
  // 判断用户是否可以发送消息
  const canSendMessage = () => {
    // 被禁用的用户不能发言
    if (isDisabled) return false;
    
    // 游客不能发言
    const userIsGuest = userRole === 0;
    if (userIsGuest) return false;
    
    // 主持人可以忽略全局禁言
    if (isHost) return true;
    
    // 普通用户受全局禁言影响
    return !chatGlobalMute;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSending) return;
    
    // 游客特殊处理：显示注册提示
    const userIsGuest = userRole === 0;
    if (userIsGuest) {
      showToast('游客需要注册为会员才能发言!', 'warning');
      return;
    }
    
    // 检查是否可以发言
    if (!canSendMessage()) {
      if (isDisabled) {
        showToast('您已被禁用，无法发送消息', 'error');
      } else if (chatGlobalMute) {
        showToast('全员禁言中，只有主持人可以发言', 'info');
      }
      return;
    }
    
    // 敏感词检查
    const blockedResult = await checkBlockedWords(message);
    if (blockedResult.blocked) {
      showToast(`消息包含敏感词"${blockedResult.word}"，已被屏蔽`, 'error');
      return;
    }
    
    // 发送消息
      send(message);
      setMessage('');
    
      // 发送后让输入框失去焦点
      const inputElement = document.querySelector('.input-field') as HTMLInputElement;
      if (inputElement) {
        inputElement.blur();
        setInputFocused(false); // 手动设置状态为未聚焦
      }
  };

  // 获取麦克风可用性状态 - 完全与PC端保持一致
  const getMicAvailability = React.useMemo(() => {
    if (!localParticipant) return { available: false, reason: '加载中...' };
    
    const attributes = localParticipant.attributes || {};
    const micStatus = attributes.mic_status || 'off_mic';
    const role = parseInt(attributes.role || '1');
    const canPublish = !!localParticipant.permissions?.canPublish;
    
    // 调试日志
    console.log('🔍 麦克风可用性检查:', {
      micStatus,
      role,
      canPublish,
      isDisabled
    });
    
    // 被禁用的用户不能使用麦克风
    if (isDisabled) {
      return { available: false, reason: '您已被禁用' };
    }
    
    // 主持人和管理员总是可以使用麦克风
    if (role >= 2) {
      return { available: true, reason: '' };
    }
    
    // 游客不能使用麦克风
    if (role === 0) {
      return { available: false, reason: '游客需要注册为会员' };
    }
    
    // 已静音状态的用户不能使用麦克风
    if (micStatus === 'muted') {
      return { available: false, reason: '您已被主持人禁麦' };
    }
    
    // 普通用户需要检查麦克风状态
    // 1. 已上麦的用户可以使用
    if (micStatus === 'on_mic') {
      // 关键改进：检查是否有发布权限
      if (canPublish) {
        console.log('✅ 麦克风可用：已上麦且有发布权限');
        return { available: true, reason: '' };
      } else {
        console.warn('⚠️ 检测到权限不一致：已上麦但无发布权限');
        return { available: false, reason: '权限不一致，请刷新页面' };
      }
    }
    
    // 其他情况不可用
    return { available: false, reason: '需要申请上麦' };
  }, [localParticipant, isDisabled, localParticipant?.permissions, localParticipant?.attributes]);

  // 添加一个强制刷新状态的机制
  const [forceUpdate, setForceUpdate] = React.useState(0);
  
  // 监听权限变化，强制更新UI
  React.useEffect(() => {
    if (!localParticipant) return;
    
    const checkPermissions = () => {
      const canPublish = !!localParticipant.permissions?.canPublish;
      const micStatus = localParticipant.attributes?.mic_status;
      
      // 当权限满足条件时，强制更新UI
      if (canPublish && micStatus === 'on_mic') {
        console.log('🔄 强制更新UI - 权限已满足');
        setForceUpdate(prev => prev + 1);
      }
    };
    
    // 初始检查
    checkPermissions();
    
    // 设置定期检查
    const intervalId = setInterval(checkPermissions, 500);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [localParticipant]);

  // 处理麦克风控制 - 改进为与PC端一致的实现
  const handleMicControl = async () => {
    if (!localParticipant) return;
    
    const attributes = localParticipant.attributes || {};
    const role = parseInt(attributes.role || '1');
    
    // 调试日志
    console.log('🎯 麦克风按钮点击', {
      participant: localParticipant.identity,
      enabled: localParticipant.isMicrophoneEnabled,
      attributes: attributes,
      permissions: localParticipant.permissions,
      canPublish: localParticipant.permissions?.canPublish
    });
    
    // 游客点击提示注册
    if (role === 0) {
      if (confirm('游客需要注册为会员才能使用麦克风功能，是否前往注册登录？')) {
        window.location.reload();
      }
      return;
    }
    
    // 检查麦克风可用性
    if (!getMicAvailability.available) {
      if (attributes.mic_status === 'requesting') {
        showToast('您的上麦申请正在等待主持人批准', 'info');
      } else if (attributes.mic_status === 'muted') {
        showToast('您已被主持人禁麦', 'error');
      } else if (attributes.mic_status === 'on_mic' && !localParticipant.permissions?.canPublish) {
        showToast('检测到权限不一致，将尝试修复。如果问题持续，请刷新页面', 'warning');
      } else {
        showToast('您需要先申请上麦权限才能使用麦克风', 'info');
      }
      return;
    }
    
    // 添加状态一致性检查和修复 - 与PC端保持一致
    if (attributes.mic_status === 'on_mic' && !localParticipant.permissions?.canPublish) {
      console.warn('🔧 检测到状态不一致：已上麦但无发布权限，尝试修复');
      
      try {
        const apiUrl = `${API_CONFIG.BASE_URL}/admin-control-participants.php`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          credentials: 'include',
          body: new URLSearchParams({
            action: 'approve_mic',
            room_name: roomCtx?.name || '',
            target_identity: localParticipant.identity || ''
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ 权限修复成功，等待权限更新生效...');
            showToast('权限修复成功，请稍后再试', 'success');
            
            // 强制更新UI
            setForceUpdate(prev => prev + 1);
            
            // 等待权限生效
            await new Promise(resolve => setTimeout(resolve, 2000));
            return;
          } else {
            console.warn('⚠️ 权限修复失败:', result.error);
            showToast('权限修复失败，请刷新页面重试', 'error');
            return;
          }
        }
      } catch (error) {
        console.error('❌ 权限修复异常:', error);
        showToast('权限修复异常，请刷新页面重试', 'error');
        return;
      }
    }
    
    // 执行麦克风切换
    try {
      await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
      console.log('✅ 麦克风状态切换成功');
    } catch (error) {
      console.error('❌ 麦克风操作失败:', error);
      
      if (error instanceof Error && error.message.includes('insufficient permissions')) {
        console.error('🚨 权限不足详情:', {
          error: error.message,
          permissions: localParticipant.permissions,
          attributes: localParticipant.attributes
        });
        showToast(`⚠️ 麦克风权限不足！\n\n可能的解决方案：\n1. 联系主持人重新批准上麦\n2. 刷新页面重新登录\n3. 检查您的用户角色权限\n\n错误详情: ${error.message}`, 'warning');
      } else {
        showToast(`❌ 麦克风操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
      }
    }
  };

  // 检查麦克风申请可用性
  const getMicRequestAvailability = React.useMemo(() => {
    if (!localParticipant) return { available: false, reason: '加载中...' };
    
    const attributes = localParticipant.attributes || {};
    const micStatus = attributes.mic_status || 'off_mic';
    const role = parseInt(attributes.role || '1');
    
    // 被禁用的用户不能申请上麦
    if (isDisabled) {
      return { available: false, reason: '您已被禁用' };
    }
    
    // 游客不能申请上麦
    if (role === 0) {
      return { available: false, reason: '游客需要注册为会员' };
    }
    
    // 主持人和管理员不需要申请上麦
    if (role >= 2) {
      return { available: false, reason: '主持人无需申请' };
    }
    
    // 无主持人在线
    if (!hasHost) {
      return { available: false, reason: '等待主持人进入' };
    }
    
    // 麦位已满
    if (micStats.micListCount >= micStats.maxSlots) {
      return { available: false, reason: `麦位已满 (${micStats.micListCount}/${micStats.maxSlots})` };
    }
    
    // 已经在申请中
    if (micStatus === 'requesting') {
      return { available: false, reason: '申请中...' };
    }
    
    // 已经上麦了
    if (micStatus === 'on_mic') {
      return { available: false, reason: '已在麦位上' };
    }
    
    // 可以申请上麦
    return { available: true, reason: `申请上麦 (${micStats.micListCount}/${micStats.maxSlots})` };
  }, [localParticipant, isDisabled, hasHost, micStats]);

  // 处理申请上麦
  const handleMicRequest = async () => {
    if (!localParticipant) return;
    
    const attributes = localParticipant.attributes || {};
    const role = parseInt(attributes.role || '1');
    
    // 游客点击提示注册
    if (role === 0) {
      if (confirm('游客需要注册为会员才能申请上麦，是否前往注册登录？')) {
        window.location.reload();
      }
      return;
    }
    
    // 检查申请可用性
    if (!getMicRequestAvailability.available) {
      if (attributes.mic_status === 'requesting') {
        showToast('您已经申请上麦，等待主持人批准', 'info');
      } else if (attributes.mic_status === 'on_mic') {
      showToast('您已在麦位上', 'info');
      } else if (!hasHost) {
        showToast('请等待主持人进入房间后再申请上麦', 'info');
      } else if (micStats.micListCount >= micStats.maxSlots) {
        showToast(`麦位已满！当前麦位列表已有 ${micStats.micListCount}/${micStats.maxSlots} 人，请等待有人退出后再申请。`, 'warning');
      } else if (isDisabled) {
        showToast('您已被禁用，无法申请上麦', 'error');
      }
      return;
    }
    
    try {
      // 更新麦克风状态为申请中
      await localParticipant.setAttributes({
        ...attributes,
        mic_status: 'requesting',
        display_status: 'visible',
        request_time: Date.now().toString(),
        last_action: 'request',
        user_name: localParticipant.identity
      });
      
      showToast('已发送申请，等待主持人批准', 'info');
    } catch (error) {
      console.error('申请上麦失败:', error);
      showToast('申请上麦失败，请刷新页面重试', 'error');
    }
  };

  // 移除宽度调试信息状态和函数
  // const [widthDebugInfo, setWidthDebugInfo] = React.useState({
  //   formWrapper: '未找到',
  //   inputGrid: '未找到',
  //   inputField: '未找到',
  //   sendButton: '未找到',
  //   windowWidth: window.innerWidth
  // });
  
  // 更新宽度调试信息
  // const updateWidthDebugInfo = React.useCallback(() => {
  //   const formWrapper = document.querySelector('.form-wrapper');
  //   const inputGrid = document.querySelector('.input-grid');
  //   const inputField = document.querySelector('.input-field');
  //   const sendButton = document.querySelector('.send-button');
    
  //   setWidthDebugInfo({
  //     formWrapper: formWrapper ? `${formWrapper.offsetWidth}px` : '未找到',
  //     inputGrid: inputGrid ? `${inputGrid.offsetWidth}px` : '未找到',
  //     inputField: inputField ? `${inputField.offsetWidth}px` : '未找到',
  //     sendButton: sendButton ? `${sendButton.offsetWidth}px` : '未找到',
  //     windowWidth: window.innerWidth
  //   });
  // }, []);
  
  // 在组件挂载、窗口大小变化、调试模式变化时更新宽度信息
  // React.useEffect(() => {
  //   updateWidthDebugInfo();
  //   window.addEventListener('resize', updateWidthDebugInfo);
  //   return () => window.removeEventListener('resize', updateWidthDebugInfo);
  // }, [updateWidthDebugInfo]);

  // 处理输入框焦点事件
  const handleInputFocus = () => {
    setInputFocused(true);
    setKeyboardVisible(true); // 设置键盘为可见状态
    
    // 设置viewport元标签，禁止缩放
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
    
    // 仅限制聊天区域的滚动，不影响全局
    const chatContainer = document.querySelector('.mobile-chat');
    if (chatContainer) {
      chatContainer.classList.add('keyboard-active');
      (chatContainer as HTMLElement).style.overflow = 'hidden';
      (chatContainer as HTMLElement).style.maxWidth = '100%';
      (chatContainer as HTMLElement).style.overflowX = 'hidden';
    }
    
    // 使表单充满屏幕宽度，而不是固定宽度
    const formWrapper = document.querySelector('.form-wrapper');
    const inputGrid = document.querySelector('.input-grid');
    const inputField = document.querySelector('.input-field');
    
    if (formWrapper) {
      // 设置为100%宽度，充满屏幕
      formWrapper.setAttribute('style', 'width: 100% !important; max-width: 100% !important;');
    }
    
    if (inputGrid) {
      // 确保输入网格也是100%宽度
      inputGrid.setAttribute('style', 'width: 100% !important; max-width: 100% !important;');
    }
    
    if (inputField) {
      // 确保输入框有足够宽度，但留出发送按钮的空间
      inputField.setAttribute('style', 'width: calc(100% - 70px) !important; max-width: calc(100% - 70px) !important;');
    }
  };

  // 处理输入框失去焦点事件
  const handleInputBlur = () => {
    // 如果输入框有内容，保持焦点状态
    if (message.trim()) {
      return;
    }
    setInputFocused(false);
    setKeyboardVisible(false); // 设置键盘为隐藏状态
    
    // 恢复viewport设置
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1, viewport-fit=cover'
      );
    }
    
    // 恢复聊天区域的滚动设置
    const chatContainer = document.querySelector('.mobile-chat');
    if (chatContainer) {
      chatContainer.classList.remove('keyboard-active');
      (chatContainer as HTMLElement).style.overflow = '';
      (chatContainer as HTMLElement).style.maxWidth = '';
      (chatContainer as HTMLElement).style.overflowX = '';
    }
    
    // 恢复为全屏宽度样式，而不是移除样式
    const formWrapper = document.querySelector('.form-wrapper');
    const inputGrid = document.querySelector('.input-grid');
    const inputField = document.querySelector('.input-field');
    
    if (formWrapper) {
      formWrapper.setAttribute('style', 'width: 100% !important; max-width: 100% !important;');
    }
    
    if (inputGrid) {
      inputGrid.setAttribute('style', 'width: 100% !important; max-width: 100% !important;');
    }
    
    if (inputField) {
      inputField.setAttribute('style', 'width: calc(100% - 70px) !important; max-width: calc(100% - 70px) !important;');
    }
  };

  // 添加窗口大小调整监听器 - 用于处理键盘弹出
  React.useEffect(() => {
    const handleResize = () => {
      // 一种检测移动端键盘弹出的简单方法
      // 如果窗口高度明显小于之前，可能是键盘弹出了
      if (window.innerHeight < window.outerHeight * 0.75) {
        setKeyboardVisible(true);
      } else {
        // 只有在未聚焦输入框时重置键盘状态
        if (!inputFocused) {
          setKeyboardVisible(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [inputFocused]);
  
  // 获取麦克风按钮类名
  const getMicButtonClass = () => {
    if (!localParticipant) return 'mobile-control-svg off';
    
    const attributes = localParticipant.attributes || {};
    const role = parseInt(attributes.role || '1');
    const isEnabled = localParticipant.isMicrophoneEnabled;
    
    // 构建类名
    let className = 'mobile-control-svg';
    
    // 基础状态：开/关
    className += isEnabled ? ' on' : ' off';
    
    // 游客状态
    if (role === 0) {
      className += ' guest-disabled';
    }
    
    // 无权限状态
    if (!getMicAvailability.available && role !== 0) {
      className += ' no-permission';
    }
    
    // 被禁用状态
    if (isDisabled) {
      className += ' user-disabled';
    }
    
    return className;
  };
  
  // 获取申请上麦按钮类名
  const getRequestButtonClass = () => {
    if (!localParticipant) return 'mobile-control-svg request-mic';
    
    const attributes = localParticipant.attributes || {};
    const micStatus = attributes.mic_status || 'off_mic';
    const role = parseInt(attributes.role || '1');
    
    // 构建类名
    let className = 'mobile-control-svg';
    
    // 申请中状态
    if (micStatus === 'requesting') {
      className += ' requesting';
    } else {
      className += ' request-mic';
    }
    
    // 游客状态
    if (role === 0) {
      className += ' guest-disabled';
    }
    
    // 禁用状态
    if (!getMicRequestAvailability.available && micStatus !== 'requesting' && role !== 0) {
      className += ' disabled';
    }
    
    // 被禁用状态
    if (isDisabled) {
      className += ' user-disabled';
    }
    
    return className;
  };

  // 获取聊天输入框禁用状态和提示文本
  const getChatInputStatus = () => {
    // 游客特殊处理
    const userIsGuest = userRole === 0;
    if (userIsGuest) {
      return {
        disabled: true,
        placeholder: "游客需注册才能发言"
      };
    }
    
    if (isDisabled) {
      return {
        disabled: true,
        placeholder: "您已被禁用，无法发送消息"
      };
    }
    
    if (chatGlobalMute && !isHost) {
      return {
        disabled: true,
        placeholder: "全员禁言中"
      };
    }
    
    return {
      disabled: false,
      placeholder: "输入消息...(最多60字)"
    };
  };
  
  const inputStatus = getChatInputStatus();

  // 确保滚动条正确应用的效果
  React.useEffect(() => {
    const applyChatContainerStyles = () => {
      const chatContainer = document.getElementById('chat-messages-container');
      if (chatContainer) {
        // 强制应用关键样式
        chatContainer.style.overflowY = 'auto';
        chatContainer.style.maxHeight = keyboardVisible ? '40vh' : '65vh';
        chatContainer.style.minHeight = '0';
        // 确保flex布局正确
        chatContainer.style.flex = '1';
        console.log('已应用聊天容器滚动样式', {
          overflowY: chatContainer.style.overflowY,
          maxHeight: chatContainer.style.maxHeight
        });
      }
    };
    
    // 初始应用
    applyChatContainerStyles();
    
    // 监听键盘状态变化时重新应用
    const handler = setTimeout(applyChatContainerStyles, 100);
    
    return () => clearTimeout(handler);
  }, [keyboardVisible]); // 当键盘状态变化时重新应用

  // 启用调试模式
  React.useEffect(() => {
    // if (debugMode) { // 移除调试模式检查
    //   return ViewportDebug();
    // }
  }, []); // 移除debugMode依赖

  // 获取输入框样式
  const getInputFieldStyle = React.useCallback(() => {
    // 当输入框未获得焦点时，它与控制按钮共享一行，需要更大的宽度
    if (!inputFocused) {
      return {
        flex: '1 1 auto',
        minWidth: '0',
        boxSizing: 'border-box' as 'border-box',
        width: 'calc(100% - 10px)', // 几乎占满整个form-wrapper
        maxWidth: 'calc(100% - 10px)',
        marginRight: '0'
      };
    }
    
    // 输入框获得焦点时的样式
    return {
      flex: '1 1 auto',
      minWidth: '0',
      boxSizing: 'border-box' as 'border-box',
      width: 'calc(100% - 70px)', // 留出发送按钮的空间
      maxWidth: 'calc(100% - 70px)'
    };
  }, [inputFocused]);
  
  // 获取发送按钮样式
  const getSendButtonStyle = React.useCallback(() => {
    return {
      flex: '0 0 auto',
      width: '60px',
      minWidth: '60px',
      boxSizing: 'border-box' as 'border-box'
    };
  }, []);
  
  // 获取输入网格样式
  const getInputGridStyle = React.useCallback(() => {
    const baseStyle = {
      display: 'flex',
      gap: '8px',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box' as 'border-box'
    };
    
    // 无论键盘是否可见，都使用100%宽度
    return baseStyle;
  }, []);

  return (
    <div className="mobile-chat" style={{ overflow: 'hidden', width: '100%' }}>
      {/* Toast通知组件 */}
      <Toaster />
      {/* 移除调试相关代码 */}

      <div 
        className="mobile-chat-messages"
        id="chat-messages-container"
        style={{
          maxHeight: keyboardVisible ? '40vh' : '65vh', 
          height: 'auto', // 改为auto，让内容决定高度
          minHeight: 0,
          overflowY: 'auto', // 移除!important，React内联样式不支持
          flex: '1 1 auto',
          display: 'block' // 确保正确的显示模式
        }}
      >
        {chatMessages.map((msg, idx) => {
          // 使用CSS类而不是内联样式
          const isSelf = msg.from?.identity === 'local';
          const messageClassName = `mobile-chat-message ${isSelf ? 'self' : ''}`;

          return (
            <div key={idx} className={messageClassName}>
              <div className="mobile-chat-name">
                {msg.from?.name || '未知用户'}:
              </div>
              <div className="mobile-chat-content">
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 根据状态显示不同的提示信息 */}
      {userRole === 0 && (
        <div className="chat-disabled-notice warning">
          游客需要注册才能发送消息
        </div>
      )}
      
      {isDisabled && (
        <div className="chat-disabled-notice error">
          您的账号已被管理员禁用，无法发送消息
        </div>
      )}
      
      {!isDisabled && userRole !== 0 && chatGlobalMute && !isHost && (
        <div className="chat-disabled-notice warning">
          全员禁言中
        </div>
      )}        
      
      <div className={`chat-input-container ${inputFocused ? 'focused' : ''}`} style={{width: '100%', maxWidth: '100%'}}>
        {/* 输入区域 - 增加flex值，让它占据更多空间 */}
        <div className="form-wrapper" style={{flex: '1 1 auto', minWidth: '0'}}>
          <form onSubmit={handleSendMessage} className="mobile-chat-input" style={{width: '100%', maxWidth: '100%'}}>
            <div className="input-grid" style={getInputGridStyle()}>
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  // 游客模式下不允许输入
                  if (userRole !== 0) {
                    // 限制最多输入60个字符
                    const value = e.target.value;
                    if (value.length <= 60) {
                      setMessage(value);
                    } else {
                      // 如果超出长度，只保留前60个字符
                      setMessage(value.substring(0, 60));
                      // 可选：提示用户已达到最大长度
                      console.log("已达到最大字符数限制(60)");
                    }
                  }
                }}
                onFocus={(e) => {
                  // 游客模式下显示提示并立即失焦，防止输入
                  if (userRole === 0) {
                    showToast('游客需要注册为会员才能发言!', 'warning');
                    e.target.blur(); // 立即取消焦点
                  } else {
                    handleInputFocus();
                  }
                }}
                onBlur={handleInputBlur}
                placeholder={inputStatus.placeholder}
                maxLength={60}
                disabled={inputStatus.disabled || isSending}
                readOnly={userRole === 0} // 添加readOnly属性确保在所有浏览器中都禁用输入
                className={`input-field ${(inputStatus.disabled && !isHost) ? 'disabled' : ''} ${userRole === 0 ? 'guest-input-disabled' : ''}`}
                style={getInputFieldStyle()}
              />
              {inputFocused && (
                <button 
                  type="submit" 
                  disabled={isSending || !message.trim() || (inputStatus.disabled && !isHost)} 
                  className="send-button"
                  style={getSendButtonStyle()}
                >
                  发送
                </button>
              )}
            </div>
          </form>
        </div>
        
        {/* 控制按钮区域 - 减小宽度和边距 */}
        <div className="controls-wrapper" style={{marginLeft: '5px', flex: '0 0 auto', maxWidth: '130px'}}>
          <div className="controls-grid" style={{gap: '5px'}}>
            {/* 麦克风按钮 - 改用button元素替代div */}
            <button 
              key={`mic-button-${forceUpdate}`}
              className={`mobile-control-btn ${localParticipant?.isMicrophoneEnabled ? 'active' : 'inactive'} ${!getMicAvailability.available ? 'no-permission' : ''}`}
              onClick={handleMicControl}
              disabled={false} // 不禁用按钮，让用户可以点击并获取提示信息
              title={!getMicAvailability.available ? getMicAvailability.reason : (localParticipant?.isMicrophoneEnabled ? '静音' : '开麦')}
              style={{minWidth: '50px', padding: '0 5px'}} // 减小按钮宽度
            >
              <img 
                src={getImagePath('/images/mic.svg')} 
                alt={localParticipant?.isMicrophoneEnabled ? '静音' : '开麦'} 
                className="btn-icon"
                style={{marginRight: '0'}} // 移除右侧间距
              />
              <span className="btn-label" style={{fontSize: '12px'}}>
                {localParticipant?.isMicrophoneEnabled ? '静音' : '开麦'}
              </span>
              
              {/* 添加视觉提示，当按钮处于禁用状态时显示 */}
              {!getMicAvailability.available && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: '#f97316',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid white'
                }}>!</span>
              )}
            </button>
            
            {/* 申请上麦按钮 - 只对普通用户显示，也改用button元素 */}
            {(userRole === undefined || userRole === 1) && (
              <button 
                className={`mobile-control-btn request-mic ${localParticipant?.attributes?.mic_status === 'requesting' ? 'requesting' : ''} ${!getMicRequestAvailability.available || !hasHost || micStats.micListCount >= micStats.maxSlots ? 'disabled' : ''}`}
                onClick={handleMicRequest}
                disabled={!getMicRequestAvailability.available || !hasHost || micStats.micListCount >= micStats.maxSlots} // 考虑主持人状态和麦位数据
                title={!hasHost ? '等待主持人进入' : 
                       micStats.micListCount >= micStats.maxSlots ? `麦位已满 (${micStats.micListCount}/${micStats.maxSlots})` : 
                       !getMicRequestAvailability.available ? getMicRequestAvailability.reason : 
                       `申请上麦 (${micStats.micListCount}/${micStats.maxSlots})`}
                style={{
                  backgroundColor: !hasHost || micStats.micListCount >= micStats.maxSlots ? '#9ca3af' : (localParticipant?.attributes?.mic_status === 'requesting' ? '#f97316' : '#eab308'),
                  opacity: !hasHost || micStats.micListCount >= micStats.maxSlots ? '0.7' : '1',
                  cursor: !hasHost || micStats.micListCount >= micStats.maxSlots ? 'not-allowed' : 'pointer',
                  minWidth: '50px', // 减小按钮宽度
                  padding: '0 5px'
                }}
              >
                <img 
                  src={getImagePath('/images/submic.svg')} 
                  alt="申请上麦" 
                  className="btn-icon"
                  style={{marginRight: '0'}} // 移除右侧间距
                />
                <span className="btn-label" style={{fontSize: '12px'}}>
                  {localParticipant?.attributes?.mic_status === 'requesting' ? '等待' : 
                   !hasHost ? '等待' :
                   micStats.micListCount >= micStats.maxSlots ? '已满' : 
                   '申请'}
                </span>
              </button>
            )}

            {/* 添加游客模式下的申请按钮 */}
            {userRole === 0 && (
              <button 
                className="mobile-control-btn request-mic guest-button-disabled"
                onClick={() => {
                  showToast('游客需要注册为会员才能使用此功能！', 'warning');
                  // 可选：导航到注册页面
                  // window.location.href = '/register.html';
                }}
                title="游客需要注册为会员"
              >
                <img 
                  src={getImagePath('/images/submic.svg')} 
                  alt="申请上麦" 
                  className="btn-icon"
                  style={{marginRight: '0'}} // 移除右侧间距
                />
                <span className="btn-label">申请</span>
                <div className="guest-lock-icon">🔒</div>
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .mobile-chat {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #f8f8f8;
          width: 100%;
          max-width: 100%;
        }
        
        .mobile-chat-messages {
          flex: 1 1 auto !important;
          overflow-y: auto !important;
          padding: 10px;
          min-height: 0 !important; /* 关键: 允许弹性元素收缩 */
          max-height: 65vh !important; /* 默认最大高度 */
          transition: max-height 0.3s ease; /* 平滑过渡 */
          display: block !important;
        }
        
        .mobile-chat-message {
          margin-bottom: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          background-color: #222; /* 改为黑色背景 */
          max-width: 80%;
          display: flex;
          flex-direction: row; /* 使用水平排列 */
          flex-wrap: wrap; /* 允许内容换行 */
        }
        
        .mobile-chat-message.self {
          background-color: #333; /* 自己发送的消息也使用深色背景 */
          align-self: flex-end;
          margin-left: auto;
        }
        
        .mobile-chat-name {
          font-size: 12px;
          font-weight: bold;
          margin-right: 4px;
          color: #4a9eff; /* 名字改为蓝色，在黑色背景上更醒目 */
          display: inline-block; /* 改为行内块级元素 */
          white-space: nowrap; /* 确保不换行 */
          flex-shrink: 0; /* 防止昵称被压缩 */
        }
        
        .mobile-chat-content {
          font-size: 14px;
          wordBreak: break-word;
          color: white; /* 文字改为白色 */
          display: inline; /* 恢复为内联显示 */
          flex: 1; /* 允许内容部分灵活伸展 */
        }
        
        .chat-disabled-notice {
          padding: 8px;
          text-align: center;
          font-size: 13px;
          border-top: 1px solid #ddd;
        }
        
        .chat-disabled-notice.error {
          background-color: #fee2e2;
          color: #b91c1c;
          border-top: 1px solid #fca5a5;
        }
        
        .chat-disabled-notice.warning {
          background-color: #fef3c7;
          color: #92400e;
          border-top: 1px solid #fcd34d;
        }
        
        /* 聊天输入容器 */
        .chat-input-container {
          display: flex;
          background-color: white;
          border-top: 1px solid #ddd;
          padding: 10px;
          box-sizing: border-box;
          transition: all 0.3s ease;
          width: 100% !important;
          max-width: 100% !important;
        }
        
        /* 聊天输入容器在焦点状态下的样式 */
        .chat-input-container.focused .controls-wrapper {
          width: 0;
          opacity: 0;
          margin-left: 0;
          visibility: hidden;
        }
        
        .chat-input-container.focused .form-wrapper {
          width: 100%;
        }
        
        .mobile-chat-input {
          display: flex;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        
        /* 表单包装器样式 */
        .form-wrapper {
          flex: 1 1 auto; /* 允许增长和收缩，但优先收缩 */
          min-width: 50px; /* 设置最小宽度，防止过度收缩 */
          box-sizing: border-box;
          transition: width 0.3s ease;
          width: 100%;
          max-width: 100%;
        }
        
        /* 控制按钮包装器样式 */
        .controls-wrapper {
          display: flex;
          align-items: center;
          margin-left: 10px;
          flex: 0 0 auto; /* 不增长不收缩 */
          transition: all 0.3s ease;
        }
        
        /* 控制按钮网格布局 */
        .controls-grid {
          display: flex;
          gap: 8px;
          flex-shrink: 0; /* 防止控制按钮区域被压缩 */
        }
        
        /* 输入框网格布局 */
        .input-grid {
          display: flex;
          gap: 8px;
          width: 100%;
          max-width: 100%;
          overflow: hidden; /* 防止内容溢出 */
        }
        
        /* 输入框样式 */
        .input-field {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 14px;
          outline: none;
          flex: 1 1 auto;
          min-width: 150px; /* 增加最小宽度，确保输入框不会太窄 */
          box-sizing: border-box;
          height: 36px;
          transition: all 0.3s ease;
          text-overflow: ellipsis; /* 文本溢出显示省略号 */
          width: calc(100% - 10px) !important; /* 几乎占满整个form-wrapper */
          max-width: calc(100% - 10px) !important;
        }
        
        .input-field.disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
          border-color: #e5e7eb;
        }
        
        .input-field:disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
        }
        
        /* 发送按钮样式 */
        .send-button {
          padding: 0 12px;
          background-color: #22c55e;
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 11px;
          height: 36px;
          min-width: 50px;
          white-space: nowrap;
          box-sizing: border-box;
          opacity: 0;
          animation: fadeIn 0.2s forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .send-button:disabled {
          background-color: #ccc;
        }
        
        /* SVG图标按钮样式 */
        .mobile-control-svg {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          border-radius: 20px;
          cursor: pointer !important; /* 强制使用指针样式 */
          position: relative;
          height: 36px;
          min-width: 40px;
          transition: all 0.3s ease;
          box-sizing: border-box;
          pointer-events: auto !important; /* 确保点击事件不被阻止 */
        }
        
        /* SVG图片样式 */
        .mobile-control-svg img {
          width: 16px;
          height: 16px;
          transition: all 0.3s ease;
          z-index: 5;
          margin-right: 2px;
        }
        
        /* 工具提示样式 */
        .svg-tooltip {
          font-size: 11px;
          text-align: center;
          color: white;
          margin-left: 2px;
          white-space: nowrap;
        }
        
        /* 麦克风开启状态 */
        .mobile-control-svg.on {
          background-color: #22c55e;
          box-shadow: none;
        }
        
        .mobile-control-svg.on img {
          filter: brightness(0) invert(1);
        }
        
        /* 麦克风关闭状态 */
        .mobile-control-svg.off {
          background-color: #ef4444;
          box-shadow: none;
        }
        
        .mobile-control-svg.off img {
          filter: brightness(0) invert(1);
        }
        
        /* 游客状态 */
        .mobile-control-svg.guest-disabled {
          opacity: 0.7;
          position: relative;
          background-color: #999;
        }
        
        .mobile-control-svg.guest-disabled::after {
          content: "🔒";
          position: absolute;
          top: 5px;
          right: 5px;
          font-size: 10px;
        }
        
        .mobile-control-svg.guest-disabled img {
          filter: grayscale(100%);
        }
        
        /* 无权限状态 */
        .mobile-control-svg.no-permission {
          background-color: #9ca3af;
          opacity: 0.7;
        }
        
        /* 用户被禁用状态 */
        .mobile-control-svg.user-disabled {
          background-color: #9ca3af;
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* 禁用覆盖层 */
        .disabled-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.4);
          border-radius: 20px;
          z-index: 10;
          pointer-events: none; /* 不阻止底层元素的点击事件 */
        }
        
        /* 申请上麦按钮样式 */
        .mobile-control-svg.request-mic {
          background-color: #eab308;
          box-shadow: none;
        }
        
        .mobile-control-svg.request-mic img {
          filter: brightness(0) invert(1);
        }
        
        /* 申请中状态 */
        .mobile-control-svg.requesting {
          background-color: #eab308;
          box-shadow: none;
          animation: gentle-pulse 1.5s infinite;
        }
        
        .mobile-control-svg.requesting img {
          filter: brightness(0) invert(1);
        }
        
        /* 禁用状态 */
        .mobile-control-svg.disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        /* 增强申请上麦图标显示 */
        .submic-icon {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 5 !important;
        }
        
        @keyframes gentle-pulse {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
        }

        /* 按钮样式 - 新增，参考PC端样式 */
        .mobile-control-btn {
          min-width: 50px;
          height: 36px;
          border-radius: 18px;
          border: none;
          background-color: #3b82f6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          font-size: 12px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
          box-sizing: border-box;
          gap: 4px;
        }
        
        .mobile-control-btn.active {
          background-color: #22c55e;
        }
        
        .mobile-control-btn.inactive {
          background-color: #ef4444;
        }
        
        .mobile-control-btn.no-permission {
          background-color: #9ca3af;
          opacity: 0.7;
        }
        
        .mobile-control-btn.disabled {
          background-color: #9ca3af;
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .mobile-control-btn.requesting {
          background-color: #f97316;
          animation: gentle-pulse 1.5s infinite;
        }
        
        .btn-icon {
          width: 16px;
          height: 16px;
          filter: brightness(0) invert(1);
          margin-right: 0; /* 移除全局右侧间距 */
        }
        
        .btn-label {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 50px;
        }
        
        /* 麦克风开启状态 */
        .mobile-control-btn.active {
          background-color: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }
        
        /* 麦克风关闭状态 */
        .mobile-control-btn.inactive {
          background-color: #ef4444;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }
        
        /* 无权限状态 - 修复样式，确保应用到mobile-control-btn */
        .mobile-control-btn.no-permission {
          background-color: #9ca3af;
          opacity: 0.8;
          position: relative;
          box-shadow: none;
          border: 1px solid #6b7280;
        }
        
        /* 申请上麦按钮样式 */
        .mobile-control-btn.request-mic {
          background-color: #eab308;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.5);
        }
        
        /* 申请中状态 */
        .mobile-control-btn.requesting {
          background-color: #eab308;
          animation: gentle-pulse 1.5s infinite;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.5);
        }

        /* 移动端控制按钮样式 */
        .mobile-control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #22c55e;
          border: none;
          border-radius: 20px;
          color: white;
          padding: 6px 8px; /* 减小内边距以适应窄屏 */
          font-size: 14px;
          height: 36px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          flex-shrink: 0; /* 防止按钮被压缩 */
          white-space: nowrap; /* 防止按钮文字换行 */
          gap: 0; /* 移除子元素之间的间距 */
        }
        
        .mobile-control-btn .btn-icon {
          width: 16px;
          height: 16px;
          margin-right: 0; /* 移除图标的右侧间距 */
          flex-shrink: 0; /* 防止图标被压缩 */
        }
        
        .mobile-control-btn.request-mic.requesting {
          background-color: #f97316;
        }

        .mobile-control-btn.request-mic.disabled {
          background-color: #9ca3af;
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .mobile-control-btn.inactive {
          background-color: #d1d5db;
        }
        
        .mobile-control-btn.active {
          background-color: #ef4444;
        }
        
        .mobile-control-btn.no-permission {
          background-color: #9ca3af;
        }

        .guest-input-disabled {
          background-color: #f1f1f1 !important;
          color: #999 !important;
          border: 1px solid #ccc !important;
          cursor: not-allowed !important;
          opacity: 0.7 !important;
          pointer-events: none !important;
        }
        
        .guest-button-disabled {
          background-color: #777 !important;
          opacity: 0.7 !important;
          cursor: not-allowed !important;
          position: relative;
        }
        
        .guest-lock-icon {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 18px;
          height: 18px;
          background-color: #ff4d4f;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
          border: 1px solid white;
        }
      `}</style>
    </div>
  );
} 