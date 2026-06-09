import React, { useEffect, useState } from 'react';
import { Modal, Select, Input, Switch, Space, Form, message } from 'antd';
import { messagingApi, type Conversation, type MessagingUser } from '../../services/messagingApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}

const NewChatModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [users, setUsers] = useState<MessagingUser[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setIsGroup(false);
      setGroupName('');
      messagingApi.getUsers().then(setUsers).catch(() => message.error('Failed to load users'));
    }
  }, [open]);

  const handleCreate = async () => {
    if (selected.length === 0) {
      message.warning('Select at least one person');
      return;
    }
    const type = isGroup || selected.length > 1 ? 'group' : 'direct';
    setSubmitting(true);
    try {
      const conv = await messagingApi.createConversation(type, selected, type === 'group' ? groupName : undefined);
      onCreated(conv);
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to start conversation');
    } finally {
      setSubmitting(false);
    }
  };

  const groupMode = isGroup || selected.length > 1;

  return (
    <Modal
      title="New Conversation"
      open={open}
      onCancel={onClose}
      onOk={handleCreate}
      okText="Start"
      confirmLoading={submitting}
      width={460}
    >
      <Form layout="vertical" size="small">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Form.Item label="To" style={{ marginBottom: 0 }}>
            <Select
              mode="multiple"
              value={selected}
              onChange={setSelected}
              placeholder="Select people"
              optionFilterProp="label"
              options={users.map((u) => ({
                value: u.sysId,
                label: `${u.firstName} ${u.lastName} (${u.email})`,
              }))}
            />
          </Form.Item>

          <Space>
            <Switch checked={groupMode} disabled={selected.length > 1} onChange={setIsGroup} />
            <span>Group chat</span>
          </Space>

          {groupMode && (
            <Form.Item label="Group name (optional)" style={{ marginBottom: 0 }}>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Family" />
            </Form.Item>
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default NewChatModal;
