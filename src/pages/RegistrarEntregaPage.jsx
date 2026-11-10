import { Search, Plus, Trash2, AlertTriangle, Printer, Download, ArrowLeft, LayoutDashboard, Shirt } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { getEstoque, getUsuarios, getAluno, getEntregasDoAluno } from '../api';
import { initials } from '../data';
import { Back, Button, Card, Header, Select, Field, ReviewModal } from '../components/UI';

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
  const [alunoDetalhes, setAlunoDetalhes] = useState(null);
  const [entregasAluno, setEntregasAluno] = useState([]);
  const [linhas, setLinhas] = useState([{ ...linhaVazia }]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [revisaoAberta, setRevisaoAberta] = useState(false);
  const [reciboData, setReciboData] = useState(null);

  useEffect(() => {
    getEstoque().then(setEstoque).catch(() => setEstoque([]));
    getUsuarios().then(list => {
      setUsuarios(list);
      if (currentUser?.id && list.some(u => u.id === currentUser.id)) {
        setUsuarioId(currentUser.id);
      } else if (list.length) {
        setUsuarioId(list[0].id);
      }
    }).catch(() => setUsuarios([]));
  }, [currentUser]);

  // Carrega dados completos do aluno e histórico de entregas para validação dos 3 meses
  useEffect(() => {
    if (!alunoId) {
      setAlunoDetalhes(null);
      setEntregasAluno([]);
      return;
    }
    getAluno(alunoId).then(setAlunoDetalhes).catch(() => setAlunoDetalhes(null));
    getEntregasDoAluno(alunoId).then(setEntregasAluno).catch(() => setEntregasAluno([]));
  }, [alunoId]);

  const alunoSelecionado = alunoDetalhes || students.find(s => String(s.id) === String(alunoId));

  const resultadosBusca = useMemo(() => {
    if (!busca.trim() || alunoSelecionado) return [];
    const alvo = busca.trim().toLowerCase();
    return students
      .filter(s => s.nome.toLowerCase().includes(alvo) || String(s.matricula || '').includes(alvo))
      .slice(0, 6);
  }, [busca, students, alunoSelecionado]);

  // Mapa de itens recebidos nos últimos 3 meses (Item 14)
  const itensRecebidosRecentes = useMemo(() => {
    if (!entregasAluno || !entregasAluno.length) return {};
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

    const map = {};
    for (const entrega of entregasAluno) {
      const dataEntrega = new Date(entrega.data_entrega);
      if (dataEntrega >= tresMesesAtras) {
        for (const it of (entrega.itens || [])) {
          if (it.tipo) {
            const dataFmt = dataEntrega.toLocaleDateString('pt-BR');
            if (!map[it.tipo] || new Date(map[it.tipo].dataRaw) < dataEntrega) {
              map[it.tipo] = {
                dataRaw: entrega.data_entrega,
                dataFormatada: dataFmt,
                tamanho: it.tamanho,
                qtd: it.quantidade_entregue,
              };
            }
          }
        }
      }
    }
    return map;
  }, [entregasAluno]);

  // Filtra itens com saldo disponível > 0
  const itensEmEstoque = useMemo(() => estoque.filter(i => i.quantidade_estoque > 0), [estoque]);
  const tiposDisponiveis = useMemo(() => [...new Set(itensEmEstoque.map(i => i.tipo))], [itensEmEstoque]);

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
      if (campo === 'tipo') atualizada.tamanho = '';
      return atualizada;
    }));
  };

  const validarFormulario = () => {
    setErro('');
    if (!alunoId) {
      setErro('Pesquise e selecione o aluno que receberá os uniformes.');
      return false;
    }
    if (!usuarioId) {
      setErro('Selecione o responsável pelo registro da saída.');
      return false;
    }

    const itensValidos = linhas.filter(l => l.tipo && l.tamanho);
    if (!itensValidos.length) {
      setErro('Adicione pelo menos um item disponível para saída.');
      return false;
    }

    for (const linha of itensValidos) {
      const saldo = getSaldoDisponivel(linha.tipo, linha.tamanho);
      const qtd = Number(linha.quantidade) || 0;
      if (qtd <= 0) {
        setErro(`A quantidade de ${linha.tipo} (${linha.tamanho}) deve ser maior que zero.`);
        return false;
      }
      if (qtd > saldo) {
        setErro(`Estoque insuficiente de ${linha.tipo} (${linha.tamanho}): disponível apenas ${saldo} unidade(s).`);
        return false;
      }
    }
    return true;
  };

  const abrirRevisao = (e) => {
    e.preventDefault();
    if (validarFormulario()) {
      setRevisaoAberta(true);
    }
  };

  const confirmarSaida = async () => {
    setErro('');
    const itensValidos = linhas.filter(l => l.tipo && l.tamanho);
    const itensParaEntrega = [];

    for (const linha of itensValidos) {
      const itemDb = itensEmEstoque.find(i => i.tipo === linha.tipo && i.tamanho === linha.tamanho);
      if (!itemDb) {
        setErro(`Item ${linha.tipo} (${linha.tamanho}) não encontrado em estoque.`);
        setRevisaoAberta(false);
        return;
      }
      itensParaEntrega.push({
        item_uniforme_id: itemDb.id,
        tipo: linha.tipo,
        tamanho: linha.tamanho,
        quantidade_entregue: Number(linha.quantidade) || 1,
      });
    }

    setSalvando(true);
    try {
      const payloadItens = itensParaEntrega.map(i => ({
        item_uniforme_id: i.item_uniforme_id,
        quantidade_entregue: i.quantidade_entregue,
      }));
      const entrega = await addDelivery(alunoId, usuarioId, payloadItens);

      const respObj = usuarios.find(u => String(u.id) === String(usuarioId));
      setReciboData({
        entregaId: entrega?.id,
        dataHora: new Date(),
        aluno: alunoSelecionado,
        responsavel: respObj,
        itens: itensParaEntrega,
      });
      setRevisaoAberta(false);
    } catch (err) {
      setErro(err.message || 'Não foi possível registrar a saída.');
      setRevisaoAberta(false);
    } finally {
      setSalvando(false);
    }
  };

  const itensValidos = linhas.filter(l => l.tipo && l.tamanho);
  const totalPecas = itensValidos.reduce((acc, l) => acc + (Number(l.quantidade) || 0), 0);
  const tiposComAlerta = [...new Set(itensValidos.map(l => l.tipo).filter(t => itensRecebidosRecentes[t]))];
  const usuarioSelecionado = usuarios.find(u => String(u.id) === String(usuarioId));

  // --- DOWNLOAD DO RECIBO EM HTML FORMATADO (Item 15) ---
  const baixarReciboHtml = () => {
    if (!reciboData) return;
    const nomeAluno = reciboData.aluno?.nome || 'Aluno';
    const matricula = reciboData.aluno?.matricula || '';
    const turma = reciboData.aluno?.turma || '';
    const operador = reciboData.responsavel?.nome || 'Operador';
    const responsavelAluno = reciboData.aluno?.nome_mae || reciboData.aluno?.nome_pai || 'Responsável pelo Aluno';
    const dataHoraFmt = reciboData.dataHora.toLocaleString('pt-BR');

    const linhasHtml = reciboData.itens.map(i => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.tipo}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${i.tamanho}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${i.quantidade_entregue}</td>
      </tr>
    `).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Recibo de Entrega - ${nomeAluno}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
    .recibo { max-width: 700px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 32px; border-radius: 8px; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 20px; margin: 0; color: #1e3a8a; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
    .section { margin-bottom: 20px; font-size: 14px; }
    .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #2563eb; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 8px; text-align: left; }
    .termo { font-size: 12px; color: #475569; margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; }
    .assinaturas { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .campo-assinatura { text-align: center; }
    .linha-assinatura { border-top: 1px solid #334155; margin-bottom: 6px; }
    .nome-assinatura { font-size: 12px; font-weight: bold; }
    .cargo-assinatura { font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="recibo">
    <div class="header">
      <h1>UNIFORME PLUS</h1>
      <p>Comprovante de Entrega de Uniforme Escolar</p>
    </div>
    <div class="section">
      <div class="section-title">Dados do Aluno e da Entrega</div>
      <div class="grid">
        <div><strong>Aluno:</strong> ${nomeAluno}</div>
        <div><strong>Matrícula:</strong> ${matricula}</div>
        <div><strong>Turma:</strong> ${turma || 'Não vinculada'}</div>
        <div><strong>Data e Hora:</strong> ${dataHoraFmt}</div>
        <div><strong>Responsável / Filiação:</strong> ${responsavelAluno}</div>
        <div><strong>Operador de Registro:</strong> ${operador}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Itens Entregues</div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Tamanho</th>
            <th style="text-align: right;">Quantidade</th>
          </tr>
        </thead>
        <tbody>${linhasHtml}</tbody>
      </table>
    </div>
    <div class="termo">
      Declaro para os devidos fins que recebi os itens de uniforme escolar acima especificados em perfeitas condições de uso e conferência.
    </div>
    <div class="assinaturas">
      <div class="campo-assinatura">
        <div class="linha-assinatura"></div>
        <div class="nome-assinatura">${operador}</div>
        <div class="cargo-assinatura">Responsável pelo Registro</div>
      </div>
      <div class="campo-assinatura">
        <div class="linha-assinatura"></div>
        <div class="nome-assinatura">${responsavelAluno}</div>
        <div class="cargo-assinatura">Assinatura do Responsável pelo Aluno</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recibo_entrega_${matricula || 'aluno'}_${reciboData.dataHora.toISOString().slice(0, 10)}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- TELA DE RECIBO DE ENTREGA (Item 15) ---
  if (reciboData) {
    const nomeAluno = reciboData.aluno?.nome || 'Aluno';
    const matricula = reciboData.aluno?.matricula || '-';
    const turma = reciboData.aluno?.turma || 'Sem turma';
    const operador = reciboData.responsavel?.nome || 'Operador';
    const responsavelAluno = reciboData.aluno?.nome_mae || reciboData.aluno?.nome_pai || 'Responsável pelo Aluno';
    const dataHoraFmt = reciboData.dataHora.toLocaleString('pt-BR');
    const totalItensRecibo = reciboData.itens.reduce((acc, i) => acc + i.quantidade_entregue, 0);

    return (
      <div className="page-enter max-w-4xl mx-auto py-6">
        {/* Barra superior de ações (oculta na impressão) */}
        <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              ✓
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Saída confirmada com sucesso!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Recibo gerado para conferência e assinatura.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/dashboard')} className="h-9 px-3 text-xs">
              <LayoutDashboard size={14} /> Voltar para o Dashboard
            </Button>
            <Button variant="secondary" onClick={() => navigate('/uniformes')} className="h-9 px-3 text-xs">
              <Shirt size={14} /> Voltar para Uniformes
            </Button>
            <Button variant="secondary" onClick={baixarReciboHtml} className="h-9 px-3 text-xs">
              <Download size={14} /> Baixar recibo
            </Button>
            <Button variant="primary" onClick={() => window.print()} className="h-9 px-4 text-xs">
              <Printer size={14} /> Imprimir recibo
            </Button>
          </div>
        </div>

        {/* ÁREA DO RECIBO IMPRESSO */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md dark:border-slate-800 dark:bg-[#111827] print:border-none print:shadow-none print:p-0">
          <div className="border-b-2 border-[#2563eb] pb-5 text-center">
            <div className="text-[11px] font-bold tracking-widest text-[#2563eb] dark:text-blue-400 uppercase">
              Uniforme Plus · Gestão Escolar
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Recibo de Entrega de Uniforme
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Comprovante oficial de entrega e recebimento de peças escolares
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-5 dark:bg-slate-800/40 text-xs sm:text-sm">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Aluno(a):</span>
              <p className="font-bold text-slate-900 dark:text-white text-base">{nomeAluno}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Matrícula:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{matricula}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Turma:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{turma}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Data e Hora do Registro:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{dataHoraFmt}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Responsável / Filiação:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{responsavelAluno}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Responsável pelo Registro:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{operador}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#2563eb] dark:text-blue-400">
              Peças Entregues ({reciboData.itens.length})
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Item do Uniforme</th>
                    <th className="p-3 text-center">Tamanho</th>
                    <th className="p-3 text-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reciboData.itens.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-medium text-slate-900 dark:text-white">{it.tipo}</td>
                      <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">{it.tamanho}</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{it.quantidade_entregue} un.</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 font-bold">
                  <tr>
                    <td colSpan={2} className="p-3 text-slate-700 dark:text-slate-300">Total de Peças Entregues:</td>
                    <td className="p-3 text-right text-[#2563eb] dark:text-blue-400">{totalItensRecibo} peças</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <p className="mt-6 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
            Declaro para os devidos fins que recebi os itens de uniforme escolar acima especificados em perfeitas condições de uso e conferência.
          </p>

          {/* CAMPOS DE ASSINATURA */}
          <div className="mt-14 grid grid-cols-1 gap-12 sm:grid-cols-2 pt-6">
            <div className="text-center">
              <div className="mx-auto w-4/5 border-t border-slate-700 dark:border-slate-300 mb-2"></div>
              <p className="font-bold text-xs text-slate-900 dark:text-white">{operador}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Responsável pelo Registro</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-4/5 border-t border-slate-700 dark:border-slate-300 mb-2"></div>
              <p className="font-bold text-xs text-slate-900 dark:text-white">{responsavelAluno}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Assinatura do Responsável pelo Aluno</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- FORMULÁRIO DE REGISTRO DE SAÍDA ---
  return (
    <div className="page-enter">
      <Header
        eyebrow="UNIFORMES"
        title="Registrar saída de uniforme"
        subtitle="Associe a entrega de peças ao aluno com base nos itens disponíveis em estoque."
      />
      <Back />
      <form onSubmit={abrirRevisao}>
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
            <div className="space-y-4">
              {linhas.map((linha, i) => {
                const tamanhos = tamanhosDisponiveis(linha.tipo);
                const saldo = getSaldoDisponivel(linha.tipo, linha.tamanho);
                const avisoRecente = linha.tipo && itensRecebidosRecentes[linha.tipo];

                return (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
                                {t} (estoque: {s})
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

                    {/* ALERTA DE ITEM RECEBIDO NOS ÚLTIMOS 3 MESES (Item 14) */}
                    {avisoRecente && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          <strong>Aviso:</strong> Este aluno já recebeu um item do tipo <strong>{linha.tipo}</strong> nos últimos 3 meses (em {avisoRecente.dataFormatada}).
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addLinha}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] hover:underline dark:text-blue-400"
              >
                <Plus size={15} /> Adicionar outro item
              </button>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Ao confirmar a saída, o estoque será debitado e o recibo de entrega gerado imediatamente.
          </p>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-7 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => navigate('/uniformes')}>
              Cancelar
            </Button>
            {/* Nome do botão alterado para 'Registrar saída' (Item 14) */}
            <Button type="submit" disabled={salvando || !tiposDisponiveis.length}>
              Registrar saída
            </Button>
          </div>
        </Card>
      </form>

      {/* MODAL DE REVISÃO DA SAÍDA COM AVISO DE 3 MESES (Item 7 e 14) */}
      <ReviewModal
        isOpen={revisaoAberta}
        title="Revisar Saída de Uniforme"
        subtitle="Confira os dados da entrega antes de debitar o estoque:"
        confirmText="Confirmar saída"
        cancelText="Voltar e Corrigir"
        loading={salvando}
        onConfirm={confirmarSaida}
        onClose={() => setRevisaoAberta(false)}
      >
        <div className="space-y-4 text-xs sm:text-sm">
          {tiposComAlerta.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle size={16} /> Atenção: Entrega recente identificada (últimos 3 meses)
              </div>
              <p className="mt-1">O aluno selecionado já recebeu recentemente o(s) seguinte(s) tipo(s) de peça:</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5 font-medium">
                {tiposComAlerta.map(tipo => (
                  <li key={tipo}>
                    <strong>{tipo}</strong>: entregue em {itensRecebidosRecentes[tipo]?.dataFormatada}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                Você pode prosseguir normalmente com a entrega se houver autorização da gestão escolar.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Aluno:</span>
                <p className="font-medium text-slate-800 dark:text-white">{alunoSelecionado?.nome || '-'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Matrícula:</span>
                <p className="font-medium text-slate-800 dark:text-white">{alunoSelecionado?.matricula || '-'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Turma:</span>
                <p className="font-medium text-slate-800 dark:text-white">{alunoSelecionado?.turma || 'Sem turma'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Responsável pelo Registro:</span>
                <p className="font-medium text-slate-800 dark:text-white">{usuarioSelecionado?.nome || '-'}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
              <span>Peças a entregar ({itensValidos.length}):</span>
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
                      <td className="p-2 text-right font-bold text-[#2563eb] dark:text-blue-400">{it.quantidade} un.</td>
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
