import { Download, FileBarChart, Calendar, Users, PackageCheck, Boxes, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRelatorioCompleto, relatorioEntregasPorTurmaCsvUrl } from '../api';
import { Button, Card, Empty, Header } from '../components/UI';

export default function RelatoriosPage() {
  const [dados, setDados] = useState(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [abaAtiva, setAbaAtiva] = useState('turmas'); // 'turmas' | 'mensal'
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregarRelatorio = () => {
    setLoading(true);
    getRelatorioCompleto(ano)
      .then(setDados)
      .catch(() => setErro('Não foi possível carregar o relatório completo. Verifique se o backend está ativo.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarRelatorio();
  }, [ano]);

  return (
    <div className="page-enter">
      <Header
        eyebrow="PRESTAÇÃO DE CONTAS"
        title="Relatórios completos"
        subtitle="Estatísticas detalhadas por turma individual, fluxo mensal de entradas/saídas e indicadores gerais."
        actions={
          <div className="flex items-center gap-3">
            <select
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>Ano {a}</option>
              ))}
            </select>
            <a href={relatorioEntregasPorTurmaCsvUrl()} target="_blank" rel="noreferrer">
              <Button variant="secondary" className="h-10 text-xs">
                <Download size={15} /> Exportar CSV
              </Button>
            </a>
          </div>
        }
      />

      {erro && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}

      {/* CARDS COM RESUMO EXECUTIVO (Item 13) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de alunos</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {dados?.total_alunos ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Alunos matriculados</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cobertura de uniformes</span>
            <PackageCheck size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {dados?.pct_alunos_com_entrega ?? 0}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {dados?.total_alunos_com_entrega ?? 0} de {dados?.total_alunos ?? 0} receberam
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Peças entregues no ano</span>
            <TrendingUp size={16} className="text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {dados?.total_pecas_entregues ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Total de peças distribuídas</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estoque disponível</span>
            <Boxes size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {dados?.total_pecas_em_estoque ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Peças prontas para saída</div>
        </Card>
      </div>

      {/* ABAS DO RELATÓRIO */}
      <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => setAbaAtiva('turmas')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition ${
            abaAtiva === 'turmas'
              ? 'bg-[#2563eb] text-white shadow'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Users size={14} /> Relatório de turmas individualmente
        </button>
        <button
          onClick={() => setAbaAtiva('mensal')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition ${
            abaAtiva === 'mensal'
              ? 'bg-[#2563eb] text-white shadow'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar size={14} /> Relatório mensal do ano ({ano})
        </button>
      </div>

      {/* TAB 1: RELATÓRIO POR TURMA INDIVIDUAL (Item 12 & 13) */}
      {abaAtiva === 'turmas' && (
        <Card className="overflow-hidden">
          <div className="px-5 pb-2 pt-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Dados individuais por turma
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhamento detalhado do recebimento de uniformes por cada classe
            </p>
          </div>

          <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[750px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {['Turma', 'Total de alunos', 'Alunos com entrega', 'Faltando', 'Cobertura (%)', 'Peças entregues'].map(h => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados?.turmas?.map(l => {
                  const pct = l.total_alunos > 0 ? Math.round((l.total_alunos_com_entrega / l.total_alunos) * 100) : 0;
                  const pendentes = l.total_alunos - l.total_alunos_com_entrega;

                  return (
                    <tr key={l.turma_id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {/* Corrigido: exibe o nome exato da turma (ex: "5º A", "5º B"), corrigindo o bug do Item 12 */}
                      <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">
                        {l.turma_nome}
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{l.total_alunos}</td>
                      <td className="px-4 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        {l.total_alunos_com_entrega}
                      </td>
                      <td className="px-4 py-4 text-amber-600 dark:text-amber-400">{pendentes}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div style={{ width: `${pct}%` }} className="h-full bg-blue-600" />
                          </div>
                          <span className="font-semibold">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">
                        {l.total_pecas_entregues} peças
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && (!dados?.turmas || !dados.turmas.length) && (
              <Empty text="Nenhuma turma cadastrada no momento." />
            )}
            {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando relatório...</div>}
          </div>
        </Card>
      )}

      {/* TAB 2: RELATÓRIO DO MÊS (FLUXO MENSAL) (Item 13) */}
      {abaAtiva === 'mensal' && (
        <Card className="overflow-hidden">
          <div className="px-5 pb-2 pt-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Relatório mensal do ano ({ano})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Histórico consolidado de entradas recebidas e saídas entregues aos alunos mês a mês
            </p>
          </div>

          <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {['Mês', 'Entradas (peças)', 'Saídas (peças)', 'Entregas realizadas', 'Fluxo líquido'].map(h => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados?.meses?.map(m => {
                  const saldo = m.entradas_pecas - m.saidas_pecas;
                  return (
                    <tr key={m.mes} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                        {m.nome_mes}
                      </td>
                      <td className="px-4 py-4 font-medium text-blue-600 dark:text-blue-400">
                        {m.entradas_pecas > 0 ? `+${m.entradas_pecas} peças` : '0'}
                      </td>
                      <td className="px-4 py-4 font-medium text-emerald-600 dark:text-emerald-400">
                        {m.saidas_pecas > 0 ? `-${m.saidas_pecas} peças` : '0'}
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                        {m.entregas_realizadas} {m.entregas_realizadas === 1 ? 'saída' : 'saídas'}
                      </td>
                      <td className="px-4 py-4 font-bold">
                        <span className={saldo >= 0 ? 'text-blue-600' : 'text-amber-600'}>
                          {saldo > 0 ? `+${saldo}` : saldo}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando relatório mensal...</div>}
          </div>
        </Card>
      )}
    </div>
  );
}
