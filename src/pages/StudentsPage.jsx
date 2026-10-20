import { MoreHorizontal, Plus, Upload, Trash2, Edit } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { initials } from '../data';
import ImportModal from '../components/ImportModal';
import { Badge, Button, Card, Empty, Header, Select } from '../components/UI';

export default function StudentsPage() {
  const { students, loading, apiStatus, removeStudent } = useApp();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ q: '', turma: '', idade: '', tamanho: '', status: '' });
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const [deletandoId, setDeletandoId] = useState(null);

  const set = (k, v) => {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(1);
  };

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchQ = !filters.q || `${s.nome} ${s.matricula}`.toLowerCase().includes(filters.q.toLowerCase());
      const matchTurma = !filters.turma || s.turma === filters.turma;
      const matchIdade = !filters.idade || String(s.idade) === filters.idade;
      const matchTamanho = !filters.tamanho || s.tamanho === filters.tamanho;
      const statusCalculado = (s.recebidos > 0) ? 'Recebido' : 'Pendente';
      const matchStatus = !filters.status || statusCalculado === filters.status;
      return matchQ && matchTurma && matchIdade && matchTamanho && matchStatus;
    });
  }, [students, filters]);

  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const rows = filtered.slice((page - 1) * 8, page * 8);

  const options = key => [...new Set(students.map(s => s[key]).filter(v => v !== null && v !== undefined && v !== '').map(String))];

  const handleExcluir = async (id, nome) => {
    if (window.confirm(`Tem certeza que deseja excluir o aluno "${nome}"?`)) {
      setDeletandoId(id);
      try {
        await removeStudent(id);
      } catch (err) {
        alert(err.message || 'Erro ao excluir aluno.');
      } finally {
        setDeletandoId(null);
      }
    }
  };

  return (
    <div className="page-enter">
      <Header
        eyebrow="CADASTRO E CONSULTA"
        title="Alunos"
        subtitle="Consulte, filtre, cadastre e acompanhe o recebimento de uniformes."
        actions={
          <>
            <Button variant="secondary" onClick={() => setModal(true)}>
              <Upload size={16} /> Importar alunos
            </Button>
            <Button onClick={() => navigate('/alunos/novo')}>
              <Plus size={16} /> Adicionar aluno
            </Button>
          </>
        }
      />

      <Card className="mb-6 p-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Pesquisar e filtrar</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-[2.1fr_.75fr_.75fr_.8fr_.8fr]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-900 dark:text-slate-200">Pesquisar</span>
            <input
              value={filters.q}
              onChange={e => set('q', e.target.value)}
              placeholder="Pesquisar por nome ou matrícula..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
            />
          </label>
          <Filter label="Turma" value={filters.turma} onChange={v => set('turma', v)} options={options('turma')} />
          <Filter label="Idade" value={filters.idade} onChange={v => set('idade', v)} options={options('idade')} />
          <Filter label="Tam. camiseta" value={filters.tamanho} onChange={v => set('tamanho', v)} options={options('tamanho')} />
          <Filter label="Uniforme" value={filters.status} onChange={v => set('status', v)} options={['Recebido', 'Pendente']} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 pb-2 pt-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Lista de alunos</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {students.length} alunos cadastrados · API {apiStatus === 'online' ? 'conectada' : apiStatus === 'offline' ? 'indisponível (modo local)' : 'conectando...'}
          </p>
        </div>
        <div className="scrollbar-thin overflow-x-auto px-5 pb-4">
          <table className="w-full min-w-[850px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                {['Aluno', 'Matrícula', 'Turma', 'Idade', 'Tam.', 'Uniforme', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(s => {
                const statusCalculado = (s.recebidos > 0) ? 'Recebido' : 'Pendente';
                return (
                  <tr
                    key={s.id}
                    onDoubleClick={() => navigate(`/alunos/${s.id}`)}
                    className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/alunos/${s.id}`)} className="flex items-center gap-3 font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                          {initials(s.nome)}
                        </span>
                        {s.nome}
                      </button>
                    </td>
                    <td className="px-4 py-3">{s.matricula}</td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{s.turma || '—'}</td>
                    <td className="px-4 py-3">{s.idade !== null && s.idade !== undefined ? `${s.idade} anos` : '—'}</td>
                    <td className="px-4 py-3 font-semibold">{s.tamanho || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge status={statusCalculado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          title="Ver detalhes"
                          onClick={() => navigate(`/alunos/${s.id}`)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        <button
                          title="Editar aluno"
                          onClick={() => navigate(`/alunos/${s.id}/editar`)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          title="Excluir aluno"
                          disabled={deletandoId === s.id}
                          onClick={() => handleExcluir(s.id, s.nome)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-red-950/40 text-red-600 disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && !rows.length && <Empty text="Nenhum aluno encontrado com esses filtros." />}
          {loading && <div className="py-20 text-center text-sm text-slate-400">Carregando alunos...</div>}
        </div>
        <div className="flex items-center justify-between gap-4 px-6 py-4 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 dark:text-slate-400">
          <span>Mostrando {filtered.length ? (page - 1) * 8 + 1 : 0}–{Math.min(page * 8, filtered.length)} de {filtered.length} alunos</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
            >
              ‹
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 5).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-9 w-9 rounded-lg border font-semibold ${
                  page === p
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === pages}
              onClick={() => setPage(p => p + 1)}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
            >
              ›
            </button>
          </div>
        </div>
      </Card>
      {modal && <ImportModal close={() => setModal(false)} />}
    </div>
  );
}

function Filter({ label, value, onChange, options }) {
  return (
    <Select label={label} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Todas</option>
      {options.map(x => (
        <option key={x} value={x}>{x}</option>
      ))}
    </Select>
  );
}
