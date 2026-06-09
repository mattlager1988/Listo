import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, SearchBar, CheckList, Button, Input, Switch, Toast, Space } from 'antd-mobile';
import { messagingApi, type MessagingUser } from '@shared/services/messagingApi';

const NewChat: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<MessagingUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    messagingApi.getUsers().then(setUsers).catch(() => Toast.show({ icon: 'fail', content: 'Failed to load users' }));
  }, []);

  const filtered = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  const groupMode = isGroup || selected.length > 1;

  const handleStart = async () => {
    if (selected.length === 0) {
      Toast.show({ content: 'Select at least one person' });
      return;
    }
    const ids = selected.map(Number);
    const type = groupMode ? 'group' : 'direct';
    setSubmitting(true);
    try {
      const conv = await messagingApi.createConversation(type, ids, type === 'group' ? groupName : undefined);
      navigate(`/messaging/${conv.sysId}`, { replace: true });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to start conversation' });
      setSubmitting(false);
    }
  };

  return (
    <div className="msg-fullscreen" style={{ display: 'flex', flexDirection: 'column' }}>
      <NavBar
        onBack={() => navigate('/messaging')}
        right={<a onClick={handleStart} style={{ pointerEvents: submitting ? 'none' : 'auto' }}>Start</a>}
        style={{ '--height': '48px' }}
      >
        New Chat
      </NavBar>

      <div style={{ padding: 8 }}>
        <SearchBar placeholder="Search people" value={search} onChange={setSearch} />
      </div>

      <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space align="center">
          <Switch checked={groupMode} disabled={selected.length > 1} onChange={setIsGroup} />
          <span>Group chat</span>
        </Space>
      </div>

      {groupMode && (
        <div style={{ padding: '0 12px 8px' }}>
          <Input placeholder="Group name (optional)" value={groupName} onChange={setGroupName} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <CheckList multiple value={selected} onChange={(val) => setSelected(val as string[])}>
          {filtered.map((u) => (
            <CheckList.Item key={u.sysId} value={String(u.sysId)}>
              {u.firstName} {u.lastName}
              <div style={{ fontSize: 12, color: '#999' }}>{u.email}</div>
            </CheckList.Item>
          ))}
        </CheckList>
      </div>

      <div style={{ padding: 12, paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <Button block color="primary" loading={submitting} onClick={handleStart}>Start Conversation</Button>
      </div>
    </div>
  );
};

export default NewChat;
