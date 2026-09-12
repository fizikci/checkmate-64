import { WebSocketServer, WebSocket } from 'ws';
import { pathToFileURL } from 'node:url';
import { START, hex, validate } from '../src/protocol.js';
export function createBoardServer(port = 8080, host = '0.0.0.0') {
  const wss = new WebSocketServer({ port, host, maxPayload: 4096 });
  let state = { event: 'board_state', data: { state: hex(START), timestamp: Date.now() } };
  let leds = { cmd: 'set_leds', data: { mask: hex(0n), color: '#00FF00', mode: 'clear' } };
  const broadcast = message => { for (const c of wss.clients) if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(message)); };
  wss.on('connection', socket => {
    socket.send(JSON.stringify(state)); socket.send(JSON.stringify(leds));
    socket.on('error', () => {});
    socket.on('message', bytes => {
      try { const m = validate(JSON.parse(bytes.toString())); if (m.event) state = m; else leds = m; broadcast(m); }
      catch (e) { socket.send(JSON.stringify({ event: 'protocol_error', data: { message: e.message } })); }
    });
  });
  return wss;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createBoardServer(Number(process.env.WS_PORT || 8080));
  server.on('listening', () => console.log('Checkmate-64 board socket: ws://localhost:8080'));
  server.on('error', e => { console.error(e.message); process.exit(1); });
}
