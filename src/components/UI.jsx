import { useState } from 'react';
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

export const Field = ({ label, required, className = '', error, helperText, ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-semibold text-slate-900 dark:text-slate-200">
      {label}{required && ' *'}
    </span>
    {helperText && (
      <span className="mb-1.5 block text-[11px] leading-tight !text-slate-400 !font-normal">
        {helperText}
      </span>
    )}

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

// --- MODAL DE CONFIRMAÇÃO CENTRALIZADO (Substitui window.confirm - Item 8) ---
export const ConfirmModal = ({
  isOpen,
  title = 'Confirmação necessária',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onClose,
  loading = false,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose} disabled={loading} className="h-10 px-4 text-xs">
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={loading} className="h-10 px-5 text-xs">
            {loading ? 'Processando...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE REVISÃO ANTES DE CONFIRMAR (Item 7, 10, 14) ---
export const ReviewModal = ({
  isOpen,
  title = 'Revisar Informações',
  subtitle = 'Confira os dados antes de finalizar o registro:',
  confirmText = 'Confirmar e Salvar',
  cancelText = 'Voltar e Corrigir',
  onConfirm,
  onClose,
  loading = false,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        <div className="my-4 overflow-y-auto pr-1 flex-1">{children}</div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose} disabled={loading} className="h-10 px-4 text-xs">
            {cancelText}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={loading} className="h-10 px-5 text-xs">
            {loading ? 'Salvando...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE AUTORIZAÇÃO DE ADMINISTRADOR PARA USUÁRIO PADRÃO (Item 18) ---
export const AdminAuthModal = ({
  isOpen,
  actionDesc = 'excluir este registro',
  onSuccess,
  onClose,
}) => {
  const [emailAdmin, setEmailAdmin] = useState('');
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [erro, setErro] = useState('');
  const [validando, setValidando] = useState(false);

  if (!isOpen) return null;

  const handleAutorizar = async (e) => {
    e.preventDefault();
    setErro('');
    if (!emailAdmin.trim() || !senhaAdmin) {
      return setErro('Informe o e-mail e a senha do administrador.');
    }
    setValidando(true);
    try {
      const { autorizarAdmin } = await import('../api');
      await autorizarAdmin({
        email: emailAdmin.trim(),
        senha: senhaAdmin,
        acao: actionDesc,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setErro(err.message || 'Falha na autorização do administrador.');
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            🔒
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Ação Restrita a Administradores</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Usuários padrão não têm permissão para {actionDesc}. Peça a um administrador para autorizar esta ação agora:
            </p>
          </div>
        </div>

        {erro && (
          <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950 dark:text-red-300">
            {erro}
          </p>
        )}

        <form onSubmit={handleAutorizar} className="mt-4 space-y-3">
          <Field
            label="E-mail do Administrador"
            type="email"
            required
            placeholder="admin@escola.gov.br"
            value={emailAdmin}
            onChange={e => setEmailAdmin(e.target.value)}
          />
          <Field
            label="Senha do Administrador"
            type="password"
            required
            placeholder="••••••••"
            value={senhaAdmin}
            onChange={e => setSenhaAdmin(e.target.value)}
          />

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={onClose} disabled={validando} className="h-9 px-4 text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={validando} className="h-9 px-4 text-xs">
              {validando ? 'Autorizando...' : 'Autorizar e Continuar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

