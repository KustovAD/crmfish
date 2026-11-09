import type { Filters, Product, Settings, SortState, TriFilter } from '../types';

/** Цена товара в ₽ = ¥ × курс */
export const itemRub = (p: Product, rate: number) => p.priceCny * rate;

/** Себестоимость в ₽ = ¥ × курс + доставка */
export const costRub = (p: Product, rate: number) => itemRub(p, rate) + (p.deliveryRub || 0);

/** Прибыль = цена продажи − себестоимость */
export const profitRub = (p: Product, rate: number) => p.salePriceRub - costRub(p, rate);

/** Товар считается купленным, если заказан или уже продан */
export const isBought = (p: Product) => p.isOrdered || p.isSold;

export interface Metrics {
  startCapital: number;
  /** Вложено в заказанные товары (с доставкой), ₽ */
  invested: number;
  /** Из них на доставку, ₽ */
  delivery: number;
  /** Выручка от проданных, ₽ */
  revenue: number;
  /** Общий баланс операций: выручка − вложения */
  balance: number;
  /** Свободный остаток: капитал + баланс */
  free: number;
  /** Зафиксированная прибыль по проданным */
  realizedProfit: number;
  /** Ожидаемая прибыль по заказанным, но ещё не проданным */
  pendingProfit: number;
  /** Деньги, «замороженные» в непроданных заказах */
  inStock: number;
  rate: number;
  counts: { total: number; ordered: number; sold: number; original: number };
}

export function computeMetrics(products: Product[], s: Settings): Metrics {
  let invested = 0;
  let delivery = 0;
  let revenue = 0;
  let realizedProfit = 0;
  let pendingProfit = 0;
  let inStock = 0;
  let ordered = 0;
  let sold = 0;
  let original = 0;

  for (const p of products) {
    const cost = costRub(p, s.rate);
    if (p.isOriginal) original++;
    if (isBought(p)) {
      ordered++;
      invested += cost;
      delivery += p.deliveryRub || 0;
      if (p.isSold) {
        sold++;
        revenue += p.salePriceRub;
        realizedProfit += p.salePriceRub - cost;
      } else {
        inStock += cost;
        pendingProfit += p.salePriceRub - cost;
      }
    }
  }

  const balance = revenue - invested;
  return {
    startCapital: s.startCapital,
    invested,
    delivery,
    revenue,
    balance,
    free: s.startCapital + balance,
    realizedProfit,
    pendingProfit,
    inStock,
    rate: s.rate,
    counts: { total: products.length, ordered, sold, original },
  };
}

export interface ChartPoint {
  /** Время события, мс */
  ts: number;
  /** Накопленный баланс после события, ₽ */
  balance: number;
  /** Изменение баланса этим событием, ₽ */
  change: number;
  /** Что произошло: «Заказ» / «Продажа» / «Старт» */
  kind: 'start' | 'order' | 'sale';
  /** Название товара */
  title: string;
}

/**
 * Накопленный баланс: каждое событие — отдельная точка со своим временем.
 * Заказ товара: −себестоимость (в момент заказа, иначе — добавления).
 * Продажа:      +цена продажи (в момент продажи).
 */
export function buildChartData(products: Product[], rate: number): ChartPoint[] {
  const events: Omit<ChartPoint, 'balance'>[] = [];
  for (const p of products) {
    if (!isBought(p)) continue;
    const orderTs = new Date(p.orderedAt ?? p.createdAt).getTime();
    events.push({ ts: orderTs, change: -costRub(p, rate), kind: 'order', title: p.title });
    if (p.isSold) {
      // продажа не может быть раньше заказа
      const saleTs = Math.max(new Date(p.soldAt ?? p.orderedAt ?? p.createdAt).getTime(), orderTs + 1);
      events.push({ ts: saleTs, change: p.salePriceRub, kind: 'sale', title: p.title });
    }
  }
  if (events.length === 0) return [];
  events.sort((a, b) => a.ts - b.ts);

  const first = events[0].ts;
  const last = events[events.length - 1].ts;
  // стартовая точка чуть раньше первого события (5% диапазона, минимум минута)
  const pad = Math.max((last - first) * 0.05, 60_000);
  const points: ChartPoint[] = [{ ts: first - pad, balance: 0, change: 0, kind: 'start', title: '' }];
  let acc = 0;
  for (const e of events) {
    acc += e.change;
    points.push({ ...e, balance: Math.round(acc), change: Math.round(e.change) });
  }
  return points;
}

const matchTri = (f: TriFilter, v: boolean) => f === 'all' || (f === 'yes' ? v : !v);

export function filterAndSort(products: Product[], f: Filters, sort: SortState, rate: number): Product[] {
  const q = f.search.trim().toLowerCase();
  const list = products.filter(
    (p) =>
      matchTri(f.ordered, isBought(p)) &&
      matchTri(f.sold, p.isSold) &&
      matchTri(f.original, p.isOriginal) &&
      (!q || p.title.toLowerCase().includes(q) || p.url.toLowerCase().includes(q)),
  );

  const val = (p: Product): number | string => {
    switch (sort.key) {
      case 'title':
        return p.title.toLowerCase();
      case 'priceCny':
        return p.priceCny;
      case 'deliveryRub':
        return p.deliveryRub || 0;
      case 'cost':
        return costRub(p, rate);
      case 'salePriceRub':
        return p.salePriceRub;
      case 'profit':
        return profitRub(p, rate);
      case 'createdAt':
        return p.createdAt;
    }
  };
  const k = sort.dir === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    return (va < vb ? -1 : va > vb ? 1 : 0) * k;
  });
}

/** Применяет изменения к товару, поддерживая согласованность статусов и дат */
export function applyPatch(prev: Product, patch: Partial<Product>): Product {
  const next: Product = { ...prev, ...patch };
  if (patch.isSold === true) next.isOrdered = true; // продано ⇒ заказано
  if (patch.isOrdered === false) next.isSold = false; // отменили заказ ⇒ не продано
  const now = new Date().toISOString();
  next.orderedAt = next.isOrdered ? prev.orderedAt ?? now : null;
  next.soldAt = next.isSold ? prev.soldAt ?? now : null;
  return next;
}
