import * as React from 'react';
import { useChat, useLocalParticipant } from '@livekit/components-react';
import { isUserDisabled } from '../lib/token-utils';
import { getImagePath } from '../lib/image-path';

export function MobileChat() {
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const [message, setMessage] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // 检查用户是否被禁用
  const isDisabled = localParticipant && isUserDisabled(localParticipant.attributes || {});
  
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isSending && !isDisabled) {
      send(message);
      setMessage('');
    }
  };

  // 处理麦克风控制
  const handleMicControl = () => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    }
  };

  // 处理申请上麦
  const handleMicRequest = async () => {
    if (!localParticipant) return;
    
    const attributes = localParticipant.attributes || {};
    const micStatus = attributes.mic_status || 'off_mic';
    
    if (micStatus === 'requesting') {
      alert('您已经申请上麦，等待主持人批准');
      return;
    }
    
    if (micStatus === 'on_mic') {
      alert('您已在麦位上');
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
      
      {isDisabled && (
        <div className="chat-disabled-notice">
          您的账号已被管理员禁用，无法发送消息
        </div>
      )}
      
      <div className="grid-container">
        {/* 表单占据3份网格 */}
        <div className="form-wrapper">
          <form onSubmit={handleSendMessage} className="mobile-chat-input">
            <div className="input-grid">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isDisabled ? "您已被禁用，无法发送消息" : "输入消息..."}
                disabled={isSending || isDisabled}
                className="input-field"
              />
              <button type="submit" disabled={isSending || !message.trim() || isDisabled} className="send-button">
                发送
              </button>
            </div>
          </form>
        </div>
        
        {/* 控制按钮占据3份网格 */}
        <div className="controls-wrapper">
          <div className="controls-grid">
            {/* 麦克风按钮 */}
            <div 
              className={`mobile-control-svg ${localParticipant?.isMicrophoneEnabled ? 'on' : 'off'}`}
              onClick={handleMicControl}
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
            
            {/* 申请上麦按钮 */}
            <div 
              className={`mobile-control-svg ${localParticipant?.attributes?.mic_status === 'requesting' ? 'requesting' : 'request-mic'}`}
              onClick={handleMicRequest}
            >
              <img 
                src={getImagePath('/images/submic.svg')} 
                alt={localParticipant?.attributes?.mic_status === 'requesting' ? '申请' : '上麦'} 
                title={localParticipant?.attributes?.mic_status === 'requesting' ? '申请' : '上麦'} 
                className="submic-icon"
              />
              <span className="svg-tooltip">
                {localParticipant?.attributes?.mic_status === 'requesting' ? '申请' : '上麦'}
              </span>
            </div>
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
          background-color: #e5e5e5;
          max-width: 80%;
        }
        
        .mobile-chat-message.self {
          background-color: #dcf8c6;
          align-self: flex-end;
          margin-left: auto;
        }
        
        .mobile-chat-name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2px;
          color: #555;
        }
        
        .mobile-chat-content {
          font-size: 14px;
          word-break: break-word;
        }
        
        .chat-disabled-notice {
          padding: 8px;
          background-color: #fee2e2;
          color: #b91c1c;
          text-align: center;
          font-size: 13px;
          border-top: 1px solid #fca5a5;
        }
        
        .mobile-chat-input {
          display: flex;
          padding: 10px;
          background-color: white;
          border-top: 1px solid #ddd;
          width: 100%;
          box-sizing: border-box;
        }
        
        /* 网格容器样式 */
        .grid-container {
          display: flex; /* 改为flex布局 */
          align-items: center; /* 垂直居中对齐 */
          width: 100%;
          background-color: white;
          border-top: 1px solid #ddd;
          padding: 10px;
          box-sizing: border-box;
        }
        
        /* 表单包装器样式 */
        .form-wrapper {
          flex: 1; /* 占据剩余空间 */
          box-sizing: border-box;
        }
        
        /* 新增: 控制按钮包装器样式 */
        .controls-wrapper {
          display: flex;
          align-items: center;
          margin-left: 10px;
        }
        
        /* 新增: 控制按钮网格布局 */
        .controls-grid {
          display: flex;
          gap: 8px;
        }
        
        /* 修改: 输入框网格布局 */
        .input-grid {
          display: flex;
          gap: 8px;
          width: 100%;
        }
        
        /* 修改: 输入框样式 */
        .input-field {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 14px;
          outline: none;
          flex: 1; /* 占据剩余空间 */
          box-sizing: border-box;
          height: 36px;
        }
        
        .input-field:disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
        }
        
        /* 修改: 发送按钮样式 */
        .send-button {
          padding: 0 12px;
          background-color: #22c55e;
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 11px; /* 更小的字体 */
          height: 36px;
          min-width: 50px;
          white-space: nowrap; /* 防止文字换行 */
          box-sizing: border-box;
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
          cursor: pointer;
          position: relative;
          height: 36px; /* 与发送按钮一致的高度 */
          min-width: 40px;
          transition: all 0.3s ease;
          box-sizing: border-box;
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
          font-size: 11px; /* 更小的字体 */
          text-align: center;
          color: white;
          margin-left: 2px;
          white-space: nowrap; /* 防止文字换行 */
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