import { ChevronLeft, CircleUserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const buttonVariants = {
  primary: 'bg-[#2563eb] text-white hover:bg-blue-700',
  secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  danger: 'bg-[#dc2626] text-white hover:bg-red-700',
  outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950',
};

export const Button = ({ variant = 'primary', className = '', children, ...props }) => (
  <button
    className={`${buttonVariants[variant] || buttonVariants.primary} inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const Role = () => (
  <div className="flex h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
    <span className="h-2 w-2 rounded-full bg-blue-500" />
    Secretaria
  </div>
);

export const Header = ({ eyebrow = 'SISTEMA', title, subtitle, actions }) => (
  <div className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
    <div>
      <div className="mb-2 text-[10px] font-bold text-[#2563eb] dark:text-blue-400">{eyebrow}</div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px] dark:text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Role />
      {actions}
    </div>
  </div>
);

export const Card = ({ className = '', children }) => (
  <section className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827] ${className}`}>
    {children}
  </section>
);

export const Back = () => {
  const navigate = useNavigate();
  return (
    <Button variant="secondary" onClick={() => navigate(-1)} className="mb-5 h-10 px-4">
      <ChevronLeft size={16} /> Voltar
    </Button>
  );
};

export const Field = ({ label, required, className = '', error, ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-xs font-semibold text-slate-900 dark:text-slate-200">
      {label}{required && ' *'}
    </span>
    <input
      className={`h-11 w-full rounded-lg border px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 ${
        error ? 'border-red-500 bg-red-50/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
      }`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </label>
);

export const Select = ({ label, required, children, className = '', error, ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-xs font-semibold text-slate-900 dark:text-slate-200">
      {label}{required && ' *'}
    </span>
    <select
      className={`h-11 w-full rounded-lg border px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 ${
        error ? 'border-red-500 bg-red-50/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
      }`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </label>
);

export const Empty = ({ text = 'Nenhum registro encontrado.' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
    <CircleUserRound size={38} strokeWidth={1.5} />
    <p className="mt-3 text-sm">{text}</p>
  </div>
);

export const Badge = ({ status }) => (
  <span className={`inline-flex rounded-lg px-4 py-1.5 text-xs font-medium ${
    status === 'Recebido'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
  }`}>
    {status}
  </span>
);
