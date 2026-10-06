# Sistema de Controle de Uniformes Escolares

Sistema para digitalizar o controle de uniformes distribuídos pelo governo a escolas
públicas: registrar a entrada de lotes de uniformes, cadastrar alunos, registrar as
entregas de peças e acompanhar o estoque e relatórios.

Projeto acadêmico da disciplina **Prática e Desenvolvimento de Software**.

## Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Frontend | React + Vite + Tailwind | Ferramentas familiares ao time |
| Backend | Python + FastAPI | Documentação automática (Swagger) facilita testar a API sem depender do front |
| Banco de dados | PostgreSQL | Gratuito, open-source e robusto |
| Hospedagem backend + banco | Render | Deploy direto do GitHub, backend e banco no mesmo ambiente |
| Hospedagem frontend | Vercel | Gratuito e amplamente usado |

## Como rodar localmente

Pré-requisitos: Python 3.11+, Node 20+, PostgreSQL, Git.

### 1. Banco de dados

```sql
CREATE USER uniformes_user WITH PASSWORD 'uniformes_pass';
CREATE DATABASE uniformes_db OWNER uniformes_user;
```

### 2. Backend

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # ajuste DATABASE_URL se necessário
uvicorn main:app --reload
```

A API sobe em `http://localhost:8000`. A documentação interativa (Swagger) fica em
`http://localhost:8000/docs` — dá para testar todos os endpoints por ali.

### 3. Frontend

```bash
npm install
npm run dev
```

Sobe em `http://localhost:5173`. **Importante:** `src/api.js` aponta por padrão para a API
publicada no Render. Para testar contra o backend local, troque `API_URL` para
`http://localhost:8000` temporariamente (não commitar essa mudança).

## Estrutura do projeto

```
main.py              # cria a app FastAPI e registra as rotas
database.py          # conexão com o Postgres (SQLAlchemy)
models.py            # tabelas (SQLAlchemy ORM)
schemas.py           # formatos de entrada/saída da API (Pydantic)
routers/             # um arquivo por área de negócio
  escolas.py
  turmas.py
  usuarios.py
  alunos.py          # CRUD de alunos + busca
  entradas.py        # entrada de lote de uniformes (estoque) + histórico
  entregas.py        # entrega de uniforme a um aluno (debita estoque) + histórico
  estoque.py         # painel de estoque + alertas de saldo baixo
  relatorios.py      # relatório de entregas por turma (JSON e CSV) + dashboard
src/                 # frontend React
  pages/             # uma página por rota (Dashboard, Alunos, Uniformes com abas
                      # Estoque/Entradas/Entregas, Registrar entrada, Registrar
                      # entrega, Relatórios)
  components/        # componentes de UI reutilizáveis
  api.js             # todas as chamadas HTTP para o backend
docs/erd.md          # diagrama do banco de dados (Mermaid) + decisões de modelagem
```

## Endpoints principais

| Método | Rota | O que faz |
|---|---|---|
| GET | `/alunos` | Lista alunos (filtros `?nome=` e `?turma_id=`) |
| POST/PUT/DELETE | `/alunos` | CRUD de alunos (inclui `tamanho_camiseta`/`situacao_uniforme`) |
| POST | `/entradas` | Registra a chegada de um lote de uniformes (soma estoque) |
| GET | `/entradas` | Histórico de lotes recebidos (filtros `?q=`, `?escola_id=`, `?ano=`) |
| POST | `/entregas` | Registra a entrega de uniforme a um aluno (debita estoque) |
| GET | `/entregas` | Histórico global de entregas (filtros `?aluno=`, `?turma_id=`, `?ano=`) |
| GET | `/entregas/aluno/{id}` | Histórico de entregas de um aluno específico |
| GET | `/estoque` | Painel de estoque por tipo/tamanho, com alerta de saldo baixo |
| GET | `/relatorios/entregas-por-turma` | Relatório agregado (também disponível em `/csv`) |
| GET | `/relatorios/dashboard` | Indicadores gerais + gráfico mensal + ranking (tela Dashboard) |

A lista completa, com os formatos exatos de entrada e saída, está sempre em `/docs`.

## Telas (frontend)

- **Dashboard** (`/dashboard`): cards gerais, gráfico de barras de uniformes recebidos no
  ano, gráfico de rosca de % de alunos com uniforme, ranking de quem recebeu mais de uma
  peça e a tabela pivô de estoque.
- **Alunos** (`/alunos`): lista com filtros, cadastro/edição (com `Tamanho da camiseta` e
  `Situação do uniforme` editáveis) e detalhes do aluno.
- **Uniformes** (`/uniformes`): três abas — **Estoque** (cards + tabela pivô por
  tipo × tamanho), **Entradas** (histórico de lotes) e **Entregas** (histórico global).
  As ações "Registrar entrada" e "Registrar entrega" abrem páginas próprias.
- **Relatórios** (`/relatorios`): relatório de entregas por turma, com exportação CSV.

## Design system

As cores e medidas seguem o handoff de design (`Primary #2563EB`, `Text #0F172A`,
`Muted #64748B`, `Border #E2E8F0`, `Success #059669`, `Warning #B45309`,
`Danger #DC2626`, `Background #F6F8FB`) — que por coincidência batem quase exatamente
com a paleta padrão `slate`/`blue` do Tailwind já usada no projeto.

## Decisões de modelagem

Ver [`docs/erd.md`](docs/erd.md) — inclui o motivo de `tamanho_camiseta` e
`situacao_uniforme` serem colunas editáveis em `alunos`, mas sincronizadas
automaticamente a cada entrega, e por que `turma` tem um campo `nome` além de `serie`.

## Regras de negócio implementadas

- Não é possível registrar uma entrega maior do que o estoque disponível.
- Alerta automático quando o estoque de um tipo/tamanho fica abaixo de 10 peças
  (`schemas.LIMITE_SALDO_BAIXO`).
- Toda entrega registrada marca o aluno como "Recebido" e atualiza o tamanho de camiseta
  cadastrado automaticamente — mas os dois campos também podem ser ajustados manualmente
  no formulário do aluno.
- Senha de usuário nunca é salva nem retornada em texto puro (hash bcrypt).
- Busca de aluno (e de aluno no histórico de entregas) ignora acentos e maiúsculas/minúsculas.

## Limitações conhecidas / próximos passos

- Sem autenticação/login ainda — qualquer usuário cadastrado pode ser selecionado como
  "responsável" em qualquer ação.
- Importação de alunos: o campo de upload aceita CSV, JSON, Excel e PDF na interface (para
  já bater com o design), mas por enquanto só CSV e JSON são processados de verdade —
  Excel/PDF mostram um aviso claro em vez de falhar silenciosamente. Além disso a escola e
  a turma já precisam existir previamente no sistema (o arquivo referencia pelo nome ou
  pelo id).
- Exportação de relatório hoje é só CSV (a Sprint 4 permite CSV ou PDF).
