import React from 'react';
import { Popover } from 'antd';
import { SmileOutlined } from '@ant-design/icons';
import AttachmentView from './AttachmentView';
import type { MessageDto } from '../../services/messagingApi';

const TAPBACKS = ['❤️', '👍', '👎', '😂', '‼️', '❓'];

interface Props {
  message: MessageDto;
  isMe: boolean;
  showSender: boolean;
  currentUserId: number;
  onToggleReaction: (messageId: number, emoji: string, alreadyMine: boolean) => void;
  onOpenImage: (url: string) => void;
}

const MessageBubble: React.FC<Props> = ({ message, isMe, showSender, currentUserId, onToggleReaction, onOpenImage }) => {
  // Group reactions by emoji with counts and whether the current user reacted.
  const grouped = new Map<string, { count: number; mine: boolean }>();
  for (const r of message.reactions) {
    const entry = grouped.get(r.emoji) ?? { count: 0, mine: false };
    entry.count += 1;
    if (r.userSysId === currentUserId) entry.mine = true;
    grouped.set(r.emoji, entry);
  }

  const time = new Date(message.createTimestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const picker = (
    <div className="msg-tapback-picker">
      {TAPBACKS.map((emoji) => {
        const mine = grouped.get(emoji)?.mine ?? false;
        return (
          <button
            key={emoji}
            className={`msg-tapback-option${mine ? ' selected' : ''}`}
            onClick={() => onToggleReaction(message.sysId, emoji, mine)}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={`msg-bubble-row ${isMe ? 'me' : 'them'}`}
      style={grouped.size > 0 ? { marginBottom: 14 } : undefined}
    >
      {showSender && !isMe && <div className="msg-sender">{message.senderName}</div>}
      <div className="msg-bubble-wrap">
        <div className={`msg-bubble ${isMe ? 'me' : 'them'}`} title={time}>
          {message.attachments.length > 0 && (
            <div className="msg-attachments">
              {message.attachments.map((a) => (
                <AttachmentView key={a.sysId} attachment={a} onOpen={(url) => onOpenImage(url)} />
              ))}
            </div>
          )}
          {message.body && <span className="msg-text">{message.body}</span>}
          {grouped.size > 0 && (
            <div className={`msg-reactions ${isMe ? 'me' : 'them'}`}>
              {[...grouped.entries()].map(([emoji, { count, mine }]) => (
                <span
                  key={emoji}
                  className={`msg-reaction-chip${mine ? ' mine' : ''}`}
                  onClick={() => onToggleReaction(message.sysId, emoji, mine)}
                >
                  {emoji}{count > 1 ? ` ${count}` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
        <Popover content={picker} trigger="click" placement={isMe ? 'left' : 'right'}>
          <button className="msg-react-btn" aria-label="React">
            <SmileOutlined />
          </button>
        </Popover>
      </div>
    </div>
  );
};

export default MessageBubble;
