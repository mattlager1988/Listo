import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Tag,
} from 'antd';
import { ProTable } from '@ant-design/pro-components';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LinkOutlined,
  LoginOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

interface PasswordEntry {
  sysId: number;
  title: string;
  url: string | null;
  username: string | null;
  password: string | null;
  notes: string | null;
  categorySysId: number | null;
  categoryName: string | null;
  createTimestamp: string;
  modifyTimestamp: string;
}

interface PasswordCategory {
  sysId: number;
  name: string;
}

interface PasswordGroup {
  sysId: string;
  isGroupHeader: true;
  groupLabel: string;
  children: PasswordEntry[];
}

const Passwords: React.FC = () => {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [categories, setCategories] = useState<PasswordCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/passwords/passwordentries');
      setEntries(response.data);
    } catch {
      message.error('Failed to fetch passwords');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/passwords/passwordcategories');
      setCategories(response.data);
    } catch {
      message.error('Failed to fetch categories');
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchCategories();
  }, [fetchEntries, fetchCategories]);

  const groupedData = useMemo(() => {
    const search = searchText.toLowerCase();
    const filtered = search
      ? entries.filter(e =>
          e.title.toLowerCase().includes(search) ||
          e.url?.toLowerCase().includes(search) ||
          e.username?.toLowerCase().includes(search) ||
          e.categoryName?.toLowerCase().includes(search)
        )
      : entries;

    const byCategory = new Map<string, PasswordEntry[]>();

    for (const entry of filtered) {
      const cat = entry.categoryName ?? 'Uncategorized';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(entry);
    }

    const groups: (PasswordGroup | PasswordEntry)[] = [];

    const sortedCategories = [...byCategory.entries()].sort(([a], [b]) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    for (const [cat, items] of sortedCategories) {
      groups.push({
        sysId: `group-${cat}`,
        isGroupHeader: true,
        groupLabel: `${cat} (${items.length})`,
        children: items,
      });
    }

    return groups;
  }, [entries, searchText]);

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    setExpandedGroups(groupedData.filter(g => 'isGroupHeader' in g).map(g => g.sysId.toString()));
  }, [groupedData]);

  const handleCreate = () => {
    setEditingEntry(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (entry: PasswordEntry) => {
    setEditingEntry(entry);
    form.setFieldsValue({
      title: entry.title,
      url: entry.url,
      username: entry.username,
      password: entry.password,
      notes: entry.notes,
      categorySysId: entry.categorySysId,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingEntry) {
        await api.put(`/passwords/passwordentries/${editingEntry.sysId}`, values);
        message.success('Password updated successfully');
      } else {
        await api.post('/passwords/passwordentries', values);
        message.success('Password created successfully');
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      fetchEntries();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`/passwords/passwordentries/${id}`)));
      message.success(`${selectedRowKeys.length} password${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
      fetchEntries();
    } catch {
      message.error('Failed to delete passwords');
    }
  };

  const handleCopy = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard`);
  };

  const togglePasswordVisibility = (sysId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(sysId)) next.delete(sysId);
      else next.add(sysId);
      return next;
    });
  };

  const handleLaunchEntry = () => {
    const entry = entries.find(e => e.sysId.toString() === selectedRowKeys[0]?.toString());
    if (!entry || !entry.url) return;

    if (entry.password) {
      const textArea = document.createElement('textarea');
      textArea.value = entry.password;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    window.open(entry.url, '_blank', 'noopener,noreferrer');
  };

  const selectedEntry = selectedRowKeys.length === 1
    ? entries.find(e => e.sysId === Number(selectedRowKeys[0]))
    : null;

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      ellipsis: true,
      render: (_: unknown, record: PasswordEntry | PasswordGroup) => {
        if ('isGroupHeader' in record) {
          return <span style={{ fontWeight: 600 }}>{record.groupLabel}</span>;
        }
        return record.title;
      },
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 280,
      ellipsis: true,
      render: (_: unknown, record: PasswordEntry | PasswordGroup) => {
        if ('isGroupHeader' in record) return null;
        const entry = record as PasswordEntry;
        if (!entry.url) return '—';
        return (
          <Space size={4}>
            <LinkOutlined style={{ color: '#1890ff', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); window.open(entry.url!, '_blank'); }} />
            <span style={{ maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
              {entry.url}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (_: unknown, record: PasswordEntry | PasswordGroup) => {
        if ('isGroupHeader' in record) return null;
        const entry = record as PasswordEntry;
        if (!entry.username) return '—';
        return (
          <Space size={4}>
            <span>{entry.username}</span>
            <CopyOutlined
              style={{ color: '#1890ff', cursor: 'pointer' }}
              onClick={(e) => handleCopy(entry.username!, 'Username', e)}
            />
          </Space>
        );
      },
    },
    {
      title: 'Password',
      dataIndex: 'password',
      key: 'password',
      width: 150,
      render: (_: unknown, record: PasswordEntry | PasswordGroup) => {
        if ('isGroupHeader' in record) return null;
        const entry = record as PasswordEntry;
        if (!entry.password) return '—';
        const isVisible = visiblePasswords.has(entry.sysId);
        return (
          <Space size={4}>
            <span style={{ fontFamily: isVisible ? 'inherit' : 'monospace' }}>
              {isVisible ? entry.password : '••••••••'}
            </span>
            {isVisible
              ? <EyeInvisibleOutlined style={{ color: '#1890ff', cursor: 'pointer' }} onClick={(e) => togglePasswordVisibility(entry.sysId, e)} />
              : <EyeOutlined style={{ color: '#1890ff', cursor: 'pointer' }} onClick={(e) => togglePasswordVisibility(entry.sysId, e)} />
            }
            <CopyOutlined
              style={{ color: '#1890ff', cursor: 'pointer' }}
              onClick={(e) => handleCopy(entry.password!, 'Password', e)}
            />
          </Space>
        );
      },
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 120,
      render: (_: unknown, record: PasswordEntry | PasswordGroup) => {
        if ('isGroupHeader' in record) return null;
        const entry = record as PasswordEntry;
        return entry.categoryName ? <Tag>{entry.categoryName}</Tag> : '—';
      },
    },
    {
      title: 'Modified',
      dataIndex: 'modifyTimestamp',
      key: 'modifyTimestamp',
      width: 120,
      render: (_: unknown, record: PasswordEntry | PasswordGroup) => {
        if ('isGroupHeader' in record) return null;
        return dayjs((record as PasswordEntry).modifyTimestamp).format('MMM D, YYYY');
      },
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 112px)',
      }}
    >
      <PageHeader title="Passwords" />

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
        <Tooltip title="Add Password">
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
              if (selectedEntry) handleEdit(selectedEntry);
            }}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Launch & Copy Password">
          <Button
            type="text"
            size="small"
            icon={<LoginOutlined />}
            disabled={
              selectedRowKeys.length !== 1 ||
              !entries.find(e => e.sysId.toString() === selectedRowKeys[0]?.toString())?.url
            }
            onClick={handleLaunchEntry}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Delete">
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} password${selectedRowKeys.length > 1 ? 's' : ''}?`}
            description="This action cannot be undone."
            onConfirm={handleBulkDelete}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
            />
          </Popconfirm>
        </Tooltip>
        <div style={{ flex: 1 }} />
        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="Search passwords..."
          size="small"
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 200 }}
        />
        {selectedRowKeys.length > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 8 }}>{selectedRowKeys.length} selected</span>
        )}
      </div>

      {/* Table */}
      <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <ProTable
          columns={columns}
          dataSource={groupedData}
          rowKey={(record) => record.sysId.toString()}
          loading={loading}
          search={false}
          options={false}
          toolBarRender={false}
          tableAlertRender={false}
          pagination={false}
          size="small"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            getCheckboxProps: (record) => ({
              disabled: 'isGroupHeader' in record,
              style: 'isGroupHeader' in record ? { display: 'none' } : undefined,
            }),
          }}
          expandable={{
            expandedRowKeys: expandedGroups,
            onExpandedRowsChange: (keys) => setExpandedGroups(keys as string[]),
          }}
          onRow={(record) => {
            let clickTimer: ReturnType<typeof setTimeout> | null = null;
            return {
              onClick: () => {
                if ('isGroupHeader' in record) return;
                clickTimer = setTimeout(() => {
                  const key = record.sysId.toString();
                  setSelectedRowKeys([key]);
                }, 200);
              },
              onDoubleClick: () => {
                if (clickTimer) clearTimeout(clickTimer);
                if (!('isGroupHeader' in record)) handleEdit(record as PasswordEntry);
              },
              style: {
                cursor: 'isGroupHeader' in record ? 'default' : 'pointer',
                background: 'isGroupHeader' in record ? '#f5f5f5' : undefined,
                fontWeight: 'isGroupHeader' in record ? 600 : undefined,
              },
            };
          }}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingEntry ? 'Edit Password' : 'Add Password'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} size="small" requiredMark={false} autoComplete="off">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: 'Title is required' }]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="e.g., Gmail, Netflix" />
            </Form.Item>

            <Form.Item
              name="url"
              label="URL"
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="https://example.com" />
            </Form.Item>

            <Space size="middle" style={{ width: '100%' }}>
              <Form.Item
                name="username"
                label="Username"
                style={{ marginBottom: 0, flex: 1 }}
              >
                <Input placeholder="Username or email" />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                style={{ marginBottom: 0, flex: 1 }}
              >
                <Input.Password placeholder="Password" />
              </Form.Item>
            </Space>

            <Form.Item
              name="categorySysId"
              label="Category"
              style={{ marginBottom: 0 }}
            >
              <Select allowClear placeholder="Select category">
                {categories.map(c => (
                  <Select.Option key={c.sysId} value={c.sysId}>{c.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
              style={{ marginBottom: 0 }}
            >
              <Input.TextArea rows={3} placeholder="Security questions, recovery codes, etc." />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingEntry ? 'Update' : 'Create'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Passwords;
