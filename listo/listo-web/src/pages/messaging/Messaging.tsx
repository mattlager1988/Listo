import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { messagingApi, type Conversation, type MessageDto, type ReactionDto } from '../../services/messagingApi';
import { startMessagingHub, stopMessagingHub, sendTyping } from '../../services/messagingHub';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import NewChatModal from './NewChatModal';
import { conversationTitle } from './util';
import './messaging.css';

const Messaging: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.sysId ?? 0;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [typingByUser, setTypingByUser] = useState<Record<number, boolean>>({});
  const [newChatOpen, setNewChatOpen] = useState(false);

  const activeIdRef = useRef<number | null>(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Conversations deleted (hidden) by this user. Filtered out of every load so a
  // stale in-flight fetch can't re-add a just-deleted conversation. An entry is
  // cleared when the conversation legitimately reappears (new message) or is
  // explicitly reopened.
  const deletedIdsRef = useRef<Set<number>>(new Set());

  const loadConversations = useCallback(async () => {
    const data = await messagingApi.getConversations();
    const filtered = data.filter((c) => !deletedIdsRef.current.has(c.sysId));
    setConversations(filtered);
    return filtered;
  }, []);

  const appendMessage = useCallback((msg: MessageDto) => {
    setMessages((prev) => (prev.some((m) => m.sysId === msg.sysId) ? prev : [...prev, msg]));
  }, []);

  const openConversation = useCallback(async (id: number) => {
    setActiveId(id);
    setTypingByUser({});
    // Fetch the conversation directly so it opens even when it's hidden from the
    // list (e.g. a previously deleted chat being re-opened); it starts fresh,
    // showing only messages after the user's clear point.
    const [conv, msgs] = await Promise.all([
      messagingApi.getConversation(id),
      messagingApi.getMessages(id),
    ]);
    // If it was deleted while we were fetching, don't show it.
    if (deletedIdsRef.current.has(id)) return;
    setActiveConversation(conv);
    setMessages(msgs);
    const last = msgs[msgs.length - 1];
    if (last) {
      await messagingApi.markRead(id, last.sysId);
    }
    setConversations((prev) => prev.map((c) => (c.sysId === id ? { ...c, unreadCount: 0 } : c)));
  }, []);

  // SignalR wiring.
  useEffect(() => {
    let mounted = true;
    startMessagingHub({
      onMessageReceived: (msg) => {
        if (!mounted) return;
        // A new message means a previously deleted conversation should reappear.
        deletedIdsRef.current.delete(msg.conversationSysId);
        if (msg.conversationSysId === activeIdRef.current) {
          appendMessage(msg);
          messagingApi.markRead(msg.conversationSysId, msg.sysId).catch(() => {});
        }
        // Refresh list ordering + unread counts.
        loadConversations().catch(() => {});
      },
      onReactionAdded: (r: ReactionDto) => {
        if (!mounted) return;
        setMessages((prev) => prev.map((m) =>
          m.sysId === r.messageSysId && !m.reactions.some((x) => x.sysId === r.sysId)
            ? { ...m, reactions: [...m.reactions, r] }
            : m));
      },
      onReactionRemoved: (r: ReactionDto) => {
        if (!mounted) return;
        setMessages((prev) => prev.map((m) =>
          m.sysId === r.messageSysId
            ? { ...m, reactions: m.reactions.filter((x) => !(x.userSysId === r.userSysId && x.emoji === r.emoji)) }
            : m));
      },
      onReadReceiptUpdated: ({ conversationSysId, userSysId, lastReadMessageSysId }) => {
        if (!mounted) return;
        const applyReceipt = (c: Conversation): Conversation => ({
          ...c,
          participants: c.participants.map((p) =>
            p.userSysId === userSysId ? { ...p, lastReadMessageSysId } : p),
        });
        setConversations((prev) => prev.map((c) => (c.sysId === conversationSysId ? applyReceipt(c) : c)));
        setActiveConversation((ac) => (ac && ac.sysId === conversationSysId ? applyReceipt(ac) : ac));
      },
      onConversationChanged: () => {
        if (mounted) loadConversations().catch(() => {});
      },
      onTypingChanged: (conversationSysId, userSysId, isTyping) => {
        if (!mounted) return;
        if (conversationSysId === activeIdRef.current) {
          setTypingByUser((prev) => ({ ...prev, [userSysId]: isTyping }));
        }
      },
      onPresenceChanged: (userSysId, isOnline) => {
        if (!mounted) return;
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (isOnline) next.add(userSysId); else next.delete(userSysId);
          return next;
        });
      },
    }).catch(() => {});

    const init = async () => {
      try {
        await loadConversations();
      } catch {
        // ignore initial load failure
      }
    };
    init();

    return () => {
      mounted = false;
      stopMessagingHub();
    };
  }, [appendMessage, loadConversations]);


  // Always show the active conversation in the list, even if the server would
  // filter it out (e.g. a just-started chat that was previously deleted and has
  // no new messages yet). Once a message is sent it appears normally.
  const displayedConversations = useMemo(() => {
    const list = conversations.filter((c) => !deletedIdsRef.current.has(c.sysId));
    if (activeConversation
        && !deletedIdsRef.current.has(activeConversation.sysId)
        && !list.some((c) => c.sysId === activeConversation.sysId)) {
      return [activeConversation, ...list];
    }
    return list;
  }, [conversations, activeConversation]);

  const typingNames = useMemo(() => {
    if (!activeConversation) return [];
    return Object.entries(typingByUser)
      .filter(([, v]) => v)
      .map(([uid]) => activeConversation.participants.find((p) => p.userSysId === Number(uid)))
      .filter((p): p is NonNullable<typeof p> => !!p && p.userSysId !== currentUserId)
      .map((p) => p.firstName);
  }, [typingByUser, activeConversation, currentUserId]);

  const handleSend = async (body: string) => {
    if (!activeId) return;
    const msg = await messagingApi.sendMessage(activeId, body);
    appendMessage(msg);
  };

  const handleSendMedia = async (body: string, files: File[]) => {
    if (!activeId) return;
    const msg = await messagingApi.sendMedia(activeId, body, files);
    appendMessage(msg);
  };

  const handleToggleReaction = async (messageId: number, emoji: string, alreadyMine: boolean) => {
    if (alreadyMine) {
      await messagingApi.removeReaction(messageId, emoji);
      setMessages((prev) => prev.map((m) =>
        m.sysId === messageId
          ? { ...m, reactions: m.reactions.filter((x) => !(x.userSysId === currentUserId && x.emoji === emoji)) }
          : m));
    } else {
      const r = await messagingApi.addReaction(messageId, emoji);
      setMessages((prev) => prev.map((m) =>
        m.sysId === messageId && !m.reactions.some((x) => x.sysId === r.sysId)
          ? { ...m, reactions: [...m.reactions, r] }
          : m));
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (activeId) sendTyping(activeId, isTyping);
  };

  const handleDelete = async (id: number) => {
    // Optimistically hide it and guard against stale loads re-adding it.
    deletedIdsRef.current.add(id);
    // Clear the open thread if the deleted conversation is the active one
    // (use the live ref + current value to avoid stale-closure misses).
    if (activeIdRef.current === id || activeConversation?.sysId === id) {
      setActiveId(null);
      setActiveConversation(null);
      setMessages([]);
    }
    setConversations((prev) => prev.filter((c) => c.sysId !== id));
    try {
      await messagingApi.deleteConversation(id);
    } catch {
      // Revert on failure so it isn't silently lost.
      deletedIdsRef.current.delete(id);
      loadConversations().catch(() => {});
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
      <PageHeader
        title="Messaging"
        actions={
          <Tooltip title="New conversation">
            <Button type="primary" icon={<EditOutlined />} onClick={() => setNewChatOpen(true)}>New</Button>
          </Tooltip>
        }
      />
      <div className="msg-container">
        <ConversationList
          conversations={displayedConversations}
          currentUserId={currentUserId}
          activeId={activeId}
          onlineUserIds={onlineUserIds}
          onSelect={openConversation}
          onDelete={handleDelete}
        />
        <div className="msg-thread-pane">
          {activeConversation ? (
            <MessageThread
              conversation={activeConversation}
              messages={messages}
              currentUserId={currentUserId}
              title={conversationTitle(activeConversation, currentUserId)}
              typingNames={typingNames}
              onSend={handleSend}
              onSendMedia={handleSendMedia}
              onToggleReaction={handleToggleReaction}
              onTyping={handleTyping}
            />
          ) : (
            <div className="msg-empty-pane">Select a conversation or start a new one</div>
          )}
        </div>
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={async (conv) => {
          // Explicitly starting a chat un-hides it if it was previously deleted.
          deletedIdsRef.current.delete(conv.sysId);
          await loadConversations();
          openConversation(conv.sysId);
        }}
      />
    </div>
  );
};

export default Messaging;
