import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage, Server } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

// Seat status: available | reserved | sold | held
type SeatStatus = 'available' | 'reserved' | 'sold' | 'held';

interface SeatState {
  status: SeatStatus;
  reservedBy: string | null; // email of the user who reserved
}

// WS message types (client → server)
interface JoinMessage {
  type: 'join';
  email: string;
}

interface ToggleSeatMessage {
  type: 'toggle-seat';
  seatId: string;
}

interface ReleaseSeatMessage {
  type: 'release-seat';
  seatId: string;
}

interface ClearSelectionMessage {
  type: 'clear-selection';
}

type ClientMessage = JoinMessage | ToggleSeatMessage | ReleaseSeatMessage | ClearSelectionMessage;

// WS message types (server → client)
interface SeatUpdateMessage {
  type: 'seat-update';
  seatId: string;
  status: SeatStatus;
  reservedBy: string | null;
}

interface InitStateMessage {
  type: 'init-state';
  seats: Record<string, { status: SeatStatus; reservedBy: string | null }>;
  email: string;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

interface UserCountMessage {
  type: 'user-count';
  count: number;
}

type ServerMessage = SeatUpdateMessage | InitStateMessage | ErrorMessage | UserCountMessage;

// Client session
interface ClientSession {
  ws: WebSocket;
  email: string;
}

// In-memory seat state (seatId → state)
const seatStates = new Map<string, SeatState>();
const clients = new Map<WebSocket, ClientSession>();

// Load initial seat statuses from venue.json so sold/held seats are never reservable
function loadVenueSeats(): void {
  try {
    const venuePath = join(process.cwd(), 'src/data/venue.json');
    const raw = readFileSync(venuePath, 'utf-8');
    const venue = JSON.parse(raw);
    for (const section of venue.sections) {
      for (const row of section.rows) {
        for (const seat of row.seats) {
          if (seat.status !== 'available') {
            seatStates.set(seat.id, { status: seat.status, reservedBy: null });
          }
        }
      }
    }
    console.log(`Loaded ${seatStates.size} non-available seats from venue.json`);
  } catch (err) {
    console.warn('Could not load venue.json for initial seat states:', err);
  }
}

loadVenueSeats();

function broadcast(message: ServerMessage, exclude?: WebSocket): void {
  const data = JSON.stringify(message);
  for (const [ws] of clients) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function broadcastAll(message: ServerMessage): void {
  const data = JSON.stringify(message);
  for (const [ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function broadcastUserCount(): void {
  const uniqueEmails = new Set<string>();
  for (const session of clients.values()) {
    uniqueEmails.add(session.email);
  }
  broadcastAll({ type: 'user-count', count: uniqueEmails.size });
}

function getSeatState(seatId: string): SeatState {
  return seatStates.get(seatId) || { status: 'available', reservedBy: null };
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function handleJoin(ws: WebSocket, email: string): void {
  clients.set(ws, { ws, email });

  // Send current seat state snapshot
  const seats: Record<string, { status: SeatStatus; reservedBy: string | null }> = {};
  for (const [seatId, state] of seatStates) {
    seats[seatId] = { status: state.status, reservedBy: state.reservedBy };
  }
  send(ws, { type: 'init-state', seats, email });
  broadcastUserCount();
}

function handleToggleSeat(ws: WebSocket, seatId: string): void {
  const session = clients.get(ws);
  if (!session) {
    send(ws, { type: 'error', message: 'Not authenticated. Send join first.' });
    return;
  }

  const state = getSeatState(seatId);

  // If this user already reserved it → release it
  if (state.status === 'reserved' && state.reservedBy === session.email) {
    seatStates.set(seatId, { status: 'available', reservedBy: null });
    broadcastAll({ type: 'seat-update', seatId, status: 'available', reservedBy: null });
    return;
  }

  // Only available seats can be reserved
  if (state.status !== 'available') {
    send(ws, { type: 'error', message: `Seat ${seatId} is ${state.status}` });
    return;
  }

  // Check max 8 per user
  let userReservationCount = 0;
  for (const s of seatStates.values()) {
    if (s.reservedBy === session.email) userReservationCount++;
  }
  if (userReservationCount >= 8) {
    send(ws, { type: 'error', message: 'Maximum 8 seats can be reserved' });
    return;
  }

  // Reserve
  seatStates.set(seatId, { status: 'reserved', reservedBy: session.email });
  broadcastAll({ type: 'seat-update', seatId, status: 'reserved', reservedBy: session.email });
}

function handleReleaseSeat(ws: WebSocket, seatId: string): void {
  const session = clients.get(ws);
  if (!session) return;

  const state = getSeatState(seatId);
  if (state.status === 'reserved' && state.reservedBy === session.email) {
    seatStates.set(seatId, { status: 'available', reservedBy: null });
    broadcastAll({ type: 'seat-update', seatId, status: 'available', reservedBy: null });
  }
}

function handleClearSelection(ws: WebSocket): void {
  const session = clients.get(ws);
  if (!session) return;

  for (const [seatId, state] of seatStates) {
    if (state.reservedBy === session.email) {
      seatStates.set(seatId, { status: 'available', reservedBy: null });
      broadcastAll({ type: 'seat-update', seatId, status: 'available', reservedBy: null });
    }
  }
}

function handleDisconnect(ws: WebSocket): void {
  const session = clients.get(ws);
  clients.delete(ws);

  if (session) {
    // Release all seats reserved by this user
    for (const [seatId, state] of seatStates) {
      if (state.reservedBy === session.email) {
        seatStates.set(seatId, { status: 'available', reservedBy: null });
        broadcastAll({ type: 'seat-update', seatId, status: 'available', reservedBy: null });
      }
    }
    broadcastUserCount();
  }
}

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      switch (msg.type) {
        case 'join':
          if (!msg.email || typeof msg.email !== 'string' || !msg.email.trim()) {
            send(ws, { type: 'error', message: 'Email is required' });
            return;
          }
          handleJoin(ws, msg.email.trim().toLowerCase());
          break;
        case 'toggle-seat':
          if (!msg.seatId) {
            send(ws, { type: 'error', message: 'seatId is required' });
            return;
          }
          handleToggleSeat(ws, msg.seatId);
          break;
        case 'release-seat':
          if (!msg.seatId) {
            send(ws, { type: 'error', message: 'seatId is required' });
            return;
          }
          handleReleaseSeat(ws, msg.seatId);
          break;
        case 'clear-selection':
          handleClearSelection(ws);
          break;
        default:
          send(ws, { type: 'error', message: 'Unknown message type' });
      }
    });

    ws.on('close', () => handleDisconnect(ws));
  });

  return wss;
}
