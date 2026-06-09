import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, Tooltip } from 'antd';
import { PaperClipOutlined, SendOutlined } from '@ant-design/icons';
import MessageBubble from './MessageBubble';
import type { Conversation, MessageDto } from '../../services/messagingApi';

interface Props {
  conversation: Conversation;
  messages: MessageDto[];
  currentUserId: number;
  title: string;
  typingNames: string[];
  onSend: (body: string) => void;
  onSendMedia: (body: string, files: File[]) => void;
  onToggleReaction: (messageId: number, emoji: string, alreadyMine: boolean) => void;
  onTyping: (isTyping: boolean) => void;
}

const MessageThread: React.FC<Props> = ({
  conversation, messages, currentUserId, title, typingNames,
  onSend, onSendMedia, onToggleReaction, onTyping,
}) => {
  const [draft, setDraft] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingNames]);

  const isGroup = conversation.type === 'group';

  // Read-receipt status for the most recent message I sent.
  const myMessages = messages.filter((m) => m.senderSysId === currentUserId);
  const lastMine = myMessages.length > 0 ? myMessages[myMessages.length - 1] : null;
  let receipt = '';
  if (lastMine) {
    const others = conversation.participants.filter((p) => p.userSysId !== currentUserId);
    const readBySomeone = others.some(
      (p) => p.lastReadMessageSysId != null && p.lastReadMessageSysId >= lastMine.sysId,
    );
    receipt = readBySomeone ? 'Read' : 'Delivered';
  }

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    onTyping(false);
    onSend(body);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 2500);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) onSendMedia(draft.trim(), files);
    setDraft('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="msg-thread">
      <div className="msg-thread-header">{title}</div>

      <div className="msg-thread-body">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showSender = isGroup && (!prev || prev.senderSysId !== m.senderSysId);
          return (
            <MessageBubble
              key={m.sysId}
              message={m}
              isMe={m.senderSysId === currentUserId}
              showSender={showSender}
              currentUserId={currentUserId}
              onToggleReaction={onToggleReaction}
              onOpenImage={(url) => setLightbox(url)}
            />
          );
        })}
        {receipt && <div className="msg-receipt">{receipt}</div>}
        {typingNames.length > 0 && (
          <div className="msg-typing">
            <span className="msg-typing-dots"><i /><i /><i /></span>
            {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="msg-composer">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFiles}
        />
        <Tooltip title="Attach photo or video">
          <Button type="text" icon={<PaperClipOutlined />} onClick={() => fileInputRef.current?.click()} />
        </Tooltip>
        <Input.TextArea
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          placeholder="iMessage"
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button type="primary" shape="circle" icon={<SendOutlined />} onClick={handleSend} disabled={!draft.trim()} />
      </div>

      <Modal open={!!lightbox} footer={null} onCancel={() => setLightbox(null)} width="auto" centered>
        {lightbox && <img src={lightbox} alt="" style={{ maxWidth: '80vw', maxHeight: '80vh' }} />}
      </Modal>
    </div>
  );
};

export default MessageThread;
