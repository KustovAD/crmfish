import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import { DEFAULT_SETTINGS, type Product, type Settings } from '../types';

/** Интерфейс хранилища (реализация — Supabase, общая база для всех) */
export interface DataStore {
  loadProducts(): Promise<Product[]>;
  loadSettings(): Promise<Settings>;
  addProduct(p: Product): Promise<void>;
  updateProduct(p: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  saveSettings(s: Settings): Promise<void>;
  /** Подписка на изменения от других пользователей. Возвращает отписку. */
  subscribe(onChange: () => void): () => void;
}

/* ============================ Supabase ============================ */

interface ProductRow {
  id: string;
  url: string;
  title: string;
  image_url: string | null;
  price_cny: number | string;
  delivery_rub: number | string | null;
  is_original: boolean;
  is_ordered: boolean;
  sale_price_rub: number | string;
  is_sold: boolean;
  created_at: string;
  ordered_at: string | null;
  sold_at: string | null;
}

const fromRow = (r: ProductRow): Product => ({
  id: r.id,
  url: r.url ?? '',
  title: r.title ?? '',
  imageUrl: r.image_url ?? '',
  priceCny: Number(r.price_cny) || 0,
  deliveryRub: Number(r.delivery_rub) || 0,
  isOriginal: !!r.is_original,
  isOrdered: !!r.is_ordered,
  salePriceRub: Number(r.sale_price_rub) || 0,
  isSold: !!r.is_sold,
  createdAt: r.created_at,
  orderedAt: r.ordered_at,
  soldAt: r.sold_at,
});

const toRow = (p: Product): ProductRow => ({
  id: p.id,
  url: p.url,
  title: p.title,
  image_url: p.imageUrl || null,
  price_cny: p.priceCny,
  delivery_rub: p.deliveryRub,
  is_original: p.isOriginal,
  is_ordered: p.isOrdered,
  sale_price_rub: p.salePriceRub,
  is_sold: p.isSold,
  created_at: p.createdAt,
  ordered_at: p.orderedAt,
  sold_at: p.soldAt,
});

class SupabaseStore implements DataStore {
  private db: SupabaseClient;

  constructor() {
    this.db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async loadProducts() {
    const { data, error } = await this.db.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data as ProductRow[]).map(fromRow);
  }

  async loadSettings() {
    const { data, error } = await this.db.from('settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (!data) return DEFAULT_SETTINGS;
    return { startCapital: Number(data.start_capital) || 0, rate: Number(data.rate) || DEFAULT_SETTINGS.rate };
  }

  async addProduct(p: Product) {
    const { error } = await this.db.from('products').insert(toRow(p));
    if (error) throw error;
  }

  async updateProduct(p: Product) {
    const { error } = await this.db.from('products').update(toRow(p)).eq('id', p.id);
    if (error) throw error;
  }

  async deleteProduct(id: string) {
    const { error } = await this.db.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async saveSettings(s: Settings) {
    const { error } = await this.db
      .from('settings')
      .upsert({ id: 1, start_capital: s.startCapital, rate: s.rate, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  subscribe(onChange: () => void) {
    const channel = this.db
      .channel('crmfish-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, onChange)
      .subscribe();
    return () => {
      void this.db.removeChannel(channel);
    };
  }
}

export function createStore(): DataStore {
  if (!isSupabaseConfigured) throw new Error('Supabase не настроен: задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
  return new SupabaseStore();
}
