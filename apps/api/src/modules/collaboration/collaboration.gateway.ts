import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpAdapterHost } from '@nestjs/core';

const CollabMessageType = { SYNC: 0, AWARENESS: 1, AUTH: 2 } as const;

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import { YjsPersistenceService } from './yjs-persistence.service';
import { VersionsService } from '../versions/versions.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Injectable } from '@nestjs/common';

/** Debounce delay before persisting Yjs state after last update (ms) */
const PERSIST_DEBOUNCE_MS = 5_000;

/** How long to keep an empty room alive before cleanup (ms) */
const ROOM_CLEANUP_DELAY_MS = 30_000;

interface ClientMeta {
  userId: string;
  email: string;
  documentId: string;
}

interface Room {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Map<WebSocket, ClientMeta>;
  persistTimer: ReturnType<typeof setTimeout> | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

@Injectable()
export class CollaborationGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollaborationGateway.name);
  private readonly rooms = new Map<string, Room>();
  private wss!: WebSocketServer;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly persistence: YjsPersistenceService,
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly versionsService: VersionsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Attach raw ws.Server to the NestJS HTTP server on startup
  // ---------------------------------------------------------------------------

  onModuleInit() {
    const httpServer: HttpServer =
      this.httpAdapterHost.httpAdapter.getHttpServer();

    // Create a ws.Server with noServer so we control the upgrade ourselves
    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (req, socket, head) => {
      // Accept all upgrade requests — y-websocket sends
      // ws://host/{documentId} ̰?token=xxx&documentId=xxx
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.handleConnection(ws, req);
      });
    });

    this.logger.log('WebSocket server attached to HTTP server');
  }

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  private async handleConnection(
    client: WebSocket,
    req: IncomingMessage,
  ): Promise<void> {
    try {
      // y-websocket URL: ws://host/{roomname}?token=xxx&documentId=xxx
      const url = new URL(req.url ?? '', 'http://localhost');
      const token = url.searchParams.get('token');
      const documentId =
        url.pathname.replace(/^\/+/, '') || url.searchParams.get('documentId');

      if (!token || !documentId) {
        this.logger.warn('WS rejected: missing token or documentId');
        client.close(4001, 'Missing token or documentId');
        return;
      }

      // Validate JWT
      let payload: JwtPayload;
      try {
        payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
      } catch {
        this.logger.warn('WS rejected: invalid JWT');
        client.close(4003, 'Invalid token');
        return;
      }

      const meta: ClientMeta = {
        userId: payload.sub,
        email: payload.email,
        documentId,
      };

      // Get or create room
      const room = await this.getOrCreateRoom(documentId);

      // Cancel room cleanup if it was scheduled
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
        room.cleanupTimer = null;
      }

      // Register client in room
      room.clients.set(client, meta);

      this.logger.log(
        `Client connected: user=${payload.sub} doc=${documentId} (${room.clients.size} in room)`,
      );

      // Send sync step 1
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, CollabMessageType.SYNC);
      syncProtocol.writeSyncStep1(encoder, room.ydoc);
      this.sendBinary(client, encoding.toUint8Array(encoder));

      // Send current awareness state to the new client
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, CollabMessageType.AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(room.awareness.getStates().keys()),
        ),
      );
      this.sendBinary(client, encoding.toUint8Array(awarenessEncoder));

      // Listen for binary messages from this client
      client.on('message', (data: ArrayBuffer | Buffer) => {
        this.handleMessage(client, room, data);
      });

      // Handle close
      client.on('close', () => {
        this.handleDisconnect(client);
      });
    } catch (err) {
      this.logger.error('Error during WS connection', err);
      client.close(4500, 'Internal error');
    }
  }

  private handleDisconnect(client: WebSocket): void {
    for (const [documentId, room] of this.rooms.entries()) {
      if (!room.clients.has(client)) continue;

      const meta = room.clients.get(client);
      room.clients.delete(client);

      this.logger.log(
        `Client disconnected: user=${meta?.userId} doc=${documentId} (${room.clients.size} remaining)`,
      );

      // If room is empty, schedule cleanup + final persistence
      if (room.clients.size === 0) {
        this.schedulePersist(documentId, room);
        room.cleanupTimer = setTimeout(() => {
          this.destroyRoom(documentId);
        }, ROOM_CLEANUP_DELAY_MS);
      }

      break;
    }
  }

  onModuleDestroy(): void {
    // Persist all rooms on shutdown
    for (const [documentId, room] of this.rooms.entries()) {
      if (room.persistTimer) clearTimeout(room.persistTimer);
      if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
      const state = Y.encodeStateAsUpdate(room.ydoc);
      void this.persistence.saveDocument(documentId, state);
      room.ydoc.destroy();
    }
    this.rooms.clear();
    this.wss?.close();
    this.logger.log('All rooms persisted and cleaned up on shutdown');
  }

  // ---------------------------------------------------------------------------
  // Message handling
  // ---------------------------------------------------------------------------

  private handleMessage(
    client: WebSocket,
    room: Room,
    rawData: ArrayBuffer | Buffer,
  ): void {
    try {
      const data = new Uint8Array(
        rawData instanceof ArrayBuffer
          ? rawData
          : rawData.buffer.slice(
              rawData.byteOffset,
              rawData.byteOffset + rawData.byteLength,
            ),
      );
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case CollabMessageType.SYNC:
          this.handleSyncMessage(client, room, decoder);
          break;

        case CollabMessageType.AWARENESS:
          this.handleAwarenessMessage(client, room, decoder);
          break;

        default:
          this.logger.warn(`Unknown message type: ${messageType}`);
      }
    } catch (err) {
      this.logger.error('Error handling WS message', err);
    }
  }

  private handleSyncMessage(
    client: WebSocket,
    room: Room,
    decoder: decoding.Decoder,
  ): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, CollabMessageType.SYNC);

    const syncMessageType = syncProtocol.readSyncMessage(
      decoder,
      encoder,
      room.ydoc,
      null,
    );

    // If we wrote a response (sync step 2 or update), send it back
    if (encoding.length(encoder) > 1) {
      this.sendBinary(client, encoding.toUint8Array(encoder));
    }

    // Broadcast is handled by ydoc.on('update') in getOrCreateRoom.
    // Only schedule persistence here.
    const documentId = room.clients.get(client)?.documentId;
    if (documentId && syncMessageType === syncProtocol.messageYjsUpdate) {
      this.schedulePersist(documentId, room);
    }
  }

  private handleAwarenessMessage(
    _client: WebSocket,
    room: Room,
    decoder: decoding.Decoder,
  ): void {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(room.awareness, update, null);
  }

  // ---------------------------------------------------------------------------
  // Room management
  // ---------------------------------------------------------------------------

  private async getOrCreateRoom(documentId: string): Promise<Room> {
    const existing = this.rooms.get(documentId);
    if (existing) return existing;

    const ydoc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(ydoc);

    // Load persisted state
    const savedState = await this.persistence.loadDocument(documentId);
    if (savedState) {
      Y.applyUpdate(ydoc, savedState);
    }

    const room: Room = {
      ydoc,
      awareness,
      clients: new Map(),
      persistTimer: null,
      cleanupTimer: null,
    };

    // Broadcast updates to all clients
    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, CollabMessageType.SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      for (const [ws] of room.clients) {
        if (ws !== origin) {
          this.sendBinary(ws, message);
        }
      }
    });

    // Broadcast awareness changes
    awareness.on(
      'update',
      ({
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      }) => {
        const changedClients = [...added, ...updated, ...removed];
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, CollabMessageType.AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
        );
        const message = encoding.toUint8Array(encoder);

        for (const [ws] of room.clients) {
          this.sendBinary(ws, message);
        }
      },
    );

    this.rooms.set(documentId, room);
    this.logger.log(`Room created for document ${documentId}`);

    return room;
  }

  private destroyRoom(documentId: string): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    if (room.persistTimer) clearTimeout(room.persistTimer);
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.ydoc.destroy();
    this.rooms.delete(documentId);
    this.logger.log(`Room destroyed for document ${documentId}`);
  }

  /**
   * Called after a version restore to force all clients to reconnect.
   * Destroys the in-memory room so the old Y.Doc doesn't persist over
   * the restored state. Clients auto-reconnect via y-websocket.
   */
  resetRoom(documentId: string): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    this.logger.log(
      `Resetting room for document ${documentId} (${room.clients.size} clients)`,
    );

    // Cancel any pending persistence — we don't want to overwrite the restored state
    if (room.persistTimer) clearTimeout(room.persistTimer);
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);

    // Disconnect all clients — y-websocket will auto-reconnect them
    for (const [ws] of room.clients) {
      ws.close(4200, 'Document restored to previous version');
    }

    room.ydoc.destroy();
    this.rooms.delete(documentId);
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private schedulePersist(documentId: string, room: Room): void {
    if (room.persistTimer) clearTimeout(room.persistTimer);
    room.persistTimer = setTimeout(() => {
      const state = Y.encodeStateAsUpdate(room.ydoc);
      void this.persistence.saveDocument(documentId, state);

      // Trigger version snapshot — find the last editor in the room
      const lastEditorUserId = this.getLastEditorUserId(room);
      if (lastEditorUserId) {
        void this.versionsService.onDocumentIdle(
          documentId,
          state,
          lastEditorUserId,
        );
      }

      room.persistTimer = null;
    }, PERSIST_DEBOUNCE_MS);
  }

  /** Find the userId of the last (or any) editor currently in the room */
  private getLastEditorUserId(room: Room): string | null {
    // Return the first connected client's userId as the "last editor"
    for (const [, meta] of room.clients) {
      return meta.userId;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private sendBinary(client: WebSocket, data: Uint8Array): void {
    if (client.readyState === client.OPEN) {
      client.send(data, { binary: true });
    }
  }
}
