import { useEffect, useRef, useCallback, useState } from 'react';
import { useSeatStore } from '../store/seatStore';
import { SeatStatus } from '../types/venue';

// Server → client message types
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

export function useWebSocket(email: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);

  const updateSeatStatus = useSeatStore((s) => s.updateSeatStatus);
  const initSeatStates = useSeatStore((s) => s.initSeatStates);
  const showToast = useSeatStore((s) => s.showToast);

  useEffect(() => {
    if (!email) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`;
    const wsUrl = `${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join', email }));
    };

    ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);

      switch (msg.type) {
        case 'init-state':
          initSeatStates(msg.seats, msg.email);
          break;
        case 'seat-update':
          updateSeatStatus(msg.seatId, msg.status, msg.reservedBy);
          break;
        case 'user-count':
          setUserCount(msg.count);
          break;
        case 'error':
          showToast(msg.message);
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [email, updateSeatStatus, initSeatStates, showToast]);

  const sendToggleSeat = useCallback((seatId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'toggle-seat', seatId }));
    }
  }, []);

  const sendClearSelection = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'clear-selection' }));
    }
  }, []);

  return { connected, userCount, sendToggleSeat, sendClearSelection };
}
