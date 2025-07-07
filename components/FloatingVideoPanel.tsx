'use client';

import * as React from 'react';
import { useParticipants } from '@livekit/components-react';
import { ParticipantTile, GridLayout } from '@livekit/components-react';

interface FloatingVideoPanelProps {
  tracks: any[];
  userRole?: number;
  userId?: number;
  userName?: string;
  isVisible: boolean;
  onClose: () => void;
}

export function FloatingVideoPanel({
  tracks,
  userRole,
  userId,
  userName,
  isVisible,
  onClose
}: FloatingVideoPanelProps) {
  const [position, setPosition] = React.useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const panelRef = React.useRef<HTMLDivElement>(null);
  const participants = useParticipants();

  // 过滤出摄像头轨道
  const videoTracks = React.useMemo(() => {
    return tracks.filter(track => {
      return track.source === 'camera' || track.source === 'Camera';
    });
  }, [tracks]);

  // 拖拽功能
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const panelWidth = 320;
    const panelHeight = 240;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // 边界检查
    newX = Math.max(0, Math.min(newX, windowWidth - panelWidth));
    newY = Math.max(0, Math.min(newY, windowHeight - panelHeight));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // 全局鼠标事件监听
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isVisible) return null;

  return (
    <div 
      ref={panelRef}
      className="floating-video-panel"
      style={{ 
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: '320px',
        height: '240px',
        background: '#1a1a1a',
        border: '2px solid #444',
        borderRadius: '8px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        overflow: 'hidden'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 浮动窗口头部 */}
      <div style={{
        height: '30px',
        background: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid #444',
        flexShrink: 0,
        borderRadius: '6px 6px 0 0',
        cursor: 'grab'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
            📹 摄像头 ({videoTracks.length})
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 关闭按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '2px',
              lineHeight: 1
            }}
            title="隐藏摄像头面板"
          >
            ×
          </button>
        </div>
      </div>
      
      {/* 视频显示区域 */}
      <div style={{ 
        flex: '1',
        overflow: 'hidden',
        background: '#000',
        borderRadius: '0 0 6px 6px',
        position: 'relative'
      }}>
        {videoTracks.length > 0 ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: videoTracks.length === 1 ? '1fr' : 'repeat(2, 1fr)',
            gridTemplateRows: videoTracks.length <= 2 ? '1fr' : 'repeat(2, 1fr)',
            gap: '2px'
          }}>
            {videoTracks.slice(0, 4).map((track, index) => (
              <div
                key={track.participant?.identity || index}
                style={{
                  position: 'relative',
                  background: '#2a2a2a',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  minHeight: '0'
                }}
              >
                                 <ParticipantTile 
                   {...track}
                   style={{
                     width: '100%',
                     height: '100%'
                   }}
                 />
                {/* 参与者名称覆盖层 */}
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {track.participant?.name || `用户${index + 1}`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '14px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📹</div>
              <div>暂无摄像头画面</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 