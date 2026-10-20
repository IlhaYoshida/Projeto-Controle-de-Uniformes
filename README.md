# Sistema de Controle de Uniformes Escolares (UNIFORME+)

Sistema completo para digitalizar e gerenciar o controle de uniformes distribuídos a escolas públicas: registrar a entrada de lotes de uniformes, cadastrar alunos com contato dos responsáveis, gerenciar turmas com sugestões inteligentes, registrar saídas para alunos com débito automático de estoque, gerenciar usuários com login seguro, alternar entre modos escuro/claro, emitir relatórios executivos mensais/por turma e auditar todas as ações em arquivo de log TXT.

Projeto acadêmico da disciplina **Prática e Desenvolvimento de Software**.

---

## Stack Tecnológica

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend** | React 19 + Vite + Tailwind CSS | Interface reativa, responsiva, com suporte nativo a Dark Mode e microanimações |
| **Backend** | Python 3.11+ FastAPI + SQLAlchemy | API RESTful rápida com documentação Swagger interativa e arquitetura modular |
| **Banco de dados** | PostgreSQL | Banco relacional robusto com integridade referencial e migrações DDL |
| **Segurança** | Bcrypt + Sessão Local | Armazenamento de senhas com hash seguro e controle de acesso |
| **Auditoria** | Logger TXT | Registro contínuo de todas as ações do sistema em arquivo texto |

---

## Como Rodar Localmente

### Pré-requisitos
- Python 3.11 ou superior
- Node.js 20 ou superior
- PostgreSQL instalado e ativo
- Git

### 1. Banco de Dados PostgreSQL

Crie o usuário e o banco de dados no PostgreSQL (caso ainda não existam):

```sql
CREATE USER uniformes_user WITH PASSWORD 'uniformes_pass';
CREATE DATABASE uniformes_db OWNER uniformes_user;
```

Execute as migrações estruturais caso utilize uma base já existente:
```bash
psql -U uniformes_user -d uniformes_db -f migration_parte1.sql
```

### 2. Backend (FastAPI)

```bash
# 1. Ative ou crie o ambiente virtual
python -m venv venv
venv\Scripts\activate       # No Windows
# source venv/bin/activate  # No Linux/Mac

# 2. Instale as dependências
pip install -r requirements.txt

# 3. Configure o arquivo de ambiente
cp .env.example .env        # Ajuste a DATABASE_URL se necessário

# 4. Inicie o servidor backend
uvicorn main:app --reload
```

A API estará rodando em `http://localhost:8000`. A documentação interativa (Swagger) pode ser acessada em `http://localhost:8000/docs`.

### 3. Frontend (React + Vite)

```bash
# 1. Instale os pacotes npm
npm install

# 2. Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação web estará disponível em `http://localhost:5173`.

---

## Como Fazer o Primeiro Login

Ao acessar o sistema pela primeira vez em `http://localhost:5173`, a tela de login obrigatório será exibida. Você possui duas formas simples de entrar:

### Opção A: Utilizar as credenciais padrão já criadas no banco
O sistema já possui um usuário administrador inicial configurado:
- **E-mail de acesso**: `admin@escola.gov.br`
- **Senha de acesso**: `admin123`

Basta digitar essas credenciais e clicar em **"Entrar no sistema"**.

### Opção B: Configurar sua própria escola e criar um novo administrador
Caso prefira configurar os dados da sua escola e registrar seu próprio usuário administrador desde o início:
1. Na tela de login, clique no link **"Primeiro acesso ou deseja criar outro administrador? Clique aqui"**.
2. Preencha o nome da sua escola (e opcionalmente o diretor e endereço).
3. Preencha o seu nome completo, seu e-mail e uma senha (mínimo 6 caracteres).
4. Clique em **"Finalizar configuração e entrar"**. O sistema salvará as credenciais no banco e fará o seu login imediato.

---

## Estrutura do Projeto

```
├── main.py                   # Inicialização da API FastAPI e registro dos 10 routers
├── database.py               # Conexão com PostgreSQL via SQLAlchemy
├── models.py                 # Definição das entidades e tabelas ORM
├── schemas.py                # Contratos de validação e serializers Pydantic
├── logger.py                 # Módulo de auditoria que grava eventos em sistema_logs.txt
├── migration_parte1.sql      # Script DDL de migração do banco de dados
├── lista_bugs_prioridade.md  # Relatório técnico com bugs categorizados por prioridade
├── plano_correcoes.md        # Documento com status de resolução das correções
├── routers/                  # Módulos de regras de negócio da API
│   ├── auth.py               # Autenticação, login e assistente de setup inicial
│   ├── escolas.py            # Gestão da escola única
│   ├── turmas.py             # CRUD de turmas, sugestões inteligentes e gráficos
│   ├── usuarios.py           # Gestão de usuários do sistema
│   ├── alunos.py             # CRUD de alunos com validações e contatos dos pais
│   ├── entradas.py           # Entrada de lotes de uniformes
│   ├── entregas.py           # Saídas de uniformes e histórico por aluno
│   ├── estoque.py            # Painel de estoque e uniformes customizáveis
│   ├── relatorios.py         # Relatórios individuais por turma e visão mensal
│   └── logs.py               # Consulta e download de sistema_logs.txt
├── src/                      # Código-fonte do frontend React
│   ├── App.jsx               # Gerenciador global de rotas, auth e tema escuro
│   ├── main.jsx              # Ponto de entrada do cliente Vite
│   ├── api.js                # Cliente de integração HTTP com a API
│   ├── data.js               # Utilitários, formatações e dados offline
│   ├── index.css             # Design system e tokens para modo escuro/claro
│   ├── components/           # Componentes de interface reutilizáveis
│   │   ├── Layout.jsx        # Sidebar com usuário conectado e alternador de tema
│   │   ├── UI.jsx            # Botões, Cards, Inputs com validação e Badges
│   │   └── ImportModal.jsx   # Modal para importação em lote
│   └── pages/                # Telas do sistema
│       ├── LoginPage.jsx            # Tela de login e assistente de setup inicial
│       ├── DashboardPage.jsx        # Visão geral de indicadores e estoque
│       ├── StudentsPage.jsx         # Consulta e listagem de alunos
│       ├── StudentFormPage.jsx      # Cadastro/edição de aluno (foco corrigido)
│       ├── StudentDetailsPage.jsx   # Detalhes, contato dos pais e histórico
│       ├── TurmasPage.jsx           # Gestão de turmas, sugestões e gráficos
│       ├── UniformesPage.jsx        # Matriz de estoque, lotes e peças customizadas
│       ├── EstoqueEntradaPage.jsx   # Registro de entrada de lotes
│       ├── RegistrarEntregaPage.jsx # Registro de saída com "Adicionar outro item"
│       ├── RelatoriosPage.jsx       # Relatório executivo por turma e mensal
│       ├── UsuariosPage.jsx         # Gestão de usuários da secretaria
│       └── LogsPage.jsx             # Visualização e download de logs TXT
```

---

## Endpoints Principais da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/login` | Autentica o usuário com e-mail e senha via bcrypt |
| `GET` | `/auth/status-inicial` | Informa se o sistema necessita de configuração inicial |
| `POST` | `/auth/setup-inicial` | Registra a escola única e o primeiro usuário administrador |
| `GET` | `/alunos` | Lista alunos com filtros (`?nome=`, `?turma_id=`) |
| `POST/PUT/DELETE` | `/alunos` | CRUD de alunos com contatos dos pais (sem campo manual de situação) |
| `GET` | `/turmas` | Lista turmas cadastradas com validação de duplicidade |
| `POST/PUT/DELETE` | `/turmas` | CRUD de turmas escolares (série extraída automaticamente) |
| `GET` | `/turmas/{id}/estatisticas` | Estatísticas de entrega e tamanhos para os gráficos da turma |
| `POST` | `/entradas` | Registra a chegada de lotes de uniformes |
| `POST` | `/entregas` | Registra a saída de peças para alunos (debita estoque) |
| `GET` | `/estoque` | Painel de estoque por tipo e tamanho (apenas peças da escola) |
| `POST/DELETE` | `/estoque/item` | Cadastra novos tipos customizados ou remove peças não usadas |
| `GET` | `/relatorios/completo` | Relatório completo com dados individuais por turma e fluxo mensal |
| `GET` | `/relatorios/entregas-por-turma/csv` | Exporta relatório de prestação de contas em CSV |
| `GET/POST/PUT/DELETE` | `/usuarios` | CRUD completo de usuários do sistema |
| `GET` | `/logs` | Retorna as últimas linhas do arquivo `sistema_logs.txt` |
| `GET` | `/logs/download` | Realiza o download direto do arquivo TXT de logs |

---

## Telas do Sistema (Frontend)

1. **Login & Configuração Inicial** (`/`):
   Autenticação obrigatória com credenciais criptografadas e assistente para primeiro acesso da escola.
2. **Dashboard** (`/dashboard`):
   Indicadores executivos, total de alunos beneficiados, peças distribuídas, gráfico mensal de entregas e matriz de estoque.
3. **Alunos** (`/alunos`):
   Pesquisa e filtros rápidos, formulário com validação contínua (sem perda de foco), contatos do pai e da mãe e histórico de saídas.
4. **Turmas** (`/turmas`):
   CRUD de classes com motor de **sugestões inteligentes**, gráficos interativos de entregas (realizadas vs pendentes) e distribuição de tamanhos de uniformes por turma.
5. **Uniformes** (`/uniformes`):
   Matriz com apenas uniformes existentes na escola, histórico de entradas de lotes, histórico de saídas e modais para criar novas peças ou remover peças não aplicáveis.
6. **Entrada de Estoque** (`/uniformes/entrada`):
   Registro de notas fiscais e lotes com múltiplos itens.
7. **Registrar Saída** (`/uniformes/entrega`):
   Metodologia de "Adicionar outro item", exibindo **estritamente uniformes com saldo positivo em estoque**.
8. **Relatórios** (`/relatorios`):
   Visão consolidada por turma com nomes corretos, relatório mensal de fluxo líquido e exportação em CSV.
9. **Usuários** (`/usuarios`):
   Gestão de credenciais da secretaria e identificação fixa do usuário conectado na barra lateral.
10. **Logs do Sistema** (`/logs`):
    Auditoria em tempo real de visualizações, edições e exclusões gravadas no arquivo texto com download de `sistema_logs.txt`.
11. **Modo Escuro / Claro**:
    Botão localizado na base da barra lateral com persistência da preferência do usuário.

---

## Regras de Negócio e Auditoria

- **Estoque Positivo Obrigatório na Saída**: Peças zeradas ou inexistentes não são exibidas na tela de saída e o backend valida se `quantidade_entregue <= quantidade_estoque`.
- **Validação de Matrícula e Turma Única**: Não é permitida duplicidade de matrículas de alunos nem repetição de nomes de turma na mesma escola.
- **Validação de Dados no Frontend**: Nomes não aceitam números; datas de nascimento futuras são bloqueadas; e-mails e telefones são formatados e validados.
- **Escola Única**: O sistema opera em modelo de escola única definida na configuração inicial, eliminando seletores redundantes no cadastro de alunos.
- **Auditoria Contínua**: Toda operação relevante é gravada com carimbo de data/hora, usuário responsável e detalhes no arquivo `logs/sistema_logs.txt`.
