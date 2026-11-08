import { Bookmark, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buildBookmarklet } from '../lib/bookmarklet';

/** Карточка с кнопкой-закладкой «+ CRMFish», которую перетаскивают на панель закладок */
export function BookmarkletCard() {
  const link = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);

  // href задаём напрямую: React не любит javascript:-ссылки в JSX
  useEffect(() => {
    link.current?.setAttribute('href', buildBookmarklet(window.location.origin));
  }, []);

  return (
    <section className="card p-4 text-sm">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-200">
        <Bookmark className="h-4 w-4 text-cyan-400" /> Добавление с Goofish в 1 клик
      </h3>
      <p className="mb-3 text-slate-400">Перетащите кнопку на панель закладок браузера:</p>
      <a
        ref={link}
        onClick={(e) => {
          e.preventDefault();
          alert('Не нажимайте здесь — перетащите кнопку мышью на панель закладок.');
        }}
        className="inline-flex cursor-grab items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400 active:cursor-grabbing"
      >
        ＋ CRMFish
      </a>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
      >
        Как пользоваться <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-400">
          <li>Панель закладок не видна — нажмите ⌘ + Shift + B.</li>
          <li>Откройте товар на goofish.com (лучше войти в аккаунт Goofish).</li>
          <li>Нажмите закладку «＋ CRMFish» — откроется CRMFish с фото, названием и ценой.</li>
          <li>Допишите доставку и цену продажи, нажмите «Добавить».</li>
        </ol>
      )}
    </section>
  );
}
