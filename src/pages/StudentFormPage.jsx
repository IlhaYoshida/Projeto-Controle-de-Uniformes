import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../App';
import { getEscolas, getTurmas } from '../api';
import { TAMANHOS_UNIFORME } from '../data';
import { Back, Button, Card, Field, Header, Select } from '../components/UI';

const empty = { nome: '', matricula: '', data_nascimento: '', escola_id: '', turma_id: '', nome_pai: '', nome_mae: '', tamanho_camiseta: '', situacao_uniforme: 'Pendente' };

export default function StudentFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { students, addStudent, updateStudent } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [escolas, setEscolas] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [erroGeral, setErroGeral] = useState('');
  const alunoAtual = editing ? students.find(s => String(s.id) === id) : null;

  useEffect(() => {
    getEscolas().then(setEscolas).catch(() => setEscolas([]));
    getTurmas().then(setTurmas).catch(() => setTurmas([]));
  }, []);

  useEffect(() => {
    if (editing && alunoAtual) {
      setForm({
        nome: alunoAtual.nome || '',
        matricula: alunoAtual.matricula || '',
        data_nascimento: alunoAtual.data_nascimento ? String(alunoAtual.data_nascimento).slice(0, 10) : '',
        escola_id: alunoAtual.escola_id ?? '',
        turma_id: alunoAtual.turma_id ?? '',
        nome_pai: alunoAtual.nome_pai || '',
        nome_mae: alunoAtual.nome_mae || '',
        tamanho_camiseta: alunoAtual.tamanho_camiseta || '',
        situacao_uniforme: alunoAtual.situacao_uniforme || 'Pendente',
      });
    }
  }, [editing, alunoAtual]);

  // Se só existe uma escola cadastrada, seleciona ela automaticamente (caso comum)
  useEffect(() => {
    if (!editing && escolas.length === 1 && !form.escola_id) {
      setForm(f => ({ ...f, escola_id: escolas[0].id }));
    }
  }, [escolas, editing, form.escola_id]);

  const change = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const submit = async (e) => {
    e.preventDefault();
    setErroGeral('');
    const next = {};
    ['nome', 'matricula', 'escola_id', 'turma_id'].forEach(k => { if (!form[k]) next[k] = 'Campo obrigatório'; });
    if (Object.keys(next).length) return setErrors(next);

    const payload = {
      nome: form.nome,
      matricula: form.matricula,
      data_nascimento: form.data_nascimento || null,
      nome_pai: form.nome_pai || null,
      nome_mae: form.nome_mae || null,
      escola_id: Number(form.escola_id),
      turma_id: Number(form.turma_id),
      tamanho_camiseta: form.tamanho_camiseta || null,
      situacao_uniforme: form.situacao_uniforme || 'Pendente',
    };

    setSaving(true);
    try {
      if (editing) await updateStudent(id, payload);
      else await addStudent(payload);
      navigate('/alunos');
    } catch (err) {
      setErroGeral(err.message || 'Não foi possível salvar o aluno.');
    } finally {
      setSaving(false);
    }
  };

  const turmasDaEscola = form.escola_id ? turmas.filter(t => String(t.escola_id) === String(form.escola_id)) : turmas;

  return <div className="page-enter">
    <Header title={editing ? 'Editar aluno' : 'Adicionar aluno'} subtitle={editing ? 'Atualize os dados cadastrais do aluno.' : 'Cadastre manualmente um novo aluno no sistema.'} />
    <Back />
    <form onSubmit={submit}>
      <Card className="p-6 sm:p-8">
        {erroGeral && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erroGeral}</p>}

        <Section title="DADOS DO ALUNO">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField field="nome" label="Nome completo" required />
            <FormField field="matricula" label="Matrícula" required />
            <FormField field="data_nascimento" label="Data de nascimento" type="date" />
          </div>
        </Section>

        <Section title="VÍNCULO ESCOLAR">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Select label="Escola" required value={form.escola_id} onChange={e => change('escola_id', e.target.value)}>
                <option value="">Selecione</option>
                {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </Select>
              {errors.escola_id && <p className="mt-1 text-xs text-red-600">{errors.escola_id}</p>}
              {!escolas.length && <p className="mt-1 text-xs text-slate-400">Nenhuma escola cadastrada ainda.</p>}
            </div>
            <div>
              <Select label="Turma" required value={form.turma_id} onChange={e => change('turma_id', e.target.value)}>
                <option value="">Selecione</option>
                {turmasDaEscola.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Select>
              {errors.turma_id && <p className="mt-1 text-xs text-red-600">{errors.turma_id}</p>}
              {!turmasDaEscola.length && <p className="mt-1 text-xs text-slate-400">Nenhuma turma cadastrada para essa escola ainda.</p>}
            </div>
          </div>
        </Section>

        <Section title="RESPONSÁVEIS">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField field="nome_pai" label="Nome do pai" />
            <FormField field="nome_mae" label="Nome da mãe" />
          </div>
        </Section>

        <Section title="UNIFORME">
          <div className="grid gap-5 md:grid-cols-2">
            <Select label="Tamanho da camiseta" value={form.tamanho_camiseta} onChange={e => change('tamanho_camiseta', e.target.value)}>
              <option value="">Selecione o tamanho</option>
              {TAMANHOS_UNIFORME.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="Situação do uniforme" value={form.situacao_uniforme} onChange={e => change('situacao_uniforme', e.target.value)}>
              <option value="Pendente">Pendente</option>
              <option value="Recebido">Recebido</option>
            </Select>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Campos previstos pelas histórias da Sprint para filtro e acompanhamento. São atualizados automaticamente
            a cada entrega registrada, mas podem ser ajustados manualmente aqui também.
          </p>
        </Section>

        <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-7">
          <Button variant="secondary" type="button" onClick={() => navigate('/alunos')}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar aluno'}</Button>
        </div>
      </Card>
    </form>
  </div>;

  function FormField({ field, label, ...props }) {
    return <div><Field label={label} value={form[field] || ''} onChange={e => change(field, e.target.value)} placeholder={`Digite ${label.toLowerCase()}`} {...props} />{errors[field] && <p className="mt-1 text-xs text-red-600">{errors[field]}</p>}</div>;
  }
}

function Section({ title, children }) { return <div className="mb-7"><h2 className="mb-3 text-[10px] font-bold text-[#2563eb]">{title}</h2>{children}</div>; }
