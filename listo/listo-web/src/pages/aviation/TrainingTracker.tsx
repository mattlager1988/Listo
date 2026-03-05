import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Select,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PrinterOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Column } from '@ant-design/charts';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import RichTextEditor from '../../components/RichTextEditor';
import AiAnalysisModal from '../../components/AiAnalysisModal';

interface TrainingLog {
  sysId: number;
  date: string;
  description: string;
  hoursFlown: number;
  trainingTypeSysId: number;
  trainingTypeName: string;
  aircraftSysId: number | null;
  aircraftPlaneId: string | null;
  aircraftName: string | null;
}

interface TrainingType {
  sysId: number;
  name: string;
}

interface Aircraft {
  sysId: number;
  planeId: string;
  name: string;
}

interface Summary {
  totalHours: number;
  totalEntries: number;
  hoursByType: Record<string, number>;
}

const TrainingTracker: React.FC = () => {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingLog, setEditingLog] = useState<TrainingLog | null>(null);
  const [viewingLog, setViewingLog] = useState<TrainingLog | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/aviation/traininglogs');
      setLogs(response.data);
    } catch {
      message.error('Failed to fetch training logs');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLookups = useCallback(async () => {
    try {
      const [typesRes, aircraftRes] = await Promise.all([
        api.get('/aviation/trainingtypes'),
        api.get('/aviation/aircraft'),
      ]);
      setTrainingTypes(typesRes.data);
      setAircraft(aircraftRes.data);
    } catch {
      message.error('Failed to fetch lookup data');
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get('/aviation/traininglogs/summary');
      setSummary(response.data);
    } catch {
      // Summary is optional, don't show error
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchLookups();
    fetchSummary();
  }, [fetchLogs, fetchLookups, fetchSummary]);

  const handleCreate = () => {
    setEditingLog(null);
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), hoursFlown: 0 });
    setModalVisible(true);
  };

  const handleEdit = (log: TrainingLog) => {
    setEditingLog(log);
    form.setFieldsValue({
      date: dayjs(log.date),
      description: log.description,
      hoursFlown: log.hoursFlown,
      trainingTypeSysId: log.trainingTypeSysId,
      aircraftSysId: log.aircraftSysId,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleViewDescription = (log: TrainingLog) => {
    setViewingLog(log);
    setViewModalVisible(true);
  };

  const handlePrint = () => {
    if (!viewingLog) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Training Log - ${dayjs(viewingLog.date).format('MMM D, YYYY')}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { font-size: 18px; margin-bottom: 10px; }
              .meta { color: #666; margin-bottom: 20px; }
              .description { line-height: 1.6; }
              .description p { margin: 0 0 0.5em 0; }
              .description ul, .description ol { padding-left: 1.5em; margin: 0.5em 0; }
              .description li { margin: 0.25em 0; }
            </style>
          </head>
          <body>
            <h1>Training Log</h1>
            <div class="meta">
              <strong>Date:</strong> ${dayjs(viewingLog.date).format('MMMM D, YYYY')}<br/>
              <strong>Type:</strong> ${viewingLog.trainingTypeName}<br/>
              <strong>Aircraft:</strong> ${viewingLog.aircraftPlaneId ? `${viewingLog.aircraftPlaneId} - ${viewingLog.aircraftName}` : 'N/A'}<br/>
              <strong>Hours:</strong> ${viewingLog.hoursFlown.toFixed(1)}
            </div>
            <div class="description">${viewingLog.description}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSubmit = async (values: {
    date: dayjs.Dayjs;
    description: string;
    hoursFlown: number;
    trainingTypeSysId: number;
    aircraftSysId?: number;
  }) => {
    const payload = {
      date: values.date.format('YYYY-MM-DD'),
      description: values.description || '',
      hoursFlown: values.hoursFlown,
      trainingTypeSysId: values.trainingTypeSysId,
      aircraftSysId: values.aircraftSysId || null,
    };

    try {
      if (editingLog) {
        await api.put(`/aviation/traininglogs/${editingLog.sysId}`, payload);
        message.success('Training log updated');
      } else {
        await api.post('/aviation/traininglogs', payload);
        message.success('Training log created');
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      fetchLogs();
      fetchSummary();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`/aviation/traininglogs/${id}`)));
      message.success(`${selectedRowKeys.length} training log${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
      fetchLogs();
      fetchSummary();
    } catch {
      message.error('Failed to delete training logs');
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a: TrainingLog, b: TrainingLog) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Type',
      dataIndex: 'trainingTypeName',
      key: 'trainingTypeName',
      width: 150,
    },
    {
      title: 'Aircraft',
      key: 'aircraft',
      width: 180,
      render: (_: unknown, record: TrainingLog) =>
        record.aircraftPlaneId
          ? `${record.aircraftPlaneId} - ${record.aircraftName}`
          : '-',
    },
    {
      title: 'Hours',
      dataIndex: 'hoursFlown',
      key: 'hoursFlown',
      width: 80,
      render: (hours: number) => hours.toFixed(1),
    },
  ];

  // Get the selected log for single-select actions
  const selectedLog = selectedRowKeys.length === 1
    ? logs.find(l => l.sysId === selectedRowKeys[0])
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 112px)',
      }}
    >
      <PageHeader title="Training Tracker" />

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
        <Tooltip title="Log Training">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          />
        </Tooltip>
        <Tooltip title="View">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => {
              if (selectedLog) handleViewDescription(selectedLog);
            }}
          />
        </Tooltip>
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => {
              if (selectedLog) handleEdit(selectedLog);
            }}
          />
        </Tooltip>
        <Tooltip title="Delete">
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} training log${selectedRowKeys.length > 1 ? 's' : ''}?`}
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
        <Tooltip title="Analyze with AI">
          <Button
            type="text"
            size="small"
            icon={<RobotOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => setAnalysisModalVisible(true)}
          />
        </Tooltip>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c' }}>
          {selectedRowKeys.length > 0
            ? `${selectedRowKeys.length} selected`
            : 'Select rows to perform actions'}
        </div>
      </div>

      {/* Hours by Type Chart */}
      {summary && (
        <Card title="Hours by Type" size="small" style={{ marginBottom: 16, flexShrink: 0 }}>
          {Object.keys(summary.hoursByType).length > 0 ? (
            <Column
              data={Object.entries(summary.hoursByType).map(([type, hours]) => ({
                type,
                hours,
              }))}
              xField="type"
              yField="hours"
              height={200}
              label={{
                text: (d: { hours: number }) => `${d.hours.toFixed(1)}h`,
                position: 'inside',
              }}
              axis={{
                y: { title: 'Hours' },
              }}
            />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              No training logged yet
            </div>
          )}
        </Card>
      )}

      {/* Table Container */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="sysId"
          loading={loading}
          size="small"
          pagination={{ pageSize: 25, size: 'small' }}
          style={{ fontSize: 13 }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          onRow={(record) => ({
            onClick: () => {
              const key = record.sysId;
              setSelectedRowKeys(prev =>
                prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
              );
            },
            onDoubleClick: () => handleEdit(record),
            style: { cursor: 'pointer' },
          })}
          scroll={{ y: 'calc(100vh - 580px)' }}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingLog ? 'Edit Training Log' : 'Log Training'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Date is required' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="trainingTypeSysId"
                label="Training Type"
                rules={[{ required: true, message: 'Training type is required' }]}
              >
                <Select placeholder="Select type">
                  {trainingTypes.map(t => (
                    <Select.Option key={t.sysId} value={t.sysId}>
                      {t.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hoursFlown" label="Hours" rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  max={24}
                  step={0.1}
                  precision={1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="aircraftSysId" label="Aircraft">
            <Select placeholder="Select aircraft (optional)" allowClear>
              {aircraft.map(a => (
                <Select.Option key={a.sysId} value={a.sysId}>
                  {a.planeId} - {a.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <RichTextEditor placeholder="Describe your training activity..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingLog ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Description Modal */}
      <Modal
        title={viewingLog ? `Training Log - ${dayjs(viewingLog.date).format('MMM D, YYYY')}` : 'Training Log'}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        width={700}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>,
          <Button key="close" type="primary" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        {viewingLog && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <strong>Type:</strong> {viewingLog.trainingTypeName}
              </Col>
              <Col span={8}>
                <strong>Aircraft:</strong> {viewingLog.aircraftPlaneId ? `${viewingLog.aircraftPlaneId} - ${viewingLog.aircraftName}` : 'N/A'}
              </Col>
              <Col span={8}>
                <strong>Hours:</strong> {viewingLog.hoursFlown.toFixed(1)}
              </Col>
            </Row>
            <div
              className="rich-text-content"
              style={{
                padding: 16,
                background: '#fafafa',
                borderRadius: 6,
                border: '1px solid #d9d9d9',
                minHeight: 200,
                lineHeight: 1.6,
              }}
              dangerouslySetInnerHTML={{ __html: viewingLog.description }}
            />
          </div>
        )}
      </Modal>

      {/* AI Analysis Modal */}
      <AiAnalysisModal
        open={analysisModalVisible}
        onClose={() => setAnalysisModalVisible(false)}
        selectedLogIds={selectedRowKeys.map(k => Number(k))}
      />
    </div>
  );
};

export default TrainingTracker;
