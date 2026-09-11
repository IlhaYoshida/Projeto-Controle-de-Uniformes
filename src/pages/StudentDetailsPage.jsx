import { Edit3, PackageCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../App';
import { getEntregasDoAluno } from '../api';
import { dateBR, demoEntregas, initials } from '../data';
import { Back, Badge, Button, Card, Empty, Header } from '../components/UI';

export default function StudentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { students, apiStatus } = useApp();
  const [entregas, setEntregas] = useState([]);
  const [carregandoEntregas, setCarregandoEntregas] = useState(true);
  const s = students.find(x => String(x.id) === id);

  useEffect(() => {
    setCarregandoEntregas(true);
    getEntregasDoAluno(id)
      .then(setEntregas)
      .catch(() => setEntregas(demoEntregas[id] || []))
      .finally(() => setCarregandoEntregas(false));
  }, [id]);

  if (!s) return <div><Back /><Empty text="Aluno não encontrado." /></div>;

  const ultima = entregas[0];
  const pecasUltima = ultima ? ultima.itens.reduce((t, i) => t + i.quantidade_entregue, 0) : 0;

  return <div className="page-enter">
    <Header title={s.nome} subtitle={`${s.turma} · Matrícula ${s.matricula}`} actions={<>
      <Button variant="secondary" onClick={() => navigate(`/alunos/${id}/editar`)}><Edit3 size={16} />Editar aluno</Button>
      <Button onClick={() => navigate(`/uniformes/entrega?aluno_id=${id}`)}><PackageCheck size={16} />Registrar entrega</Button>
    </>} />
    <Back />
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-base font-bold">Dados do aluno</h2>
        <div className="my-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-lg font-medium text-blue-600">{initials(s.nome)}</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-xs">
          <Info label="Matrícula" value={s.matricula} />
          <Info label="Nascimento" value={dateBR(s.data_nascimento)} />
          <Info label="Escola" value={s.escola} />
          <Info label="Turma" value={s.turma} />
          <Info label="Pai" value={s.nome_pai || '—'} />
          <Info label="Mãe" value={s.nome_mae || '—'} />
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-base font-bold">Uniforme</h2>
        <p className="mb-1 text-xs text-slate-400">Situação atual do aluno</p>
        <Badge status={s.status} />
        <div className="mt-6 grid grid-cols-2 gap-7">
          <Info label="Tamanho da camiseta" value={s.tamanho} />
          <Info label="Uniformes recebidos" value={s.recebidos} />
          <Info label="Última entrega" value={ultima ? dateBR(ultima.data_entrega) : '—'} />
          <Info label="Peças na última entrega" value={ultima ? `${pecasUltima} ${pecasUltima === 1 ? 'peça' : 'peças'}` : '—'} />
        </div>
      </Card>
    </div>
    <Card className="mt-5 min-h-[340px] overflow-hidden">
      <div className="px-6 pb-2 pt-5">
        <h2 className="text-base font-bold">Histórico de entregas</h2>
        <p className="text-xs text-slate-400">Entregas registradas para este aluno {apiStatus !== 'online' && '(modo local — API indisponível)'}</p>
      </div>
      {carregandoEntregas ? <div className="py-16 text-center text-sm text-slate-400">Carregando...</div> : entregas.length ? (
        <div className="scrollbar-thin overflow-x-auto px-6">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead><tr className="bg-slate-50 text-slate-500">{['Data', 'Responsável', 'Peças', 'Detalhes'].map(x => <th key={x} className="px-4 py-3 font-medium">{x}</th>)}</tr></thead>
            <tbody>{entregas.map(x => {
              const total = x.itens.reduce((t, i) => t + i.quantidade_entregue, 0);
              const detalhes = x.itens.map(i => `${i.tipo} ${i.tamanho} ×${i.quantidade_entregue}`).join(' · ');
              return <tr key={x.id} className="border-b border-slate-100">
                <td className="px-4 py-5 font-semibold">{dateBR(x.data_entrega)}</td>
                <td className="px-4 py-5">{x.responsavel || '—'}</td>
                <td className="px-4 py-5">{total} {total === 1 ? 'peça' : 'peças'}</td>
                <td className="px-4 py-5 text-slate-500">{detalhes}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      ) : <Empty text="Nenhuma entrega registrada para este aluno." />}
    </Card>
  </div>;
}

function Info({ label, value }) { return <div><div className="mb-1 text-[10px] font-medium text-slate-500">{label}</div><div className="font-semibold text-slate-900">{value}</div></div>; }
