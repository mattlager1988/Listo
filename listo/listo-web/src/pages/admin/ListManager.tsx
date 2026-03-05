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
  Tooltip,
  Collapse,
  Empty,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  InboxOutlined,
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [discontinuedModalVisible, setDiscontinuedModalVisible] = useState(false);
  const [discontinuedItems, setDiscontinuedItems] = useState<ListItem[]>([]);
  const [discontinuedLoading, setDiscontinuedLoading] = useState(false);
  const [form] = Form.useForm();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!activeList) return;
    setLoading(true);
    try {
      // Only fetch active items for main view
      const response = await api.get(activeList.endpoint);
      setItems(response.data);
    } catch {
      message.error(`Failed to fetch ${activeList.label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [activeList]);

  useEffect(() => {
    if (activeList) {
      fetchItems();
    }
  }, [activeList, fetchItems]);

  const handleSelectList = (list: ListConfig) => {
    setActiveList(list);
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

  const handleBulkDiscontinue = async () => {
    if (!activeList) return;
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`${activeList.endpoint}/${id}`)));
      message.success(`${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''} discontinued`);
      setSelectedRowKeys([]);
      fetchItems();
    } catch {
      message.error(`Failed to discontinue items`);
    }
  };

  const fetchDiscontinuedItems = async () => {
    if (!activeList) return;
    setDiscontinuedLoading(true);
    try {
      const response = await api.get(`${activeList.endpoint}?includeDeleted=true`);
      // Filter to only show deleted items
      setDiscontinuedItems(response.data.filter((item: ListItem) => item.isDeleted));
    } catch {
      message.error(`Failed to fetch discontinued ${activeList.label.toLowerCase()}`);
    } finally {
      setDiscontinuedLoading(false);
    }
  };

  const handleReactivate = async (id: number) => {
    if (!activeList) return;
    try {
      await api.post(`${activeList.endpoint}/${id}/restore`);
      message.success(`${activeList.singularLabel} reactivated`);
      fetchDiscontinuedItems();
      fetchItems();
    } catch {
      message.error(`Failed to reactivate ${activeList.singularLabel.toLowerCase()}`);
    }
  };

  const handlePurge = async (id: number) => {
    if (!activeList) return;
    try {
      await api.delete(`${activeList.endpoint}/${id}/purge`);
      message.success(`${activeList.singularLabel} permanently deleted`);
      fetchDiscontinuedItems();
    } catch {
      message.error(`Failed to purge ${activeList.singularLabel.toLowerCase()}`);
    }
  };

  const handleOpenDiscontinuedModal = () => {
    setDiscontinuedModalVisible(true);
    fetchDiscontinuedItems();
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

  // Get the selected item for single-select actions
  const selectedItem = selectedRowKeys.length === 1
    ? items.find(item => item.sysId === selectedRowKeys[0])
    : null;

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
              <h3 style={{ margin: '0 0 16px 0' }}>{activeList.label}</h3>

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
                    disabled={selectedRowKeys.length !== 1}
                    onClick={() => {
                      if (selectedItem) handleEdit(selectedItem);
                    }}
                  />
                </Tooltip>
                <Tooltip title="Discontinue">
                  <Popconfirm
                    title={`Discontinue ${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''}?`}
                    description="Discontinued items can be reactivated later."
                    onConfirm={handleBulkDiscontinue}
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
                <Tooltip title="View Discontinued">
                  <Button
                    type="text"
                    size="small"
                    icon={<InboxOutlined />}
                    onClick={handleOpenDiscontinuedModal}
                  />
                </Tooltip>
                <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c' }}>
                  {selectedRowKeys.length > 0
                    ? `${selectedRowKeys.length} selected`
                    : 'Select rows to perform actions'}
                </div>
              </div>

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
                    onDoubleClick: () => handleEdit(record),
                    style: { cursor: 'pointer' },
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

      {/* Discontinued Items Modal */}
      <Modal
        title={`Discontinued ${activeList?.label || 'Items'}`}
        open={discontinuedModalVisible}
        onCancel={() => setDiscontinuedModalVisible(false)}
        footer={
          <Button onClick={() => setDiscontinuedModalVisible(false)}>
            Close
          </Button>
        }
        width={600}
      >
        {discontinuedLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading...</div>
        ) : discontinuedItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            No discontinued {activeList?.label.toLowerCase() || 'items'}
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {discontinuedItems.map(item => (
              <div
                key={item.sysId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {getUsageCount(item) > 0
                      ? `Used by ${getUsageCount(item)} record${getUsageCount(item) !== 1 ? 's' : ''}`
                      : 'Not in use'
                    }
                  </div>
                </div>
                <Space>
                  <Tooltip title="Reactivate">
                    <Button
                      type="text"
                      icon={<UndoOutlined />}
                      onClick={() => handleReactivate(item.sysId)}
                    >
                      Reactivate
                    </Button>
                  </Tooltip>
                  {getUsageCount(item) === 0 && (
                    <Tooltip title="Permanently delete">
                      <Popconfirm
                        title="Permanently delete this item?"
                        description="This cannot be undone."
                        onConfirm={() => handlePurge(item.sysId)}
                      >
                        <Button
                          type="text"
                          danger
                          icon={<ClearOutlined />}
                        >
                          Purge
                        </Button>
                      </Popconfirm>
                    </Tooltip>
                  )}
                </Space>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ListManager;
