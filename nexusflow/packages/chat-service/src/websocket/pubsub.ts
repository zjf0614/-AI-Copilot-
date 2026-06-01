// Redis pub/sub bridge for cross-instance WebSocket fan-out

import Redis from 'ioredis';
import { config } from '../config.js';

type MessageHandler = (channel: string, message: string) => void;
const handlers: MessageHandler[] = [];

let subscriber: Redis | null = null;

export function onMessage(handler: MessageHandler) {
  handlers.push(handler);
}

export async function startSubscriber(workspaceId: string): Promise<void> {
  if (subscriber) return;
  subscriber = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });

  subscriber.on('message', (channel, message) => {
    for (const handler of handlers) {
      try { handler(channel, message); } catch { /* skip errors */ }
    }
  });

  try {
    await subscriber.connect();
    const channels = [
      `nexusflow:ws:message:${workspaceId}`,
      `nexusflow:ws:presence:${workspaceId}`,
      `nexusflow:ws:call:${workspaceId}`,
      `nexusflow:ws:typing:${workspaceId}`,
    ];
    await subscriber.subscribe(...channels);
  } catch {
    subscriber = null; // Redis unavailable, single-instance mode
  }
}

export async function stopSubscriber(): Promise<void> {
  if (subscriber) {
    await subscriber.quit().catch(() => {});
    subscriber = null;
  }
}

export function getChannel(workspaceId: string, eventType: string): string {
  return `nexusflow:ws:${eventType}:${workspaceId}`;
}
