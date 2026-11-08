import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyPatch } from '../lib/calc';
import { uid } from '../lib/format';
import { createStore } from '../lib/storage';
import { DEFAULT_SETTINGS, type Product, type ProductInput, type Settings } from '../types';

const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e);

/** Вся работа с данными: загрузка, оптимистичные обновления, realtime-синхронизация */
export function useCrmData() {
  const store = useMemo(() => createStore(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout>>();
  const productsRef = useRef<Product[]>([]);
  productsRef.current = products;

  const reload = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([store.loadProducts(), store.loadSettings()]);
      setProducts(p);
      // не перетираем настройки, пока ждём сохранения локальной правки
      if (!settingsTimer.current) setSettings(s);
      setError(null);
    } catch (e) {
      setError(`Не удалось загрузить данные: ${errMsg(e)}`);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void reload();
    let t: ReturnType<typeof setTimeout> | undefined;
    const unsub = store.subscribe(() => {
      clearTimeout(t);
      t = setTimeout(() => void reload(), 300);
    });
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, [store, reload]);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e) {
        setError(`Ошибка сохранения: ${errMsg(e)}`);
        void reload();
      }
    },
    [reload],
  );

  const addProduct = useCallback(
    (input: ProductInput) => {
      const now = new Date().toISOString();
      const isOrdered = input.isOrdered || input.isSold;
      const p: Product = {
        ...input,
        id: uid(),
        isOrdered,
        createdAt: now,
        orderedAt: isOrdered ? now : null,
        soldAt: input.isSold ? now : null,
      };
      setProducts((prev) => [p, ...prev]);
      void run(() => store.addProduct(p));
    },
    [run, store],
  );

  const updateProduct = useCallback(
    (id: string, patch: Partial<ProductInput>) => {
      const prev = productsRef.current.find((p) => p.id === id);
      if (!prev) return;
      const next = applyPatch(prev, patch);
      setProducts((list) => list.map((p) => (p.id === id ? next : p)));
      void run(() => store.updateProduct(next));
    },
    [run, store],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      setProducts((list) => list.filter((p) => p.id !== id));
      void run(() => store.deleteProduct(id));
    },
    [run, store],
  );

  /** Мгновенно пересчитывает интерфейс, а в хранилище пишет с задержкой */
  const updateSettings = useCallback(
    (s: Settings) => {
      setSettings(s);
      clearTimeout(settingsTimer.current);
      settingsTimer.current = setTimeout(() => {
        settingsTimer.current = undefined;
        void run(() => store.saveSettings(s));
      }, 500);
    },
    [run, store],
  );

  return {
    products,
    settings,
    loading,
    error,
    dismissError: () => setError(null),
    addProduct,
    updateProduct,
    deleteProduct,
    updateSettings,
  };
}
