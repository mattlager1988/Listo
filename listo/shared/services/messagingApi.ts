import api from './api';
import type { MessageDto, ReactionDto } from './messagingHub';

export type { MessageDto, ReactionDto, AttachmentDto } from './messagingHub';

export interface Participant {
  userSysId: number;
  firstName: string;
  lastName: string;
  lastReadMessageSysId: number | null;
}

export interface Conversation {
  sysId: number;
  type: 'direct' | 'group';
  name: string | null;
  participants: Participant[];
  lastMessage: MessageDto | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessagingUser {
  sysId: number;
  firstName: string;
  lastName: string;
  email: string;
}

export const messagingApi = {
  async getConversations(): Promise<Conversation[]> {
    const { data } = await api.get('/messaging/conversations');
    return data;
  },

  async getConversation(id: number): Promise<Conversation> {
    const { data } = await api.get(`/messaging/conversations/${id}`);
    return data;
  },

  async createConversation(
    type: 'direct' | 'group',
    participantUserIds: number[],
    name?: string,
  ): Promise<Conversation> {
    const { data } = await api.post('/messaging/conversations', { type, name: name ?? null, participantUserIds });
    return data;
  },

  async getMessages(id: number, before?: number, take = 50): Promise<MessageDto[]> {
    const params = new URLSearchParams();
    if (before) params.set('before', String(before));
    params.set('take', String(take));
    const { data } = await api.get(`/messaging/conversations/${id}/messages?${params.toString()}`);
    return data;
  },

  async sendMessage(id: number, body: string): Promise<MessageDto> {
    const { data } = await api.post(`/messaging/conversations/${id}/messages`, { body });
    return data;
  },

  async sendMedia(id: number, body: string, files: File[]): Promise<MessageDto> {
    const formData = new FormData();
    if (body) formData.append('body', body);
    files.forEach((f) => formData.append('files', f));
    const { data } = await api.post(`/messaging/conversations/${id}/messages/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return data;
  },

  async markRead(id: number, lastReadMessageSysId: number): Promise<void> {
    await api.post(`/messaging/conversations/${id}/read`, { lastReadMessageSysId });
  },

  async addReaction(messageId: number, emoji: string): Promise<ReactionDto> {
    const { data } = await api.post(`/messaging/messages/${messageId}/reactions`, { emoji });
    return data;
  },

  async removeReaction(messageId: number, emoji: string): Promise<void> {
    await api.delete(`/messaging/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`);
  },

  async deleteConversation(id: number): Promise<void> {
    await api.delete(`/messaging/conversations/${id}`);
  },

  async getUsers(): Promise<MessagingUser[]> {
    const { data } = await api.get('/messaging/users');
    return data;
  },

  async fetchAttachmentUrl(attachmentId: number): Promise<string> {
    const { data } = await api.get(`/messaging/attachments/${attachmentId}`, { responseType: 'blob' });
    return URL.createObjectURL(data);
  },

  // Returns the attachment as a base64 data URL. Used on mobile because installed
  // iOS PWAs (WKWebView) frequently fail to render blob: URLs in <img>/<video>.
  async fetchAttachmentDataUrl(attachmentId: number): Promise<string> {
    const { data } = await api.get(`/messaging/attachments/${attachmentId}`, { responseType: 'blob' });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(data);
    });
  },
};

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
    return m.attachments[0].kind === 'video' ? '📎 Video' : '📎 Photo';
  }
  return '';
}
