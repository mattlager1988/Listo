import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NavBar, TextArea, Button, Toast, Popover } from 'antd-mobile';
import { SmileOutline } from 'antd-mobile-icons';
import { useAuth } from '@shared/contexts/AuthContext';
import {
  messagingApi, conversationTitle, type Conversation, type MessageDto, type ReactionDto,
} from '@shared/services/messagingApi';
import { startMessagingHub, stopMessagingHub, sendTyping } from '@shared/services/messagingHub';
import MessageAttachment from './MessageAttachment';

const TAPBACKS = ['❤️', '👍', '👎', '😂', '‼️', '❓'];

const Thread: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const conversationId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.sysId ?? 0;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [draft, setDraft] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appendMessage = useCallback((msg: MessageDto) => {
    setMessages((prev) => (prev.some((m) => m.sysId === msg.sysId) ? prev : [...prev, msg]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const [conv, msgs] = await Promise.all([
          messagingApi.getConversation(conversationId),
          messagingApi.getMessages(conversationId),
        ]);
        if (!mounted) return;
        setConversation(conv);
        setMessages(msgs);
        const last = msgs[msgs.length - 1];
        if (last) messagingApi.markRead(conversationId, last.sysId).catch(() => {});
      } catch {
        Toast.show({ icon: 'fail', content: 'Failed to load conversation' });
      }
    };
    init();

    startMessagingHub({
      onMessageReceived: (msg) => {
        if (!mounted || msg.conversationSysId !== conversationId) return;
        appendMessage(msg);
        messagingApi.markRead(conversationId, msg.sysId).catch(() => {});
      },
      onReactionAdded: (r: ReactionDto) => {
        if (!mounted) return;
        setMessages((prev) => prev.map((m) =>
          m.sysId === r.messageSysId && !m.reactions.some((x) => x.sysId === r.sysId)
            ? { ...m, reactions: [...m.reactions, r] } : m));
      },
      onReactionRemoved: (r: ReactionDto) => {
        if (!mounted) return;
        setMessages((prev) => prev.map((m) =>
          m.sysId === r.messageSysId
            ? { ...m, reactions: m.reactions.filter((x) => !(x.userSysId === r.userSysId && x.emoji === r.emoji)) } : m));
      },
      onTypingChanged: (convId, userSysId, isTyping) => {
        if (mounted && convId === conversationId) setTypingUsers((prev) => ({ ...prev, [userSysId]: isTyping }));
      },
    }).catch(() => {});

    return () => {
      mounted = false;
      stopMessagingHub();
    };
  }, [conversationId, appendMessage]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    sendTyping(conversationId, false);
    try {
      appendMessage(await messagingApi.sendMessage(conversationId, body));
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to send' });
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    sendTyping(conversationId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(conversationId, false), 2500);
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;
    Toast.show({ icon: 'loading', content: 'Uploading…', duration: 0 });
    try {
      appendMessage(await messagingApi.sendMedia(conversationId, draft.trim(), files));
      setDraft('');
      Toast.clear();
    } catch {
      Toast.clear();
      Toast.show({ icon: 'fail', content: 'Upload failed' });
    }
  };

  const toggleReaction = async (message: MessageDto, emoji: string) => {
    const mine = message.reactions.some((r) => r.userSysId === currentUserId && r.emoji === emoji);
    try {
      if (mine) {
        await messagingApi.removeReaction(message.sysId, emoji);
        setMessages((prev) => prev.map((m) => m.sysId === message.sysId
          ? { ...m, reactions: m.reactions.filter((x) => !(x.userSysId === currentUserId && x.emoji === emoji)) } : m));
      } else {
        const r = await messagingApi.addReaction(message.sysId, emoji);
        setMessages((prev) => prev.map((m) => m.sysId === message.sysId && !m.reactions.some((x) => x.sysId === r.sysId)
          ? { ...m, reactions: [...m.reactions, r] } : m));
      }
    } catch {
      Toast.show({ icon: 'fail', content: 'Reaction failed' });
    }
  };

  const isGroup = conversation?.type === 'group';
  const typingNames = conversation
    ? Object.entries(typingUsers).filter(([, v]) => v)
        .map(([uid]) => conversation.participants.find((p) => p.userSysId === Number(uid)))
        .filter((p): p is NonNullable<typeof p> => !!p && p.userSysId !== currentUserId)
        .map((p) => p.firstName)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      <NavBar onBack={() => navigate('/messaging')} style={{ '--height': '48px', flexShrink: 0 }}>
        {conversation ? conversationTitle(conversation, currentUserId) : 'Conversation'}
      </NavBar>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '12px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.map((m, i) => {
          const isMe = m.senderSysId === currentUserId;
          const prev = messages[i - 1];
          const showSender = isGroup && !isMe && (!prev || prev.senderSysId !== m.senderSysId);
          const grouped = new Map<string, number>();
          m.reactions.forEach((r) => grouped.set(r.emoji, (grouped.get(r.emoji) ?? 0) + 1));
          return (
            <div key={m.sysId} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginTop: 4 }}>
              {showSender && <div style={{ fontSize: 11, color: '#999', margin: '4px 0 2px 8px' }}>{m.senderName}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isMe ? 'row' : 'row-reverse', maxWidth: '80%', minWidth: 0 }}>
                <Popover.Menu
                  mode="dark"
                  actions={TAPBACKS.map((emoji) => ({ key: emoji, text: <span style={{ fontSize: 20 }} onClick={() => toggleReaction(m, emoji)}>{emoji}</span> }))}
                  trigger="click"
                  placement={isMe ? 'left' : 'right'}
                >
                  <span style={{ color: '#bbb', cursor: 'pointer', padding: 2 }}><SmileOutline fontSize={16} /></span>
                </Popover.Menu>
                <div style={{
                  position: 'relative',
                  padding: '7px 12px',
                  borderRadius: 18,
                  fontSize: 15,
                  lineHeight: 1.35,
                  maxWidth: '100%',
                  minWidth: 0,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap',
                  background: isMe ? '#0b93f6' : '#e9e9eb',
                  color: isMe ? '#fff' : '#000',
                  borderBottomRightRadius: isMe ? 4 : 18,
                  borderBottomLeftRadius: isMe ? 18 : 4,
                }}>
                  {m.attachments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: m.body ? 4 : 0 }}>
                      {m.attachments.map((a) => <MessageAttachment key={a.sysId} attachment={a} />)}
                    </div>
                  )}
                  {m.body}
                  {grouped.size > 0 && (
                    <div style={{ position: 'absolute', bottom: -12, [isMe ? 'right' : 'left']: 8, display: 'flex', gap: 2 } as React.CSSProperties}>
                      {[...grouped.entries()].map(([emoji, count]) => (
                        <span key={emoji} onClick={() => toggleReaction(m, emoji)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0 6px', fontSize: 12, lineHeight: '18px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                          {emoji}{count > 1 ? ` ${count}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {typingNames.length > 0 && (
          <div style={{ fontSize: 12, color: '#999', margin: '6px 0 0 8px' }}>
            {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '8px 12px', borderTop: '1px solid #eee', background: '#fff', flexShrink: 0, width: '100%', boxSizing: 'border-box', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
        <Button size="small" fill="none" onClick={() => fileInputRef.current?.click()} style={{ padding: '0 4px' }}>📎</Button>
        <div style={{ flex: 1 }}>
          <TextArea
            value={draft}
            onChange={handleDraftChange}
            placeholder="iMessage"
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ background: '#f5f5f5', borderRadius: 16, padding: '6px 12px' }}
          />
        </div>
        <Button size="small" color="primary" shape="rounded" onClick={handleSend} disabled={!draft.trim()}>Send</Button>
      </div>
    </div>
  );
};

export default Thread;
