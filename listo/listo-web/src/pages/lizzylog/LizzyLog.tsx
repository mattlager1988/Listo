import React, { useState, useEffect, useCallback } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Checkbox,
  Table,
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

interface PeriodLogEntry {
  sysId: number;
  periodLogSysId: number;
  entryTypeSysId: number;
  entryTypeName: string;
  entryDate: string;
  notes: string | null;
  createTimestamp: string;
  modifyTimestamp: string;
}

interface PeriodLogEntryType {
  sysId: number;
  name: string;
  isDeleted: boolean;
  entryCount: number;
}

interface PeriodLog {
  sysId: number;
  startDate: string;
  preWeekStartDate: string | null;
  isStartDateEstimated: boolean;
  notes: string | null;
  entries: PeriodLogEntry[];
  createTimestamp: string;
  modifyTimestamp: string;
}

interface PeriodStats {
  lastPeriodDate: string | null;
  nextEstimatedDate: string | null;
  averageCycleDays: number | null;
  cycleCount: number;
}

const LizzyLog: React.FC = () => {
  const [periods, setPeriods] = useState<PeriodLog[]>([]);
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PeriodLog | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();

  // Log-record ("entry") management within the edit modal
  const [entryTypes, setEntryTypes] = useState<PeriodLogEntryType[]>([]);
  const [entries, setEntries] = useState<PeriodLogEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<PeriodLogEntry | null>(null);
  const [entryForm] = Form.useForm();

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

  const fetchEntryTypes = useCallback(async () => {
    try {
      const response = await api.get('/lizzylog/entrytypes');
      setEntryTypes(response.data);
    } catch {
      // Types are supplemental; don't surface an error
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
    fetchStats();
    fetchEntryTypes();
  }, [fetchPeriods, fetchStats, fetchEntryTypes]);

  const refresh = useCallback(() => {
    fetchPeriods();
    fetchStats();
  }, [fetchPeriods, fetchStats]);

  const handleCreate = () => {
    setEditingPeriod(null);
    setEntries([]);
    setEditingEntry(null);
    entryForm.resetFields();
    form.resetFields();
    form.setFieldsValue({ isStartDateEstimated: true });
    setModalVisible(true);
  };

  const handleEdit = (period: PeriodLog) => {
    setEditingPeriod(period);
    setEntries(period.entries ?? []);
    setEditingEntry(null);
    entryForm.resetFields();
    form.setFieldsValue({
      startDate: parseDate(period.startDate),
      preWeekStartDate: period.preWeekStartDate ? parseDate(period.preWeekStartDate) : null,
      isStartDateEstimated: period.isStartDateEstimated,
      notes: period.notes,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingEntry(null);
    entryForm.resetFields();
    refresh();
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload = {
        startDate: (values.startDate as dayjs.Dayjs).format('YYYY-MM-DD'),
        preWeekStartDate: values.preWeekStartDate
          ? (values.preWeekStartDate as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
        isStartDateEstimated: values.isStartDateEstimated ?? false,
        notes: values.notes ?? null,
      };

      if (editingPeriod) {
        await api.put(`/lizzylog/periods/${editingPeriod.sysId}`, payload);
        message.success('Period updated successfully');
      } else {
        await api.post('/lizzylog/periods', payload);
        message.success('Period created successfully');
      }
      closeModal();
      setSelectedRowKeys([]);
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

  // --- Log record (entry) handlers ---

  const fetchEntries = useCallback(async (periodId: number) => {
    try {
      const response = await api.get(`/lizzylog/entries?periodId=${periodId}`);
      setEntries(response.data);
    } catch {
      message.error('Failed to fetch log records');
    }
  }, []);

  const handleSaveEntry = async () => {
    if (!editingPeriod) return;
    try {
      const values = await entryForm.validateFields();
      const payload = {
        entryTypeSysId: values.entryTypeSysId,
        entryDate: (values.entryDate as dayjs.Dayjs).format('YYYY-MM-DD'),
        notes: values.entryNotes ?? null,
      };

      if (editingEntry) {
        await api.put(`/lizzylog/entries/${editingEntry.sysId}`, payload);
        message.success('Log record updated');
      } else {
        await api.post('/lizzylog/entries', { periodLogSysId: editingPeriod.sysId, ...payload });
        message.success('Log record added');
      }
      setEditingEntry(null);
      entryForm.resetFields();
      await fetchEntries(editingPeriod.sysId);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // form validation
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to save log record');
    }
  };

  const handleEditEntry = (entry: PeriodLogEntry) => {
    setEditingEntry(entry);
    entryForm.setFieldsValue({
      entryTypeSysId: entry.entryTypeSysId,
      entryDate: parseDate(entry.entryDate),
      entryNotes: entry.notes,
    });
  };

  const handleCancelEntryEdit = () => {
    setEditingEntry(null);
    entryForm.resetFields();
  };

  const handleDeleteEntry = async (id: number) => {
    if (!editingPeriod) return;
    try {
      await api.delete(`/lizzylog/entries/${id}`);
      message.success('Log record deleted');
      if (editingEntry?.sysId === id) handleCancelEntryEdit();
      await fetchEntries(editingPeriod.sysId);
    } catch {
      message.error('Failed to delete log record');
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
      width: 180,
      render: (_, record) => (
        <Space size={4}>
          {parseDate(record.startDate).format('MMM D, YYYY')}
          {record.isStartDateEstimated && <Tag color="orange">est.</Tag>}
        </Space>
      ),
      sorter: (a, b) => parseDate(a.startDate).valueOf() - parseDate(b.startDate).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Pre-Week Start',
      dataIndex: 'preWeekStartDate',
      key: 'preWeekStartDate',
      width: 150,
      render: (_, record) =>
        record.preWeekStartDate ? parseDate(record.preWeekStartDate).format('MMM D, YYYY') : '-',
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
      title: 'Records',
      key: 'records',
      width: 90,
      render: (_, record) => record.entries?.length ?? 0,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (_, record) => record.notes || '-',
    },
  ];

  const entryColumns = [
    {
      title: 'Type',
      dataIndex: 'entryTypeName',
      key: 'entryTypeName',
      width: 130,
    },
    {
      title: 'Date',
      dataIndex: 'entryDate',
      key: 'entryDate',
      width: 120,
      render: (_: unknown, record: PeriodLogEntry) => parseDate(record.entryDate).format('MMM D, YYYY'),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (_: unknown, record: PeriodLogEntry) => record.notes || '-',
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      render: (_: unknown, record: PeriodLogEntry) => (
        <Space size={0}>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditEntry(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete this log record?"
            onConfirm={() => handleDeleteEntry(record.sysId)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const hasPrediction = stats != null && stats.cycleCount >= 2;
  const activeEntryTypeOptions = entryTypes
    // Keep the currently-selected type visible even if it was later discontinued.
    .filter(t => !t.isDeleted || t.sysId === editingEntry?.entryTypeSysId)
    .map(t => ({ label: t.name, value: t.sysId }));

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
        onCancel={closeModal}
        footer={null}
        width={640}
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
            <Space style={{ width: '100%' }} size="middle" align="start">
              <Form.Item
                name="preWeekStartDate"
                label="Pre-Week Start"
                style={{ width: 260, marginBottom: 0 }}
              >
                <DatePicker style={{ width: '100%' }} format="MMM D, YYYY" placeholder="Optional" />
              </Form.Item>

              <Form.Item
                name="startDate"
                label="Period Start Date"
                rules={[{ required: true, message: 'Start date is required' }]}
                style={{ width: 260, marginBottom: 0 }}
              >
                <DatePicker style={{ width: '100%' }} format="MMM D, YYYY" />
              </Form.Item>
            </Space>

            <Form.Item
              name="isStartDateEstimated"
              valuePropName="checked"
              style={{ marginBottom: 0, marginTop: 4 }}
            >
              <Checkbox>Period start date is still estimated</Checkbox>
            </Form.Item>

            <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={3} placeholder="Optional overall notes for this period" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingPeriod ? 'Update' : 'Create'}
                </Button>
                <Button onClick={closeModal}>Cancel</Button>
              </Space>
            </Form.Item>
          </div>
        </Form>

        {/* Log records — only when editing an existing period */}
        {editingPeriod ? (
          <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Log Records</div>

            <Form form={entryForm} layout="vertical" size="small" requiredMark={false} autoComplete="off">
              <Space style={{ width: '100%' }} size="small" align="start" wrap>
                <Form.Item
                  name="entryTypeSysId"
                  label="Type"
                  rules={[{ required: true, message: 'Type is required' }]}
                  style={{ width: 180, marginBottom: 8 }}
                >
                  <Select
                    options={activeEntryTypeOptions}
                    placeholder="Select type"
                    notFoundContent="No types — add them in Admin → List Manager"
                  />
                </Form.Item>
                <Form.Item
                  name="entryDate"
                  label="Date"
                  rules={[{ required: true, message: 'Date is required' }]}
                  style={{ width: 160, marginBottom: 8 }}
                >
                  <DatePicker style={{ width: '100%' }} format="MMM D, YYYY" />
                </Form.Item>
                <Form.Item name="entryNotes" label="Notes" style={{ width: 200, marginBottom: 8 }}>
                  <Input placeholder="Optional notes" />
                </Form.Item>
                <Form.Item label=" " style={{ marginBottom: 8 }}>
                  <Space>
                    <Button type="primary" onClick={handleSaveEntry}>
                      {editingEntry ? 'Update' : 'Add'}
                    </Button>
                    {editingEntry && <Button onClick={handleCancelEntryEdit}>Cancel</Button>}
                  </Space>
                </Form.Item>
              </Space>
            </Form>

            <div className="condensed-table">
              <Table<PeriodLogEntry>
                rowKey={(record) => record.sysId.toString()}
                columns={entryColumns}
                dataSource={entries}
                size="small"
                pagination={false}
                locale={{ emptyText: 'No log records yet' }}
              />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12, color: '#8c8c8c', fontSize: 12 }}>
            Save this period first, then reopen it to add log records.
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LizzyLog;
