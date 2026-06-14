/**
 * Engine API client — WebSocket hook + simulate disruption REST call.
 */
import { useEffect, useRef, useCallback } from 'react';

const ENGINE_WS_URL = 'ws://localhost:8000/ws/engine';
const API_BASE = 'http://localhost:8000';

/**
 * Custom hook: manages a WebSocket connection to /ws/engine.
 * Calls onMessage(msg) for every incoming message.
 * Reconnects automatically on disconnect.
 */
export function useEngineWebSocket(onMessage) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(ENGINE_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Engine WS] Connected');
        // Start keepalive pings
        ws._pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          onMessageRef.current(msg);
        } catch (e) {
          console.error('[Engine WS] Parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('[Engine WS] Error:', e);
      };

      ws.onclose = () => {
        console.log('[Engine WS] Disconnected — reconnecting in 3s...');
        clearInterval(ws._pingInterval);
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    } catch (e) {
      console.error('[Engine WS] Connection failed:', e);
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef;
}

/**
 * Simulate a disruption event — POSTs to /api/simulate-disruption.
 */
export async function simulateDisruption({ type, port_code, description }) {
  const res = await fetch(`${API_BASE}/api/simulate-disruption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, port_code, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
