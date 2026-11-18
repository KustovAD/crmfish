/**
 * HTTP API встроенной базы. Подключается и к `npm run dev` (через плагин Vite),
 * и к `npm start` (server.mjs) — код один и тот же.
 *
 *   GET    /api/state            → { products, settings, version }
 *   POST   /api/products         ← товар          → товар
 *   PUT    /api/products/:id     ← поля товара    → товар
 *   DELETE /api/products/:id
 *   PUT    /api/settings         ← { startCapital, rate }
 *   GET    /api/events           → поток SSE: «данные изменились» (для других вкладок и устройств)
 */
import { db } from './db.mjs';

/** @type {Set<import('node:http').ServerResponse>} */
const listeners = new Set();

function broadcast() {
  const msg = `data: ${db.get().version}\n\n`;
  for (const res of listeners) res.write(msg);
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error('Слишком большой запрос');
  }
  return raw ? JSON.parse(raw) : {};
}

/**
 * Обрабатывает запрос, если он к /api. Возвращает true, если запрос обработан.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function handleApi(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/')) return false;
  const path = url.pathname.replace(/\/+$/, '');
  const method = req.method ?? 'GET';

  try {
    if (path === '/api/events' && method === 'GET') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
        connection: 'keep-alive',
      });
      res.write(`retry: 2000\ndata: ${db.get().version}\n\n`);
      listeners.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
      req.on('close', () => {
        clearInterval(ping);
        listeners.delete(res);
      });
      return true;
    }

    if (path === '/api/state' && method === 'GET') {
      send(res, 200, db.get());
      return true;
    }

    if (path === '/api/products' && method === 'POST') {
      const item = db.addProduct(await readJson(req));
      if (!item) return send(res, 409, { error: 'Товар с таким id уже есть' }), true;
      send(res, 201, item);
      broadcast();
      return true;
    }

    const m = path.match(/^\/api\/products\/([\w-]+)$/);
    if (m && method === 'PUT') {
      const item = db.updateProduct(m[1], await readJson(req));
      if (!item) return send(res, 404, { error: 'Товар не найден' }), true;
      send(res, 200, item);
      broadcast();
      return true;
    }
    if (m && method === 'DELETE') {
      db.deleteProduct(m[1]);
      send(res, 204);
      broadcast();
      return true;
    }

    if (path === '/api/settings' && method === 'PUT') {
      send(res, 200, db.saveSettings(await readJson(req)));
      broadcast();
      return true;
    }

    send(res, 404, { error: 'Нет такого адреса API' });
    return true;
  } catch (e) {
    send(res, 400, { error: e instanceof Error ? e.message : String(e) });
    return true;
  }
}
