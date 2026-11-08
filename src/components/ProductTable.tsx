import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Pencil, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { costRub, filterAndSort, isBought, profitRub } from '../lib/calc';
import { fmtCny, fmtDate, fmtRub, fmtRubSigned, shortUrl } from '../lib/format';
import type { Filters, Product, ProductInput, SortKey, SortState, TriFilter } from '../types';
import { Toggle } from './Toggle';

interface Props {
  products: Product[];
  rate: number;
  filters: Filters;
  sort: SortState;
  onFilters: (f: Filters) => void;
  onSort: (s: SortState) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onPatch: (id: string, patch: Partial<ProductInput>) => void;
}

function TriSelect({ label, value, onChange, yes, no }: { label: string; value: TriFilter; onChange: (v: TriFilter) => void; yes: string; no: string }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col sm:flex-none">
      <span className="label">{label}</span>
      <select className="input py-1.5 sm:w-40" value={value} onChange={(e) => onChange(e.target.value as TriFilter)}>
        <option value="all">Все</option>
        <option value="yes">{yes}</option>
        <option value="no">{no}</option>
      </select>
    </label>
  );
}

const profitCls = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-slate-400');

export function ProductTable({ products, rate, filters, sort, onFilters, onSort, onEdit, onDelete, onPatch }: Props) {
  const rows = useMemo(() => filterAndSort(products, filters, sort, rate), [products, filters, sort, rate]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (t, p) => ({
          cny: t.cny + p.priceCny,
          delivery: t.delivery + (p.deliveryRub || 0),
          cost: t.cost + costRub(p, rate),
          sale: t.sale + p.salePriceRub,
          profit: t.profit + profitRub(p, rate),
        }),
        { cny: 0, delivery: 0, cost: 0, sale: 0, profit: 0 },
      ),
    [rows, rate],
  );

  const SortTh = ({ k, children, right }: { k: SortKey; children: string; right?: boolean }) => {
    const active = sort.key === k;
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th className={`px-3 py-2.5 font-medium ${right ? 'text-right' : 'text-left'}`}>
        <button
          className={`inline-flex items-center gap-1 hover:text-slate-200 ${active ? 'text-cyan-300' : ''}`}
          onClick={() => onSort({ key: k, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' })}
        >
          {children}
          <Icon className="h-3 w-3" />
        </button>
      </th>
    );
  };

  const confirmDelete = (p: Product) => {
    if (window.confirm(`Удалить «${p.title}»?`)) onDelete(p);
  };

  return (
    <section className="card overflow-hidden">
      {/* Фильтры */}
      <div className="flex flex-col gap-3 border-b border-slate-800 p-4 lg:flex-row lg:items-end">
        <label className="flex-1">
          <span className="label">Поиск</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="input py-1.5 pl-9"
              placeholder="Название или ссылка…"
              value={filters.search}
              onChange={(e) => onFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </label>
        <div className="flex flex-wrap gap-3">
          <TriSelect label="Заказ" value={filters.ordered} yes="Заказано" no="Не заказано" onChange={(v) => onFilters({ ...filters, ordered: v })} />
          <TriSelect label="Продажа" value={filters.sold} yes="Продано" no="Не продано" onChange={(v) => onFilters({ ...filters, sold: v })} />
          <TriSelect label="Оригинал" value={filters.original} yes="Подтверждён" no="Не подтверждён" onChange={(v) => onFilters({ ...filters, original: v })} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">
          {products.length === 0 ? 'Товаров пока нет — добавьте первый.' : 'Ничего не найдено по фильтрам.'}
        </div>
      ) : (
        <>
          {/* Таблица — планшет и десктоп */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1060px] text-sm">
              <thead className="bg-slate-950/50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <SortTh k="title">Товар</SortTh>
                  <SortTh k="priceCny" right>¥</SortTh>
                  <SortTh k="deliveryRub" right>Доставка</SortTh>
                  <SortTh k="cost" right>Себест.</SortTh>
                  <SortTh k="salePriceRub" right>Продажа</SortTh>
                  <SortTh k="profit" right>Прибыль</SortTh>
                  <th className="px-3 py-2.5 text-center font-medium">Ориг.</th>
                  <th className="px-3 py-2.5 text-center font-medium">Заказ</th>
                  <th className="px-3 py-2.5 text-center font-medium">Продано</th>
                  <SortTh k="createdAt">Добавлен</SortTh>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {rows.map((p) => {
                  const profit = profitRub(p, rate);
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-800/30">
                      <td className="max-w-[280px] px-3 py-2.5">
                        <div className="truncate font-medium text-slate-100" title={p.title}>
                          {p.title}
                        </div>
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                          >
                            {shortUrl(p.url)} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="num px-3 py-2.5 text-right text-slate-300">{fmtCny(p.priceCny)}</td>
                      <td className="num px-3 py-2.5 text-right text-slate-300">{fmtRub(p.deliveryRub || 0)}</td>
                      <td className="num px-3 py-2.5 text-right">{fmtRub(costRub(p, rate))}</td>
                      <td className="num px-3 py-2.5 text-right">{fmtRub(p.salePriceRub)}</td>
                      <td className={`num px-3 py-2.5 text-right font-semibold ${profitCls(profit)}`}>{fmtRubSigned(profit)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Toggle size="sm" color="violet" ariaLabel="Оригинал" checked={p.isOriginal} onChange={(v) => onPatch(p.id, { isOriginal: v })} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Toggle size="sm" ariaLabel="Заказано" checked={isBought(p)} onChange={(v) => onPatch(p.id, { isOrdered: v })} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Toggle size="sm" color="emerald" ariaLabel="Продано" checked={p.isSold} onChange={(v) => onPatch(p.id, { isSold: v })} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{fmtDate(p.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100" onClick={() => onEdit(p)} title="Редактировать">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => confirmDelete(p)} title="Удалить">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-700 bg-slate-950/40 text-sm font-semibold">
                <tr>
                  <td className="px-3 py-2.5 text-slate-400">Итого: {rows.length}</td>
                  <td className="num px-3 py-2.5 text-right text-slate-300">{fmtCny(totals.cny)}</td>
                  <td className="num px-3 py-2.5 text-right text-slate-300">{fmtRub(totals.delivery)}</td>
                  <td className="num px-3 py-2.5 text-right">{fmtRub(totals.cost)}</td>
                  <td className="num px-3 py-2.5 text-right">{fmtRub(totals.sale)}</td>
                  <td className={`num px-3 py-2.5 text-right ${profitCls(totals.profit)}`}>{fmtRubSigned(totals.profit)}</td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Карточки — телефон */}
          <ul className="divide-y divide-slate-800 md:hidden">
            {rows.map((p) => {
              const profit = profitRub(p, rate);
              return (
                <li key={p.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium">
                        {p.isOriginal && <ShieldCheck className="h-4 w-4 shrink-0 text-violet-400" />}
                        <span className="truncate">{p.title}</span>
                      </div>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-400">
                          {shortUrl(p.url)} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className={`num shrink-0 font-semibold ${profitCls(profit)}`}>{fmtRubSigned(profit)}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><div className="text-slate-500">Цена</div><div className="num">{fmtCny(p.priceCny)}</div></div>
                    <div><div className="text-slate-500">Доставка</div><div className="num">{fmtRub(p.deliveryRub || 0)}</div></div>
                    <div><div className="text-slate-500">Себест.</div><div className="num">{fmtRub(costRub(p, rate))}</div></div>
                    <div><div className="text-slate-500">Продажа</div><div className="num">{fmtRub(p.salePriceRub)}</div></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Toggle size="sm" color="violet" checked={p.isOriginal} onChange={(v) => onPatch(p.id, { isOriginal: v })} onText="Оригинал" offText="Оригинал" />
                    <Toggle size="sm" checked={isBought(p)} onChange={(v) => onPatch(p.id, { isOrdered: v })} onText="Заказано" offText="Заказано" />
                    <Toggle size="sm" color="emerald" checked={p.isSold} onChange={(v) => onPatch(p.id, { isSold: v })} onText="Продано" offText="Продано" />
                    <div className="ml-auto flex gap-1">
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800" onClick={() => onEdit(p)}><Pencil className="h-4 w-4" /></button>
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => confirmDelete(p)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
