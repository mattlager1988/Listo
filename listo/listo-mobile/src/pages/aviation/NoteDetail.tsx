import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Toast,
  Skeleton,
  ErrorBlock,
  PullToRefresh,
  ActionSheet,
  Dialog,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import dayjs from 'dayjs';
import api from '@shared/services/api';

interface Note {
  sysId: number;
  subject: string;
  description: string;
  createTimestamp: string;
  modifyTimestamp: string;
}

const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const fetchNote = useCallback(async () => {
    if (!id) return;
    setError(false);
    try {
      const response = await api.get(`/aviation/notes/${id}`);
      setNote(response.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const handleDelete = async () => {
    setActionSheetVisible(false);
    const confirmed = await Dialog.confirm({
      content: `Delete "${note?.subject}"? This cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/aviation/notes/${id}`);
      Toast.show({ icon: 'success', content: 'Note deleted' });
      navigate('/aviation/notes');
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete note' });
    }
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/aviation/notes')}>Note</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error || !note) {
    return (
      <>
        <NavBar onBack={() => navigate('/aviation/notes')}>Note</NavBar>
        <ErrorBlock status="default" title="Note not found" />
      </>
    );
  }

  const actionSheetActions: Action[] = [
    {
      text: 'Edit',
      key: 'edit',
      onClick: () => {
        setActionSheetVisible(false);
        navigate(`/aviation/notes/${note.sysId}/edit`);
      },
    },
    {
      text: 'Delete',
      key: 'delete',
      danger: true,
      onClick: handleDelete,
    },
  ];

  return (
    <>
      <PullToRefresh onRefresh={fetchNote}>
        <NavBar
          onBack={() => navigate('/aviation/notes')}
          right={
            <span
              onClick={() => setActionSheetVisible(true)}
              style={{ fontSize: 14, color: '#1890ff', cursor: 'pointer' }}
            >
              More
            </span>
          }
        >
          Note
        </NavBar>

        <div style={{ padding: 12, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header */}
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{note.subject}</div>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
              {dayjs(note.createTimestamp).format('MMM D, YYYY')}
              {note.modifyTimestamp !== note.createTimestamp && (
                <> &middot; Edited {dayjs(note.modifyTimestamp).format('MMM D, YYYY')}</>
              )}
            </span>
          </div>

          {/* Content */}
          {note.description && (
            <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
              {note.description.includes('<') ? (
                <div
                  className="rich-text-content"
                  style={{ fontSize: 14, color: '#333', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: note.description }}
                />
              ) : (
                <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {note.description}
                </div>
              )}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="Cancel"
      />
    </>
  );
};

export default NoteDetail;
