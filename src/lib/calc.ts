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
  date: string; // ISO (начало дня)
  label: string;
  balance: number;
  change: number;
}

/**
 * Накопленный баланс по датам.
 * Заказ товара: −себестоимость (на дату заказа, иначе — дату добавления).
 * Продажа:      +цена продажи (на дату продажи, иначе — дату добавления).
 */
export function buildChartData(products: Product[], rate: number): ChartPoint[] {
  const byDay = new Map<string, number>();
  const add = (iso: string, delta: number) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    byDay.set(key, (byDay.get(key) ?? 0) + delta);
  };

  for (const p of products) {
    if (!isBought(p)) continue;
    add(p.orderedAt ?? p.createdAt, -costRub(p, rate));
    if (p.isSold) add(p.soldAt ?? p.orderedAt ?? p.createdAt, p.salePriceRub);
  }

  const days = [...byDay.keys()].sort();
  if (days.length === 0) return [];

  const dayLabel = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' });
  const start = new Date(days[0]);
  start.setDate(start.getDate() - 1);
  const points: ChartPoint[] = [
    { date: start.toISOString(), label: dayLabel.format(start), balance: 0, change: 0 },
  ];
  let acc = 0;
  for (const day of days) {
    const change = byDay.get(day)!;
    acc += change;
    points.push({ date: day, label: dayLabel.format(new Date(day)), balance: Math.round(acc), change: Math.round(change) });
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
