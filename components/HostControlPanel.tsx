'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from '@/lib/config';

interface MicRequest {
  id: number;
  room_id: string;
  user_id: number;
  username: string;
  nickname: string;
  status: 'pending' | 'approved' | 'rejected';
  request_time: string;
  approved_by_name?: string;
  approved_time?: string;
  reject_reason?: string;
  current_mic_status: string;
  is_speaking: boolean;
  is_online: boolean;
  duration_minutes: number;
}

interface Statistics {
  total_participants: number;
  mic_enabled_count: number;
  requesting_count: number;
  muted_by_host_count: number;
  speaking_count: number;
  online_count: number;
  pending_requests: number;
}

interface HostControlPanelProps {
  roomId: string;
  operatorId: number;
  operatorName: string;
  userRole: number;
  isVisible: boolean;
  onClose: () => void;
}

export function HostControlPanel({
  roomId,
  operatorId,
  operatorName,
  userRole,
  isVisible,
  onClose
}: HostControlPanelProps) {
  const [requests, setRequests] = useState<MicRequest[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  // 如果不是主持人或管理员，不显示面板
  if (userRole < 2) {
    return null;
  }

  // 加载申请列表
  const loadRequests = useCallback(async () => {
    if (!isVisible) return;
    
    setLoading(true);
    try {
      const status = activeTab === 'pending' ? 'pending' : 'all';
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/get-mic-requests.php?room_id=${roomId}&status=${status}&operator_id=${operatorId}`
      );
      const data = await response.json();

      if (data.success) {
        setRequests(data.data.requests);
        setStatistics(data.data.statistics);
      } else {
        console.error('❌ 加载申请列表失败:', data.error);
      }
    } catch (error) {
      console.error('❌ 加载申请列表时发生错误:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId, operatorId, activeTab, isVisible]);

  // 处理申请（批准或拒绝）
  const handleRequest = useCallback(async (
    requestId: number, 
    action: 'approve' | 'reject', 
    rejectReason?: string
  ) => {
    setProcessingIds(prev => new Set(prev).add(requestId));

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/handle-mic-request.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          action: action,
          operator_id: operatorId,
          operator_name: operatorName,
          reject_reason: rejectReason
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 重新加载列表
        await loadRequests();
        
        // 这里可以添加WebSocket通知其他用户
        
      } else {
        console.error('❌ 处理申请失败:', data.error);
        alert(`处理申请失败: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ 处理申请时发生错误:', error);
      alert('网络错误，请稍后重试');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  }, [operatorId, operatorName, loadRequests]);

  // 批准申请
  const approveRequest = useCallback((requestId: number) => {
    handleRequest(requestId, 'approve');
  }, [handleRequest]);

  // 拒绝申请
  const rejectRequest = useCallback((requestId: number) => {
    const reason = prompt('请输入拒绝原因（可选）:');
    if (reason !== null) { // 用户没有取消
      handleRequest(requestId, 'reject', reason || undefined);
    }
  }, [handleRequest]);

  // 定期刷新数据
  useEffect(() => {
    if (isVisible) {
      loadRequests();
      const interval = setInterval(loadRequests, 5000); // 每5秒刷新一次
      return () => clearInterval(interval);
    }
  }, [isVisible, loadRequests]);

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取状态显示
  const getStatusDisplay = (request: MicRequest) => {
    switch (request.status) {
      case 'pending':
        return <span className="status-pending">⏳ 待审批</span>;
      case 'approved':
        return <span className="status-approved">✅ 已批准</span>;
      case 'rejected':
        return <span className="status-rejected">❌ 已拒绝</span>;
      default:
        return <span className="status-unknown">❓ 未知</span>;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="host-control-overlay">
      <div className="host-control-panel">
        {/* 头部 */}
        <div className="panel-header">
          <h3>🎤 麦克风管理面板</h3>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        {/* 统计信息 */}
        {statistics && (
          <div className="statistics-section">
            <div className="stat-item">
              <span className="stat-label">在线人数:</span>
              <span className="stat-value">{statistics.online_count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">开麦人数:</span>
              <span className="stat-value">{statistics.mic_enabled_count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">正在说话:</span>
              <span className="stat-value">{statistics.speaking_count}</span>
            </div>
            <div className="stat-item highlight">
              <span className="stat-label">待审批:</span>
              <span className="stat-value">{statistics.pending_requests}</span>
            </div>
          </div>
        )}

        {/* 标签页 */}
        <div className="tab-section">
          <button 
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            待审批 ({statistics?.pending_requests || 0})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            全部申请
          </button>
        </div>

        {/* 申请列表 */}
        <div className="requests-section">
          {loading ? (
            <div className="loading">⏳ 加载中...</div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              {activeTab === 'pending' ? '🎉 暂无待审批申请' : '📝 暂无申请记录'}
            </div>
          ) : (
            <div className="requests-list">
              {requests.map((request) => (
                <div key={request.id} className="request-item">
                  <div className="request-user">
                    <div className="user-info">
                      <span className="user-name">
                        {request.nickname}
                        {request.is_speaking && <span className="speaking-indicator">🔊</span>}
                        {!request.is_online && <span className="offline-indicator">⚫</span>}
                      </span>
                      <span className="user-username">@{request.username}</span>
                    </div>
                    <div className="request-time">
                      {formatTime(request.request_time)}
                      <span className="duration">({request.duration_minutes}分钟前)</span>
                    </div>
                  </div>

                  <div className="request-status">
                    {getStatusDisplay(request)}
                    {request.reject_reason && (
                      <div className="reject-reason">
                        原因: {request.reject_reason}
                      </div>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="request-actions">
                      <button
                        onClick={() => approveRequest(request.id)}
                        disabled={processingIds.has(request.id)}
                        className="approve-btn"
                      >
                        {processingIds.has(request.id) ? '⏳' : '✅'} 批准
                      </button>
                      <button
                        onClick={() => rejectRequest(request.id)}
                        disabled={processingIds.has(request.id)}
                        className="reject-btn"
                      >
                        {processingIds.has(request.id) ? '⏳' : '❌'} 拒绝
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .host-control-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .host-control-panel {
          background: #2a2a2a;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          color: white;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #444;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .statistics-section {
          display: flex;
          gap: 20px;
          padding: 16px 20px;
          background: #333;
          border-bottom: 1px solid #444;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-item.highlight {
          color: #FF9800;
        }

        .stat-label {
          font-size: 12px;
          color: #ccc;
        }

        .stat-value {
          font-size: 18px;
          font-weight: bold;
        }

        .tab-section {
          display: flex;
          border-bottom: 1px solid #444;
        }

        .tab-btn {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          color: #ccc;
          cursor: pointer;
          font-size: 14px;
        }

        .tab-btn.active {
          color: white;
          background: #444;
          border-bottom: 2px solid #4CAF50;
        }

        .tab-btn:hover:not(.active) {
          background: rgba(255, 255, 255, 0.05);
        }

        .requests-section {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .loading, .empty-state {
          text-align: center;
          padding: 40px;
          color: #ccc;
          font-size: 16px;
        }

        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .request-item {
          background: #333;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .request-user {
          flex: 1;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .user-name {
          font-weight: 500;
          font-size: 16px;
        }

        .speaking-indicator {
          color: #4CAF50;
          animation: pulse 1s infinite;
        }

        .offline-indicator {
          color: #666;
          font-size: 8px;
        }

        .user-username {
          color: #999;
          font-size: 12px;
        }

        .request-time {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #ccc;
        }

        .duration {
          color: #999;
        }

        .request-status {
          text-align: center;
        }

        .status-pending {
          color: #FF9800;
        }

        .status-approved {
          color: #4CAF50;
        }

        .status-rejected {
          color: #f44336;
        }

        .reject-reason {
          font-size: 11px;
          color: #f44336;
          margin-top: 4px;
        }

        .request-actions {
          display: flex;
          gap: 8px;
        }

        .approve-btn, .reject-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .approve-btn {
          background: #4CAF50;
          color: white;
        }

        .approve-btn:hover:not(:disabled) {
          background: #45a049;
        }

        .reject-btn {
          background: #f44336;
          color: white;
        }

        .reject-btn:hover:not(:disabled) {
          background: #da190b;
        }

        .approve-btn:disabled, .reject-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
} 