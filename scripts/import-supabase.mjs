/**
 * Однократный перенос данных из Supabase во встроенную базу (data/crmfish.json).
 *
 *   npm run import:supabase -- https://xxxx.supabase.co sb_publishable_xxxx
 *
 * URL и ключ — те же, что были в Vercel (VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY).
 * Перед запуском остановите CRMFish (Ctrl + C), иначе запущенный сервер перезапишет файл.
 */
import { db, DB_FILE } from '../server/db.mjs';

const [url, key] = process.argv.slice(2);
if (!url || !key) {
  console.error('Использование: npm run import:supabase -- <SUPABASE_URL> <KEY>');
  process.exit(1);
}

async function get(table) {
  const res = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/${table}?select=*`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

const rows = await get('products');
const settingsRows = await get('settings').catch(() => []);

const products = rows
  .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  .map((r) => ({
    id: r.id,
    url: r.url ?? '',
    title: r.title ?? '',
    priceCny: Number(r.price_cny) || 0,
    deliveryRub: Number(r.delivery_rub) || 0,
    isOriginal: !!r.is_original,
    isOrdered: !!r.is_ordered,
    salePriceRub: Number(r.sale_price_rub) || 0,
    isSold: !!r.is_sold,
    createdAt: r.created_at,
    orderedAt: r.ordered_at,
    soldAt: r.sold_at,
  }));

const s = settingsRows[0];
const settings = s ? { startCapital: Number(s.start_capital) || 0, rate: Number(s.rate) || 11.5 } : undefined;

const had = db.get().products.length;
if (had > 0) console.log(`Внимание: в локальной базе было ${had} товаров — они заменены (копия: data/crmfish.backup.json).`);
db.replaceAll(products, settings);
console.log(`Перенесено товаров: ${products.length}${settings ? ', настройки тоже' : ''}.\nБаза: ${DB_FILE}`);
