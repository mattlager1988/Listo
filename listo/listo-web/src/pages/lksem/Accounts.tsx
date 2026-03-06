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
  LoginOutlined,
  MinusSquareOutlined,
  PlusSquareOutlined,
  CheckOutlined,
  HistoryOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  UserOutlined,
  KeyOutlined,
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
  lastPaymentDate: string | null;
}

interface ListItem {
  sysId: number;
  name: string;
  isDeleted: boolean;
}

interface Payment {
  sysId: number;
  accountSysId: number;
  accountName: string;
  paymentMethodSysId: number;
  paymentMethodName: string;
  amount: number;
  description: string | null;
  confirmationNumber: string | null;
  status: string;
  completedDate: string | null;
  createTimestamp: string;
}

interface PaymentMethod {
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

const PaymentChart: React.FC<{ data: { year: number; month: number; totalAmount: number }[] }> = ({ data }) => {
  // Generate last 12 months for x-axis
  const months: { year: number; month: number; label: string }[] = [];
  const now = dayjs();
  for (let i = 11; i >= 0; i--) {
    const d = now.subtract(i, 'month');
    months.push({
      year: d.year(),
      month: d.month() + 1,
      label: d.format('MMM'),
    });
  }

  // Map data to months
  const chartData = months.map(m => {
    const found = data.find(d => d.year === m.year && d.month === m.month);
    return {
      label: m.label,
      amount: found?.totalAmount ?? 0,
    };
  });

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);
  const chartHeight = 120;
  const barAreaHeight = 80;

  // Generate Y-axis tick values
  const yTicks = [0, Math.round(maxAmount / 2), Math.round(maxAmount)];

  return (
    <div style={{ display: 'flex', height: chartHeight }}>
      {/* Y-axis */}
      <div
        style={{
          width: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingRight: 8,
          paddingBottom: 20,
          fontSize: 10,
          color: '#8c8c8c',
        }}
      >
        <span>${yTicks[2]}</span>
        <span>${yTicks[1]}</span>
        <span>${yTicks[0]}</span>
      </div>

      {/* Bars */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        {chartData.map((d, i) => (
          <Tooltip key={i} title={`${d.label}: $${d.amount.toFixed(2)}`}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: chartHeight,
                justifyContent: 'flex-end',
              }}
            >
              {/* Amount label above bar */}
              {d.amount > 0 && (
                <div style={{ fontSize: 9, color: '#1677ff', fontWeight: 500, marginBottom: 2 }}>
                  ${d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : d.amount.toFixed(0)}
                </div>
              )}
              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  height: d.amount > 0 ? Math.max((d.amount / maxAmount) * barAreaHeight, 4) : 0,
                  background: '#1677ff',
                  borderRadius: 2,
                }}
              />
              {/* Month label */}
              <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 4 }}>
                {d.label}
              </div>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
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
  const [paymentForm] = Form.useForm();
  const actionRef = useRef<ActionType>(null);

  // Payment-related state
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  // Payment History modal state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<Account | null>(null);
  const [accountPayments, setAccountPayments] = useState<Payment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<{ year: number; month: number; totalAmount: number }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [postPaymentForm] = Form.useForm();

  // Quick Post Payment modal state
  const [quickPaymentModalVisible, setQuickPaymentModalVisible] = useState(false);
  const [quickPaymentForm] = Form.useForm();

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

  const fetchPendingPayments = useCallback(async () => {
    setPendingLoading(true);
    try {
      const response = await api.get('/lksem/payments/pending');
      setPendingPayments(response.data);
    } catch {
      message.error('Failed to fetch pending payments');
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await api.get('/lksem/paymentmethods');
      setPaymentMethods(response.data.filter((pm: PaymentMethod) => !pm.isDeleted));
    } catch {
      // Payment methods are needed for forms
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
    fetchPendingPayments();
    fetchPaymentMethods();
  }, [fetchAccounts, fetchLists, fetchSavedViews, fetchPendingPayments, fetchPaymentMethods]);

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

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    paymentForm.setFieldsValue({
      paymentMethodSysId: payment.paymentMethodSysId,
      amount: payment.amount,
      description: payment.description,
      confirmationNumber: payment.confirmationNumber,
    });
    setPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async (values: Record<string, unknown>) => {
    if (!editingPayment) return;
    try {
      await api.put(`/lksem/payments/${editingPayment.sysId}`, values);
      message.success('Payment updated');
      setPaymentModalVisible(false);
      setEditingPayment(null);
      fetchPendingPayments();
    } catch {
      message.error('Failed to update payment');
    }
  };

  const handleCompletePayment = async (paymentId: number) => {
    try {
      await api.post(`/lksem/payments/${paymentId}/complete`);
      message.success('Payment marked as complete');
      fetchPendingPayments();
      fetchAccounts(); // Refresh to update Last Payment column
    } catch {
      message.error('Failed to complete payment');
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      await api.delete(`/lksem/payments/${paymentId}`);
      message.success('Payment deleted');
      fetchPendingPayments();
      fetchAccounts(); // Refresh to update Last Payment column
    } catch {
      message.error('Failed to delete payment');
    }
  };

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  const fetchAccountPayments = async (accountSysId: number) => {
    setHistoryLoading(true);
    try {
      const [paymentsRes, summaryRes] = await Promise.all([
        api.get(`/lksem/payments/account/${accountSysId}`),
        api.get(`/lksem/payments/account/${accountSysId}/summary?months=12`),
      ]);
      setAccountPayments(paymentsRes.data);
      setPaymentSummary(summaryRes.data);
    } catch {
      message.error('Failed to fetch payment history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = () => {
    const account = accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString());
    if (!account) return;
    setHistoryAccount(account);
    setHistoryModalVisible(true);
    fetchAccountPayments(account.sysId);
    postPaymentForm.resetFields();
  };

  const handlePostPayment = async (values: Record<string, unknown>) => {
    if (!historyAccount) return;
    try {
      await api.post('/lksem/payments', {
        ...values,
        accountSysId: historyAccount.sysId,
      });
      message.success('Payment posted');
      postPaymentForm.resetFields();
      fetchAccountPayments(historyAccount.sysId);
      fetchPendingPayments();
      fetchAccounts(); // Refresh to see updated AmountDue if applicable
    } catch {
      message.error('Failed to post payment');
    }
  };

  const handleOpenQuickPayment = () => {
    const account = accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString());
    if (!account) return;
    quickPaymentForm.resetFields();
    setQuickPaymentModalVisible(true);
  };

  const handleQuickPaymentSubmit = async (values: Record<string, unknown>) => {
    const account = accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString());
    if (!account) return;
    try {
      await api.post('/lksem/payments', {
        ...values,
        accountSysId: account.sysId,
      });
      message.success('Payment posted');
      setQuickPaymentModalVisible(false);
      quickPaymentForm.resetFields();
      fetchPendingPayments();
      fetchAccounts();
    } catch {
      message.error('Failed to post payment');
    }
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

  const handleLaunchAccount = () => {
    const account = accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString());
    if (!account || !account.webAddress) return;

    // Copy password to clipboard first (before opening URL changes focus)
    if (account.password) {
      const textArea = document.createElement('textarea');
      textArea.value = account.password;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    // Open URL in new tab
    window.open(account.webAddress, '_blank', 'noopener,noreferrer');
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
      width: 220,
      ellipsis: false,
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
      title: 'Last Payment',
      dataIndex: 'lastPaymentDate',
      key: 'lastPaymentDate',
      sorter: false,
      sortOrder: sorterState?.field === 'lastPaymentDate' ? sorterState.order : undefined,
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        const account = record as Account;
        return account.lastPaymentDate ? dayjs(account.lastPaymentDate).format('MM/DD/YYYY') : '-';
      },
      width: 110,
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

  const pendingColumns: ProColumns<Payment>[] = [
    {
      title: 'Account',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 150,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethodName',
      key: 'paymentMethodName',
      width: 120,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right',
      render: (_, record) => `$${record.amount.toFixed(2)}`,
    },
    {
      title: 'Confirmation #',
      dataIndex: 'confirmationNumber',
      key: 'confirmationNumber',
      width: 130,
      render: (_, record) => record.confirmationNumber || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true,
      render: (_, record) => record.description || '-',
    },
    {
      title: 'Date Posted',
      dataIndex: 'createTimestamp',
      key: 'createTimestamp',
      width: 100,
      render: (_, record) => dayjs(record.createTimestamp).format('MM/DD/YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditPayment(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Mark as complete?"
            description="This payment has been reconciled with your bank."
            onConfirm={() => handleCompletePayment(record.sysId)}
          >
            <Tooltip title="Complete">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
              />
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="Delete this payment?"
            description="This action cannot be undone."
            onConfirm={() => handleDeletePayment(record.sysId)}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
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

      {/* Pending Payments Section */}
      {pendingPayments.length > 0 && (
        <div
          style={{
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: 6,
            padding: 12,
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontWeight: 600 }}>
              Pending Payments ({pendingPayments.length})
            </span>
            <Tag color="gold" style={{ fontSize: 14 }}>
              Total: ${pendingTotal.toFixed(2)}
            </Tag>
          </div>
          <ProTable<Payment>
            rowKey="sysId"
            columns={pendingColumns}
            dataSource={pendingPayments}
            loading={pendingLoading}
            search={false}
            options={false}
            pagination={false}
            size="small"
          />
        </div>
      )}

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
              const account = accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString());
              if (account) handleEdit(account);
            }}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
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
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Post Payment">
          <Button
            type="text"
            size="small"
            icon={<CreditCardOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={handleOpenQuickPayment}
          />
        </Tooltip>
        <Tooltip title="Payment History">
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={handleOpenHistory}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Total Amount Due">
          <Button
            type="text"
            size="small"
            icon={<DollarOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={handleTotalSelected}
          />
        </Tooltip>
        <Tooltip title="Launch & Copy Password">
          <Button
            type="text"
            size="small"
            icon={<LoginOutlined />}
            disabled={
              selectedRowKeys.length !== 1 ||
              !accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString())?.webAddress
            }
            onClick={handleLaunchAccount}
          />
        </Tooltip>
        <Tooltip title="Copy Username">
          <Button
            type="text"
            size="small"
            icon={<UserOutlined />}
            disabled={
              selectedRowKeys.length !== 1 ||
              !accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString())?.username
            }
            onClick={() => {
              const account = accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString());
              if (account?.username) {
                const textArea = document.createElement('textarea');
                textArea.value = account.username;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                message.success('Username copied to clipboard');
              }
            }}
          />
        </Tooltip>
        <Tooltip title="Copy Password">
          <Button
            type="text"
            size="small"
            icon={<KeyOutlined />}
            disabled={
              selectedRowKeys.length !== 1 ||
              !accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString())?.password
            }
            onClick={() => {
              const account = accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString());
              if (account?.password) {
                const textArea = document.createElement('textarea');
                textArea.value = account.password;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                message.success('Password copied to clipboard');
              }
            }}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title={expandedGroups.length > 0 ? 'Collapse All' : 'Expand All'}>
          <Button
            type="text"
            size="small"
            icon={expandedGroups.length > 0 ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
            onClick={() => {
              if (expandedGroups.length > 0) {
                setExpandedGroups([]);
              } else {
                setExpandedGroups(FLAG_ORDER.map(f => `group-${f}`));
              }
            }}
          />
        </Tooltip>
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
          tableAlertRender={false}
          expandable={{
            expandedRowKeys: expandedGroups,
            onExpandedRowsChange: (keys) => setExpandedGroups(keys as React.Key[]),
            childrenColumnName: 'children',
            defaultExpandAllRows: true,
          }}
          onRow={(record) => ({
            onClick: () => {
              if ('isGroupHeader' in record) return;
              const key = record.sysId.toString();
              setSelectedRowKeys(prev =>
                prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
              );
            },
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
          size="small"
          requiredMark={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Name is required' }]}
              style={{ marginBottom: 0 }}
            >
              <Input />
            </Form.Item>

            <Space style={{ width: '100%' }} size="middle">
              <Form.Item
                name="accountTypeSysId"
                label="Type"
                rules={[{ required: true, message: 'Type is required' }]}
                style={{ width: 250, marginBottom: 0 }}
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
                style={{ width: 250, marginBottom: 0 }}
              >
                <Select
                  options={accountOwners.map(o => ({ label: o.name, value: o.sysId }))}
                  placeholder="Select owner"
                />
              </Form.Item>
            </Space>

            <Space style={{ width: '100%' }} size="middle">
              <Form.Item
                name="amountDue"
                label="Amount Due"
                rules={[{ required: true, message: 'Amount is required' }]}
                style={{ width: 150, marginBottom: 0 }}
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
                style={{ width: 150, marginBottom: 0 }}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="accountFlag"
                label="Flag"
                rules={[{ required: true }]}
                style={{ width: 150, marginBottom: 0 }}
              >
                <Select>
                  <Select.Option value="Standard">Standard</Select.Option>
                  <Select.Option value="Alert">Alert</Select.Option>
                  <Select.Option value="Static">Static</Select.Option>
                  <Select.Option value="OnHold">On Hold</Select.Option>
                </Select>
              </Form.Item>
            </Space>

            <Form.Item name="accountNumber" label="Account Number" style={{ marginBottom: 0 }}>
              <Input />
            </Form.Item>

            <Form.Item name="phoneNumber" label="Phone Number" style={{ marginBottom: 0 }}>
              <PhoneInput />
            </Form.Item>

            <Form.Item
              name="webAddress"
              label="Web Address"
              rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="https://example.com" />
            </Form.Item>

            <Space style={{ width: '100%' }} size="middle">
              <Form.Item name="username" label="Username" style={{ width: 250, marginBottom: 0 }}>
                <Input />
              </Form.Item>

              <Form.Item name="password" label="Password" style={{ width: 250, marginBottom: 0 }}>
                <Input.Password visibilityToggle />
              </Form.Item>
            </Space>

            <Space style={{ width: '100%' }} size="middle">
              <Form.Item name="autoPay" label="Auto Pay" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>

              <Form.Item name="resetAmountDue" label="Reset Amount Due" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
            </Space>

            <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
              <Input placeholder="Short note about this account" maxLength={200} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingAccount ? 'Update' : 'Create'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </div>
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
          size="small"
          requiredMark={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {currentView && (
              <Form.Item
                name="saveMode"
                label="Save Option"
                rules={[{ required: true }]}
                style={{ marginBottom: 0 }}
              >
                <Radio.Group>
                  <Space direction="vertical" size="small">
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
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="My Custom View" />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>

            <Form.Item name="isDefault" label="Set as Default" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  Save
                </Button>
                <Button onClick={() => setSaveViewModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </div>
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

      {/* Edit Payment Modal */}
      <Modal
        title="Edit Payment"
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setEditingPayment(null);
        }}
        footer={null}
        width={450}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handlePaymentSubmit}
          size="small"
          requiredMark={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Form.Item
              name="paymentMethodSysId"
              label="Payment Method"
              rules={[{ required: true, message: 'Payment method is required' }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                options={paymentMethods.map(pm => ({ label: pm.name, value: pm.sysId }))}
                placeholder="Select payment method"
              />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Amount"
              rules={[{ required: true, message: 'Amount is required' }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                prefix="$"
                precision={2}
                min={0}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item name="confirmationNumber" label="Confirmation Number" style={{ marginBottom: 0 }}>
              <Input />
            </Form.Item>

            <Form.Item name="description" label="Description" style={{ marginBottom: 0 }}>
              <Input />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  Update
                </Button>
                <Button onClick={() => {
                  setPaymentModalVisible(false);
                  setEditingPayment(null);
                }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        title={historyAccount ? `Payment History - ${historyAccount.name}` : 'Payment History'}
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setHistoryAccount(null);
          setAccountPayments([]);
          setPaymentSummary([]);
        }}
        footer={
          <Button onClick={() => {
            setHistoryModalVisible(false);
            setHistoryAccount(null);
          }}>
            Close
          </Button>
        }
        width={800}
      >
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading...</div>
        ) : (
          <>
            {/* Post Payment Form */}
            <div
              style={{
                background: '#fafafa',
                padding: 12,
                borderRadius: 6,
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Post Payment</div>
              <Form
                form={postPaymentForm}
                layout="inline"
                onFinish={handlePostPayment}
                size="small"
                style={{ flexWrap: 'wrap', gap: 4 }}
              >
                <Form.Item
                  name="paymentMethodSysId"
                  rules={[{ required: true, message: 'Required' }]}
                  style={{ marginBottom: 4 }}
                >
                  <Select
                    placeholder="Payment Method"
                    style={{ width: 150 }}
                    options={paymentMethods.map(pm => ({ label: pm.name, value: pm.sysId }))}
                  />
                </Form.Item>
                <Form.Item
                  name="amount"
                  rules={[{ required: true, message: 'Required' }]}
                  style={{ marginBottom: 4 }}
                >
                  <InputNumber
                    placeholder="Amount"
                    prefix="$"
                    precision={2}
                    min={0}
                    style={{ width: 120 }}
                  />
                </Form.Item>
                <Form.Item name="confirmationNumber" style={{ marginBottom: 4 }}>
                  <Input placeholder="Confirmation #" style={{ width: 130 }} />
                </Form.Item>
                <Form.Item name="description" style={{ marginBottom: 4 }}>
                  <Input placeholder="Description" style={{ width: 150 }} />
                </Form.Item>
                <Form.Item style={{ marginBottom: 4 }}>
                  <Button type="primary" htmlType="submit">
                    Post
                  </Button>
                </Form.Item>
              </Form>
            </div>

            {/* Bar Chart - Last 12 Months */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Last 12 Months</div>
              <PaymentChart data={paymentSummary} />
            </div>

            {/* Payment History List */}
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              All Payments ({accountPayments.length})
            </div>
            <div style={{ maxHeight: 250, overflow: 'auto' }}>
              {accountPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
                  No payments recorded
                </div>
              ) : (
                accountPayments.map(payment => (
                  <div
                    key={payment.sysId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: '1px solid #f0f0f0',
                      background: payment.status === 'Pending' ? '#fffbe6' : undefined,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        ${payment.amount.toFixed(2)} - {payment.paymentMethodName}
                        {payment.status === 'Pending' && (
                          <Tag color="warning" style={{ marginLeft: 8 }}>Pending</Tag>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        {dayjs(payment.createTimestamp).format('MM/DD/YYYY')}
                        {payment.confirmationNumber && ` • ${payment.confirmationNumber}`}
                        {payment.description && ` • ${payment.description}`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Quick Post Payment Modal */}
      <Modal
        title={`Post Payment - ${accounts.find(a => a.sysId.toString() === selectedRowKeys[0]?.toString())?.name || ''}`}
        open={quickPaymentModalVisible}
        onCancel={() => {
          setQuickPaymentModalVisible(false);
          quickPaymentForm.resetFields();
        }}
        footer={null}
        width={450}
      >
        <Form
          form={quickPaymentForm}
          layout="vertical"
          onFinish={handleQuickPaymentSubmit}
          size="small"
          requiredMark={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Form.Item
              name="paymentMethodSysId"
              label="Payment Method"
              rules={[{ required: true, message: 'Payment method is required' }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                options={paymentMethods.map(pm => ({ label: pm.name, value: pm.sysId }))}
                placeholder="Select payment method"
              />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Amount"
              rules={[{ required: true, message: 'Amount is required' }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                prefix="$"
                precision={2}
                min={0}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item name="confirmationNumber" label="Confirmation Number" style={{ marginBottom: 0 }}>
              <Input />
            </Form.Item>

            <Form.Item name="description" label="Description" style={{ marginBottom: 0 }}>
              <Input />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  Post Payment
                </Button>
                <Button onClick={() => {
                  setQuickPaymentModalVisible(false);
                  quickPaymentForm.resetFields();
                }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Accounts;
