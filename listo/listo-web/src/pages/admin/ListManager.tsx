import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Collapse,
  Empty,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UndoOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { listRegistry } from '../../config/listRegistry';
import type { ListConfig, ModuleConfig } from '../../config/listRegistry';

interface ListItem {
  sysId: number;
  name: string;
  isDeleted: boolean;
  [key: string]: unknown; // For custom fields and usage counts
}

const ListManager: React.FC = () => {
  const [activeModule, setActiveModule] = useState<string | string[]>(
    listRegistry.length > 0 ? [listRegistry[0].key] : []
  );
  const [activeList, setActiveList] = useState<ListConfig | null>(
    listRegistry[0]?.lists[0] || null
  );
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [form] = Form.useForm();

  const fetchItems = useCallback(async () => {
    if (!activeList) return;
    setLoading(true);
    try {
      const response = await api.get(`${activeList.endpoint}?includeDeleted=${showDeleted}`);
      setItems(response.data);
    } catch {
      message.error(`Failed to fetch ${activeList.label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [activeList, showDeleted]);

  useEffect(() => {
    if (activeList) {
      fetchItems();
    }
  }, [activeList, fetchItems]);

  const handleSelectList = (list: ListConfig) => {
    setActiveList(list);
    setShowDeleted(false);
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item: ListItem) => {
    setEditingItem(item);
    const formValues: Record<string, unknown> = { name: item.name };
    // Populate custom fields
    if (activeList?.formFields) {
      activeList.formFields.forEach(field => {
        formValues[field.name] = item[field.name];
      });
    }
    form.setFieldsValue(formValues);
    setModalVisible(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!activeList) return;
    try {
      if (editingItem) {
        await api.put(`${activeList.endpoint}/${editingItem.sysId}`, values);
        message.success(`${activeList.singularLabel} updated successfully`);
      } else {
        await api.post(activeList.endpoint, values);
        message.success(`${activeList.singularLabel} created successfully`);
      }
      setModalVisible(false);
      fetchItems();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!activeList) return;
    try {
      await api.delete(`${activeList.endpoint}/${id}`);
      message.success(`${activeList.singularLabel} deleted successfully`);
      fetchItems();
    } catch {
      message.error(`Failed to delete ${activeList.singularLabel.toLowerCase()}`);
    }
  };

  const handleRestore = async (id: number) => {
    if (!activeList) return;
    try {
      await api.post(`${activeList.endpoint}/${id}/restore`);
      message.success(`${activeList.singularLabel} restored successfully`);
      fetchItems();
    } catch {
      message.error(`Failed to restore ${activeList.singularLabel.toLowerCase()}`);
    }
  };

  const handlePurge = async (id: number) => {
    if (!activeList) return;
    try {
      await api.delete(`${activeList.endpoint}/${id}/purge`);
      message.success(`${activeList.singularLabel} permanently deleted`);
      fetchItems();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || `Failed to purge`);
    }
  };

  const getUsageCount = (record: ListItem): number => {
    if (!activeList?.usageCountField) return 0;
    return (record[activeList.usageCountField] as number) || 0;
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    // Add custom columns from config
    ...(activeList?.customFields || []).map(field => ({
      title: field.label,
      dataIndex: field.dataIndex,
      key: field.key,
    })),
    ...(activeList?.usageCountField ? [{
      title: 'Usage',
      key: 'usage',
      width: 100,
      render: (_: unknown, record: ListItem) => getUsageCount(record),
    }] : []),
    {
      title: 'Status',
      dataIndex: 'isDeleted',
      key: 'isDeleted',
      width: 100,
      render: (isDeleted: boolean) => (
        <Tag color={isDeleted ? 'error' : 'success'}>
          {isDeleted ? 'Deleted' : 'Active'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: ListItem) => (
        <Space>
          {!record.isDeleted ? (
            <>
              <Tooltip title="Edit">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
              <Tooltip title="Delete">
                <Popconfirm
                  title={`Delete ${activeList?.singularLabel.toLowerCase()}?`}
                  description="This will hide it from dropdowns."
                  onConfirm={() => handleDelete(record.sysId)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Restore">
                <Button
                  type="text"
                  icon={<UndoOutlined />}
                  onClick={() => handleRestore(record.sysId)}
                />
              </Tooltip>
              {getUsageCount(record) === 0 && (
                <Tooltip title="Purge permanently">
                  <Popconfirm
                    title={`Permanently delete?`}
                    description="This cannot be undone."
                    onConfirm={() => handlePurge(record.sysId)}
                  >
                    <Button type="text" danger icon={<ClearOutlined />} />
                  </Popconfirm>
                </Tooltip>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  const renderModulePanel = (module: ModuleConfig) => (
    <div style={{ padding: '8px 0' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {module.lists.map(list => (
          <Button
            key={list.key}
            type={activeList?.key === list.key ? 'primary' : 'default'}
            block
            style={{ textAlign: 'left' }}
            onClick={() => handleSelectList(list)}
          >
            {list.label}
          </Button>
        ))}
      </Space>
    </div>
  );

  return (
    <div>
      <PageHeader title="List Manager" />

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left sidebar - module/list selection */}
        <div style={{ width: 250, flexShrink: 0 }}>
          <Collapse
            activeKey={activeModule}
            onChange={setActiveModule}
            items={listRegistry.map(module => ({
              key: module.key,
              label: module.label,
              children: renderModulePanel(module),
            }))}
          />
        </div>

        {/* Right content - list management */}
        <div style={{ flex: 1 }}>
          {activeList ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>{activeList.label}</h3>
                <Space>
                  <Button
                    type={showDeleted ? 'primary' : 'default'}
                    onClick={() => setShowDeleted(!showDeleted)}
                  >
                    {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                    Add {activeList.singularLabel}
                  </Button>
                </Space>
              </div>

              {showDeleted && (
                <Alert
                  message="Showing deleted items"
                  description="Deleted items can be restored or permanently purged if unused."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Table
                columns={columns}
                dataSource={items}
                rowKey="sysId"
                loading={loading}
                size="small"
                pagination={false}
              />
            </>
          ) : (
            <Empty description="Select a list to manage" />
          )}
        </div>
      </div>

      <Modal
        title={editingItem ? `Edit ${activeList?.singularLabel}` : `Create ${activeList?.singularLabel}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input />
          </Form.Item>

          {/* Render custom form fields */}
          {activeList?.formFields?.map(field => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label}
              rules={field.required ? [{ required: true, message: `${field.label} is required` }] : []}
            >
              {field.type === 'number' ? (
                <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} />
              ) : (
                <Input placeholder={field.placeholder} />
              )}
            </Form.Item>
          ))}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingItem ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ListManager;
