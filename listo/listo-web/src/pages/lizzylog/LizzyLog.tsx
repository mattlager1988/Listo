import React, { useState, useEffect, useCallback } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
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
  Tag,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

// Parse date-only values without timezone conversion.
const parseDate = (date: string) => dayjs(date.substring(0, 10));

interface PeriodLog {
  sysId: number;
  startDate: string;
  painSeverity: number;
  mood: number;
  notes: string | null;
  createTimestamp: string;
  modifyTimestamp: string;
}

interface PeriodStats {
  lastPeriodDate: string | null;
  nextEstimatedDate: string | null;
  averageCycleDays: number | null;
  cycleCount: number;
}

// Pain: 1 (mild) → 5 (severe). Higher is worse.
const painColors: Record<number, string> = {
  1: 'green',
  2: 'lime',
  3: 'gold',
  4: 'orange',
  5: 'red',
};

// Mood: 1 (low) → 5 (great). Higher is better.
const moodColors: Record<number, string> = {
  1: 'red',
  2: 'orange',
  3: 'gold',
  4: 'lime',
  5: 'green',
};

const LizzyLog: React.FC = () => {
  const [periods, setPeriods] = useState<PeriodLog[]>([]);
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PeriodLog | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/lizzylog/periods');
      setPeriods(response.data);
    } catch {
      message.error('Failed to fetch periods');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/lizzylog/periods/stats');
      setStats(response.data);
    } catch {
      // Stats are supplemental; don't surface an error
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
    fetchStats();
  }, [fetchPeriods, fetchStats]);

  const refresh = useCallback(() => {
    fetchPeriods();
    fetchStats();
  }, [fetchPeriods, fetchStats]);

  const handleCreate = () => {
    setEditingPeriod(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (period: PeriodLog) => {
    setEditingPeriod(period);
    form.setFieldsValue({
      startDate: parseDate(period.startDate),
      painSeverity: period.painSeverity,
      mood: period.mood,
      notes: period.notes,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        startDate: (values.startDate as dayjs.Dayjs).format('YYYY-MM-DD'),
        painSeverity: values.painSeverity,
        mood: values.mood,
        notes: values.notes ?? null,
      };

      if (editingPeriod) {
        await api.put(`/lizzylog/periods/${editingPeriod.sysId}`, payload);
        message.success('Period updated successfully');
      } else {
        await api.post('/lizzylog/periods', payload);
        message.success('Period created successfully');
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      refresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`/lizzylog/periods/${id}`)));
      message.success(`${selectedRowKeys.length} period${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
      refresh();
    } catch {
      message.error('Failed to delete periods');
    }
  };

  // Cycle length = days since the previous (chronologically earlier) entry.
  // Computed from the full list ordered ascending by start date.
  const cycleLengths = React.useMemo(() => {
    const map = new Map<number, number>();
    const ordered = [...periods].sort(
      (a, b) => parseDate(a.startDate).valueOf() - parseDate(b.startDate).valueOf()
    );
    for (let i = 1; i < ordered.length; i++) {
      const days = parseDate(ordered[i].startDate).diff(parseDate(ordered[i - 1].startDate), 'day');
      map.set(ordered[i].sysId, days);
    }
    return map;
  }, [periods]);

  const columns: ProColumns<PeriodLog>[] = [
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 150,
      render: (_, record) => parseDate(record.startDate).format('MMM D, YYYY'),
      sorter: (a, b) => parseDate(a.startDate).valueOf() - parseDate(b.startDate).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Pain',
      dataIndex: 'painSeverity',
      key: 'painSeverity',
      width: 80,
      render: (_, record) => (
        <Tag color={painColors[record.painSeverity]}>{record.painSeverity}</Tag>
      ),
    },
    {
      title: 'Mood',
      dataIndex: 'mood',
      key: 'mood',
      width: 80,
      render: (_, record) => <Tag color={moodColors[record.mood]}>{record.mood}</Tag>,
    },
    {
      title: 'Cycle Length',
      key: 'cycleLength',
      width: 110,
      render: (_, record) => {
        const days = cycleLengths.get(record.sysId);
        return days != null ? `${days} days` : '-';
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (_, record) => record.notes || '-',
    },
  ];

  const hasPrediction = stats != null && stats.cycleCount >= 2;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 112px)',
      }}
    >
      <PageHeader title="Lizzy Log" />

      {/* Prediction Summary Strip */}
      <div
        style={{
          background: '#fff0f6',
          border: '1px solid #ffadd2',
          borderRadius: 6,
          padding: '10px 16px',
          marginBottom: 16,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        {stats && stats.lastPeriodDate ? (
          <span>
            <span style={{ color: '#8c8c8c', marginRight: 6 }}>Last period:</span>
            <strong>{parseDate(stats.lastPeriodDate).format('MMM D, YYYY')}</strong>
          </span>
        ) : (
          <span style={{ color: '#8c8c8c' }}>No periods logged yet</span>
        )}
        {hasPrediction && stats?.nextEstimatedDate ? (
          <span>
            <span style={{ color: '#8c8c8c', marginRight: 6 }}>Next estimated:</span>
            <strong style={{ color: '#eb2f96' }}>
              {parseDate(stats.nextEstimatedDate).format('MMM D, YYYY')}
            </strong>
            {stats.averageCycleDays != null && (
              <span style={{ color: '#8c8c8c', marginLeft: 8 }}>
                (avg {Math.round(stats.averageCycleDays)} day cycle)
              </span>
            )}
          </span>
        ) : (
          <span style={{ color: '#8c8c8c' }}>
            Not enough data yet — log 2+ periods for a prediction
          </span>
        )}
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
        <Tooltip title="Add Period">
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
              const period = periods.find(p => p.sysId.toString() === selectedRowKeys[0]?.toString());
              if (period) handleEdit(period);
            }}
          />
        </Tooltip>
        <Tooltip title="Delete">
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} period${selectedRowKeys.length > 1 ? 's' : ''}?`}
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
            onClick={refresh}
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
        <ProTable<PeriodLog>
          rowKey={(record) => record.sysId.toString()}
          columns={columns}
          dataSource={periods}
          loading={loading}
          search={false}
          options={false}
          tableAlertRender={false}
          pagination={false}
          toolBarRender={false}
          defaultSize="small"
          scroll={{ x: 'max-content' }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          onRow={(record) => {
            let clickTimer: ReturnType<typeof setTimeout> | null = null;
            return {
              onClick: () => {
                clickTimer = setTimeout(() => {
                  const key = record.sysId.toString();
                  setSelectedRowKeys(prev =>
                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                  );
                }, 200);
              },
              onDoubleClick: () => {
                if (clickTimer) clearTimeout(clickTimer);
                handleEdit(record);
              },
              style: { cursor: 'pointer' },
            };
          }}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0' }}>
                <p>No periods logged yet</p>
                <Button type="primary" onClick={handleCreate}>Log Your First Period</Button>
              </div>
            ),
          }}
        />
      </div>

      {/* Period Modal */}
      <Modal
        title={editingPeriod ? 'Edit Period' : 'Log Period'}
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
            <Form.Item
              name="startDate"
              label="Start Date"
              rules={[{ required: true, message: 'Start date is required' }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker style={{ width: '100%' }} format="MMM D, YYYY" />
            </Form.Item>

            <Space style={{ width: '100%' }} size="middle">
              <Form.Item
                name="painSeverity"
                label="Pain (1-5)"
                rules={[{ required: true, message: 'Pain is required' }]}
                style={{ width: 200, marginBottom: 0 }}
              >
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="mood"
                label="Mood (1-5)"
                rules={[{ required: true, message: 'Mood is required' }]}
                style={{ width: 200, marginBottom: 0 }}
              >
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Space>

            <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={4} placeholder="Optional notes" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingPeriod ? 'Update' : 'Create'}
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

export default LizzyLog;
