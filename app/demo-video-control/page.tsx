'use client';

import * as React from 'react';
import { VideoTileExample, MicManagementLayout, MobileOptimizedLayout } from '../../components/VideoTileExample';
import { AttributeBasedVideoTile } from '../../components/AttributeBasedVideoTile';

// 模拟数据
const mockParticipants = [
  {
    identity: 'host-001',
    name: '张老师',
    attributes: {
      role: '2',
      mic_status: 'on_mic',
      display_status: 'visible',
      join_time: '2024-01-01 10:00:00'
    }
  },
  {
    identity: 'student-001',
    name: '小明',
    attributes: {
      role: '1',
      mic_status: 'requesting',
      display_status: 'visible',
      request_time: '2024-01-01 10:05:00'
    }
  },
  {
    identity: 'student-002',
    name: '小红',
    attributes: {
      role: '1',
      mic_status: 'on_mic',
      display_status: 'visible',
      approve_time: '2024-01-01 10:03:00'
    }
  },
  {
    identity: 'student-003',
    name: '小李',
    attributes: {
      role: '1',
      mic_status: 'muted',
      display_status: 'visible',
      approve_time: '2024-01-01 10:02:00'
    }
  }
];

export default function DemoVideoControlPage() {
  const [demoMode, setDemoMode] = React.useState<'static' | 'dynamic'>('static');
  const [selectedLayout, setSelectedLayout] = React.useState<'example' | 'mic' | 'mobile'>('example');
  
  return (
    <div style={{ padding: '20px', background: '#111', color: '#fff', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 页面标题 */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#ff6b35' }}>🎯 基于 Participant Attributes 的视频框控制演示</h1>
          <p style={{ color: '#ccc', fontSize: '16px' }}>
            展示如何通过 LiveKit 的 participant.attributes 实现动态视频框样式控制
          </p>
        </div>
        
        {/* 控制面板 */}
        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '30px',
          border: '1px solid #333'
        }}>
          <h3 style={{ color: '#ff6b35', marginBottom: '15px' }}>🎛️ 控制面板</h3>
          
          {/* 演示模式 */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#ccc' }}>演示模式：</label>
            <div>
              <button 
                onClick={() => setDemoMode('static')}
                style={{ 
                  padding: '8px 16px', 
                  marginRight: '10px',
                  background: demoMode === 'static' ? '#ff6b35' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                静态演示
              </button>
              <button 
                onClick={() => setDemoMode('dynamic')}
                style={{ 
                  padding: '8px 16px',
                  background: demoMode === 'dynamic' ? '#ff6b35' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                动态演示
              </button>
            </div>
          </div>
          
          {/* 布局选择 */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#ccc' }}>布局类型：</label>
            <div>
              <button 
                onClick={() => setSelectedLayout('example')}
                style={{ 
                  padding: '8px 16px', 
                  marginRight: '10px',
                  background: selectedLayout === 'example' ? '#4CAF50' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                基础示例
              </button>
              <button 
                onClick={() => setSelectedLayout('mic')}
                style={{ 
                  padding: '8px 16px', 
                  marginRight: '10px',
                  background: selectedLayout === 'mic' ? '#4CAF50' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                麦位管理
              </button>
              <button 
                onClick={() => setSelectedLayout('mobile')}
                style={{ 
                  padding: '8px 16px',
                  background: selectedLayout === 'mobile' ? '#4CAF50' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                移动端优化
              </button>
            </div>
          </div>
        </div>
        
        {/* 样式说明 */}
        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '30px',
          border: '1px solid #333'
        }}>
          <h3 style={{ color: '#ff6b35', marginBottom: '15px' }}>🎨 样式说明</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <div style={{ 
                width: '40px', 
                height: '30px', 
                background: '#1a1a1a', 
                border: '2px solid #ff6b35',
                borderRadius: '4px',
                display: 'inline-block',
                marginRight: '10px'
              }}></div>
              <span style={{ color: '#ff6b35' }}>主持人</span>
            </div>
            <div>
              <div style={{ 
                width: '40px', 
                height: '30px', 
                background: '#1a1a1a', 
                border: '2px solid #4CAF50',
                borderRadius: '4px',
                display: 'inline-block',
                marginRight: '10px'
              }}></div>
              <span style={{ color: '#4CAF50' }}>已上麦</span>
            </div>
            <div>
              <div style={{ 
                width: '40px', 
                height: '30px', 
                background: '#1a1a1a', 
                border: '2px solid #FFC107',
                borderRadius: '4px',
                display: 'inline-block',
                marginRight: '10px'
              }}></div>
              <span style={{ color: '#FFC107' }}>申请中</span>
            </div>
            <div>
              <div style={{ 
                width: '40px', 
                height: '30px', 
                background: '#1a1a1a', 
                border: '2px solid #f44336',
                borderRadius: '4px',
                display: 'inline-block',
                marginRight: '10px',
                opacity: 0.7
              }}></div>
              <span style={{ color: '#f44336' }}>已静音</span>
            </div>
          </div>
        </div>
        
        {/* 模拟数据展示 */}
        {demoMode === 'static' && (
          <div style={{ 
            background: '#1a1a1a', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '30px',
            border: '1px solid #333'
          }}>
            <h3 style={{ color: '#ff6b35', marginBottom: '15px' }}>📊 模拟参与者数据</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              {mockParticipants.map((participant, index) => (
                <div key={index} style={{ 
                  background: '#2a2a2a', 
                  padding: '15px', 
                  borderRadius: '6px',
                  border: '1px solid #444'
                }}>
                  <h4 style={{ color: '#fff', marginBottom: '10px' }}>{participant.name}</h4>
                  <div style={{ fontSize: '12px', color: '#ccc' }}>
                    <div>身份: {participant.identity}</div>
                    <div>角色: {participant.attributes.role === '2' ? '主持人' : '学生'}</div>
                    <div>麦位状态: {participant.attributes.mic_status}</div>
                    <div>显示状态: {participant.attributes.display_status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 功能特性 */}
        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '30px',
          border: '1px solid #333'
        }}>
          <h3 style={{ color: '#ff6b35', marginBottom: '15px' }}>✨ 功能特性</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <h4 style={{ color: '#4CAF50', marginBottom: '5px' }}>🎯 实时状态同步</h4>
              <p style={{ color: '#ccc', fontSize: '14px' }}>
                通过 attributesChanged 事件实时更新视频框样式
              </p>
            </div>
            <div>
              <h4 style={{ color: '#4CAF50', marginBottom: '5px' }}>🎨 动态样式控制</h4>
              <p style={{ color: '#ccc', fontSize: '14px' }}>
                根据参与者属性自动调整边框、颜色和动画效果
              </p>
            </div>
            <div>
              <h4 style={{ color: '#4CAF50', marginBottom: '5px' }}>📱 响应式设计</h4>
              <p style={{ color: '#ccc', fontSize: '14px' }}>
                自动适配不同屏幕尺寸，支持移动端优化
              </p>
            </div>
            <div>
              <h4 style={{ color: '#4CAF50', marginBottom: '5px' }}>🔧 高度可定制</h4>
              <p style={{ color: '#ccc', fontSize: '14px' }}>
                支持自定义样式、事件处理和布局配置
              </p>
            </div>
          </div>
        </div>
        
        {/* 代码示例 */}
        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '30px',
          border: '1px solid #333'
        }}>
          <h3 style={{ color: '#ff6b35', marginBottom: '15px' }}>💻 代码示例</h3>
          <pre style={{ 
            background: '#0a0a0a', 
            padding: '15px', 
            borderRadius: '4px', 
            overflow: 'auto',
            fontSize: '12px',
            color: '#ccc'
          }}>
{`import { AttributeBasedVideoTile } from './components/AttributeBasedVideoTile';

function MyComponent() {
  const participants = useParticipants();
  
  return (
    <div>
      {participants.map(participant => (
        <AttributeBasedVideoTile
          key={participant.identity}
          participant={participant}
          size="medium"
          onClick={(p) => console.log('点击:', p.name)}
          showRoleLabel={true}
          showMicStatus={true}
        />
      ))}
    </div>
  );
}`}
          </pre>
        </div>
        
        {/* 演示区域 */}
        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #333'
        }}>
          <h3 style={{ color: '#ff6b35', marginBottom: '15px' }}>🎬 演示区域</h3>
          
          {demoMode === 'static' ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>
              <p style={{ fontSize: '18px', marginBottom: '20px' }}>
                📝 静态演示模式
              </p>
              <p>
                在实际的 LiveKit 房间中，这里会显示基于 participant.attributes 的动态视频瓦片。
              </p>
              <p style={{ marginTop: '20px', fontSize: '14px' }}>
                要查看完整功能，请在 LiveKit 房间环境中使用这些组件。
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>
              <p style={{ fontSize: '18px', marginBottom: '20px' }}>
                🔄 动态演示模式
              </p>
              <p>
                此模式需要在 LiveKit 房间上下文中运行。
              </p>
              <p style={{ marginTop: '20px', fontSize: '14px' }}>
                请在会议室页面中查看完整的动态效果。
              </p>
            </div>
          )}
        </div>
        
        {/* 使用指南 */}
        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px', 
          marginTop: '30px',
          border: '1px solid #333'
        }}>
          <h3 style={{ color: '#ff6b35', marginBottom: '15px' }}>📚 使用指南</h3>
          <ol style={{ color: '#ccc', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>导入组件：</strong> 
              <code style={{ background: '#333', padding: '2px 4px', borderRadius: '2px' }}>
                import {`{ AttributeBasedVideoTile }`} from './components/AttributeBasedVideoTile'
              </code>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>导入样式：</strong> 
              <code style={{ background: '#333', padding: '2px 4px', borderRadius: '2px' }}>
                import '../styles/AttributeBasedVideoTile.css'
              </code>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>在 LiveKit 房间中使用：</strong> 确保在 LiveKit 房间上下文中使用组件
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>监听属性变化：</strong> 组件会自动监听 attributesChanged 事件
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>自定义样式：</strong> 通过 CSS 类名或内联样式进行自定义
            </li>
          </ol>
          
          <div style={{ marginTop: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '6px' }}>
            <h4 style={{ color: '#FFC107', marginBottom: '10px' }}>⚠️ 注意事项</h4>
            <ul style={{ color: '#ccc', paddingLeft: '20px' }}>
              <li>此组件需要在 LiveKit 房间上下文中使用</li>
              <li>确保服务器端正确设置了 participant.attributes</li>
              <li>样式会根据属性值自动更新，无需手动控制</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 