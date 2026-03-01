import React, { useState, useRef } from 'react';
import { Typography, Tabs, Button, Modal, Form, Input, InputNumber, Switch, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import api from '../../services/api';

const { Title } = Typography;

interface ListItem {
  sysId: number;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

type ListType = 'types' | 'owners';

const ListManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ListType>('types');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>(null);

  const getApiPath = (tab: ListType) => tab === 'types' ? '/accounttypes' : '/accountowners';

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, sortOrder: 0 });
    setModalVisible(true);
  };

  const handleEdit = (record: ListItem) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async (values: Omit<ListItem, 'sysId'>) => {
    try {
      if (editingItem) {
        await api.put(`${getApiPath(activeTab)}/${editingItem.sysId}`, values);
        message.success('Item updated successfully');
      } else {
        await api.post(getApiPath(activeTab), values);
        message.success('Item created successfully');
      }
      setModalVisible(false);
      actionRef.current?.reload();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`${getApiPath(activeTab)}/${id}`);
      message.success('Item deleted successfully');
      actionRef.current?.reload();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to delete item');
    }
  };

  const columns: ProColumns<ListItem>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: true,
      width: 200,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      search: false,
    },
    {
      title: 'Sort Order',
      dataIndex: 'sortOrder',
      sorter: true,
      width: 100,
      search: false,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      width: 80,
      render: (_, record) => (record.isActive ? 'Yes' : 'No'),
      valueType: 'select',
      valueEnum: {
        true: { text: 'Yes' },
        false: { text: 'No' },
      },
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this item?"
            description="This cannot be undone."
            onConfirm={() => handleDelete(record.sysId)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const fetchData = async (params: { current?: number; pageSize?: number; name?: string; isActive?: string }) => {
    const response = await api.get(`${getApiPath(activeTab)}?includeInactive=true`);
    let data = response.data as ListItem[];

    // Client-side filtering (API doesn't support query params)
    if (params.name) {
      data = data.filter(item => item.name.toLowerCase().includes(params.name!.toLowerCase()));
    }
    if (params.isActive !== undefined && params.isActive !== '') {
      const isActive = params.isActive === 'true';
      data = data.filter(item => item.isActive === isActive);
    }

    return {
      data,
      success: true,
      total: data.length,
    };
  };

  const tabItems = [
    { key: 'types', label: 'Account Types' },
    { key: 'owners', label: 'Account Owners' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>List Manager</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add {activeTab === 'types' ? 'Type' : 'Owner'}
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as ListType);
          actionRef.current?.reload();
        }}
        items={tabItems}
      />

      <ProTable<ListItem>
        actionRef={actionRef}
        columns={columns}
        request={fetchData}
        rowKey="sysId"
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
        }}
        options={{
          density: true,
          setting: true,
          reload: true,
        }}
        size="small"
        dateFormatter="string"
        headerTitle={activeTab === 'types' ? 'Account Types' : 'Account Owners'}
      />

      <Modal
        title={editingItem ? 'Edit Item' : 'Create Item'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ isActive: true, sortOrder: 0 }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="sortOrder" label="Sort Order">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
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
