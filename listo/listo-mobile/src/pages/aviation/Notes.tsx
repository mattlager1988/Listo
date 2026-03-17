import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  PullToRefresh,
  List,
  Skeleton,
  ErrorBlock,
  Button,
  ActionSheet,
  Dialog,
  Toast,
  Popup,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import { UnorderedListOutline } from 'antd-mobile-icons';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import { useMenu } from '../../contexts/MenuContext';

interface Note {
  sysId: number;
  subject: string;
  description: string;
  createTimestamp: string;
  modifyTimestamp: string;
}

const Notes: React.FC = () => {
  const { openMenu } = useMenu();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setError(false);
      const response = await api.get('/aviation/notes');
      setNotes(response.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleDelete = async (note: Note) => {
    setActionSheetVisible(false);
    const confirmed = await Dialog.confirm({
      content: `Delete "${note.subject}"? This cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/aviation/notes/${note.sysId}`);
      Toast.show({ icon: 'success', content: 'Note deleted' });
      fetchNotes();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete note' });
    }
  };

  const actionSheetActions: Action[] = selectedNote ? [
    {
      text: 'View',
      key: 'view',
      onClick: () => {
        setActionSheetVisible(false);
        setViewingNote(selectedNote);
      },
    },
    {
      text: 'Edit',
      key: 'edit',
      onClick: () => {
        setActionSheetVisible(false);
        navigate(`/aviation/notes/${selectedNote.sysId}/edit`);
      },
    },
    {
      text: 'Delete',
      key: 'delete',
      danger: true,
      onClick: () => handleDelete(selectedNote),
    },
  ] : [];

  if (loading) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Notes
        </NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Notes
        </NavBar>
        <ErrorBlock status="default" title="Unable to load notes" description="Pull down to retry" />
      </>
    );
  }

  return (
    <>
      <NavBar
        back={null}
        left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
        style={{ '--height': '48px' }}
      >
        Notes
      </NavBar>
      <PullToRefresh onRefresh={fetchNotes}>
        {notes.length === 0 ? (
          <ErrorBlock status="empty" title="No notes" description="Tap the button below to create your first note" />
        ) : (
          <List style={{ '--border-top': 'none' }}>
            {notes.map(note => (
              <List.Item
                key={note.sysId}
                onClick={() => {
                  setSelectedNote(note);
                  setActionSheetVisible(true);
                }}
                description={
                  <div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>
                      {dayjs(note.createTimestamp).format('MMM D, YYYY')}
                    </div>
                    {note.description && (
                      <div style={{
                        fontSize: 12,
                        color: '#8c8c8c',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '70vw',
                      }}>
                        {note.description.substring(0, 80)}
                      </div>
                    )}
                  </div>
                }
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>{note.subject}</span>
              </List.Item>
            ))}
          </List>
        )}
        <div style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }} />
      </PullToRefresh>

      {/* Fixed Add Button */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(50px + env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        padding: '8px 12px',
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        zIndex: 99,
      }}>
        <Button block color="primary" onClick={() => navigate('/aviation/notes/new')}>
          Add Note
        </Button>
      </div>

      {/* ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => { setActionSheetVisible(false); setSelectedNote(null); }}
        cancelText="Cancel"
      />

      {/* View Note Popup */}
      <Popup
        visible={!!viewingNote}
        onMaskClick={() => setViewingNote(null)}
        position="bottom"
        bodyStyle={{
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          maxHeight: 'calc(80vh - env(safe-area-inset-top))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {viewingNote && (
          <>
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
              </div>
              <div style={{
                padding: '4px 16px 12px',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>
                    {viewingNote.subject}
                  </span>
                  <span
                    onClick={() => setViewingNote(null)}
                    style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14, flexShrink: 0, marginLeft: 12 }}
                  >
                    Close
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {dayjs(viewingNote.createTimestamp).format('MMM D, YYYY')}
                  {viewingNote.modifyTimestamp !== viewingNote.createTimestamp && (
                    <> · Edited {dayjs(viewingNote.modifyTimestamp).format('MMM D, YYYY')}</>
                  )}
                </span>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {viewingNote.description.includes('<') ? (
                <div
                  className="rich-text-content"
                  style={{ fontSize: 14, color: '#333', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: viewingNote.description }}
                />
              ) : (
                <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {viewingNote.description}
                </div>
              )}
            </div>
          </>
        )}
      </Popup>
    </>
  );
};

export default Notes;
