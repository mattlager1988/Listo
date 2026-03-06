import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InboxOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

interface User {
  sysId: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  mfaEnabled: boolean;
  isActive: boolean;
  lastLoginAt?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [inactiveModalVisible, setInactiveModalVisible] = useState(false);
  const [inactiveUsers, setInactiveUsers] = useState<User[]>([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch {
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleSubmit = async (values: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    role: string;
    isActive?: boolean;
  }) => {
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.sysId}`, values);
        message.success('User updated successfully');
      } else {
        await api.post('/users', values);
        message.success('User created successfully');
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.post(`/users/${id}/deactivate`)));
      message.success(`${selectedRowKeys.length} user${selectedRowKeys.length > 1 ? 's' : ''} deactivated`);
      setSelectedRowKeys([]);
      fetchUsers();
    } catch {
      message.error('Failed to deactivate users');
    }
  };

  const fetchInactiveUsers = async () => {
    setInactiveLoading(true);
    try {
      const response = await api.get('/users/inactive');
      setInactiveUsers(response.data);
    } catch {
      message.error('Failed to fetch inactive users');
    } finally {
      setInactiveLoading(false);
    }
  };

  const handleReactivateUser = async (id: number) => {
    try {
      await api.post(`/users/${id}/reactivate`);
      message.success('User reactivated');
      fetchInactiveUsers();
      fetchUsers();
    } catch {
      message.error('Failed to reactivate user');
    }
  };

  const handleOpenInactiveModal = () => {
    setInactiveModalVisible(true);
    fetchInactiveUsers();
  };

  const handleResetMfa = async (id: number) => {
    try {
      await api.post(`/users/${id}/reset-mfa`);
      message.success('MFA has been reset');
      fetchUsers();
    } catch {
      message.error('Failed to reset MFA');
    }
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, record: User) => `${record.firstName} ${record.lastName}`,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'blue' : 'default'}>
          {role.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'MFA',
      dataIndex: 'mfaEnabled',
      key: 'mfaEnabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'warning'}>
          {enabled ? 'Enabled' : 'Disabled'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag
          color={active ? 'success' : 'error'}
          icon={active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : 'Never',
    },
  ];

  // Get the selected user for single-select actions
  const selectedUser = selectedRowKeys.length === 1
    ? users.find(u => u.sysId === selectedRowKeys[0])
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 112px)',
      }}
    >
      <PageHeader title="User Management" />

      {/* Action Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          marginBottom: 16,
          background: '#fafafa',
          border: '1px solid #e8e8e8',
          borderRadius: 6,
          gap: 4,
          flexShrink: 0,
        }}
      >
        <Tooltip title="Add User">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          />
        </Tooltip>
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => {
              if (selectedUser) handleEdit(selectedUser);
            }}
          />
        </Tooltip>
        <Tooltip title="Reset MFA">
          <Popconfirm
            title="Reset MFA?"
            description="This will disable MFA for this user."
            onConfirm={() => {
              if (selectedUser) handleResetMfa(selectedUser.sysId);
            }}
            disabled={!selectedUser?.mfaEnabled}
          >
            <Button
              type="text"
              size="small"
              icon={<SafetyOutlined />}
              disabled={!selectedUser?.mfaEnabled}
            />
          </Popconfirm>
        </Tooltip>
        <Tooltip title="Deactivate">
          <Popconfirm
            title={`Deactivate ${selectedRowKeys.length} user${selectedRowKeys.length > 1 ? 's' : ''}?`}
            description="Deactivated users can be reactivated later."
            onConfirm={handleBulkDeactivate}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<StopOutlined />}
              disabled={selectedRowKeys.length === 0}
            />
          </Popconfirm>
        </Tooltip>
        <Tooltip title="View Inactive">
          <Button
            type="text"
            size="small"
            icon={<InboxOutlined />}
            onClick={handleOpenInactiveModal}
          />
        </Tooltip>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c' }}>
          {selectedRowKeys.length > 0
            ? `${selectedRowKeys.length} selected`
            : 'Select rows to perform actions'}
        </div>
      </div>

      {/* Table Container */}
      <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="sysId"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          onRow={(record) => {
            let clickTimer: ReturnType<typeof setTimeout> | null = null;
            return {
              onClick: () => {
                clickTimer = setTimeout(() => {
                  const key = record.sysId;
                  setSelectedRowKeys(prev =>
                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                  );
                }, 200);
              },
              onDoubleClick: () => {
                if (clickTimer) clearTimeout(clickTimer);
                handleEdit(record);
              },
              style: { cursor: 'pointer' },
            };
          }}
          scroll={{ y: 'calc(100vh - 280px)' }}
        />
      </div>

      <Modal
        title={editingUser ? 'Edit User' : 'Create User'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ role: 'user', isActive: true }}
          size="small"
          requiredMark={false}
          autoComplete="off"
        >
          {/* Hidden fields to prevent browser password save prompts */}
          <input type="text" name="fake_username" style={{ display: 'none' }} autoComplete="username" />
          <input type="password" name="fake_password" style={{ display: 'none' }} autoComplete="current-password" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input autoComplete="off" />
            </Form.Item>

            {!editingUser && (
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Password is required' },
                  { min: 16, message: 'Password must be at least 16 characters' },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input.Password autoComplete="off" />
              </Form.Item>
            )}

            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, message: 'First name is required' }]}
              style={{ marginBottom: 0 }}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, message: 'Last name is required' }]}
              style={{ marginBottom: 0 }}
            >
              <Input />
            </Form.Item>

            <Form.Item name="phoneNumber" label="Phone Number" style={{ marginBottom: 0 }}>
              <Input />
            </Form.Item>

            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true }]}
              style={{ marginBottom: 0 }}
            >
              <Select>
                <Select.Option value="user">User</Select.Option>
                <Select.Option value="admin">Admin</Select.Option>
              </Select>
            </Form.Item>

            {editingUser && (
              <Form.Item
                name="isActive"
                label="Status"
                rules={[{ required: true }]}
                style={{ marginBottom: 0 }}
              >
                <Select>
                  <Select.Option value={true}>Active</Select.Option>
                  <Select.Option value={false}>Inactive</Select.Option>
                </Select>
              </Form.Item>
            )}

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingUser ? 'Update' : 'Create'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Inactive Users Modal */}
      <Modal
        title="Inactive Users"
        open={inactiveModalVisible}
        onCancel={() => setInactiveModalVisible(false)}
        footer={
          <Button onClick={() => setInactiveModalVisible(false)}>
            Close
          </Button>
        }
        width={600}
      >
        {inactiveLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading...</div>
        ) : inactiveUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            No inactive users
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {inactiveUsers.map(user => (
              <div
                key={user.sysId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {user.email} • {user.role.toUpperCase()}
                  </div>
                </div>
                <Tooltip title="Reactivate">
                  <Button
                    type="text"
                    icon={<UndoOutlined />}
                    onClick={() => handleReactivateUser(user.sysId)}
                  >
                    Reactivate
                  </Button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
