import { ArrowLeftRight, Coins, PiggyBank, ShoppingCart, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Metrics } from '../lib/calc';
import { fmtRate, fmtRub, fmtRubSigned } from '../lib/format';

interface CardProps {
  title: string;
  value: string;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: 'default' | 'pos' | 'neg' | 'accent';
}

function MetricCard({ title, value, hint, icon, tone = 'default' }: CardProps) {
  const toneCls = {
    default: 'text-slate-100',
    pos: 'text-emerald-400',
    neg: 'text-rose-400',
    accent: 'text-yellow-300',
  }[tone];
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
        {title}
        <span className="text-slate-500">{icon}</span>
      </div>
      <div className={`num mt-2 text-xl font-semibold sm:text-2xl ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Dashboard({ m }: { m: Metrics }) {
  const balTone = m.balance > 0 ? 'pos' : m.balance < 0 ? 'neg' : 'default';
  const freeTone = m.free < 0 ? 'neg' : 'default';
  const ic = 'h-4 w-4';
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard title="Капитал" value={fmtRub(m.startCapital)} hint="стартовый" icon={<PiggyBank className={ic} />} />
      <MetricCard
        title="Вложено"
        value={fmtRub(m.invested)}
        hint={`${m.counts.ordered} заказ. · доставка ${fmtRub(m.delivery)}`}
        icon={<ShoppingCart className={ic} />}
      />
      <MetricCard
        title="Выручка"
        value={fmtRub(m.revenue)}
        hint={`${m.counts.sold} продано · прибыль ${fmtRubSigned(m.realizedProfit)}`}
        icon={<Coins className={ic} />}
      />
      <MetricCard
        title="Баланс"
        value={fmtRubSigned(m.balance)}
        tone={balTone}
        hint={`ожидается ещё ${fmtRubSigned(m.pendingProfit)}`}
        icon={m.balance >= 0 ? <TrendingUp className={ic} /> : <TrendingDown className={ic} />}
      />
      <MetricCard
        title="Свободно"
        value={fmtRub(m.free)}
        tone={freeTone}
        hint={m.free < 0 ? 'капитала не хватает' : 'остаток капитала'}
        icon={<Wallet className={ic} />}
      />
      <MetricCard
        title="Курс"
        value={`${fmtRate(m.rate)} ₽`}
        tone="accent"
        hint="за 1 ¥"
        icon={<ArrowLeftRight className={ic} />}
      />
    </section>
  );
}
