/**
 * Букмарклет «+ CRMFish».
 *
 * Запускается на странице товара goofish.com в браузере пользователя.
 * Goofish блокирует запросы с серверов (RGV587_ERROR), но из вашего браузера,
 * с вашими куками, карточка товара отдаётся нормально.
 *
 * Что делает:
 *   1. Берёт id товара из адреса страницы.
 *   2. Запрашивает карточку тем же API, что и сам сайт (подпись md5 по токену из cookie).
 *   3. Если не вышло — достаёт название, фото и цену прямо со страницы.
 *   4. Открывает CRMFish с заполненной формой: https://<ваш-сайт>/#add=<данные>
 *
 * Функция ниже не должна обращаться ни к чему снаружи себя — она целиком
 * превращается в текст закладки через toString().
 */
function grab(app: string) {
  /* компактный md5 (проверен против crypto.createHash('md5')) */
  // prettier-ignore
  function md5(s: string): string {
    s = unescape(encodeURIComponent(s));
    const k: number[] = []; const r = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const h = [1732584193, -271733879, -1732584194, 271733878];
    let i = 0;
    for (; i < 64;) k[i] = 0 | (Math.abs(Math.sin(++i)) * 4294967296);
    const n = s.length; const l = ((n + 8) >> 6) + 1; const w: number[] = [];
    for (i = 0; i < l * 16; i++) w[i] = 0;
    for (i = 0; i < n; i++) w[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
    w[i >> 2] |= 128 << ((i % 4) * 8);
    w[l * 16 - 2] = n * 8;
    for (let j = 0; j < w.length; j += 16) {
      let a = h[0], b = h[1], c = h[2], d = h[3];
      for (i = 0; i < 64; i++) {
        let f: number, g: number; const q = i >> 4;
        if (q === 0) { f = (b & c) | (~b & d); g = i; }
        else if (q === 1) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (q === 2) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const t = d; d = c; c = b;
        const x = (a + f + k[i] + w[j + g]) | 0; const y = r[q * 4 + (i % 4)];
        b = (b + ((x << y) | (x >>> (32 - y)))) | 0; a = t;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    }
    let o = '';
    for (i = 0; i < 16; i++) o += ('0' + ((h[i >> 2] >>> ((i % 4) * 8)) & 255).toString(16)).slice(-2);
    return o;
  }

  const num = (v: unknown) => {
    const x = parseFloat(String(v ?? '').replace(/[^\d.]/g, ''));
    return x > 0 ? x : null;
  };

  async function run() {
    const id = (location.href.match(/[?&](?:id|itemId)=(\d{6,})/) || [])[1];
    if (!/goofish\.com|taobao\.com/.test(location.host) || !id) {
      alert('CRMFish: откройте страницу товара на goofish.com и нажмите закладку ещё раз');
      return;
    }
    let title = '';
    let price: number | null = null;
    let img = '';

    // 1. Карточка через API сайта (до 2 попыток: первая может только выдать токен)
    for (let attempt = 0; attempt < 2 && !title; attempt++) {
      try {
        const ck = (document.cookie.match(/(?:^|;\s*)_m_h5_tk=([^;]+)/) || [])[1] || '';
        const tk = ck.split('_')[0];
        const t = String(Date.now());
        const ak = '34839810';
        const api = 'mtop.taobao.idle.pc.detail';
        const data = JSON.stringify({ itemId: id });
        const qs = new URLSearchParams({
          jsv: '2.7.2', appKey: ak, t, sign: md5(tk + '&' + t + '&' + ak + '&' + data), v: '1.0',
          type: 'originaljson', accountSite: 'xianyu', dataType: 'json', timeout: '20000', api,
          sessionOption: 'AutoLoginOnly',
        });
        const res = await fetch('https://h5api.m.goofish.com/h5/' + api + '/1.0/?' + qs, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(data),
        });
        const j = await res.json();
        const it = j && j.data && j.data.itemDO;
        if (it) {
          title = it.title || it.desc || '';
          price = num(it.soldPrice) ?? num(it.defaultPrice);
          const u: string = ((it.imageInfos || []) as { url?: string }[]).map((x) => x.url || '').find(Boolean) || '';
          img = u.startsWith('//') ? 'https:' + u : u;
        }
      } catch {
        /* попробуем со страницы */
      }
    }

    // 2. Запасной вариант — со страницы
    if (!title) {
      const og = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
      title = (og && og.content) || document.title;
    }
    if (!img) {
      const best = Array.from(document.images)
        .filter((i) => /alicdn|goofish|taobao/.test(i.src) && i.naturalWidth >= 300)
        .sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)[0];
      if (best) img = best.src;
    }
    if (!price) {
      const m = document.body.innerText.match(/[¥￥]\s*(\d+(?:\.\d+)?)/);
      if (m) price = num(m[1]);
    }

    const payload = { url: 'https://www.goofish.com/item?id=' + id, title, priceCny: price, imageUrl: img };
    window.open(app + '/#add=' + encodeURIComponent(JSON.stringify(payload)), '_blank');
  }

  void run();
}

/** Текст закладки для текущего сайта CRMFish */
export function buildBookmarklet(origin: string): string {
  const code = `(${grab.toString()})(${JSON.stringify(origin)});`;
  return 'javascript:' + encodeURIComponent(code);
}

export interface AddPayload {
  url?: string;
  title?: string;
  priceCny?: number | null;
  imageUrl?: string;
}

/** Читает данные, переданные букмарклетом в адресе (#add=…), и очищает адрес */
export function takeAddPayload(): AddPayload | null {
  const m = window.location.hash.match(/^#add=(.+)$/);
  if (!m) return null;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  try {
    return JSON.parse(decodeURIComponent(m[1])) as AddPayload;
  } catch {
    return null;
  }
}
