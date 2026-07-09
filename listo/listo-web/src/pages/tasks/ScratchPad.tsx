import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Upload,
  Tag,
  Tooltip,
  Popconfirm,
  Modal,
  message,
  Empty,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  PlusOutlined,
  PaperClipOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DocumentList from '../../components/DocumentList';
import TaskFormModal from '../../components/TaskFormModal';

dayjs.extend(relativeTime);

interface ScratchNote {
  sysId: number;
  content: string;
  isConverted: boolean;
  convertedDate?: string;
  convertedTaskSysId?: number;
  attachmentCount: number;
  createTimestamp: string;
  modifyTimestamp: string;
}

interface BoardSummary {
  sysId: number;
  name: string;
}

const firstLine = (content: string): string => {
  const line = content.split('\n').map(l => l.trim()).find(l => l.length > 0) || 'Untitled note';
  return line.length > 120 ? `${line.slice(0, 120)}…` : line;
};

const ScratchPad: React.FC = () => {
  const [notes, setNotes] = useState<ScratchNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  // Composer
  const [content, setContent] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [adding, setAdding] = useState(false);

  // Edit note
  const [editNote, setEditNote] = useState<ScratchNote | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Convert to task
  const [convertNote, setConvertNote] = useState<ScratchNote | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [converting, setConverting] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/scratchnotes');
      setNotes(res.data);
    } catch {
      message.error('Failed to load scratch notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAdd = async () => {
    if (!content.trim() && fileList.length === 0) {
      message.warning('Type a note or attach a file');
      return;
    }
    setAdding(true);
    try {
      const res = await api.post('/tasks/scratchnotes', { content: content.trim() });
      const noteId: number = res.data.sysId;

      for (const file of fileList) {
        const formData = new FormData();
        formData.append('file', file as unknown as Blob);
        formData.append('description', '');
        formData.append('module', 'tasks');
        formData.append('entityType', 'scratchpad');
        formData.append('entitySysId', noteId.toString());
        await api.post('/documents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
      }

      setContent('');
      setFileList([]);
      fetchNotes();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to add note');
    } finally {
      setAdding(false);
    }
  };

  const composerUploadProps: UploadProps = {
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      setFileList(prev => [...prev, file]);
      return false; // stage locally; upload happens on Add
    },
    onRemove: (file) => {
      setFileList(prev => prev.filter(f => f.uid !== file.uid));
    },
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  const openEdit = (note: ScratchNote) => {
    setEditNote(note);
    setEditContent(note.content);
    setSelectedRowKeys([]);
  };

  const handleEditSave = async () => {
    if (!editNote) return;
    setSavingEdit(true);
    try {
      await api.put(`/tasks/scratchnotes/${editNote.sysId}`, { content: editContent });
      setEditNote(null);
      fetchNotes();
    } catch {
      message.error('Failed to update note');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`/tasks/scratchnotes/${id}`)));
      message.success(`${selectedRowKeys.length} note${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
      fetchNotes();
    } catch {
      message.error('Failed to delete notes');
    }
  };

  const openConvert = async (note: ScratchNote) => {
    setSelectedRowKeys([]);
    try {
      const res = await api.get('/tasks/boards');
      setBoards(res.data);
    } catch {
      setBoards([]);
    }
    setConvertNote(note);
  };

  const handleConvert = async (values: { name: string; description?: string; priority?: string; dueDate?: string; taskBoardSysId?: number }) => {
    if (!convertNote) return;
    setConverting(true);
    try {
      await api.post(`/tasks/scratchnotes/${convertNote.sysId}/convert`, {
        name: values.name,
        description: values.description,
        priority: values.priority,
        dueDate: values.dueDate,
        taskBoardSysId: values.taskBoardSysId,
      });
      message.success(values.taskBoardSysId ? 'Note added to board' : 'Note added to backlog');
      setConvertNote(null);
      fetchNotes();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to convert note');
    } finally {
      setConverting(false);
    }
  };

  const columns: ProColumns<ScratchNote>[] = [
    {
      title: 'Note',
      dataIndex: 'content',
      key: 'content',
      render: (_, record) => (
        <span
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
          }}
        >
          {record.content || <span style={{ color: '#bfbfbf' }}>(no text)</span>}
        </span>
      ),
    },
    {
      title: 'Files',
      dataIndex: 'attachmentCount',
      key: 'attachmentCount',
      width: 70,
      align: 'center',
      render: (_, record) =>
        record.attachmentCount > 0 ? (
          <span>
            <PaperClipOutlined /> {record.attachmentCount}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: 'Status',
      dataIndex: 'isConverted',
      key: 'isConverted',
      width: 110,
      render: (_, record) =>
        record.isConverted ? (
          <Tooltip title={record.convertedDate ? `Converted ${dayjs(record.convertedDate).format('MMM D, YYYY')}` : 'Converted'}>
            <Tag color="green">Converted</Tag>
          </Tooltip>
        ) : (
          <Tag>Note</Tag>
        ),
    },
    {
      title: 'Created',
      dataIndex: 'createTimestamp',
      key: 'createTimestamp',
      width: 120,
      render: (_, record) => dayjs(record.createTimestamp).fromNow(),
      sorter: (a, b) => dayjs(a.createTimestamp).unix() - dayjs(b.createTimestamp).unix(),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Tooltip title={record.isConverted ? 'Already converted' : 'Convert to task'}>
          <Button
            type="text"
            size="small"
            icon={<ExportOutlined />}
            disabled={record.isConverted}
            onClick={(e) => {
              e.stopPropagation();
              openConvert(record);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  const selectedNote = selectedRowKeys.length === 1
    ? notes.find(n => n.sysId.toString() === selectedRowKeys[0].toString())
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
      <PageHeader title="Scratch Pad" />

      {/* Quick capture composer */}
      <div
        style={{
          padding: 12,
          marginBottom: 12,
          background: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: 6,
          flexShrink: 0,
        }}
      >
        <Input.TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="Jot a quick note… (Ctrl+Enter to add)"
        />
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 8 }}>
          <Upload {...composerUploadProps}>
            <Button size="small" icon={<PaperClipOutlined />}>Attach</Button>
          </Upload>
          <div style={{ flex: 1 }} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={adding}
            onClick={handleAdd}
          >
            Add
          </Button>
        </div>
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
        <Tooltip title="Edit Note">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => { if (selectedNote) openEdit(selectedNote); }}
          />
        </Tooltip>
        <Tooltip title="Convert to Task">
          <Button
            type="text"
            size="small"
            icon={<ExportOutlined />}
            disabled={selectedRowKeys.length !== 1 || !!selectedNote?.isConverted}
            onClick={() => { if (selectedNote) openConvert(selectedNote); }}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Delete">
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} note${selectedRowKeys.length > 1 ? 's' : ''}?`}
            description="This also removes any attached files."
            onConfirm={handleDelete}
            disabled={selectedRowKeys.length === 0}
            okButtonProps={{ danger: true }}
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
          <Button type="text" size="small" icon={<ReloadOutlined />} onClick={fetchNotes} />
        </Tooltip>
        <div style={{ flex: 1 }} />
        {selectedRowKeys.length > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{selectedRowKeys.length} selected</span>
        )}
      </div>

      {/* Notes grid */}
      <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {notes.length === 0 && !loading ? (
          <Empty description="No notes yet — jot something above" style={{ marginTop: 48 }} />
        ) : (
          <ProTable<ScratchNote>
            columns={columns}
            dataSource={notes}
            rowKey={(record) => record.sysId.toString()}
            loading={loading}
            search={false}
            options={false}
            tableAlertRender={false}
            pagination={false}
            toolBarRender={false}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            expandable={{
              expandedRowKeys,
              onExpandedRowsChange: (keys) => {
                setExpandedRowKeys([...keys]);
                fetchNotes();
              },
              expandedRowRender: (record) => (
                <DocumentList
                  module="tasks"
                  entityType="scratchpad"
                  entitySysId={record.sysId}
                  showUpload
                />
              ),
            }}
            onRow={(record) => ({
              onClick: () => {
                const key = record.sysId.toString();
                setSelectedRowKeys(prev =>
                  prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                );
              },
              onDoubleClick: () => openEdit(record),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </div>

      {/* Edit Note Modal */}
      <Modal
        title="Edit Note"
        open={!!editNote}
        onCancel={() => setEditNote(null)}
        onOk={handleEditSave}
        okText="Save"
        confirmLoading={savingEdit}
        width={600}
      >
        <Input.TextArea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          autoSize={{ minRows: 3, maxRows: 12 }}
        />
      </Modal>

      {/* Convert to Task Modal */}
      <TaskFormModal
        open={!!convertNote}
        onCancel={() => setConvertNote(null)}
        onSubmit={handleConvert}
        initialValues={convertNote ? {
          name: firstLine(convertNote.content),
          description: convertNote.content ? convertNote.content.replace(/\n/g, '<br>') : '',
        } : undefined}
        title="Convert Note to Task"
        submitLabel="Create Task"
        loading={converting}
        showDestination
        boards={boards}
      />
    </div>
  );
};

export default ScratchPad;
