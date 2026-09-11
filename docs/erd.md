```mermaid
erDiagram

escolas {
    integer id PK
    varchar nome
    varchar endereco
    varchar diretor
}

turma {
    integer id PK
    integer escola_id FK
    integer serie
    varchar nome "rótulo de exibição, ex: 5º A"
}

alunos {
    integer id PK
    integer escola_id FK
    integer turma_id FK
    varchar nome
    varchar matricula UK
    date data_nascimento
    varchar nome_pai
    varchar nome_mae
    varchar tamanho_camiseta "editável no cadastro; sincronizado a cada entrega"
    varchar situacao_uniforme "Pendente/Recebido; idem"
}

usuarios {
    integer id PK
    integer escola_id FK
    varchar nome
    varchar email UK
    varchar senha "hash bcrypt, nunca texto puro"
}

item_uniforme {
    integer id PK
    varchar tipo "Camiseta, Calça, Bermuda, Agasalho, Boina"
    varchar tamanho "PP, P, M, G, GG, XG, 3G"
    integer quantidade_estoque
}

lotes {
    integer id PK
    integer escola_id FK
    integer usuario_id FK
    timestamp data_recebimento
    varchar nota_fiscal
}

item_lote {
    integer id PK
    integer lote_id FK
    integer item_uniforme_id FK
    integer quantidade
}

entregas {
    integer id PK
    integer aluno_id FK
    integer usuario_id FK
    timestamp data_entrega
}

item_entregas {
    integer id PK
    integer entrega_id FK
    integer item_uniforme_id FK
    integer quantidade_entregue
}

escolas ||--o{ turma : "possui"
escolas ||--o{ alunos : "possui"
turma ||--o{ alunos : "contem"
escolas ||--o{ usuarios : "possui"
escolas ||--o{ lotes : "recebe"
usuarios ||--o{ lotes : "cadastra"
lotes ||--o{ item_lote : "contem"
item_uniforme ||--o{ item_lote : "usado_em"
alunos ||--o{ entregas : "recebe"
usuarios ||--o{ entregas : "registra"
entregas ||--o{ item_entregas : "contem"
item_uniforme ||--o{ item_entregas : "usado_em"
```

## Observações / decisões de modelagem

- **`turma.nome`** foi adicionado além de `serie` porque o frontend precisa exibir turmas
  com letra de seção (ex: "5º A", "5º B"), e o ERD original só previa a série numérica.
- **`alunos.tamanho_camiseta` e `alunos.situacao_uniforme` são colunas reais e editáveis**
  (histórias da Sprint pedem esses campos como Select no cadastro do aluno — ver o handoff
  de design). Para não desatualizar esse dado sozinho, o backend também os **sincroniza
  automaticamente** toda vez que uma entrega é registrada (`POST /entregas` atualiza
  `situacao_uniforme` para "Recebido" e `tamanho_camiseta` se uma camiseta fizer parte da
  entrega — ver `routers/entregas.py`). `GET /alunos` ainda calcula `idade`, `turma` e
  `escola` "achatados" a partir de outras tabelas, e cai de volta para o histórico de
  entregas caso os dois campos acima estejam em branco (ex.: aluno antigo).
- **`usuarios.senha`** guarda o hash bcrypt da senha, nunca o texto puro.
- **Diferença entre `entradas` (lotes) e `entregas`:** uma *entrada* é o recebimento de um
  lote de uniformes do governo/fornecedor (soma no estoque); uma *entrega* é a distribuição
  de peças do estoque para um aluno específico (debita o estoque). São conceitos e tabelas
  separados de propósito.
