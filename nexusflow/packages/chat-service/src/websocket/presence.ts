// Redis-backed presence tracking

import Redis from 'ioredis';
import { config } from '../config.js';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    redis.connect().catch(() => { redis = null; });
  }
  return redis;
}

const PRESENCE_PREFIX = 'presence';
const TYPING_PREFIX = 'typing';
const PRESENCE_TTL = 120;
const TYPING_TTL = 10;

export interface PresenceData {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastHeartbeat: string;
  deviceCount: number;
}

export async function heartbeat(workspaceId: string, userId: string): Promise<void> {
  const r = getRedis();
  const key = `${PRESENCE_PREFIX}:${workspaceId}:${userId}`;
  const data: PresenceData = { userId, status: 'online', lastHeartbeat: new Date().toISOString(), deviceCount: 1 };
  await r.setex(key, PRESENCE_TTL, JSON.stringify(data));
}

export async function getPresence(workspaceId: string, userId: string): Promise<PresenceData | null> {
  const r = getRedis();
  const data = await r.get(`${PRESENCE_PREFIX}:${workspaceId}:${userId}`);
  return data ? JSON.parse(data) : null;
}

export async function getWorkspacePresence(workspaceId: string): Promise<PresenceData[]> {
  const r = getRedis();
  const keys = await r.keys(`${PRESENCE_PREFIX}:${workspaceId}:*`);
  if (keys.length === 0) return [];
  const data = await r.mget(keys);
  return data.filter(Boolean).map(d => JSON.parse(d!));
}

export async function setTyping(workspaceId: string, scopeType: string, scopeId: string, userId: string): Promise<void> {
  const r = getRedis();
  const key = `${TYPING_PREFIX}:${workspaceId}:${scopeType}:${scopeId}:${userId}`;
  await r.setex(key, TYPING_TTL, '1');
}

export async function getTypingUsers(workspaceId: string, scopeType: string, scopeId: string): Promise<string[]> {
  const r = getRedis();
  const keys = await r.keys(`${TYPING_PREFIX}:${workspaceId}:${scopeType}:${scopeId}:*`);
  return keys.map(k => k.split(':').pop()!).filter(Boolean);
}

// Publish events to Redis for cross-instance broadcasting
export async function publishEvent(channel: string, message: object): Promise<void> {
  try {
    const r = getRedis();
    await r.publish(channel, JSON.stringify(message));
  } catch { /* Redis unavailable, event stays local */ }
}
