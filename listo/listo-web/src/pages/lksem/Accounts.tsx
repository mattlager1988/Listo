import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Dropdown,
  Radio,
  Typography,
} from 'antd';
import type { MenuProps, TableProps } from 'antd';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  DownOutlined,
  StarOutlined,
  StarFilled,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import PhoneInput from '../../components/PhoneInput';

const { Title } = Typography;

interface Account {
  sysId: number;
  name: string;
  accountTypeSysId: number;
  accountTypeName: string;
  accountOwnerSysId: number;
  accountOwnerName: string;
  amountDue: number;
  dueDate: string | null;
  accountNumber: string | null;
  phoneNumber: string | null;
  webAddress: string | null;
  username: string | null;
  password: string | null;
  autoPay: boolean;
  resetAmountDue: boolean;
  accountFlag: string;
}

interface ListItem {
  sysId: number;
  name: string;
  isDeleted: boolean;
}

interface SavedView {
  sysId: number;
  name: string;
  viewType: string;
  configuration: string;
  isDefault: boolean;
}

interface ViewConfiguration {
  columns: Record<string, { show?: boolean; fixed?: 'left' | 'right'; order?: number }>;
  sorter?: { field: string; order: 'ascend' | 'descend' };
  filters?: Record<string, FilterValue | null>;
}

const accountFlagColors: Record<string, string> = {
  Standard: 'default',
  Alert: 'error',
  Static: 'blue',
  OnHold: 'warning',
};

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTypes, setAccountTypes] = useState<ListItem[]>([]);
  const [accountOwners, setAccountOwners] = useState<ListItem[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentView, setCurrentView] = useState<SavedView | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saveViewModalVisible, setSaveViewModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [columnsState, setColumnsState] = useState<Record<string, { show?: boolean; fixed?: 'left' | 'right'; order?: number }>>({});
  const [sorterState, setSorterState] = useState<{ field: string; order: 'ascend' | 'descend' } | undefined>();
  const [filtersState, setFiltersState] = useState<Record<string, FilterValue | null>>({});
  const [form] = Form.useForm();
  const [saveViewForm] = Form.useForm();
  const actionRef = useRef<ActionType>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/lksem/accounts');
      setAccounts(response.data);
    } catch {
      message.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      const [typesRes, ownersRes] = await Promise.all([
        api.get('/lksem/accounttypes'),
        api.get('/lksem/accountowners'),
      ]);
      setAccountTypes(typesRes.data);
      setAccountOwners(ownersRes.data);
    } catch {
      message.error('Failed to fetch lists');
    }
  }, []);

  const fetchSavedViews = useCallback(async () => {
    try {
      const response = await api.get('/lksem/savedviews?viewType=accounts');
      setSavedViews(response.data);
      const defaultView = response.data.find((v: SavedView) => v.isDefault);
      if (defaultView) {
        loadViewConfiguration(defaultView);
      }
    } catch {
      // Views are optional, don't show error
    }
  }, []);

  const loadViewConfiguration = (view: SavedView) => {
    setCurrentView(view);
    try {
      const config: ViewConfiguration = JSON.parse(view.configuration);
      setColumnsState(config.columns || {});
      setSorterState(config.sorter);
      setFiltersState(config.filters || {});
    } catch {
      // Fallback for old format (just columns)
      setColumnsState(JSON.parse(view.configuration));
      setSorterState(undefined);
      setFiltersState({});
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchLists();
    fetchSavedViews();
  }, [fetchAccounts, fetchLists, fetchSavedViews]);

  const handleCreate = () => {
    setEditingAccount(null);
    form.resetFields();
    form.setFieldsValue({ accountFlag: 'Standard', autoPay: false, resetAmountDue: false, amountDue: 0 });
    setModalVisible(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    form.setFieldsValue({
      ...account,
      dueDate: account.dueDate ? dayjs(account.dueDate) : null,
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
        await api.put(`/lksem/accounts/${editingAccount.sysId}`, payload);
        message.success('Account updated successfully');
      } else {
        await api.post('/lksem/accounts', payload);
        message.success('Account created successfully');
      }
      setModalVisible(false);
      fetchAccounts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/lksem/accounts/${id}`);
      message.success('Account deleted successfully');
      fetchAccounts();
    } catch {
      message.error('Failed to delete account');
    }
  };

  const handleTableChange: TableProps<Account>['onChange'] = (_pagination, filters, sorter) => {
    // Handle sorting
    const s = sorter as SorterResult<Account>;
    if (s.field && s.order) {
      setSorterState({ field: s.field as string, order: s.order });
    } else {
      setSorterState(undefined);
    }

    // Handle filtering
    setFiltersState(filters);
  };

  const handleSaveView = async (values: { name?: string; isDefault: boolean; saveMode?: 'new' | 'update' }) => {
    try {
      const config: ViewConfiguration = {
        columns: columnsState,
        sorter: sorterState,
        filters: filtersState,
      };

      // Use existing name when updating, new name when creating
      const viewName = values.saveMode === 'update' && currentView
        ? currentView.name
        : values.name;

      if (!viewName) {
        message.error('View name is required');
        return;
      }

      const payload = {
        name: viewName,
        viewType: 'accounts',
        configuration: JSON.stringify(config),
        isDefault: values.isDefault,
      };

      if (values.saveMode === 'update' && currentView) {
        await api.put(`/lksem/savedviews/${currentView.sysId}`, payload);
        message.success('View updated successfully');
      } else {
        const response = await api.post('/lksem/savedviews', payload);
        message.success('View saved successfully');
        // Set the newly created view as current
        setCurrentView(response.data);
      }
      setSaveViewModalVisible(false);
      fetchSavedViews();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to save view');
    }
  };

  const handleLoadView = (view: SavedView) => {
    loadViewConfiguration(view);
  };

  const handleDeleteView = async (id: number) => {
    try {
      await api.delete(`/lksem/savedviews/${id}`);
      message.success('View deleted successfully');
      if (currentView?.sysId === id) {
        setCurrentView(null);
        setColumnsState({});
        setSorterState(undefined);
        setFiltersState({});
      }
      fetchSavedViews();
    } catch {
      message.error('Failed to delete view');
    }
  };

  const handleResetView = () => {
    setCurrentView(null);
    setColumnsState({});
    setSorterState(undefined);
    setFiltersState({});
    message.success('View reset to default successfully');
  };

  // Get filtered values for a column from state
  const getFilteredValue = (key: string): FilterValue | undefined => {
    const value = filtersState[key];
    return value ?? undefined;
  };

  const columns: ProColumns<Account>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sorterState?.field === 'name' ? sorterState.order : undefined,
      width: 150,
    },
    {
      title: 'Type',
      dataIndex: 'accountTypeName',
      key: 'accountTypeName',
      sorter: true,
      sortOrder: sorterState?.field === 'accountTypeName' ? sorterState.order : undefined,
      filters: accountTypes.map(t => ({ text: t.name, value: t.name })),
      filteredValue: getFilteredValue('accountTypeName'),
      onFilter: (value, record) => record.accountTypeName === value,
      width: 120,
    },
    {
      title: 'Owner',
      dataIndex: 'accountOwnerName',
      key: 'accountOwnerName',
      sorter: true,
      sortOrder: sorterState?.field === 'accountOwnerName' ? sorterState.order : undefined,
      filters: accountOwners.map(o => ({ text: o.name, value: o.name })),
      filteredValue: getFilteredValue('accountOwnerName'),
      onFilter: (value, record) => record.accountOwnerName === value,
      width: 120,
    },
    {
      title: 'Amount Due',
      dataIndex: 'amountDue',
      key: 'amountDue',
      sorter: true,
      sortOrder: sorterState?.field === 'amountDue' ? sorterState.order : undefined,
      render: (_, record) => `$${record.amountDue.toFixed(2)}`,
      align: 'right',
      width: 100,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      sorter: true,
      sortOrder: sorterState?.field === 'dueDate' ? sorterState.order : undefined,
      render: (_, record) => record.dueDate ? dayjs(record.dueDate).format('MM/DD/YYYY') : '-',
      width: 100,
    },
    {
      title: 'Flag',
      dataIndex: 'accountFlag',
      key: 'accountFlag',
      filters: [
        { text: 'Standard', value: 'Standard' },
        { text: 'Alert', value: 'Alert' },
        { text: 'Static', value: 'Static' },
        { text: 'On Hold', value: 'OnHold' },
      ],
      filteredValue: getFilteredValue('accountFlag'),
      onFilter: (value, record) => record.accountFlag === value,
      render: (_, record) => (
        <Tag color={accountFlagColors[record.accountFlag] || 'default'}>
          {record.accountFlag === 'OnHold' ? 'On Hold' : record.accountFlag}
        </Tag>
      ),
      width: 90,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete account?"
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record.sysId)}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Apply client-side sorting when sorterState is set
  const sortedAccounts = React.useMemo(() => {
    if (!sorterState) return accounts;

    const { field, order } = sorterState;
    const sorted = [...accounts].sort((a, b) => {
      const aVal = a[field as keyof Account];
      const bVal = b[field as keyof Account];

      if (aVal === null || aVal === undefined) return order === 'ascend' ? 1 : -1;
      if (bVal === null || bVal === undefined) return order === 'ascend' ? -1 : 1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'ascend' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'ascend' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return sorted;
  }, [accounts, sorterState]);

  // Apply client-side filtering
  const filteredAccounts = React.useMemo(() => {
    let result = sortedAccounts;

    Object.entries(filtersState).forEach(([key, values]) => {
      if (values && values.length > 0) {
        result = result.filter(account => {
          const accountValue = account[key as keyof Account];
          return values.includes(accountValue as string);
        });
      }
    });

    return result;
  }, [sortedAccounts, filtersState]);

  const viewMenuItems: MenuProps['items'] = [
    ...savedViews.map(view => ({
      key: view.sysId.toString(),
      label: (
        <Space>
          {view.isDefault ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
          {view.name}
          {currentView?.sysId === view.sysId && <Tag color="blue" style={{ marginLeft: 4 }}>Active</Tag>}
        </Space>
      ),
      onClick: () => handleLoadView(view),
    })),
    { type: 'divider' as const },
    {
      key: 'reset',
      label: 'Reset to Default',
      icon: <ReloadOutlined />,
      disabled: !currentView && Object.keys(columnsState).length === 0 && !sorterState && Object.keys(filtersState).length === 0,
      onClick: handleResetView,
    },
    {
      key: 'save',
      label: 'Save View...',
      icon: <SaveOutlined />,
      onClick: () => {
        saveViewForm.setFieldsValue({
          name: '',
          isDefault: false,
          saveMode: currentView ? 'update' : 'new',
        });
        setSaveViewModalVisible(true);
      },
    },
    ...(savedViews.length > 0 ? [{
      key: 'manage',
      label: 'Manage Views',
      children: savedViews.map(view => ({
        key: `delete-${view.sysId}`,
        label: `Delete "${view.name}"`,
        danger: true,
        onClick: () => handleDeleteView(view.sysId),
      })),
    }] : []),
  ];

  return (
    <div>
      <Title level={2} style={{ margin: 0, marginBottom: 16 }}>Accounts</Title>
      <ProTable<Account>
        actionRef={actionRef}
        rowKey="sysId"
        columns={columns}
        dataSource={filteredAccounts}
        loading={loading}
        search={false}
        onChange={handleTableChange}
        options={{
          density: true,
          fullScreen: true,
          reload: () => fetchAccounts(),
          setting: {
            draggable: true,
            checkable: true,
          },
        }}
        columnsState={{
          value: columnsState,
          onChange: setColumnsState,
        }}
        defaultSize="small"
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Dropdown key="views" menu={{ items: viewMenuItems }}>
            <Button>
              {currentView ? currentView.name : 'Views'} <DownOutlined />
            </Button>
          </Dropdown>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Account
          </Button>,
        ]}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        locale={{
          emptyText: (
            <div style={{ padding: '40px 0' }}>
              <p>No accounts found</p>
              <Button type="primary" onClick={handleCreate}>Add Your First Account</Button>
            </div>
          ),
        }}
      />

      {/* Account Modal */}
      <Modal
        title={editingAccount ? 'Edit Account' : 'Create Account'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
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

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="accountTypeSysId"
              label="Type"
              rules={[{ required: true, message: 'Type is required' }]}
              style={{ width: 250 }}
            >
              <Select
                options={accountTypes.map(t => ({ label: t.name, value: t.sysId }))}
                placeholder="Select type"
              />
            </Form.Item>

            <Form.Item
              name="accountOwnerSysId"
              label="Owner"
              rules={[{ required: true, message: 'Owner is required' }]}
              style={{ width: 250 }}
            >
              <Select
                options={accountOwners.map(o => ({ label: o.name, value: o.sysId }))}
                placeholder="Select owner"
              />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="amountDue"
              label="Amount Due"
              rules={[{ required: true, message: 'Amount is required' }]}
              style={{ width: 150 }}
            >
              <InputNumber
                prefix="$"
                precision={2}
                min={0}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="dueDate"
              label="Due Date"
              style={{ width: 150 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="accountFlag"
              label="Flag"
              rules={[{ required: true }]}
              style={{ width: 150 }}
            >
              <Select>
                <Select.Option value="Standard">Standard</Select.Option>
                <Select.Option value="Alert">Alert</Select.Option>
                <Select.Option value="Static">Static</Select.Option>
                <Select.Option value="OnHold">On Hold</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="accountNumber" label="Account Number">
            <Input />
          </Form.Item>

          <Form.Item name="phoneNumber" label="Phone Number">
            <PhoneInput />
          </Form.Item>

          <Form.Item
            name="webAddress"
            label="Web Address"
            rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="username" label="Username" style={{ width: 250 }}>
              <Input />
            </Form.Item>

            <Form.Item name="password" label="Password" style={{ width: 250 }}>
              <Input.Password visibilityToggle />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="autoPay" label="Auto Pay" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item name="resetAmountDue" label="Reset Amount Due" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingAccount ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Save View Modal */}
      <Modal
        title="Save View"
        open={saveViewModalVisible}
        onCancel={() => setSaveViewModalVisible(false)}
        footer={null}
        width={450}
      >
        <Form
          form={saveViewForm}
          layout="vertical"
          onFinish={handleSaveView}
        >
          {currentView && (
            <Form.Item
              name="saveMode"
              label="Save Option"
              rules={[{ required: true }]}
            >
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="update">
                    Update "{currentView.name}"
                  </Radio>
                  <Radio value="new">
                    Save as new view
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          )}

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.saveMode !== curr.saveMode}
          >
            {({ getFieldValue }) => {
              const saveMode = getFieldValue('saveMode');
              const showNameField = !currentView || saveMode === 'new';

              return showNameField ? (
                <Form.Item
                  name="name"
                  label="View Name"
                  rules={[{ required: true, message: 'Name is required' }]}
                >
                  <Input placeholder="My Custom View" />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          <Form.Item name="isDefault" label="Set as Default" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
              <Button onClick={() => setSaveViewModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Accounts;
