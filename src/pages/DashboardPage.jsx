import { useEffect, useMemo, useState } from 'react';
import { getDashboard, getEstoque } from '../api';
import { pivotEstoque, TAMANHOS_UNIFORME, dateBR } from '../data';
import { Card, Header } from '../components/UI';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function DashboardPage() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [mes, setMes] = useState(''); // '' = Todos
  const [dash, setDash] = useState(null);
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setLoading(true);
    const mesNum = mes ? Number(mes) : null;
    Promise.all([getDashboard(ano, mesNum), getEstoque()])
      .then(([d, e]) => {
        setDash(d);
        setEstoque(e);
      })
      .catch(() => setErro('Não foi possível carregar o dashboard. Verifique se a API está no ar.'))
      .finally(() => setLoading(false));
  }, [ano, mes]);

  const tiposExistentes = useMemo(() => [...new Set(estoque.map(i => i.tipo))], [estoque]);
  const pivot = useMemo(() => pivotEstoque(estoque, tiposExistentes), [estoque, tiposExistentes]);
  const anos = useMemo(() => Array.from({ length: 5 }, (_, i) => anoAtual - i), [anoAtual]);

  const periodoTexto = mes ? `${NOMES_MESES[Number(mes) - 1]} de ${ano}` : `${ano}`;

  return (
    <div className="page-enter">
      <Header
        eyebrow="VISÃO GERAL"
        title="Dashboard"
        subtitle="Indicadores de alunos, recebimentos e estoque de uniformes."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              aria-label="Selecionar Ano"
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={mes}
              onChange={e => setMes(e.target.value)}
              aria-label="Selecionar Mês"
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Todos os meses</option>
              {NOMES_MESES.map((nomeMes, idx) => (
                <option key={nomeMes} value={idx + 1}>{nomeMes}</option>
              ))}
            </select>
          </div>
        }
      />

      {erro && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}

      {loading && !dash ? (
        <div className="py-20 text-center text-sm text-slate-400">Carregando dashboard...</div>
      ) : dash && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Alunos cadastrados" value={dash.alunos_cadastrados} sub="Total de alunos ativos" />
            <StatCard
              label="Receberam uniforme"
              value={dash.receberam_uniforme}
              sub={`${dash.pct_receberam_uniforme}% no período`}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Peças recebidas"
              value={dash.pecas_recebidas_no_ano}
              sub={`Saídas em ${periodoTexto}`}
              color="text-blue-600 dark:text-blue-400"
            />
            <StatCard label="Peças em estoque" value={dash.pecas_em_estoque} sub="Somando todos os tamanhos" />
          </div>

          <div className="mb-6 grid gap-5 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Uniformes recebidos no ano</h2>
              <p className="mb-6 text-xs text-slate-400">Quantidade de peças registradas por mês</p>
              <BarChart valores={dash.uniformes_por_mes} mesAtivo={mes ? Number(mes) - 1 : null} />
            </Card>

            <Card className="flex flex-col items-center p-6 lg:col-span-1">
              <h2 className="self-start text-sm font-bold text-slate-900 dark:text-white">Alunos com uniforme</h2>
              <p className="mb-4 self-start text-xs text-slate-400">Status de recebimento em {periodoTexto}</p>
              <Donut pct={dash.pct_receberam_uniforme} receberam={dash.receberam_uniforme} total={dash.alunos_cadastrados} />
            </Card>

            {/* Substituído 'Mais de um uniforme' por 'Registros de saída recentes' (Item 20) */}
            <Card className="p-6 lg:col-span-1 flex flex-col">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Registros de saída recentes</h2>
              <p className="mb-4 text-xs text-slate-400">Últimas entregas registradas no período</p>
              <SaidasRecentesList itens={dash.saidas_recentes} />
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="px-5 pb-2 pt-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Estoque por peça e tamanho</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Resumo das quantidades disponíveis atualmente</p>
            </div>
            <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[650px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <th className="px-4 py-3 font-medium">Peça</th>
                    {TAMANHOS_UNIFORME.map(t => (
                      <th key={t} className="px-3 py-3 text-center font-medium">{t}</th>
                    ))}
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pivot.map(row => (
                    <tr key={row.tipo} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{row.tipo}</td>
                      {TAMANHOS_UNIFORME.map(t => (
                        <td key={t} className="px-3 py-4 text-center text-slate-700 dark:text-slate-300">
                          {row[t]}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color = 'text-slate-900 dark:text-white' }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>
    </Card>
  );
}

function BarChart({ valores, mesAtivo }) {
  const max = Math.max(1, ...valores);
  return (
    <div className="flex h-40 items-end gap-2">
      {valores.map((v, i) => {
        const isHighlight = mesAtivo === null || mesAtivo === i;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end">
              <div
                className={`w-full rounded-t-md transition-all ${
                  isHighlight ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700 opacity-40'
                }`}
                style={{ height: `${(v / max) * 100}%`, minHeight: v ? '3px' : 0 }}
                title={`${MESES[i]}: ${v} peças`}
              />
            </div>
            <span className={`text-[10px] ${mesAtivo === i ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
              {MESES[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ pct, receberam, total }) {
  const r = 54,
    c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative flex flex-1 items-center justify-center">
      <svg width="150" height="150" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" className="dark:stroke-slate-800" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#2563eb"
          strokeWidth="16"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{pct}%</span>
        <span className="text-[10px] text-slate-400">receberam</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-[10px] text-slate-500">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#2563eb]" />{receberam} receberam</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700" />{Math.max(total - receberam, 0)} pendentes</span>
      </div>
    </div>
  );
}

function SaidasRecentesList({ itens }) {
  if (!itens?.length) {
    return (
      <div className="flex flex-1 items-center justify-center py-8 text-center text-xs text-slate-400">
        Nenhum registro de saída encontrado para o período selecionado.
      </div>
    );
  }

  const horaFormatada = (dataStr) => {
    try {
      const d = new Date(dataStr);
      return `${dateBR(dataStr)} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateBR(dataStr);
    }
  };

  return (
    <div className="space-y-3 overflow-y-auto max-h-56 pr-1 flex-1">
      {itens.map(item => (
        <div
          key={item.id}
          className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 transition hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{item.aluno}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Turma: {item.turma} · {horaFormatada(item.data_entrega)}
              </div>
            </div>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 shrink-0">
              {item.quantidade} un.
            </span>
          </div>
          {item.pecas && (
            <div className="mt-1.5 truncate text-[10px] text-slate-600 dark:text-slate-400" title={item.pecas}>
              {item.pecas}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

