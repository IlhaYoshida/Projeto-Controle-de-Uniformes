import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Plus, Edit2, Trash2, CheckCircle2, Clock, Sparkles, ChevronRight, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { getTurmas, createTurma, updateTurma, deleteTurma, getEstatisticasTurma, getAlunosDaTurma, deleteAluno } from '../api';
import { useApp } from '../App';
import { Button, Card, Header, Field, Empty, Badge, ConfirmModal, AdminAuthModal } from '../components/UI';
import { initials } from '../data';

export default function TurmasPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const turmaParamId = searchParams.get('turma_id');

  const { escolaId, recarregar, currentUser } = useApp();
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState(turmaParamId ? Number(turmaParamId) : null);
  const [stats, setStats] = useState(null);
  const [alunosTurma, setAlunosTurma] = useState([]);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  // Modais e formulários
  const [modalNova, setModalNova] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // Modais de confirmação e RBAC
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [adminAuthModal, setAdminAuthModal] = useState({ isOpen: false, actionDesc: '', onSuccess: null });

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

  const carregarTurmas = async () => {
    setLoading(true);
    try {
      const data = await getTurmas();
      setTurmas(data);
      if (data.length > 0) {
        if (turmaParamId && data.some(t => String(t.id) === String(turmaParamId))) {
          setTurmaSelecionadaId(Number(turmaParamId));
        } else if (!turmaSelecionadaId) {
          setTurmaSelecionadaId(data[0].id);
        }
      }
    } catch {
      setErro('Não foi possível carregar as turmas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTurmas();
  }, [turmaParamId]); // eslint-disable-line

  // Carrega estatísticas e alunos da turma selecionada
  useEffect(() => {
    if (!turmaSelecionadaId) {
      setStats(null);
      setAlunosTurma([]);
      return;
    }
    setLoadingDetalhes(true);
    Promise.all([
      getEstatisticasTurma(turmaSelecionadaId),
      getAlunosDaTurma(turmaSelecionadaId),
    ])
      .then(([estatisticas, listaAlunos]) => {
        setStats(estatisticas);
        setAlunosTurma(listaAlunos);
      })
      .catch(() => {
        setStats(null);
      })
      .finally(() => setLoadingDetalhes(false));
  }, [turmaSelecionadaId]);

  // ENGINE DE SUGESTÕES INTELIGENTES (Item 4)
  const sugestoesInteligentes = useMemo(() => {
    const nomesExistentes = turmas.map(t => t.nome.trim());

    if (turmas.length < 2) {
      const padraoInicial = ['1º A', '1º B', '2º A', '2º B', '3º A', '3º B', '4º A', '4º B', '5º A', '5º B'];
      return padraoInicial.filter(n => !nomesExistentes.includes(n));
    }

    const sugestoes = new Set();
    const parsed = turmas.map(t => {
      const matchNum = t.nome.match(/(\d+)/);
      const matchLetra = t.nome.match(/([A-Za-z])$/);
      return {
        num: matchNum ? parseInt(matchNum[1], 10) : null,
        letra: matchLetra ? matchLetra[1].toUpperCase() : null,
        original: t.nome,
      };
    }).filter(p => p.num !== null);

    if (parsed.length >= 2) {
      const porSerie = {};
      parsed.forEach(p => {
        if (!porSerie[p.num]) porSerie[p.num] = [];
        if (p.letra) porSerie[p.num].push(p.letra);
      });

      Object.entries(porSerie).forEach(([num, letras]) => {
        if (letras.length >= 2) {
          const charCodes = letras.map(l => l.charCodeAt(0)).sort();
          const maxChar = Math.max(...charCodes);
          const proximaLetra1 = String.fromCharCode(maxChar + 1);
          const proximaLetra2 = String.fromCharCode(maxChar + 2);
          sugestoes.add(`${num}º ${proximaLetra1}`);
          sugestoes.add(`${num}º ${proximaLetra2}`);
        }
      });

      const letrasUnicas = [...new Set(parsed.map(p => p.letra).filter(Boolean))];
      letrasUnicas.forEach(letra => {
        const seriesComEssaLetra = parsed.filter(p => p.letra === letra).map(p => p.num).sort((a, b) => a - b);
        if (seriesComEssaLetra.length >= 2) {
          const maxSerie = Math.max(...seriesComEssaLetra);
          if (maxSerie < 9) {
            for (let s = maxSerie + 1; s <= Math.min(maxSerie + 3, 9); s++) {
              sugestoes.add(`${s}º ${letra}`);
            }
          }
        }
      });

      const todasSeries = parsed.map(p => p.num);
      const maxGeral = Math.max(...todasSeries);
      if (maxGeral < 9) {
        sugestoes.add(`${maxGeral + 1}º A`);
        sugestoes.add(`${maxGeral + 1}º B`);
      }
    }

    return Array.from(sugestoes).filter(s => !nomesExistentes.includes(s)).slice(0, 8);
  }, [turmas]);

  const aceitarSugestao = async (nomeSugerido) => {
    try {
      await createTurma({
        escola_id: escolaId || 1,
        nome: nomeSugerido,
      });
      setMensagemSucesso(`Turma "${nomeSugerido}" adicionada com sucesso!`);
      await carregarTurmas();
      await recarregar();
    } catch (err) {
      setErro(err.message || 'Erro ao adicionar sugestão.');
    }
  };

  const aceitarTodasSugestoes = async () => {
    try {
      for (const s of sugestoesInteligentes) {
        await createTurma({ escola_id: escolaId || 1, nome: s });
      }
      setMensagemSucesso('Todas as turmas sugeridas foram cadastradas!');
      await carregarTurmas();
      await recarregar();
    } catch (err) {
      setErro(err.message || 'Erro ao adicionar sugestões.');
    }
  };

  const handleExcluirTurma = (id, nome) => {
    executarAcaoSegura(`excluir a turma "${nome}"`, () => {
      setConfirmModal({
        isOpen: true,
        title: 'Excluir Turma',
        message: `Tem certeza que deseja excluir a turma "${nome}"? Esta ação removerá a turma da escola.`,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          try {
            await deleteTurma(id);
            setMensagemSucesso(`Turma "${nome}" excluída.`);
            if (turmaSelecionadaId === id) setTurmaSelecionadaId(null);
            await carregarTurmas();
            await recarregar();
          } catch (err) {
            setErro(err.message || 'Não foi possível excluir a turma.');
          }
        },
      });
    });
  };

  const handleExcluirAlunoDaTurma = (alunoId, alunoNome) => {
    executarAcaoSegura(`remover o aluno "${alunoNome}"`, () => {
      setConfirmModal({
        isOpen: true,
        title: 'Remover Aluno',
        message: `Tem certeza que deseja remover o aluno "${alunoNome}" do sistema?`,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          try {
            await deleteAluno(alunoId);
            setAlunosTurma(prev => prev.filter(a => a.id !== alunoId));
            if (turmaSelecionadaId) {
              const est = await getEstatisticasTurma(turmaSelecionadaId);
              setStats(est);
            }
            await recarregar();
          } catch (err) {
            setErro(err.message || 'Erro ao remover aluno.');
          }
        },
      });
    });
  };

  const turmaAtual = turmas.find(t => t.id === turmaSelecionadaId);

  return (
    <div className="page-enter">
      <Header
        eyebrow="TURMAS ESCOLARES"
        title="Turmas"
        subtitle="Gerencie as turmas cadastradas, acompanhe entregas de uniformes e analise tamanhos."
        actions={
          <Button onClick={() => setModalNova(true)}>
            <Plus size={16} /> Adicionar turma
          </Button>
        }
      />

      {erro && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}
      {mensagemSucesso && (
        <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {mensagemSucesso}
        </p>
      )}

      {/* Alerta de turmas não cadastradas (Item 4) */}
      {!loading && !turmas.length && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-start gap-4">
            <Clock className="text-amber-600 mt-0.5" size={24} />
            <div>
              <h2 className="text-base font-bold text-amber-900 dark:text-amber-300">
                Cadastro inicial de turmas obrigatório
              </h2>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
                Para vincular e acompanhar os alunos e seus uniformes, você precisa cadastrar as turmas da sua escola.
                Utilize as sugestões automáticas abaixo para agilizar o processo!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Caixa de sugestões inteligentes (Item 4) */}
      {sugestoesInteligentes.length > 0 && (
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 p-5 dark:border-blue-900/40 dark:from-blue-950/20 dark:to-indigo-950/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="text-blue-600 dark:text-blue-400" size={19} />
              <div>
                <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">
                  Sugestões automáticas com base no seu padrão
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Detectamos a sequência das suas turmas. Clique para adicionar rapidamente:
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={aceitarTodasSugestoes} className="h-8 px-3 text-xs self-start sm:self-auto">
              Aceitar todas as sugestões
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {sugestoesInteligentes.map(s => (
              <button
                key={s}
                onClick={() => aceitarSugestao(s)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-600 hover:text-white dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white"
              >
                <Plus size={13} /> {s}
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Painel lateral esquerdo: Lista de turmas */}
        <Card className="p-4 flex flex-col">
          <div className="mb-3 flex items-center justify-between px-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Turmas ({turmas.length})
            </h3>
            <button
              onClick={() => setModalNova(true)}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1"
            >
              <Plus size={13} /> Nova
            </button>
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
            {turmas.map(t => {
              const ativa = t.id === turmaSelecionadaId;
              return (
                <div
                  key={t.id}
                  onClick={() => setTurmaSelecionadaId(t.id)}
                  className={`group flex items-center justify-between rounded-lg p-3 text-sm font-semibold transition cursor-pointer ${
                    ativa
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users size={16} className={ativa ? 'text-white' : 'text-slate-400'} />
                    <span>{t.nome}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      title="Editar nome"
                      onClick={(e) => { e.stopPropagation(); setModalEditar(t); }}
                      className={`p-1 rounded hover:bg-black/10 ${ativa ? 'text-white' : 'text-slate-500'}`}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      title="Excluir turma"
                      onClick={(e) => { e.stopPropagation(); handleExcluirTurma(t.id, t.nome); }}
                      className={`p-1 rounded hover:bg-black/10 ${ativa ? 'text-white' : 'text-red-500'}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            {!loading && !turmas.length && (
              <p className="py-6 text-center text-xs text-slate-400">Nenhuma turma cadastrada.</p>
            )}
          </div>
        </Card>

        {/* Painel direito: Detalhes, Gráficos Interativos e Alunos da Turma Selecionada (Item 5) */}
        <div>
          {turmaAtual ? (
            <div className="space-y-6">
              {/* Header da Turma Selecionada */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider dark:text-blue-400">
                    VISÃO DA TURMA
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {turmaAtual.nome}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setModalEditar(turmaAtual)} className="h-9 px-3 text-xs">
                    <Edit2 size={14} /> Renomear turma
                  </Button>
                  <Button variant="danger" onClick={() => handleExcluirTurma(turmaAtual.id, turmaAtual.nome)} className="h-9 px-3 text-xs">
                    <Trash2 size={14} /> Excluir turma
                  </Button>
                </div>
              </div>

              {/* GRÁFICOS INTERATIVOS DE UNIFORMES (Item 5) */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* Gráfico 1: Proporção e número de entregas realizadas vs pendentes */}
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PieIcon size={18} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Entregas de uniformes na turma
                    </h3>
                  </div>

                  {stats && stats.total_alunos > 0 ? (
                    <div>
                      {/* Barra de Proporção Interativa */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Entregues: {stats.alunos_com_entrega} ({Math.round((stats.alunos_com_entrega / stats.total_alunos) * 100)}%)
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            Faltando: {stats.alunos_sem_entrega} ({Math.round((stats.alunos_sem_entrega / stats.total_alunos) * 100)}%)
                          </span>
                        </div>
                        <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                          <div
                            style={{ width: `${(stats.alunos_com_entrega / stats.total_alunos) * 100}%` }}
                            className="bg-emerald-500 transition-all duration-500"
                            title={`Entregues: ${stats.alunos_com_entrega}`}
                          />
                          <div
                            style={{ width: `${(stats.alunos_sem_entrega / stats.total_alunos) * 100}%` }}
                            className="bg-amber-400 transition-all duration-500"
                            title={`Faltando: ${stats.alunos_sem_entrega}`}
                          />
                        </div>
                      </div>

                      {/* Resumo em cards */}
                      <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                          <div className="text-lg font-bold text-slate-900 dark:text-white">{stats.total_alunos}</div>
                          <div className="text-[10px] text-slate-500">Total alunos</div>
                        </div>
                        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30">
                          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.alunos_com_entrega}</div>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Receberam</div>
                        </div>
                        <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30">
                          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.alunos_sem_entrega}</div>
                          <div className="text-[10px] text-amber-700 dark:text-amber-300">Faltando</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Empty text="Nenhum aluno matriculado nesta turma para gerar o gráfico." />
                  )}
                </Card>

                {/* Gráfico 2: Divisão de tamanhos de camiseta e peças entregues */}
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Distribuição de tamanhos (Camisetas)
                    </h3>
                  </div>

                  {stats && Object.keys(stats.tamanhos_camiseta || {}).length > 0 ? (
                    <div className="space-y-2.5">
                      {Object.entries(stats.tamanhos_camiseta).map(([tam, qtd]) => {
                        const pct = Math.round((qtd / stats.total_alunos) * 100);
                        return (
                          <div key={tam} className="text-xs">
                            <div className="flex justify-between font-medium mb-1 text-slate-700 dark:text-slate-300">
                              <span>Tamanho {tam}</span>
                              <span>{qtd} aluno(s) ({pct}%)</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-blue-600 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div className="mt-4 pt-3 text-right text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                        Total de peças entregues nesta turma: <b className="text-slate-800 dark:text-white">{stats.total_pecas_entregues} peças</b>
                      </div>
                    </div>
                  ) : (
                    <Empty text="Nenhum tamanho cadastrado para os alunos desta turma." />
                  )}
                </Card>
              </div>

              {/* LISTA DE ALUNOS DA TURMA: VER, EDITAR E EXCLUIR (Item 5) */}
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 pb-2 pt-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Alunos matriculados nesta turma
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {alunosTurma.length} alunos cadastrados no {turmaAtual.nome}
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate(`/alunos/novo?turma_id=${turmaAtual.id}&origem=turmas`)}
                    className="h-8 px-3 text-xs"
                  >
                    <Plus size={14} /> Adicionar aluno à turma
                  </Button>
                </div>

                <div className="scrollbar-thin overflow-x-auto px-5 pb-5 mt-2">
                  <table className="w-full min-w-[650px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {['Aluno', 'Matrícula', 'Tam. Camiseta', 'Situação', 'Ações'].map(h => (
                          <th key={h} className="px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alunosTurma.map(a => {
                        const situacao = a.recebidos > 0 ? 'Recebido' : 'Pendente';
                        return (
                          <tr
                            key={a.id}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                                {initials(a.nome)}
                              </span>
                              {a.nome}
                            </td>
                            <td className="px-4 py-3">{a.matricula}</td>
                            <td className="px-4 py-3 font-semibold">{a.tamanho || '—'}</td>
                            <td className="px-4 py-3">
                              <Badge status={situacao} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  title="Ver histórico"
                                  onClick={() => navigate(`/alunos/${a.id}`)}
                                  className="rounded p-1 hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  title="Editar aluno"
                                  onClick={() => navigate(`/alunos/${a.id}/editar`)}
                                  className="rounded p-1 hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-950"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  title="Excluir aluno"
                                  onClick={() => handleExcluirAlunoDaTurma(a.id, a.nome)}
                                  className="rounded p-1 hover:bg-red-50 text-red-600 dark:hover:bg-red-950"
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!loadingDetalhes && !alunosTurma.length && (
                    <Empty text="Nenhum aluno matriculado nesta turma ainda." />
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Empty text="Selecione uma turma ao lado para ver estatísticas, gráficos e alunos." />
            </Card>
          )}
        </div>
      </div>

      {/* Modal Nova Turma com Verificação de Duplicidade (Item 4) */}
      {modalNova && (
        <ModalFormTurma
          titulo="Adicionar nova turma"
          turmasExistentes={turmas}
          onClose={() => setModalNova(false)}
          onSave={async (nome) => {
            await createTurma({ escola_id: escolaId || 1, nome });
            await carregarTurmas();
            await recarregar();
          }}
        />
      )}

      {/* Modal Editar Turma (Item 5) */}
      {modalEditar && (
        <ModalFormTurma
          titulo="Editar turma"
          valorInicial={modalEditar.nome}
          turmaIdAtual={modalEditar.id}
          turmasExistentes={turmas}
          onClose={() => setModalEditar(null)}
          onSave={async (nome) => {
            await updateTurma(modalEditar.id, { nome });
            await carregarTurmas();
            await recarregar();
          }}
        />
      )}
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

function ModalFormTurma({ titulo, valorInicial = '', turmaIdAtual = null, turmasExistentes = [], onClose, onSave }) {
  const [nome, setNome] = useState(valorInicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return setErro('Informe o nome da turma (ex: 5º A).');

    // Validação de duplicidade no frontend (Item 4)
    const duplicada = turmasExistentes.some(
      t => t.nome.toLowerCase() === nomeLimpo.toLowerCase() && t.id !== turmaIdAtual
    );
    if (duplicada) {
      return setErro(`A turma "${nomeLimpo}" já está cadastrada nesta escola.`);
    }

    setSalvando(true);
    setErro('');
    try {
      await onSave(nomeLimpo);
      onClose();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar turma.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{titulo}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Identificação da turma escolar (ex: 5º A, 6º B, 1º Ano).
        </p>

        {erro && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950 dark:text-red-300">{erro}</p>}

        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field
            label="Nome da turma"
            required
            placeholder="Ex: 5º A"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={onClose} className="h-9 px-4 text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="h-9 px-4 text-xs">
              {salvando ? 'Salvando...' : 'Salvar turma'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
