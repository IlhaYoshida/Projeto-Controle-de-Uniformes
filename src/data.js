// Dados de demonstração, usados só quando a API está indisponível (modo offline).
// Os nomes de campo seguem o mesmo formato retornado pela API de verdade
// (ver schemas.AlunoOut no backend), pra não precisar de nenhum "tradutor"
// entre modo online e offline.
export const demoStudents = [
  { id: 1, nome: 'João Pedro Silva', matricula: '202600145', turma: '5º A', turma_id: 1, idade: 10, data_nascimento: '2016-03-14', tamanho: 'M', status: 'Recebido', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Carlos Silva', nome_mae: 'Mariana Oliveira', recebidos: 2 },
  { id: 2, nome: 'Maria Eduarda Santos', matricula: '202600146', turma: '5º A', turma_id: 1, idade: 10, data_nascimento: '2016-06-25', tamanho: 'P', status: 'Pendente', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Rafael Santos', nome_mae: 'Cláudia Santos', recebidos: 0 },
  { id: 3, nome: 'Lucas Henrique Costa', matricula: '202600147', turma: '6º B', turma_id: 2, idade: 11, data_nascimento: '2015-05-10', tamanho: 'G', status: 'Recebido', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Paulo Costa', nome_mae: 'Márcia Costa', recebidos: 1 },
  { id: 4, nome: 'Ana Clara Oliveira', matricula: '202600148', turma: '6º B', turma_id: 2, idade: 11, data_nascimento: '2015-01-19', tamanho: 'M', status: 'Recebido', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'André Oliveira', nome_mae: 'Renata Oliveira', recebidos: 1 },
  { id: 5, nome: 'Gabriel Souza Lima', matricula: '202600149', turma: '7º A', turma_id: 3, idade: 12, data_nascimento: '2014-04-03', tamanho: 'GG', status: 'Pendente', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Marcos Lima', nome_mae: 'Aline Souza', recebidos: 0 },
  { id: 6, nome: 'Beatriz Ferreira Alves', matricula: '202600150', turma: '7º C', turma_id: 4, idade: 12, data_nascimento: '2014-08-12', tamanho: 'P', status: 'Recebido', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Bruno Alves', nome_mae: 'Patrícia Ferreira', recebidos: 1 },
  { id: 7, nome: 'Matheus Rodrigues', matricula: '202600151', turma: '8º A', turma_id: 5, idade: 13, data_nascimento: '2013-02-27', tamanho: 'G', status: 'Pendente', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Eduardo Rodrigues', nome_mae: 'Simone Rodrigues', recebidos: 0 },
  { id: 8, nome: 'Sofia Martins Rocha', matricula: '202600152', turma: '8º B', turma_id: 6, idade: 13, data_nascimento: '2013-09-08', tamanho: 'M', status: 'Recebido', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Fábio Rocha', nome_mae: 'Luciana Martins', recebidos: 1 },
];

// Histórico de entregas de demonstração (mesmo formato do endpoint GET /entregas/aluno/{id})
export const demoEntregas = {
  1: [
    { id: 1, data_entrega: '2026-08-12T10:00:00Z', itens: [{ tipo: 'Camiseta', tamanho: 'M', quantidade_entregue: 1 }, { tipo: 'Calça', tamanho: 'M', quantidade_entregue: 1 }] },
    { id: 2, data_entrega: '2026-03-18T10:00:00Z', itens: [{ tipo: 'Camiseta', tamanho: 'M', quantidade_entregue: 1 }] },
  ],
};

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
export const dateBR = value => value ? new Date(String(value).length > 10 ? value : `${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';

export const TIPOS_UNIFORME = ['Camiseta', 'Calça', 'Bermuda', 'Agasalho', 'Boina'];
export const TAMANHOS_UNIFORME = ['PP', 'P', 'M', 'G', 'GG', 'XG', '3G'];

// Vira a lista "achatada" do GET /estoque numa tabela pivô (linha = tipo,
// coluna = cada tamanho + Total), igual à tela "Uniformes" do Figma.
export const pivotEstoque = (itens = []) => TIPOS_UNIFORME.map(tipo => {
  const porTamanho = Object.fromEntries(TAMANHOS_UNIFORME.map(tam => {
    const item = itens.find(i => i.tipo === tipo && i.tamanho === tam);
    return [tam, item ? item.quantidade_estoque : 0];
  }));
  const total = Object.values(porTamanho).reduce((a, b) => a + b, 0);
  const algumBaixo = itens.some(i => i.tipo === tipo && i.alerta_saldo_baixo);
  return { tipo, ...porTamanho, total, algumBaixo };
});
