import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEscolas, getUsuarios, registrarEntrada } from '../api';
import { TAMANHOS_UNIFORME, TIPOS_UNIFORME } from '../data';
import { Back, Button, Card, Field, Header, Select } from '../components/UI';

const linhaVazia = { tipo: '', tamanho: '', quantidade: 1 };

export default function EstoqueEntradaPage() {
  const navigate = useNavigate();
  const [escolas, setEscolas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [escolaId, setEscolaId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [linhas, setLinhas] = useState([{ ...linhaVazia }]);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    getEscolas().then(list => { setEscolas(list); if (list.length) setEscolaId(list[0].id); }).catch(() => setEscolas([]));
    getUsuarios().then(list => { setUsuarios(list); if (list.length) setUsuarioId(list[0].id); }).catch(() => setUsuarios([]));
  }, []);

  const addLinha = () => setLinhas(l => [...l, { ...linhaVazia }]);
  const removeLinha = (i) => setLinhas(l => l.filter((_, idx) => idx !== i));
  const mudaLinha = (i, campo, valor) => setLinhas(l => l.map((x, idx) => idx === i ? { ...x, [campo]: valor } : x));

  const submit = async (e) => {
    e.preventDefault();
    setErro(''); setSucesso('');

    if (!escolaId || !usuarioId) return setErro('Selecione a escola e o responsável pelo recebimento.');
    const itens = linhas.filter(l => l.tipo && l.tamanho).map(l => ({ tipo: l.tipo, tamanho: l.tamanho, quantidade: Number(l.quantidade) || 0 }));
    if (!itens.length) return setErro('Adicione pelo menos um item recebido.');
    if (itens.some(i => i.quantidade <= 0)) return setErro('A quantidade de cada item precisa ser maior que zero.');

    setSalvando(true);
    try {
      const resultado = await registrarEntrada({
        escola_id: Number(escolaId),
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

  return <div className="page-enter">
    <Header eyebrow="UNIFORMES" title="Entrada de estoque" subtitle="Registre o recebimento de um novo lote de uniformes vindo do governo/fornecedor." />
    <Back />
    <form onSubmit={submit}>
      <Card className="p-6 sm:p-8">
        {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
        {sucesso && <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{sucesso}</p>}

        <div className="mb-7 grid gap-5 md:grid-cols-3">
          <div>
            <Select label="Escola" required value={escolaId} onChange={e => setEscolaId(e.target.value)}>
              <option value="">Selecione</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </Select>
          </div>
          <div>
            <Select label="Responsável pelo recebimento" required value={usuarioId} onChange={e => setUsuarioId(e.target.value)}>
              <option value="">Selecione</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </div>
          <Field label="Nota fiscal (opcional)" value={notaFiscal} onChange={e => setNotaFiscal(e.target.value)} placeholder="Ex: NF-0001" />
        </div>

        <h2 className="mb-3 text-[10px] font-bold text-[#2563eb]">ITENS RECEBIDOS NESTE LOTE</h2>
        <div className="space-y-3">
          {linhas.map((linha, i) => (
            <div key={i} className="flex items-end gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex-1">
                <Select label="Tipo" value={linha.tipo} onChange={e => mudaLinha(i, 'tipo', e.target.value)}>
                  <option value="">Selecione</option>
                  {TIPOS_UNIFORME.map(t => <option key={t}>{t}</option>)}
                </Select>
              </div>
              <div className="w-32">
                <Select label="Tamanho" value={linha.tamanho} onChange={e => mudaLinha(i, 'tamanho', e.target.value)}>
                  <option value="">Selecione</option>
                  {TAMANHOS_UNIFORME.map(t => <option key={t}>{t}</option>)}
                </Select>
              </div>
              <div className="w-28">
                <Field label="Quantidade" type="number" min="1" value={linha.quantidade} onChange={e => mudaLinha(i, 'quantidade', e.target.value)} />
              </div>
              {linhas.length > 1 && (
                <button type="button" onClick={() => removeLinha(i)} className="mb-[2px] flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addLinha} className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#2563eb]">
          <Plus size={14} /> Adicionar outro item
        </button>

        <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-7">
          <Button variant="secondary" type="button" onClick={() => navigate('/uniformes')}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? 'Registrando...' : 'Registrar entrada'}</Button>
        </div>
      </Card>
    </form>
  </div>;
}
