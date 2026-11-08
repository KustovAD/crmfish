import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BalanceChart } from './components/BalanceChart';
import { BookmarkletCard } from './components/BookmarkletCard';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { ProductForm } from './components/ProductForm';
import { ProductTable } from './components/ProductTable';
import { SettingsPanel } from './components/SettingsPanel';
import { isSupabaseConfigured } from './config';
import { SetupScreen } from './components/SetupScreen';
import { useCrmData } from './hooks/useCrmData';
import { takeAddPayload } from './lib/bookmarklet';
import { buildChartData, computeMetrics } from './lib/calc';
import { englishOnly } from './lib/xianyu';
import type { Filters, Product, ProductInput, SortState } from './types';

export default function App() {
  return isSupabaseConfigured ? <Crm /> : <SetupScreen />;
}

function Crm() {
  const data = useCrmData();
  const { products, settings } = data;

  const [filters, setFilters] = useState<Filters>({ search: '', ordered: 'all', sold: 'all', original: 'all' });
  const [sort, setSort] = useState<SortState>({ key: 'createdAt', dir: 'desc' });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [prefill, setPrefill] = useState<Partial<ProductInput> | null>(null);

  // Данные от букмарклета «+ CRMFish»: открываем форму уже заполненной
  useEffect(() => {
    const p = takeAddPayload();
    if (!p) return;
    setEditing(null);
    setPrefill({
      url: p.url ?? '',
      title: englishOnly(p.title ?? ''),
      priceCny: Number(p.priceCny) || 0,
      imageUrl: p.imageUrl ?? '',
    });
    setFormOpen(true);
  }, []);

  // Все расчёты пересчитываются при любом изменении курса, цен и статусов
  const metrics = useMemo(() => computeMetrics(products, settings), [products, settings]);
  const chart = useMemo(() => buildChartData(products, settings.rate), [products, settings.rate]);

  const openAdd = () => {
    setEditing(null);
    setPrefill(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setPrefill(null);
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.08),transparent_60%)]">
      <Header onAdd={openAdd} />

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
        {data.error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{data.error}</span>
            <button onClick={data.dismissError} className="text-rose-300 hover:text-rose-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {data.loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Загрузка…
          </div>
        ) : (
          <>
            <Dashboard m={metrics} />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <BalanceChart data={chart} startCapital={settings.startCapital} />
              </div>
              <div className="space-y-4">
                <SettingsPanel settings={settings} onChange={data.updateSettings} />
                <section className="card p-4 text-sm">
                  <h3 className="mb-2 font-semibold text-slate-200">Сводка</h3>
                  <dl className="grid grid-cols-2 gap-y-1.5 text-slate-400">
                    <dt>Всего товаров</dt>
                    <dd className="num text-right text-slate-200">{metrics.counts.total}</dd>
                    <dt>Заказано</dt>
                    <dd className="num text-right text-slate-200">{metrics.counts.ordered}</dd>
                    <dt>Продано</dt>
                    <dd className="num text-right text-slate-200">{metrics.counts.sold}</dd>
                    <dt>Оригинал подтв.</dt>
                    <dd className="num text-right text-slate-200">{metrics.counts.original}</dd>
                  </dl>
                </section>
                <BookmarkletCard />
              </div>
            </div>

            <ProductTable
              products={products}
              rate={settings.rate}
              filters={filters}
              sort={sort}
              onFilters={setFilters}
              onSort={setSort}
              onEdit={openEdit}
              onDelete={(p) => data.deleteProduct(p.id)}
              onPatch={data.updateProduct}
            />
          </>
        )}

        <footer className="pb-6 pt-2 text-center text-xs text-slate-600">
          CRMFish · данные общие для всех пользователей
        </footer>
      </main>

      <ProductForm
        open={formOpen}
        initial={editing}
        prefill={prefill}
        rate={settings.rate}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => (editing ? data.updateProduct(editing.id, input) : data.addProduct(input))}
      />
    </div>
  );
}
