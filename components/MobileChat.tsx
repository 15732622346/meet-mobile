import * as React from 'react';
import { useChat, useLocalParticipant, useParticipants, useRoomContext } from '@livekit/components-react';
import { isUserDisabled, isHostOrAdmin, shouldShowInMicList } from '../lib/token-utils';
import { getImagePath } from '../lib/image-path';
import { API_CONFIG } from '../lib/config';
import { RoomEvent } from 'livekit-client';

export function MobileChat({ userRole = 1, maxMicSlots = 5 }) {
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const roomCtx = useRoomContext();
  const [message, setMessage] = React.useState('');
  const [inputFocused, setInputFocused] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
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
    
    // 检查是否有可用麦位
    const hasAvailableSlots = micListCount < maxMicSlots;
    
    return {
      micListCount,
      maxSlots: maxMicSlots,
      hasAvailableSlots
    };
  }, [participants, maxMicSlots]);
  
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
    
    // 主持人可以忽略全局禁言
    if (isHost) return true;
    
    // 普通用户受全局禁言影响
    return !chatGlobalMute;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSending) return;
    
    // 检查是否可以发言
    if (!canSendMessage()) {
      if (isDisabled) {
        alert('您已被禁用，无法发送消息');
      } else if (chatGlobalMute) {
        alert('全员禁言中，只有主持人可以发言');
      }
      return;
    }
    
    // 敏感词检查
    const blockedResult = await checkBlockedWords(message);
    if (blockedResult.blocked) {
      alert(`消息包含敏感词"${blockedResult.word}"，已被屏蔽`);
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

  // 获取麦克风可用性状态
  const getMicAvailability = React.useMemo(() => {
    if (!localParticipant) return { available: false, reason: '加载中...' };
    
    const attributes = localParticipant.attributes || {};
    const micStatus = attributes.mic_status || 'off_mic';
    const role = parseInt(attributes.role || '1');
    
    // 被禁用的用户不能使用麦克风
    if (isDisabled) {
      return { available: false, reason: '您已被禁用' };
    }
    
    // 游客不能使用麦克风
    if (role === 0) {
      return { available: false, reason: '游客需要注册为会员' };
    }
    
    // 主持人和管理员总是可以使用麦克风
    if (role >= 2) {
      return { available: true, reason: '' };
    }
    
    // 已上麦的用户可以使用麦克风
    if (micStatus === 'on_mic') {
      return { available: true, reason: '' };
    }
    
    // 已被主持人禁麦的用户
    if (micStatus === 'muted') {
      return { available: false, reason: '您已被主持人禁麦' };
    }
    
    // 其他情况不可用
    return { available: false, reason: '需要申请上麦' };
  }, [localParticipant, isDisabled]);

  // 处理麦克风控制
  const handleMicControl = () => {
    if (!localParticipant) return;
    
    const attributes = localParticipant.attributes || {};
    const role = parseInt(attributes.role || '1');
    
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
        alert('⏳ 您的上麦申请正在等待主持人批准');
      } else if (attributes.mic_status === 'muted') {
        alert('⚠️ 您已被主持人禁麦');
      } else {
        alert('⚠️ 您需要先申请上麦权限才能使用麦克风');
      }
      return;
    }
    
    // 执行麦克风切换
    try {
      localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    } catch (error) {
      console.error('麦克风操作失败:', error);
      alert('麦克风操作失败，请刷新页面重试');
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
    if (!micStats.hasAvailableSlots) {
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
        alert('您已经申请上麦，等待主持人批准');
      } else if (attributes.mic_status === 'on_mic') {
        alert('您已在麦位上');
      } else if (!hasHost) {
        alert('请等待主持人进入房间后再申请上麦');
      } else if (!micStats.hasAvailableSlots) {
        alert(`麦位已满！当前麦位列表已有 ${micStats.micListCount}/${micStats.maxSlots} 人，请等待有人退出后再申请。`);
      } else if (isDisabled) {
        alert('您已被禁用，无法申请上麦');
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
      
      alert('已发送申请，等待主持人批准');
    } catch (error) {
      console.error('申请上麦失败:', error);
      alert('申请上麦失败，请刷新页面重试');
    }
  };

  // 处理输入框焦点事件
  const handleInputFocus = () => {
    setInputFocused(true);
  };

  // 处理输入框失去焦点事件
  const handleInputBlur = () => {
    // 如果输入框有内容，保持焦点状态
    if (message.trim()) {
      return;
    }
    setInputFocused(false);
  };

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
    if (isDisabled) {
      return {
        disabled: true,
        placeholder: "您已被禁用，无法发送消息"
      };
    }
    
    if (chatGlobalMute && !isHost) {
      return {
        disabled: true,
        placeholder: "全员禁言中，只有主持人可以发言"
      };
    }
    
    return {
      disabled: false,
      placeholder: "输入消息..."
    };
  };
  
  const inputStatus = getChatInputStatus();

  return (
    <div className="mobile-chat">
      <div className="mobile-chat-messages">
        {chatMessages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`mobile-chat-message ${msg.from?.identity === 'local' ? 'self' : ''}`}
          >
            <div className="mobile-chat-name">
              {msg.from?.name || '未知用户'}:
            </div>
            <div className="mobile-chat-content">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 根据状态显示不同的提示信息 */}
      {isDisabled && (
        <div className="chat-disabled-notice error">
          您的账号已被管理员禁用，无法发送消息
        </div>
      )}
      
      {!isDisabled && chatGlobalMute && !isHost && (
        <div className="chat-disabled-notice warning">
          全员禁言中，只有主持人可以发言
        </div>
      )}
      
      <div className={`chat-input-container ${inputFocused ? 'focused' : ''}`}>
        {/* 输入区域 */}
        <div className="form-wrapper">
          <form onSubmit={handleSendMessage} className="mobile-chat-input">
            <div className="input-grid">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={inputStatus.placeholder}
                disabled={inputStatus.disabled || isSending}
                className={`input-field ${(inputStatus.disabled && !isHost) ? 'disabled' : ''}`}
              />
              {inputFocused && (
                <button 
                  type="submit" 
                  disabled={isSending || !message.trim() || (inputStatus.disabled && !isHost)} 
                  className="send-button"
                >
                  发送
                </button>
              )}
            </div>
          </form>
        </div>
        
        {/* 控制按钮区域 */}
        <div className="controls-wrapper">
          <div className="controls-grid">
            {/* 麦克风按钮 */}
            <div 
              className={getMicButtonClass()}
              onClick={handleMicControl}
              title={!getMicAvailability.available ? getMicAvailability.reason : (localParticipant?.isMicrophoneEnabled ? '静音' : '开麦')}
              style={{cursor: 'pointer'}} // 确保鼠标指针显示为可点击状态
            >
              <img 
                src={getImagePath('/images/mic.svg')} 
                alt={localParticipant?.isMicrophoneEnabled ? '静音' : '开麦'} 
                title={localParticipant?.isMicrophoneEnabled ? '静音' : '开麦'} 
              />
              <span className="svg-tooltip">
                {localParticipant?.isMicrophoneEnabled ? '静音' : '开麦'}
              </span>
            </div>
            
            {/* 申请上麦按钮 - 只对普通用户显示 */}
            {(userRole === undefined || userRole === 1) && (
              <div 
                className={getRequestButtonClass()}
                onClick={handleMicRequest}
                title={!getMicRequestAvailability.available ? getMicRequestAvailability.reason : getMicRequestAvailability.reason}
                style={{cursor: 'pointer'}} // 确保鼠标指针显示为可点击状态
              >
                <img 
                  src={getImagePath('/images/submic.svg')} 
                  alt={localParticipant?.attributes?.mic_status === 'requesting' ? '申请' : '上麦'} 
                  title={localParticipant?.attributes?.mic_status === 'requesting' ? '申请' : '上麦'} 
                  className="submic-icon"
                />
                <span className="svg-tooltip">
                  {localParticipant?.attributes?.mic_status === 'requesting' ? '申请中' : '申请'}
                </span>
                
                {/* 用户被禁用时的覆盖层 */}
                {isDisabled && (
                  <div className="disabled-overlay">
                    🚫
                  </div>
                )}
              </div>
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
        }
        
        .mobile-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }
        
        .mobile-chat-message {
          margin-bottom: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          background-color: #222; /* 改为黑色背景 */
          max-width: 80%;
        }
        
        .mobile-chat-message.self {
          background-color: #333; /* 自己发送的消息也使用深色背景 */
          align-self: flex-end;
          margin-left: auto;
        }
        
        .mobile-chat-name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2px;
          color: #4a9eff; /* 名字改为蓝色，在黑色背景上更醒目 */
        }
        
        .mobile-chat-content {
          font-size: 14px;
          word-break: break-word;
          color: white; /* 文字改为白色 */
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
          box-sizing: border-box;
        }
        
        /* 表单包装器样式 */
        .form-wrapper {
          flex: 1;
          box-sizing: border-box;
          transition: width 0.3s ease;
        }
        
        /* 控制按钮包装器样式 */
        .controls-wrapper {
          display: flex;
          align-items: center;
          margin-left: 10px;
          transition: all 0.3s ease;
        }
        
        /* 控制按钮网格布局 */
        .controls-grid {
          display: flex;
          gap: 8px;
        }
        
        /* 输入框网格布局 */
        .input-grid {
          display: flex;
          gap: 8px;
          width: 100%;
        }
        
        /* 输入框样式 */
        .input-field {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 14px;
          outline: none;
          flex: 1;
          box-sizing: border-box;
          height: 36px;
          transition: all 0.3s ease;
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
      `}</style>
    </div>
  );
} 