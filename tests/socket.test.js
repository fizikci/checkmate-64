import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createBoardServer } from '../server/index.js';
import { START, hex } from '../src/protocol.js';
test('real socket broadcasts occupancy and LEDs; invalid payload cannot corrupt state', async () => {
  const server = createBoardServer(0, '127.0.0.1'); await once(server, 'listening');
  const url = `ws://127.0.0.1:${server.address().port}`;
  const a = new WebSocket(url), b = new WebSocket(url), received = [];
  b.on('message', m => received.push(JSON.parse(m)));
  try {
    await Promise.all([once(a, 'open'), once(b, 'open')]);
    const waitFor = async predicate => { for (let i = 0; i < 100; i++) { if (received.some(predicate)) return; await new Promise(r => setTimeout(r, 10)); } assert.fail('Message not received'); };
    await waitFor(m => m.data?.state === hex(START));
    a.send(JSON.stringify({ event: 'board_state', data: { state: hex(0n), timestamp: Date.now() } }));
    await waitFor(m => m.data?.state === hex(0n));
    a.send(JSON.stringify({ cmd: 'set_leds', data: { mask: hex(16n), color: '#00FF00', mode: 'blink' } }));
    await waitFor(m => m.data?.mode === 'blink');
    const error = once(a, 'message'); a.send('{broken'); assert.equal(JSON.parse((await error)[0]).event, 'protocol_error');
  } finally { a.terminate(); b.terminate(); await new Promise(r => server.close(r)); }
});
