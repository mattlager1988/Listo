import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Segmented,
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

const { Title } = Typography;

interface ListItem {
  sysId: number;
  name: string;
  isDeleted: boolean;
  accountCount: number;
}

type ListType = 'types' | 'owners';

const ListManager: React.FC = () => {
  const [listType, setListType] = useState<ListType>('types');
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [form] = Form.useForm();

  const endpoint = listType === 'types' ? 'accounttypes' : 'accountowners';
  const itemLabel = listType === 'types' ? 'Type' : 'Owner';

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/lksem/${endpoint}?includeDeleted=${showDeleted}`);
      setItems(response.data);
    } catch {
      message.error(`Failed to fetch ${itemLabel.toLowerCase()}s`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, itemLabel, showDeleted]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item: ListItem) => {
    setEditingItem(item);
    form.setFieldsValue({ name: item.name });
    setModalVisible(true);
  };

  const handleSubmit = async (values: { name: string }) => {
    try {
      if (editingItem) {
        await api.put(`/lksem/${endpoint}/${editingItem.sysId}`, values);
        message.success(`${itemLabel} updated successfully`);
      } else {
        await api.post(`/lksem/${endpoint}`, values);
        message.success(`${itemLabel} created successfully`);
      }
      setModalVisible(false);
      fetchItems();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/lksem/${endpoint}/${id}`);
      message.success(`${itemLabel} deleted successfully`);
      fetchItems();
    } catch {
      message.error(`Failed to delete ${itemLabel.toLowerCase()}`);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/lksem/${endpoint}/${id}/restore`);
      message.success(`${itemLabel} restored successfully`);
      fetchItems();
    } catch {
      message.error(`Failed to restore ${itemLabel.toLowerCase()}`);
    }
  };

  const handlePurge = async (id: number) => {
    try {
      await api.delete(`/lksem/${endpoint}/${id}/purge`);
      message.success(`${itemLabel} permanently deleted successfully`);
      fetchItems();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || `Failed to purge ${itemLabel.toLowerCase()}`);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Accounts',
      dataIndex: 'accountCount',
      key: 'accountCount',
      width: 100,
    },
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
                  title={`Delete ${itemLabel.toLowerCase()}?`}
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
              {record.accountCount === 0 && (
                <Tooltip title="Purge permanently">
                  <Popconfirm
                    title={`Permanently delete ${itemLabel.toLowerCase()}?`}
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>List Manager</Title>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Segmented
          value={listType}
          onChange={(value) => setListType(value as ListType)}
          options={[
            { label: 'Account Types', value: 'types' },
            { label: 'Account Owners', value: 'owners' },
          ]}
        />
        <Space>
          <Button
            type={showDeleted ? 'primary' : 'default'}
            onClick={() => setShowDeleted(!showDeleted)}
          >
            {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add {itemLabel}
          </Button>
        </Space>
      </div>

      {showDeleted && (
        <Alert
          message="Showing deleted items"
          description="Deleted items are hidden from dropdowns but can be restored or permanently purged if they have no associated accounts."
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

      <Modal
        title={editingItem ? `Edit ${itemLabel}` : `Create ${itemLabel}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input />
          </Form.Item>

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
