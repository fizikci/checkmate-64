import './style.css';
import './workspace.css';
import './three-column.css';
import { Chess } from 'chess.js';
import { START, bit, square, hex, parseMask, occupancy, validate } from './protocol.js';
import { BoardFSM } from './fsm.js';
import { ChessClock } from './clock.js';
import { Engine } from './engine.js';

const $ = s => document.querySelector(s);
const icons = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
let chess = new Chess(), fsm = new BoardFSM(chess), physical = START;
let socket, retry, settle, connected = false, running = false, ended = false, flipped = false, view = 'lab', expectedMove = null, gameVersion = 0;
let led = { mask: 0n, color: '#a4bd83', mode: 'clear' }, logs = [];
const clock = new ChessClock();
const engine = new Engine(text => { $('#engine-status').textContent = text; });

$('#app').innerHTML = `
<aside class="sidebar"><a class="brand" href="/" aria-label="Checkmate 64 ana sayfa"><span class="brand-mark">♞</span><span>checkmate<span class="brand-64">64</span></span></a>
<div class="workspace-label">WORKSPACE <span>V 0.1</span></div>
<nav><button class="nav active" data-view="lab"><span>▦</span> Board Lab <small>01</small></button><button class="nav" data-view="client"><span>♙</span> Mobil istemci <small>02</small></button><button class="nav" data-view="protocol"><span>⌘</span> Protokol <small>03</small></button></nav>
<div class="side-note"><span class="tiny-dot"></span> DONANIMDAN BAĞIMSIZ<h3>Küçük tahta.<br>Büyük olasılıklar.</h3><p>64 sensör. Tek bağlantı.<br>Tüm zeka uygulamada.</p><div class="chip">ESP32 ↔ WebSocket</div></div>
<div class="side-bottom"><span class="avatar">C</span><div>Checkmate-64<small>Development workspace</small></div><span>↗</span></div></aside>
<main><header class="topbar"><div>Workspace <span>/</span> <strong id="crumb">Board Lab</strong></div><div class="top-right"><span class="local-tag">LOCAL ENVIRONMENT</span><span id="connection" class="connection">● Bağlanıyor</span></div></header>
<section class="page-heading"><div><div class="eyebrow">CHECKMATE-64 / DEVELOPMENT KIT</div><h1 id="page-title">Board Lab<span>.</span></h1><p id="page-description">Fiziksel tahtayı simüle et. Her hamleyi gerçeğe dönüştür.</p></div><button class="button primary" id="new-game">↻ Yeni oyun</button></section>
<section class="stats"><div><span class="stat-icon">⌁</span><section><small>BAĞLANTI</small><strong id="stat-connection">Bekleniyor</strong></section><span class="stat-meta">WebSocket</span></div><div><span class="stat-icon">▦</span><section><small>AKTİF SENSÖR</small><strong><span id="sensor-count">32</span> <em>/ 64</em></strong></section><span class="mini-bars">▂▄▆▃▅▇▄</span></div><div><span class="stat-icon">◉</span><section><small>LED DURUMU</small><strong id="led-status">Beklemede</strong></section><span class="stat-meta" id="led-count">0 aktif</span></div><div><span class="stat-icon">⇄</span><section><small>SON HAMLE</small><strong id="last-move">—</strong></section><span class="stat-meta" id="move-number">Hamle bekleniyor</span></div></section>
<div class="lab-layout"><section class="panel board-panel"><div class="panel-heading"><div><h2 id="board-title">Donanım simülatörü <span class="pill">MOCK BOARD</span></h2><p id="board-description">Taş kaldırmak veya yerleştirmek için bir kareye tıkla.</p></div><button class="icon-button" id="flip" title="Tahtayı çevir" aria-label="Tahtayı çevir">⇅</button></div>
<div class="board-wrap"><div id="board" class="board" role="group" aria-label="Satranç tahtası"></div></div>
<div class="board-toolbar"><div class="legend"><span class="legend-dot occupied"></span> Dolu <span class="legend-dot"></span> Boş <span class="legend-led"></span> LED</div><div><button class="text-button" id="reset-board">↻ Standart dizilim</button><button class="text-button" id="clear-board">▢ Tahtayı boşalt</button></div></div>
<div class="inspector"><div><span class="eyebrow">64-BIT OCCUPANCY</span><span class="pill">LERF · a1 → h8</span></div><code id="hex"></code><div id="binary" class="binary"></div></div></section>
<aside class="right-column"><section class="panel game-panel"><div class="panel-heading"><h2>Oyun kontrolü</h2><span class="pill green" id="game-state">HAZIR</span></div><div class="game-content"><div class="segmented"><button class="selected" id="local-mode">İki oyuncu</button><button id="ai-mode">Stockfish</button></div>
<div class="clock-card" id="black-clock"><span class="player-piece">♚</span><div><strong>Siyah</strong><small id="black-label">Oyuncu 2</small></div><time id="time-b">10:00</time></div><div class="clock-card active-turn" id="white-clock"><span class="player-piece white-piece">♔</span><div><strong>Beyaz</strong><small>Oyuncu 1 · Siz</small></div><time id="time-w">10:00</time></div>
<div class="game-options"><label>Süre<select id="time-control"><option value="10">10 dakika</option><option value="5">5 dakika</option><option value="3">3 dakika</option><option value="15">15 dakika</option></select></label><label>Terfi taşı<select id="promotion"><option value="q">Vezir</option><option value="r">Kale</option><option value="b">Fil</option><option value="n">At</option></select></label></div>
<button class="button dark full" id="play">▶ Oyunu başlat</button><div class="fsm-status" role="status"><span class="tiny-dot"></span><span id="status">Başlangıç konumu hazır.</span></div></div></section>
<section class="panel moves-panel"><div class="panel-heading"><h2>Hamle geçmişi</h2><button class="text-button" id="export">PGN ↗</button></div><div class="move-head"><span>#</span><span>BEYAZ</span><span>SİYAH</span></div><div id="moves" class="moves"><div class="empty-state">♙<p>İlk hamleyle başlar.</p><small>Tahtanız hikayesini burada yazacak.</small></div></div></section>
<section class="engine-note"><span>✳</span><div><strong>Thin hardware. Smart moves.</strong><p id="engine-status">Kurallar ve saatler cihazınızda çalışır.</p></div></section></aside></div>
<section class="panel connection-panel"><div class="panel-heading"><h2>Bağlantı & kurulum</h2><span class="pill">LOCAL NETWORK</span></div><div class="connection-content"><label>Tahta WebSocket adresi<div class="input-row"><input id="endpoint" aria-label="WebSocket adresi"><button class="button" id="connect">Bağlan</button></div></label><label>Özel pozisyon · FEN<div class="input-row"><input id="fen" placeholder="FEN yapıştırın" aria-label="FEN pozisyonu"><button class="button" id="load-fen">Yükle</button></div></label></div></section>
<section class="panel protocol-panel"><div class="panel-heading"><div><h2>Canlı protokol <span class="pill">JSON</span></h2><p>Tahta ile istemci arasındaki mesaj akışı.</p></div><button id="clear-log" class="text-button">Temizle</button></div><div class="led-controls"><label>LED maskesi<input id="led-mask" value="0x0000000000000010"></label><label>Renk<input id="led-color" type="color" value="#A4BD83"></label><label>Mod<select id="led-mode"><option value="solid">Solid</option><option value="blink">Blink</option><option value="clear">Clear</option></select></label><button class="button" id="send-led">LED gönder ↗</button></div><div id="logs" class="logs"></div></section>
<footer><span>CHECKMATE-64 <span class="footer-dot">/</span> Board development studio</span><span>Designed for the next move. ↗</span></footer></main><div id="toast" role="status"></div>`;


let physicalPieces = Object.fromEntries(chess.board().flat().filter(Boolean).map(p => [p.square,p]));
let held = [], selectedHeld = 0, touchAction = 'pickup';
$('.sidebar').remove();
$('.stats').style.display = 'none';
$('#page-description').textContent = 'Two boards. One conversation. Hardware on the left, intelligence on the right.';
$('#board-title').textContent = '01 · Board simulator';
$('#board-description').textContent = 'Left click to pick up · Right click to place the selected piece';
$('.game-panel .panel-heading h2').textContent = '03 · Mobile app';
const tray = document.createElement('section'); tray.className = 'pickup-tray';
tray.innerHTML = '<div class="tray-heading">IN YOUR HAND <span id="held-count"></span></div><div id="held-pieces"></div><div class="touch-actions"><button id="pickup-mode" class="selected">↑ Pick up</button><button id="place-mode">↓ Place</button><small>Touch: choose an action, then tap a square. Keyboard: P to place.</small></div>';
$('.board-wrap').after(tray);
const mobileWrap = document.createElement('div'); mobileWrap.className = 'mobile-board-wrap';
mobileWrap.innerHTML = '<div id="mobile-board" class="board" role="img" aria-label="Mobile app board — read only"></div>';
$('#black-clock').after(mobileWrap);
$('.protocol-panel .panel-heading h2').textContent = '02 · Message log';
$('.protocol-panel .panel-heading p').textContent = 'Board → mobile on the left · Mobile → board on the right';
$('.right-column').before($('.protocol-panel'));
const setup = document.createElement('details'); setup.className = 'setup-drawer';
setup.innerHTML = '<summary>Connection & position settings</summary>';
$('.connection-panel').before(setup); setup.append($('.connection-panel'));
$('#logs').before(Object.assign(document.createElement('div'), {className:'conversation-labels', innerHTML:'<span>▦ Board simulator</span><span>Mobile app ♙</span>'}));
$('#logs').setAttribute('role','log');
let mode = 'local';
function renderHeld() {
  $('#held-count').textContent = held.length + ' pieces';
  $('#held-pieces').replaceChildren(...held.map((p,i) => {
    const b = document.createElement('button'); b.className = 'held-piece' + (i === selectedHeld ? ' selected' : '');
    b.textContent = (icons[p.type] || '●') + ' ' + p.origin;
    b.setAttribute('aria-label','Select held piece from ' + p.origin); b.setAttribute('aria-pressed',String(i === selectedHeld));
    b.onclick = () => { selectedHeld = i; renderHeld(); }; return b;
  }));
  if (!held.length) $('#held-pieces').textContent = 'Pick up one or more pieces. Select which one to place.';
}
function manipulate(s, action) {
  if (!connected) { toast('Connect the board first.'); return; }
  const occupied = Boolean(physical & bit(s));
  if (action === 'pickup') {
    if (!occupied) return;
    held.push({ ...(physicalPieces[s] || {}), origin:s }); delete physicalPieces[s];
    if (held.length === 1) selectedHeld = 0;
    sendState(physical & ~bit(s));
  } else {
    if (occupied) { toast('Pick up the piece on this square first.'); return; }
    if (!held.length) { toast('Pick up a piece first.'); return; }
    physicalPieces[s] = held.splice(selectedHeld,1)[0]; selectedHeld = 0;
    sendState(physical | bit(s));
  }
  renderHeld();
}
for (const action of ['pickup','place']) $('#' + action + '-mode').onclick = () => {
  touchAction = action;
  $('#pickup-mode').classList.toggle('selected',action === 'pickup');
  $('#place-mode').classList.toggle('selected',action === 'place');
};
function resetPhysicalPieces(position = chess) {
  physicalPieces = Object.fromEntries(position.board().flat().filter(Boolean).map(p => [p.square,p]));
  held = []; selectedHeld = 0; renderHeld();
}
function renderMobile() {
  const last = chess.history({verbose:true}).at(-1);
  $('#mobile-board').replaceChildren(...Array.from({length:64},(_,j) => {
    const i = (7-Math.floor(j/8))*8+j%8, s = square(i), p = chess.get(s);
    const el = document.createElement('div'); el.className = 'square ' + ((Math.floor(i/8)+i%8)%2 ? 'light' : 'dark');
    el.dataset.mobileSquare = s; el.setAttribute('aria-label',s + (p ? ' '+p.color+' '+p.type : ' empty'));
    if (last && [last.from,last.to].includes(s)) el.classList.add('last-move');
    if (p) { const piece = document.createElement('span'); piece.className = 'piece ' + (p.color === 'w' ? 'white' : 'black'); piece.textContent = icons[p.type]; el.append(piece); }
    return el;
  }));
}
renderHeld();
function status(text, state = 'HAZIR') { $('#status').textContent = text; $('#game-state').textContent = state; }
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 3500); }
function log(direction,message) {
  if (direction !== 'RX ↙') return;
  const logElement = $('#logs');
  const followLatest = logElement.scrollHeight - logElement.scrollTop - logElement.clientHeight < 40;
  const previousScroll = logElement.scrollTop;
  logs.push({time:new Date().toLocaleTimeString(),message}); logs = logs.slice(-60);
  $('#logs').replaceChildren(...logs.map(l => {
    const row = document.createElement('div'); row.className = 'bubble ' + (l.message.event === 'board_state' ? 'from-board' : 'from-mobile');
    const tag = document.createElement('strong'); tag.textContent = l.message.event === 'board_state' ? 'Board · board_state' : 'Mobile · set_leds';
    const code = document.createElement('pre'); code.textContent = JSON.stringify(l.message,null,2);
    const time = document.createElement('small'); time.textContent = l.time + '  ✓'; row.append(tag,code,time); return row;
  }));
  logElement.scrollTop = followLatest ? logElement.scrollHeight : previousScroll;
}
function send(message) { if (!connected || socket.readyState !== WebSocket.OPEN) { toast('Önce tahta bağlantısını kurun.'); return false; } socket.send(JSON.stringify(message)); log('TX ↗', message); return true; }
function sendState(mask) { send({ event: 'board_state', data: { state: hex(mask), timestamp: Date.now() } }); }
function sendLed(mask = 0n, color = '#A4BD83', mode = 'solid') { send({ cmd: 'set_leds', data: { mask: hex(mask), color, mode: mask === 0n ? 'clear' : mode } }); }
function renderBoard() {
  const order = Array.from({ length: 64 }, (_, j) => (7 - Math.floor(j / 8)) * 8 + j % 8); if (flipped) order.reverse();
  $('#board').replaceChildren(...order.map((i, position) => {
    const s = square(i), occupied = Boolean(physical & bit(i)), piece = physicalPieces[s], b = document.createElement('button');
    b.className = `square ${(Math.floor(i / 8) + i % 8) % 2 ? 'light' : 'dark'} ${occupied ? 'occupied' : ''}`;
    b.dataset.square = s; b.setAttribute('aria-label', `${s} ${occupied ? 'dolu' : 'boş'}`); b.setAttribute('aria-pressed', String(occupied));
    if (led.mode !== 'clear' && (led.mask & bit(i))) { b.classList.add('led', led.mode); b.style.setProperty('--led', led.color); }
    if (occupied) { const p = document.createElement('span'); p.className = `piece ${piece?.color === 'w' ? 'white' : 'black'} ${piece ? '' : 'sensor'}`; p.textContent = piece ? icons[piece.type] : '●'; b.append(p); }
    if (position % 8 === 0) { const rank = document.createElement('small'); rank.className = 'rank'; rank.textContent = s[1]; b.append(rank); }
    if (position >= 56) { const file = document.createElement('small'); file.className = 'file'; file.textContent = s[0]; b.append(file); }
    let pointerType = 'mouse';
    b.onpointerdown = e => { pointerType = e.pointerType; };
    b.onclick = () => manipulate(s,pointerType === 'touch' ? touchAction : 'pickup');
    b.oncontextmenu = e => { e.preventDefault(); manipulate(s,'place'); };
    b.onkeydown = e => { if (e.key.toLowerCase() === 'p') { e.preventDefault(); manipulate(s,'place'); } }; return b;
  }));
  $('#hex').textContent = hex(physical); $('#binary').replaceChildren(...physical.toString(2).padStart(64, '0').match(/.{8}/g).map(v => { const s = document.createElement('span'); s.textContent = v; return s; }));
  $('#sensor-count').textContent = physical.toString(2).replaceAll('0', '').length;
  $('#led-status').textContent = led.mode === 'clear' ? 'Beklemede' : led.mode === 'blink' ? 'Yanıp sönüyor' : 'Sabit';
  $('#led-count').textContent = `${led.mode === 'clear' ? 0 : led.mask.toString(2).replaceAll('0', '').length} aktif`;
}
function renderGame() {
  const history = chess.history();
  $('#last-move').textContent = history.at(-1) || '—'; $('#move-number').textContent = history.length ? `${history.length} yarım hamle` : 'Hamle bekleniyor';
  if (history.length) { $('#moves').replaceChildren(...Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => { const row = document.createElement('div'); row.className = 'move-row'; for (const t of [i + 1 + '.', history[i * 2], history[i * 2 + 1] || '—']) { const span = document.createElement('span'); span.textContent = t; row.append(span); } return row; })); }
  else $('#moves').innerHTML = '<div class="empty-state">♙<p>İlk hamleyle başlar.</p><small>Tahtanız hikayesini burada yazacak.</small></div>';
  $('#white-clock').classList.toggle('active-turn', chess.turn() === 'w'); $('#black-clock').classList.toggle('active-turn', chess.turn() === 'b');
  $('#play').textContent = running ? 'Ⅱ Oyunu duraklat' : ended ? 'Oyun sona erdi' : '▶ Oyunu başlat'; $('#play').disabled = ended;
  for (const id of ['time-control', 'local-mode', 'ai-mode']) $('#' + id).disabled = running || chess.history().length > 0;
  renderBoard(); renderMobile(); renderClocks();
}
function renderClocks() { for (const color of ['w', 'b']) { const seconds = Math.ceil(clock.remaining[color] / 1000); $('#time-' + color).textContent = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; } }
function pause(reason) { running = false; clock.pause(); engine.stop(); gameVersion++; clearTimeout(settle); status(reason, 'DURAKLATILDI'); renderGame(); }
async function askEngine() {
  if (!running || mode !== 'ai' || chess.turn() !== 'b' || ended) return;
  const version = gameVersion;
  try { const move = await engine.bestMove(chess.fen()); if (version !== gameVersion || !running) return; expectedMove = move; sendLed(bit(move.slice(0, 2)) | bit(move.slice(2, 4)), '#A4BD83'); status(`Stockfish: ${move.slice(0, 2)} → ${move.slice(2, 4)}. Tahtada uygulayın.`, 'MOTOR HAMLESİ'); }
  catch (e) { if (version === gameVersion) { pause(e.message); toast(e.message); } }
}
function processBoard() {
  if (!running || ended) return;
  const flagged = clock.tick(); if (flagged) { finish(`${flagged === 'w' ? 'Beyaz' : 'Siyah'} süreyi doldurdu.`); return; }
  if (mode === 'ai' && chess.turn() === 'b' && !expectedMove) { status('Motor yanıtını bekleyin; taşları konumuna geri koyun.', 'MOTOR BEKLENİYOR'); return; }
  const result = fsm.observe(physical, { promotion: expectedMove?.[4] || $('#promotion').value, expectedMove });
  if (result.type === 'move') {
    expectedMove = null; clock.start(chess.turn()); sendLed(); status(`${result.move.san} geçerli. ${chess.turn() === 'w' ? 'Beyaz' : 'Siyah'} oynar.`, chess.isCheck() ? 'ŞAH' : 'OYUNDA');
    if (chess.isGameOver()) finish(chess.isCheckmate() ? `Şah mat! ${chess.turn() === 'w' ? 'Siyah' : 'Beyaz'} kazandı.` : 'Oyun berabere.'); else askEngine();
  } else if (result.type === 'invalid') { sendLed(result.mask, '#D96A59', 'blink'); status('Geçersiz hamle. Taşları son geçerli konuma geri koyun.', 'GERİ YÜKLE'); }
  else if (result.type === 'restored') { if (expectedMove) sendLed(bit(expectedMove.slice(0, 2)) | bit(expectedMove.slice(2, 4))); else sendLed(); status('Tahta eşleşti. Hamlenizi yapın.', 'OYUNDA'); }
  else status(result.type === 'lifted' ? 'Taş kaldırıldı. Hedef kareye yerleştirin.' : 'Özel hamlenin kalan taşlarını yerleştirin.', 'HAMLE BEKLENİYOR');
  renderGame();
}
function finish(message) { ended = true; running = false; clock.pause(); engine.stop(); status(message, 'TAMAMLANDI'); renderGame(); }
function connect() {
  const url = $('#endpoint').value.trim();
  try { const u = new URL(url); if (!['ws:', 'wss:'].includes(u.protocol)) throw new Error(); } catch { toast('Geçerli bir ws:// veya wss:// adresi girin.'); return; }
  if (running) pause('Bağlantı değiştiriliyor. Yeniden eşleştirip devam edin.');
  clearTimeout(retry); if (socket) { socket.onclose = null; socket.close(); } connected = false;
  socket = new WebSocket(url); const current = socket;
  socket.onopen = () => { connected = true; $('#connection').textContent = '● Bağlı'; $('#connection').classList.add('online'); $('#stat-connection').textContent = 'Bağlı'; localStorage.setItem('checkmate.endpoint', url); };
  socket.onmessage = event => {
    if (socket !== current) return;
    try { const m = JSON.parse(event.data); if (m.event === 'protocol_error') { toast(m.data.message); return; } validate(m); log('RX ↙', m);
      if (m.event === 'board_state') {
        const next = parseMask(m.data.state); if (physical === next) { renderBoard(); return; }
        physical = next; renderBoard(); clearTimeout(settle);
        // Record every sensor edge immediately; defer commit until 400 ms quiet.
        if (running) { fsm.removed |= fsm.previous & ~physical; fsm.added |= ~fsm.previous & physical; fsm.previous = physical; settle = setTimeout(processBoard, 400); }
        else status(physical === occupancy(chess) ? 'Tahta konumla eşleşiyor.' : 'Tahta ve oyun farklı. Dizilimi düzeltin veya FEN yükleyin.', 'DURAKLATILDI');
      } else { led = { ...m.data, mask: parseMask(m.data.mask) }; renderBoard(); }
    } catch (e) { toast('Protokol: ' + e.message); }
  };
  socket.onerror = () => { $('#stat-connection').textContent = 'Erişilemiyor'; };
  socket.onclose = () => { connected = false; $('#connection').textContent = '● Bağlantı yok'; $('#connection').classList.remove('online'); $('#stat-connection').textContent = 'Yeniden deneniyor'; pause('Bağlantı kesildi. Saatler duraklatıldı.'); retry = setTimeout(connect, 2500); };
}
function newGame(fen) { clearTimeout(settle); engine.stop(); gameVersion++; chess = new Chess(fen); resetPhysicalPieces(); fsm = new BoardFSM(chess); clock.reset(Number($('#time-control').value)); running = false; ended = false; expectedMove = null; sendLed(); status('Tahtayı konumla eşleştirin ve oyunu başlatın.'); renderGame(); }
$('#endpoint').value = localStorage.getItem('checkmate.endpoint') || `ws://${location.hostname || 'localhost'}:8080`;
$('#connect').onclick = connect;
$('#new-game').onclick = () => { newGame(); if (view !== 'client') sendState(START); };
$('#reset-board').onclick = () => { if (running) pause('Standart dizilim yüklendi. Yeni oyun başlatabilirsiniz.'); resetPhysicalPieces(new Chess()); sendState(START); };
$('#clear-board').onclick = () => { if (running) pause('Tahta boşaltıldı.'); physicalPieces = {}; held = []; renderHeld(); sendState(0n); };
$('#flip').onclick = () => { flipped = !flipped; renderBoard(); };
$('#play').onclick = () => {
  if (running) { pause('Oyun duraklatıldı.'); return; }
  if (!connected) { toast('Tahta bağlı değil.'); return; }
  if (chess.isGameOver()) { finish(chess.isCheckmate() ? 'Şah mat. Bu pozisyon tamamlanmış.' : 'Bu pozisyon berabere.'); return; }
  if (physical !== occupancy(chess)) { sendLed(physical ^ occupancy(chess), '#D96A59', 'blink'); toast('Tahtayı oyun konumuyla eşleştirin.'); return; }
  fsm.reset(); running = true; clock.start(chess.turn()); status('Beyaz / siyah sırasına göre hamlenizi yapın.', 'OYUNDA'); renderGame(); askEngine();
};
$('#time-control').onchange = () => { clock.reset(Number($('#time-control').value)); renderClocks(); };
function setMode(next) { mode = next; $('#local-mode').classList.toggle('selected', next === 'local'); $('#ai-mode').classList.toggle('selected', next === 'ai'); $('#black-label').textContent = next === 'ai' ? 'Stockfish 18 · Yerel WASM' : 'Oyuncu 2'; }
$('#local-mode').onclick = () => setMode('local'); $('#ai-mode').onclick = () => setMode('ai');
$('#load-fen').onclick = () => { try { const fen = $('#fen').value.trim(); if (!fen) throw new Error(); new Chess(fen); newGame(fen); if (view !== 'client') sendState(occupancy(chess)); } catch { toast('Geçerli bir FEN pozisyonu girin.'); } };
$('#send-led').onclick = () => { try { sendLed(parseMask($('#led-mask').value), $('#led-color').value, $('#led-mode').value); } catch (e) { toast(e.message); } };
$('#clear-log').onclick = () => { logs = []; $('#logs').replaceChildren(); };
$('#export').onclick = () => { const url = URL.createObjectURL(new Blob([chess.pgn()], { type: 'application/x-chess-pgn' })); const a = document.createElement('a'); a.href = url; a.download = 'checkmate-64.pgn'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el === b)); document.body.dataset.view = view; $('#crumb').textContent = $('#page-title').textContent = { lab: 'Board Lab.', client: 'Mobil istemci.', protocol: 'Protokol.' }[view]; $('#board-title').textContent = view === 'client' ? 'Canlı tahta' : 'Donanım simülatörü'; $('#board-description').textContent = view === 'client' ? 'Bağlı fiziksel tahtanın salt okunur görünümü.' : 'Taş kaldırmak veya yerleştirmek için bir kareye tıkla.'; renderBoard(); });
setInterval(() => { const flagged = clock.tick(); if (flagged && running) finish(`${flagged === 'w' ? 'Beyaz' : 'Siyah'} süreyi doldurdu.`); renderClocks(); }, 100);
renderGame(); connect();
