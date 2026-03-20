import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  List,
  Tag,
  Button,
  Toast,
  Skeleton,
  ErrorBlock,
  ActionSheet,
  Dialog,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import api from '@shared/services/api';
import type { BoardColumn } from '@shared/types';

const ColumnSettings: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<BoardColumn | null>(null);

  const fetchColumns = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      const response = await api.get(`/tasks/boards/${id}`);
      setColumns(response.data.columns);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  const handleColumnTap = (column: BoardColumn) => {
    setSelectedColumn(column);
    setActionSheetVisible(true);
  };

  const handleRename = async () => {
    if (!selectedColumn) return;
    setActionSheetVisible(false);
    const result = await Dialog.confirm({
      title: 'Rename Column',
      content: (
        <input
          id="rename-input"
          defaultValue={selectedColumn.name}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: 16,
            border: '1px solid #e8e8e8',
            borderRadius: 6,
            outline: 'none',
            boxSizing: 'border-box',
          }}
          autoFocus
        />
      ),
    });
    if (!result) return;

    const input = document.getElementById('rename-input') as HTMLInputElement;
    const newName = input?.value?.trim();
    if (!newName || newName === selectedColumn.name) return;

    try {
      await api.put(`/tasks/boards/${id}/columns/${selectedColumn.sysId}`, { name: newName });
      Toast.show({ icon: 'success', content: 'Column renamed' });
      fetchColumns();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to rename column' });
    }
  };

  const handleDelete = async () => {
    if (!selectedColumn) return;
    setActionSheetVisible(false);
    const confirmed = await Dialog.confirm({
      content: `Delete "${selectedColumn.name}"? Tasks will move to the first remaining column.`,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/tasks/boards/${id}/columns/${selectedColumn.sysId}`);
      Toast.show({ icon: 'success', content: 'Column deleted' });
      fetchColumns();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete column' });
    }
  };

  const handleAddColumn = async () => {
    const result = await Dialog.confirm({
      title: 'Add Column',
      content: (
        <input
          id="add-column-input"
          placeholder="Column name"
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: 16,
            border: '1px solid #e8e8e8',
            borderRadius: 6,
            outline: 'none',
            boxSizing: 'border-box',
          }}
          autoFocus
        />
      ),
    });
    if (!result) return;

    const input = document.getElementById('add-column-input') as HTMLInputElement;
    const name = input?.value?.trim();
    if (!name) return;

    try {
      await api.post(`/tasks/boards/${id}/columns`, { name });
      Toast.show({ icon: 'success', content: 'Column added' });
      fetchColumns();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to add column' });
    }
  };

  const columnActions: Action[] = [
    {
      text: 'Rename',
      key: 'rename',
      onClick: handleRename,
    },
    {
      text: 'Delete',
      key: 'delete',
      danger: true,
      onClick: handleDelete,
    },
  ];

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/tasks/boards/${id}`);
    }
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={goBack}>Columns</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={3} animated />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar onBack={goBack}>Columns</NavBar>
        <ErrorBlock status="default" title="Unable to load columns" />
      </>
    );
  }

  return (
    <>
      <NavBar onBack={goBack}>Columns</NavBar>

      {columns.length === 0 ? (
        <ErrorBlock status="empty" title="No columns" description="Tap the button below to add a column" />
      ) : (
        <List style={{ '--border-top': 'none' }}>
          {columns.map(column => (
            <List.Item
              key={column.sysId}
              onClick={() => handleColumnTap(column)}
              extra={
                column.taskCount > 0 ? (
                  <Tag style={{ '--font-size': '11px' } as React.CSSProperties}>
                    {column.taskCount} {column.taskCount === 1 ? 'task' : 'tasks'}
                  </Tag>
                ) : undefined
              }
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>{column.name}</span>
            </List.Item>
          ))}
        </List>
      )}

      {/* Fixed Add Button */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px 12px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        zIndex: 99,
      }}>
        <Button block color="primary" onClick={handleAddColumn}>
          Add Column
        </Button>
      </div>

      {/* Column ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        actions={columnActions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="Cancel"
      />
    </>
  );
};

export default ColumnSettings;
