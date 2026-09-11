import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { getEstoque, getUsuarios } from '../api';
import { initials, TAMANHOS_UNIFORME, TIPOS_UNIFORME } from '../data';
import { Back, Button, Card, Header, Select } from '../components/UI';

export default function RegistrarEntregaPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { students, addDelivery } = useApp();
  const [estoque, setEstoque] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [busca, setBusca] = useState('');
  const [alunoId, setAlunoId] = useState(params.get('aluno_id') || '');
  const [linhas, setLinhas] = useState(() => Object.fromEntries(TIPOS_UNIFORME.map(t => [t, { marcado: false, tamanho: '', quantidade: 1 }])));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    getEstoque().then(setEstoque).catch(() => setEstoque([]));
    getUsuarios().then(list => { setUsuarios(list); if (list.length) setUsuarioId(list[0].id); }).catch(() => setUsuarios([]));
  }, []);

  const alunoSelecionado = students.find(s => String(s.id) === String(alunoId));

  const resultadosBusca = useMemo(() => {
    if (!busca.trim() || alunoSelecionado) return [];
    const alvo = busca.trim().toLowerCase();
    return students.filter(s => s.nome.toLowerCase().includes(alvo) || String(s.matricula || '').includes(alvo)).slice(0, 6);
  }, [busca, students, alunoSelecionado]);

  const tamanhosDisponiveis = (tipo) => TAMANHOS_UNIFORME.filter(tam => estoque.some(i => i.tipo === tipo && i.tamanho === tam));
  const estoqueDisponivel = (tipo, tamanho) => estoque.find(i => i.tipo === tipo && i.tamanho === tamanho)?.quantidade_estoque ?? 0;

  const marcar = (tipo, campo, valor) => setLinhas(l => ({ ...l, [tipo]: { ...l[tipo], [campo]: valor } }));

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    if (!alunoId) return setErro('Pesquise e selecione o aluno que vai receber o uniforme.');
    if (!usuarioId) return setErro('Selecione o responsável pela entrega.');

    const itens = [];
    for (const tipo of TIPOS_UNIFORME) {
      const linha = linhas[tipo];
      if (!linha.marcado) continue;
      if (!linha.tamanho) return setErro(`Selecione o tamanho de ${tipo}.`);
      const item = estoque.find(i => i.tipo === tipo && i.tamanho === linha.tamanho);
      if (!item) return setErro(`Não há ${tipo} ${linha.tamanho} cadastrado no estoque.`);
      const quantidade = Number(linha.quantidade) || 1;
      if (quantidade > item.quantidade_estoque) return setErro(`Estoque insuficiente de ${tipo} ${linha.tamanho}: disponível ${item.quantidade_estoque}.`);
      itens.push({ item_uniforme_id: item.id, quantidade_entregue: quantidade });
    }
    if (!itens.length) return setErro('Selecione ao menos uma peça para entregar.');

    setSalvando(true);
    try {
      await addDelivery(alunoId, usuarioId, itens);
      navigate(`/alunos/${alunoId}`);
    } catch (err) {
      setErro(err.message || 'Não foi possível registrar a entrega.');
    } finally {
      setSalvando(false);
    }
  };

  return <div className="page-enter">
    <Header eyebrow="UNIFORMES" title="Registrar entrega" subtitle="Associe as peças entregues ao aluno e confirme os tamanhos." />
    <Back />
    <form onSubmit={submit}>
      <Card className="p-6 sm:p-8">
        {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

        <h2 className="mb-3 text-[10px] font-bold text-[#2563eb]">ALUNO</h2>
        {alunoSelecionado ? (
          <div className="mb-7 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-600">{initials(alunoSelecionado.nome)}</span>
              <div>
                <div className="text-sm font-semibold text-slate-900">{alunoSelecionado.nome}</div>
                <div className="text-xs text-slate-500">{alunoSelecionado.turma} · Matrícula {alunoSelecionado.matricula}</div>
              </div>
            </div>
            <button type="button" onClick={() => { setAlunoId(''); setBusca(''); }} className="text-xs font-semibold text-blue-600 hover:underline">Trocar aluno</button>
          </div>
        ) : (
          <div className="relative mb-7">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar por nome ou matrícula..." className="h-11 w-full rounded-lg border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            {!!resultadosBusca.length && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {resultadosBusca.map(s => (
                  <button type="button" key={s.id} onClick={() => { setAlunoId(s.id); setBusca(''); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-medium text-blue-600">{initials(s.nome)}</span>
                    <span>{s.nome} <span className="text-slate-400">· {s.turma} · {s.matricula}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-7">
          <Select label="Responsável pela entrega" required value={usuarioId} onChange={e => setUsuarioId(e.target.value)}>
            <option value="">Selecione</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
          {!usuarios.length && <p className="mt-1 text-xs text-slate-400">Nenhum usuário cadastrado — cadastre um usuário via API antes de registrar entregas.</p>}
        </div>

        <h2 className="mb-3 text-[10px] font-bold text-[#2563eb]">PEÇAS ENTREGUES</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead><tr className="bg-slate-50 text-slate-500">
              <th className="w-12 px-4 py-3 font-medium">Sel.</th>
              <th className="px-4 py-3 font-medium">Peça</th>
              <th className="px-4 py-3 font-medium">Tamanho</th>
              <th className="px-4 py-3 font-medium">Quantidade</th>
            </tr></thead>
            <tbody>
              {TIPOS_UNIFORME.map(tipo => {
                const linha = linhas[tipo];
                const opcoesTamanho = tamanhosDisponiveis(tipo);
                const disponivel = linha.tamanho ? estoqueDisponivel(tipo, linha.tamanho) : null;
                return <tr key={tipo} className="border-t border-slate-100">
                  <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4" checked={linha.marcado} onChange={e => marcar(tipo, 'marcado', e.target.checked)} /></td>
                  <td className="px-4 py-3 font-semibold">{tipo}</td>
                  <td className="px-4 py-3">
                    <select disabled={!linha.marcado} value={linha.tamanho} onChange={e => marcar(tipo, 'tamanho', e.target.value)} className="h-10 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400">
                      <option value="">Selecione</option>
                      {opcoesTamanho.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {linha.marcado && linha.tamanho && <span className="ml-2 text-[11px] text-slate-400">estoque: {disponivel}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="1" disabled={!linha.marcado} value={linha.quantidade} onChange={e => marcar(tipo, 'quantidade', e.target.value)} className="h-10 w-20 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400" />
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">Ao confirmar, o estoque será reduzido e a entrega associada ao aluno.</p>

        <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-7">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? 'Confirmando...' : 'Confirmar entrega'}</Button>
        </div>
      </Card>
    </form>
  </div>;
}
