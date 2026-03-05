import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  InboxOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

interface Note {
  sysId: number;
  subject: string;
  description: string;
  createTimestamp: string;
  modifyTimestamp: string;
  isDiscontinued: boolean;
  discontinuedDate: string | null;
}

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [discontinuedModalVisible, setDiscontinuedModalVisible] = useState(false);
  const [discontinuedNotes, setDiscontinuedNotes] = useState<Note[]>([]);
  const [discontinuedLoading, setDiscontinuedLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/aviation/notes');
      setNotes(response.data);
    } catch {
      message.error('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreate = () => {
    setEditingNote(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    form.setFieldsValue({
      subject: note.subject,
      description: note.description,
    });
    setModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handleSubmit = async (values: { subject: string; description: string }) => {
    try {
      if (editingNote) {
        await api.put(`/aviation/notes/${editingNote.sysId}`, values);
        message.success('Note updated successfully');
      } else {
        await api.post('/aviation/notes', values);
        message.success('Note created successfully');
      }
      setModalVisible(false);
      setSelectedRowKeys([]);
      fetchNotes();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkDiscontinue = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.post(`/aviation/notes/${id}/discontinue`)));
      message.success(`${selectedRowKeys.length} note${selectedRowKeys.length > 1 ? 's' : ''} discontinued`);
      setSelectedRowKeys([]);
      fetchNotes();
    } catch {
      message.error('Failed to discontinue notes');
    }
  };

  const fetchDiscontinuedNotes = async () => {
    setDiscontinuedLoading(true);
    try {
      const response = await api.get('/aviation/notes/discontinued');
      setDiscontinuedNotes(response.data);
    } catch {
      message.error('Failed to fetch discontinued notes');
    } finally {
      setDiscontinuedLoading(false);
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await api.post(`/aviation/notes/${id}/reactivate`);
      message.success('Note reactivated');
      fetchDiscontinuedNotes();
      fetchNotes();
    } catch {
      message.error('Failed to reactivate note');
    }
  };

  const handleOpenDiscontinuedModal = () => {
    setDiscontinuedModalVisible(true);
    fetchDiscontinuedNotes();
  };

  const columns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'Date',
      dataIndex: 'createTimestamp',
      key: 'createTimestamp',
      width: 150,
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a: Note, b: Note) =>
        dayjs(a.createTimestamp).unix() - dayjs(b.createTimestamp).unix(),
      defaultSortOrder: 'descend' as const,
    },
  ];

  // Get the selected note for single-select actions
  const selectedNote = selectedRowKeys.length === 1
    ? notes.find(n => n.sysId === selectedRowKeys[0])
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 112px)',
      }}
    >
      <PageHeader title="Notes" />

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
        <Tooltip title="Add Note">
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
              if (selectedNote) handleEdit(selectedNote);
            }}
          />
        </Tooltip>
        <Tooltip title="Discontinue">
          <Popconfirm
            title={`Discontinue ${selectedRowKeys.length} note${selectedRowKeys.length > 1 ? 's' : ''}?`}
            description="Discontinued notes can be reactivated later."
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
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c' }}>
          {selectedRowKeys.length > 0
            ? `${selectedRowKeys.length} selected`
            : 'Select rows to perform actions'}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={notes}
          rowKey="sysId"
          loading={loading}
          size="small"
          pagination={{ pageSize: 25, size: 'small' }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
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
          scroll={{ y: 'calc(100vh - 320px)' }}
        />
      </div>

      <Modal
        title={editingNote ? 'Edit Note' : 'Add Note'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Subject is required' }]}
          >
            <Input placeholder="Enter note subject" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <Input.TextArea
              rows={6}
              placeholder="Enter note description"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingNote ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Discontinued Notes Modal */}
      <Modal
        title="Discontinued Notes"
        open={discontinuedModalVisible}
        onCancel={() => setDiscontinuedModalVisible(false)}
        footer={
          <Button onClick={() => setDiscontinuedModalVisible(false)}>
            Close
          </Button>
        }
        width={600}
      >
        {discontinuedLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading...</div>
        ) : discontinuedNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            No discontinued notes
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {discontinuedNotes.map(note => (
              <div
                key={note.sysId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{note.subject}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    Created {dayjs(note.createTimestamp).format('MMM D, YYYY')}
                    {note.discontinuedDate && (
                      <> • Discontinued {dayjs(note.discontinuedDate).format('MMM D, YYYY')}</>
                    )}
                  </div>
                </div>
                <Tooltip title="Reactivate">
                  <Button
                    type="text"
                    icon={<UndoOutlined />}
                    onClick={() => handleReactivate(note.sysId)}
                  >
                    Reactivate
                  </Button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Notes;
