/**
 * POST /api/parse  { text: string }  →  { url, itemId, title, priceCny, imageUrl, warning? }
 *
 * 1. Достаёт ссылку из текста «Поделиться» Xianyu.
 * 2. Раскрывает короткую ссылку m.tb.cn и находит id товара.
 * 3. Запрашивает карточку товара через публичный веб-API Goofish (mtop.taobao.idle.pc.detail).
 *
 * Goofish защищается от ботов и может временно отказать — тогда возвращаем то,
 * что удалось извлечь из самого текста (ссылку и название), с пояснением в warning.
 * Функция закрыта паролем вместе с сайтом (middleware.ts).
 */
import { createHash } from 'node:crypto';

export const config = { maxDuration: 20 };

const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const APP_KEY = '34839810';
const API = 'mtop.taobao.idle.pc.detail';

/* ---------- разбор текста (та же логика, что в src/lib/xianyu.ts) ---------- */

function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s「」【】<>"'，。、]+/i);
  return m ? m[0] : null;
}

function extractShareTitle(text: string): string {
  const quoted = text.match(/「([^」]+)」/)?.[1];
  if (!quoted) return '';
  return quoted.match(/【([^】]+)】/)?.[1] ?? quoted;
}

function englishOnly(raw: string): string {
  const s = raw.normalize('NFKC');
  const runs = s.match(/[A-Za-z0-9][A-Za-z0-9 .'&+\-/]*/g) ?? [];
  return runs
    .map((r) => r.trim().replace(/[\s\-/.&+]+$/, ''))
    .filter((r) => (r.match(/[A-Za-z]/g)?.length ?? 0) >= 2)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- id товара ---------- */

function findItemId(s: string): string | null {
  let text = s;
  // ссылки внутри HTML бывают экранированы
  text = text.replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
  try {
    text += ' ' + decodeURIComponent(text);
  } catch {
    /* ignore */
  }
  const m = text.match(/[?&](?:itemId|item_id|id)=(\d{6,})/);
  return m ? m[1] : null;
}

/** Раскрывает короткую ссылку (до 5 переходов) и ищет id в адресах и HTML */
async function resolveItemId(url: string): Promise<string | null> {
  const direct = findItemId(url);
  if (direct && !/m\.tb\.cn/.test(url)) return direct;

  let current = url;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(current, {
      redirect: 'manual',
      headers: { 'user-agent': UA_MOBILE, 'accept-language': 'zh-CN,zh;q=0.9' },
    });
    const location = res.headers.get('location');
    if (location) {
      current = new URL(location, current).toString();
      const id = findItemId(current);
      if (id) return id;
      continue;
    }
    const html = await res.text();
    // m.tb.cn отдаёт страницу со скриптом вида: var url = 'https://...id=123...';
    const jsUrl = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/)?.[1];
    return findItemId(jsUrl ?? '') ?? findItemId(html);
  }
  return null;
}

/* ---------- запрос к API Goofish ---------- */

const md5 = (s: string) => createHash('md5').update(s).digest('hex');

function readCookies(res: Response): Record<string, string> {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  const list = typeof h.getSetCookie === 'function' ? h.getSetCookie() : (res.headers.get('set-cookie') ?? '').split(/,(?=\s*\w+=)/);
  const out: Record<string, string> = {};
  for (const c of list) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return out;
}

interface MtopResult {
  ret?: string[];
  data?: {
    itemDO?: {
      title?: string;
      desc?: string;
      soldPrice?: string | number;
      defaultPrice?: string | number;
      imageInfos?: { url?: string }[];
    };
  };
}

async function callDetail(itemId: string, cookies: Record<string, string>) {
  const data = JSON.stringify({ itemId });
  const token = (cookies._m_h5_tk ?? '').split('_')[0];
  const t = Date.now().toString();
  const sign = md5(`${token}&${t}&${APP_KEY}&${data}`);
  const qs = new URLSearchParams({
    jsv: '2.7.2',
    appKey: APP_KEY,
    t,
    sign,
    v: '1.0',
    type: 'originaljson',
    accountSite: 'xianyu',
    dataType: 'json',
    timeout: '20000',
    api: API,
    sessionOption: 'AutoLoginOnly',
  });
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  const res = await fetch(`https://h5api.m.goofish.com/h5/${API}/1.0/?${qs}`, {
    method: 'POST',
    headers: {
      'user-agent': UA_DESKTOP,
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://www.goofish.com',
      referer: 'https://www.goofish.com/',
      accept: 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: `data=${encodeURIComponent(data)}`,
  });
  const json = (await res.json()) as MtopResult;
  return { json, cookies: { ...cookies, ...readCookies(res) } };
}

/** Первый запрос выдаёт токен в cookie (_m_h5_tk), второй — уже подписанный */
async function fetchDetail(itemId: string) {
  let { json, cookies } = await callDetail(itemId, {});
  if (!json.ret?.[0]?.startsWith('SUCCESS') && cookies._m_h5_tk) {
    ({ json } = await callDetail(itemId, cookies));
  }
  return json;
}

const toNumber = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const absUrl = (u?: string) => (!u ? null : u.startsWith('//') ? `https:${u}` : u);

/* ---------- обработчик ---------- */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export async function POST(request: Request): Promise<Response> {
  let text = '';
  try {
    text = String(((await request.json()) as { text?: unknown }).text ?? '');
  } catch {
    return json({ error: 'Ожидается JSON { text }' }, 400);
  }

  const link = extractUrl(text);
  const result = {
    url: link,
    itemId: null as string | null,
    title: englishOnly(extractShareTitle(text)),
    priceCny: null as number | null,
    imageUrl: null as string | null,
    warning: undefined as string | undefined,
  };

  if (!link) return json({ ...result, warning: 'В тексте не найдена ссылка' });

  try {
    const itemId = await resolveItemId(link);
    if (!itemId) return json({ ...result, warning: 'Не удалось определить товар по ссылке — фото и цену введите вручную' });

    result.itemId = itemId;
    result.url = `https://www.goofish.com/item?id=${itemId}`;

    const detail = await fetchDetail(itemId);
    const item = detail.data?.itemDO;
    if (!detail.ret?.[0]?.startsWith('SUCCESS') || !item) {
      const reason = detail.ret?.[0] ?? 'нет ответа';
      return json({
        ...result,
        warning: `Goofish не отдал карточку (${reason.split('::')[0]}) — фото и цену введите вручную`,
      });
    }

    const apiTitle = englishOnly(item.title ?? '') || englishOnly(item.desc ?? '');
    result.title = apiTitle || result.title;
    result.priceCny = toNumber(item.soldPrice) ?? toNumber(item.defaultPrice);
    result.imageUrl = absUrl(item.imageInfos?.find((i) => i.url)?.url);
    if (!result.title) result.warning = 'В названии нет английских слов — впишите название вручную';
    return json(result);
  } catch (e) {
    return json({ ...result, warning: `Ошибка запроса к Goofish: ${e instanceof Error ? e.message : String(e)}` });
  }
}
