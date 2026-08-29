export const API_URL = 'https://api-controle-uniformes.onrender.com';

export async function getAlunos() {
  const response = await fetch(`${API_URL}/alunos`);
  if (!response.ok) throw new Error('Não foi possível carregar os alunos.');
  const data = await response.json();
  return Array.isArray(data) ? data : data?.value || [];
}

export async function registrarEntrada(payload) {
  const response = await fetch(`${API_URL}/entradas`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Não foi possível registrar a entrada.');
  return response.json();
}
