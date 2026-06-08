import express from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

function parseOrigins(): string[] {
  const raw = process.env['ALLOWED_ORIGINS'];
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost:3000'];
}

const allowedOrigins = parseOrigins();

const app = express();
app.disable('x-powered-by');
app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env['RATE_LIMIT_MAX_PER_MIN'] ?? 120),
  standardHeaders: true,
  legacyHeaders: false,
});

const api = express.Router();
api.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'syncstudy-socket' });
});
app.use('/api', apiLimiter, api);

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

// ── In-memory store ────────────────────────────────────────────────
const groupMessages: Record<
  string,
  Array<{
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
  }>
> = {};

const groupPresence: Record<string, Set<string>> = {};

// ── Socket.io ──────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] connected: ${socket.id}`);

  socket.on('join-group', ({ groupId, userId }: { groupId: string; userId: string }) => {
    socket.join(groupId);

    if (!groupPresence[groupId]) groupPresence[groupId] = new Set();
    groupPresence[groupId].add(socket.id);

    socket.emit('message-history', {
      groupId,
      messages: groupMessages[groupId] ?? [],
    });

    io.to(groupId).emit('presence-update', {
      groupId,
      onlineSocketIds: [...groupPresence[groupId]],
    });

    console.log(`[WS] ${userId} joined group ${groupId}`);
  });

  socket.on('leave-group', ({ groupId }: { groupId: string }) => {
    socket.leave(groupId);
    groupPresence[groupId]?.delete(socket.id);
    io.to(groupId).emit('presence-update', {
      groupId,
      onlineSocketIds: [...(groupPresence[groupId] ?? [])],
    });
  });

  socket.on(
    'send-message',
    ({
      groupId,
      message,
    }: {
      groupId: string;
      message: { senderId: string; senderName: string; text: string };
    }) => {
      const fullMessage = {
        id: Math.random().toString(36).substring(2, 9),
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text,
        timestamp: new Date().toISOString(),
      };

      if (!groupMessages[groupId]) groupMessages[groupId] = [];
      groupMessages[groupId].push(fullMessage);

      if (groupMessages[groupId].length > 200) {
        groupMessages[groupId] = groupMessages[groupId].slice(-200);
      }

      socket.to(groupId).emit('receive-message', { groupId, message: fullMessage });
    }
  );

  socket.on(
    'shared-session-created',
    (data: {
      id: string;
      groupId: string;
      subjectId: string;
      startTime: string;
      endTime: string;
    }) => {
      io.to(data.groupId).emit('new-shared-session', data);
      console.log(`[WS] shared session created for group ${data.groupId}`);
    }
  );

  socket.on(
    'shared-session-modified',
    (data: { id: string; groupId: string; startTime: string; endTime: string }) => {
      io.to(data.groupId).emit('shared-session-modified', data);
    }
  );

  socket.on(
    'update-session-objectives',
    ({
      sessionId,
      objectives,
    }: {
      sessionId: string;
      objectives: string[];
    }) => {
      socket.broadcast.emit('session-objectives-updated', { sessionId, objectives });
    }
  );

  socket.on('disconnect', () => {
    for (const groupId of Object.keys(groupPresence)) {
      if (groupPresence[groupId].has(socket.id)) {
        groupPresence[groupId].delete(socket.id);
        io.to(groupId).emit('presence-update', {
          groupId,
          onlineSocketIds: [...groupPresence[groupId]],
        });
      }
    }
    console.log(`[WS] disconnected: ${socket.id}`);
  });
});

// ── Static Angular build ───────────────────────────────────────────
const distPath = path.join(process.cwd(), 'dist', 'syncstudy', 'browser');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start ──────────────────────────────────────────────────────────
const PORT = process.env['PORT'] ?? 3000;
server.listen(PORT, () => {
  console.log(`✅  SyncStudy server running on http://localhost:${PORT}`);
  console.log(`   CORS (Socket): ${allowedOrigins.join(', ')}`);
});
