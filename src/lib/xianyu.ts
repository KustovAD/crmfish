/**
 * Разбор ссылок и текста «Поделиться» из Xianyu (Goofish).
 * Пример входа:
 *   【闲鱼】https://m.tb.cn/h.jT0JmLB?tk=d5Yw60pX13X CZ007 「快来捡漏【正品Nike Air Force Max，42.5码，货号A】」 点击链接直接打开
 */

export interface ParsedItem {
  /** Ссылка на товар (по возможности — прямая на goofish.com) */
  url: string | null;
  /** Название — только английские слова */
  title: string;
  /** Цена в юанях — только число */
  priceCny: number | null;
  /** Ссылка на фото */
  imageUrl: string | null;
  /** Пояснение, если что-то не удалось получить */
  warning?: string;
}

/** Первая ссылка из произвольного текста */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s「」【】<>"'，。、]+/i);
  return m ? m[0] : null;
}

/** Название из текста «Поделиться»: содержимое 「…」, а внутри — 【…】, если есть */
export function extractShareTitle(text: string): string {
  const quoted = text.match(/「([^」]+)」/)?.[1];
  if (!quoted) return '';
  return quoted.match(/【([^】]+)】/)?.[1] ?? quoted;
}

/**
 * Оставляет только английскую часть названия.
 * «正品Nike Air Force Max，42.5码，货号A» → «Nike Air Force Max»
 * Берутся фрагменты латиницей (с цифрами внутри: «Air Max 90», «GA-2100»),
 * отбрасываются чистые числа и одиночные буквы.
 */
export function englishOnly(raw: string): string {
  const s = raw.normalize('NFKC'); // полноширинные Ｎｉｋｅ → Nike
  const runs = s.match(/[A-Za-z0-9][A-Za-z0-9 .'&+\-/]*/g) ?? [];
  return runs
    .map((r) => r.trim().replace(/[\s\-/.&+]+$/, ''))
    .filter((r) => (r.match(/[A-Za-z]/g)?.length ?? 0) >= 2)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Выглядит ли ввод как ссылка/текст из Xianyu, который стоит разобрать */
export function looksLikeXianyu(text: string): boolean {
  return /m\.tb\.cn|goofish\.com|2\.taobao\.com|闲鱼|xianyu|idle/i.test(text);
}

/** Разбор только по тексту — работает без сервера */
export function parseShareText(text: string): ParsedItem {
  return {
    url: extractUrl(text),
    title: englishOnly(extractShareTitle(text)),
    priceCny: null,
    imageUrl: null,
  };
}

/**
 * Полный разбор: текст + серверная функция /api/parse (фото и цена с Goofish).
 * Если сервер недоступен (например, локальный npm run dev) — вернёт то, что есть в тексте.
 */
export async function parseXianyu(text: string): Promise<ParsedItem> {
  const local = parseShareText(text);
  try {
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const r = (await res.json()) as Partial<ParsedItem>;
      return {
        url: r.url || local.url,
        title: r.title || local.title,
        priceCny: typeof r.priceCny === 'number' && r.priceCny > 0 ? r.priceCny : null,
        imageUrl: r.imageUrl || null,
        warning: r.warning,
      };
    }
  } catch {
    /* сервер недоступен */
  }
  return {
    ...local,
    warning: 'Сервер разбора недоступен (работает только на Vercel) — заполнены ссылка и название',
  };
}
