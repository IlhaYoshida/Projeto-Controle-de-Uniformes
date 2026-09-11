import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getAlunos, createAluno, updateAluno, deleteAluno, registrarEntrega } from './api';
import { demoStudents } from './data';
import Layout from './components/Layout';
import StudentsPage from './pages/StudentsPage';
import StudentFormPage from './pages/StudentFormPage';
import StudentDetailsPage from './pages/StudentDetailsPage';
import EstoqueEntradaPage from './pages/EstoqueEntradaPage';
import UniformesPage from './pages/UniformesPage';
import RegistrarEntregaPage from './pages/RegistrarEntregaPage';
import DashboardPage from './pages/DashboardPage';
import RelatoriosPage from './pages/RelatoriosPage';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export default function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState('loading'); // 'loading' | 'online' | 'offline'

  const carregarAlunos = useCallback(() => {
    setLoading(true);
    return getAlunos().then(data => {
      setApiStatus('online');
      setStudents(data.length ? data : []);
    }).catch(() => {
      setApiStatus('offline');
      setStudents(current => current.length ? current : demoStudents);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregarAlunos(); }, [carregarAlunos]);

  const exigirApiOnline = () => {
    if (apiStatus !== 'online') {
      throw new Error('A API não está respondendo agora. Verifique se o backend está no ar antes de salvar.');
    }
  };

  const value = useMemo(() => ({
    students, loading, apiStatus,
    recarregar: carregarAlunos,

    addStudent: async (data) => {
      exigirApiOnline();
      const criado = await createAluno(data);
      setStudents(s => [...s, criado]);
      return criado;
    },

    updateStudent: async (id, data) => {
      exigirApiOnline();
      const atualizado = await updateAluno(id, data);
      setStudents(s => s.map(x => String(x.id) === String(id) ? atualizado : x));
      return atualizado;
    },

    removeStudent: async (id) => {
      exigirApiOnline();
      await deleteAluno(id);
      setStudents(s => s.filter(x => String(x.id) !== String(id)));
    },

    // itens: [{ item_uniforme_id, quantidade_entregue }]
    addDelivery: async (alunoId, usuarioId, itens) => {
      exigirApiOnline();
      const entrega = await registrarEntrega({ aluno_id: Number(alunoId), usuario_id: Number(usuarioId), itens });
      // Recarrega só esse aluno pra atualizar status/tamanho/recebidos derivados
      const data = await getAlunos();
      setStudents(data);
      return entrega;
    },
  }), [students, loading, apiStatus, carregarAlunos]);

  return <AppContext.Provider value={value}><Routes><Route element={<Layout />}>
    <Route index element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/alunos" element={<StudentsPage />} />
    <Route path="/alunos/novo" element={<StudentFormPage />} />
    <Route path="/alunos/:id/editar" element={<StudentFormPage />} />
    <Route path="/alunos/:id" element={<StudentDetailsPage />} />
    <Route path="/uniformes" element={<UniformesPage />} />
    <Route path="/uniformes/entrada" element={<EstoqueEntradaPage />} />
    <Route path="/uniformes/entrega" element={<RegistrarEntregaPage />} />
    <Route path="/relatorios" element={<RelatoriosPage />} />
  </Route><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></AppContext.Provider>;
}
