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

export function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDayLabel(ts: string): string {
  const d = new Date(ts);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (d.toDateString() === today) return 'Today';
  if (d.toDateString() === yesterday) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Centered date/time separator shown at the start of a conversation, on a new
// day, or after a gap (>30 min) since the previous message.
export function timeSeparator(ts: string): string {
  return `${formatDayLabel(ts)} · ${formatTime(ts)}`;
}

export function shouldShowSeparator(prevTs: string | undefined, ts: string): boolean {
  if (!prevTs) return true;
  if (new Date(prevTs).toDateString() !== new Date(ts).toDateString()) return true;
  return new Date(ts).getTime() - new Date(prevTs).getTime() > 30 * 60 * 1000;
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
