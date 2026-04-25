import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { trackingSyncService, TrackingRealtimeEnvelope } from './tracking-sync.service';
import { realtimeInfra } from './realtime-infra';

class TrackingGateway {
  private io: SocketIOServer | null = null;

  private chatRoom(conversationId: string) {
    return `chat:${conversationId}`;
  }

  async initialize(server: HttpServer) {
    if (this.io) {
      return this.io;
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || process.env.CORS_ORIGIN?.split(',') || '*',
        credentials: true
      },
      path: '/socket.io'
    });

    await realtimeInfra.attachSocketAdapter(this.io);

    this.io.on('connection', (socket) => {
      socket.emit('tracking:connected', {
        socketId: socket.id,
        connectedAt: new Date().toISOString()
      });

      socket.on('tracking:join', async ({ topic }: { topic?: string }) => {
        if (!topic) {
          return;
        }

        await socket.join(topic);
        const snapshot = await trackingSyncService.getSnapshot(topic);
        if (snapshot) {
          const envelope: TrackingRealtimeEnvelope = {
            type: 'tracking:snapshot',
            topic,
            payload: snapshot,
            emittedAt: new Date().toISOString()
          };

          socket.emit('tracking:snapshot', envelope);
        }
      });

      socket.on('tracking:leave', async ({ topic }: { topic?: string }) => {
        if (!topic) {
          return;
        }

        await socket.leave(topic);
      });

      socket.on('chat:join', async ({ conversationId }: { conversationId?: string }) => {
        if (!conversationId) {
          return;
        }

        await socket.join(this.chatRoom(conversationId));
        socket.emit('chat:joined', {
          conversationId,
          room: this.chatRoom(conversationId),
          connectedAt: new Date().toISOString()
        });
      });

      socket.on('chat:leave', async ({ conversationId }: { conversationId?: string }) => {
        if (!conversationId) {
          return;
        }

        await socket.leave(this.chatRoom(conversationId));
      });

      socket.on(
        'chat:typing',
        ({ conversationId, userId, isTyping }: { conversationId?: string; userId?: string; isTyping?: boolean }) => {
          if (!conversationId || !this.io) {
            return;
          }

          this.io.to(this.chatRoom(conversationId)).emit('chat:typing', {
            conversationId,
            userId,
            isTyping: Boolean(isTyping),
            emittedAt: new Date().toISOString()
          });
        }
      );
    });

    logger.info('Tracking gateway initialized');
    return this.io;
  }

  async publish(topic: string, payload: any, type: TrackingRealtimeEnvelope['type'] = 'tracking:update') {
    await trackingSyncService.storeSnapshot(topic, payload);

    if (!this.io) {
      return;
    }

    const envelope: TrackingRealtimeEnvelope = {
      type,
      topic,
      payload,
      emittedAt: new Date().toISOString()
    };

    this.io.to(topic).emit(type, envelope);
  }

  async publishChatEvent(
    conversationId: string,
    event: 'chat:message' | 'chat:read' | 'chat:conversation',
    payload: Record<string, any>
  ) {
    if (!this.io) {
      return;
    }

    this.io.to(this.chatRoom(conversationId)).emit(event, {
      conversationId,
      payload,
      emittedAt: new Date().toISOString()
    });
  }
}

export const trackingGateway = new TrackingGateway();
