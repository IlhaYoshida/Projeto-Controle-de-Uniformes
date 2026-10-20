import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEscolas, getUsuarios, registrarEntrada, getTiposDisponiveis, getTamanhosDisponiveis } from '../api';
import { TAMANHOS_UNIFORME, TIPOS_PADRAO } from '../data';
import { Back, Button, Card, Field, Header, Select } from '../components/UI';
import { useApp } from '../App';

const linhaVazia = { tipo: '', tamanho: '', quantidade: 1 };

export default function EstoqueEntradaPage() {
  const navigate = useNavigate();
  const { currentUser, escolaId: appEscolaId } = useApp();
  const [escolas, setEscolas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [escolaId, setEscolaId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [tiposDisponiveis, setTiposDisponiveis] = useState(TIPOS_PADRAO);
  const [tamanhosDisponiveis, setTamanhosDisponiveis] = useState(TAMANHOS_UNIFORME);
  const [linhas, setLinhas] = useState([{ ...linhaVazia }]);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

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

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    const targetEscolaId = escolaId || appEscolaId || 1;
    if (!usuarioId) return setErro('Selecione o responsável pelo recebimento do lote.');
    const itens = linhas
      .filter(l => l.tipo && l.tamanho)
      .map(l => ({ tipo: l.tipo, tamanho: l.tamanho, quantidade: Number(l.quantidade) || 0 }));

    if (!itens.length) return setErro('Adicione pelo menos um item recebido.');
    if (itens.some(i => i.quantidade <= 0)) return setErro('A quantidade de cada item precisa ser maior que zero.');

    setSalvando(true);
    try {
      const resultado = await registrarEntrada({
        escola_id: Number(targetEscolaId),
        usuario_id: Number(usuarioId),
        nota_fiscal: notaFiscal || null,
        itens,
      });
      setSucesso(`Entrada registrada com sucesso! (lote #${resultado.lote_id})`);
      setLinhas([{ ...linhaVazia }]);
      setNotaFiscal('');
    } catch (err) {
      setErro(err.message || 'Não foi possível registrar a entrada.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="page-enter">
      <Header
        eyebrow="UNIFORMES"
        title="Entrada de estoque"
        subtitle="Registre o recebimento de um novo lote de uniformes vindo do governo/fornecedor."
      />
      <Back />
      <form onSubmit={submit}>
        <Card className="p-6 sm:p-8">
          {erro && (
            <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {erro}
            </p>
          )}
          {sucesso && (
            <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {sucesso}
            </p>
          )}

          <div className="mb-7 grid gap-5 md:grid-cols-2">
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
            <Field
              label="Nota fiscal (opcional)"
              value={notaFiscal}
              onChange={e => setNotaFiscal(e.target.value)}
              placeholder="Ex: NF-000123"
            />
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
              {salvando ? 'Registrando...' : 'Registrar entrada'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
