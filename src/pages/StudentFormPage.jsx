import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../App';
import { getTurmas } from '../api';
import { TAMANHOS_UNIFORME } from '../data';
import { Back, Button, Card, Field, Header, Select } from '../components/UI';

const emptyForm = {
  nome: '',
  matricula: '',
  data_nascimento: '',
  turma_id: '',
  nome_pai: '',
  telefone_pai: '',
  email_pai: '',
  nome_mae: '',
  telefone_mae: '',
  email_mae: '',
  tamanho_camiseta: '',
};

// FormField definido FORA do componente principal para evitar recriação e perda de foco ao digitar
function FormField({ label, value, onChange, error, ...props }) {
  return (
    <div>
      <Field
        label={label}
        value={value || ''}
        onChange={onChange}
        placeholder={`Digite ${label.toLowerCase()}`}
        error={error}
        {...props}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-7">
      <h2 className="mb-3 text-[10px] font-bold text-[#2563eb] dark:text-blue-400">{title}</h2>
      {children}
    </div>
  );
}

export default function StudentFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { students, addStudent, updateStudent, escolaId } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [turmas, setTurmas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [erroGeral, setErroGeral] = useState('');

  const alunoAtual = editing ? students.find(s => String(s.id) === id) : null;

  useEffect(() => {
    getTurmas().then(setTurmas).catch(() => setTurmas([]));
  }, []);

  useEffect(() => {
    if (editing && alunoAtual) {
      setForm({
        nome: alunoAtual.nome || '',
        matricula: alunoAtual.matricula || '',
        data_nascimento: alunoAtual.data_nascimento ? String(alunoAtual.data_nascimento).slice(0, 10) : '',
        turma_id: alunoAtual.turma_id ?? '',
        nome_pai: alunoAtual.nome_pai || '',
        telefone_pai: alunoAtual.telefone_pai || '',
        email_pai: alunoAtual.email_pai || '',
        nome_mae: alunoAtual.nome_mae || '',
        telefone_mae: alunoAtual.telefone_mae || '',
        email_mae: alunoAtual.email_mae || '',
        tamanho_camiseta: alunoAtual.tamanho_camiseta || '',
      });
    }
  }, [editing, alunoAtual]);

  // Validação em tempo real ao alterar valores
  const change = (campo, valor) => {
    setForm(f => ({ ...f, [campo]: valor }));

    // Limpa erro do campo alterado
    setErrors(e => ({ ...e, [campo]: '' }));
  };

  const hoje = new Date().toISOString().slice(0, 10);

  const validar = () => {
    const next = {};

    // 1. Nome completo (obrigatório, sem números)
    if (!form.nome.trim()) {
      next.nome = 'O nome completo é obrigatório';
    } else if (/\d/.test(form.nome)) {
      next.nome = 'O nome não pode conter números';
    } else if (form.nome.trim().length < 3) {
      next.nome = 'Digite o nome completo (mínimo 3 caracteres)';
    }

    // 2. Matrícula (obrigatória, somente números, sem repetição)
    if (!form.matricula.trim()) {
      next.matricula = 'A matrícula é obrigatória';
    } else if (!/^\d+$/.test(form.matricula.trim())) {
      next.matricula = 'A matrícula deve conter apenas números';
    } else {
      // Verifica duplicação de matrícula no frontend
      const matriculaDuplicada = students.some(
        s => String(s.matricula).trim() === form.matricula.trim() && (!editing || String(s.id) !== id)
      );
      if (matriculaDuplicada) {
        next.matricula = 'Esta matrícula já está cadastrada para outro aluno';
      }
    }

    // 3. Data de nascimento (não permitir data futura)
    if (form.data_nascimento) {
      if (form.data_nascimento > hoje) {
        next.data_nascimento = 'A data de nascimento não pode ser no futuro';
      }
    }

    // 4. Turma (obrigatória)
    if (!form.turma_id) {
      next.turma_id = 'Selecione a turma do aluno';
    }

    // 5. Nome do pai (sem números)
    if (form.nome_pai && /\d/.test(form.nome_pai)) {
      next.nome_pai = 'O nome do pai não pode conter números';
    }

    // 6. Nome da mãe (sem números)
    if (form.nome_mae && /\d/.test(form.nome_mae)) {
      next.nome_mae = 'O nome da mãe não pode conter números';
    }

    // 7. Emails válidos
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email_pai && !emailRegex.test(form.email_pai.trim())) {
      next.email_pai = 'Digite um e-mail válido para o pai';
    }
    if (form.email_mae && !emailRegex.test(form.email_mae.trim())) {
      next.email_mae = 'Digite um e-mail válido para a mãe';
    }

    // 8. Telefones (apenas números e caracteres de formatação válidos)
    const phoneDigits = tel => tel.replace(/\D/g, '');
    if (form.telefone_pai && (phoneDigits(form.telefone_pai).length < 10 || phoneDigits(form.telefone_pai).length > 11)) {
      next.telefone_pai = 'Telefone deve ter 10 ou 11 dígitos com DDD';
    }
    if (form.telefone_mae && (phoneDigits(form.telefone_mae).length < 10 || phoneDigits(form.telefone_mae).length > 11)) {
      next.telefone_mae = 'Telefone deve ter 10 ou 11 dígitos com DDD';
    }

    return next;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErroGeral('');

    const validationErrors = validar();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setErroGeral('Por favor, corrija os campos indicados antes de continuar.');
      return;
    }

    const payload = {
      escola_id: escolaId || 1, // Única escola cadastrada no sistema
      turma_id: Number(form.turma_id),
      nome: form.nome.trim(),
      matricula: form.matricula.trim(),
      data_nascimento: form.data_nascimento || null,
      nome_pai: form.nome_pai.trim() || null,
      telefone_pai: form.telefone_pai.trim() || null,
      email_pai: form.email_pai.trim() || null,
      nome_mae: form.nome_mae.trim() || null,
      telefone_mae: form.telefone_mae.trim() || null,
      email_mae: form.email_mae.trim() || null,
      tamanho_camiseta: form.tamanho_camiseta || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateStudent(id, payload);
      } else {
        await addStudent(payload);
      }
      navigate('/alunos');
    } catch (err) {
      setErroGeral(err.message || 'Não foi possível salvar o aluno.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter">
      <Header
        title={editing ? 'Editar aluno' : 'Adicionar aluno'}
        subtitle={editing ? 'Atualize os dados cadastrais do aluno.' : 'Cadastre manualmente um novo aluno no sistema.'}
      />
      <Back />
      <form onSubmit={submit}>
        <Card className="p-6 sm:p-8">
          {erroGeral && (
            <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {erroGeral}
            </p>
          )}

          <Section title="DADOS DO ALUNO">
            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Nome completo"
                required
                value={form.nome}
                onChange={e => change('nome', e.target.value)}
                error={errors.nome}
              />
              <FormField
                label="Matrícula (somente números)"
                required
                value={form.matricula}
                onChange={e => change('matricula', e.target.value.replace(/\D/g, ''))}
                error={errors.matricula}
              />
              <FormField
                label="Data de nascimento"
                type="date"
                max={hoje}
                value={form.data_nascimento}
                onChange={e => change('data_nascimento', e.target.value)}
                error={errors.data_nascimento}
              />
              <div>
                <Select
                  label="Turma"
                  required
                  value={form.turma_id}
                  onChange={e => change('turma_id', e.target.value)}
                  error={errors.turma_id}
                >
                  <option value="">Selecione a turma</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </Select>
                {!turmas.length && (
                  <p className="mt-1 text-xs text-slate-400">
                    Nenhuma turma cadastrada. Acesse a aba "Turmas" para cadastrar.
                  </p>
                )}
              </div>
            </div>
          </Section>

          <Section title="DADOS DOS RESPONSÁVEIS (PAI E MÃE)">
            <div className="grid gap-5 md:grid-cols-3">
              <FormField
                label="Nome do pai"
                value={form.nome_pai}
                onChange={e => change('nome_pai', e.target.value)}
                error={errors.nome_pai}
              />
              <FormField
                label="Telefone do pai"
                placeholder="(00) 00000-0000"
                value={form.telefone_pai}
                onChange={e => change('telefone_pai', e.target.value)}
                error={errors.telefone_pai}
              />
              <FormField
                label="E-mail do pai"
                type="email"
                placeholder="pai@exemplo.com"
                value={form.email_pai}
                onChange={e => change('email_pai', e.target.value)}
                error={errors.email_pai}
              />

              <FormField
                label="Nome da mãe"
                value={form.nome_mae}
                onChange={e => change('nome_mae', e.target.value)}
                error={errors.nome_mae}
              />
              <FormField
                label="Telefone da mãe"
                placeholder="(00) 00000-0000"
                value={form.telefone_mae}
                onChange={e => change('telefone_mae', e.target.value)}
                error={errors.telefone_mae}
              />
              <FormField
                label="E-mail da mãe"
                type="email"
                placeholder="mae@exemplo.com"
                value={form.email_mae}
                onChange={e => change('email_mae', e.target.value)}
                error={errors.email_mae}
              />
            </div>
          </Section>

          <Section title="UNIFORME ESCOLAR">
            <div className="grid gap-5 md:grid-cols-2">
              <Select
                label="Tamanho da camiseta"
                value={form.tamanho_camiseta}
                onChange={e => change('tamanho_camiseta', e.target.value)}
              >
                <option value="">Selecione o tamanho</option>
                {TAMANHOS_UNIFORME.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              O status de entrega do uniforme é calculado automaticamente com base nas saídas registradas.
            </p>
          </Section>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-7 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => navigate('/alunos')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar aluno'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
