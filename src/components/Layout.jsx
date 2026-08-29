import { BarChart3, Boxes, FileBarChart, GraduationCap, Menu, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const nav = [{ label: 'Dashboard', icon: BarChart3 }, { label: 'Alunos', icon: GraduationCap, to: '/alunos' }, { label: 'Uniformes', icon: Boxes }];
const manage = [{ label: 'Importações', icon: Upload }, { label: 'Relatórios', icon: FileBarChart }];
function Sidebar({ close }) {
  const item = ({ label, icon: Icon, to }) => to ? <NavLink to={to} onClick={close} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${isActive ? 'bg-[#1e2a3f] font-semibold text-white' : 'text-slate-300 hover:bg-white/5'}`}><Icon size={17} className={to ? 'text-[#2f6df5]' : ''}/>{label}</NavLink> : <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-white/5"><Icon size={17}/>{label}</button>;
  return <aside className="flex h-full w-[230px] flex-col bg-[#0d1729] px-4 py-7 text-white"><div className="mb-8 px-3"><div className="text-xl font-extrabold tracking-tight">UNIFORME+</div><div className="mt-1 text-[10px] text-slate-400">Sistema de controle escolar</div></div><nav className="space-y-1">{nav.map(x => <div key={x.label}>{item(x)}</div>)}</nav><div className="mb-3 mt-9 px-4 text-[9px] uppercase tracking-wide text-slate-500">Gerenciamento</div><nav className="space-y-1">{manage.map(x => <div key={x.label}>{item(x)}</div>)}</nav></aside>;
}
export default function Layout() {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen bg-[#f4f7fb]"><div className="fixed inset-y-0 left-0 z-30 hidden lg:block"><Sidebar/></div>{open && <div className="fixed inset-0 z-40 lg:hidden"><button aria-label="Fechar menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/40"/><div className="relative h-full w-[230px]"><Sidebar close={() => setOpen(false)}/><button onClick={() => setOpen(false)} className="absolute right-3 top-3 text-white"><X/></button></div></div>}<header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:hidden"><button onClick={() => setOpen(true)}><Menu/></button><b>UNIFORME+</b><div className="h-6 w-6"/></header><main className="min-h-screen lg:ml-[230px]"><div className="mx-auto max-w-[1220px] px-5 py-7 sm:px-8 lg:px-10 lg:py-8"><Outlet/></div></main></div>;
}
