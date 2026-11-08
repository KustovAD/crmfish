import { ImageOff, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { fmtRub, fmtRubSigned, parseNum } from '../lib/format';
import { extractUrl, looksLikeXianyu, parseXianyu } from '../lib/xianyu';
import type { Product, ProductInput } from '../types';
import { Toggle } from './Toggle';

interface Props {
  open: boolean;
  initial?: Product | null;
  /** Начальные значения для нового товара (от букмарклета) */
  prefill?: Partial<ProductInput> | null;
  rate: number;
  onClose: () => void;
  onSubmit: (data: ProductInput) => void;
}

interface Draft {
  url: string;
  title: string;
  imageUrl: string;
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
  imageUrl: '',
  priceCny: '',
  deliveryRub: '',
  salePriceRub: '',
  isOriginal: false,
  isOrdered: false,
  isSold: false,
};

export function ProductForm({ open, initial, prefill, rate, onClose, onSubmit }: Props) {
  const [d, setD] = useState<Draft>(empty);
  const [touched, setTouched] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseNote, setParseNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setParseNote(null);
    setImgBroken(false);
    setD(
      initial
        ? {
            url: initial.url,
            title: initial.title,
            imageUrl: initial.imageUrl ?? '',
            priceCny: String(initial.priceCny),
            deliveryRub: initial.deliveryRub ? String(initial.deliveryRub) : '',
            salePriceRub: String(initial.salePriceRub),
            isOriginal: initial.isOriginal,
            isOrdered: initial.isOrdered,
            isSold: initial.isSold,
          }
        : prefill
          ? {
              ...empty,
              url: prefill.url ?? '',
              title: prefill.title ?? '',
              imageUrl: prefill.imageUrl ?? '',
              priceCny: prefill.priceCny ? String(prefill.priceCny) : '',
            }
          : empty,
    );
    if (!initial && prefill) {
      const got = [prefill.title && 'название', prefill.priceCny && 'цена', prefill.imageUrl && 'фото'].filter(Boolean);
      setParseNote({
        ok: got.length === 3,
        text: `С Goofish получено: ${got.join(', ') || 'только ссылка'}${prefill.title ? '' : '. В названии нет английских слов — впишите вручную'}`,
      });
    }
  }, [open, initial, prefill]);

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

  /** Разбор ссылки / текста «Поделиться» из Xianyu и автозаполнение полей */
  const runParse = async (text: string) => {
    if (!text.trim() || parsing) return;
    setParsing(true);
    setParseNote(null);
    try {
      const r = await parseXianyu(text);
      setImgBroken(false);
      setD((prev) => ({
        ...prev,
        url: r.url ?? prev.url,
        title: r.title || prev.title,
        priceCny: r.priceCny ? String(r.priceCny) : prev.priceCny,
        imageUrl: r.imageUrl ?? prev.imageUrl,
      }));
      const got = [r.url && 'ссылка', r.title && 'название', r.priceCny && 'цена', r.imageUrl && 'фото'].filter(Boolean);
      setParseNote({
        ok: !r.warning,
        text: [got.length ? `Распознано: ${got.join(', ')}` : 'Ссылка не найдена', r.warning].filter(Boolean).join('. '),
      });
    } finally {
      setParsing(false);
    }
  };

  const urlValid = !d.url.trim() || extractUrl(d.url) !== null;
  const errors = {
    title: !d.title.trim() ? 'Укажите название' : null,
    url: !urlValid ? 'Не найдена ссылка (должна начинаться с http(s)://)' : null,
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
      imageUrl: d.imageUrl.trim(),
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
          <div>
            <span className="label">Ссылка или текст «Поделиться» из Xianyu</span>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="https://www.goofish.com/item?id=… или текст «Поделиться»"
                value={d.url}
                onChange={(e) => set('url', e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (looksLikeXianyu(text)) {
                    e.preventDefault();
                    set('url', text);
                    void runParse(text);
                  }
                }}
              />
              <button
                type="button"
                className="btn-ghost shrink-0 px-3"
                onClick={() => void runParse(d.url)}
                disabled={parsing || !d.url.trim()}
                title="Загрузить фото, название и цену"
              >
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="hidden sm:inline">Загрузить</span>
              </button>
            </div>
            {err('url')}
            {parsing && <p className="mt-1 text-xs text-slate-400">Загружаю данные с Goofish…</p>}
            {parseNote && (
              <p className={`mt-1 text-xs ${parseNote.ok ? 'text-emerald-400' : 'text-amber-300'}`}>{parseNote.text}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
              {d.imageUrl && !imgBroken ? (
                <img
                  src={d.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={() => setImgBroken(true)}
                />
              ) : (
                <ImageOff className="h-6 w-6 text-slate-600" />
              )}
            </div>
            <label className="block flex-1">
              <span className="label">Фото (ссылка)</span>
              <input
                className="input"
                placeholder="https://img.alicdn.com/…"
                value={d.imageUrl}
                onChange={(e) => {
                  setImgBroken(false);
                  set('imageUrl', e.target.value);
                }}
              />
            </label>
          </div>

          <label className="block">
            <span className="label">Название / описание *</span>
            <input
              className="input"
              placeholder="Например: Nike Air Force Max"
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
