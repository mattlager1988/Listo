import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Popup, List, Dialog } from 'antd-mobile';
import {
  AppOutline,
  BankcardOutline,
  GlobalOutline,
  LockOutline,
  SetOutline,
  UserOutline,
} from 'antd-mobile-icons';
import { useAuth } from '@shared/contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';

declare const __APP_VERSION__: string;

interface MenuEntry {
  label: string;
  path: string;
  icon: React.ReactNode;
  matchPrefix?: string;
  adminOnly?: boolean;
}

const menuItems: MenuEntry[] = [
  { label: 'Dashboard', path: '/', icon: <AppOutline /> },
  { label: 'Finance & Bills', path: '/bills', icon: <BankcardOutline />, matchPrefix: '/bills,/cards,/cycle,/docs' },
  { label: 'Aviation', path: '/aviation/training', icon: <GlobalOutline />, matchPrefix: '/aviation' },
  { label: 'Passwords', path: '/passwords', icon: <LockOutline />, matchPrefix: '/passwords' },
  { label: 'Admin', path: '/admin/users', icon: <SetOutline />, matchPrefix: '/admin', adminOnly: true },
];

const HamburgerDrawer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { menuOpen, closeMenu } = useMenu();
  const [apiVersion, setApiVersion] = useState('');

  useEffect(() => {
    fetch('/api/system/version')
      .then(res => res.json())
      .then(data => setApiVersion(data.apiVersion))
      .catch(() => {});
  }, []);

  const handleNavigate = (path: string) => {
    closeMenu();
    navigate(path);
  };

  const handleLogout = async () => {
    closeMenu();
    const confirmed = await Dialog.confirm({
      content: 'Are you sure you want to log out?',
    });
    if (confirmed) {
      await logout();
    }
  };

  const isActive = (item: MenuEntry) => {
    if (item.path === '/') return location.pathname === '/';
    if (item.matchPrefix) {
      return item.matchPrefix.split(',').some(p => location.pathname.startsWith(p));
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <Popup
      visible={menuOpen}
      onMaskClick={closeMenu}
      position="left"
      bodyStyle={{ width: '75vw', maxWidth: 300 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* User header */}
        <div
          onClick={() => handleNavigate('/profile')}
          style={{
            padding: '24px 16px 16px',
            borderBottom: '1px solid #f0f0f0',
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#1890ff',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 8,
          }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {user?.firstName} {user?.lastName}
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{user?.email}</div>
        </div>

        {/* Module list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
            {menuItems
              .filter(item => !item.adminOnly || user?.role === 'Admin')
              .map(item => {
                const active = isActive(item);
                return (
                  <List.Item
                    key={item.label}
                    prefix={item.icon}
                    onClick={() => handleNavigate(item.path)}
                    style={{
                      background: active ? '#e6f7ff' : undefined,
                      '--prefix-width': '24px',
                    } as React.CSSProperties}
                  >
                    <span style={{
                      fontWeight: active ? 600 : 400,
                      color: active ? '#1890ff' : undefined,
                    }}>
                      {item.label}
                    </span>
                  </List.Item>
                );
              })}
          </List>
        </div>

        {/* Profile & Logout */}
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
          <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
            <List.Item
              prefix={<UserOutline />}
              onClick={() => handleNavigate('/profile')}
              style={{ '--prefix-width': '24px' } as React.CSSProperties}
            >
              Profile
            </List.Item>
            <List.Item
              prefix={<SetOutline />}
              onClick={handleLogout}
              style={{ '--prefix-width': '24px', color: '#ff4d4f' } as React.CSSProperties}
            >
              <span style={{ color: '#ff4d4f' }}>Log Out</span>
            </List.Item>
          </List>
          <div style={{ padding: '8px 16px', fontSize: 11, color: '#bfbfbf', textAlign: 'center' }}>
            Mobile {__APP_VERSION__}{apiVersion ? ` / API ${apiVersion}` : ''}
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default HamburgerDrawer;
