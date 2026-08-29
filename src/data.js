export const demoStudents = [
  { id: 1, nome: 'João Pedro Silva', matricula: '202600145', turma: '5º A', idade: 10, nascimento: '2016-03-14', tamanho: 'M', status: 'Recebido', escola: 'Escola Municipal Central', pai: 'Carlos Silva', mae: 'Mariana Oliveira', recebidos: 2 },
  { id: 2, nome: 'Maria Eduarda Santos', matricula: '202600146', turma: '5º A', idade: 10, nascimento: '2016-06-25', tamanho: 'P', status: 'Pendente', escola: 'Escola Municipal Central', pai: 'Rafael Santos', mae: 'Cláudia Santos', recebidos: 0 },
  { id: 3, nome: 'Lucas Henrique Costa', matricula: '202600147', turma: '6º B', idade: 11, nascimento: '2015-05-10', tamanho: 'G', status: 'Recebido', escola: 'Escola Municipal Central', pai: 'Paulo Costa', mae: 'Márcia Costa', recebidos: 1 },
  { id: 4, nome: 'Ana Clara Oliveira', matricula: '202600148', turma: '6º B', idade: 11, nascimento: '2015-01-19', tamanho: 'M', status: 'Recebido', escola: 'Escola Municipal Central', pai: 'André Oliveira', mae: 'Renata Oliveira', recebidos: 1 },
  { id: 5, nome: 'Gabriel Souza Lima', matricula: '202600149', turma: '7º A', idade: 12, nascimento: '2014-04-03', tamanho: 'GG', status: 'Pendente', escola: 'Escola Municipal Central', pai: 'Marcos Lima', mae: 'Aline Souza', recebidos: 0 },
  { id: 6, nome: 'Beatriz Ferreira Alves', matricula: '202600150', turma: '7º C', idade: 12, nascimento: '2014-08-12', tamanho: 'P', status: 'Recebido', escola: 'Escola Municipal Central', pai: 'Bruno Alves', mae: 'Patrícia Ferreira', recebidos: 1 },
  { id: 7, nome: 'Matheus Rodrigues', matricula: '202600151', turma: '8º A', idade: 13, nascimento: '2013-02-27', tamanho: 'G', status: 'Pendente', escola: 'Escola Municipal Central', pai: 'Eduardo Rodrigues', mae: 'Simone Rodrigues', recebidos: 0 },
  { id: 8, nome: 'Sofia Martins Rocha', matricula: '202600152', turma: '8º B', idade: 13, nascimento: '2013-09-08', tamanho: 'M', status: 'Recebido', escola: 'Escola Municipal Central', pai: 'Fábio Rocha', mae: 'Luciana Martins', recebidos: 1 },
];

export const demoDeliveries = {
  1: [
    { id: 1, data: '2026-08-12', responsavel: 'Mariana Souza', pecas: 4, detalhes: 'Camiseta M · Calça M · Bermuda M · Agasalho M' },
    { id: 2, data: '2026-03-18', responsavel: 'Carlos Lima', pecas: 1, detalhes: 'Camiseta M' },
  ],
};

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
export const dateBR = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';
