import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';
import type { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

class RealtimeInfra {
  private snapshotClient: RedisClientType | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;
  private socketAdapterReady = false;

  private get redisUrl() {
    return process.env.REDIS_URL || '';
  }

  private get redisEnabled() {
    return !!this.redisUrl && process.env.NODE_ENV !== 'test';
  }

  async getSnapshotClient(): Promise<RedisClientType | null> {
    if (!this.redisEnabled) {
      return null;
    }

    if (this.snapshotClient) {
      return this.snapshotClient;
    }

    try {
      this.snapshotClient = createClient({ url: this.redisUrl });
      this.snapshotClient.on('error', (error) => {
        logger.warn(`Redis snapshot client error: ${error.message}`);
      });
      await this.snapshotClient.connect();
      logger.info('Redis snapshot client connected');
      return this.snapshotClient;
    } catch (error: any) {
      logger.warn(`Redis snapshot client unavailable, using memory fallback: ${error.message}`);
      this.snapshotClient = null;
      return null;
    }
  }

  async attachSocketAdapter(io: SocketIOServer): Promise<boolean> {
    if (!this.redisEnabled) {
      return false;
    }

    if (this.socketAdapterReady && this.pubClient && this.subClient) {
      return true;
    }

    try {
      this.pubClient = createClient({ url: this.redisUrl });
      this.subClient = this.pubClient.duplicate();

      this.pubClient.on('error', (error) => {
        logger.warn(`Redis pub client error: ${error.message}`);
      });
      this.subClient.on('error', (error) => {
        logger.warn(`Redis sub client error: ${error.message}`);
      });

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      io.adapter(createAdapter(this.pubClient, this.subClient));
      this.socketAdapterReady = true;
      logger.info('Socket.IO Redis adapter connected');
      return true;
    } catch (error: any) {
      logger.warn(`Socket.IO Redis adapter unavailable, using in-memory adapter: ${error.message}`);
      this.socketAdapterReady = false;
      this.pubClient = null;
      this.subClient = null;
      return false;
    }
  }
}

export const realtimeInfra = new RealtimeInfra();
