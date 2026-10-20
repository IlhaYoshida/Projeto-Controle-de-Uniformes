import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEscolas, getUsuarios, registrarEntrada, getTiposDisponiveis, getTamanhosDisponiveis } from '../api';
import { TAMANHOS_UNIFORME, TIPOS_PADRAO } from '../data';
import { Back, Button, Card, Field, Header, Select, ReviewModal } from '../components/UI';
import { useApp } from '../App';

const linhaVazia = { tipo: '', tamanho: '', quantidade: 1 };
const hojeStr = new Date().toISOString().slice(0, 10);

export default function EstoqueEntradaPage() {
  const navigate = useNavigate();
  const { currentUser, escolaId: appEscolaId } = useApp();
  const [escolas, setEscolas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [escolaId, setEscolaId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState(hojeStr);
  const [notaFiscal, setNotaFiscal] = useState('');
  const [tiposDisponiveis, setTiposDisponiveis] = useState(TIPOS_PADRAO);
  const [tamanhosDisponiveis, setTamanhosDisponiveis] = useState(TAMANHOS_UNIFORME);
  const [linhas, setLinhas] = useState([{ ...linhaVazia }]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [revisaoAberta, setRevisaoAberta] = useState(false);

  useEffect(() => {
    getEscolas().then(list => {
      setEscolas(list);
      if (list.length) setEscolaId(list[0].id);
    }).catch(() => {});

    getUsuarios().then(list => {
      setUsuarios(list);
      if (currentUser?.id && list.some(u => u.id === currentUser.id)) {
        setUsuarioId(currentUser.id);
      } else if (list.length) {
        setUsuarioId(list[0].id);
      }
    }).catch(() => setUsuarios([]));

    getTiposDisponiveis().then(tipos => {
      if (tipos && tipos.length) setTiposDisponiveis([...new Set([...TIPOS_PADRAO, ...tipos])]);
    }).catch(() => {});

    getTamanhosDisponiveis().then(tams => {
      if (tams && tams.length) setTamanhosDisponiveis([...new Set([...TAMANHOS_UNIFORME, ...tams])]);
    }).catch(() => {});
  }, [currentUser]);

  const addLinha = () => setLinhas(l => [...l, { ...linhaVazia }]);
  const removeLinha = (i) => setLinhas(l => l.filter((_, idx) => idx !== i));
  const mudaLinha = (i, campo, valor) => setLinhas(l => l.map((x, idx) => idx === i ? { ...x, [campo]: valor } : x));

  const validarCampos = () => {
    setErro('');
    if (!usuarioId) {
      setErro('Selecione o responsável pelo recebimento do lote.');
      return false;
    }
    if (!dataRecebimento) {
      setErro('Informe a data do recebimento do lote.');
      return false;
    }
    if (dataRecebimento > hojeStr) {
      setErro('A data de recebimento não pode ser posterior à data atual.');
      return false;
    }

    const itens = linhas
      .filter(l => l.tipo && l.tamanho)
      .map(l => ({ tipo: l.tipo, tamanho: l.tamanho, quantidade: Number(l.quantidade) || 0 }));

    if (!itens.length) {
      setErro('Adicione pelo menos um item recebido.');
      return false;
    }
    if (itens.some(i => i.quantidade <= 0)) {
      setErro('A quantidade de cada item precisa ser maior que zero.');
      return false;
    }
    return true;
  };

  const abrirRevisao = (e) => {
    e.preventDefault();
    if (validarCampos()) {
      setRevisaoAberta(true);
    }
  };

  const confirmarEntrada = async () => {
    setErro('');
    const targetEscolaId = escolaId || appEscolaId || 1;
    const itens = linhas
      .filter(l => l.tipo && l.tamanho)
      .map(l => ({ tipo: l.tipo, tamanho: l.tamanho, quantidade: Number(l.quantidade) || 0 }));

    setSalvando(true);
    try {
      await registrarEntrada({
        escola_id: Number(targetEscolaId),
        usuario_id: Number(usuarioId),
        nota_fiscal: notaFiscal.trim() ? notaFiscal.trim() : null,
        data_recebimento: dataRecebimento,
        itens,
      });
      setRevisaoAberta(false);
      // Redireciona para a página de uniformes conforme item 11
      navigate('/uniformes');
    } catch (err) {
      setErro(err.message || 'Não foi possível registrar a entrada.');
      setRevisaoAberta(false);
    } finally {
      setSalvando(false);
    }
  };

  const usuarioSelecionado = usuarios.find(u => String(u.id) === String(usuarioId));
  const itensValidos = linhas.filter(l => l.tipo && l.tamanho);
  const totalPecas = itensValidos.reduce((acc, l) => acc + (Number(l.quantidade) || 0), 0);

  return (
    <div className="page-enter">
      <Header
        eyebrow="UNIFORMES"
        title="Entrada de estoque"
        subtitle="Registre o recebimento de um novo lote de uniformes vindo do governo/fornecedor."
      />
      <Back />
      <form onSubmit={abrirRevisao}>
        <Card className="p-6 sm:p-8">
          {erro && (
            <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {erro}
            </p>
          )}

          <div className="mb-7 grid gap-5 sm:grid-cols-3">
            <div>
              <Select
                label="Responsável pelo recebimento"
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
            <div>
              <Field
                label="Data de recebimento"
                type="date"
                required
                max={hojeStr}
                value={dataRecebimento}
                onChange={e => setDataRecebimento(e.target.value)}
              />
            </div>
            <div>
              <Field
                label="Nota fiscal (opcional)"
                value={notaFiscal}
                onChange={e => setNotaFiscal(e.target.value)}
                placeholder="Ex: NF-000123"
              />
            </div>
          </div>

          <h2 className="mb-3 text-[10px] font-bold text-[#2563eb] dark:text-blue-400">ITENS RECEBIDOS NESTE LOTE</h2>
          <div className="space-y-3">
            {linhas.map((linha, i) => (
              <div
                key={i}
                className="flex items-end gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex-1">
                  <Select label="Tipo de uniforme" value={linha.tipo} onChange={e => mudaLinha(i, 'tipo', e.target.value)}>
                    <option value="">Selecione o tipo</option>
                    {tiposDisponiveis.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>
                <div className="w-32">
                  <Select label="Tamanho" value={linha.tamanho} onChange={e => mudaLinha(i, 'tamanho', e.target.value)}>
                    <option value="">Selecione</option>
                    {tamanhosDisponiveis.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>
                <div className="w-28">
                  <Field
                    label="Quantidade"
                    type="number"
                    min="1"
                    value={linha.quantidade}
                    onChange={e => mudaLinha(i, 'quantidade', e.target.value)}
                  />
                </div>
                {linhas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLinha(i)}
                    className="mb-[2px] flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    title="Remover linha"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLinha}
            className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline dark:text-blue-400"
          >
            <Plus size={14} /> Adicionar outro item
          </button>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-7 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => navigate('/uniformes')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              Registrar entrada
            </Button>
          </div>
        </Card>
      </form>

      {/* MODAL DE REVISÃO DO LOTE (Item 7 e 11) */}
      <ReviewModal
        isOpen={revisaoAberta}
        title="Revisar Entrada de Estoque"
        subtitle="Confira os detalhes do lote de uniformes antes de confirmar a entrada:"
        confirmText="Confirmar Entrada"
        cancelText="Voltar e Corrigir"
        loading={salvando}
        onConfirm={confirmarEntrada}
        onClose={() => setRevisaoAberta(false)}
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Responsável:</span>
                <p className="font-medium text-slate-800 dark:text-white">{usuarioSelecionado?.nome || '-'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Data de Recebimento:</span>
                <p className="font-medium text-slate-800 dark:text-white">
                  {dataRecebimento ? dataRecebimento.split('-').reverse().join('/') : '-'}
                </p>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Nota Fiscal:</span>
                <p className="font-medium text-slate-800 dark:text-white">{notaFiscal.trim() || 'Não informada (sem NF)'}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
              <span>Itens a serem creditados ({itensValidos.length}):</span>
              <span className="text-[#2563eb] dark:text-blue-400">Total: {totalPecas} peças</span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2">Tamanho</th>
                    <th className="p-2 text-right">Qtd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itensValidos.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{it.tipo}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-400">{it.tamanho}</td>
                      <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">+{it.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ReviewModal>
    </div>
  );
}
