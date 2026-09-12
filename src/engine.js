export class Engine {
  constructor(onStatus) { this.onStatus = onStatus; this.generation = 0; }
  stop() { this.generation++; this.worker?.terminate(); this.worker = null; clearTimeout(this.timeout); }
  bestMove(fen, depth = 12) {
    this.stop(); const generation = this.generation;
    this.onStatus('Motor yükleniyor');
    return new Promise((resolve, reject) => {
      const worker = this.worker = new Worker('/engine/stockfish.js');
      const fail = () => { this.stop(); this.onStatus('Motor kullanılamıyor'); reject(new Error('Stockfish yüklenemedi veya zaman aşımına uğradı.')); };
      this.timeout = setTimeout(fail, 30000); worker.onerror = fail;
      worker.onmessage = e => {
        if (generation !== this.generation) return;
        const line = String(e.data);
        if (line === 'uciok') worker.postMessage('isready');
        if (line === 'readyok') { this.onStatus('Stockfish düşünüyor'); worker.postMessage('position fen ' + fen); worker.postMessage(`go depth ${depth} movetime 1500`); }
        if (line.startsWith('bestmove ')) { clearTimeout(this.timeout); this.onStatus('Stockfish hazır'); resolve(line.split(' ')[1]); worker.terminate(); this.worker = null; }
      };
      worker.postMessage('uci');
    });
  }
}
