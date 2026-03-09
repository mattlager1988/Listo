import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  message,
  Popconfirm,
  Table,
  Tooltip,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  ReloadOutlined,
  InboxOutlined,
  UndoOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

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
  isDiscontinued: boolean;
  discontinuedDate: string | null;
}

interface CycleGoal {
  sysId: number;
  name: string;
  isDeleted: boolean;
}

const statusColors: Record<string, string> = {
  Pending: 'orange',
  Active: 'success',
  Completed: 'error',
};

const CyclePlans: React.FC = () => {
  const navigate = useNavigate();
  const [cyclePlans, setCyclePlans] = useState<CyclePlan[]>([]);
  const [cycleGoals, setCycleGoals] = useState<CycleGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CyclePlan | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [discontinuedModalVisible, setDiscontinuedModalVisible] = useState(false);
  const [discontinuedPlans, setDiscontinuedPlans] = useState<CyclePlan[]>([]);
  const [discontinuedLoading, setDiscontinuedLoading] = useState(false);
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType>(null);

  const fetchCyclePlans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/cycleplans');
      setCyclePlans(response.data);
    } catch {
      message.error('Failed to fetch cycle plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCycleGoals = useCallback(async () => {
    try {
      const response = await api.get('/finance/cyclegoals');
      setCycleGoals(response.data);
    } catch {
      message.error('Failed to fetch cycle goals');
    }
  }, []);

  useEffect(() => {
    fetchCyclePlans();
    fetchCycleGoals();
  }, [fetchCyclePlans, fetchCycleGoals]);

  const handleCreate = () => {
    setEditingPlan(null);
    form.resetFields();
    form.setFieldsValue({ status: 'Pending', amountIn: 0, amountOut: 0 });
    setModalVisible(true);
  };

  const handleEdit = (plan: CyclePlan) => {
    setEditingPlan(plan);
    form.setFieldsValue({
      ...plan,
      startDate: plan.startDate ? dayjs(plan.startDate) : null,
      endDate: plan.endDate ? dayjs(plan.endDate) : null,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        ...values,
        startDate: values.startDate ? (values.startDate as dayjs.Dayjs).format('YYYY-MM-DD') : null,
        endDate: values.endDate ? (values.endDate as dayjs.Dayjs).format('YYYY-MM-DD') : null,
      };

      if (editingPlan) {
        await api.put(`/finance/cycleplans/${editingPlan.sysId}`, payload);
        message.success('Cycle plan updated successfully');
      } else {
        await api.post('/finance/cycleplans', payload);
        message.success('Cycle plan created successfully');
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      fetchCyclePlans();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDiscontinue = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.post(`/finance/cycleplans/${id}/discontinue`)));
      message.success(`${selectedRowKeys.length} cycle plan${selectedRowKeys.length > 1 ? 's' : ''} discontinued`);
      setSelectedRowKeys([]);
      fetchCyclePlans();
    } catch {
      message.error('Failed to discontinue cycle plans');
    }
  };

  const fetchDiscontinuedPlans = async () => {
    setDiscontinuedLoading(true);
    try {
      const response = await api.get('/finance/cycleplans/discontinued');
      setDiscontinuedPlans(response.data);
    } catch {
      message.error('Failed to fetch discontinued cycle plans');
    } finally {
      setDiscontinuedLoading(false);
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await api.post(`/finance/cycleplans/${id}/reactivate`);
      message.success('Cycle plan reactivated');
      fetchDiscontinuedPlans();
      fetchCyclePlans();
    } catch {
      message.error('Failed to reactivate cycle plan');
    }
  };

  const handleOpenDiscontinuedModal = () => {
    setDiscontinuedModalVisible(true);
    fetchDiscontinuedPlans();
  };

  const columns: ProColumns<CyclePlan>[] = [
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      render: (_, record) => record.startDate ? dayjs(record.startDate).format('MM/DD/YYYY') : '-',
      sorter: (a, b) => dayjs(a.startDate).unix() - dayjs(b.startDate).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      render: (_, record) => record.endDate ? dayjs(record.endDate).format('MM/DD/YYYY') : '-',
      sorter: (a, b) => dayjs(a.endDate).unix() - dayjs(b.endDate).unix(),
    },
    {
      title: 'Cycle Goal',
      dataIndex: 'cycleGoalName',
      sorter: (a, b) => a.cycleGoalName.localeCompare(b.cycleGoalName),
      filters: cycleGoals.map(g => ({ text: g.name, value: g.name })),
      onFilter: (value, record) => record.cycleGoalName === value,
    },
    {
      title: 'Amount In',
      dataIndex: 'amountIn',
      width: 100,
      align: 'right',
      render: (_, record) => <Tag>${(record.amountIn ?? 0).toFixed(2)}</Tag>,
      sorter: (a, b) => (a.amountIn ?? 0) - (b.amountIn ?? 0),
    },
    {
      title: 'Amount Out',
      dataIndex: 'amountOut',
      width: 100,
      align: 'right',
      render: (_, record) => <Tag>${(record.amountOut ?? 0).toFixed(2)}</Tag>,
      sorter: (a, b) => (a.amountOut ?? 0) - (b.amountOut ?? 0),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Tag color={(record.balance ?? 0) >= 0 ? 'green' : 'red'}>
          ${(record.balance ?? 0).toFixed(2)}
        </Tag>
      ),
      sorter: (a, b) => (a.balance ?? 0) - (b.balance ?? 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => <Tag color={statusColors[record.status]}>{record.status}</Tag>,
      filters: [
        { text: 'Pending', value: 'Pending' },
        { text: 'Active', value: 'Active' },
        { text: 'Completed', value: 'Completed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      ellipsis: true,
      render: (_, record) => record.notes || '-',
    },
  ];

  const discontinuedColumns = [
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date: string) => date ? dayjs(date).format('MM/DD/YYYY') : '-',
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date: string) => date ? dayjs(date).format('MM/DD/YYYY') : '-',
    },
    { title: 'Cycle Goal', dataIndex: 'cycleGoalName', key: 'cycleGoalName' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Discontinued',
      dataIndex: 'discontinuedDate',
      key: 'discontinuedDate',
      render: (date: string) => date ? dayjs(date).format('MM/DD/YYYY') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: CyclePlan) => (
        <Button
          type="link"
          size="small"
          icon={<UndoOutlined />}
          onClick={() => handleReactivate(record.sysId)}
        >
          Reactivate
        </Button>
      ),
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 112px)',
      }}
    >
      <PageHeader title="Cycle Plans" />

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
        <Tooltip title="Add Cycle Plan">
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
              const plan = cyclePlans.find(p => p.sysId === selectedRowKeys[0]);
              if (plan) handleEdit(plan);
            }}
          />
        </Tooltip>
        <Tooltip title="Work On">
          <Button
            type="text"
            size="small"
            icon={<PlayCircleOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => {
              navigate(`/finance/cycleplans/${selectedRowKeys[0]}`);
            }}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Discontinue">
          <Popconfirm
            title={`Discontinue ${selectedRowKeys.length} cycle plan${selectedRowKeys.length > 1 ? 's' : ''}?`}
            description="Discontinued cycle plans can be reactivated later."
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
        <Tooltip title="Refresh">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={fetchCyclePlans}
          />
        </Tooltip>
        <div style={{ flex: 1 }} />
        {selectedRowKeys.length > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            {selectedRowKeys.length} selected
          </span>
        )}
      </div>

      <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      <ProTable<CyclePlan>
        actionRef={actionRef}
        columns={columns}
        dataSource={cyclePlans}
        rowKey="sysId"
        loading={loading}
        search={false}
        options={false}
        tableAlertRender={false}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
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
              navigate(`/finance/cycleplans/${record.sysId}`);
            },
            style: { cursor: 'pointer' },
          };
        }}
        toolBarRender={false}
      />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingPlan ? 'Edit Cycle Plan' : 'Add Cycle Plan'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
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
            <Space style={{ width: '100%' }} size="middle">
              <Form.Item
                name="cycleGoalSysId"
                label="Cycle Goal"
                rules={[{ required: true, message: 'Cycle goal is required' }]}
                style={{ width: 280, marginBottom: 0 }}
              >
                <Select
                  placeholder="Select a cycle goal"
                  options={cycleGoals.filter(g => !g.isDeleted).map(g => ({
                    label: g.name,
                    value: g.sysId,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Status is required' }]}
                style={{ width: 150, marginBottom: 0 }}
              >
                <Select>
                  <Select.Option value="Pending">Pending</Select.Option>
                  <Select.Option value="Active">Active</Select.Option>
                  <Select.Option value="Completed">Completed</Select.Option>
                </Select>
              </Form.Item>
            </Space>

            <Space style={{ width: '100%' }} size="middle">
              <Form.Item
                name="startDate"
                label="Start Date"
                rules={[{ required: true, message: 'Start date is required' }]}
                style={{ width: 200, marginBottom: 0 }}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="endDate"
                label="End Date"
                rules={[{ required: true, message: 'End date is required' }]}
                style={{ width: 200, marginBottom: 0 }}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Space>

            <Space style={{ width: '100%' }} size="middle">
              <Form.Item
                name="amountIn"
                label="Amount In"
                rules={[{ required: true, message: 'Amount In is required' }]}
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
                name="amountOut"
                label="Amount Out"
                rules={[{ required: true, message: 'Amount Out is required' }]}
                style={{ width: 200, marginBottom: 0 }}
              >
                <InputNumber
                  prefix="$"
                  precision={2}
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Space>

            <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={3} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingPlan ? 'Update' : 'Create'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Discontinued Modal */}
      <Modal
        title="Discontinued Cycle Plans"
        open={discontinuedModalVisible}
        onCancel={() => setDiscontinuedModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          columns={discontinuedColumns}
          dataSource={discontinuedPlans}
          rowKey="sysId"
          loading={discontinuedLoading}
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
};

export default CyclePlans;
