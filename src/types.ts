/** Товар, купленный (или планируемый к покупке) на Goofish */
export interface Product {
  id: string;
  /** Ссылка на товар на Goofish */
  url: string;
  /** Название / краткое описание */
  title: string;
  /** Ссылка на фото товара */
  imageUrl: string;
  /** Стоимость в юанях, ¥ */
  priceCny: number;
  /** Стоимость доставки, ₽ (до получателя) */
  deliveryRub: number;
  /** Оригинал подтверждён */
  isOriginal: boolean;
  /** Заказано */
  isOrdered: boolean;
  /** Примерная цена продажи, ₽ */
  salePriceRub: number;
  /** Продано */
  isSold: boolean;
  /** Дата добавления (ISO), ставится автоматически */
  createdAt: string;
  /** Когда товар отмечен заказанным (ISO), ставится автоматически */
  orderedAt: string | null;
  /** Когда товар отмечен проданным (ISO), ставится автоматически */
  soldAt: string | null;
}

/** Поля, которые пользователь вводит в форме */
export type ProductInput = Pick<
  Product,
  'url' | 'title' | 'imageUrl' | 'priceCny' | 'deliveryRub' | 'isOriginal' | 'isOrdered' | 'salePriceRub' | 'isSold'
>;

/** Глобальные настройки — общие для всех пользователей */
export interface Settings {
  /** Стартовый капитал, ₽ */
  startCapital: number;
  /** Курс: сколько ₽ за 1 ¥ */
  rate: number;
}

export const DEFAULT_SETTINGS: Settings = { startCapital: 100_000, rate: 11.5 };

export type TriFilter = 'all' | 'yes' | 'no';

export interface Filters {
  search: string;
  ordered: TriFilter;
  sold: TriFilter;
  original: TriFilter;
}

export type SortKey = 'title' | 'priceCny' | 'deliveryRub' | 'cost' | 'salePriceRub' | 'profit' | 'createdAt';
export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}
