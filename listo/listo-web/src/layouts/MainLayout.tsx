import React, { useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Typography } from 'antd';
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
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [version, setVersion] = useState<string>('');
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    if (location.pathname.startsWith('/lksem')) return ['/lksem'];
    if (location.pathname.startsWith('/aviation')) return ['/aviation'];
    if (location.pathname.startsWith('/admin')) return ['/admin'];
    return [];
  });

  // Update openKeys when pathname changes
  React.useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/lksem') && !openKeys.includes('/lksem')) {
      setOpenKeys(prev => [...prev, '/lksem']);
    } else if (path.startsWith('/aviation') && !openKeys.includes('/aviation')) {
      setOpenKeys(prev => [...prev, '/aviation']);
    } else if (path.startsWith('/admin') && !openKeys.includes('/admin')) {
      setOpenKeys(prev => [...prev, '/admin']);
    }
  }, [location.pathname, openKeys]);

  React.useEffect(() => {
    fetch('/api/system/version')
      .then(res => res.json())
      .then(data => setVersion(data.version))
      .catch(() => {});
  }, []);

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/lksem',
      icon: <BankOutlined />,
      label: 'LKSEM',
      children: [
        {
          key: '/lksem/accounts',
          label: 'Accounts',
        },
      ],
    },
    {
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
      ],
    },
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
      label: `Version ${version}`,
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
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
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={collapsed ? undefined : setOpenKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
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
