import React, { useState, useRef, useEffect } from 'react';
import {
  Typography,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  message,
  Space,
  Popconfirm,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title } = Typography;

interface Account {
  sysId: number;
  name: string;
  accountTypeSysId: number;
  accountTypeName: string;
  accountOwnerSysId: number;
  accountOwnerName: string;
  amountDue?: number;
  dueDate?: string;
  accountNumber?: string;
  phoneNumber?: string;
  webAddress?: string;
  username?: string;
  password?: string;
  autoPay: boolean;
  resetAmountDue: boolean;
  accountFlag: string;
}

interface ListItem {
  sysId: number;
  name: string;
  isActive: boolean;
}

const flagColors: Record<string, string> = {
  Standard: 'default',
  Alert: 'error',
  Static: 'blue',
  OnHold: 'warning',
};

const Accounts: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountTypes, setAccountTypes] = useState<ListItem[]>([]);
  const [accountOwners, setAccountOwners] = useState<ListItem[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>(null);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const [typesRes, ownersRes] = await Promise.all([
          api.get('/accounttypes'),
          api.get('/accountowners'),
        ]);
        setAccountTypes(typesRes.data);
        setAccountOwners(ownersRes.data);
      } catch {
        message.error('Failed to load dropdown options');
      }
    };
    fetchLists();
  }, []);

  const handleCreate = () => {
    setEditingAccount(null);
    setShowPassword(false);
    form.resetFields();
    form.setFieldsValue({
      autoPay: false,
      resetAmountDue: false,
      accountFlag: 'Standard',
    });
    setModalVisible(true);
  };

  const handleEdit = (record: Account) => {
    setEditingAccount(record);
    setShowPassword(false);
    form.setFieldsValue({
      ...record,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        ...values,
        dueDate: values.dueDate ? (values.dueDate as dayjs.Dayjs).format('YYYY-MM-DD') : null,
      };

      if (editingAccount) {
        await api.put(`/accounts/${editingAccount.sysId}`, payload);
        message.success('Account updated successfully');
      } else {
        await api.post('/accounts', payload);
        message.success('Account created successfully');
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
      await api.delete(`/accounts/${id}`);
      message.success('Account deleted successfully');
      actionRef.current?.reload();
    } catch {
      message.error('Failed to delete account');
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return dayjs(value).format('MM/DD/YYYY');
  };

  const columns: ProColumns<Account>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: true,
      width: 180,
      fixed: 'left',
    },
    {
      title: 'Type',
      dataIndex: 'accountTypeName',
      width: 120,
      filters: accountTypes.map(t => ({ text: t.name, value: t.name })),
      onFilter: (value, record) => record.accountTypeName === value,
    },
    {
      title: 'Owner',
      dataIndex: 'accountOwnerName',
      width: 120,
      filters: accountOwners.map(o => ({ text: o.name, value: o.name })),
      onFilter: (value, record) => record.accountOwnerName === value,
    },
    {
      title: 'Amount Due',
      dataIndex: 'amountDue',
      width: 120,
      sorter: true,
      render: (_, record) => formatCurrency(record.amountDue),
      search: false,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      width: 110,
      sorter: true,
      render: (_, record) => formatDate(record.dueDate),
      search: false,
    },
    {
      title: 'Flag',
      dataIndex: 'accountFlag',
      width: 90,
      render: (_, record) => (
        <Tag color={flagColors[record.accountFlag] || 'default'}>
          {record.accountFlag}
        </Tag>
      ),
      filters: [
        { text: 'Standard', value: 'Standard' },
        { text: 'Alert', value: 'Alert' },
        { text: 'Static', value: 'Static' },
        { text: 'On Hold', value: 'OnHold' },
      ],
      onFilter: (value, record) => record.accountFlag === value,
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this account?"
            description="This cannot be undone."
            onConfirm={() => handleDelete(record.sysId)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const fetchData = async (params: { current?: number; pageSize?: number; name?: string }) => {
    const response = await api.get('/accounts');
    let data = response.data as Account[];

    // Client-side search by name
    if (params.name) {
      data = data.filter(item =>
        item.name.toLowerCase().includes(params.name!.toLowerCase())
      );
    }

    return {
      data,
      success: true,
      total: data.length,
    };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Accounts</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Account
        </Button>
      </div>

      <ProTable<Account>
        actionRef={actionRef}
        columns={columns}
        request={fetchData}
        rowKey="sysId"
        search={{
          labelWidth: 'auto',
          defaultCollapsed: true,
        }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
        }}
        options={{
          density: true,
          setting: true,
          reload: true,
        }}
        size="small"
        scroll={{ x: 900 }}
        dateFormatter="string"
      />

      <Modal
        title={editingAccount ? 'Edit Account' : 'Create Account'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            autoPay: false,
            resetAmountDue: false,
            accountFlag: 'Standard',
          }}
        >
          {/* Row 1: Name */}
          <Form.Item
            name="name"
            label="Account Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input />
          </Form.Item>

          {/* Row 2: Type, Owner */}
          <Space style={{ display: 'flex', width: '100%' }} size="middle">
            <Form.Item
              name="accountTypeSysId"
              label="Type"
              rules={[{ required: true, message: 'Type is required' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Select type">
                {accountTypes.map(t => (
                  <Select.Option key={t.sysId} value={t.sysId}>
                    {t.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="accountOwnerSysId"
              label="Owner"
              rules={[{ required: true, message: 'Owner is required' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Select owner">
                {accountOwners.map(o => (
                  <Select.Option key={o.sysId} value={o.sysId}>
                    {o.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          {/* Row 3: Amount Due, Due Date, Flag */}
          <Space style={{ display: 'flex', width: '100%' }} size="middle">
            <Form.Item name="amountDue" label="Amount Due" style={{ flex: 1 }}>
              <InputNumber
                prefix="$"
                precision={2}
                style={{ width: '100%' }}
                min={0}
              />
            </Form.Item>
            <Form.Item name="dueDate" label="Due Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
            </Form.Item>
            <Form.Item name="accountFlag" label="Flag" style={{ flex: 1 }}>
              <Select>
                <Select.Option value="Standard">Standard</Select.Option>
                <Select.Option value="Alert">Alert</Select.Option>
                <Select.Option value="Static">Static</Select.Option>
                <Select.Option value="OnHold">On Hold</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          {/* Row 4: Account Number, Phone */}
          <Space style={{ display: 'flex', width: '100%' }} size="middle">
            <Form.Item name="accountNumber" label="Account #" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="phoneNumber" label="Phone #" style={{ flex: 1 }}>
              <Input placeholder="(555) 555-5555" />
            </Form.Item>
          </Space>

          {/* Row 5: Web Address */}
          <Form.Item name="webAddress" label="Web Address">
            <Input placeholder="https://..." />
          </Form.Item>

          {/* Row 6: Username, Password */}
          <Space style={{ display: 'flex', width: '100%' }} size="middle">
            <Form.Item name="username" label="Username" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Password" style={{ flex: 1 }}>
              <Input
                type={showPassword ? 'text' : 'password'}
                suffix={
                  <Button
                    type="text"
                    size="small"
                    icon={showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setShowPassword(!showPassword)}
                  />
                }
              />
            </Form.Item>
          </Space>

          {/* Row 7: Auto Pay, Reset Amount Due */}
          <Space style={{ display: 'flex', width: '100%' }} size="large">
            <Form.Item name="autoPay" label="Auto Pay" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="resetAmountDue" label="Reset Amount Due" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingAccount ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Accounts;
