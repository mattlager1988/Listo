import React from 'react';
import { Badge, Popconfirm, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { Conversation } from '../../services/messagingApi';
import { conversationTitle, lastMessagePreview } from './util';

interface Props {
  conversations: Conversation[];
  currentUserId: number;
  activeId: number | null;
  onlineUserIds: Set<number>;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}

const ConversationList: React.FC<Props> = ({ conversations, currentUserId, activeId, onlineUserIds, onSelect, onDelete }) => {
  return (
    <div className="msg-conv-list">
      {conversations.length === 0 && (
        <div className="msg-conv-empty">No conversations yet</div>
      )}
      {conversations.map((conv) => {
        const title = conversationTitle(conv, currentUserId);
        const initials = title.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
        const other = conv.participants.find((p) => p.userSysId !== currentUserId);
        const photo = conv.type === 'direct' ? other?.profilePhoto : null;
        const otherOnline = conv.type === 'direct'
          && conv.participants.some((p) => p.userSysId !== currentUserId && onlineUserIds.has(p.userSysId));
        return (
          <div
            key={conv.sysId}
            className={`msg-conv-item${activeId === conv.sysId ? ' active' : ''}`}
            onClick={() => onSelect(conv.sysId)}
          >
            <Badge dot={otherOnline} color="green" offset={[-4, 34]}>
              {photo ? (
                <img className="msg-conv-avatar msg-conv-avatar-img" src={photo} alt={title} />
              ) : (
                <div className="msg-conv-avatar">{initials}</div>
              )}
            </Badge>
            <div className="msg-conv-main">
              <div className="msg-conv-title">{title}</div>
              <div className="msg-conv-preview">{lastMessagePreview(conv)}</div>
            </div>
            {conv.unreadCount > 0 && <Badge count={conv.unreadCount} />}
            <Popconfirm
              title="Delete this chat?"
              description="It will be removed from your view only."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(conv.sysId)}
            >
              <Tooltip title="Delete chat">
                <DeleteOutlined
                  className="msg-conv-delete"
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Popconfirm>
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
