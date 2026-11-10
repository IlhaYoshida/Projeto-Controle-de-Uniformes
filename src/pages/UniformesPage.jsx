import { AlertTriangle, PackageCheck, Plus, Trash2, Settings, Eye, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getEntradas, getEntregas, getEstoque, getTurmas, createItemUniforme, deleteItemUniforme, getLoteDetalhes } from '../api';
import { dateBR, pivotEstoque, TAMANHOS_UNIFORME } from '../data';
import { Button, Card, Empty, Header, Select, Field, ConfirmModal, AdminAuthModal } from '../components/UI';
import { useApp } from '../App';

const TABS = [
  { key: 'estoque', label: 'Estoque' },
  { key: 'entradas', label: 'Entradas' },
  { key: 'entregas', label: 'Histórico de Saídas' },
];

const MESES = [
  { valor: '', rotulo: 'Todos os meses' },
  { valor: '1', rotulo: 'Janeiro' },
  { valor: '2', rotulo: 'Fevereiro' },
  { valor: '3', rotulo: 'Março' },
  { valor: '4', rotulo: 'Abril' },
  { valor: '5', rotulo: 'Maio' },
  { valor: '6', rotulo: 'Junho' },
  { valor: '7', rotulo: 'Julho' },
  { valor: '8', rotulo: 'Agosto' },
  { valor: '9', rotulo: 'Setembro' },
  { valor: '10', rotulo: 'Outubro' },
  { valor: '11', rotulo: 'Novembro' },
  { valor: '12', rotulo: 'Dezembro' },
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

      {/* NOTIFICAÇÃO DE ESTOQUE BAIXO (Item 13: substituir saldo baixo por estoque baixo) */}
      {!!alertas.length && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-500" size={20} />
            <div>
              <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">Atenção: itens com estoque baixo</h2>
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

      {/* Modal Novo Tipo de Uniforme */}
      {modalNovo && (
        <ModalNovoUniforme
          close={() => setModalNovo(false)}
          onSuccess={() => {
            setModalNovo(false);
            carregarDados();
          }}
        />
      )}

      {/* Modal Gerenciar Uniformes e Tamanhos (Item 12) */}
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

// Modal para gerenciar uniformes e editar tamanhos (Item 12, 8, 18)
function ModalGerenciarUniformes({ itens, close, onSuccess }) {
  const { currentUser } = useApp();
  const [erro, setErro] = useState('');
  const [novoTamanhoMap, setNovoTamanhoMap] = useState({});
  const [salvando, setSalvando] = useState(false);

  // Estados de confirmação e RBAC
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [adminAuthModal, setAdminAuthModal] = useState({ isOpen: false, actionDesc: '', onSuccess: null });

  const tipos = [...new Set(itens.map(i => i.tipo))];

  const executarAcaoSegura = (actionDesc, onPermitido) => {
    if (currentUser?.role === 'padrao') {
      setAdminAuthModal({
        isOpen: true,
        actionDesc,
        onSuccess: onPermitido,
      });
    } else {
      onPermitido();
    }
  };

  const handleExcluirTamanho = (item) => {
    if (item.quantidade_estoque > 0) {
      return setErro(`Não é possível remover o tamanho ${item.tamanho}: há ${item.quantidade_estoque} unidade(s) em estoque.`);
    }

    executarAcaoSegura(`excluir o tamanho ${item.tamanho} de ${item.tipo}`, () => {
      setConfirmModal({
        isOpen: true,
        title: 'Remover Tamanho',
        message: `Deseja realmente remover o tamanho "${item.tamanho}" do uniforme "${item.tipo}"?`,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setSalvando(true);
          setErro('');
          try {
            await deleteItemUniforme(item.id);
            onSuccess();
          } catch (err) {
            setErro(err.message || 'Erro ao remover tamanho.');
          } finally {
            setSalvando(false);
          }
        },
      });
    });
  };

  const handleAdicionarTamanho = async (tipo) => {
    const tamSelecionado = novoTamanhoMap[tipo];
    if (!tamSelecionado) return setErro('Selecione um tamanho para adicionar.');

    setSalvando(true);
    setErro('');
    try {
      await createItemUniforme({ tipo, tamanho: tamSelecionado });
      setNovoTamanhoMap(prev => ({ ...prev, [tipo]: '' }));
      onSuccess();
    } catch (err) {
      setErro(err.message || 'Erro ao adicionar tamanho.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirTipoCompleto = (tipo) => {
    const itensDoTipo = itens.filter(i => i.tipo === tipo);
    const temEstoque = itensDoTipo.some(i => i.quantidade_estoque > 0);
    if (temEstoque) {
      return setErro(`Não é possível excluir "${tipo}": existem peças em estoque. Zere o estoque antes de remover.`);
    }

    executarAcaoSegura(`excluir o uniforme completo "${tipo}"`, () => {
      setConfirmModal({
        isOpen: true,
        title: 'Excluir Uniforme',
        message: `Tem certeza que deseja remover o uniforme "${tipo}" e todos os seus tamanhos da escola?`,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setSalvando(true);
          setErro('');
          try {
            for (const item of itensDoTipo) {
              await deleteItemUniforme(item.id);
            }
            onSuccess();
          } catch (err) {
            setErro(err.message || 'Erro ao remover uniforme.');
          } finally {
            setSalvando(false);
          }
        },
      });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gerenciar Uniformes e Tamanhos</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Adicione ou remova tamanhos configurados por uniforme. Tamanhos só podem ser excluídos se possuírem estoque zerado.
          </p>
        </div>

        {erro && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950 dark:text-red-300">
            {erro}
          </p>
        )}

        <div className="my-4 overflow-y-auto space-y-4 pr-1 flex-1">
          {tipos.map(tipo => {
            const itensDoTipo = itens.filter(i => i.tipo === tipo);
            const totalQtd = itensDoTipo.reduce((a, b) => a + b.quantidade_estoque, 0);
            const tamanhosExistentes = itensDoTipo.map(i => i.tamanho);
            const tamanhosRestantes = TAMANHOS_UNIFORME.filter(t => !tamanhosExistentes.includes(t));

            return (
              <div
                key={tipo}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tipo}</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Estoque total: <strong>{totalQtd}</strong> un.
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    disabled={salvando || totalQtd > 0}
                    onClick={() => handleExcluirTipoCompleto(tipo)}
                    title={totalQtd > 0 ? 'Não pode excluir: possui estoque' : 'Excluir uniforme da escola'}
                    className="h-8 px-2.5 text-xs"
                  >
                    <Trash2 size={13} /> Excluir tipo
                  </Button>
                </div>

                {/* Lista de tamanhos configurados (Item 12) */}
                <div className="mt-3">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">
                    Tamanhos ativos:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {itensDoTipo.map(item => (
                      <div
                        key={item.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <span>{item.tamanho}</span>
                        <span className="text-[10px] text-slate-400">({item.quantidade_estoque})</span>
                        <button
                          type="button"
                          disabled={salvando || item.quantidade_estoque > 0}
                          onClick={() => handleExcluirTamanho(item)}
                          title={item.quantidade_estoque > 0 ? 'Estoque > 0 (não é possível remover)' : 'Remover tamanho'}
                          className="ml-1 text-slate-400 hover:text-red-600 disabled:opacity-20 disabled:hover:text-slate-400"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Adicionar novo tamanho a este uniforme (Item 12) */}
                {tamanhosRestantes.length > 0 && (
                  <div className="mt-3.5 flex items-center gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                    <select
                      value={novoTamanhoMap[tipo] || ''}
                      onChange={e => setNovoTamanhoMap(prev => ({ ...prev, [tipo]: e.target.value }))}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Adicionar tamanho...</option>
                      {tamanhosRestantes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      disabled={salvando || !novoTamanhoMap[tipo]}
                      onClick={() => handleAdicionarTamanho(tipo)}
                      className="h-8 px-3 text-xs"
                    >
                      <Plus size={13} /> Adicionar tamanho
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={close} className="h-9 px-4 text-xs">
            Fechar
          </Button>
        </div>
      </div>

      {/* Confirmação in-app (Item 8) */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Autorização de administrador (Item 18) */}
      <AdminAuthModal
        isOpen={adminAuthModal.isOpen}
        actionDesc={adminAuthModal.actionDesc}
        onSuccess={adminAuthModal.onSuccess}
        onClose={() => setAdminAuthModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

// ABA ENTRADAS COM FILTROS DE ANO, MÊS, DIA E MODAL DE DETALHES (Item 9 e 16)
function AbaEntradas() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [q, setQ] = useState('');
  const [ano, setAno] = useState('');
  const [mes, setMes] = useState('');
  const [dia, setDia] = useState('');

  // Detalhes do lote (Item 9)
  const [loteDetalhes, setLoteDetalhes] = useState(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  const carregar = () => {
    setLoading(true);
    getEntradas({ q, ano, mes, dia })
      .then(setLista)
      .catch(() => setErro('Não foi possível carregar as entradas. Verifique se a API está no ar.'))
      .finally(() => setLoading(false));
  };

  useEffect(carregar, [ano, mes, dia]); // eslint-disable-line

  const abrirDetalhes = async (loteId) => {
    setLoadingDetalhes(true);
    try {
      const dados = await getLoteDetalhes(loteId);
      setLoteDetalhes(dados);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar detalhes do lote.');
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const anos = useMemo(() => {
    const setAnos = new Set(lista.map(l => new Date(l.data_recebimento).getFullYear()));
    setAnos.add(new Date().getFullYear());
    return Array.from(setAnos).sort((a, b) => b - a);
  }, [lista]);

  return (
    <>
      {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{erro}</p>}
      
      {/* FILTROS DE ENTRADAS (Item 16: ano, mês, dia, NF/responsável) */}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Filtros de entradas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Field
              label="Buscar"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && carregar()}
              placeholder="Nota fiscal ou responsável..."
            />
          </div>
          <Select label="Ano" value={ano} onChange={e => setAno(e.target.value)}>
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select label="Mês" value={mes} onChange={e => setMes(e.target.value)}>
            {MESES.map(m => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
          </Select>
          <div>
            <Field
              label="Dia"
              type="number"
              min="1"
              max="31"
              value={dia}
              onChange={e => setDia(e.target.value)}
              placeholder="Ex: 15"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            className="h-9 px-4 text-xs"
            onClick={() => { setQ(''); setAno(''); setMes(''); setDia(''); }}
          >
            Limpar filtros
          </Button>
          <Button className="h-9 px-5 text-xs" onClick={carregar}>
            Filtrar
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 pb-2 pt-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Histórico de lotes de entrada</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Registros de lotes de uniformes recebidos</p>
        </div>
        <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[750px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {['Data', 'Nota fiscal', 'Escola', 'Responsável', 'Itens', 'Total', 'Ações'].map(h => (
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
                  <td className="px-4 py-4">
                    {/* BOTÃO PARA VER DETALHES DOS ITENS DO LOTE (Item 9) */}
                    <button
                      type="button"
                      onClick={() => abrirDetalhes(l.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Eye size={13} /> Ver itens
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !lista.length && <Empty text="Nenhuma entrada de uniforme encontrada com os filtros selecionados." />}
          {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando...</div>}
        </div>
      </Card>

      {/* MODAL DE DETALHES DO LOTE (Item 9) */}
      {loteDetalhes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Itens Recebidos no Lote #{loteDetalhes.lote_id}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data: {dateBR(loteDetalhes.data_recebimento)} · NF: {loteDetalhes.nota_fiscal || 'Sem NF'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoteDetalhes(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
              <div>
                <span className="text-slate-400">Responsável:</span>
                <p className="font-semibold text-slate-800 dark:text-white">{loteDetalhes.responsavel || '-'}</p>
              </div>
              <div>
                <span className="text-slate-400">Escola:</span>
                <p className="font-semibold text-slate-800 dark:text-white">{loteDetalhes.escola || '-'}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Item do Uniforme</th>
                    <th className="p-3 text-center">Tamanho</th>
                    <th className="p-3 text-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loteDetalhes.itens.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-medium text-slate-900 dark:text-white">{it.tipo}</td>
                      <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">{it.tamanho}</td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">+{it.quantidade_recebida || it.quantidade} un.</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 font-bold dark:border-slate-700 dark:bg-slate-800/80">
                  <tr>
                    <td colSpan={2} className="p-3 text-slate-700 dark:text-slate-300">Total do Lote:</td>
                    <td className="p-3 text-right text-blue-600 dark:text-blue-400">{loteDetalhes.total_pecas} peças</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setLoteDetalhes(null)} className="h-9 px-4 text-xs">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
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
