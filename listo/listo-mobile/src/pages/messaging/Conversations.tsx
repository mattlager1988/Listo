import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, List, PullToRefresh, Badge, ErrorBlock, Skeleton, SwipeAction, Dialog, Toast } from 'antd-mobile';
import { UnorderedListOutline, AddOutline } from 'antd-mobile-icons';
import { useAuth } from '@shared/contexts/AuthContext';
import { messagingApi, conversationTitle, lastMessagePreview, type Conversation } from '@shared/services/messagingApi';
import { useMenu } from '../../contexts/MenuContext';

const Conversations: React.FC = () => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const { user } = useAuth();
  const currentUserId = user?.sysId ?? 0;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setConversations(await messagingApi.getConversations());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    const confirmed = await Dialog.confirm({
      content: 'Delete this chat? It will be removed from your view only.',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      await messagingApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.sysId !== id));
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete' });
    }
  };

  return (
    <div className="msg-fullscreen" style={{ display: 'flex', flexDirection: 'column' }}>
      <NavBar
        back={null}
        left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
        right={<AddOutline fontSize={22} onClick={() => navigate('/messaging/new')} style={{ cursor: 'pointer' }} />}
        style={{ '--height': '48px', flexShrink: 0 }}
      >
        Messaging
      </NavBar>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton.Title animated />
            <Skeleton.Paragraph lineCount={5} animated />
          </div>
        ) : conversations.length === 0 ? (
          <ErrorBlock status="empty" title="No conversations" description="Tap + to start a new chat" />
        ) : (
          <PullToRefresh onRefresh={load}>
            <List>
              {conversations.map((conv) => {
                const title = conversationTitle(conv, currentUserId);
                return (
                  <SwipeAction
                    key={conv.sysId}
                    rightActions={[{
                      key: 'delete',
                      text: 'Delete',
                      color: 'danger',
                      onClick: () => handleDelete(conv.sysId),
                    }]}
                  >
                    <List.Item
                      onClick={() => navigate(`/messaging/${conv.sysId}`)}
                      description={lastMessagePreview(conv)}
                      extra={conv.unreadCount > 0 ? <Badge content={conv.unreadCount} /> : undefined}
                    >
                      {title}
                    </List.Item>
                  </SwipeAction>
                );
              })}
            </List>
          </PullToRefresh>
        )}
      </div>
    </div>
  );
};

export default Conversations;
