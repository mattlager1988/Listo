import type { Conversation } from '../../services/messagingApi';

export function conversationTitle(conv: Conversation, currentUserId: number): string {
  if (conv.type === 'group') {
    if (conv.name) return conv.name;
    const others = conv.participants.filter((p) => p.userSysId !== currentUserId);
    return others.map((p) => p.firstName).join(', ') || 'Group';
  }
  const other = conv.participants.find((p) => p.userSysId !== currentUserId);
  return other ? `${other.firstName} ${other.lastName}`.trim() : 'Conversation';
}

export function lastMessagePreview(conv: Conversation): string {
  const m = conv.lastMessage;
  if (!m) return 'No messages yet';
  if (m.body) return m.body;
  if (m.attachments.length > 0) {
    const kind = m.attachments[0].kind === 'video' ? 'Video' : 'Photo';
    return `📎 ${kind}`;
  }
  return '';
}
