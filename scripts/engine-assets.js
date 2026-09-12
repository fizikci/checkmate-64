import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('public/engine', { recursive: true });
for (const ext of ['js', 'wasm']) await copyFile(`node_modules/stockfish/bin/stockfish-18-lite-single.${ext}`, `public/engine/stockfish.${ext}`);
await copyFile('node_modules/stockfish/Copying.txt', 'public/engine/COPYING.txt');
