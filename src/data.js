// Dados de demonstração, usados só quando a API está indisponível (modo offline).
export const demoStudents = [
  { id: 1, nome: 'João Pedro Silva', matricula: '202600145', turma: '5º A', turma_id: 1, idade: 10, data_nascimento: '2016-03-14', tamanho: 'M', status: 'Recebido', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Carlos Silva', nome_mae: 'Mariana Oliveira', telefone_pai: '(11) 98765-4321', email_pai: 'carlos@email.com', telefone_mae: '(11) 98765-1234', email_mae: 'mariana@email.com', recebidos: 2 },
  { id: 2, nome: 'Maria Eduarda Santos', matricula: '202600146', turma: '5º A', turma_id: 1, idade: 10, data_nascimento: '2016-06-25', tamanho: 'P', status: 'Pendente', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Rafael Santos', nome_mae: 'Cláudia Santos', telefone_pai: '', email_pai: '', telefone_mae: '(11) 97777-8888', email_mae: 'claudia@email.com', recebidos: 0 },
  { id: 3, nome: 'Lucas Henrique Costa', matricula: '202600147', turma: '6º B', turma_id: 2, idade: 11, data_nascimento: '2015-05-10', tamanho: 'G', status: 'Recebido', escola: 'Escola Municipal Central', escola_id: 1, nome_pai: 'Paulo Costa', nome_mae: 'Márcia Costa', telefone_pai: '', email_pai: '', telefone_mae: '', email_mae: '', recebidos: 1 },
];

export const demoEntregas = {
  1: [
    { id: 1, data_entrega: '2026-08-12T10:00:00Z', itens: [{ tipo: 'Camiseta', tamanho: 'M', quantidade_entregue: 1 }, { tipo: 'Calça', tamanho: 'M', quantidade_entregue: 1 }] },
    { id: 2, data_entrega: '2026-03-18T10:00:00Z', itens: [{ tipo: 'Camiseta', tamanho: 'M', quantidade_entregue: 1 }] },
  ],
};

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
export const dateBR = value => value ? new Date(String(value).length > 10 ? value : `${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';

export const TAMANHOS_UNIFORME = ['PP', 'P', 'M', 'G', 'GG', 'XG', '3G'];
export const TIPOS_PADRAO = ['Camiseta', 'Calça', 'Bermuda', 'Agasalho'];

// Transforma itens do estoque numa matriz de pivô com suporte a tipos e tamanhos customizados
export const pivotEstoque = (itens = [], tiposCustom = null) => {
  // Se tiposCustom for passado, usa apenas eles; senão extrai tipos existentes nos itens do estoque
  const tiposUnicos = tiposCustom || [...new Set(itens.map(i => i.tipo))];
  const tamanhosUnicos = [...new Set([...TAMANHOS_UNIFORME, ...itens.map(i => i.tamanho)])];

  return tiposUnicos.map(tipo => {
    const porTamanho = Object.fromEntries(tamanhosUnicos.map(tam => {
      const item = itens.find(i => i.tipo === tipo && i.tamanho === tam);
      return [tam, item ? item.quantidade_estoque : 0];
    }));
    const total = Object.values(porTamanho).reduce((a, b) => a + b, 0);
    const algumBaixo = itens.some(i => i.tipo === tipo && i.alerta_saldo_baixo);
    return { tipo, ...porTamanho, total, algumBaixo };
  });
};
