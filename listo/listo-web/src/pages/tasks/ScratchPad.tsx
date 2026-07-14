import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Input,
  Upload,
  Tooltip,
  Popconfirm,
  Modal,
  Divider,
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
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DocumentList from '../../components/DocumentList';
import TaskFormModal from '../../components/TaskFormModal';

interface ScratchNote {
  sysId: number;
  content: string;
  attachmentCount: number;
  createTimestamp: string;
  modifyTimestamp: string;
}

interface DateGroup {
  sysId: string; // e.g. 'group-2026-07-09'
  isGroupHeader: true;
  groupLabel: string;
  children: ScratchNote[];
}

type Row = ScratchNote | DateGroup;

interface BoardSummary {
  sysId: number;
  name: string;
}

const firstLine = (content: string): string => {
  const line = content.split('\n').map(l => l.trim()).find(l => l.length > 0) || 'Untitled note';
  return line.length > 120 ? `${line.slice(0, 120)}…` : line;
};

const dateGroupLabel = (isoDate: string): string => {
  const d = dayjs(isoDate);
  const today = dayjs().startOf('day');
  if (d.isSame(today, 'day')) return `Today · ${d.format('MMM D, YYYY')}`;
  if (d.isSame(today.subtract(1, 'day'), 'day')) return `Yesterday · ${d.format('MMM D, YYYY')}`;
  return d.format('dddd · MMM D, YYYY');
};

const ScratchPad: React.FC = () => {
  const [notes, setNotes] = useState<ScratchNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<React.Key[]>([]);

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

  // Group notes by creation date (notes arrive sorted newest-first).
  const groupedNotes = useMemo<DateGroup[]>(() => {
    const groups: DateGroup[] = [];
    const byDate = new Map<string, ScratchNote[]>();
    for (const note of notes) {
      const key = dayjs(note.createTimestamp).format('YYYY-MM-DD');
      const bucket = byDate.get(key);
      if (bucket) {
        bucket.push(note);
      } else {
        byDate.set(key, [note]);
      }
    }
    for (const [key, items] of byDate) {
      groups.push({
        sysId: `group-${key}`,
        isGroupHeader: true,
        groupLabel: dateGroupLabel(key),
        children: items,
      });
    }
    return groups;
  }, [notes]);

  // Keep all date groups expanded as data changes.
  useEffect(() => {
    setExpandedGroups(groupedNotes.map(g => g.sysId));
  }, [groupedNotes]);

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
        formData.append('file', (file.originFileObj ?? file) as Blob);
        formData.append('description', file.name || 'Attachment');
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
    beforeUpload: () => false, // stage locally; upload happens on Add
    onChange: ({ fileList: fl }) => setFileList(fl),
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

  const closeEdit = () => {
    setEditNote(null);
    fetchNotes(); // refresh attachment counts after any uploads/removals
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

  const columns: ProColumns<Row>[] = [
    {
      title: 'Note',
      dataIndex: 'content',
      key: 'content',
      render: (_, record) => {
        if ('isGroupHeader' in record) {
          return (
            <span style={{ fontWeight: 600 }}>
              {record.groupLabel}{' '}
              <span style={{ color: '#8c8c8c', fontWeight: 400 }}>({record.children.length})</span>
            </span>
          );
        }
        return (
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
        );
      },
    },
    {
      title: 'Files',
      dataIndex: 'attachmentCount',
      key: 'attachmentCount',
      width: 70,
      align: 'center',
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        return record.attachmentCount > 0 ? (
          <span>
            <PaperClipOutlined /> {record.attachmentCount}
          </span>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'createTimestamp',
      key: 'createTimestamp',
      width: 180,
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        return dayjs(record.createTimestamp).format('MMM D, YYYY h:mm A');
      },
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => {
        if ('isGroupHeader' in record) return null;
        return (
          <Tooltip title="Convert to task">
            <Button
              type="text"
              size="small"
              icon={<ExportOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openConvert(record);
              }}
            />
          </Tooltip>
        );
      },
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
            disabled={selectedRowKeys.length !== 1}
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
          <ProTable<Row>
            columns={columns}
            dataSource={groupedNotes}
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
              getCheckboxProps: (record) => ({
                disabled: 'isGroupHeader' in record,
                style: 'isGroupHeader' in record ? { display: 'none' } : undefined,
              }),
            }}
            expandable={{
              expandedRowKeys: expandedGroups,
              onExpandedRowsChange: (keys) => setExpandedGroups([...keys]),
              childrenColumnName: 'children',
            }}
            onRow={(record) => ({
              onClick: () => {
                if ('isGroupHeader' in record) return;
                const key = record.sysId.toString();
                setSelectedRowKeys(prev =>
                  prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                );
              },
              onDoubleClick: () => {
                if (!('isGroupHeader' in record)) openEdit(record);
              },
              style: {
                cursor: 'isGroupHeader' in record ? 'default' : 'pointer',
                background: 'isGroupHeader' in record ? '#f5f5f5' : undefined,
                fontWeight: 'isGroupHeader' in record ? 600 : undefined,
              },
            })}
          />
        )}
      </div>

      {/* Edit Note Modal */}
      <Modal
        title="Edit Note"
        open={!!editNote}
        onCancel={closeEdit}
        onOk={handleEditSave}
        okText="Save"
        confirmLoading={savingEdit}
        width={720}
      >
        <Input.TextArea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          autoSize={{ minRows: 3, maxRows: 12 }}
        />
        {editNote && (
          <>
            <Divider style={{ margin: '16px 0 8px' }} orientation="left" orientationMargin={0}>
              Attachments
            </Divider>
            <DocumentList
              key={editNote.sysId}
              module="tasks"
              entityType="scratchpad"
              entitySysId={editNote.sysId}
              showUpload
            />
          </>
        )}
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
