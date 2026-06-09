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

  async updateGroup(
    id: number,
    payload: { name?: string; addUserIds?: number[]; removeUserIds?: number[] },
  ): Promise<Conversation> {
    const { data } = await api.put(`/messaging/conversations/${id}`, payload);
    return data;
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
};
