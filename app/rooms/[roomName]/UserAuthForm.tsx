'use client';

import React from 'react';
import { API_CONFIG } from '@/lib/config';

interface UserAuthFormProps {
  onLoginSuccess: (userData: {
    id: number;
    username: string;
    nickname: string;
    token: string;
    user_roles: number;
    ws_url?: string;
  }) => void;
  onGuestMode: () => void;
  roomName: string;
}

export function UserAuthForm({ onLoginSuccess, onGuestMode, roomName }: UserAuthFormProps) {
  const [isLogin, setIsLogin] = React.useState(true); // true=登录, false=注册
  const [formData, setFormData] = React.useState({
    username: '',
    password: '',
    nickname: '', // 注册时需要
    confirmPassword: '' // 注册时需要
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showForceLogin, setShowForceLogin] = React.useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(''); // 清除错误信息
    setShowForceLogin(false); // 清除强制登录选项
  };

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      // 🎯 使用专门的房间登录接口，避免与后台管理冲突
      const response = await fetch(`${API_CONFIG.BASE_URL}/room-login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: formData.username,
          user_password: formData.password,
          room_id: roomName
        }),
      });

      // 检查响应的内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // 如果响应不是JSON格式，很可能是404页面
        if (response.status === 404) {
          setError('该房间不存在');
        } else {
          setError('服务器错误，请稍后再试');
        }
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // JSON解析错误，通常是因为返回了HTML而不是JSON
        console.error('JSON解析错误:', jsonError);
        setError('该房间不存在');
        return;
      }
      
      if (!response.ok) {
        // 处理特殊的重复登录错误
        if (response.status === 409 && data.error_code === 'ALREADY_LOGGED_IN') {
          const currentRoom = data.current_room ? `（当前在房间：${data.current_room}）` : '';
          const lastActive = data.last_active ? new Date(data.last_active).toLocaleString() : '';
          const timeInfo = lastActive ? `，最后活跃时间：${lastActive}` : '';
          setError(`${data.error}${currentRoom}${timeInfo}`);
          setShowForceLogin(true); // 显示强制登录选项
        } else {
          setError(data.error || '登录失败');
        }
        return;
      }

      if (data.success) {

        // 登录成功，调用回调函数
        const userData = {
          id: data.user_id,
          username: formData.username,
          nickname: data.user_nickname || formData.username,
          token: data.token,
          user_roles: data.user_roles || 1,
          ws_url: data.ws_url
        };

        onLoginSuccess(userData);
      } else {
        console.error('登录失败:', data);
        setError(data.error || '登录失败');
      }
    } catch (err) {
      console.error('登录错误:', err);
      // 更友好的错误提示
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('无法连接到服务器，请检查网络连接');
      } else if (err instanceof SyntaxError) {
        setError('该房间不存在');
      } else {
        setError('登录失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.username || !formData.password || !formData.nickname) {
      setError('请填写所有必填字段');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/register.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: formData.username,
          user_password: formData.password,
          user_nickname: formData.nickname,
          room_id: roomName
        }),
      });

      // 检查响应的内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // 如果响应不是JSON格式，很可能是404页面
        if (response.status === 404) {
          setError('该房间不存在');
        } else {
          setError('服务器错误，请稍后再试');
        }
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // JSON解析错误，通常是因为返回了HTML而不是JSON
        console.error('JSON解析错误:', jsonError);
        setError('该房间不存在');
        return;
      }
      
      if (!response.ok) {
        throw new Error(data.error || '注册失败');
      }

      if (data.success) {
        // 注册成功，自动登录
        onLoginSuccess({
          id: data.user_id,
          username: formData.username,
          nickname: formData.nickname,
          token: data.token,
          user_roles: data.user_roles || 1,
          ws_url: data.ws_url
        });
      } else {
        setError(data.error || '注册失败');
      }
    } catch (err) {
      console.error('注册错误:', err);
      // 更友好的错误提示
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('无法连接到服务器，请检查网络连接');
      } else if (err instanceof SyntaxError) {
        setError('该房间不存在');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('注册失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogin = async () => {
    if (!formData.username || !formData.password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/force-login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: formData.username,
          user_password: formData.password,
          room_id: roomName,
          force_login: true
        }),
      });

      // 检查响应的内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // 如果响应不是JSON格式，很可能是404页面
        if (response.status === 404) {
          setError('该房间不存在');
        } else {
          setError('服务器错误，请稍后再试');
        }
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // JSON解析错误，通常是因为返回了HTML而不是JSON
        console.error('JSON解析错误:', jsonError);
        setError('该房间不存在');
        return;
      }
      
      if (!response.ok) {
        setError(data.error || '强制登录失败');
        return;
      }

      if (data.success) {
        // 强制登录成功
        const userData = {
          id: data.user_id,
          username: formData.username,
          nickname: data.user_nickname || formData.username,
          token: data.token,
          user_roles: data.user_roles || 1,
          ws_url: data.ws_url
        };

        onLoginSuccess(userData);
      } else {
        setError(data.error || '强制登录失败');
      }
    } catch (err) {
      console.error('强制登录错误:', err);
      // 更友好的错误提示
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('无法连接到服务器，请检查网络连接');
      } else if (err instanceof SyntaxError) {
        setError('该房间不存在');
      } else {
        setError('强制登录失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (isLogin) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  return (
    <div style={{ 
      display: 'grid', 
      placeItems: 'center', 
      height: '100%',
      background: '#1a1a1a',
      color: 'white'
    }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        width: '400px',
        background: '#2a2a2a',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        {/* 标题和切换 */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
            {isLogin ? '登录会议' : '注册账户'}
          </h2>
          <p style={{ color: '#888', margin: 0 }}>
            {isLogin ? '使用账户登录，无需邀请码' : '创建新账户加入会议'}
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{
            background: '#ff4757',
            color: 'white',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* 表单字段 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            placeholder="用户名"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            style={{
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #444',
              background: '#333',
              color: 'white',
              fontSize: '16px'
            }}
            disabled={loading}
          />

          {!isLogin && (
            <input
              type="text"
              placeholder="昵称"
              value={formData.nickname}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#333',
                color: 'white',
                fontSize: '16px'
              }}
              disabled={loading}
            />
          )}

          <input
            type="password"
            placeholder="密码"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            style={{
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #444',
              background: '#333',
              color: 'white',
              fontSize: '16px'
            }}
            disabled={loading}
          />

          {!isLogin && (
            <input
              type="password"
              placeholder="确认密码"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#333',
                color: 'white',
                fontSize: '16px'
              }}
              disabled={loading}
            />
          )}
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '14px',
              borderRadius: '6px',
              border: 'none',
              background: loading ? '#666' : '#4ade80',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>

          {/* 强制登录按钮 */}
          {showForceLogin && isLogin && (
            <button
              onClick={handleForceLogin}
              disabled={loading}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                background: '#f59e0b',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loading ? '处理中...' : '强制登录（踢出其他设备）'}
            </button>
          )}

          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            style={{
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #666',
              background: 'transparent',
              color: '#ccc',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLogin ? '没有账户？点击注册' : '已有账户？点击登录'}
          </button>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            margin: '10px 0'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#444' }}></div>
            <span style={{ color: '#888', fontSize: '14px' }}>或</span>
            <div style={{ flex: 1, height: '1px', background: '#444' }}></div>
          </div>

          <button
            onClick={onGuestMode}
            disabled={loading}
            style={{
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #666',
              background: 'transparent',
              color: '#ccc',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            游客模式（需要邀请码）
          </button>
        </div>
      </div>
    </div>
  );
} 