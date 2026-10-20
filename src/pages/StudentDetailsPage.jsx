import { Edit3, PackageCheck, Mail, Phone } from 'lucide-react';
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
  const statusUniforme = (s.recebidos > 0 || entregas.length > 0) ? 'Recebido' : 'Pendente';

  return (
    <div className="page-enter">
      <Header
        title={s.nome}
        subtitle={`${s.turma || 'Sem turma'} · Matrícula ${s.matricula}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/alunos/${id}/editar`)}>
              <Edit3 size={16} /> Editar aluno
            </Button>
            <Button onClick={() => navigate(`/uniformes/entrega?aluno_id=${id}`)}>
              <PackageCheck size={16} /> Registrar saída
            </Button>
          </>
        }
      />
      <Back />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Dados do aluno</h2>
          <div className="my-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-lg font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            {initials(s.nome)}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-xs">
            <Info label="Matrícula" value={s.matricula} />
            <Info label="Nascimento" value={dateBR(s.data_nascimento)} />
            <Info label="Escola" value={s.escola || 'Escola Municipal'} />
            <Info label="Turma" value={s.turma || '—'} />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#2563eb] dark:text-blue-400">
              Contato dos responsáveis
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <div className="font-semibold text-slate-900 dark:text-white">Pai: {s.nome_pai || '—'}</div>
                {s.telefone_pai && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Phone size={13} className="text-blue-500" /> {s.telefone_pai}
                  </div>
                )}
                {s.email_pai && (
                  <div className="mt-1 flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                    <Mail size={13} className="text-blue-500" /> {s.email_pai}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <div className="font-semibold text-slate-900 dark:text-white">Mãe: {s.nome_mae || '—'}</div>
                {s.telefone_mae && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Phone size={13} className="text-blue-500" /> {s.telefone_mae}
                  </div>
                )}
                {s.email_mae && (
                  <div className="mt-1 flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                    <Mail size={13} className="text-blue-500" /> {s.email_mae}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Uniforme</h2>
          <p className="mb-2 text-xs text-slate-400">Situação atual de recebimento</p>
          <Badge status={statusUniforme} />
          <div className="mt-6 grid grid-cols-2 gap-7">
            <Info label="Tamanho da camiseta" value={s.tamanho || '—'} />
            <Info label="Uniformes recebidos" value={s.recebidos || entregas.length} />
            <Info label="Última saída" value={ultima ? dateBR(ultima.data_entrega) : '—'} />
            <Info label="Peças na última saída" value={ultima ? `${pecasUltima} ${pecasUltima === 1 ? 'peça' : 'peças'}` : '—'} />
          </div>
        </Card>
      </div>

      <Card className="mt-5 min-h-[340px] overflow-hidden">
        <div className="px-6 pb-2 pt-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Histórico de saídas de uniformes</h2>
          <p className="text-xs text-slate-400">
            Saídas registradas para este aluno {apiStatus !== 'online' && '(modo local — API indisponível)'}
          </p>
        </div>
        {carregandoEntregas ? (
          <div className="py-16 text-center text-sm text-slate-400">Carregando...</div>
        ) : entregas.length ? (
          <div className="scrollbar-thin overflow-x-auto px-6 pb-5">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {['Data', 'Responsável', 'Peças', 'Detalhes'].map(x => (
                    <th key={x} className="px-4 py-3 font-medium">{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entregas.map(x => {
                  const total = x.itens.reduce((t, i) => t + i.quantidade_entregue, 0);
                  const detalhes = x.itens.map(i => `${i.tipo} ${i.tamanho} ×${i.quantidade_entregue}`).join(' · ');
                  return (
                    <tr key={x.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-4 font-semibold">{dateBR(x.data_entrega)}</td>
                      <td className="px-4 py-4">{x.responsavel || '—'}</td>
                      <td className="px-4 py-4">{total} {total === 1 ? 'peça' : 'peças'}</td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{detalhes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Nenhuma saída de uniforme registrada para este aluno." />
        )}
      </Card>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
