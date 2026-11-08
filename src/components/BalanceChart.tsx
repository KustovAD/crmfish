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

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 text-slate-400">{new Date(p.date).toLocaleDateString('ru-RU')}</div>
      <div className={`num text-sm font-semibold ${p.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        Баланс: {fmtRubSigned(p.balance)}
      </div>
      {p.change !== 0 && (
        <div className={`num ${p.change >= 0 ? 'text-emerald-300/80' : 'text-rose-300/80'}`}>
          за день: {fmtRubSigned(p.change)}
        </div>
      )}
    </div>
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

  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Накопленный баланс</h2>
          <p className="text-xs text-slate-500">заказ = −себестоимость, продажа = +выручка; по датам</p>
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
                  <stop offset={0} stopColor={GREEN} stopOpacity={0.45} />
                  <stop offset={offset} stopColor={GREEN} stopOpacity={0.08} />
                  <stop offset={offset} stopColor={RED} stopOpacity={0.08} />
                  <stop offset={1} stopColor={RED} stopOpacity={0.45} />
                </linearGradient>
                <linearGradient id="balStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={offset} stopColor={GREEN} />
                  <stop offset={offset} stopColor={RED} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
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
                type="monotone"
                dataKey="balance"
                baseValue={0}
                stroke="url(#balStroke)"
                strokeWidth={2.5}
                fill="url(#balFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#e2e8f0' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
