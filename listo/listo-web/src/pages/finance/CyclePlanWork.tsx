import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Table,
  Tooltip,
  Tag,
  Card,
  Popover,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const parseDate = (date: string) => dayjs(date.substring(0, 10));

import api from '../../services/api';

interface CyclePlan {
  sysId: number;
  startDate: string;
  endDate: string;
  cycleGoalSysId: number;
  cycleGoalName: string;
  status: string;
  amountIn: number;
  amountOut: number;
  balance: number;
  notes: string | null;
}

interface CycleTransaction {
  sysId: number;
  cyclePlanSysId: number;
  name: string;
  amount: number;
  transactionType: string;
  status: string;
  notes: string | null;
  createTimestamp: string;
  modifyTimestamp: string;
}

interface TransactionGroup {
  sysId: string;
  isGroupHeader: true;
  transactionType: string;
  children: CycleTransaction[];
  transactionCount: number;
  totalAmount: number;
}

type TableRecord = CycleTransaction | TransactionGroup;

const TYPE_ORDER = ['Credit', 'Debit'];
const TYPE_DISPLAY_NAMES: Record<string, string> = {
  Credit: 'Credits',
  Debit: 'Debits',
};

const cyclePlanStatusColors: Record<string, string> = {
  Pending: 'orange',
  Active: 'success',
  Completed: 'error',
};

const transactionStatusColors: Record<string, string> = {
  Confirmed: 'green',
  Planned: 'red',
  Estimated: 'orange',
};

interface EditingCell {
  sysId: number;
  field: 'name' | 'status' | 'amount' | 'notes';
}

const CyclePlanWork: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPopout = searchParams.get('popout') === 'true';
  const [cyclePlan, setCyclePlan] = useState<CyclePlan | null>(null);
  const [transactions, setTransactions] = useState<CycleTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CycleTransaction | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editingAmountField, setEditingAmountField] = useState<'amountIn' | 'amountOut' | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<number>(0);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<React.Key[]>(['group-Credit', 'group-Debit']);
  const [form] = Form.useForm();

  const fetchCyclePlan = useCallback(async () => {
    if (!id) return;
    setPlanLoading(true);
    try {
      const response = await api.get(`/finance/cycleplans/${id}`);
      setCyclePlan(response.data);
    } catch {
      message.error('Failed to fetch cycle plan');
      navigate('/finance/cycleplans');
    } finally {
      setPlanLoading(false);
    }
  }, [id, navigate]);

  const fetchTransactions = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/finance/cycletransactions/cycleplan/${id}`);
      setTransactions(response.data);
    } catch {
      message.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCyclePlan();
    fetchTransactions();
  }, [fetchCyclePlan, fetchTransactions]);

  const groupedTransactions = useMemo((): TransactionGroup[] => {
    const groups: TransactionGroup[] = [];

    TYPE_ORDER.forEach(type => {
      const typeTransactions = transactions.filter(t => t.transactionType === type);
      if (typeTransactions.length > 0) {
        groups.push({
          sysId: `group-${type}`,
          isGroupHeader: true,
          transactionType: type,
          children: typeTransactions,
          transactionCount: typeTransactions.length,
          totalAmount: typeTransactions.reduce((sum, t) => sum + t.amount, 0),
        });
      }
    });

    return groups;
  }, [transactions]);

  const handleAmountEdit = (field: 'amountIn' | 'amountOut') => {
    if (!cyclePlan) return;
    setEditingAmountField(field);
    setEditingAmountValue(cyclePlan[field]);
  };

  const handleAmountSave = async () => {
    if (!editingAmountField || !cyclePlan) return;
    try {
      await api.put(`/finance/cycleplans/${cyclePlan.sysId}`, {
        [editingAmountField]: editingAmountValue,
      });
      setEditingAmountField(null);
      fetchCyclePlan();
    } catch {
      message.error('Failed to update amount');
    }
  };

  const handleInlineTransactionUpdate = async (
    txn: CycleTransaction,
    field: 'name' | 'status' | 'amount' | 'notes',
    value: string | number | null
  ) => {
    try {
      const payload = {
        cyclePlanSysId: txn.cyclePlanSysId,
        name: field === 'name' ? value : txn.name,
        amount: field === 'amount' ? value : txn.amount,
        transactionType: txn.transactionType,
        status: field === 'status' ? value : txn.status,
        notes: field === 'notes' ? value : txn.notes,
      };
      await api.put(`/finance/cycletransactions/${txn.sysId}`, payload);
      // Update local state
      setTransactions(prev => prev.map(t =>
        t.sysId === txn.sysId ? { ...t, [field]: value } : t
      ));
      fetchCyclePlan(); // Refresh to update totals
    } catch {
      message.error('Failed to update');
      fetchTransactions();
    }
    setEditingCell(null);
  };

  const handleCreate = () => {
    setEditingTransaction(null);
    form.resetFields();
    form.setFieldsValue({
      amount: 0,
      transactionType: 'Debit',
      status: 'Planned',
    });
    setModalVisible(true);
  };

  const handleEdit = (transaction: CycleTransaction) => {
    setEditingTransaction(transaction);
    form.setFieldsValue({
      name: transaction.name,
      amount: transaction.amount,
      transactionType: transaction.transactionType,
      status: transaction.status,
      notes: transaction.notes,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        ...values,
        cyclePlanSysId: Number(id),
      };

      if (editingTransaction) {
        await api.put(`/finance/cycletransactions/${editingTransaction.sysId}`, payload);
        message.success('Transaction updated successfully');
      } else {
        await api.post('/finance/cycletransactions', payload);
        message.success('Transaction created successfully');
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      fetchTransactions();
      fetchCyclePlan();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(sysId => api.delete(`/finance/cycletransactions/${sysId}`)));
      message.success(`${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
      fetchTransactions();
      fetchCyclePlan();
    } catch {
      message.error('Failed to delete items');
    }
  };

  const amountIn = cyclePlan?.amountIn ?? 0;
  const amountOut = cyclePlan?.amountOut ?? 0;
  const balance = cyclePlan?.balance ?? 0;

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 207,
      render: (_: unknown, record: TableRecord) => {
        if ('isGroupHeader' in record && record.isGroupHeader) {
          return (
            <span>
              {TYPE_DISPLAY_NAMES[record.transactionType]} ({record.transactionCount})
              <span style={{ marginLeft: 12, color: record.transactionType === 'Credit' ? '#52c41a' : '#ff4d4f' }}>
                ${record.totalAmount.toFixed(2)}
              </span>
            </span>
          );
        }
        const txn = record as CycleTransaction;
        const isEditing = editingCell?.sysId === txn.sysId && editingCell?.field === 'name';
        if (isEditing) {
          return (
            <Input
              autoFocus
              size="small"
              defaultValue={txn.name}
              style={{ width: '100%' }}
              onBlur={(e) => handleInlineTransactionUpdate(txn, 'name', e.target.value)}
              onPressEnter={(e) => handleInlineTransactionUpdate(txn, 'name', (e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditingCell(null)}
            />
          );
        }
        return (
          <span
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setEditingCell({ sysId: txn.sysId, field: 'name' });
            }}
          >
            {txn.name}
          </span>
        );
      },
      sorter: (a: TableRecord, b: TableRecord) => {
        if ('isGroupHeader' in a || 'isGroupHeader' in b) return 0;
        return (a as CycleTransaction).name.localeCompare((b as CycleTransaction).name);
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: TableRecord) => {
        if ('isGroupHeader' in record) return null;
        const txn = record as CycleTransaction;
        const isEditing = editingCell?.sysId === txn.sysId && editingCell?.field === 'status';
        if (isEditing) {
          return (
            <Select
              autoFocus
              defaultOpen
              size="small"
              defaultValue={status}
              style={{ width: 100 }}
              options={[
                { label: 'Confirmed', value: 'Confirmed' },
                { label: 'Planned', value: 'Planned' },
                { label: 'Estimated', value: 'Estimated' },
              ]}
              onChange={(val) => handleInlineTransactionUpdate(txn, 'status', val)}
              onBlur={() => setEditingCell(null)}
            />
          );
        }
        return (
          <Tag
            color={transactionStatusColors[status]}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setEditingCell({ sysId: txn.sysId, field: 'status' });
            }}
          >
            {status}
          </Tag>
        );
      },
      filters: [
        { text: 'Confirmed', value: 'Confirmed' },
        { text: 'Planned', value: 'Planned' },
        { text: 'Estimated', value: 'Estimated' },
      ],
      onFilter: (value: React.Key | boolean, record: TableRecord) =>
        'isGroupHeader' in record || (record as CycleTransaction).status === value,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (_: unknown, record: TableRecord) => {
        if ('isGroupHeader' in record) return null;
        const txn = record as CycleTransaction;
        const isEditing = editingCell?.sysId === txn.sysId && editingCell?.field === 'amount';
        if (isEditing) {
          return (
            <InputNumber
              autoFocus
              size="small"
              defaultValue={txn.amount}
              prefix="$"
              precision={2}
              min={0}
              style={{ width: 100 }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value.replace('$', '')) || 0;
                handleInlineTransactionUpdate(txn, 'amount', val);
              }}
              onPressEnter={(e) => {
                const val = parseFloat((e.target as HTMLInputElement).value.replace('$', '')) || 0;
                handleInlineTransactionUpdate(txn, 'amount', val);
              }}
              onKeyDown={(e) => e.key === 'Escape' && setEditingCell(null)}
            />
          );
        }
        return (
          <Tag
            color={txn.transactionType === 'Credit' ? 'green' : 'red'}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setEditingCell({ sysId: txn.sysId, field: 'amount' });
            }}
          >
            {txn.transactionType === 'Debit' ? '-' : ''}${txn.amount.toFixed(2)}
          </Tag>
        );
      },
      sorter: (a: TableRecord, b: TableRecord) => {
        if ('isGroupHeader' in a || 'isGroupHeader' in b) return 0;
        return (a as CycleTransaction).amount - (b as CycleTransaction).amount;
      },
    },
    {
      title: 'Created On',
      dataIndex: 'createTimestamp',
      key: 'createTimestamp',
      width: 120,
      render: (value: string, record: TableRecord) => {
        if ('isGroupHeader' in record) return null;
        return dayjs(value).format('MM/DD/YYYY');
      },
      sorter: (a: TableRecord, b: TableRecord) => {
        if ('isGroupHeader' in a || 'isGroupHeader' in b) return 0;
        return dayjs((a as CycleTransaction).createTimestamp).unix() - dayjs((b as CycleTransaction).createTimestamp).unix();
      },
    },
    {
      title: 'Last Modified',
      dataIndex: 'modifyTimestamp',
      key: 'modifyTimestamp',
      width: 120,
      render: (value: string, record: TableRecord) => {
        if ('isGroupHeader' in record) return null;
        return dayjs(value).format('MM/DD/YYYY');
      },
      sorter: (a: TableRecord, b: TableRecord) => {
        if ('isGroupHeader' in a || 'isGroupHeader' in b) return 0;
        return dayjs((a as CycleTransaction).modifyTimestamp).unix() - dayjs((b as CycleTransaction).modifyTimestamp).unix();
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (value: string, record: TableRecord) => {
        if ('isGroupHeader' in record) return null;
        const txn = record as CycleTransaction;
        const isEditing = editingCell?.sysId === txn.sysId && editingCell?.field === 'notes';
        if (isEditing) {
          return (
            <Input
              autoFocus
              size="small"
              defaultValue={txn.notes || ''}
              style={{ width: '100%' }}
              onBlur={(e) => handleInlineTransactionUpdate(txn, 'notes', e.target.value || null)}
              onPressEnter={(e) => handleInlineTransactionUpdate(txn, 'notes', (e.target as HTMLInputElement).value || null)}
              onKeyDown={(e) => e.key === 'Escape' && setEditingCell(null)}
            />
          );
        }
        return (
          <span
            style={{ cursor: 'pointer', color: value ? undefined : '#bfbfbf' }}
            onClick={(e) => {
              e.stopPropagation();
              setEditingCell({ sysId: txn.sysId, field: 'notes' });
            }}
          >
            {value || '—'}
          </span>
        );
      },
    },
  ];

  if (planLoading) {
    return <div>Loading...</div>;
  }

  if (!cyclePlan) {
    return <div>Cycle plan not found</div>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 112px)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        {!isPopout && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/finance/cycleplans')}
            style={{ marginBottom: 8 }}
          >
            Back to Cycle Plans
          </Button>
        )}
        <Card size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Cycle Goal</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{cyclePlan.cycleGoalName}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Period</div>
              <div>{parseDate(cyclePlan.startDate).format('MM/DD/YYYY')} - {parseDate(cyclePlan.endDate).format('MM/DD/YYYY')}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Status</div>
              <Tag color={cyclePlanStatusColors[cyclePlan.status]}>{cyclePlan.status}</Tag>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <Popover
                  trigger="click"
                  open={editingAmountField === 'amountIn'}
                  onOpenChange={(open) => {
                    if (open) handleAmountEdit('amountIn');
                    else setEditingAmountField(null);
                  }}
                  content={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <InputNumber
                        size="small"
                        prefix="$"
                        precision={2}
                        min={0}
                        value={editingAmountValue}
                        onChange={(v) => setEditingAmountValue(v ?? 0)}
                        style={{ width: 120 }}
                        autoFocus
                        onPressEnter={handleAmountSave}
                      />
                      <Button size="small" type="primary" onClick={handleAmountSave}>Save</Button>
                    </div>
                  }
                >
                  <div style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>Amount In</div>
                    <Tooltip title="Click to edit">
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>${amountIn.toFixed(2)}</div>
                    </Tooltip>
                  </div>
                </Popover>
                <Popover
                  trigger="click"
                  open={editingAmountField === 'amountOut'}
                  onOpenChange={(open) => {
                    if (open) handleAmountEdit('amountOut');
                    else setEditingAmountField(null);
                  }}
                  content={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <InputNumber
                        size="small"
                        prefix="$"
                        precision={2}
                        min={0}
                        value={editingAmountValue}
                        onChange={(v) => setEditingAmountValue(v ?? 0)}
                        style={{ width: 120 }}
                        autoFocus
                        onPressEnter={handleAmountSave}
                      />
                      <Button size="small" type="primary" onClick={handleAmountSave}>Save</Button>
                    </div>
                  }
                >
                  <div style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>Amount Out</div>
                    <Tooltip title="Click to edit">
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#ff4d4f' }}>${amountOut.toFixed(2)}</div>
                    </Tooltip>
                  </div>
                </Popover>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>Balance</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: balance >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    ${balance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {cyclePlan.notes && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Notes</div>
              <div style={{ color: '#ff4d4f', fontWeight: 600 }}>{cyclePlan.notes}</div>
            </div>
          )}
        </Card>
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
        <Tooltip title="Add Item">
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
              const transaction = transactions.find(t => t.sysId === selectedRowKeys[0]);
              if (transaction) handleEdit(transaction);
            }}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Delete">
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? 's' : ''}?`}
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
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Refresh">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={fetchTransactions}
          />
        </Tooltip>
        {!isPopout && (
          <>
            <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
            <Tooltip title="Open in New Window">
              <Button
                type="text"
                size="small"
                icon={<ExportOutlined />}
                onClick={() => window.open(`${window.location.pathname}?popout=true`, '_blank')}
              />
            </Tooltip>
          </>
        )}
        <div style={{ flex: 1 }} />
        {selectedRowKeys.length > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            {selectedRowKeys.length} selected
          </span>
        )}
      </div>

      {/* Table Container */}
      <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table<TableRecord>
          columns={columns}
          dataSource={groupedTransactions}
          rowKey={(record) => record.sysId.toString()}
          loading={loading}
          size="small"
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
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
          onRow={(record) => {
            let clickTimer: ReturnType<typeof setTimeout> | null = null;
            return {
              onClick: () => {
                if ('isGroupHeader' in record) return;
                clickTimer = setTimeout(() => {
                  setSelectedRowKeys([(record as CycleTransaction).sysId]);
                }, 200);
              },
              onDoubleClick: () => {
                if (clickTimer) clearTimeout(clickTimer);
                if (!('isGroupHeader' in record)) handleEdit(record as CycleTransaction);
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
        title={editingTransaction ? 'Edit Item' : 'Add Item'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="small"
          requiredMark={false}
          autoComplete="off"
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
                name="amount"
                label="Amount"
                rules={[{ required: true, message: 'Amount is required' }]}
                style={{ width: 200, marginBottom: 0 }}
              >
                <InputNumber
                  prefix="$"
                  precision={2}
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="transactionType"
                label="Type"
                rules={[{ required: true, message: 'Type is required' }]}
                style={{ width: 100, marginBottom: 0 }}
              >
                <Select>
                  <Select.Option value="Credit">Credit</Select.Option>
                  <Select.Option value="Debit">Debit</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Status is required' }]}
                style={{ width: 110, marginBottom: 0 }}
              >
                <Select>
                  <Select.Option value="Confirmed">Confirmed</Select.Option>
                  <Select.Option value="Planned">Planned</Select.Option>
                  <Select.Option value="Estimated">Estimated</Select.Option>
                </Select>
              </Form.Item>
            </Space>

            <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={2} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingTransaction ? 'Update' : 'Create'}
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

export default CyclePlanWork;
