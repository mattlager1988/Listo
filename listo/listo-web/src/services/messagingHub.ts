import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

// SignalR connection wrapper for listo-web. Events are proxied to the API at
// /hubs/messaging by the Vite dev server (see vite.config.ts).

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
  // Tear down any previous connection so the handlers below are always the live ones.
  await stopMessagingHub();

  const conn = new HubConnectionBuilder()
    .withUrl('/hubs/messaging', {
      accessTokenFactory: () => localStorage.getItem('accessToken') ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  if (handlers.onMessageReceived) conn.on('MessageReceived', handlers.onMessageReceived);
  if (handlers.onReactionAdded) conn.on('ReactionAdded', handlers.onReactionAdded);
  if (handlers.onReactionRemoved) conn.on('ReactionRemoved', handlers.onReactionRemoved);
  if (handlers.onReadReceiptUpdated) conn.on('ReadReceiptUpdated', handlers.onReadReceiptUpdated);
  if (handlers.onConversationChanged) conn.on('ConversationChanged', handlers.onConversationChanged);
  if (handlers.onTypingChanged) conn.on('TypingChanged', handlers.onTypingChanged);
  if (handlers.onPresenceChanged) conn.on('PresenceChanged', handlers.onPresenceChanged);

  conn.onreconnecting((err) => console.warn('[messaging] reconnecting', err));
  conn.onreconnected(() => console.info('[messaging] reconnected'));
  conn.onclose((err) => { if (err) console.warn('[messaging] connection closed', err); });

  connection = conn;
  try {
    await conn.start();
  } catch (err) {
    console.error('[messaging] hub failed to connect (real-time disabled):', err);
  }
  return conn;
}

export async function stopMessagingHub(): Promise<void> {
  const old = connection;
  connection = null; // null first so a concurrent start() doesn't get clobbered
  if (old) {
    try {
      await old.stop();
    } catch {
      // ignore
    }
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
