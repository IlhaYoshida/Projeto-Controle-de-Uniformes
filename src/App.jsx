import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getAlunos } from './api';
import { demoDeliveries, demoStudents } from './data';
import Layout from './components/Layout';
import StudentsPage from './pages/StudentsPage';
import StudentFormPage from './pages/StudentFormPage';
import StudentDetailsPage from './pages/StudentDetailsPage';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

function normalize(a, index) {
  return {
    id: a.id ?? a.aluno_id ?? index + 1,
    nome: a.nome ?? a.nome_completo ?? 'Aluno sem nome',
    matricula: String(a.matricula ?? ''), turma: a.turma ?? '—', idade: a.idade ?? '—',
    nascimento: a.nascimento ?? a.data_nascimento ?? '', tamanho: a.tamanho ?? a.tamanho_camiseta ?? '—',
    status: a.status ?? a.situacao_uniforme ?? 'Pendente', escola: a.escola ?? a.escola_nome ?? 'Escola Municipal Central',
    pai: a.pai ?? a.nome_pai ?? '', mae: a.mae ?? a.nome_mae ?? '', recebidos: a.recebidos ?? 0,
  };
}

export default function App() {
  const [students, setStudents] = useState(() => JSON.parse(localStorage.getItem('uniforme_students') || 'null') || []);
  const [deliveries, setDeliveries] = useState(() => JSON.parse(localStorage.getItem('uniforme_deliveries') || 'null') || demoDeliveries);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    getAlunos().then(data => {
      if (!active) return;
      setApiStatus('online');
      if (data.length) setStudents(data.map(normalize));
      else setStudents(current => current.length ? current : demoStudents);
    }).catch(() => { if (active) { setApiStatus('offline'); setStudents(current => current.length ? current : demoStudents); } })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => { if (!loading && students.length) localStorage.setItem('uniforme_students', JSON.stringify(students)); }, [students, loading]);
  useEffect(() => { localStorage.setItem('uniforme_deliveries', JSON.stringify(deliveries)); }, [deliveries]);

  const value = useMemo(() => ({
    students, deliveries, loading, apiStatus,
    addStudent: data => setStudents(s => [...s, { ...data, id: Math.max(0, ...s.map(x => Number(x.id) || 0)) + 1, recebidos: 0 }]),
    updateStudent: (id, data) => setStudents(s => s.map(x => String(x.id) === String(id) ? { ...x, ...data } : x)),
    importStudents: rows => setStudents(s => [...s, ...rows.map((x, i) => normalize(x, s.length + i))]),
    addDelivery: (id, item) => { setDeliveries(d => ({ ...d, [id]: [item, ...(d[id] || [])] })); setStudents(s => s.map(x => String(x.id) === String(id) ? { ...x, status: 'Recebido', recebidos: Number(x.recebidos || 0) + 1 } : x)); },
  }), [students, deliveries, loading, apiStatus]);

  return <AppContext.Provider value={value}><Routes><Route element={<Layout />}><Route index element={<Navigate to="/alunos" replace />} /><Route path="/alunos" element={<StudentsPage />} /><Route path="/alunos/novo" element={<StudentFormPage />} /><Route path="/alunos/:id/editar" element={<StudentFormPage />} /><Route path="/alunos/:id" element={<StudentDetailsPage />} /></Route><Route path="*" element={<Navigate to="/alunos" replace />} /></Routes></AppContext.Provider>;
}
