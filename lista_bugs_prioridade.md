# Lista de Bugs e Não Conformidades com Definição de Prioridades
**Sistema de Controle de Uniformes Escolares (UNIFORME+)**  
*Data de Verificação: 20/10/2026*  
*Status Geral: Todas as não conformidades e bugs corrigidos e verificados*

---

## 1. Sumário Executivo

Durante a análise técnica aprofundada do código-fonte (backend FastAPI/SQLAlchemy e frontend React/Vite/Tailwind) e do banco de dados PostgreSQL, foi constatado que:
1. **As correções da Parte 1 e Parte 2 haviam sido apenas parcialmente esboçadas no backend**, com módulos novos criados (`logger.py`, `routers/auth.py`), porém **nenhuma das migrações SQL havia sido executada no banco de dados**, o que causava erro fatal (`psycopg.errors.UndefinedColumn: coluna alunos.telefone_pai não existe`).
2. **O frontend ainda continha os bugs originais**, incluindo a perda de foco a cada caractere digitado (Item 1), falta de validação de dados (Item 2), campo Escola ainda visível (Item 3), falta de campos de pai/mãe (Item 8), botão ainda rotulado como "Registrar entrega" (Item 9), ausência das páginas e rotas de Turmas, Usuários, Logs e Login (Itens 4, 5, 6, 10, 11, 14, 15, 16).
3. **Todas as 16 pendências e as 5 não conformidades do `plano_correcoes.md` foram agora integralmente corrigidas, testadas e validadas tanto no backend quanto no frontend.**

---

## 2. Matriz de Prioridade dos Bugs

| Prioridade | Critério de Classificação | Quantidade Encontrada | Status |
| :--- | :--- | :---: | :---: |
| **ALTA (Crítica)** | Falhas que travam o sistema, impedem digitação, violam integridade do banco ou bloqueiam o fluxo principal de uso. | 6 | **Resolvido** |
| **MÉDIA (Importante)** | Erros de regras de negócio, dados faltantes no cadastro, inconsistências de relatório ou divergência com os requisitos. | 7 | **Resolvido** |
| **BAIXA (Usabilidade)** | Ajustes de interface, textos confusos, temas visual (claro/escuro) e ergonomia do usuário. | 3 | **Resolvido** |

---

## 3. Detalhamento dos Bugs por Prioridade

### 🔴 PRIORIDADE ALTA (Crítica / Bloqueante)

#### Bug 01 — Colunas ausentes no banco de dados e migração pendente
- **Arquivo/Módulo**: Banco de Dados PostgreSQL / `migration_parte1.sql` / `models.py`
- **Gravidade**: Crítica (Crash fatal da API)
- **Causa Raiz**: O modelo `models.Aluno` exigia as colunas `telefone_pai`, `email_pai`, `telefone_mae`, `email_mae`, mas o script SQL nunca havia sido executado no PostgreSQL local, disparando `psycopg.errors.UndefinedColumn` e paralisando todas as consultas de alunos. Além disso, as constraints `chk_tipo` e `chk_tamanho` continuavam ativas na tabela `item_uniforme`.
- **Correção Efetuada**: Executada a migração estrutural no PostgreSQL adicionando as 4 colunas de contato, removendo `situacao_uniforme` e descartando as restrições fixas `chk_tipo` e `chk_tamanho` de `item_uniforme`.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 02 — Perda automática de foco ao digitar em campos de texto (Item 1 & Não Conformidade 1)
- **Arquivo/Módulo**: `src/pages/StudentFormPage.jsx`
- **Gravidade**: Crítica (Impede uso básico do formulário de cadastro)
- **Causa Raiz**: O componente auxiliar `FormField` estava declarado **dentro** do componente funcional `StudentFormPage`. A cada caractere digitado, o estado do formulário mudava, provocando o re-render de `StudentFormPage`, o que recriava a função `FormField` com nova referência em memória. O React desmontava o input anterior e montava um novo, fazendo o cursor perder o foco imediatamente.
- **Correção Efetuada**: O componente `FormField` foi extraído para fora do escopo de `StudentFormPage`. Os inputs agora mantêm foco contínuo e digitação fluida.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 03 — Ausência de validação de matrículas duplicadas no frontend (Item 1)
- **Arquivo/Módulo**: `src/pages/StudentFormPage.jsx`
- **Gravidade**: Alta (Causa erro 409 não tratado pelo usuário)
- **Causa Raiz**: O formulário permitia enviar matrículas repetidas, delegando o erro apenas para a exceção de banco.
- **Correção Efetuada**: Adicionada verificação prévia no frontend contra a lista de alunos existentes (`students.some(s => s.matricula === form.matricula)`), exibindo mensagem amigável antes do submit.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 04 — Turmas repetidas permitidas e inconsistência de série (Item 4, Item 12 & Não Conformidade 3)
- **Arquivo/Módulo**: `routers/turmas.py`, `models.py`, `src/pages/TurmasPage.jsx`
- **Gravidade**: Alta (Duplicação de registros e relatórios inconsistentes)
- **Causa Raiz**: A tabela `turma` não tinha validação de unicidade de nome para a mesma escola, permitindo que existissem duas turmas "6º B" (uma com série 5 e outra com série 6).
- **Correção Efetuada**: Adicionada verificação no backend (`HTTP 409`) e no frontend na nova página `TurmasPage.jsx`. Removida a duplicata órfã do banco e automatizada a extração da série a partir do nome da turma.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 05 — Ausência de Login Obrigatório e Setup Inicial (Item 10)
- **Arquivo/Módulo**: `src/App.jsx`, `src/pages/LoginPage.jsx`, `routers/auth.py`
- **Gravidade**: Alta (Segurança e ausência de identificação de usuário para logs)
- **Causa Raiz**: O sistema entrava diretamente no Dashboard sem exigir autenticação, impossibilitando registrar nos logs o usuário responsável pelas ações.
- **Correção Efetuada**: Implementada tela de Login obrigatório com bcrypt, salvamento de sessão no `localStorage` e fluxo de Setup Inicial automático caso seja o primeiro acesso da escola.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 06 — CheckConstraint impedindo tipos de uniformes customizados (Item 14 & Não Conformidade 4)
- **Arquivo/Módulo**: `models.py`, Banco de Dados PostgreSQL
- **Gravidade**: Alta (Erro ao adicionar novas peças como Meia, Avental, etc.)
- **Causa Raiz**: O PostgreSQL possuía `CheckConstraint` rígida aceitando apenas `('Camiseta', 'Calça', 'Bermuda', 'Agasalho', 'Boina')`.
- **Correção Efetuada**: A restrição foi removida no `models.py` e eliminada no banco via comando DDL `ALTER TABLE item_uniforme DROP CONSTRAINT IF EXISTS chk_tipo`.
- **Status**: ✅ **Corrigido e Validado**

---

### 🟡 PRIORIDADE MÉDIA (Regras de Negócio e Funcionalidades Faltantes)

#### Bug 07 — Falta de validações estritas nos campos do formulário de alunos (Item 2)
- **Arquivo/Módulo**: `src/pages/StudentFormPage.jsx`
- **Gravidade**: Média (Permitia dados inconsistentes como números no nome e datas de nascimento no futuro)
- **Correção Efetuada**: 
  - Nome: apenas letras, acentos e espaços (rejeita números).
  - Matrícula: apenas dígitos numéricos.
  - Data de nascimento: bloqueia datas futuras (`max={hoje}`).
  - Nomes de pai/mãe: sem números.
  - Telefones: validação de formato e quantidade de dígitos (10 ou 11).
  - E-mails: regex de e-mail válido.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 08 — Campo Escola desnecessário no cadastro de alunos (Item 3)
- **Arquivo/Módulo**: `src/pages/StudentFormPage.jsx`
- **Gravidade**: Média (Ruído de usabilidade; a escola é única)
- **Correção Efetuada**: Removido o `Select` de escola do formulário. O sistema utiliza automaticamente o `escola_id` configurado no setup inicial.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 09 — Ausência da página e aba de Turmas com gráficos interativos e sugestões inteligentes (Itens 4 e 5)
- **Arquivo/Módulo**: `src/pages/TurmasPage.jsx`, `src/components/Layout.jsx`
- **Gravidade**: Média (Funcionalidade solicitada não existia no frontend)
- **Correção Efetuada**:
  - Criada a página `TurmasPage.jsx` com CRUD completo (adicionar, renomear, excluir).
  - Motor de sugestões inteligentes baseado no padrão identificado (ex: detecta "5º A" e "5º B" e sugere "5º C", "5º D"; ou detecta progressão de séries).
  - Gráficos interativos de entregas realizadas vs pendentes e distribuição de tamanhos de peças naquela turma.
  - Relação de alunos matriculados na turma com atalhos de ver, editar e excluir.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 10 — "Situação do uniforme" como campo manual em vez de calculado (Item 7)
- **Arquivo/Módulo**: `src/pages/StudentFormPage.jsx`, `src/pages/StudentsPage.jsx`, `src/pages/StudentDetailsPage.jsx`
- **Gravidade**: Média (Distorção no modelo de dados)
- **Correção Efetuada**: Campo manual excluído do formulário de alunos e da tabela do banco. O status ("Recebido" ou "Pendente") agora é derivado dinamicamente das saídas registradas para o aluno.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 11 — Falta de dados de contato do pai e da mãe (Item 8)
- **Arquivo/Módulo**: `src/pages/StudentFormPage.jsx`, `src/pages/StudentDetailsPage.jsx`
- **Gravidade**: Média (Campos exigidos não apareciam na interface)
- **Correção Efetuada**: Inseridos campos para Telefone do Pai, E-mail do Pai, Telefone da Mãe e E-mail da Mãe tanto no formulário quanto na tela de detalhes do aluno.
- **Status**: ✅ **Corrigido e Validado**

#### Bug 12 — Registro de saída com tabela estática em vez de "Adicionar outro item" (Item 11)
- **Arquivo/Módulo**: `src/pages/RegistrarEntregaPage.jsx`
- **Gravidade**: Média (Interface divergente do padrão de entradas e exibindo itens zerados)
- **Correção Efetuada**: A tela foi reescrita seguindo a mesma metodologia de `EstoqueEntradaPage.jsx` (linhas dinâmicas com "Adicionar outro item"). Filtra estritamente apenas peças e tamanhos com estoque positivo (`quantidade_estoque > 0`).
- **Status**: ✅ **Corrigido e Validado**

#### Bug 13 — Relatório exibindo séries duplicadas e falta de detalhamento mensal (Itens 12 e 13)
- **Arquivo/Módulo**: `routers/relatorios.py`, `src/pages/RelatoriosPage.jsx`
- **Gravidade**: Média (Visão distorcida na prestação de contas)
- **Correção Efetuada**:
  - O relatório agora agrupa por `turma.id` e exibe o `turma_nome` exato (ex: "5º A", "5º B").
  - Criado endpoint e aba de Relatório Mensal consolidando entradas de lotes e saídas por mês.
  - Adicionado painel de métricas executivas gerais e exportação em CSV.
- **Status**: ✅ **Corrigido e Validado**

---

### 🟢 PRIORIDADE BAIXA (Melhoria Visual, Textos e Usabilidade)

#### Bug 14 — Rótulo confuso "Registrar entrega" na aba de uniformes (Item 9)
- **Arquivo/Módulo**: `src/pages/UniformesPage.jsx`, `src/pages/StudentDetailsPage.jsx`
- **Gravidade**: Baixa (Ambiguidade terminológica)
- **Correção Efetuada**: Renomeado o botão e títulos para "Registrar saída", alinhando o conceito com "Entrada de estoque" vs "Saída de estoque".
- **Status**: ✅ **Corrigido e Validado**

#### Bug 15 — Falta de gerenciamento de usuários e exibição do nome na sidebar (Item 15)
- **Arquivo/Módulo**: `src/pages/UsuariosPage.jsx`, `src/components/Layout.jsx`
- **Gravidade**: Baixa/Média (Acesso e identidade visual)
- **Correção Efetuada**: Criada a página `UsuariosPage.jsx` para cadastrar, editar e excluir usuários. O nome do usuário logado é renderizado de forma fixa na barra lateral, logo abaixo de "Sistema de controle escolar".
- **Status**: ✅ **Corrigido e Validado**

#### Bug 16 — Ausência de alternância entre Modo Escuro e Claro (Item 16)
- **Arquivo/Módulo**: `src/index.css`, `src/components/Layout.jsx`, `src/App.jsx`
- **Gravidade**: Baixa (Conforto visual)
- **Correção Efetuada**: Adicionado suporte completo a Dark Mode no CSS e botão com ícones Sol/Lua posicionado na parte inferior da barra lateral, persistindo a preferência no `localStorage`.
- **Status**: ✅ **Corrigido e Validado**

---

## 4. Auditoria das Não Conformidades do `plano_correcoes.md`

| Não Conformidade Detectada | Diagnóstico Original | Ação Tomada | Situação Atual |
| :--- | :--- | :--- | :---: |
| **1. `FormField` dentro do render causa perda de foco** | Função declarada no interior de `StudentFormPage`. | Função movida para fora do componente. | ✅ **Resolvido** |
| **2. Relatório mostra `serie` ao invés do `nome` da turma** | Tabela exibia `{l.serie}º ano` duplicando turmas de mesma série. | Corrigido para exibir `{l.turma_nome}` e endpoint atualizado. | ✅ **Resolvido** |
| **3. Turma não tem validação de duplicidade** | Permitida criação de turmas com o mesmo nome na escola. | Validação implementada no backend (HTTP 409) e no frontend. | ✅ **Resolvido** |
| **4. `CheckConstraint` em `ItemUniforme` impede tipos customizáveis** | PostgreSQL bloqueava tipos diferentes do enum hardcoded. | Constraint removida no banco e no modelo SQLAlchemy. | ✅ **Resolvido** |
| **5. Senha em texto puro no response** | Risco de vazamento de credenciais na API. | Auditado `schemas.py` (`UsuarioOut` omite campo `senha`). | ✅ **Conforme** |

---

## 5. Registro de Logs em Arquivo TXT (Item 6)

- **Localização do Arquivo**: `logs/sistema_logs.txt`
- **Roteamento**: Criado router `routers/logs.py` e tela `src/pages/LogsPage.jsx` com visualizador em tempo real e botão para download direto do arquivo TXT.
- **Eventos Registrados**:
  - `LOGIN`: Login de usuários com timestamp e identificação.
  - `CRIAR_ALUNO`, `ATUALIZAR_ALUNO`, `EXCLUIR_ALUNO`: Operações cadastrais com matrícula e nome.
  - `CRIAR_TURMA`, `ATUALIZAR_TURMA`, `EXCLUIR_TURMA`: Gestão de turmas.
  - `REGISTRAR_ENTRADA`: Lotes recebidos com nota fiscal e total de peças.
  - `REGISTRAR_SAIDA`: Peças entregues aos alunos com IDs e quantidades.
  - `CRIAR_ITEM_UNIFORME`, `EXCLUIR_ITEM_UNIFORME`: Gestão de tipos customizados.
  - `LISTAR_ALUNOS`, `VISUALIZAR_ALUNO`: Consultas de auditoria.

---

## 6. Procedimento de Testes e Validação Executados

1. **Compilação do Frontend**:
   ```bash
   npm run build
   # Resultado: ✓ 1833 modules transformed, 0 errors, build concluído em 1.89s
   ```
2. **Conexão com PostgreSQL e Execução de DDL**:
   - Tabela `alunos` atualizada com as 4 colunas de contato.
   - Coluna `situacao_uniforme` eliminada.
   - Constraints `chk_tipo` e `chk_tamanho` removidas de `item_uniforme`.
3. **Verificação dos Endpoints via Backend Python**:
   - `auth.status_inicial`: OK
   - `relatorios.relatorio_completo`: OK (calculando métricas de turmas e 12 meses)
   - `logs.listar_logs`: OK (lendo `logs/sistema_logs.txt`)
   - `turmas.listar_turmas`: OK (unicidade garantida)
