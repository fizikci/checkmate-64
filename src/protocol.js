export const START = 0xffff00000000ffffn;
export const FULL = (1n << 64n) - 1n;
export const square = i => 'abcdefgh'[i % 8] + (Math.floor(i / 8) + 1);
export const index = s => 'abcdefgh'.indexOf(s[0]) + (Number(s[1]) - 1) * 8;
export const bit = s => 1n << BigInt(typeof s === 'number' ? s : index(s));
export const hex = n => '0x' + n.toString(16).toUpperCase().padStart(16, '0');
export function parseMask(s) { if (typeof s !== 'string' || !/^0x[0-9a-fA-F]{16}$/.test(s)) throw new Error('64-bit hex bekleniyor'); return BigInt(s); }
export function occupancy(chess) { return chess.board().flat().reduce((m, p) => p ? m | bit(p.square) : m, 0n); }
export function validate(message) {
  if (!message || typeof message !== 'object') throw new Error('Mesaj geçersiz');
  if (message.event === 'board_state') { parseMask(message.data?.state); if (!Number.isSafeInteger(message.data.timestamp) || message.data.timestamp < 0) throw new Error('Zaman damgası geçersiz'); }
  else if (message.cmd === 'set_leds') { parseMask(message.data?.mask); if (!/^#[0-9a-fA-F]{6}$/.test(message.data.color) || !['solid','blink','clear'].includes(message.data.mode)) throw new Error('LED komutu geçersiz'); }
  else throw new Error('Bilinmeyen mesaj');
  return message;
}
