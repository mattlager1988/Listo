import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Space, Popconfirm, Tag, message } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../services/api';

interface BoardColumn {
  sysId: number;
  name: string;
  sortOrder: number;
  taskCount: number;
}

interface ColumnSettingsModalProps {
  open: boolean;
  onClose: () => void;
  boardId: number;
  initialColumns: BoardColumn[];
}

const SortableColumnItem: React.FC<{
  column: BoardColumn;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}> = ({ column, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(column.name);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.sysId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    if (editValue.trim() && editValue !== column.name) {
      onRename(column.sysId, editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        background: '#fafafa',
        border: '1px solid #e8e8e8',
        borderRadius: 4,
        marginBottom: 4,
      }}
    >
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#999' }}>
        <HolderOutlined />
      </span>
      {editing ? (
        <Input
          size="small"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onPressEnter={handleSave}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          style={{ flex: 1 }}
        />
      ) : (
        <span
          style={{ flex: 1, cursor: 'pointer' }}
          onDoubleClick={() => { setEditValue(column.name); setEditing(true); }}
        >
          {column.name}
        </span>
      )}
      {column.taskCount > 0 && (
        <Tag style={{ margin: 0, fontSize: 11 }}>{column.taskCount}</Tag>
      )}
      <Popconfirm
        title="Delete column?"
        description="Tasks will move to the first remaining column."
        onConfirm={() => onDelete(column.sysId)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <Button type="text" size="small" icon={<DeleteOutlined />} danger style={{ padding: '0 4px' }} />
      </Popconfirm>
    </div>
  );
};

const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = ({
  open,
  onClose,
  boardId,
  initialColumns,
}) => {
  const [columns, setColumns] = useState<BoardColumn[]>(initialColumns);
  const [newColumnName, setNewColumnName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (open) setColumns(initialColumns);
  }, [open, initialColumns]);

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    try {
      const res = await api.post(`/tasks/boards/${boardId}/columns`, {
        name: newColumnName.trim(),
      });
      setColumns(prev => [...prev, res.data]);
      setNewColumnName('');
    } catch {
      message.error('Failed to add column');
    }
  };

  const handleRenameColumn = async (columnId: number, name: string) => {
    try {
      await api.put(`/tasks/boards/${boardId}/columns/${columnId}`, { name });
      setColumns(prev => prev.map(c => c.sysId === columnId ? { ...c, name } : c));
    } catch {
      message.error('Failed to rename column');
    }
  };

  const handleDeleteColumn = async (columnId: number) => {
    try {
      await api.delete(`/tasks/boards/${boardId}/columns/${columnId}`);
      setColumns(prev => prev.filter(c => c.sysId !== columnId));
    } catch {
      message.error('Failed to delete column');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex(c => c.sysId === active.id);
    const newIndex = columns.findIndex(c => c.sysId === over.id);
    const reordered = arrayMove(columns, oldIndex, newIndex);
    setColumns(reordered);

    try {
      await api.put(`/tasks/boards/${boardId}/columns/reorder`, {
        columnSysIds: reordered.map(c => c.sysId),
      });
    } catch {
      message.error('Failed to reorder columns');
    }
  };

  return (
    <Modal
      title="Column Settings"
      open={open}
      onCancel={onClose}
      footer={
        <Button onClick={onClose}>Done</Button>
      }
      width={450}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns.map(c => c.sysId)}
          strategy={verticalListSortingStrategy}
        >
          {columns.map(column => (
            <SortableColumnItem
              key={column.sysId}
              column={column}
              onRename={handleRenameColumn}
              onDelete={handleDeleteColumn}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
        <Input
          size="small"
          placeholder="Add column..."
          value={newColumnName}
          onChange={(e) => setNewColumnName(e.target.value)}
          onPressEnter={handleAddColumn}
        />
        <Button size="small" icon={<PlusOutlined />} onClick={handleAddColumn} />
      </Space.Compact>
    </Modal>
  );
};

export default ColumnSettingsModal;
