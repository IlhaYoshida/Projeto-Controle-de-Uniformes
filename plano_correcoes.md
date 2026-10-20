# Plano de Correções — Controle de Uniformes
*Status: 100% Concluído e Verificado em 20/10/2026*

## Parte 1 (Itens 1–9) — ✅ CONCLUÍDO E VALIDADO

### Item 1 — Bug: Input perde foco ao digitar
- **Causa raiz**: O componente `FormField` estava definido **dentro** do `StudentFormPage` como nested function, o que fazia o React recriá-lo a cada re-render (nova referência de componente = desmonta e remonta o input).
- **Correção**: `FormField` movido para fora do componente principal. Validação de matrícula duplicada no frontend adicionada antes do envio.
- **Status**: ✅ Corrigido

### Item 2 — Validação de dados no frontend
- Campo nome: não permite números, exige letras e mínimo de 3 caracteres.
- Campo matrícula: não permite letras (só números).
- Data de nascimento: bloqueia data futura (`max={hoje}`).
- Nome do pai/mãe: não permite números.
- Telefone: validação de 10 ou 11 dígitos com DDD.
- Email: validação estrita de formato de e-mail.
- **Status**: ✅ Corrigido

### Item 3 — Remover campo "Escola" do cadastro de aluno
- Frontend: removido select de escola do `StudentFormPage`.
- Backend: usa `escola_id = 1` automaticamente (escola única).
- Configuração inicial já define a escola única no primeiro login.
- **Status**: ✅ Corrigido

### Item 4 — Turmas no início + sugestão inteligente
- Criada página `TurmasPage.jsx`.
- Notificação de cobrança inicial quando não há turmas cadastradas.
- Validação no frontend e backend contra turmas repetidas.
- Motor de sugestões inteligentes baseado no padrão identificado (detecta "5º A" e "5º B" e sugere "5º C", "5º D", ou detecta progressão de séries como "6º A", "7º A").
- **Status**: ✅ Corrigido

### Item 5 — Aba "Turmas" na sidebar
- Opção "Turmas" adicionada na barra lateral.
- Gráficos interativos por turma: proporção de entregas realizadas vs pendentes e distribuição de tamanhos de peças.
- Roster de alunos da turma com atalhos para ver, editar e excluir.
- **Status**: ✅ Corrigido

### Item 6 — Registro de logs em TXT
- Centralizado no módulo `logger.py` gravando em `logs/sistema_logs.txt`.
- Registra login, criação, edição, exclusão e visualização com data/hora e usuário.
- Tela `LogsPage.jsx` adicionada para visualização em tempo real e download direto do arquivo TXT.
- **Status**: ✅ Corrigido

### Item 7 — Remover "situação do uniforme"
- Coluna e constraint removidas do banco de dados PostgreSQL.
- Campo removido do formulário de alunos e detalhes.
- Status agora é computado dinamicamente com base nas saídas registradas.
- **Status**: ✅ Corrigido

### Item 8 — Telefone e email do pai e da mãe
- Colunas `telefone_pai`, `email_pai`, `telefone_mae`, `email_mae` adicionadas na tabela `alunos` no PostgreSQL.
- Campos integrados nos formulários, schemas e na página de detalhes do aluno.
- **Status**: ✅ Corrigido

### Item 9 — Renomear "Registrar entrega" → "Registrar saída"
- Botões e rotas atualizados em `UniformesPage.jsx` e `StudentDetailsPage.jsx`.
- **Status**: ✅ Corrigido

---

## Parte 2 (Itens 10–16) — ✅ CONCLUÍDO E VALIDADO

### Item 10 — Login obrigatório
- Implementada tela `LoginPage.jsx` com autenticação segura via bcrypt.
- Wizard de configuração inicial caso a escola ainda não tenha sido cadastrada.
- Persistência de sessão no `localStorage`.
- **Status**: ✅ Corrigido

### Item 11 — Saída de uniforme com "Adicionar outro item"
- Tela `RegistrarEntregaPage.jsx` reescrita com metodologia de linhas dinâmicas e botão "Adicionar outro item".
- Filtro estrito: exibe **apenas** uniformes e tamanhos com estoque positivo (`quantidade_estoque > 0`). Itens zerados não são exibidos.
- **Status**: ✅ Corrigido

### Item 12 — Bug relatórios duplicados + campo série
- Backend agrupa turmas por ID único e retorna `turma_nome`.
- Frontend `RelatoriosPage.jsx` exibe o nome exato da turma (ex: "5º A", "5º B"), eliminando duplicidades.
- Série tornada opcional e auto-extraída do nome.
- **Status**: ✅ Corrigido

### Item 13 — Relatório mais completo
- Adicionada aba com relatório individual de todas as turmas.
- Adicionado relatório mensal consolidando entradas e saídas mês a mês.
- Cards com indicadores executivos e exportação em CSV.
- **Status**: ✅ Corrigido

### Item 14 — Uniformes customizáveis
- Matriz de estoque exibe apenas uniformes existentes na escola.
- Modal para cadastrar novos tipos de uniforme com seleção de tamanhos e variações.
- Modal para excluir uniformes que não se aplicam à escola (com validação de estoque zerado).
- Constraint `chk_tipo` descartada no PostgreSQL.
- **Status**: ✅ Corrigido

### Item 15 — Aba de usuários + nome na sidebar
- Criada página `UsuariosPage.jsx` para visualização, cadastro, edição e exclusão de usuários.
- Nome do usuário conectado é exibido em todas as páginas na sidebar, logo abaixo de "Sistema de controle escolar".
- **Status**: ✅ Corrigido

### Item 16 — Modo escuro/claro
- Suporte a tema escuro implementado no `index.css` e `Layout.jsx`.
- Botão de alternância posicionado na parte inferior da barra lateral.
- Preferência persistida no `localStorage`.
- **Status**: ✅ Corrigido

---

## Não-conformidades detectadas e ajustadas

1. **`FormField` dentro do render causa perda de foco (Item 1)**:  
   👉 **Ajustado**: Extraído para fora do componente funcional em `StudentFormPage.jsx`.
2. **Relatório mostra `serie` ao invés do `nome` da turma (Item 12)**:  
   👉 **Ajustado**: Ajustado para exibir `turma_nome` em `RelatoriosPage.jsx` e `routers/relatorios.py`.
3. **Turma não tem validação de duplicidade (Item 4)**:  
   👉 **Ajustado**: Implementada verificação de unicidade por escola no backend (`routers/turmas.py`) e no frontend (`TurmasPage.jsx`).
4. **`CheckConstraint` em `ItemUniforme` impede tipos customizáveis (Item 14)**:  
   👉 **Ajustado**: Constraint descartada no PostgreSQL e no modelo SQLAlchemy.
5. **Migração do banco de dados não executada**:  
   👉 **Ajustado**: DDL executado no PostgreSQL adicionando campos de contato, removendo `situacao_uniforme` e limpando restrições antigas.
