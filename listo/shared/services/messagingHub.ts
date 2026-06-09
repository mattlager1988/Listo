import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

// Shared SignalR connection wrapper used by both listo-web and listo-mobile.
// Events are proxied to the API at /hubs/messaging by each app's Vite dev server.

export interface AttachmentDto {
  sysId: number;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  kind: 'image' | 'video';
}

export interface ReactionDto {
  sysId: number;
  messageSysId: number;
  userSysId: number;
  emoji: string;
}

export interface MessageDto {
  sysId: number;
  conversationSysId: number;
  senderSysId: number;
  senderName: string;
  body: string | null;
  createTimestamp: string;
  attachments: AttachmentDto[];
  reactions: ReactionDto[];
}

export interface MessagingHubHandlers {
  onMessageReceived?: (message: MessageDto) => void;
  onReactionAdded?: (reaction: ReactionDto) => void;
  onReactionRemoved?: (reaction: ReactionDto) => void;
  onReadReceiptUpdated?: (payload: { conversationSysId: number; userSysId: number; lastReadMessageSysId: number }) => void;
  onConversationChanged?: (payload: { conversationSysId: number }) => void;
  onTypingChanged?: (conversationSysId: number, userSysId: number, isTyping: boolean) => void;
  onPresenceChanged?: (userSysId: number, isOnline: boolean) => void;
}

let connection: HubConnection | null = null;

export function getConnection(): HubConnection | null {
  return connection;
}

export async function startMessagingHub(handlers: MessagingHubHandlers): Promise<HubConnection> {
  // Reuse an existing live connection.
  if (connection && connection.state === HubConnectionState.Connected) {
    return connection;
  }

  connection = new HubConnectionBuilder()
    .withUrl('/hubs/messaging', {
      accessTokenFactory: () => localStorage.getItem('accessToken') ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  if (handlers.onMessageReceived) connection.on('MessageReceived', handlers.onMessageReceived);
  if (handlers.onReactionAdded) connection.on('ReactionAdded', handlers.onReactionAdded);
  if (handlers.onReactionRemoved) connection.on('ReactionRemoved', handlers.onReactionRemoved);
  if (handlers.onReadReceiptUpdated) connection.on('ReadReceiptUpdated', handlers.onReadReceiptUpdated);
  if (handlers.onConversationChanged) connection.on('ConversationChanged', handlers.onConversationChanged);
  if (handlers.onTypingChanged) connection.on('TypingChanged', handlers.onTypingChanged);
  if (handlers.onPresenceChanged) connection.on('PresenceChanged', handlers.onPresenceChanged);

  await connection.start();
  return connection;
}

export async function stopMessagingHub(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
    } catch {
      // ignore
    }
    connection = null;
  }
}

export async function sendTyping(conversationId: number, isTyping: boolean): Promise<void> {
  if (connection && connection.state === HubConnectionState.Connected) {
    try {
      await connection.invoke('Typing', conversationId, isTyping);
    } catch {
      // ignore transient typing errors
    }
  }
}
