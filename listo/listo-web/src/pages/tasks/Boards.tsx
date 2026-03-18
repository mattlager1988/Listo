import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Modal, Form, Input, Empty, message, Popconfirm, Dropdown, Tag, Space } from 'antd';
import { ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
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
import PageHeader from '../../components/PageHeader';

interface BoardSummary {
  sysId: number;
  name: string;
  color: string | null;
  taskCount: number;
  columnCount: number;
}

interface BoardColumn {
  sysId: number;
  name: string;
  sortOrder: number;
  taskCount: number;
}

interface BoardDetail {
  sysId: number;
  name: string;
  color: string | null;
  taskCount: number;
  columns: BoardColumn[];
}

// Sortable column item for drag-and-drop reordering
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

const Boards: React.FC = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardDetail | null>(null);
  const [form] = Form.useForm();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/boards');
      setBoards(res.data);
    } catch {
      message.error('Failed to load boards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreate = () => {
    setEditingBoard(null);
    setColumns([]);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = async (boardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/tasks/boards/${boardId}`);
      const board: BoardDetail = res.data;
      setEditingBoard(board);
      setColumns(board.columns);
      form.setFieldsValue({
        name: board.name,
        color: board.color || undefined,
      });
      setModalOpen(true);
    } catch {
      message.error('Failed to load board details');
    }
  };

  const handleDelete = async (boardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/tasks/boards/${boardId}`);
      message.success('Board deleted. Tasks returned to backlog.');
      fetchBoards();
    } catch {
      message.error('Failed to delete board');
    }
  };

  const handleSubmit = async (values: { name: string; color?: string | Color }) => {
    setSaving(true);
    try {
      const colorValue = values.color
        ? (typeof values.color === 'string' ? values.color : (values.color as Color).toHexString())
        : null;

      if (editingBoard) {
        await api.put(`/tasks/boards/${editingBoard.sysId}`, {
          name: values.name,
          color: colorValue,
        });
        message.success('Board updated');
      } else {
        await api.post('/tasks/boards', {
          name: values.name,
          color: colorValue,
        });
        message.success('Board created');
      }
      setModalOpen(false);
      fetchBoards();
    } catch {
      message.error('Failed to save board');
    } finally {
      setSaving(false);
    }
  };

  // Column management
  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !editingBoard) return;
    try {
      const res = await api.post(`/tasks/boards/${editingBoard.sysId}/columns`, {
        name: newColumnName.trim(),
      });
      setColumns(prev => [...prev, res.data]);
      setNewColumnName('');
    } catch {
      message.error('Failed to add column');
    }
  };

  const handleRenameColumn = async (columnId: number, name: string) => {
    if (!editingBoard) return;
    try {
      await api.put(`/tasks/boards/${editingBoard.sysId}/columns/${columnId}`, { name });
      setColumns(prev => prev.map(c => c.sysId === columnId ? { ...c, name } : c));
    } catch {
      message.error('Failed to rename column');
    }
  };

  const handleDeleteColumn = async (columnId: number) => {
    if (!editingBoard) return;
    try {
      await api.delete(`/tasks/boards/${editingBoard.sysId}/columns/${columnId}`);
      setColumns(prev => prev.filter(c => c.sysId !== columnId));
    } catch {
      message.error('Failed to delete column');
    }
  };

  const handleColumnDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !editingBoard) return;

    const oldIndex = columns.findIndex(c => c.sysId === active.id);
    const newIndex = columns.findIndex(c => c.sysId === over.id);
    const reordered = arrayMove(columns, oldIndex, newIndex);
    setColumns(reordered);

    try {
      await api.put(`/tasks/boards/${editingBoard.sysId}/columns/reorder`, {
        columnSysIds: reordered.map(c => c.sysId),
      });
    } catch {
      message.error('Failed to reorder columns');
      setColumns(columns);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
      <PageHeader
        title="Boards"
        actions={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreate}>
            New Board
          </Button>
        }
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <span>Loading...</span>
          </div>
        ) : boards.length === 0 ? (
          <Empty
            description="No boards yet"
            style={{ marginTop: 48 }}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Create Board
            </Button>
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {boards.map(board => (
              <Col key={board.sysId} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  hoverable
                  onClick={() => navigate(`/tasks/boards/${board.sysId}`)}
                  style={{
                    borderLeft: `4px solid ${board.color || '#1890ff'}`,
                    height: '100%',
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                        {board.name}
                      </div>
                      <Space size={4}>
                        <Tag>{board.taskCount} {board.taskCount === 1 ? 'task' : 'tasks'}</Tag>
                        <Tag>{board.columnCount} {board.columnCount === 1 ? 'column' : 'columns'}</Tag>
                      </Space>
                    </div>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'edit',
                            icon: <EditOutlined />,
                            label: 'Edit Board',
                            onClick: ({ domEvent }) => handleEdit(board.sysId, domEvent as React.MouseEvent),
                          },
                          {
                            key: 'delete',
                            icon: <DeleteOutlined />,
                            label: 'Delete Board',
                            danger: true,
                            onClick: ({ domEvent }) => handleDelete(board.sysId, domEvent as React.MouseEvent),
                          },
                        ],
                      }}
                      trigger={['click']}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<MoreOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Create/Edit Board Modal */}
      <Modal
        title={editingBoard ? 'Edit Board' : 'New Board'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="small"
          requiredMark={false}
          autoComplete="off"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
              <Input />
            </Form.Item>
            <Form.Item name="color" label="Color" style={{ marginBottom: 0 }}>
              <ColorPicker />
            </Form.Item>

            {/* Column management (only in edit mode) */}
            {editingBoard && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Columns</div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleColumnDragEnd}
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
                <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                  <Input
                    size="small"
                    placeholder="Add column..."
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onPressEnter={handleAddColumn}
                  />
                  <Button size="small" icon={<PlusOutlined />} onClick={handleAddColumn} />
                </Space.Compact>
              </div>
            )}

            <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {editingBoard ? 'Save' : 'Create'}
                </Button>
                <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Boards;
