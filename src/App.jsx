import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getAlunos, createAluno, updateAluno, deleteAluno, registrarEntrega, getStatusInicial } from './api';
import { demoStudents } from './data';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import StudentsPage from './pages/StudentsPage';
import StudentFormPage from './pages/StudentFormPage';
import StudentDetailsPage from './pages/StudentDetailsPage';
import TurmasPage from './pages/TurmasPage';
import EstoqueEntradaPage from './pages/EstoqueEntradaPage';
import UniformesPage from './pages/UniformesPage';
import RegistrarEntregaPage from './pages/RegistrarEntregaPage';
import DashboardPage from './pages/DashboardPage';
import RelatoriosPage from './pages/RelatoriosPage';
import UsuariosPage from './pages/UsuariosPage';
import LogsPage from './pages/LogsPage';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export default function App() {
  // Estado de Autenticação (Item 10)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const salvo = localStorage.getItem('uniformes_user');
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });

  // Estado do Modo Escuro / Claro (Item 16)
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('uniformes_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState('loading'); // 'loading' | 'online' | 'offline'
  const [escolaId, setEscolaId] = useState(1);

  // Aplica classe dark na tag <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('uniformes_dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const carregarAlunos = useCallback(() => {
    setLoading(true);
    return getAlunos()
      .then(data => {
        setApiStatus('online');
        setStudents(data.length ? data : []);
      })
      .catch(() => {
        setApiStatus('offline');
        setStudents(current => (current.length ? current : demoStudents));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregarAlunos();
    getStatusInicial()
      .then(res => {
        if (res.escola_id) setEscolaId(res.escola_id);
      })
      .catch(() => {});
  }, [carregarAlunos]);

  const exigirApiOnline = () => {
    if (apiStatus !== 'online') {
      throw new Error('A API não está respondendo agora. Verifique se o backend está no ar antes de salvar.');
    }
  };

  const handleLoginSuccess = (usuario) => {
    setCurrentUser(usuario);
    localStorage.setItem('uniformes_user', JSON.stringify(usuario));
    carregarAlunos();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('uniformes_user');
  };

  const contextValue = useMemo(() => ({
    currentUser,
    logout: handleLogout,
    darkMode,
    toggleDarkMode,
    escolaId,
    students,
    loading,
    apiStatus,
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
      setStudents(s => s.map(x => (String(x.id) === String(id) ? atualizado : x)));
      return atualizado;
    },

    removeStudent: async (id) => {
      exigirApiOnline();
      await deleteAluno(id);
      setStudents(s => s.filter(x => String(x.id) !== String(id)));
    },

    addDelivery: async (alunoId, usuarioId, itens) => {
      exigirApiOnline();
      const entrega = await registrarEntrega({
        aluno_id: Number(alunoId),
        usuario_id: Number(usuarioId),
        itens,
      });
      const data = await getAlunos();
      setStudents(data);
      return entrega;
    },
  }), [currentUser, darkMode, escolaId, students, loading, apiStatus, carregarAlunos]);

  // Se não estiver logado, exibe tela de login obrigatório / setup inicial (Item 10)
  if (!currentUser) {
    return (
      <AppContext.Provider value={contextValue}>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/alunos" element={<StudentsPage />} />
          <Route path="/alunos/novo" element={<StudentFormPage />} />
          <Route path="/alunos/:id/editar" element={<StudentFormPage />} />
          <Route path="/alunos/:id" element={<StudentDetailsPage />} />
          <Route path="/turmas" element={<TurmasPage />} />
          <Route path="/uniformes" element={<UniformesPage />} />
          <Route path="/uniformes/entrada" element={<EstoqueEntradaPage />} />
          <Route path="/uniformes/entrega" element={<RegistrarEntregaPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppContext.Provider>
  );
}
