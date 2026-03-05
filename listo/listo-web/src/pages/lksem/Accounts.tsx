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
} from 'antd';
import type { MenuProps, TableProps } from 'antd';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  SaveOutlined,
  DownOutlined,
  StarOutlined,
  StarFilled,
  ReloadOutlined,
  DollarOutlined,
  InboxOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import PhoneInput from '../../components/PhoneInput';
import PageHeader from '../../components/PageHeader';

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
  notes: string | null;
  isDiscontinued: boolean;
  discontinuedDate: string | null;
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

const accountFlagTextColors: Record<string, string | undefined> = {
  Standard: undefined,
  Alert: '#ff4d4f',
  Static: '#1677ff',
  OnHold: '#faad14',
};

interface AccountGroup {
  sysId: string;
  isGroupHeader: true;
  accountFlag: string;
  children: Account[];
  accountCount: number;
  totalAmountDue: number;
}

type TableRecord = Account | AccountGroup;

const FLAG_ORDER = ['Standard', 'Static', 'Alert', 'OnHold'];
const FLAG_DISPLAY_NAMES: Record<string, string> = {
  Standard: 'Standard',
  Static: 'Static',
  Alert: 'Alert',
  OnHold: 'On Hold',
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [showOnHold, setShowOnHold] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<React.Key[]>(
    FLAG_ORDER.map(f => `group-${f}`)
  );
  const [totalModalVisible, setTotalModalVisible] = useState(false);
  const [selectedTotal, setSelectedTotal] = useState(0);
  const [discontinuedModalVisible, setDiscontinuedModalVisible] = useState(false);
  const [discontinuedAccounts, setDiscontinuedAccounts] = useState<Account[]>([]);
  const [discontinuedLoading, setDiscontinuedLoading] = useState(false);
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
    setSelectedRowKeys([]);
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
      setSelectedRowKeys([]);
      fetchAccounts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDiscontinue = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.post(`/lksem/accounts/${id}/discontinue`)));
      message.success(`${selectedRowKeys.length} account${selectedRowKeys.length > 1 ? 's' : ''} discontinued`);
      setSelectedRowKeys([]);
      fetchAccounts();
    } catch {
      message.error('Failed to discontinue accounts');
    }
  };

  const fetchDiscontinuedAccounts = async () => {
    setDiscontinuedLoading(true);
    try {
      const response = await api.get('/lksem/accounts/discontinued');
      setDiscontinuedAccounts(response.data);
    } catch {
      message.error('Failed to fetch discontinued accounts');
    } finally {
      setDiscontinuedLoading(false);
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await api.post(`/lksem/accounts/${id}/reactivate`);
      message.success('Account reactivated');
      fetchDiscontinuedAccounts();
      fetchAccounts();
    } catch {
      message.error('Failed to reactivate account');
    }
  };

  const handleOpenDiscontinuedModal = () => {
    setDiscontinuedModalVisible(true);
    fetchDiscontinuedAccounts();
  };

  const handleTotalSelected = () => {
    const total = accounts
      .filter(a => selectedRowKeys.includes(a.sysId.toString()))
      .reduce((sum, a) => sum + a.amountDue, 0);
    setSelectedTotal(total);

    // Copy to clipboard using fallback method for better browser support
    const textArea = document.createElement('textarea');
    textArea.value = total.toFixed(2);
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      message.success('Total copied to clipboard');
    } catch {
      message.warning('Could not copy to clipboard');
    }
    document.body.removeChild(textArea);

    setTotalModalVisible(true);
  };

  const handleTableChange: TableProps<TableRecord>['onChange'] = (_pagination, filters, sorter) => {
    // Handle sorting
    const s = sorter as SorterResult<TableRecord>;
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

  const columns: ProColumns<TableRecord>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: false,
      sortOrder: sorterState?.field === 'name' ? sorterState.order : undefined,
      width: 150,
      render: (_, record) => {
        if ('isGroupHeader' in record && record.isGroupHeader) {
          return (
            <Space>
              <Tag color={accountFlagColors[record.accountFlag]}>
                {FLAG_DISPLAY_NAMES[record.accountFlag]}
              </Tag>
              <span style={{ color: '#8c8c8c' }}>({record.accountCount})</span>
            </Space>
          );
        }
        return (record as Account).name;
      },
    },
    {
      title: 'Type',
      dataIndex: 'accountTypeName',
      key: 'accountTypeName',
      sorter: false,
      sortOrder: sorterState?.field === 'accountTypeName' ? sorterState.order : undefined,
      filters: accountTypes.map(t => ({ text: t.name, value: t.name })),
      filteredValue: getFilteredValue('accountTypeName'),
      onFilter: (value, record) => 'isGroupHeader' in record || (record as Account).accountTypeName === value,
      width: 120,
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        return (record as Account).accountTypeName;
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      sorter: false,
      sortOrder: sorterState?.field === 'dueDate' ? sorterState.order : undefined,
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        const account = record as Account;
        return account.dueDate ? dayjs(account.dueDate).format('MM/DD/YYYY') : '-';
      },
      width: 100,
    },
    {
      title: 'Amount Due',
      dataIndex: 'amountDue',
      key: 'amountDue',
      sorter: false,
      sortOrder: sorterState?.field === 'amountDue' ? sorterState.order : undefined,
      render: (_, record) => {
        if ('isGroupHeader' in record && record.isGroupHeader) {
          return <Tag style={{ fontWeight: 600 }}>${record.totalAmountDue.toFixed(2)}</Tag>;
        }
        const account = record as Account;
        const isZeroStandard = account.accountFlag === 'Standard' && account.amountDue === 0;
        return (
          <Tag color={isZeroStandard ? 'error' : 'default'}>
            ${account.amountDue.toFixed(2)}
          </Tag>
        );
      },
      align: 'right',
      width: 100,
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      sorter: false,
      sortOrder: sorterState?.field === 'username' ? sorterState.order : undefined,
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        return (record as Account).username || '-';
      },
      width: 120,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      sorter: false,
      sortOrder: sorterState?.field === 'notes' ? sorterState.order : undefined,
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        return (record as Account).notes || '-';
      },
      width: 150,
      ellipsis: true,
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

    // Filter out On Hold items if toggle is off
    if (!showOnHold) {
      result = result.filter(account => account.accountFlag !== 'OnHold');
    }

    Object.entries(filtersState).forEach(([key, values]) => {
      if (values && values.length > 0) {
        result = result.filter(account => {
          const accountValue = account[key as keyof Account];
          return values.includes(accountValue as string);
        });
      }
    });

    return result;
  }, [sortedAccounts, filtersState, showOnHold]);

  // Group accounts by flag for hierarchical display
  const groupedAccounts = React.useMemo((): AccountGroup[] => {
    const groups: AccountGroup[] = [];

    FLAG_ORDER.forEach(flag => {
      const flagAccounts = filteredAccounts.filter(a => a.accountFlag === flag);
      if (flagAccounts.length > 0) {
        groups.push({
          sysId: `group-${flag}`,
          isGroupHeader: true,
          accountFlag: flag,
          children: flagAccounts,
          accountCount: flagAccounts.length,
          totalAmountDue: flagAccounts.reduce((sum, a) => sum + a.amountDue, 0),
        });
      }
    });

    return groups;
  }, [filteredAccounts]);

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 112px)', // viewport minus header (64px) and content padding (48px)
      }}
    >
      <PageHeader title="Accounts" />

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
        <Tooltip title="Add Account">
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
              const account = accounts.find(a => a.sysId === selectedRowKeys[0]);
              if (account) handleEdit(account);
            }}
          />
        </Tooltip>
        <Tooltip title="Discontinue">
          <Popconfirm
            title={`Discontinue ${selectedRowKeys.length} account${selectedRowKeys.length > 1 ? 's' : ''}?`}
            description="Discontinued accounts can be reactivated later."
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
        <Tooltip title="Total Amount Due">
          <Button
            type="text"
            size="small"
            icon={<DollarOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={handleTotalSelected}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Space size="small">
          <Switch
            size="small"
            checked={showOnHold}
            onChange={setShowOnHold}
          />
          <span style={{ fontSize: 12, color: '#595959' }}>On Hold</span>
        </Space>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c' }}>
          {selectedRowKeys.length > 0
            ? `${selectedRowKeys.length} selected`
            : 'Select rows to perform actions'}
        </div>
      </div>

      {/* Table Container - fills remaining space and scrolls */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <ProTable<TableRecord>
          actionRef={actionRef}
          rowKey={(record) => record.sysId.toString()}
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
            onExpandedRowsChange: (keys) => setExpandedGroups(keys as React.Key[]),
            childrenColumnName: 'children',
            defaultExpandAllRows: true,
          }}
          onRow={(record) => ({
            onDoubleClick: () => {
              if (!('isGroupHeader' in record)) handleEdit(record as Account);
            },
            style: {
              cursor: 'isGroupHeader' in record ? 'default' : 'pointer',
              background: 'isGroupHeader' in record ? '#f5f5f5' : undefined,
              fontWeight: 'isGroupHeader' in record ? 600 : undefined,
              color: 'isGroupHeader' in record ? undefined : accountFlagTextColors[record.accountFlag],
            },
          })}
          columns={columns}
          dataSource={groupedAccounts}
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
          ]}
          pagination={false}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0' }}>
                <p>No accounts found</p>
                <Button type="primary" onClick={handleCreate}>Add Your First Account</Button>
              </div>
            ),
          }}
        />
      </div>

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

          <Form.Item name="notes" label="Notes">
            <Input placeholder="Short note about this account" maxLength={200} />
          </Form.Item>

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

      {/* Total Amount Due Modal */}
      <Modal
        title="Total Amount Due"
        open={totalModalVisible}
        onCancel={() => setTotalModalVisible(false)}
        footer={
          <Button type="primary" onClick={() => setTotalModalVisible(false)}>
            OK
          </Button>
        }
        width={300}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
            {selectedRowKeys.length} account{selectedRowKeys.length !== 1 ? 's' : ''} selected
          </div>
          <div style={{ fontSize: 32, fontWeight: 600 }}>
            ${selectedTotal.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: '#52c41a', marginTop: 8 }}>
            Copied to clipboard
          </div>
        </div>
      </Modal>

      {/* Discontinued Accounts Modal */}
      <Modal
        title="Discontinued Accounts"
        open={discontinuedModalVisible}
        onCancel={() => setDiscontinuedModalVisible(false)}
        footer={
          <Button onClick={() => setDiscontinuedModalVisible(false)}>
            Close
          </Button>
        }
        width={700}
      >
        {discontinuedLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading...</div>
        ) : discontinuedAccounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            No discontinued accounts
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {discontinuedAccounts.map(account => (
              <div
                key={account.sysId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{account.name}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {account.accountTypeName} • {account.accountOwnerName}
                    {account.discontinuedDate && (
                      <> • Discontinued {dayjs(account.discontinuedDate).format('MM/DD/YYYY')}</>
                    )}
                  </div>
                </div>
                <Tooltip title="Reactivate">
                  <Button
                    type="text"
                    icon={<UndoOutlined />}
                    onClick={() => handleReactivate(account.sysId)}
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

export default Accounts;
