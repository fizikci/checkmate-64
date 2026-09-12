import { spawn } from 'node:child_process';
import './engine-assets.js';
const children = [spawn(process.execPath, ['server/index.js'], { stdio: 'inherit' }), spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], { stdio: 'inherit' })];
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { children.forEach(c => c.kill()); process.exit(); });
children.forEach(c => c.on('exit', code => { children.forEach(other => other.kill()); process.exit(code || 0); }));
