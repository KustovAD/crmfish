/**
 * Запуск CRMFish со встроенной базой:  npm start
 * Отдаёт собранное приложение (папка dist) и API базы (data/crmfish.json).
 *
 * Порт можно сменить: PORT=8080 npm start
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './server/api.mjs';
import { DB_FILE } from './server/db.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 5173;

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('Нет собранного приложения. Выполните: npm run build');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  if (await handleApi(req, res)) return;

  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  let file = normalize(join(DIST, pathname));
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(DIST, 'index.html');
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': file.includes(`${join(DIST, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  res.end(readFileSync(file));
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${PORT}`);
  console.log(`\n  CRMFish запущен:  http://localhost:${PORT}`);
  if (lan.length) console.log(`  В локальной сети: ${lan.join(', ')}`);
  console.log(`  База:             ${DB_FILE}\n  Остановить:       Ctrl + C\n`);
});
