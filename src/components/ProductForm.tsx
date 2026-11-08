import { X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { extractUrl, fmtRub, fmtRubSigned, parseNum } from '../lib/format';
import type { Product, ProductInput } from '../types';
import { Toggle } from './Toggle';

interface Props {
  open: boolean;
  initial?: Product | null;
  rate: number;
  onClose: () => void;
  onSubmit: (data: ProductInput) => void;
}

interface Draft {
  url: string;
  title: string;
  priceCny: string;
  deliveryRub: string;
  salePriceRub: string;
  isOriginal: boolean;
  isOrdered: boolean;
  isSold: boolean;
}

const empty: Draft = {
  url: '',
  title: '',
  priceCny: '',
  deliveryRub: '',
  salePriceRub: '',
  isOriginal: false,
  isOrdered: false,
  isSold: false,
};

export function ProductForm({ open, initial, rate, onClose, onSubmit }: Props) {
  const [d, setD] = useState<Draft>(empty);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setD(
      initial
        ? {
            url: initial.url,
            title: initial.title,
            priceCny: String(initial.priceCny),
            deliveryRub: initial.deliveryRub ? String(initial.deliveryRub) : '',
            salePriceRub: String(initial.salePriceRub),
            isOriginal: initial.isOriginal,
            isOrdered: initial.isOrdered,
            isSold: initial.isSold,
          }
        : empty,
    );
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const cny = parseNum(d.priceCny);
  const sale = parseNum(d.salePriceRub);
  const delivery = parseNum(d.deliveryRub);
  const item = cny * rate;
  const cost = item + delivery;
  const profit = sale - cost;

  const urlValid = !d.url.trim() || /^https?:\/\/\S+$/i.test(d.url.trim());
  const errors = {
    title: !d.title.trim() ? 'Укажите название' : null,
    url: !urlValid ? 'Ссылка должна начинаться с http(s)://' : null,
    priceCny: cny <= 0 ? 'Цена в юанях должна быть больше 0' : null,
    deliveryRub: delivery < 0 ? 'Доставка не может быть отрицательной' : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    onSubmit({
      url: extractUrl(d.url) ?? d.url.trim(),
      title: d.title.trim(),
      priceCny: cny,
      deliveryRub: delivery,
      salePriceRub: sale,
      isOriginal: d.isOriginal,
      isOrdered: d.isOrdered || d.isSold,
      isSold: d.isSold,
    });
    onClose();
  };

  const err = (k: keyof typeof errors) =>
    touched && errors[k] ? <p className="mt-1 text-xs text-rose-400">{errors[k]}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? 'Редактировать товар' : 'Новый товар'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="label">Ссылка на Goofish</span>
            <input
              className="input"
              value={d.url}
              placeholder="Вставьте ссылку или сообщение из Xianyu целиком"
              onChange={(e) => set('url', extractUrl(e.target.value) ?? e.target.value)}
            />
            {err('url')}
          </label>

          <label className="block">
            <span className="label">Название / описание *</span>
            <input
              className="input"
              placeholder="Например: Nike Dunk Low, 42 EU"
              value={d.title}
              onChange={(e) => set('title', e.target.value)}
              autoFocus
            />
            {err('title')}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Стоимость, ¥ *</span>
              <input
                className="input num"
                inputMode="decimal"
                placeholder="0"
                value={d.priceCny}
                onChange={(e) => set('priceCny', e.target.value)}
              />
              {err('priceCny')}
            </label>
            <label className="block">
              <span className="label">Доставка, ₽</span>
              <input
                className="input num"
                inputMode="decimal"
                placeholder="0"
                value={d.deliveryRub}
                onChange={(e) => set('deliveryRub', e.target.value)}
              />
              {err('deliveryRub')}
            </label>
            <label className="col-span-2 block">
              <span className="label">Цена продажи, ₽</span>
              <input
                className="input num"
                inputMode="decimal"
                placeholder="0"
                value={d.salePriceRub}
                onChange={(e) => set('salePriceRub', e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-950/60 p-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Себестоимость</div>
              <div className="num font-semibold">{fmtRub(cost)}</div>
              <div className="num text-xs text-slate-500">
                {fmtRub(item)} + {fmtRub(delivery)} дост.
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Прибыль</div>
              <div className={`num font-semibold ${profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-rose-400' : ''}`}>
                {fmtRubSigned(profit)}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 p-3">
            <Toggle
              checked={d.isOriginal}
              onChange={(v) => set('isOriginal', v)}
              color="violet"
              onText="Оригинал подтверждён"
              offText="Оригинал не подтверждён"
            />
            <Toggle
              checked={d.isOrdered || d.isSold}
              onChange={(v) => setD((p) => ({ ...p, isOrdered: v, isSold: v ? p.isSold : false }))}
              onText="Заказано"
              offText="Не заказано"
            />
            <Toggle
              checked={d.isSold}
              onChange={(v) => setD((p) => ({ ...p, isSold: v, isOrdered: v ? true : p.isOrdered }))}
              color="emerald"
              onText="Продано"
              offText="Не продано"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={touched && hasErrors}>
            {initial ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  );
}
