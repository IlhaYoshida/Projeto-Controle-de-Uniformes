import { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, Search } from 'lucide-react';
import { getLogs, downloadLogsUrl } from '../api';
import { Button, Card, Header, Empty } from '../components/UI';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');

  const carregarLogs = () => {
    setLoading(true);
    getLogs(300)
      .then(res => {
        setLogs(res.logs || []);
        setErro('');
      })
      .catch(() => setErro('Não foi possível carregar os logs do sistema.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  const logsFiltrados = logs.filter(l =>
    !filtro.trim() || l.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="page-enter">
      <Header
        eyebrow="AUDITORIA E SEGURANÇA"
        title="Logs do sistema"
        subtitle="Registro em arquivo TXT de todas as ações de visualização, criação, edição e exclusão."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={carregarLogs} className="h-10 text-xs">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
            </Button>
            <a href={downloadLogsUrl()} target="_blank" rel="noreferrer">
              <Button className="h-10 text-xs">
                <Download size={15} /> Baixar arquivo TXT
              </Button>
            </a>
          </div>
        }
      />

      {erro && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}

      <Card className="mb-6 p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            placeholder="Pesquisar por ação (ex: CRIAR_ALUNO, EXCLUIR), usuário, ID..."
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <FileText size={16} className="text-blue-500" />
            <span>Arquivo: <code className="font-mono text-blue-600 dark:text-blue-400">logs/sistema_logs.txt</code></span>
          </div>
          <span className="text-xs text-slate-500">
            {logsFiltrados.length} registros exibidos
          </span>
        </div>

        <div className="max-h-[550px] overflow-y-auto p-4 font-mono text-xs leading-relaxed scrollbar-thin bg-slate-950 text-slate-200 dark:bg-black">
          {logsFiltrados.map((linha, i) => {
            // Separa partes para coloração inteligente
            const partes = linha.split(' | ');
            const timestamp = partes[0] || '';
            const resto = partes.slice(1).join(' | ');

            return (
              <div
                key={i}
                className="py-1 px-2 rounded hover:bg-white/5 border-b border-white/5 flex gap-2 items-start"
              >
                <span className="text-slate-500 shrink-0 select-none">{timestamp}</span>
                <span className="text-slate-200 break-all">{resto}</span>
              </div>
            );
          })}
          {!loading && !logsFiltrados.length && (
            <div className="py-12 text-center text-slate-500 font-sans">
              Nenhum registro de log encontrado.
            </div>
          )}
          {loading && (
            <div className="py-12 text-center text-slate-500 font-sans">
              Carregando registros...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
