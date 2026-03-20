import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  PullToRefresh,
  Card,
  Tag,
  Skeleton,
  ErrorBlock,
  Button,
} from 'antd-mobile';
import { UnorderedListOutline } from 'antd-mobile-icons';
import api from '@shared/services/api';
import type { BoardSummary } from '@shared/types';
import { useMenu } from '../../contexts/MenuContext';

const Boards: React.FC = () => {
  const { openMenu } = useMenu();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBoards = useCallback(async () => {
    try {
      setError(false);
      const response = await api.get('/tasks/boards');
      setBoards(response.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  if (loading) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Boards
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
          Boards
        </NavBar>
        <ErrorBlock status="default" title="Unable to load boards" description="Pull down to retry" />
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
        Boards
      </NavBar>
      <PullToRefresh onRefresh={fetchBoards}>
        {boards.length === 0 ? (
          <ErrorBlock status="empty" title="No boards yet" description="Tap the button below to create a board" />
        ) : (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {boards.map(board => (
              <Card
                key={board.sysId}
                onClick={() => navigate(`/tasks/boards/${board.sysId}`)}
                style={{
                  borderRadius: 8,
                  borderLeft: `4px solid ${board.color || '#1890ff'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {board.name}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Tag style={{ '--font-size': '11px' } as React.CSSProperties}>
                    {board.taskCount} {board.taskCount === 1 ? 'task' : 'tasks'}
                  </Tag>
                  <Tag style={{ '--font-size': '11px' } as React.CSSProperties}>
                    {board.columnCount} {board.columnCount === 1 ? 'column' : 'columns'}
                  </Tag>
                </div>
              </Card>
            ))}
          </div>
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
        <Button block color="primary" onClick={() => navigate('/tasks/boards/new')}>
          Add Board
        </Button>
      </div>
    </>
  );
};

export default Boards;
