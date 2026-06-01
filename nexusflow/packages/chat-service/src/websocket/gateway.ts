// WebSocket gateway — connection handler for real-time messaging

import type { FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { heartbeat, setTyping, publishEvent } from './presence.js';
import { startSubscriber, onMessage, getChannel } from './pubsub.js';
import type { AccessTokenPayload } from '../middleware/authenticate.js';

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  workspaceId: string;
  subscriptions: { channelIds: Set<string>; roomIds: Set<string> };
}

const clients = new Map<WebSocket, ConnectedClient>();

export async function wsGateway(socket: WebSocket, request: FastifyRequest) {
  // Authenticate via query parameter token
  const url = new URL(request.url, `http://${request.hostname}`);
  const token = url.searchParams.get('token');
  if (!token) {
    socket.send(JSON.stringify({ type: 'error', payload: { message: 'Authentication required' }, timestamp: new Date().toISOString() }));
    socket.close();
    return;
  }

  let user: AccessTokenPayload;
  try {
    user = jwt.verify(token, config.JWT_PUBLIC_KEY, { algorithms: ['RS256'], issuer: config.JWT_ISSUER }) as AccessTokenPayload;
  } catch {
    socket.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid token' }, timestamp: new Date().toISOString() }));
    socket.close();
    return;
  }

  const client: ConnectedClient = { ws: socket, userId: user.sub, workspaceId: user.workspaceId, subscriptions: { channelIds: new Set(), roomIds: new Set() } };
  clients.set(socket, client);

  // Register Redis subscriber for this workspace
  await startSubscriber(user.workspaceId);

  // Send welcome
  send(socket, 'connected', { userId: user.sub, workspaceId: user.workspaceId });

  // Heartbeat: update presence, start interval
  await heartbeat(user.workspaceId, user.sub);
  const heartbeatTimer = setInterval(() => heartbeat(user.workspaceId, user.sub), 30000);

  // Listen for Redis pub/sub messages
  const redisHandler = (channel: string, message: string) => {
    try {
      const parsed = JSON.parse(message);
      if (client.subscriptions.channelIds.has(parsed.channelId) || client.subscriptions.roomIds.has(parsed.roomId)) {
        send(socket, parsed.type, parsed.payload);
      }
    } catch { /* skip malformed messages */ }
  };
  onMessage(redisHandler);

  // Handle incoming messages
  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(client, msg);
    } catch { /* skip invalid JSON */ }
  });

  socket.on('close', () => {
    clearInterval(heartbeatTimer);
    clients.delete(socket);
    // Broadcast offline status
    publishEvent(getChannel(user.workspaceId, 'presence'), { userId: user.sub, status: 'offline' });
  });

  socket.on('error', () => { socket.close(); });
}

function handleMessage(client: ConnectedClient, msg: { type: string; payload: any }) {
  switch (msg.type) {
    case 'subscribe': {
      if (msg.payload.channelIds) msg.payload.channelIds.forEach((id: string) => client.subscriptions.channelIds.add(id));
      if (msg.payload.roomIds) msg.payload.roomIds.forEach((id: string) => client.subscriptions.roomIds.add(id));
      send(client.ws, 'subscribed', { channels: [...client.subscriptions.channelIds], rooms: [...client.subscriptions.roomIds] });
      break;
    }
    case 'unsubscribe': {
      if (msg.payload.channelIds) msg.payload.channelIds.forEach((id: string) => client.subscriptions.channelIds.delete(id));
      if (msg.payload.roomIds) msg.payload.roomIds.forEach((id: string) => client.subscriptions.roomIds.delete(id));
      send(client.ws, 'unsubscribed', {});
      break;
    }
    case 'typing.start': {
      const { scopeType, scopeId } = msg.payload;
      setTyping(client.workspaceId, scopeType, scopeId, client.userId);
      publishEvent(getChannel(client.workspaceId, 'typing'), { type: 'typing.indicator', payload: { scopeType, scopeId, userId: client.userId, isTyping: true } });
      break;
    }
    case 'typing.stop': {
      const { scopeType, scopeId } = msg.payload;
      publishEvent(getChannel(client.workspaceId, 'typing'), { type: 'typing.indicator', payload: { scopeType, scopeId, userId: client.userId, isTyping: false } });
      break;
    }
    case 'presence.heartbeat': {
      heartbeat(client.workspaceId, client.userId);
      break;
    }
  }
}

function send(ws: WebSocket, type: string, payload: Record<string, unknown>) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
  }
}

// Broadcast to all clients subscribed to a channel/room
export function broadcast(workspaceId: string, eventType: string, payload: Record<string, unknown>, scope?: { channelId?: string; roomId?: string }) {
  // Publish to Redis for cross-instance broadcast
  publishEvent(getChannel(workspaceId, eventType), { type: eventType, payload: { ...payload, ...scope } });

  // Also broadcast locally
  for (const [, client] of clients) {
    if (client.workspaceId !== workspaceId) continue;
    if (scope?.channelId && !client.subscriptions.channelIds.has(scope.channelId)) continue;
    if (scope?.roomId && !client.subscriptions.roomIds.has(scope.roomId)) continue;
    send(client.ws, eventType, payload);
  }
}
