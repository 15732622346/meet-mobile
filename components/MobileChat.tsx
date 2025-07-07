import * as React from 'react';
import { useChat, useLocalParticipant } from '@livekit/components-react';
import { isUserDisabled } from '../lib/token-utils';

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
      
      <form onSubmit={handleSendMessage} className="mobile-chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isDisabled ? "您已被禁用，无法发送消息" : "输入消息..."}
          disabled={isSending || isDisabled}
        />
        <button type="submit" disabled={isSending || !message.trim() || isDisabled}>
          发送
        </button>
      </form>

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
        }
        
        .mobile-chat-input input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 14px;
          outline: none;
        }
        
        .mobile-chat-input input:disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
        }
        
        .mobile-chat-input button {
          margin-left: 8px;
          padding: 0 15px;
          background-color: #22c55e;
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 14px;
        }
        
        .mobile-chat-input button:disabled {
          background-color: #ccc;
        }
      `}</style>
    </div>
  );
} 