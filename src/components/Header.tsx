import { HardDrive, Plus } from 'lucide-react';

interface Props {
  onAdd: () => void;
}

export function Header({ onAdd }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/fish.svg" alt="" className="h-9 w-9" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              CRM<span className="text-yellow-400">Fish</span>
            </h1>
            <p className="hidden text-xs text-slate-400 sm:block">Учёт перепродажи товаров с Goofish</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            title="Данные хранятся в файле data/crmfish.json в папке проекта"
            className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 sm:inline-flex"
          >
            <HardDrive className="h-3.5 w-3.5" /> Локальная база
          </span>
          <button className="btn-primary" onClick={onAdd}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Добавить товар</span>
          </button>
        </div>
      </div>
    </header>
  );
}
