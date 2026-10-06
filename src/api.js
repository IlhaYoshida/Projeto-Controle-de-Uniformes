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

// --- Escolas / Turmas / Usuários (cadastros de apoio) ---
export const getEscolas = () => request('/escolas');
export const createEscola = payload => request('/escolas', { method: 'POST', body: JSON.stringify(payload) });
export const getTurmas = (escolaId) => request(`/turmas${escolaId ? `?escola_id=${escolaId}` : ''}`);
export const createTurma = payload => request('/turmas', { method: 'POST', body: JSON.stringify(payload) });
export const getUsuarios = () => request('/usuarios');
export const createUsuario = payload => request('/usuarios', { method: 'POST', body: JSON.stringify(payload) });

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

// --- Estoque ---
export const getEstoque = () => request('/estoque');
export const getAlertasEstoque = () => request('/estoque/alertas');
export const getResumoEstoquePorTipo = () => request('/estoque/resumo-por-tipo');

// --- Relatórios / Dashboard ---
export const getRelatorioEntregasPorTurma = () => request('/relatorios/entregas-por-turma');
export const relatorioEntregasPorTurmaCsvUrl = () => `${API_URL}/relatorios/entregas-por-turma/csv`;
export const getDashboard = (ano) => request(`/relatorios/dashboard${ano ? `?ano=${ano}` : ''}`);
