'use client';

import React, { useState } from 'react';

interface RolePermissionsProps {
  userRole: number;
  userName: string;
}

export function RolePermissions({ userRole, userName }: RolePermissionsProps) {
  // 添加折叠状态，默认为折叠（true）
  const [isCollapsed, setIsCollapsed] = useState(true);

  const getRoleInfo = (role: number) => {
    switch (role) {
      case 3:
        return {
          name: '管理员',
          color: '#ff6b6b',
          permissions: [
            '✅ 摄像头：可开启',
            '✅ 麦克风：可开启', 
            '✅ 屏幕共享：可用',
            '✅ 控麦管理：可用'
          ],
          icon: '👑'
        };
      case 2:
        return {
          name: '主持人',
          color: '#4ecdc4',
          permissions: [
            '✅ 摄像头：可开启',
            '✅ 麦克风：可开启',
            '✅ 屏幕共享：可用',
            '✅ 控麦管理：可用'
          ],
          icon: '🎤'
        };
      case 1:
        return {
          name: '普通会员',
          color: '#95a5a6',
          permissions: [
            '❌ 摄像头：仅主持人可开启',
            '⚠️ 麦克风：需审批',
            '❌ 屏幕共享：仅主持人可用'
          ],
          icon: '👤'
        };
      case 0:
        return {
          name: '游客',
          color: '#f39c12',
          permissions: [
            '❌ 摄像头：游客不可用',
            '❌ 麦克风：需注册为会员',
            '❌ 屏幕共享：游客不可用'
          ],
          icon: '👤'
        };
      default:
        return {
          name: '普通会员',
          color: '#95a5a6',
          permissions: [
            '❌ 摄像头：仅主持人可开启',
            '⚠️ 麦克风：需审批',
            '❌ 屏幕共享：仅主持人可用'
          ],
          icon: '👤'
        };
    }
  };

  const roleInfo = getRoleInfo(userRole);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // 迷你模式样式
  if (isCollapsed) {
    return (
      <div 
        onClick={toggleCollapse}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '8px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          zIndex: 1000,
          border: `1px solid ${roleInfo.color}`,
          minWidth: '90px',
          maxWidth: '120px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span style={{ 
          fontSize: '14px',
          flexShrink: 0
        }}>
          {roleInfo.icon}
        </span>
        <div style={{ 
          fontWeight: '500', 
          color: 'white',
          fontSize: '11px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          flex: 1
        }}>
          {userName}
        </div>
        <span style={{
          fontSize: '8px',
          color: roleInfo.color,
          opacity: 0.7,
          flexShrink: 0
        }}>
          ▼
        </span>
      </div>
    );
  }

  // 展开模式样式
  return (
    <div 
      onClick={toggleCollapse}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '13px',
        zIndex: 1000,
        border: `2px solid ${roleInfo.color}`,
        minWidth: '240px',
        maxWidth: '280px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        lineHeight: '1.4',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        userSelect: 'none'
      }}
    >
      {/* 用户信息头部 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        marginBottom: '12px',
        paddingBottom: '10px',
        borderBottom: `1px solid ${roleInfo.color}30`
      }}>
        <span style={{ 
          fontSize: '18px',
          flexShrink: 0
        }}>
          {roleInfo.icon}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: roleInfo.color,
            fontSize: '15px',
            marginBottom: '2px'
          }}>
            {userName}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#bbb',
            opacity: 0.8
          }}>
            {roleInfo.name}
          </div>
        </div>
        {/* 展开/折叠指示器 */}
        <span style={{
          fontSize: '12px',
          color: roleInfo.color,
          transform: 'rotate(180deg)',
          transition: 'transform 0.3s ease',
          flexShrink: 0
        }}>
          ▼
        </span>
      </div>
      
      {/* 权限列表 */}
      <div style={{ 
        fontSize: '12px'
      }}>
        <div style={{ 
          color: '#999', 
          marginBottom: '8px',
          fontWeight: '500',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          当前权限
        </div>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {roleInfo.permissions.map((permission, index) => (
            <div key={index} style={{ 
              color: '#ddd',
              fontSize: '11px',
              lineHeight: '1.3',
              paddingLeft: '4px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '4px'
            }}>
              <span style={{ 
                flexShrink: 0,
                fontSize: '10px',
                marginTop: '1px'
              }}>
                •
              </span>
              <span style={{ flex: 1 }}>
                {permission}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 