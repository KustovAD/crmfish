import { Loader2, RefreshCw, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { parseNum } from '../lib/format';
import type { Settings } from '../types';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

/** Числовое поле с черновиком: не «прыгает», пока пользователь печатает */
function NumberField({
  label,
  value,
  onCommit,
  suffix,
  step,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  suffix: string;
  step?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          className="input num pr-10"
          inputMode="decimal"
          step={step}
          value={draft}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setDraft(e.target.value);
            onCommit(parseNum(e.target.value)); // мгновенный пересчёт
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
          {suffix}
        </span>
      </div>
    </label>
  );
}

export function SettingsPanel({ settings, onChange }: Props) {
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateNote, setRateNote] = useState<string | null>(null);

  /** Официальный курс ЦБ РФ (открытый JSON-зеркало cbr-xml-daily.ru) */
  const fetchCbr = async () => {
    setLoadingRate(true);
    setRateNote(null);
    try {
      const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
      const json = await res.json();
      const cny = json?.Valute?.CNY;
      if (!cny) throw new Error('нет данных по CNY');
      const rate = Math.round((cny.Value / cny.Nominal) * 10000) / 10000;
      onChange({ ...settings, rate });
      setRateNote(`ЦБ РФ на ${new Date(json.Date).toLocaleDateString('ru-RU')}`);
    } catch {
      setRateNote('Не удалось получить курс ЦБ — введите вручную');
    } finally {
      setLoadingRate(false);
    }
  };

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Settings2 className="h-4 w-4 text-cyan-400" /> Настройки
        <span className="font-normal text-slate-500">· общие для всех</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Стартовый капитал"
          value={settings.startCapital}
          suffix="₽"
          onCommit={(v) => onChange({ ...settings, startCapital: v })}
        />
        <div>
          <NumberField
            label="Курс ₽ за 1 ¥"
            value={settings.rate}
            suffix="₽"
            step="0.01"
            onCommit={(v) => onChange({ ...settings, rate: v })}
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={fetchCbr}
              disabled={loadingRate}
              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
            >
              {loadingRate ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Курс ЦБ
            </button>
            {rateNote && <span className="truncate text-xs text-slate-500">{rateNote}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
