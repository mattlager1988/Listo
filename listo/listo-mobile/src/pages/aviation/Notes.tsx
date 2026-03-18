import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  PullToRefresh,
  List,
  Skeleton,
  ErrorBlock,
  Button,
} from 'antd-mobile';
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
                onClick={() => navigate(`/aviation/notes/${note.sysId}`)}
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
    </>
  );
};

export default Notes;
