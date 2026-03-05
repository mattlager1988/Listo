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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    setSelectedRowKeys([]);
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setSubmitError(null);
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
    setSubmitError(null);
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!activeList) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (editingItem) {
        await api.put(`${activeList.endpoint}/${editingItem.sysId}`, values);
        message.success(`${activeList.singularLabel} updated successfully`);
      } else {
        await api.post(activeList.endpoint, values);
        message.success(`${activeList.singularLabel} created successfully`);
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      fetchItems();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || 'Operation failed';
      setSubmitError(errorMessage);
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!activeList) return;
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`${activeList.endpoint}/${id}`)));
      message.success(`${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''} deleted successfully`);
      setSelectedRowKeys([]);
      fetchItems();
    } catch {
      message.error(`Failed to delete items`);
    }
  };

  const handleBulkRestore = async () => {
    if (!activeList) return;
    try {
      await Promise.all(selectedRowKeys.map(id => api.post(`${activeList.endpoint}/${id}/restore`)));
      message.success(`${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''} restored successfully`);
      setSelectedRowKeys([]);
      fetchItems();
    } catch {
      message.error(`Failed to restore items`);
    }
  };

  const handleBulkPurge = async () => {
    if (!activeList) return;
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`${activeList.endpoint}/${id}/purge`)));
      message.success(`${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''} permanently deleted`);
      setSelectedRowKeys([]);
      fetchItems();
    } catch {
      message.error(`Failed to purge items`);
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

  // Determine selected items' state for toolbar actions
  const selectedItems = items.filter(item => selectedRowKeys.includes(item.sysId));
  const allSelectedActive = selectedItems.length > 0 && selectedItems.every(item => !item.isDeleted);
  const allSelectedDeleted = selectedItems.length > 0 && selectedItems.every(item => item.isDeleted);
  const selectedItem = selectedRowKeys.length === 1 ? selectedItems[0] : null;
  const canPurge = allSelectedDeleted && selectedItems.every(item => getUsageCount(item) === 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 112px)',
      }}
    >
      <PageHeader title="List Manager" />

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Left sidebar - module/list selection */}
        <div style={{ width: 250, flexShrink: 0, overflow: 'auto' }}>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeList ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
                <h3 style={{ margin: 0 }}>{activeList.label}</h3>
                <Button
                  type={showDeleted ? 'primary' : 'default'}
                  onClick={() => {
                    setShowDeleted(!showDeleted);
                    setSelectedRowKeys([]);
                  }}
                >
                  {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
                </Button>
              </div>

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
                <Tooltip title={`Add ${activeList.singularLabel}`}>
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
                    disabled={!selectedItem || selectedItem.isDeleted}
                    onClick={() => {
                      if (selectedItem && !selectedItem.isDeleted) handleEdit(selectedItem);
                    }}
                  />
                </Tooltip>
                <Tooltip title="Delete">
                  <Popconfirm
                    title={`Delete ${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''}?`}
                    description="This will hide them from dropdowns."
                    onConfirm={handleBulkDelete}
                    disabled={!allSelectedActive}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!allSelectedActive}
                    />
                  </Popconfirm>
                </Tooltip>
                <Tooltip title="Restore">
                  <Button
                    type="text"
                    size="small"
                    icon={<UndoOutlined />}
                    disabled={!allSelectedDeleted}
                    onClick={handleBulkRestore}
                  />
                </Tooltip>
                <Tooltip title="Purge permanently">
                  <Popconfirm
                    title={`Permanently delete ${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''}?`}
                    description="This cannot be undone."
                    onConfirm={handleBulkPurge}
                    disabled={!canPurge}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<ClearOutlined />}
                      disabled={!canPurge}
                    />
                  </Popconfirm>
                </Tooltip>
                <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c' }}>
                  {selectedRowKeys.length > 0
                    ? `${selectedRowKeys.length} selected`
                    : 'Select rows to perform actions'}
                </div>
              </div>

              {showDeleted && (
                <Alert
                  message="Showing deleted items"
                  description="Deleted items can be restored or permanently purged if unused."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16, flexShrink: 0 }}
                />
              )}

              {/* Table Container */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <Table
                  columns={columns}
                  dataSource={items}
                  rowKey="sysId"
                  loading={loading}
                  size="small"
                  pagination={false}
                  rowSelection={{
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                  }}
                  onRow={(record) => ({
                    onClick: () => {
                      const key = record.sysId;
                      setSelectedRowKeys(prev =>
                        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                      );
                    },
                    onDoubleClick: () => {
                      if (!record.isDeleted) handleEdit(record);
                    },
                    style: { cursor: record.isDeleted ? 'default' : 'pointer' },
                  })}
                  scroll={{ y: 'calc(100vh - 350px)' }}
                />
              </div>
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
        {submitError && (
          <Alert
            message={submitError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setSubmitError(null)}
          />
        )}
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
              ) : field.type === 'textarea' ? (
                <Input.TextArea rows={field.rows || 4} placeholder={field.placeholder} />
              ) : (
                <Input placeholder={field.placeholder} />
              )}
            </Form.Item>
          ))}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingItem ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)} disabled={submitting}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ListManager;
