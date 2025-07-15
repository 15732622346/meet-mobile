import * as React from 'react';

export type TabItem = {
  key: string;
  label: string;
  content: React.ReactNode;
  isMicInfo?: boolean; // 添加一个标识，表明这是麦位信息标签
  customLabel?: React.ReactNode; // 添加自定义标签内容支持
};

interface MobileTabsProps {
  tabs: TabItem[];
  defaultActiveKey?: string;
}

export function MobileTabs({ tabs, defaultActiveKey }: MobileTabsProps) {
  const [activeKey, setActiveKey] = React.useState(defaultActiveKey || tabs[0]?.key || '');

  const handleTabClick = (key: string) => {
    setActiveKey(key);
  };

  return (
    <div className="mobile-tabs-container">
      <div className="mobile-tabs-nav">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            className={`mobile-tab-nav-item ${activeKey === tab.key ? 'active' : ''} ${tab.isMicInfo ? 'mic-info' : ''}`}
            onClick={() => handleTabClick(tab.key)}
          >
            {tab.isMicInfo ? (
              // 简化麦位信息的嵌套结构，直接显示customLabel
              tab.customLabel || (
                <span className="mic-count">
                  {tab.label}
                </span>
              )
            ) : (
              tab.customLabel || tab.label
            )}
          </div>
        ))}
      </div>
      <div className="mobile-tabs-content">
        {tabs.find(tab => tab.key === activeKey)?.content}
      </div>

      <style jsx>{`
        .mobile-tabs-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }
        
        .mobile-tabs-nav {
          display: flex;
          border-bottom: 2px solid #22c55e;
        }
        
        .mobile-tab-nav-item {
          flex: 1;
          padding: 12px 0;
          text-align: center;
          background: #111;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }
        
        .mobile-tab-nav-item.active {
          background: #22c55e;
          color: white;
          font-weight: bold;
        }
        
        .mobile-tab-nav-item.mic-info {
          display: flex;
          padding: 8px 10px;
          background-color: #22c55e;
          width: 100%;
        }
        
        .mobile-tab-nav-item.mic-info > div {
          width: 100%;
        }
        
        .mic-count {
          font-weight: 500;
          font-size: 13px;
        }
        
        .mobile-tabs-content {
          flex: 1;
          overflow-y: auto;
          background: white;
        }
      `}</style>
    </div>
  );
} 