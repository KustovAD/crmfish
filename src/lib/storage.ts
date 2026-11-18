import type { Product, Settings } from '../types';

/**
 * Хранилище CRMFish — встроенная база в папке проекта (data/crmfish.json).
 * Приложение обращается к ней через локальный API (/api/*), который
 * запускается вместе с `npm run dev` или `npm start`.
 */
export interface DataStore {
  loadProducts(): Promise<Product[]>;
  loadSettings(): Promise<Settings>;
  addProduct(p: Product): Promise<void>;
  updateProduct(p: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  saveSettings(s: Settings): Promise<void>;
  /** Подписка на изменения из других вкладок и устройств. Возвращает отписку. */
  subscribe(onChange: () => void): () => void;
}

interface DbState {
  products: Product[];
  settings: Settings;
  version: number;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    });
  } catch {
    throw new Error('нет связи с локальным сервером CRMFish — он запущен?');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `ошибка сервера ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

class LocalDbStore implements DataStore {
  /** Один запрос на пару loadProducts + loadSettings */
  private pending: Promise<DbState> | null = null;

  private state() {
    if (!this.pending) {
      this.pending = api<DbState>('/api/state').finally(() => {
        setTimeout(() => (this.pending = null), 0);
      });
    }
    return this.pending;
  }

  async loadProducts() {
    return (await this.state()).products;
  }
  async loadSettings() {
    return (await this.state()).settings;
  }
  async addProduct(p: Product) {
    await api('/api/products', { method: 'POST', body: JSON.stringify(p) });
  }
  async updateProduct(p: Product) {
    await api(`/api/products/${encodeURIComponent(p.id)}`, { method: 'PUT', body: JSON.stringify(p) });
  }
  async deleteProduct(id: string) {
    await api(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  async saveSettings(s: Settings) {
    await api('/api/settings', { method: 'PUT', body: JSON.stringify(s) });
  }
  subscribe(onChange: () => void) {
    const es = new EventSource('/api/events');
    let first = true;
    es.onmessage = () => {
      // первое сообщение приходит сразу при подключении — данные уже загружены
      if (first) {
        first = false;
        return;
      }
      onChange();
    };
    return () => es.close();
  }
}

export function createStore(): DataStore {
  return new LocalDbStore();
}
