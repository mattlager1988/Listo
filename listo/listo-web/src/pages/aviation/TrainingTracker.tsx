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
  Upload,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Tooltip,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PrinterOutlined,
  RobotOutlined,
  PaperClipOutlined,
  UploadOutlined,
  DownloadOutlined,
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

interface Attachment {
  sysId: number;
  originalFileName: string;
  mimeType: string;
  entitySysId: number;
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
  const [attachmentMap, setAttachmentMap] = useState<Map<number, Attachment[]>>(new Map());
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [removeAttachmentIds, setRemoveAttachmentIds] = useState<number[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(new Map());
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

  const fetchAttachments = useCallback(async () => {
    try {
      const response = await api.get('/documents?module=aviation&entityType=training_log');
      const map = new Map<number, Attachment[]>();
      for (const doc of response.data) {
        const existing = map.get(doc.entitySysId) || [];
        existing.push(doc);
        map.set(doc.entitySysId, existing);
      }
      setAttachmentMap(map);
    } catch {
      // Attachments are supplementary, don't show error
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchLookups();
    fetchSummary();
    fetchAttachments();
  }, [fetchLogs, fetchLookups, fetchSummary, fetchAttachments]);

  const handleCreate = () => {
    setEditingLog(null);
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), hoursFlown: 0 });
    setFileList([]);
    setRemoveAttachmentIds([]);
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
    setFileList([]);
    setRemoveAttachmentIds([]);
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const loadAttachmentPreviews = useCallback(async (attachments: Attachment[]) => {
    const previewable = attachments.filter(
      a => a.mimeType.startsWith('image/') || a.mimeType === 'application/pdf'
    );
    const urlMap = new Map<number, string>();
    await Promise.all(
      previewable.map(async (att) => {
        try {
          const response = await api.get(`/documents/${att.sysId}/download`, {
            responseType: 'blob',
          });
          urlMap.set(att.sysId, URL.createObjectURL(response.data));
        } catch {
          // Skip failed previews
        }
      })
    );
    setPreviewUrls(urlMap);
  }, []);

  const handleViewDescription = (log: TrainingLog) => {
    setViewingLog(log);
    setPreviewUrls(new Map());
    const attachments = attachmentMap.get(log.sysId);
    if (attachments && attachments.length > 0) {
      loadAttachmentPreviews(attachments);
    }
    setViewModalVisible(true);
  };

  const handleCloseViewModal = () => {
    setViewModalVisible(false);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls(new Map());
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      const response = await api.get(`/documents/${attachment.sysId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to download attachment');
    }
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

  const uploadAttachment = async (logSysId: number, file: UploadFile) => {
    const formData = new FormData();
    formData.append('file', file.originFileObj as Blob);
    formData.append('description', '');
    formData.append('module', 'aviation');
    formData.append('entityType', 'training_log');
    formData.append('entitySysId', logSysId.toString());
    await api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
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

        // Delete removed attachments
        if (removeAttachmentIds.length > 0) {
          await Promise.all(removeAttachmentIds.map(id => api.delete(`/documents/${id}`)));
        }

        // Upload new files
        if (fileList.length > 0) {
          await Promise.all(fileList.map(f => uploadAttachment(editingLog.sysId, f)));
        }

        message.success('Training log updated');
      } else {
        const response = await api.post('/aviation/traininglogs', payload);
        const newSysId = response.data.sysId;

        if (fileList.length > 0) {
          await Promise.all(fileList.map(f => uploadAttachment(newSysId, f)));
        }

        message.success('Training log created');
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      fetchLogs();
      fetchSummary();
      fetchAttachments();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDelete = async () => {
    try {
      // Delete attachments first, then training logs
      await Promise.all(
        selectedRowKeys.map(async (id) => {
          const attachments = attachmentMap.get(Number(id));
          if (attachments) {
            await Promise.all(attachments.map(a => api.delete(`/documents/${a.sysId}`)));
          }
          await api.delete(`/aviation/traininglogs/${id}`);
        })
      );
      message.success(`${selectedRowKeys.length} training log${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
      fetchLogs();
      fetchSummary();
      fetchAttachments();
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
    {
      title: '',
      key: 'attachment',
      width: 40,
      render: (_: unknown, record: TrainingLog) => {
        const attachments = attachmentMap.get(record.sysId);
        if (!attachments || attachments.length === 0) return null;
        const tooltip = attachments.length === 1
          ? attachments[0].originalFileName
          : `${attachments.length} files attached`;
        return (
          <Tooltip title={tooltip}>
            <PaperClipOutlined
              style={{ color: '#1890ff' }}
              onClick={(e) => {
                e.stopPropagation();
                handleViewDescription(record);
              }}
            />
          </Tooltip>
        );
      },
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
      <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
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
          onRow={(record) => {
            let clickTimer: ReturnType<typeof setTimeout> | null = null;
            return {
              onClick: () => {
                clickTimer = setTimeout(() => {
                  const key = record.sysId;
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
        <Form form={form} layout="vertical" onFinish={handleSubmit} size="small" requiredMark={false} autoComplete="off">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="date"
                  label="Date"
                  rules={[{ required: true, message: 'Date is required' }]}
                  style={{ marginBottom: 0 }}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="trainingTypeSysId"
                  label="Training Type"
                  rules={[{ required: true, message: 'Training type is required' }]}
                  style={{ marginBottom: 0 }}
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
                <Form.Item name="hoursFlown" label="Hours" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
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

            <Form.Item name="aircraftSysId" label="Aircraft" style={{ marginBottom: 0 }}>
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
              style={{ marginBottom: 0 }}
            >
              <RichTextEditor placeholder="Describe your training activity..." />
            </Form.Item>

            <Form.Item label="Attachments" style={{ marginBottom: 0 }}>
              {/* Show existing attachments when editing */}
              {editingLog && (() => {
                const existing = (attachmentMap.get(editingLog.sysId) || [])
                  .filter(a => !removeAttachmentIds.includes(a.sysId));
                if (existing.length === 0) return null;
                return (
                  <div style={{ marginBottom: 8 }}>
                    {existing.map(att => (
                      <div key={att.sysId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <PaperClipOutlined />
                        <span style={{ fontSize: 12 }}>{att.originalFileName}</span>
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={() => setRemoveAttachmentIds(prev => [...prev, att.sysId])}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <Upload
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: fl }) => setFileList(fl)}
                multiple
              >
                <Button size="small" icon={<UploadOutlined />}>Attach Files</Button>
              </Upload>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingLog ? 'Update' : 'Create'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* View Description Modal */}
      <Modal
        title={viewingLog ? `Training Log - ${dayjs(viewingLog.date).format('MMM D, YYYY')}` : 'Training Log'}
        open={viewModalVisible}
        onCancel={handleCloseViewModal}
        width={700}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>,
          <Button key="close" type="primary" onClick={handleCloseViewModal}>
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
            {(() => {
              const attachments = attachmentMap.get(viewingLog.sysId);
              if (!attachments || attachments.length === 0) return null;
              return (
                <div style={{ marginTop: 16 }}>
                  <strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Attachments ({attachments.length})
                  </strong>
                  {attachments.map(att => (
                    <div key={att.sysId} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <PaperClipOutlined />
                        <span style={{ fontSize: 12 }}>{att.originalFileName}</span>
                        <Button
                          size="small"
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadAttachment(att)}
                        >
                          Download
                        </Button>
                      </div>
                      {previewUrls.get(att.sysId) && att.mimeType.startsWith('image/') && (
                        <img
                          src={previewUrls.get(att.sysId)}
                          alt={att.originalFileName}
                          style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid #d9d9d9' }}
                        />
                      )}
                      {previewUrls.get(att.sysId) && att.mimeType === 'application/pdf' && (
                        <iframe
                          src={previewUrls.get(att.sysId)}
                          title={att.originalFileName}
                          style={{ width: '100%', height: 400, border: '1px solid #d9d9d9', borderRadius: 6 }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
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
