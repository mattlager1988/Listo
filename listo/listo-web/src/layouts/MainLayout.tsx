import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Typography, Badge } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BankOutlined,
  ToolOutlined,
  RocketOutlined,
  LockOutlined,
  ProjectOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasModule, MODULE_KEYS } from '../utils/modules';
import { messagingApi } from '../services/messagingApi';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

declare const __APP_VERSION__: string;

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(user?.sidebarCollapsed ?? true);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isPopout = searchParams.get('popout') === 'true';
  const [apiVersion, setApiVersion] = useState<string>('');
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    if (location.pathname.startsWith('/finance')) return ['/finance'];
    if (location.pathname.startsWith('/aviation')) return ['/aviation'];
    if (location.pathname.startsWith('/tasks')) return ['/tasks'];
    if (location.pathname.startsWith('/admin')) return ['/admin'];
    return [];
  });

  // Update openKeys when pathname changes
  React.useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/finance') && !openKeys.includes('/finance')) {
      setOpenKeys(prev => [...prev, '/finance']);
    } else if (path.startsWith('/aviation') && !openKeys.includes('/aviation')) {
      setOpenKeys(prev => [...prev, '/aviation']);
    } else if (path.startsWith('/tasks') && !openKeys.includes('/tasks')) {
      setOpenKeys(prev => [...prev, '/tasks']);
    } else if (path.startsWith('/admin') && !openKeys.includes('/admin')) {
      setOpenKeys(prev => [...prev, '/admin']);
    }
  }, [location.pathname, openKeys]);

  React.useEffect(() => {
    fetch('/api/system/version')
      .then(res => res.json())
      .then(data => setApiVersion(data.apiVersion))
      .catch(() => {});
  }, []);

  // Total unread messages for the sidebar badge. Refreshed on navigation and
  // on a light interval (the Messaging page itself uses SignalR for live updates).
  const [messagingUnread, setMessagingUnread] = useState(0);
  React.useEffect(() => {
    if (!hasModule(user, MODULE_KEYS.messaging)) return;
    let active = true;
    const refresh = () => {
      messagingApi.getConversations()
        .then(convs => { if (active) setMessagingUnread(convs.reduce((sum, c) => sum + c.unreadCount, 0)); })
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [user, location.pathname]);

  // Sync collapsed state when user preference loads/changes
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (user && initialLoadRef.current) {
      setCollapsed(user.sidebarCollapsed);
      initialLoadRef.current = false;
    }
  }, [user]);

  const menuItems = [
    ...(hasModule(user, MODULE_KEYS.dashboard) ? [{
      key: '/',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    }] : []),
    ...(hasModule(user, MODULE_KEYS.finance) ? [{
      key: '/finance',
      icon: <BankOutlined />,
      label: 'Finance & Bills',
      children: [
        {
          key: '/finance/accounts',
          label: 'Accounts',
        },
        {
          key: '/finance/cycleplans',
          label: 'Cycle Plans',
        },
        {
          key: '/finance/documents',
          label: 'Documents',
        },
      ],
    }] : []),
    ...(hasModule(user, MODULE_KEYS.aviation) ? [{
      key: '/aviation',
      icon: <RocketOutlined />,
      label: 'Aviation',
      children: [
        {
          key: '/aviation/training',
          label: 'Training Tracker',
        },
        {
          key: '/aviation/documents',
          label: 'Documents',
        },
        {
          key: '/aviation/notes',
          label: 'Notes',
        },
        {
          key: '/aviation/listen',
          label: 'Listen',
        },
      ],
    }] : []),
    ...(hasModule(user, MODULE_KEYS.messaging) ? [{
      key: '/messaging',
      icon: <MessageOutlined />,
      label: (
        <Space>
          Messaging
          {messagingUnread > 0 && <Badge count={messagingUnread} size="small" />}
        </Space>
      ),
    }] : []),
    ...(hasModule(user, MODULE_KEYS.passwords) ? [{
      key: '/passwords',
      icon: <LockOutlined />,
      label: 'Passwords',
    }] : []),
    ...(hasModule(user, MODULE_KEYS.tasks) ? [{
      key: '/tasks',
      icon: <ProjectOutlined />,
      label: 'Tasks',
      children: [
        {
          key: '/tasks/backlog',
          label: 'Backlog',
        },
        {
          key: '/tasks/boards',
          label: 'Boards',
        },
      ],
    }] : []),
    ...(user?.role === 'admin' ? [{
      key: '/admin',
      icon: <ToolOutlined />,
      label: 'Admin',
      children: [
        {
          key: '/admin/users',
          label: 'User Management',
        },
        {
          key: '/admin/lists',
          label: 'List Manager',
        },
        {
          key: '/admin/settings',
          label: 'Settings',
        },
      ],
    }] : []),
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Edit Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'version',
      label: `Web ${__APP_VERSION__} / API ${apiVersion}`,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: async () => {
        await logout();
        navigate('/login');
      },
    },
  ];

  // Popout mode: render content without sidebar/header
  if (isPopout) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#fff' }}>
        <Content style={{ margin: 24, padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <img
            src={collapsed ? '/logo-32.png' : '/logo-64.png'}
            alt="Listo"
            style={{ width: collapsed ? 32 : 40, height: collapsed ? 32 : 40 }}
          />
          {!collapsed && (
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>
              LISTO
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          openKeys={collapsed ? undefined : openKeys}
          onOpenChange={collapsed ? undefined : setOpenKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer', fontSize: 18 }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#1890ff' }}>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Avatar>
              <Text>{user?.firstName} {user?.lastName}</Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
