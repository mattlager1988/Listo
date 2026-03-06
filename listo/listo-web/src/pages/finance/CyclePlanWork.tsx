import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
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
  notes: string | null;
}

interface CycleTransaction {
  sysId: number;
  cyclePlanSysId: number;
  amountIn: number;
  amountOut: number;
  description: string | null;
  transactionDate: string;
  createTimestamp: string;
}

const statusColors: Record<string, string> = {
  Pending: 'orange',
  Active: 'success',
  Completed: 'error',
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

  const handleCreate = () => {
    setEditingTransaction(null);
    form.resetFields();
    form.setFieldsValue({
      transactionDate: dayjs(),
      amountIn: 0,
      amountOut: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (transaction: CycleTransaction) => {
    setEditingTransaction(transaction);
    form.setFieldsValue({
      ...transaction,
      transactionDate: transaction.transactionDate ? dayjs(transaction.transactionDate) : null,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        ...values,
        cyclePlanSysId: Number(id),
        transactionDate: values.transactionDate ? (values.transactionDate as dayjs.Dayjs).format('YYYY-MM-DD') : null,
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(sysId => api.delete(`/finance/cycletransactions/${sysId}`)));
      message.success(`${selectedRowKeys.length} transaction${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
      fetchTransactions();
    } catch {
      message.error('Failed to delete transactions');
    }
  };

  const totalIn = transactions.reduce((sum, t) => sum + t.amountIn, 0);
  const totalOut = transactions.reduce((sum, t) => sum + t.amountOut, 0);
  const balance = totalIn - totalOut;

  const columns = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-',
      sorter: (a: CycleTransaction, b: CycleTransaction) =>
        dayjs(a.transactionDate).unix() - dayjs(b.transactionDate).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Amount In',
      dataIndex: 'amountIn',
      key: 'amountIn',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => amount > 0 ? (
        <span style={{ color: '#52c41a' }}>${amount.toFixed(2)}</span>
      ) : '-',
    },
    {
      title: 'Amount Out',
      dataIndex: 'amountOut',
      key: 'amountOut',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => amount > 0 ? (
        <span style={{ color: '#ff4d4f' }}>${amount.toFixed(2)}</span>
      ) : '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
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
              <div>{dayjs(cyclePlan.startDate).format('MMM D, YYYY')} - {dayjs(cyclePlan.endDate).format('MMM D, YYYY')}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Status</div>
              <Tag color={statusColors[cyclePlan.status]}>{cyclePlan.status}</Tag>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>Total In</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>${totalIn.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>Total Out</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#ff4d4f' }}>${totalOut.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>Balance</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: balance >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    ${balance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
        <Tooltip title="Add Transaction">
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
            title={`Delete ${selectedRowKeys.length} transaction${selectedRowKeys.length > 1 ? 's' : ''}?`}
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
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={450}
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
              name="transactionDate"
              label="Date"
              rules={[{ required: true, message: 'Date is required' }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Space style={{ width: '100%' }} size="middle">
              <Form.Item
                name="amountIn"
                label="Amount In"
                rules={[{ required: true, message: 'Amount In is required' }]}
                style={{ width: 180, marginBottom: 0 }}
              >
                <InputNumber
                  prefix="$"
                  precision={2}
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="amountOut"
                label="Amount Out"
                rules={[{ required: true, message: 'Amount Out is required' }]}
                style={{ width: 180, marginBottom: 0 }}
              >
                <InputNumber
                  prefix="$"
                  precision={2}
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Space>

            <Form.Item name="description" label="Description" style={{ marginBottom: 0 }}>
              <Input />
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
