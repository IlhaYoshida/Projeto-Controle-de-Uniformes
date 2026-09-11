import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRelatorioEntregasPorTurma, relatorioEntregasPorTurmaCsvUrl } from '../api';
import { Button, Card, Empty, Header } from '../components/UI';

export default function RelatoriosPage() {
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    getRelatorioEntregasPorTurma()
      .then(setLinhas)
      .catch(() => setErro('Não foi possível carregar o relatório. Verifique se a API está no ar.'))
      .finally(() => setLoading(false));
  }, []);

  return <div className="page-enter">
    <Header eyebrow="RELATÓRIOS" title="Entregas por turma" subtitle="Prestação de contas: quantas peças cada turma já recebeu."
      actions={<a href={relatorioEntregasPorTurmaCsvUrl()} target="_blank" rel="noreferrer"><Button variant="secondary"><Download size={16} /> Baixar CSV</Button></a>} />

    {erro && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

    <Card className="overflow-hidden">
      <div className="scrollbar-thin overflow-x-auto px-5 py-5">
        <table className="w-full min-w-[650px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              {['Turma (série)', 'Alunos', 'Alunos com entrega', 'Entregas registradas', 'Peças entregues'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => (
              <tr key={l.turma_id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-semibold">{l.serie}º ano</td>
                <td className="px-4 py-3">{l.total_alunos}</td>
                <td className="px-4 py-3">{l.total_alunos_com_entrega}</td>
                <td className="px-4 py-3">{l.total_entregas}</td>
                <td className="px-4 py-3 font-semibold">{l.total_pecas_entregues}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !linhas.length && <Empty text="Nenhuma turma cadastrada ainda." />}
        {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando relatório...</div>}
      </div>
    </Card>
  </div>;
}
