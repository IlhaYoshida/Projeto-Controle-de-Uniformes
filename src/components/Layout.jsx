import {
  BarChart3,
  Boxes,
  FileBarChart,
  GraduationCap,
  Users,
  UserCheck,
  FileText,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  User
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../App';

const navPrincipal = [
  { label: 'Dashboard', icon: BarChart3, to: '/dashboard' },
  { label: 'Alunos', icon: GraduationCap, to: '/alunos' },
  { label: 'Turmas', icon: Users, to: '/turmas' }, // Item 5
  { label: 'Uniformes', icon: Boxes, to: '/uniformes' },
];

const navGerenciamento = [
  { label: 'Relatórios', icon: FileBarChart, to: '/relatorios' },
  { label: 'Usuários', icon: UserCheck, to: '/usuarios' }, // Item 15
  { label: 'Logs do Sistema', icon: FileText, to: '/logs' }, // Item 6
];

function Sidebar({ close, currentUser, onLogout, darkMode, toggleDarkMode }) {
  const renderItem = ({ label, icon: Icon, to }) => (
    <NavLink
      to={to}
      onClick={close}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
          isActive
            ? 'bg-[#1e2a3f] font-semibold text-white shadow-sm'
            : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <Icon size={17} className={to ? 'text-[#3b82f6]' : ''} />
      {label}
    </NavLink>
  );

  return (
    <aside className="flex h-full w-[240px] flex-col justify-between bg-[#0d1729] px-4 py-6 text-white border-r border-slate-800">
      <div>
        {/* CABEÇALHO DA SIDEBAR COM NOME DO USUÁRIO CONECTADO (Item 15) */}
        <div className="mb-6 px-3">
          <div className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black">U+</span>
            UNIFORME+
          </div>
          <div className="mt-1 text-[10px] text-slate-400">Sistema de controle escolar</div>

          {/* Nome do usuário exibido sempre abaixo de "Sistema de controle escolar" (Item 15) */}
          <div className="mt-3.5 flex items-center gap-2.5 rounded-lg border border-slate-800 bg-[#162138] px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/30 text-blue-400">
              <User size={13} />
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400">Conectado como</div>
              <div className="truncate text-xs font-bold text-slate-100" title={currentUser?.nome}>
                {currentUser?.nome || 'Usuário'}
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO PRINCIPAL */}
        <nav className="space-y-1">
          {navPrincipal.map(x => (
            <div key={x.label}>{renderItem(x)}</div>
          ))}
        </nav>

        {/* SEÇÃO DE GERENCIAMENTO */}
        <div className="mb-2 mt-7 px-4 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
          Gerenciamento
        </div>
        <nav className="space-y-1">
          {navGerenciamento.map(x => (
            <div key={x.label}>{renderItem(x)}</div>
          ))}
        </nav>
      </div>

      {/* PARTE INFERIOR: BOTÃO DE MODO ESCURO/CLARO E LOGOUT (Item 16) */}
      <div className="border-t border-slate-800/80 pt-4 space-y-2">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-2.5">
            {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-blue-400" />}
            <span>{darkMode ? 'Modo claro' : 'Modo escuro'}</span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase">{darkMode ? 'Dark' : 'Light'}</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition"
        >
          <LogOut size={15} />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { currentUser, logout, darkMode, toggleDarkMode } = useApp();

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-[#090d16]' : 'bg-[#f6f8fb]'}`}>
      {/* Sidebar Desktop Fixa */}
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <Sidebar
          currentUser={currentUser}
          onLogout={logout}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
      </div>

      {/* Sidebar Mobile com gaveta */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="relative h-full w-[240px]">
            <Sidebar
              close={() => setOpen(false)}
              currentUser={currentUser}
              onLogout={logout}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
            />
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Barra superior Mobile */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <button onClick={() => setOpen(true)} className="text-slate-800 dark:text-slate-100">
          <Menu size={20} />
        </button>
        <b className="text-slate-900 dark:text-white">UNIFORME+</b>
        <div className="text-xs text-slate-500 font-semibold">{currentUser?.nome?.split(' ')[0]}</div>
      </header>

      {/* Conteúdo Principal */}
      <main className="min-h-screen lg:ml-[240px]">
        <div className="mx-auto max-w-[1240px] px-5 py-7 sm:px-8 lg:px-10 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
