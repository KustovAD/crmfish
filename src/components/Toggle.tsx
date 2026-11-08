interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  /** Подпись только для скринридеров (без видимого текста) */
  ariaLabel?: string;
  /** Подписи для состояний «вкл/выкл», показываются рядом с переключателем */
  onText?: string;
  offText?: string;
  color?: 'emerald' | 'cyan' | 'violet';
  size?: 'sm' | 'md';
}

const COLORS = {
  emerald: 'bg-emerald-500',
  cyan: 'bg-cyan-500',
  violet: 'bg-violet-500',
};

export function Toggle({ checked, onChange, label, ariaLabel, onText, offText, color = 'cyan', size = 'md' }: Props) {
  const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const shift = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  const text = checked ? onText : offText;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label ?? text}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 text-left"
    >
      <span
        className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors ${track} ${
          checked ? COLORS[color] : 'bg-slate-700 group-hover:bg-slate-600'
        }`}
      >
        <span
          className={`${knob} rounded-full bg-white shadow transition-transform ${checked ? shift : 'translate-x-0'}`}
        />
      </span>
      {(label || text) && (
        <span className={`text-sm ${checked ? 'text-slate-100' : 'text-slate-400'}`}>
          {label}
          {label && text ? ': ' : ''}
          {text}
        </span>
      )}
    </button>
  );
}
