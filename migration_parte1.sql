-- ============================================================
-- Migration: Parte 1 das correções
-- Executar no banco de dados PostgreSQL antes de iniciar o sistema
-- ============================================================

-- 1. Adicionar campos de contato dos responsáveis na tabela alunos
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS telefone_pai VARCHAR(20);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS email_pai VARCHAR(255);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS telefone_mae VARCHAR(20);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS email_mae VARCHAR(255);

-- 2. Remover coluna situacao_uniforme e sua constraint
ALTER TABLE alunos DROP CONSTRAINT IF EXISTS chk_aluno_situacao;
ALTER TABLE alunos DROP COLUMN IF EXISTS situacao_uniforme;

-- 3. Tornar série da turma nullable (agora é auto-extraída do nome)
ALTER TABLE turma ALTER COLUMN serie DROP NOT NULL;
