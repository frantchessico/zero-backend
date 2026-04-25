export interface TrackingRealtimeEnvelope<TPayload = Record<string, any>> {
  type: 'tracking:snapshot' | 'tracking:update';
  topic: string;
  payload: TPayload;
  emittedAt: string;
}

export interface TrackingSyncAdapter<TPayload = any> {
  get(topic: string): Promise<TPayload | null>;
  set(topic: string, payload: TPayload): Promise<void>;
}

import { realtimeInfra } from './realtime-infra';

class InMemoryTrackingSyncAdapter<TPayload = any> implements TrackingSyncAdapter<TPayload> {
  private readonly snapshots = new Map<string, TPayload>();

  async get(topic: string): Promise<TPayload | null> {
    return this.snapshots.get(topic) || null;
  }

  async set(topic: string, payload: TPayload): Promise<void> {
    this.snapshots.set(topic, payload);
  }
}

class RedisTrackingSyncAdapter<TPayload = any> implements TrackingSyncAdapter<TPayload> {
  private readonly keyPrefix = 'zero:tracking:snapshot:';

  async get(topic: string): Promise<TPayload | null> {
    const client = await realtimeInfra.getSnapshotClient();
    if (!client) {
      return null;
    }

    const payload = await client.get(`${this.keyPrefix}${topic}`);
    return payload ? (JSON.parse(payload) as TPayload) : null;
  }

  async set(topic: string, payload: TPayload): Promise<void> {
    const client = await realtimeInfra.getSnapshotClient();
    if (!client) {
      return;
    }

    await client.set(`${this.keyPrefix}${topic}`, JSON.stringify(payload), {
      EX: 60 * 60
    });
  }
}

class TrackingSyncService<TPayload = any> {
  private readonly memoryAdapter: TrackingSyncAdapter<TPayload>;
  private readonly redisAdapter: TrackingSyncAdapter<TPayload>;

  constructor() {
    this.memoryAdapter = new InMemoryTrackingSyncAdapter<TPayload>();
    this.redisAdapter = new RedisTrackingSyncAdapter<TPayload>();
  }

  async getSnapshot(topic: string): Promise<TPayload | null> {
    const redisSnapshot = await this.redisAdapter.get(topic);
    if (redisSnapshot) {
      return redisSnapshot;
    }

    return this.memoryAdapter.get(topic);
  }

  async storeSnapshot(topic: string, payload: TPayload): Promise<void> {
    await this.memoryAdapter.set(topic, payload);
    await this.redisAdapter.set(topic, payload);
  }
}

export const trackingSyncService = new TrackingSyncService<any>();
