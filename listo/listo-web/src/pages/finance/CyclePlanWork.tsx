import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Popover,
  Table,
  Tooltip,
  Tag,
  Card,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
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
}

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

const CyclePlanWork: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cyclePlan, setCyclePlan] = useState<CyclePlan | null>(null);
  const [transactions, setTransactions] = useState<CycleTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CycleTransaction | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editingAmountField, setEditingAmountField] = useState<'amountIn' | 'amountOut' | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<number>(0);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
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

  const handleStatusChange = async (transactionId: number, newStatus: string) => {
    try {
      await api.put(`/finance/cycletransactions/${transactionId}`, { status: newStatus });
      setEditingStatusId(null);
      fetchTransactions();
      fetchCyclePlan();
    } catch {
      message.error('Failed to update status');
    }
  };

  const handleCreate = () => {
    setEditingTransaction(null);
    form.resetFields();
    form.setFieldsValue({
      amount: 0,
      transactionType: 'Credit',
      status: 'Estimated',
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
      width: 180,
      sorter: (a: CycleTransaction, b: CycleTransaction) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string, record: CycleTransaction) => (
        <Popover
          trigger="click"
          open={editingStatusId === record.sysId}
          onOpenChange={(open) => setEditingStatusId(open ? record.sysId : null)}
          content={
            <Select
              size="small"
              value={status}
              style={{ width: 110 }}
              onChange={(value) => handleStatusChange(record.sysId, value)}
              autoFocus
            >
              <Select.Option value="Confirmed">Confirmed</Select.Option>
              <Select.Option value="Planned">Planned</Select.Option>
              <Select.Option value="Estimated">Estimated</Select.Option>
            </Select>
          }
        >
          <Tag color={transactionStatusColors[status]} style={{ cursor: 'pointer' }}>{status}</Tag>
        </Popover>
      ),
      filters: [
        { text: 'Confirmed', value: 'Confirmed' },
        { text: 'Planned', value: 'Planned' },
        { text: 'Estimated', value: 'Estimated' },
      ],
      onFilter: (value: React.Key | boolean, record: CycleTransaction) => record.status === value,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (_: number, record: CycleTransaction) => (
        <Tag color={record.transactionType === 'Credit' ? 'green' : 'red'}>
          {record.transactionType === 'Debit' ? '-' : ''}${record.amount.toFixed(2)}
        </Tag>
      ),
      sorter: (a: CycleTransaction, b: CycleTransaction) => a.amount - b.amount,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
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
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/finance/cycleplans')}
          style={{ marginBottom: 8 }}
        >
          Back to Cycle Plans
        </Button>
        <Card size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Cycle Goal</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{cyclePlan.cycleGoalName}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Period</div>
              <div>{dayjs(cyclePlan.startDate).format('M/D/YYYY')} - {dayjs(cyclePlan.endDate).format('M/D/YYYY')}</div>
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
              <div style={{ color: '#595959' }}>{cyclePlan.notes}</div>
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
        <div style={{ flex: 1 }} />
        {selectedRowKeys.length > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            {selectedRowKeys.length} selected
          </span>
        )}
      </div>

      {/* Table Container */}
      <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="sysId"
          loading={loading}
          size="small"
          pagination={{ pageSize: 25, size: 'small' }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          onRow={(record) => {
            let clickTimer: ReturnType<typeof setTimeout> | null = null;
            return {
              onClick: () => {
                clickTimer = setTimeout(() => {
                  setSelectedRowKeys([record.sysId]);
                }, 200);
              },
              onDoubleClick: () => {
                if (clickTimer) clearTimeout(clickTimer);
                handleEdit(record);
              },
              style: { cursor: 'pointer' },
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
