import { Search, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { getEstoque, getUsuarios } from '../api';
import { initials } from '../data';
import { Back, Button, Card, Header, Select, Field } from '../components/UI';

const linhaVazia = { tipo: '', tamanho: '', quantidade: 1 };

export default function RegistrarEntregaPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { students, addDelivery, currentUser } = useApp();
  const [estoque, setEstoque] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [busca, setBusca] = useState('');
  const [alunoId, setAlunoId] = useState(params.get('aluno_id') || '');
  const [linhas, setLinhas] = useState([{ ...linhaVazia }]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    getEstoque().then(setEstoque).catch(() => setEstoque([]));
    getUsuarios().then(list => {
      setUsuarios(list);
      // Se há usuário logado, pré-seleciona ele
      if (currentUser?.id && list.some(u => u.id === currentUser.id)) {
        setUsuarioId(currentUser.id);
      } else if (list.length) {
        setUsuarioId(list[0].id);
      }
    }).catch(() => setUsuarios([]));
  }, [currentUser]);

  const alunoSelecionado = students.find(s => String(s.id) === String(alunoId));

  const resultadosBusca = useMemo(() => {
    if (!busca.trim() || alunoSelecionado) return [];
    const alvo = busca.trim().toLowerCase();
    return students
      .filter(s => s.nome.toLowerCase().includes(alvo) || String(s.matricula || '').includes(alvo))
      .slice(0, 6);
  }, [busca, students, alunoSelecionado]);

  // FILTRA ESTRITAMENTE: exibe SOMENTE tipos que têm pelo menos um tamanho com estoque > 0 (Item 11)
  const itensEmEstoque = useMemo(() => estoque.filter(i => i.quantidade_estoque > 0), [estoque]);
  const tiposDisponiveis = useMemo(() => [...new Set(itensEmEstoque.map(i => i.tipo))], [itensEmEstoque]);

  // Para o tipo selecionado, exibe SOMENTE os tamanhos com estoque > 0
  const tamanhosDisponiveis = (tipo) => {
    if (!tipo) return [];
    return itensEmEstoque.filter(i => i.tipo === tipo).map(i => i.tamanho);
  };

  const getSaldoDisponivel = (tipo, tamanho) => {
    if (!tipo || !tamanho) return 0;
    const item = itensEmEstoque.find(i => i.tipo === tipo && i.tamanho === tamanho);
    return item ? item.quantidade_estoque : 0;
  };

  const addLinha = () => setLinhas(l => [...l, { ...linhaVazia }]);
  const removeLinha = (i) => setLinhas(l => l.filter((_, idx) => idx !== i));
  const mudaLinha = (i, campo, valor) => {
    setLinhas(l => l.map((linha, idx) => {
      if (idx !== i) return linha;
      const atualizada = { ...linha, [campo]: valor };
      // Se alterou o tipo, reseta o tamanho
      if (campo === 'tipo') atualizada.tamanho = '';
      return atualizada;
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!alunoId) return setErro('Pesquise e selecione o aluno que receberá os uniformes.');
    if (!usuarioId) return setErro('Selecione o responsável pelo registro da saída.');

    // Valida itens
    const itensValidos = linhas.filter(l => l.tipo && l.tamanho);
    if (!itensValidos.length) return setErro('Adicione pelo menos um item disponível para saída.');

    const itensParaEntrega = [];
    for (const linha of itensValidos) {
      const saldo = getSaldoDisponivel(linha.tipo, linha.tamanho);
      const qtd = Number(linha.quantidade) || 0;
      if (qtd <= 0) return setErro(`A quantidade de ${linha.tipo} (${linha.tamanho}) deve ser maior que zero.`);
      if (qtd > saldo) {
        return setErro(`Estoque insuficiente de ${linha.tipo} (${linha.tamanho}): disponível apenas ${saldo} unidade(s).`);
      }

      const itemDb = itensEmEstoque.find(i => i.tipo === linha.tipo && i.tamanho === linha.tamanho);
      if (!itemDb) return setErro(`Item ${linha.tipo} (${linha.tamanho}) não encontrado em estoque.`);

      itensParaEntrega.push({
        item_uniforme_id: itemDb.id,
        quantidade_entregue: qtd,
      });
    }

    setSalvando(true);
    try {
      await addDelivery(alunoId, usuarioId, itensParaEntrega);
      navigate(`/alunos/${alunoId}`);
    } catch (err) {
      setErro(err.message || 'Não foi possível registrar a saída.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="page-enter">
      <Header
        eyebrow="UNIFORMES"
        title="Registrar saída de uniforme"
        subtitle="Associe a entrega de peças ao aluno com base nos itens disponíveis em estoque."
      />
      <Back />
      <form onSubmit={submit}>
        <Card className="p-6 sm:p-8">
          {erro && (
            <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {erro}
            </p>
          )}

          <h2 className="mb-3 text-[10px] font-bold text-[#2563eb] dark:text-blue-400">ALUNO BENEFICIADO</h2>
          {alunoSelecionado ? (
            <div className="mb-7 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300">
                  {initials(alunoSelecionado.nome)}
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{alunoSelecionado.nome}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {alunoSelecionado.turma || 'Sem turma'} · Matrícula {alunoSelecionado.matricula}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setAlunoId(''); setBusca(''); }}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Trocar aluno
              </button>
            </div>
          ) : (
            <div className="relative mb-7">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Pesquisar aluno por nome ou matrícula..."
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              {!!resultadosBusca.length && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {resultadosBusca.map(s => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => { setAlunoId(s.id); setBusca(''); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                        {initials(s.nome)}
                      </span>
                      <span>{s.nome} <span className="text-slate-400">· {s.turma} · {s.matricula}</span></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mb-7">
            <Select
              label="Responsável pelo registro da saída"
              required
              value={usuarioId}
              onChange={e => setUsuarioId(e.target.value)}
            >
              <option value="">Selecione o usuário</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </Select>
          </div>

          <h2 className="mb-3 text-[10px] font-bold text-[#2563eb] dark:text-blue-400">
            PEÇAS A ENTREGAR (APENAS DISPONÍVEIS EM ESTOQUE)
          </h2>

          {!tiposDisponiveis.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              Não há peças disponíveis com saldo positivo no estoque no momento. Registre uma entrada de lote antes de realizar saídas.
            </div>
          ) : (
            <div className="space-y-3">
              {linhas.map((linha, i) => {
                const tamanhos = tamanhosDisponiveis(linha.tipo);
                const saldo = getSaldoDisponivel(linha.tipo, linha.tamanho);

                return (
                  <div
                    key={i}
                    className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-end dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <div className="flex-1">
                      <Select
                        label="Tipo de uniforme"
                        value={linha.tipo}
                        onChange={e => mudaLinha(i, 'tipo', e.target.value)}
                      >
                        <option value="">Selecione a peça disponível</option>
                        {tiposDisponiveis.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="w-full sm:w-44">
                      <Select
                        label="Tamanho disponível"
                        disabled={!linha.tipo}
                        value={linha.tamanho}
                        onChange={e => mudaLinha(i, 'tamanho', e.target.value)}
                      >
                        <option value="">Selecione</option>
                        {tamanhos.map(t => {
                          const s = getSaldoDisponivel(linha.tipo, t);
                          return (
                            <option key={t} value={t}>
                              {t} (saldo: {s})
                            </option>
                          );
                        })}
                      </Select>
                    </div>

                    <div className="w-full sm:w-32">
                      <Field
                        label={`Qtd (máx: ${saldo})`}
                        type="number"
                        min="1"
                        max={saldo || 1}
                        disabled={!linha.tamanho}
                        value={linha.quantidade}
                        onChange={e => mudaLinha(i, 'quantidade', e.target.value)}
                      />
                    </div>

                    {linhas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLinha(i)}
                        className="mb-[2px] flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                        title="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addLinha}
                className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] hover:underline dark:text-blue-400"
              >
                <Plus size={15} /> Adicionar outro item
              </button>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Ao confirmar a saída, o estoque será debitado e o histórico de entregas do aluno atualizado.
          </p>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-7 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => navigate('/uniformes')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando || !tiposDisponiveis.length}>
              {salvando ? 'Confirmando saída...' : 'Confirmar saída'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
