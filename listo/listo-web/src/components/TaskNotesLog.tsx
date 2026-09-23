import React, { useCallback, useEffect, useState } from 'react';
import { Input, Button, Space, Empty, Spin, message } from 'antd';
import dayjs from 'dayjs';
import api from '../services/api';

// An append-only, timestamped note logged against a task.
interface TaskNote {
  sysId: number;
  taskItemSysId: number;
  content: string;
  createTimestamp: string;
  createUser?: number;
  authorName?: string | null;
}

interface TaskNotesLogProps {
  taskSysId: number;
}

const TaskNotesLog: React.FC<TaskNotesLogProps> = ({ taskSysId }) => {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tasks/items/${taskSysId}/notes`);
      setNotes(res.data);
    } catch {
      message.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [taskSysId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAdd = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/tasks/items/${taskSysId}/notes`, { content: trimmed });
      setNotes((prev) => [res.data, ...prev]);
      setContent('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Space.Compact style={{ width: '100%' }}>
        <Input.TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            // Enter adds the note; Shift+Enter inserts a newline.
            if (!e.shiftKey) {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="primary" onClick={handleAdd} loading={submitting} disabled={!content.trim()}>
          Add Note
        </Button>
      </Space.Compact>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <Spin size="small" />
        </div>
      ) : notes.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notes yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflow: 'auto' }}>
          {notes.map((note) => (
            <div
              key={note.sysId}
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: '6px 10px',
                background: '#fafafa',
              }}
            >
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>
                {dayjs(note.createTimestamp).format('MMM D, YYYY h:mm A')}
                {note.authorName ? ` · ${note.authorName}` : ''}
              </div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {note.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskNotesLog;
