import { AlertTriangle, PackageCheck, Plus, Trash2, Settings, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getEntradas, getEntregas, getEstoque, getTurmas, createItemUniforme, deleteItemUniforme } from '../api';
import { dateBR, pivotEstoque, TAMANHOS_UNIFORME } from '../data';
import { Button, Card, Empty, Header, Select, Field } from '../components/UI';

const TABS = [
  { key: 'estoque', label: 'Estoque' },
  { key: 'entradas', label: 'Entradas' },
  { key: 'entregas', label: 'Histórico de Saídas' },
];

export default function UniformesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const aba = TABS.some(t => t.key === params.get('aba')) ? params.get('aba') : 'estoque';
  const setAba = (key) => setParams(key === 'estoque' ? {} : { aba: key });

  return (
    <div className="page-enter">
      <Header
        eyebrow="GESTÃO DE UNIFORMES"
        title="Uniformes"
        subtitle="Controle de estoque, entradas de lotes e registro de saídas."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/uniformes/entrada')}>
              <Plus size={16} /> Registrar entrada
            </Button>
            <Button onClick={() => navigate('/uniformes/entrega')}>
              <PackageCheck size={16} /> Registrar saída
            </Button>
          </>
        }
      />

      <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setAba(t.key)}
            className={`rounded-md px-5 py-2 text-sm font-semibold transition ${
              aba === t.key
                ? 'bg-[#2563eb] text-white shadow'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'estoque' && <AbaEstoque />}
      {aba === 'entradas' && <AbaEntradas />}
      {aba === 'entregas' && <AbaEntregas />}
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

function AbaEstoque() {
  const [itens, setItens] = useState([]);
  const [entradasMes, setEntradasMes] = useState(0);
  const [entregasMes, setEntregasMes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [modalGerenciar, setModalGerenciar] = useState(false);

  const carregarDados = () => {
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
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const alertas = itens.filter(i => i.alerta_saldo_baixo);
  const totalEstoque = itens.reduce((t, i) => t + i.quantidade_estoque, 0);

  // Exibe somente tipos de uniformes que existem no sistema (Item 14)
  const tiposExistentes = [...new Set(itens.map(i => i.tipo))];
  const tamanhosExistentes = [...new Set(itens.map(i => i.tamanho))];
  const colunasTamanho = tamanhosExistentes.length ? TAMANHOS_UNIFORME.filter(t => tamanhosExistentes.includes(t)) : TAMANHOS_UNIFORME;

  const pivot = useMemo(() => pivotEstoque(itens, tiposExistentes), [itens, tiposExistentes]);

  return (
    <>
      {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{erro}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Peças em estoque" value={totalEstoque} sub="Total disponível" />
        <StatCard label="Entradas no mês" value={entradasMes} sub="Peças recebidas" color="text-blue-600 dark:text-blue-400" />
        <StatCard label="Saídas no mês" value={entregasMes} sub="Peças entregues" color="text-emerald-600 dark:text-emerald-400" />
        <StatCard
          label="Estoque baixo"
          value={alertas.length}
          sub="Combinações abaixo do mínimo (10 un.)"
          color={alertas.length ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}
        />
      </div>

      {!!alertas.length && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-500" size={20} />
            <div>
              <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">Atenção: itens com saldo baixo</h2>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                {alertas.map(a => `${a.tipo} ${a.tamanho} (${a.quantidade_estoque} un.)`).join(' · ')}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 pb-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Estoque atual (Apenas uniformes da escola)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quantidade disponível por peça e tamanho</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setModalGerenciar(true)} className="h-9 px-3 text-xs">
              <Settings size={14} /> Gerenciar uniformes
            </Button>
            <Button onClick={() => setModalNovo(true)} className="h-9 px-3 text-xs">
              <Plus size={14} /> Novo tipo de uniforme
            </Button>
          </div>
        </div>

        <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[650px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Peça</th>
                {colunasTamanho.map(t => (
                  <th key={t} className="px-3 py-3 text-center font-medium">{t}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {pivot.map(row => (
                <tr key={row.tipo} className="border-b border-slate-100 align-top dark:border-slate-800">
                  <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">
                    {row.tipo}
                    {row.algumBaixo && (
                      <div className="mt-1">
                        <span className="inline-flex rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                          Estoque baixo
                        </span>
                      </div>
                    )}
                  </td>
                  {colunasTamanho.map(t => (
                    <td key={t} className="px-3 py-4 text-center text-slate-700 dark:text-slate-300">
                      {row[t] ?? 0}
                    </td>
                  ))}
                  <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !pivot.length && (
            <Empty text="Nenhum tipo de uniforme configurado para esta escola. Clique em 'Novo tipo de uniforme' para cadastrar." />
          )}
          {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando estoque...</div>}
        </div>
      </Card>

      {/* Modal Novo Tipo de Uniforme (Item 14) */}
      {modalNovo && (
        <ModalNovoUniforme
          close={() => setModalNovo(false)}
          onSuccess={() => {
            setModalNovo(false);
            carregarDados();
          }}
        />
      )}

      {/* Modal Gerenciar / Excluir Uniformes (Item 14) */}
      {modalGerenciar && (
        <ModalGerenciarUniformes
          itens={itens}
          close={() => setModalGerenciar(false)}
          onSuccess={() => {
            carregarDados();
          }}
        />
      )}
    </>
  );
}

// Modal para criar novo tipo de uniforme com seleção de tamanhos
function ModalNovoUniforme({ close, onSuccess }) {
  const [tipo, setTipo] = useState('');
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState(['P', 'M', 'G', 'GG']);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const toggleTamanho = (t) => {
    setTamanhosSelecionados(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (!tipo.trim()) return setErro('Informe o nome do uniforme (ex: Meia, Avental, Casaco).');
    if (!tamanhosSelecionados.length) return setErro('Selecione pelo menos um tamanho para este uniforme.');

    setSalvando(true);
    setErro('');
    try {
      for (const tam of tamanhosSelecionados) {
        await createItemUniforme({ tipo: tipo.trim(), tamanho: tam });
      }
      onSuccess();
    } catch (err) {
      setErro(err.message || 'Erro ao cadastrar tipo de uniforme.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cadastrar novo uniforme</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Defina o tipo da peça e os tamanhos disponíveis na sua escola.
        </p>

        {erro && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950 dark:text-red-300">{erro}</p>}

        <form onSubmit={salvar} className="mt-4 space-y-4">
          <Field
            label="Nome da peça"
            required
            placeholder="Ex: Meia, Colete, Avental, Jaqueta..."
            value={tipo}
            onChange={e => setTipo(e.target.value)}
          />

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-900 dark:text-slate-200">
              Tamanhos disponíveis *
            </label>
            <div className="flex flex-wrap gap-2">
              {TAMANHOS_UNIFORME.map(t => {
                const ativo = tamanhosSelecionados.includes(t);
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleTamanho(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      ativo
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={close} className="h-9 px-4 text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="h-9 px-4 text-xs">
              {salvando ? 'Cadastrando...' : 'Cadastrar uniforme'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para gerenciar / excluir uniformes que não se aplicam à escola (Item 14)
function ModalGerenciarUniformes({ itens, close, onSuccess }) {
  const [excluindoId, setExcluindoId] = useState(null);
  const [erro, setErro] = useState('');

  const tipos = [...new Set(itens.map(i => i.tipo))];

  const excluirPeca = async (tipo) => {
    const itensDoTipo = itens.filter(i => i.tipo === tipo);
    const temEstoque = itensDoTipo.some(i => i.quantidade_estoque > 0);
    if (temEstoque) {
      return setErro(`Não é possível excluir "${tipo}": existem peças em estoque. Zere o estoque antes de remover.`);
    }

    if (!window.confirm(`Tem certeza que deseja remover "${tipo}" dos uniformes da sua escola?`)) return;

    setErro('');
    setExcluindoId(tipo);
    try {
      for (const item of itensDoTipo) {
        await deleteItemUniforme(item.id);
      }
      onSuccess();
    } catch (err) {
      setErro(err.message || 'Erro ao remover uniforme.');
    } finally {
      setExcluindoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gerenciar uniformes da escola</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Remova peças que não se aplicam à sua escola (ex: boina, agasalho). Apenas peças com estoque zerado e sem histórico podem ser excluídas.
        </p>

        {erro && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950 dark:text-red-300">{erro}</p>}

        <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
          {tipos.map(tipo => {
            const itensDoTipo = itens.filter(i => i.tipo === tipo);
            const totalQtd = itensDoTipo.reduce((a, b) => a + b.quantidade_estoque, 0);
            return (
              <div
                key={tipo}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{tipo}</div>
                  <div className="text-xs text-slate-400">
                    {itensDoTipo.map(i => i.tamanho).join(', ')} · Estoque total: {totalQtd}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={excluindoId === tipo || totalQtd > 0}
                  onClick={() => excluirPeca(tipo)}
                  title={totalQtd > 0 ? 'Não pode excluir: estoque maior que zero' : 'Excluir da escola'}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-30 dark:border-red-900/40 dark:hover:bg-red-950"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={close} className="h-9 px-4 text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
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

  return (
    <>
      {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{erro}</p>}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Filtros de entradas</h2>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto]">
          <label>
            <span className="mb-2 block text-xs font-semibold text-slate-900 dark:text-slate-200">Buscar</span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && carregar()}
              placeholder="Nota fiscal ou responsável..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <Select label="Período" value={ano} onChange={e => setAno(e.target.value)}>
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Button variant="secondary" className="self-end" onClick={carregar}>Filtrar</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 pb-2 pt-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Histórico de lotes de entrada</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Registros de lotes de uniformes recebidos</p>
        </div>
        <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {['Data', 'Nota fiscal', 'Escola', 'Responsável', 'Itens', 'Total'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(l => (
                <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{dateBR(l.data_recebimento)}</td>
                  <td className="px-4 py-4">{l.nota_fiscal || '—'}</td>
                  <td className="px-4 py-4">{l.escola}</td>
                  <td className="px-4 py-4">{l.responsavel}</td>
                  <td className="px-4 py-4">{l.itens} {l.itens === 1 ? 'item' : 'itens'}</td>
                  <td className="px-4 py-4 font-semibold text-blue-600 dark:text-blue-400">{l.total_pecas} peças</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !lista.length && <Empty text="Nenhuma entrada de uniforme registrada ainda." />}
          {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando...</div>}
        </div>
      </Card>
    </>
  );
}

function AbaEntregas() {
  const [lista, setLista] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aluno, setAluno] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [ano, setAno] = useState('');

  useEffect(() => {
    getTurmas().then(setTurmas).catch(() => setTurmas([]));
  }, []);

  const carregar = () => {
    setLoading(true);
    getEntregas({ aluno, turma_id: turmaId, ano })
      .then(setLista)
      .catch(() => setErro('Não foi possível carregar as saídas. Verifique se a API está no ar.'))
      .finally(() => setLoading(false));
  };
  useEffect(carregar, []); // eslint-disable-line

  const anos = useMemo(() => [...new Set(lista.map(l => new Date(l.data_entrega).getFullYear()))], [lista]);

  return (
    <>
      {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{erro}</p>}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Filtros de saídas</h2>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
          <label>
            <span className="mb-2 block text-xs font-semibold text-slate-900 dark:text-slate-200">Aluno</span>
            <input
              value={aluno}
              onChange={e => setAluno(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && carregar()}
              placeholder="Pesquisar por nome ou matrícula..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <Select label="Turma" value={turmaId} onChange={e => setTurmaId(e.target.value)}>
            <option value="">Todas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Select>
          <Select label="Período" value={ano} onChange={e => setAno(e.target.value)}>
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Button variant="secondary" className="self-end" onClick={carregar}>Filtrar</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 pb-2 pt-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Histórico de saídas de uniformes</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Registros de entrega de peças por aluno</p>
        </div>
        <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[750px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {['Data', 'Aluno', 'Turma', 'Responsável', 'Peças', 'Quantidade'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(l => (
                <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{dateBR(l.data_entrega)}</td>
                  <td className="px-4 py-4 font-medium">{l.aluno}</td>
                  <td className="px-4 py-4">{l.turma}</td>
                  <td className="px-4 py-4">{l.responsavel}</td>
                  <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{l.pecas || '—'}</td>
                  <td className="px-4 py-4 font-semibold text-emerald-600 dark:text-emerald-400">{l.quantidade} {l.quantidade === 1 ? 'peça' : 'peças'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !lista.length && <Empty text="Nenhuma saída de uniforme registrada ainda." />}
          {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando saídas...</div>}
        </div>
      </Card>
    </>
  );
}
