export class ChessClock {
  constructor(minutes = 10, now = () => performance.now()) { this.now = now; this.reset(minutes); }
  reset(minutes = 10) { this.remaining = { w: minutes * 60000, b: minutes * 60000 }; this.active = null; this.last = this.now(); }
  tick() { const now = this.now(); if (this.active) this.remaining[this.active] = Math.max(0, this.remaining[this.active] - (now - this.last)); this.last = now; return this.active && this.remaining[this.active] === 0 ? this.active : null; }
  start(color) { this.tick(); this.active = color; }
  pause() { this.tick(); this.active = null; }
}
