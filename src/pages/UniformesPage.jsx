import { AlertTriangle, PackageCheck, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getEntradas, getEntregas, getEstoque, getTurmas } from '../api';
import { dateBR, pivotEstoque, TAMANHOS_UNIFORME } from '../data';
import { Button, Card, Empty, Header, Select } from '../components/UI';

const TABS = [
  { key: 'estoque', label: 'Estoque' },
  { key: 'entradas', label: 'Entradas' },
  { key: 'entregas', label: 'Entregas' },
];

export default function UniformesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const aba = TABS.some(t => t.key === params.get('aba')) ? params.get('aba') : 'estoque';
  const setAba = (key) => setParams(key === 'estoque' ? {} : { aba: key });

  return <div className="page-enter">
    <Header eyebrow="GESTÃO DE UNIFORMES" title="Uniformes" subtitle="Controle de estoque, entradas e entregas."
      actions={<>
        <Button variant="secondary" onClick={() => navigate('/uniformes/entrada')}><Plus size={16} /> Registrar entrada</Button>
        <Button onClick={() => navigate('/uniformes/entrega')}><PackageCheck size={16} /> Registrar entrega</Button>
      </>} />

    <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {TABS.map(t => (
        <button key={t.key} onClick={() => setAba(t.key)}
          className={`rounded-md px-5 py-2 text-sm font-semibold transition ${aba === t.key ? 'bg-[#2563eb] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
          {t.label}
        </button>
      ))}
    </div>

    {aba === 'estoque' && <AbaEstoque />}
    {aba === 'entradas' && <AbaEntradas />}
    {aba === 'entregas' && <AbaEntregas />}
  </div>;
}

function StatCard({ label, value, sub, color = 'text-slate-900' }) {
  return <Card className="p-5">
    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-slate-500">{sub}</div>
  </Card>;
}

function AbaEstoque() {
  const [itens, setItens] = useState([]);
  const [entradasMes, setEntradasMes] = useState(0);
  const [entregasMes, setEntregasMes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setLoading(true);
    const hoje = new Date();
    Promise.all([getEstoque(), getEntradas(), getEntregas()])
      .then(([estoque, entradas, entregas]) => {
        setItens(estoque);
        const doMes = (dataStr) => {
          const d = new Date(dataStr);
          return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
        };
        setEntradasMes(entradas.filter(e => doMes(e.data_recebimento)).reduce((t, e) => t + e.total_pecas, 0));
        setEntregasMes(entregas.filter(e => doMes(e.data_entrega)).reduce((t, e) => t + e.quantidade, 0));
      })
      .catch(() => setErro('Não foi possível carregar o estoque. Verifique se a API está no ar.'))
      .finally(() => setLoading(false));
  }, []);

  const alertas = itens.filter(i => i.alerta_saldo_baixo);
  const totalEstoque = itens.reduce((t, i) => t + i.quantidade_estoque, 0);
  const pivot = useMemo(() => pivotEstoque(itens), [itens]);

  return <>
    {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Peças em estoque" value={totalEstoque} sub="Total disponível" />
      <StatCard label="Entradas no mês" value={entradasMes} sub="Peças recebidas" color="text-blue-600" />
      <StatCard label="Entregas no mês" value={entregasMes} sub="Peças entregues" color="text-emerald-600" />
      <StatCard label="Estoque baixo" value={alertas.length} sub="Combinações abaixo do mínimo" color={alertas.length ? 'text-amber-600' : 'text-slate-900'} />
    </div>

    {!!alertas.length && (
      <Card className="mb-6 border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 text-amber-500" size={20} />
          <div>
            <h2 className="text-sm font-bold text-amber-800">Atenção: itens com saldo baixo</h2>
            <p className="mt-1 text-xs text-amber-700">{alertas.map(a => `${a.tipo} ${a.tamanho} (${a.quantidade_estoque} un.)`).join(' · ')}</p>
          </div>
        </div>
      </Card>
    )}

    <Card className="overflow-hidden">
      <div className="px-5 pb-2 pt-5"><h2 className="text-base font-bold">Estoque atual</h2><p className="text-xs text-slate-500">Quantidade disponível por peça e tamanho</p></div>
      <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[650px] border-collapse text-left text-xs">
          <thead><tr className="bg-slate-50 text-slate-500">
            <th className="px-4 py-3 font-medium">Peça</th>
            {TAMANHOS_UNIFORME.map(t => <th key={t} className="px-3 py-3 text-center font-medium">{t}</th>)}
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr></thead>
          <tbody>
            {pivot.map(row => (
              <tr key={row.tipo} className="border-b border-slate-100 align-top">
                <td className="px-4 py-4 font-semibold">
                  {row.tipo}
                  {row.algumBaixo && <div className="mt-1"><span className="inline-flex rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">Estoque baixo</span></div>}
                </td>
                {TAMANHOS_UNIFORME.map(t => <td key={t} className="px-3 py-4 text-center">{row[t]}</td>)}
                <td className="px-4 py-4 text-right font-bold">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !itens.length && <Empty text="Nenhum item de estoque cadastrado ainda. Registre uma entrada para começar." />}
        {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando estoque...</div>}
      </div>
    </Card>
  </>;
}

function AbaEntradas() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [q, setQ] = useState('');
  const [ano, setAno] = useState('');

  const carregar = () => {
    setLoading(true);
    getEntradas({ q, ano })
      .then(setLista)
      .catch(() => setErro('Não foi possível carregar as entradas. Verifique se a API está no ar.'))
      .finally(() => setLoading(false));
  };
  useEffect(carregar, []); // eslint-disable-line

  const anos = useMemo(() => [...new Set(lista.map(l => new Date(l.data_recebimento).getFullYear()))], [lista]);

  return <>
    {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
    <Card className="mb-6 p-5">
      <h2 className="mb-4 text-base font-bold">Filtros</h2>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto]">
        <label><span className="mb-2 block text-xs font-semibold">Buscar</span>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && carregar()} placeholder="Nota fiscal ou responsável..." className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
        <Select label="Período" value={ano} onChange={e => setAno(e.target.value)}>
          <option value="">Todas</option>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Button variant="secondary" className="self-end" onClick={carregar}>Filtrar</Button>
      </div>
    </Card>

    <Card className="overflow-hidden">
      <div className="px-5 pb-2 pt-5"><h2 className="text-base font-bold">Histórico de entradas</h2><p className="text-xs text-slate-500">Registros de lotes recebidos</p></div>
      <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead><tr className="bg-slate-50 text-slate-500">{['Data', 'Nota fiscal', 'Escola', 'Responsável', 'Itens', 'Total'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {lista.map(l => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="px-4 py-4 font-semibold">{dateBR(l.data_recebimento)}</td>
                <td className="px-4 py-4">{l.nota_fiscal || '—'}</td>
                <td className="px-4 py-4">{l.escola}</td>
                <td className="px-4 py-4">{l.responsavel}</td>
                <td className="px-4 py-4">{l.itens} {l.itens === 1 ? 'item' : 'itens'}</td>
                <td className="px-4 py-4 font-semibold">{l.total_pecas} peças</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !lista.length && <Empty text="Nenhuma entrada registrada ainda." />}
        {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando...</div>}
      </div>
    </Card>
  </>;
}

function AbaEntregas() {
  const [lista, setLista] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aluno, setAluno] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [ano, setAno] = useState('');

  useEffect(() => { getTurmas().then(setTurmas).catch(() => setTurmas([])); }, []);

  const carregar = () => {
    setLoading(true);
    getEntregas({ aluno, turma_id: turmaId, ano })
      .then(setLista)
      .catch(() => setErro('Não foi possível carregar as entregas. Verifique se a API está no ar.'))
      .finally(() => setLoading(false));
  };
  useEffect(carregar, []); // eslint-disable-line

  const anos = useMemo(() => [...new Set(lista.map(l => new Date(l.data_entrega).getFullYear()))], [lista]);

  return <>
    {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
    <Card className="mb-6 p-5">
      <h2 className="mb-4 text-base font-bold">Filtros</h2>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
        <label><span className="mb-2 block text-xs font-semibold">Aluno</span>
          <input value={aluno} onChange={e => setAluno(e.target.value)} onKeyDown={e => e.key === 'Enter' && carregar()} placeholder="Pesquisar por nome ou matrícula..." className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
        <Select label="Turma" value={turmaId} onChange={e => setTurmaId(e.target.value)}>
          <option value="">Todas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </Select>
        <Select label="Período" value={ano} onChange={e => setAno(e.target.value)}>
          <option value="">Todas</option>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Button variant="secondary" className="self-end" onClick={carregar}>Filtrar</Button>
      </div>
    </Card>

    <Card className="overflow-hidden">
      <div className="px-5 pb-2 pt-5"><h2 className="text-base font-bold">Histórico de entregas</h2><p className="text-xs text-slate-500">Registros de entrega por aluno</p></div>
      <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[750px] border-collapse text-left text-xs">
          <thead><tr className="bg-slate-50 text-slate-500">{['Data', 'Aluno', 'Turma', 'Responsável', 'Peças', 'Quantidade'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {lista.map(l => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="px-4 py-4 font-semibold">{dateBR(l.data_entrega)}</td>
                <td className="px-4 py-4">{l.aluno}</td>
                <td className="px-4 py-4">{l.turma}</td>
                <td className="px-4 py-4">{l.responsavel}</td>
                <td className="px-4 py-4 text-slate-500">{l.pecas || '—'}</td>
                <td className="px-4 py-4 font-semibold">{l.quantidade} {l.quantidade === 1 ? 'peça' : 'peças'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !lista.length && <Empty text="Nenhuma entrega registrada ainda." />}
        {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando...</div>}
      </div>
    </Card>
  </>;
}
