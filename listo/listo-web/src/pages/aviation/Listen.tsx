import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Card,
  Tag,
  Typography,
} from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  DeleteOutlined as ClearOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

interface AudioStream {
  sysId: number;
  name: string;
  url: string;
  category: string | null;
  description: string | null;
  createTimestamp: string;
  modifyTimestamp: string;
}

interface StreamGroup {
  sysId: string;
  isGroupHeader: true;
  groupLabel: string;
  children: AudioStream[];
  count: number;
}

type StreamRow = StreamGroup | AudioStream;

const Listen: React.FC = () => {
  const [streams, setStreams] = useState<AudioStream[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStream, setEditingStream] = useState<AudioStream | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentStream, setCurrentStream] = useState<AudioStream | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [form] = Form.useForm();

  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<{ text: string; time: string }[]>([]);

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/aviation/audiostreams');
      setStreams(response.data);
    } catch {
      message.error('Failed to fetch audio streams');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/aviation/audiostreamcategories');
      setCategories(response.data.map((c: { name: string }) => c.name));
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchStreams();
    fetchCategories();
  }, [fetchStreams, fetchCategories]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const stopTranscription = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (sessionIdRef.current) {
      api.delete(`/aviation/transcription/${sessionIdRef.current}`).catch(() => {});
      sessionIdRef.current = null;
    }
    setIsTranscribing(false);
  }, []);

  // Stop transcription when stream changes or component unmounts
  useEffect(() => { stopTranscription(); }, [currentStream?.sysId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopTranscription(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const startTranscription = useCallback(async () => {
    if (!currentStream) return;
    try {
      const response = await api.post('/aviation/transcription/start', { url: currentStream.url });
      const { sessionId } = response.data;
      sessionIdRef.current = sessionId;
      setIsTranscribing(true);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const poll = await api.get(`/aviation/transcription/${sessionId}/poll`);
          const { segments, isComplete } = poll.data as { segments: string[]; isComplete: boolean };
          if (segments.length > 0) {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setTranscript(prev => [...prev, ...segments.map(text => ({ text, time }))]);
          }
          if (isComplete) stopTranscription();
        } catch (err: unknown) {
          const e = err as { response?: { status?: number } };
          if (e.response?.status && e.response.status >= 500) stopTranscription();
        }
      }, 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to start transcription.');
    }
  }, [currentStream]);

  const groupedStreams = useMemo((): StreamGroup[] => {
    const categoryMap = new Map<string, AudioStream[]>();

    streams.forEach(s => {
      const cat = s.category ?? '';
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(s);
    });

    const groups: StreamGroup[] = [];

    [...categoryMap.entries()]
      .filter(([cat]) => cat !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([cat, children]) => {
        groups.push({
          sysId: `group-${cat}`,
          isGroupHeader: true,
          groupLabel: cat,
          children,
          count: children.length,
        });
      });

    const uncategorized = categoryMap.get('') ?? [];
    if (uncategorized.length > 0) {
      groups.push({
        sysId: 'group-uncategorized',
        isGroupHeader: true,
        groupLabel: 'Uncategorized',
        children: uncategorized,
        count: uncategorized.length,
      });
    }

    return groups;
  }, [streams]);

  // Auto-expand any newly added groups
  useEffect(() => {
    const allKeys = groupedStreams.map(g => g.sysId);
    setExpandedGroups(prev => {
      const newKeys = allKeys.filter(k => !prev.includes(k));
      return newKeys.length > 0 ? [...prev, ...newKeys] : prev;
    });
  }, [groupedStreams]);

  const handleCreate = () => {
    setEditingStream(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (stream: AudioStream) => {
    setEditingStream(stream);
    form.setFieldsValue({
      name: stream.name,
      url: stream.url,
      category: stream.category ?? undefined,
      description: stream.description ?? undefined,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleSubmit = async (values: { name: string; url: string; category?: string; description?: string }) => {
    try {
      if (editingStream) {
        await api.put(`/aviation/audiostreams/${editingStream.sysId}`, values);
        message.success('Stream updated');
        if (currentStream?.sysId === editingStream.sysId) {
          setCurrentStream(prev => prev ? { ...prev, ...values, category: values.category ?? null, description: values.description ?? null } : null);
        }
      } else {
        await api.post('/aviation/audiostreams', values);
        message.success('Stream added');
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      fetchStreams();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`/aviation/audiostreams/${id}`)));
      message.success(`${selectedRowKeys.length} stream${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      if (currentStream && selectedRowKeys.includes(currentStream.sysId)) {
        setCurrentStream(null);
      }
      setSelectedRowKeys([]);
      fetchStreams();
    } catch {
      message.error('Failed to delete streams');
    }
  };

  const selectedStream = selectedRowKeys.length === 1
    ? streams.find(s => s.sysId === selectedRowKeys[0]) ?? null
    : null;

  const columns: ProColumns<StreamRow>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (_, record) => {
        if ('isGroupHeader' in record) {
          return (
            <span style={{ fontWeight: 600 }}>
              {record.groupLabel}
              <span style={{ color: '#8c8c8c', fontWeight: 400, marginLeft: 6 }}>
                ({record.count})
              </span>
            </span>
          );
        }
        return record.name;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        return record.description ?? '';
      },
    },
    {
      title: 'URL',
      dataIndex: 'url',
      ellipsis: true,
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        return (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {record.url}
          </Typography.Text>
        );
      },
    },
    {
      title: '',
      key: 'play',
      width: 60,
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        return (
          <Tooltip title="Play">
            <Button
              type={currentStream?.sysId === record.sysId ? 'primary' : 'text'}
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentStream(record);
              }}
            />
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
      <PageHeader title="Listen" />

      {/* Now Playing */}
      <Card size="small" style={{ marginBottom: 8, flexShrink: 0 }}>
        {currentStream ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong>{currentStream.name}</Typography.Text>
                {currentStream.category && (
                  <Tag style={{ marginLeft: 8 }}>{currentStream.category}</Tag>
                )}
                {currentStream.description && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {currentStream.description}
                    </Typography.Text>
                  </div>
                )}
              </div>
              <audio
                ref={audioRef}
                key={currentStream.url}
                src={currentStream.url}
                controls
                autoPlay
                style={{ height: 32 }}
              />
              <Tooltip title={isTranscribing ? 'Stop transcription' : 'Start transcription'}>
                <Button
                  type={isTranscribing ? 'primary' : 'text'}
                  size="small"
                  danger={isTranscribing}
                  icon={isTranscribing ? <AudioMutedOutlined /> : <AudioOutlined />}
                  onClick={isTranscribing ? stopTranscription : startTranscription}
                />
              </Tooltip>
              {transcript.length > 0 && (
                <Tooltip title="Clear transcript">
                  <Button
                    type="text"
                    size="small"
                    icon={<ClearOutlined />}
                    onClick={() => setTranscript([])}
                  />
                </Tooltip>
              )}
              <Tooltip title="Pop out player">
                <Button
                  type="text"
                  size="small"
                  icon={<FullscreenOutlined />}
                  onClick={() => {
                    stopTranscription();
                    const params = new URLSearchParams({
                      url: currentStream.url,
                      name: currentStream.name,
                      ...(currentStream.category ? { category: currentStream.category } : {}),
                      ...(currentStream.description ? { description: currentStream.description } : {}),
                      popout: 'true',
                    });
                    window.open(
                      `/aviation/listen/player?${params.toString()}`,
                      'listen-player',
                      'width=520,height=320,toolbar=no,menubar=no,status=no,resizable=yes'
                    );
                    setCurrentStream(null);
                  }}
                />
              </Tooltip>
            </div>
            {(transcript.length > 0 || isTranscribing) && (
              <div
                style={{
                  border: '1px solid #e8e8e8',
                  borderRadius: 6,
                  padding: '6px 10px',
                  background: '#fafafa',
                  maxHeight: 140,
                  overflowY: 'auto',
                  fontSize: 12,
                }}
              >
                {transcript.length > 0 ? (
                  <>
                    {transcript.map((entry, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          padding: '3px 0',
                          borderTop: i > 0 ? '1px solid #f0f0f0' : undefined,
                          alignItems: 'flex-start',
                        }}
                      >
                        <span style={{ fontSize: 10, color: '#8c8c8c', fontFamily: 'monospace', whiteSpace: 'nowrap', paddingTop: 2 }}>
                          {entry.time}
                        </span>
                        <span style={{ lineHeight: 1.5 }}>{entry.text}</span>
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </>
                ) : (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Waiting for transmissions…
                  </Typography.Text>
                )}
              </div>
            )}
          </div>
        ) : (
          <Typography.Text type="secondary">Select a stream to begin playback</Typography.Text>
        )}
      </Card>

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
        <Tooltip title="Add Stream">
          <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleCreate} />
        </Tooltip>
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => { if (selectedStream) handleEdit(selectedStream); }}
          />
        </Tooltip>
        <Tooltip title="Delete">
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} stream${selectedRowKeys.length > 1 ? 's' : ''}?`}
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
          <Button type="text" size="small" icon={<ReloadOutlined />} onClick={fetchStreams} />
        </Tooltip>
        <div style={{ flex: 1 }} />
        {selectedRowKeys.length > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            {selectedRowKeys.length} selected
          </span>
        )}
      </div>

      {/* Table */}
      <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <ProTable<StreamRow>
          columns={columns}
          dataSource={groupedStreams}
          rowKey={record => record.sysId.toString()}
          loading={loading}
          search={false}
          options={false}
          toolBarRender={false}
          tableAlertRender={false}
          pagination={false}
          expandable={{
            expandedRowKeys: expandedGroups,
            onExpandedRowsChange: keys => setExpandedGroups(keys as string[]),
            childrenColumnName: 'children',
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: keys => setSelectedRowKeys(keys),
            getCheckboxProps: record => ({
              disabled: 'isGroupHeader' in record,
              style: 'isGroupHeader' in record ? { display: 'none' } : undefined,
            }),
          }}
          onRow={record => {
            let clickTimer: ReturnType<typeof setTimeout> | null = null;
            return {
              onClick: () => {
                if ('isGroupHeader' in record) return;
                clickTimer = setTimeout(() => {
                  const key = record.sysId;
                  setSelectedRowKeys(prev =>
                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                  );
                }, 200);
              },
              onDoubleClick: () => {
                if (clickTimer) clearTimeout(clickTimer);
                if (!('isGroupHeader' in record)) handleEdit(record);
              },
              style: {
                cursor: 'isGroupHeader' in record ? 'default' : 'pointer',
                background: 'isGroupHeader' in record
                  ? '#f5f5f5'
                  : currentStream?.sysId === (record as AudioStream).sysId
                    ? '#f0f7ff'
                    : undefined,
                fontWeight: 'isGroupHeader' in record ? 600 : undefined,
              },
            };
          }}
        />
      </div>

      <Modal
        title={editingStream ? 'Edit Stream' : 'Add Stream'}
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
              <Input placeholder="e.g. LiveATC - KORD Approach" />
            </Form.Item>

            <Form.Item
              name="url"
              label="Stream URL"
              rules={[{ required: true, message: 'URL is required' }]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="https://..." />
            </Form.Item>

            <Form.Item name="category" label="Category" style={{ marginBottom: 0 }}>
              <Select
                placeholder="Select a category"
                allowClear
                showSearch
                options={categories.map(c => ({ label: c, value: c }))}
              />
            </Form.Item>

            <Form.Item name="description" label="Description" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={2} placeholder="Optional description" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingStream ? 'Update' : 'Add'}
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

export default Listen;
