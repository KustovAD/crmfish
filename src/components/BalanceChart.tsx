import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { ChartPoint } from '../lib/calc';
import { fmtRub, fmtRubSigned } from '../lib/format';

const GREEN = '#34d399';
const RED = '#fb7185';

const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });

const fullTime = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const fmtTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const fmtDayTime = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fmtDayOnly = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

/** Подписи оси времени: чем короче период, тем точнее */
function makeTickFormatter(spanMs: number) {
  const DAY = 86_400_000;
  if (spanMs <= 1.5 * DAY) return (v: number) => fmtTime.format(v);
  if (spanMs <= 10 * DAY) return (v: number) => fmtDayTime.format(v);
  return (v: number) => fmtDayOnly.format(v);
}

const KIND_LABEL: Record<ChartPoint['kind'], string> = {
  start: 'Старт',
  order: 'Заказ',
  sale: 'Продажа',
};

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ChartPoint;
  if (p.kind === 'start') return null;
  return (
    <div className="max-w-[240px] rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 text-slate-400">{fullTime.format(p.ts)}</div>
      <div className="mb-1 text-slate-200">
        <span className={p.kind === 'sale' ? 'text-emerald-300' : 'text-rose-300'}>{KIND_LABEL[p.kind]}:</span>{' '}
        <span className="break-words">{p.title}</span>
      </div>
      <div className={`num ${p.change >= 0 ? 'text-emerald-300/80' : 'text-rose-300/80'}`}>{fmtRubSigned(p.change)}</div>
      <div className={`num mt-1 text-sm font-semibold ${p.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        Баланс: {fmtRubSigned(p.balance)}
      </div>
    </div>
  );
}

/** Точка на каждом событии: зелёная — продажа, красная — заказ */
function EventDot(props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null || !payload || payload.kind === 'start') return <g key={`d${index}`} />;
  return (
    <circle
      key={`d${index}`}
      cx={cx}
      cy={cy}
      r={3.5}
      fill={payload.kind === 'sale' ? GREEN : RED}
      stroke="#020617"
      strokeWidth={1.5}
    />
  );
}

export function BalanceChart({ data, startCapital }: { data: ChartPoint[]; startCapital: number }) {
  // Точка «переключения» цвета: где по вертикали проходит ноль
  const offset = useMemo(() => {
    if (!data.length) return 1;
    const max = Math.max(...data.map((d) => d.balance));
    const min = Math.min(...data.map((d) => d.balance));
    if (max <= 0) return 0;
    if (min >= 0) return 1;
    return max / (max - min);
  }, [data]);

  const last = data.length ? data[data.length - 1].balance : 0;
  const tickFormatter = useMemo(
    () => makeTickFormatter(data.length ? data[data.length - 1].ts - data[0].ts : 0),
    [data],
  );

  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Накопленный баланс</h2>
          <p className="text-xs text-slate-500">каждая точка — заказ (−себестоимость) или продажа (+выручка), по времени</p>
        </div>
        <div className={`num text-lg font-semibold ${last >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {fmtRubSigned(last)}
        </div>
      </div>

      {data.length < 2 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
          Отметьте товары как «Заказано», чтобы увидеть график
        </div>
      ) : (
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={offset} stopColor={GREEN} stopOpacity={0.25} />
                  <stop offset={offset} stopColor={RED} stopOpacity={0.25} />
                </linearGradient>
                <linearGradient id="balStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={offset} stopColor={GREEN} />
                  <stop offset={offset} stopColor={RED} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={tickFormatter}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => compact.format(v)}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '3 3' }} />
              <ReferenceLine y={0} stroke="#475569" />
              {startCapital > 0 && (
                <ReferenceLine
                  y={-startCapital}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: `−капитал ${fmtRub(startCapital)}`, fill: '#f59e0b', fontSize: 10, position: 'insideBottomLeft' }}
                  ifOverflow="hidden"
                />
              )}
              <Area
                type="stepAfter"
                dataKey="balance"
                baseValue={0}
                stroke="url(#balStroke)"
                strokeWidth={2.5}
                fill="url(#balFill)"
                dot={(p: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) => EventDot(p)}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#facc15' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
