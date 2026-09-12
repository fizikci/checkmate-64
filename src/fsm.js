import { Chess } from 'chess.js';
import { occupancy, bit, FULL } from './protocol.js';
// Compare complete legal successor positions; intermediate lifts remain pending.
// Capture evidence must include removal of the victim: occupancy alone is ambiguous.
export class BoardFSM {
  constructor(chess = new Chess()) { this.chess = chess; this.reset(); }
  reset() { this.base = occupancy(this.chess); this.previous = this.base; this.removed = 0n; this.added = 0n; this.invalid = false; }
  observe(current, { promotion = 'q', expectedMove = null } = {}) {
    this.removed |= this.previous & ~current & FULL;
    this.added |= ~this.previous & current & FULL;
    this.previous = current;
    if (current === this.base) { this.reset(); return { type: 'restored' }; }
    if (this.invalid) return { type: 'invalid', mask: current ^ this.base };
    const legal = this.chess.moves({ verbose: true });
    const candidates = legal.filter(m => {
      if (m.promotion && m.promotion !== promotion) return false;
      if (expectedMove && m.lan !== expectedMove) return false;
      if (!(this.removed & bit(m.from))) return false;
      if (m.captured && !m.flags.includes('e') && !(this.removed & bit(m.to))) return false;
      return occupancy(new Chess(m.after)) === current;
    });
    if (candidates.length === 1) {
      const m = candidates[0];
      const move = this.chess.move({ from: m.from, to: m.to, promotion: m.promotion });
      this.reset(); return { type: 'move', move };
    }
    // If all observed changes belong to a legal move, wait for its remaining steps.
    const pending = legal.some(m => {
      const after = occupancy(new Chess(m.after));
      const involved = (this.base ^ after) | bit(m.from) | bit(m.to);
      return ((this.removed | this.added) & ~involved & FULL) === 0n && (current & ~involved & FULL) === (this.base & ~involved & FULL);
    });
    if (pending && this.added === 0n) return { type: 'lifted', mask: this.removed };
    if (pending && legal.some(m => (m.flags.includes('k') || m.flags.includes('q') || m.flags.includes('e')) && ((this.removed | this.added) & ~((this.base ^ occupancy(new Chess(m.after))) | bit(m.from) | bit(m.to)) & FULL) === 0n)) return { type: 'pending', mask: current ^ this.base };
    this.invalid = true;
    return { type: 'invalid', mask: current ^ this.base };
  }
}
