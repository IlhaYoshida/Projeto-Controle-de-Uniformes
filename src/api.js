export const API_URL = 'http://localhost:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    let detail = `Erro ${response.status}`;
    try { const body = await response.json(); if (body?.detail) detail = body.detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.json();
}

// --- Autenticação & Setup ---
export const login = payload => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
export const getStatusInicial = () => request('/auth/status-inicial');
export const setupInicial = payload => request('/auth/setup-inicial', { method: 'POST', body: JSON.stringify(payload) });

// --- Alunos ---
export async function getAlunos(params = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  const data = await request(`/alunos${qs ? `?${qs}` : ''}`);
  return Array.isArray(data) ? data : data?.value || [];
}
export const getAluno = id => request(`/alunos/${id}`);
export const createAluno = payload => request('/alunos', { method: 'POST', body: JSON.stringify(payload) });
export const updateAluno = (id, payload) => request(`/alunos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteAluno = id => request(`/alunos/${id}`, { method: 'DELETE' });

// --- Escolas ---
export const getEscolas = () => request('/escolas');
export const createEscola = payload => request('/escolas', { method: 'POST', body: JSON.stringify(payload) });

// --- Turmas ---
export const getTurmas = (escolaId) => request(`/turmas${escolaId ? `?escola_id=${escolaId}` : ''}`);
export const createTurma = payload => request('/turmas', { method: 'POST', body: JSON.stringify(payload) });
export const updateTurma = (id, payload) => request(`/turmas/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteTurma = id => request(`/turmas/${id}`, { method: 'DELETE' });
export const getAlunosDaTurma = turmaId => request(`/turmas/${turmaId}/alunos`);
export const getEstatisticasTurma = turmaId => request(`/turmas/${turmaId}/estatisticas`);

// --- Usuários ---
export const getUsuarios = () => request('/usuarios');
export const createUsuario = payload => request('/usuarios', { method: 'POST', body: JSON.stringify(payload) });
export const updateUsuario = (id, payload) => request(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteUsuario = id => request(`/usuarios/${id}`, { method: 'DELETE' });

// --- Entrada de estoque (lote recebido) ---
export const registrarEntrada = payload => request('/entradas', { method: 'POST', body: JSON.stringify(payload) });
export const getEntradas = (params = {}) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  return request(`/entradas${qs ? `?${qs}` : ''}`);
};

// --- Entregas (uniforme entregue a um aluno) ---
export const registrarEntrega = payload => request('/entregas', { method: 'POST', body: JSON.stringify(payload) });
export const getEntregasDoAluno = alunoId => request(`/entregas/aluno/${alunoId}`);
export const getEntregas = (params = {}) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  return request(`/entregas${qs ? `?${qs}` : ''}`);
};

// --- Estoque & Tipos de Uniforme ---
export const getEstoque = () => request('/estoque');
export const getAlertasEstoque = () => request('/estoque/alertas');
export const getResumoEstoquePorTipo = () => request('/estoque/resumo-por-tipo');
export const getTiposDisponiveis = () => request('/estoque/tipos-disponiveis');
export const getTamanhosDisponiveis = () => request('/estoque/tamanhos-disponiveis');
export const createItemUniforme = payload => request('/estoque/item', { method: 'POST', body: JSON.stringify(payload) });
export const deleteItemUniforme = id => request(`/estoque/item/${id}`, { method: 'DELETE' });

// --- Relatórios / Dashboard ---
export const getRelatorioEntregasPorTurma = () => request('/relatorios/entregas-por-turma');
export const getRelatorioCompleto = (ano) => request(`/relatorios/completo${ano ? `?ano=${ano}` : ''}`);
export const relatorioEntregasPorTurmaCsvUrl = () => `${API_URL}/relatorios/entregas-por-turma/csv`;
export const getDashboard = (ano) => request(`/relatorios/dashboard${ano ? `?ano=${ano}` : ''}`);

// --- Logs ---
export const getLogs = (limite = 200) => request(`/logs${limite ? `?limite=${limite}` : ''}`);
export const downloadLogsUrl = () => `${API_URL}/logs/download`;
