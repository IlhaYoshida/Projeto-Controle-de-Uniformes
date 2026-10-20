import { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Shield, Mail, Key } from 'lucide-react';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../api';
import { useApp } from '../App';
import { Button, Card, Empty, Header, Field } from '../components/UI';
import { initials } from '../data';

export default function UsuariosPage() {
  const { currentUser, escolaId } = useApp();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await getUsuarios();
      setUsuarios(data);
    } catch {
      setErro('Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleExcluir = async (usuario) => {
    if (currentUser?.id === usuario.id) {
      return setErro('Você não pode excluir o seu próprio usuário conectado.');
    }

    if (!window.confirm(`Tem certeza que deseja remover o usuário "${usuario.nome}" (${usuario.email})?`)) return;

    setErro('');
    setSucesso('');
    try {
      await deleteUsuario(usuario.id);
      setSucesso(`Usuário "${usuario.nome}" excluído com sucesso.`);
      carregarUsuarios();
    } catch (err) {
      setErro(err.message || 'Erro ao excluir usuário.');
    }
  };

  return (
    <div className="page-enter">
      <Header
        eyebrow="GERENCIAMENTO DE ACESSO"
        title="Usuários do sistema"
        subtitle="Controle os profissionais que têm acesso ao sistema de uniformes da escola."
        actions={
          <Button onClick={() => setModalNovo(true)}>
            <UserPlus size={16} /> Novo usuário
          </Button>
        }
      />

      {erro && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {sucesso}
        </p>
      )}

      <Card className="overflow-hidden">
        <div className="px-5 pb-2 pt-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Usuários cadastrados</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {usuarios.length} usuários com permissão de acesso
          </p>
        </div>

        <div className="scrollbar-thin overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[650px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {['Usuário', 'E-mail de acesso', 'Função', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const isCurrent = currentUser?.id === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                        {initials(u.nome)}
                      </span>
                      <div>
                        <div>{u.nome}</div>
                        {isCurrent && (
                          <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            Você
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" /> {u.email}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Shield size={13} className="text-blue-600 dark:text-blue-400" /> Secretaria / Gestor
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Ativo
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Editar dados ou senha"
                          onClick={() => setUsuarioEditando(u)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-blue-950"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isCurrent}
                          title={isCurrent ? 'Não pode excluir usuário conectado' : 'Excluir usuário'}
                          onClick={() => handleExcluir(u)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-red-950"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && !usuarios.length && <Empty text="Nenhum usuário cadastrado." />}
          {loading && <div className="py-16 text-center text-sm text-slate-400">Carregando usuários...</div>}
        </div>
      </Card>

      {/* Modal Criar Novo Usuário (Item 15) */}
      {modalNovo && (
        <ModalUsuarioForm
          titulo="Cadastrar novo usuário"
          escolaId={escolaId}
          onClose={() => setModalNovo(false)}
          onSuccess={() => {
            setModalNovo(false);
            setSucesso('Usuário cadastrado com sucesso!');
            carregarUsuarios();
          }}
        />
      )}

      {/* Modal Editar Usuário (Item 15) */}
      {usuarioEditando && (
        <ModalUsuarioForm
          titulo="Editar usuário"
          usuario={usuarioEditando}
          escolaId={escolaId}
          onClose={() => setUsuarioEditando(null)}
          onSuccess={() => {
            setUsuarioEditando(null);
            setSucesso('Usuário atualizado com sucesso!');
            carregarUsuarios();
          }}
        />
      )}
    </div>
  );
}

function ModalUsuarioForm({ titulo, usuario = null, escolaId, onClose, onSuccess }) {
  const [nome, setNome] = useState(usuario?.nome || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [senha, setSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return setErro('Informe o nome do usuário.');
    if (!email.trim() || !email.includes('@')) return setErro('Informe um e-mail válido.');
    if (!usuario && (!senha || senha.length < 6)) {
      return setErro('A senha deve ter pelo menos 6 caracteres.');
    }
    if (usuario && senha && senha.length < 6) {
      return setErro('A nova senha deve ter pelo menos 6 caracteres.');
    }

    setSalvando(true);
    setErro('');
    try {
      if (usuario) {
        const payload = { nome: nome.trim(), email: email.trim() };
        if (senha) payload.senha = senha;
        await updateUsuario(usuario.id, payload);
      } else {
        await createUsuario({
          escola_id: escolaId || 1,
          nome: nome.trim(),
          email: email.trim(),
          senha,
        });
      }
      onSuccess();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar usuário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{titulo}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {usuario ? 'Atualize as informações ou defina uma nova senha.' : 'Crie credenciais de acesso para a equipe escolar.'}
        </p>

        {erro && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950 dark:text-red-300">{erro}</p>}

        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field
            label="Nome completo"
            required
            placeholder="Ex: Maria Secretária"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />

          <Field
            label="E-mail de acesso"
            required
            type="email"
            placeholder="usuario@escola.gov.br"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <Field
            label={usuario ? 'Nova senha (deixe em branco para não alterar)' : 'Senha de acesso *'}
            type="password"
            placeholder={usuario ? '••••••' : 'Mínimo 6 caracteres'}
            value={senha}
            onChange={e => setSenha(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={onClose} className="h-9 px-4 text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="h-9 px-4 text-xs">
              {salvando ? 'Salvando...' : 'Salvar usuário'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
