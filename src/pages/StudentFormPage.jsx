import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { getTurmas, getEstoque } from '../api';
import { TAMANHOS_UNIFORME, dateBR } from '../data';
import { Back, Button, Card, Field, Header, Select, ReviewModal } from '../components/UI';

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
  tamanhos_uniforme: {},
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
  const [searchParams] = useSearchParams();
  const turmaIdParam = searchParams.get('turma_id');
  const origemParam = searchParams.get('origem');

  const editing = Boolean(id);
  const { students, addStudent, updateStudent, escolaId } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [turmas, setTurmas] = useState([]);
  const [tiposUniforme, setTiposUniforme] = useState(['Camiseta', 'Bermuda', 'Calça']);
  const [saving, setSaving] = useState(false);
  const [erroGeral, setErroGeral] = useState('');
  const [modalRevisao, setModalRevisao] = useState(false);

  const alunoAtual = editing ? students.find(s => String(s.id) === id) : null;

  useEffect(() => {
    getTurmas().then(setTurmas).catch(() => setTurmas([]));
    getEstoque()
      .then(itens => {
        const tipos = [...new Set(itens.map(i => i.tipo))];
        if (tipos.length) setTiposUniforme(tipos);
      })
      .catch(() => {});
  }, []);

  // Se veio da aba Turmas (Item 17), pré-seleciona a turma
  useEffect(() => {
    if (!editing && turmaIdParam) {
      setForm(f => ({ ...f, turma_id: turmaIdParam }));
    }
  }, [editing, turmaIdParam]);

  useEffect(() => {
    if (editing && alunoAtual) {
      const tamanhosMap = { ...(alunoAtual.tamanhos_uniforme || {}) };
      if (alunoAtual.tamanho_camiseta && !tamanhosMap.Camiseta) {
        tamanhosMap.Camiseta = alunoAtual.tamanho_camiseta;
      }

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
        tamanhos_uniforme: tamanhosMap,
      });
    }
  }, [editing, alunoAtual]);

  // Validação em tempo real ao alterar valores
  const change = (campo, valor) => {
    setForm(f => ({ ...f, [campo]: valor }));
    setErrors(e => ({ ...e, [campo]: '' }));
  };

  const changeTamanhoUniforme = (tipo, tamanho) => {
    setForm(f => {
      const novoMap = { ...f.tamanhos_uniforme, [tipo]: tamanho };
      return {
        ...f,
        tamanhos_uniforme: novoMap,
        tamanho_camiseta: tipo === 'Camiseta' ? tamanho : f.tamanho_camiseta,
      };
    });
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
      const matriculaDuplicada = students.some(
        s => String(s.matricula).trim() === form.matricula.trim() && (!editing || String(s.id) !== id)
      );
      if (matriculaDuplicada) {
        next.matricula = 'Esta matrícula já está cadastrada para outro aluno';
      }
    }

    // 3. Data de nascimento (obrigatória - Item 6; não pode ser futura)
    if (!form.data_nascimento) {
      next.data_nascimento = 'A data de nascimento é obrigatória';
    } else if (form.data_nascimento > hoje) {
      next.data_nascimento = 'A data de nascimento não pode ser no futuro';
    }

    // 4. Turma (obrigatória)
    if (!form.turma_id) {
      next.turma_id = 'Selecione a turma do aluno';
    }

    // 5. Nome do pai (obrigatório - Item 6, sem números)
    if (!form.nome_pai.trim()) {
      next.nome_pai = 'O nome do pai é obrigatório';
    } else if (/\d/.test(form.nome_pai)) {
      next.nome_pai = 'O nome do pai não pode conter números';
    } else if (form.nome_pai.trim().length < 3) {
      next.nome_pai = 'Digite o nome completo do pai';
    }

    // 6. Nome da mãe (obrigatório - Item 6, sem números)
    if (!form.nome_mae.trim()) {
      next.nome_mae = 'O nome da mãe é obrigatório';
    } else if (/\d/.test(form.nome_mae)) {
      next.nome_mae = 'O nome da mãe não pode conter números';
    } else if (form.nome_mae.trim().length < 3) {
      next.nome_mae = 'Digite o nome completo da mãe';
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

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setErroGeral('');

    const validationErrors = validar();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setErroGeral('Por favor, preencha todos os campos obrigatórios corretamente antes de revisar.');
      return;
    }

    // Abre a guia de revisão centralizada (Item 7)
    setModalRevisao(true);
  };

  const confirmarESalvar = async () => {
    setSaving(true);
    setErroGeral('');

    const payload = {
      escola_id: escolaId || 1,
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
      tamanho_camiseta: form.tamanhos_uniforme?.Camiseta || form.tamanho_camiseta || null,
      tamanhos_uniforme: form.tamanhos_uniforme || {},
    };

    try {
      if (editing) {
        await updateStudent(id, payload);
      } else {
        await addStudent(payload);
      }
      setModalRevisao(false);

      // Se veio da tela de turmas (Item 17), retorna para a turma que estava visualizando
      if (origemParam === 'turmas') {
        navigate(`/turmas?turma_id=${form.turma_id}`);
      } else {
        navigate('/alunos');
      }
    } catch (err) {
      setErroGeral(err.message || 'Não foi possível salvar o aluno.');
      setModalRevisao(false);
    } finally {
      setSaving(false);
    }
  };

  const turmaNomeSelecionada = turmas.find(t => String(t.id) === String(form.turma_id))?.nome || '—';

  return (
    <div className="page-enter">
      <Header
        title={editing ? 'Editar aluno' : 'Adicionar aluno'}
        subtitle={editing ? 'Atualize os dados cadastrais do aluno.' : 'Cadastre manualmente um novo aluno no sistema.'}
      />
      <Back />
      <form onSubmit={handlePreSubmit}>
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
                required
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
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              O nome do pai e o nome da mãe são obrigatórios para a identificação do aluno.
            </p>
            <div className="grid gap-5 md:grid-cols-3">
              <FormField
                label="Nome do pai"
                required
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
                required
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

          <Section title="TAMANHOS DE UNIFORME DO ALUNO">
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Selecione o tamanho do aluno para todos os itens de uniforme cadastrados na escola:
            </p>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
              {tiposUniforme.map(tipo => (
                <Select
                  key={tipo}
                  label={`Tamanho: ${tipo}`}
                  value={form.tamanhos_uniforme?.[tipo] || ''}
                  onChange={e => changeTamanhoUniforme(tipo, e.target.value)}
                >
                  <option value="">Selecione o tamanho</option>
                  {TAMANHOS_UNIFORME.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              O status de entrega do uniforme é calculado automaticamente com base nas saídas registradas.
            </p>
          </Section>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-7 dark:border-slate-800">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                if (origemParam === 'turmas' && form.turma_id) {
                  navigate(`/turmas?turma_id=${form.turma_id}`);
                } else {
                  navigate('/alunos');
                }
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {editing ? 'Revisar e salvar' : 'Revisar e cadastrar'}
            </Button>
          </div>
        </Card>
      </form>

      {/* GUIA CENTRAL DE REVISÃO ANTES DE CONFIRMAR (Item 7) */}
      <ReviewModal
        isOpen={modalRevisao}
        title={editing ? "Revisar Alterações do Aluno" : "Revisar Dados do Novo Aluno"}
        subtitle="Confira atentamente os dados preenchidos antes de confirmar a gravação no sistema:"
        confirmText={editing ? "Confirmar e Atualizar" : "Confirmar e Cadastrar"}
        cancelText="Voltar e Corrigir"
        loading={saving}
        onConfirm={confirmarESalvar}
        onClose={() => setModalRevisao(false)}
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
            <h4 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px] mb-2">
              Dados do Aluno
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
              <div><b>Nome:</b> {form.nome}</div>
              <div><b>Matrícula:</b> {form.matricula}</div>
              <div><b>Turma:</b> {turmaNomeSelecionada}</div>
              <div><b>Nascimento:</b> {form.data_nascimento ? dateBR(form.data_nascimento) : '—'}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
            <h4 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px] mb-2">
              Responsáveis
            </h4>
            <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
              <div>
                <b>Pai:</b> {form.nome_pai}
                <div className="text-[11px] text-slate-500">Tel: {form.telefone_pai || '—'}</div>
                <div className="text-[11px] text-slate-500">Email: {form.email_pai || '—'}</div>
              </div>
              <div>
                <b>Mãe:</b> {form.nome_mae}
                <div className="text-[11px] text-slate-500">Tel: {form.telefone_mae || '—'}</div>
                <div className="text-[11px] text-slate-500">Email: {form.email_mae || '—'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
            <h4 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px] mb-2">
              Tamanhos de Uniforme
            </h4>
            <div className="flex flex-wrap gap-2">
              {tiposUniforme.map(tipo => {
                const tam = form.tamanhos_uniforme?.[tipo];
                return (
                  <span
                    key={tipo}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span>{tipo}:</span>
                    <b className={tam ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                      {tam || 'Não informado'}
                    </b>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </ReviewModal>
    </div>
  );
}
