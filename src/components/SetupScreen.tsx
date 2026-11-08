import { Database } from 'lucide-react';

/** Показывается, если не заданы ключи Supabase */
export function SetupScreen() {
  const code = 'rounded-md bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-cyan-300';
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6">
        <div className="mb-4 flex items-center gap-3">
          <img src="/fish.svg" alt="" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-bold">
              CRM<span className="text-cyan-400">Fish</span>
            </h1>
            <p className="text-sm text-slate-400">Нужно подключить базу данных</p>
          </div>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>Создайте проект на supabase.com.</li>
          <li>
            В SQL Editor выполните файл <span className={code}>supabase/schema.sql</span>.
          </li>
          <li>
            Задайте <span className={code}>VITE_SUPABASE_URL</span> и <span className={code}>VITE_SUPABASE_ANON_KEY</span>:
            локально — в <span className={code}>.env.local</span>, на Vercel — в Settings → Environment Variables
            (затем Redeploy).
          </li>
        </ol>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <Database className="h-3.5 w-3.5" /> URL и publishable key — кнопка Connect вверху дашборда Supabase (или Project Settings → API Keys).
        </p>
      </div>
    </div>
  );
}
