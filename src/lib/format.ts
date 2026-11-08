const rub = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const cny = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const rate = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' });

export const fmtRub = (v: number) => rub.format(Math.round(v));
export const fmtRubSigned = (v: number) => (v > 0 ? '+' : '') + rub.format(Math.round(v));
export const fmtCny = (v: number) => `${cny.format(v)} ¥`;
export const fmtRate = (v: number) => rate.format(v);
export const fmtDate = (iso: string) => dateFmt.format(new Date(iso));
export const fmtDay = (iso: string) => dayFmt.format(new Date(iso));

/** Парсинг числа из инпута: допускает запятую и пробелы */
export function parseNum(raw: string): number {
  const n = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** UUID v4 — работает и вне secure context (например, по http в локальной сети) */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* fallthrough */
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
