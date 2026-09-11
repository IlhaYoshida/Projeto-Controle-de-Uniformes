import { useEffect, useMemo, useState } from 'react';
import { getDashboard, getEstoque } from '../api';
import { pivotEstoque, TAMANHOS_UNIFORME } from '../data';
import { Card, Header } from '../components/UI';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function DashboardPage() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [dash, setDash] = useState(null);
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getDashboard(ano), getEstoque()])
      .then(([d, e]) => { setDash(d); setEstoque(e); })
      .catch(() => setErro('Não foi possível carregar o dashboard. Verifique se a API está no ar.'))
      .finally(() => setLoading(false));
  }, [ano]);

  const pivot = useMemo(() => pivotEstoque(estoque), [estoque]);
  const anos = useMemo(() => Array.from({ length: 5 }, (_, i) => anoAtual - i), [anoAtual]);

  return <div className="page-enter">
    <Header eyebrow="VISÃO GERAL" title="Dashboard" subtitle="Indicadores de alunos, recebimentos e estoque de uniformes."
      actions={<select value={ano} onChange={e => setAno(Number(e.target.value))} className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{anos.map(a => <option key={a} value={a}>{a}</option>)}</select>} />

    {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
    {loading && !dash ? <div className="py-20 text-center text-sm text-slate-400">Carregando dashboard...</div> : dash && <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Alunos cadastrados" value={dash.alunos_cadastrados} sub="Total de alunos ativos" />
        <StatCard label="Receberam uniforme" value={dash.receberam_uniforme} sub={`${dash.pct_receberam_uniforme}% dos alunos`} color="text-emerald-600" />
        <StatCard label="Peças recebidas" value={dash.pecas_recebidas_no_ano} sub={`Entregas registradas em ${dash.ano}`} color="text-blue-600" />
        <StatCard label="Peças em estoque" value={dash.pecas_em_estoque} sub="Somando todos os tamanhos" />
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-sm font-bold">Uniformes recebidos no ano</h2>
          <p className="mb-6 text-xs text-slate-400">Quantidade de peças registradas por mês</p>
          <BarChart valores={dash.uniformes_por_mes} />
        </Card>
        <Card className="flex flex-col items-center p-6 lg:col-span-1">
          <h2 className="self-start text-sm font-bold">Alunos com uniforme</h2>
          <p className="mb-4 self-start text-xs text-slate-400">Status de recebimento em {dash.ano}</p>
          <Donut pct={dash.pct_receberam_uniforme} receberam={dash.receberam_uniforme} total={dash.alunos_cadastrados} />
        </Card>
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-sm font-bold">Mais de um uniforme</h2>
          <p className="mb-4 text-xs text-slate-400">Alunos que já saíram com 2+ uniformes</p>
          <RankingList itens={dash.mais_de_um_uniforme} />
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 pb-2 pt-5"><h2 className="text-base font-bold">Estoque por peça e tamanho</h2><p className="text-xs text-slate-500">Resumo das quantidades disponíveis atualmente</p></div>
        <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[650px] border-collapse text-left text-xs">
            <thead><tr className="bg-slate-50 text-slate-500">
              <th className="px-4 py-3 font-medium">Peça</th>
              {TAMANHOS_UNIFORME.map(t => <th key={t} className="px-3 py-3 text-center font-medium">{t}</th>)}
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr></thead>
            <tbody>
              {pivot.map(row => (
                <tr key={row.tipo} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold">{row.tipo}</td>
                  {TAMANHOS_UNIFORME.map(t => <td key={t} className="px-3 py-3 text-center">{row[t]}</td>)}
                  <td className="px-4 py-3 text-right font-bold">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>}
  </div>;
}

function StatCard({ label, value, sub, color = 'text-slate-900' }) {
  return <Card className="p-5">
    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-slate-500">{sub}</div>
  </Card>;
}

function BarChart({ valores }) {
  const max = Math.max(1, ...valores);
  return <div className="flex h-40 items-end gap-2">
    {valores.map((v, i) => (
      <div key={i} className="flex flex-1 flex-col items-center gap-2">
        <div className="flex h-32 w-full items-end">
          <div className="w-full rounded-t-md bg-blue-500 transition-all" style={{ height: `${(v / max) * 100}%`, minHeight: v ? '3px' : 0 }} title={`${MESES[i]}: ${v}`} />
        </div>
        <span className="text-[10px] text-slate-400">{MESES[i]}</span>
      </div>
    ))}
  </div>;
}

function Donut({ pct, receberam, total }) {
  const r = 54, c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return <div className="relative flex flex-1 items-center justify-center">
    <svg width="150" height="150" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="#2563eb" strokeWidth="16"
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
        transform="rotate(-90 70 70)" />
    </svg>
    <div className="absolute flex flex-col items-center">
      <span className="text-2xl font-bold text-slate-900">{pct}%</span>
      <span className="text-[10px] text-slate-400">receberam</span>
    </div>
    <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-[10px] text-slate-500">
      <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#2563eb]" />{receberam} receberam</span>
      <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-200" />{Math.max(total - receberam, 0)} pendentes</span>
    </div>
  </div>;
}

function RankingList({ itens }) {
  if (!itens?.length) return <p className="py-8 text-center text-xs text-slate-400">Nenhum aluno recebeu mais de um uniforme ainda.</p>;
  const max = Math.max(...itens.map(i => i.pecas));
  return <div className="space-y-3">
    {itens.map(i => (
      <div key={i.aluno_id}>
        <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-700">{i.nome}</span><span className="font-semibold text-slate-900">{i.pecas}</span></div>
        <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#2563eb]" style={{ width: `${(i.pecas / max) * 100}%` }} /></div>
      </div>
    ))}
  </div>;
}
