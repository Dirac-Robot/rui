const WS_URL = 'ws://localhost:8000/ws';

export function createWebSocket(onMessage, onOpen, onClose) {
  let ws = null;
  let reconnectTimer = null;
  let intentionalClose = false;

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      if (onOpen) onOpen();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch {
        console.warn('Non-JSON WS message:', event.data);
      }
    };

    ws.onclose = () => {
      if (onClose) onClose();
      if (!intentionalClose) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose will fire after this, which handles reconnect
    };
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 3000);
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function disconnect() {
    intentionalClose = true;
    clearTimeout(reconnectTimer);
    if (ws) ws.close();
  }

  connect();

  return { send, disconnect, getSocket: () => ws };
}
