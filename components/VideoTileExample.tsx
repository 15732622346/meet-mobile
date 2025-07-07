'use client';

import * as React from 'react';
import { useParticipants } from '@livekit/components-react';
import { 
  AttributeBasedVideoTile, 
  HostVideoTile, 
  MemberVideoTile, 
  CompactVideoTile,
  createVideoTilesFromParticipants 
} from './AttributeBasedVideoTile';
import { Participant } from 'livekit-client';
import { isHostOrAdmin } from '../lib/token-utils';

// 导入样式
import '../styles/AttributeBasedVideoTile.css';

/**
 * VideoTileExample - 展示如何使用 AttributeBasedVideoTile 组件
 * 
 * 使用场景：
 * 1. 🎯 主会议室布局 - 根据角色自动排序和样式
 * 2. 🎤 麦位管理界面 - 突出显示申请和已上麦用户
 * 3. 📱 移动端适配 - 响应式视频瓦片布局
 * 4. 🎨 自定义主题 - 支持多种视觉风格
 */
export function VideoTileExample() {
  const participants = useParticipants();
  const [selectedParticipant, setSelectedParticipant] = React.useState<Participant | null>(null);
  const [layout, setLayout] = React.useState<'grid' | 'list' | 'focus'>('grid');
  
  // 🎯 按角色分组参与者
  const groupedParticipants = React.useMemo(() => {
    const hosts: Participant[] = [];
    const members: Participant[] = [];
    
    participants.forEach(participant => {
      if (isHostOrAdmin(participant.attributes || {})) {
        hosts.push(participant);
      } else {
        members.push(participant);
      }
    });
    
    return { hosts, members };
  }, [participants]);
  
  // 🖱️ 处理参与者点击
  const handleParticipantClick = React.useCallback((participant: Participant) => {
    setSelectedParticipant(participant);
    console.log('选中参与者:', participant.name, participant.attributes);
  }, []);
  
  // 🖱️ 处理参与者双击
  const handleParticipantDoubleClick = React.useCallback((participant: Participant) => {
    setLayout('focus');
    setSelectedParticipant(participant);
    console.log('聚焦参与者:', participant.name);
  }, []);
  
  return (
    <div className="video-tile-example">
      {/* 🎛️ 布局控制 */}
      <div className="layout-controls">
        <button 
          onClick={() => setLayout('grid')}
          className={layout === 'grid' ? 'active' : ''}
        >
          网格布局
        </button>
        <button 
          onClick={() => setLayout('list')}
          className={layout === 'list' ? 'active' : ''}
        >
          列表布局
        </button>
        <button 
          onClick={() => setLayout('focus')}
          className={layout === 'focus' ? 'active' : ''}
        >
          聚焦布局
        </button>
      </div>
      
      {/* 📊 参与者统计 */}
      <div className="participant-stats">
        <span>主持人: {groupedParticipants.hosts.length}</span>
        <span>成员: {groupedParticipants.members.length}</span>
        <span>总计: {participants.length}</span>
      </div>
      
      {/* 🎥 视频瓦片布局 */}
      <div className={`video-tiles-container layout-${layout}`}>
        {layout === 'focus' && selectedParticipant ? (
          // 🌟 聚焦布局 - 单个大视频
          <div className="focus-layout">
            <AttributeBasedVideoTile
              participant={selectedParticipant}
              size="large"
              onClick={handleParticipantClick}
              onDoubleClick={() => setLayout('grid')}
              className="focused-tile"
            />
            {/* 其他参与者的小视频 */}
            <div className="other-participants">
              {participants
                .filter(p => p.identity !== selectedParticipant.identity)
                .slice(0, 6)
                .map(participant => (
                  <CompactVideoTile
                    key={participant.identity}
                    participant={participant}
                    onClick={handleParticipantClick}
                    onDoubleClick={handleParticipantDoubleClick}
                  />
                ))}
            </div>
          </div>
        ) : layout === 'list' ? (
          // 📋 列表布局 - 垂直排列
          <div className="list-layout">
            {/* 主持人区域 */}
            {groupedParticipants.hosts.length > 0 && (
              <div className="hosts-section">
                <h3>主持人</h3>
                <div className="hosts-list">
                  {groupedParticipants.hosts.map(participant => (
                    <HostVideoTile
                      key={participant.identity}
                      participant={participant}
                      onClick={handleParticipantClick}
                      onDoubleClick={handleParticipantDoubleClick}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* 成员区域 */}
            {groupedParticipants.members.length > 0 && (
              <div className="members-section">
                <h3>参会者</h3>
                <div className="members-list">
                  {groupedParticipants.members.map(participant => (
                    <MemberVideoTile
                      key={participant.identity}
                      participant={participant}
                      onClick={handleParticipantClick}
                      onDoubleClick={handleParticipantDoubleClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 🔲 网格布局 - 自动排列
          <div className="grid-layout">
            {/* 使用工具函数批量创建 */}
            {createVideoTilesFromParticipants(participants, {
              onClick: handleParticipantClick,
              onDoubleClick: handleParticipantDoubleClick,
              size: 'medium'
            })}
          </div>
        )}
      </div>
      
      {/* 📝 选中参与者信息 */}
      {selectedParticipant && (
        <div className="selected-participant-info">
          <h4>选中参与者信息</h4>
          <p><strong>姓名:</strong> {selectedParticipant.name}</p>
          <p><strong>身份:</strong> {selectedParticipant.identity}</p>
          <p><strong>属性:</strong></p>
          <pre>{JSON.stringify(selectedParticipant.attributes, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

/**
 * 🎤 麦位管理专用布局
 */
export function MicManagementLayout() {
  const participants = useParticipants();
  
  // 🎯 按麦位状态分组
  const micGroups = React.useMemo(() => {
    const onMic: Participant[] = [];
    const requesting: Participant[] = [];
    const others: Participant[] = [];
    
    participants.forEach(participant => {
      const attributes = participant.attributes || {};
      const micStatus = attributes.mic_status;
      
      if (micStatus === 'on_mic') {
        onMic.push(participant);
      } else if (micStatus === 'requesting') {
        requesting.push(participant);
      } else {
        others.push(participant);
      }
    });
    
    return { onMic, requesting, others };
  }, [participants]);
  
  return (
    <div className="mic-management-layout">
      {/* 🎤 已上麦区域 */}
      <div className="on-mic-section">
        <h3>已上麦 ({micGroups.onMic.length})</h3>
        <div className="on-mic-grid">
          {micGroups.onMic.map(participant => (
            <AttributeBasedVideoTile
              key={participant.identity}
              participant={participant}
              size="medium"
              className="on-mic-tile"
            />
          ))}
        </div>
      </div>
      
      {/* ✋ 申请中区域 */}
      {micGroups.requesting.length > 0 && (
        <div className="requesting-section">
          <h3>申请中 ({micGroups.requesting.length})</h3>
          <div className="requesting-list">
            {micGroups.requesting.map(participant => (
              <AttributeBasedVideoTile
                key={participant.identity}
                participant={participant}
                size="small"
                className="requesting-tile"
              />
            ))}
          </div>
        </div>
      )}
      
      {/* 👥 其他参与者 */}
      <div className="others-section">
        <h3>其他参与者 ({micGroups.others.length})</h3>
        <div className="others-grid">
          {micGroups.others.map(participant => (
            <CompactVideoTile
              key={participant.identity}
              participant={participant}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 📱 移动端优化布局
 */
export function MobileOptimizedLayout() {
  const participants = useParticipants();
  const [activeParticipant, setActiveParticipant] = React.useState<Participant | null>(null);
  
  // 🎯 自动选择活跃参与者（说话者）
  React.useEffect(() => {
    if (participants.length > 0 && !activeParticipant) {
      // 优先选择主持人
      const host = participants.find(p => isHostOrAdmin(p.attributes || {}));
      setActiveParticipant(host || participants[0]);
    }
  }, [participants, activeParticipant]);
  
  return (
    <div className="mobile-optimized-layout">
      {/* 🎯 主要视频区域 */}
      {activeParticipant && (
        <div className="main-video-area">
          <AttributeBasedVideoTile
            participant={activeParticipant}
            size="large"
            onClick={(p) => setActiveParticipant(p)}
          />
        </div>
      )}
      
      {/* 📱 参与者缩略图 */}
      <div className="participant-thumbnails">
        {participants
          .filter(p => p.identity !== activeParticipant?.identity)
          .map(participant => (
            <AttributeBasedVideoTile
              key={participant.identity}
              participant={participant}
              size="small"
              onClick={(p) => setActiveParticipant(p)}
              className="thumbnail"
            />
          ))}
      </div>
    </div>
  );
} 