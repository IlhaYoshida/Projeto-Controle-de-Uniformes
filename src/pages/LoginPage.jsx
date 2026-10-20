import { useState, useEffect } from 'react';
import { School, User, Lock, Mail, ArrowRight, Sparkles, KeyRound } from 'lucide-react';
import { login as apiLogin, getStatusInicial, setupInicial } from '../api';
import { Button, Card, Field } from '../components/UI';

export default function LoginPage({ onLoginSuccess }) {
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);

  // Form de Login
  const [email, setEmail] = useState('admin@escola.gov.br');
  const [senha, setSenha] = useState('admin123');

  // Form de Setup / Novo Admin
  const [escolaNome, setEscolaNome] = useState('Escola Municipal Central');
  const [diretor, setDiretor] = useState('');
  const [endereco, setEndereco] = useState('');
  const [usuarioNome, setUsuarioNome] = useState('');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [usuarioSenha, setUsuarioSenha] = useState('');
  const [escolaCadastradaNome, setEscolaCadastradaNome] = useState('');

  useEffect(() => {
    getStatusInicial()
      .then(res => {
        if (res.precisa_setup) {
          setIsSetup(true);
        }
        if (res.escola_nome) {
          setEscolaCadastradaNome(res.escola_nome);
          setEscolaNome(res.escola_nome);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    if (!email || !senha) return setErro('Informe o e-mail e a senha.');

    setProcessando(true);
    try {
      const user = await apiLogin({ email: email.trim(), senha });
      onLoginSuccess(user);
    } catch (err) {
      setErro(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setProcessando(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setErro('');
    if (!escolaNome.trim()) return setErro('Informe o nome da escola.');
    if (!usuarioNome.trim()) return setErro('Informe o seu nome completo.');
    if (!usuarioEmail.trim() || !usuarioEmail.includes('@')) return setErro('Informe um e-mail válido.');
    if (!usuarioSenha || usuarioSenha.length < 6) return setErro('A senha deve ter no mínimo 6 caracteres.');

    setProcessando(true);
    try {
      const res = await setupInicial({
        escola_nome: escolaNome.trim(),
        diretor: diretor.trim() || null,
        endereco: endereco.trim() || null,
        usuario_nome: usuarioNome.trim(),
        usuario_email: usuarioEmail.trim(),
        usuario_senha: usuarioSenha,
        turmas: ['1º A', '1º B', '2º A', '2º B', '3º A', '3º B', '4º A', '4º B', '5º A', '5º B'],
        uniformes: [
          { tipo: 'Camiseta', tamanho: 'P' },
          { tipo: 'Camiseta', tamanho: 'M' },
          { tipo: 'Camiseta', tamanho: 'G' },
          { tipo: 'Calça', tamanho: 'P' },
          { tipo: 'Calça', tamanho: 'M' },
          { tipo: 'Calça', tamanho: 'G' },
          { tipo: 'Bermuda', tamanho: 'M' },
        ],
      });
      onLoginSuccess(res.usuario);
    } catch (err) {
      setErro(err.message || 'Erro durante a configuração.');
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-white">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Iniciando sistema de uniformes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090d16] p-4 relative overflow-hidden">
      {/* Luz decorativa de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-3">
            <School size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">UNIFORME+</h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSetup
              ? 'Configuração inicial da escola e usuário administrador'
              : escolaCadastradaNome
              ? `Controle Escolar · ${escolaCadastradaNome}`
              : 'Sistema de Gestão e Controle Escolar de Uniformes'}
          </p>
        </div>

        <Card className="p-7 shadow-2xl border-slate-800 bg-[#111827]">
          {erro && (
            <p className="mb-5 rounded-lg bg-red-950/70 border border-red-800 p-3 text-xs text-red-300">
              {erro}
            </p>
          )}

          {isSetup ? (
            /* CONFIGURAÇÃO INICIAL / CADASTRO DE ADMINISTRADOR */
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Dados da Escola
                </span>
                <div className="mt-2 space-y-3">
                  <Field
                    label="Nome da escola"
                    required
                    placeholder="Ex: Escola Municipal Central"
                    value={escolaNome}
                    onChange={e => setEscolaNome(e.target.value)}
                  />
                  <Field
                    label="Diretor(a) (opcional)"
                    placeholder="Ex: Prof. Carlos Eduardo"
                    value={diretor}
                    onChange={e => setDiretor(e.target.value)}
                  />
                  <Field
                    label="Endereço (opcional)"
                    placeholder="Ex: Rua das Flores, 120"
                    value={endereco}
                    onChange={e => setEndereco(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Dados do Administrador
                </span>
                <div className="mt-2 space-y-3">
                  <Field
                    label="Seu nome completo"
                    required
                    placeholder="Ex: Diego Vieira"
                    value={usuarioNome}
                    onChange={e => setUsuarioNome(e.target.value)}
                  />
                  <Field
                    label="Seu e-mail de acesso"
                    required
                    type="email"
                    placeholder="seu.email@escola.gov.br"
                    value={usuarioEmail}
                    onChange={e => setUsuarioEmail(e.target.value)}
                  />
                  <Field
                    label="Sua senha de acesso"
                    required
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={usuarioSenha}
                    onChange={e => setUsuarioSenha(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button type="submit" disabled={processando} className="w-full h-11">
                  {processando ? 'Configurando...' : 'Finalizar configuração e entrar'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setIsSetup(false); setErro(''); }}
                  className="w-full text-center text-xs text-slate-400 hover:text-white pt-2"
                >
                  Já possui um usuário cadastrado? <b>Fazer login</b>
                </button>
              </div>
            </form>
          ) : (
            /* TELA DE LOGIN */
            <form onSubmit={handleLogin} className="space-y-4">
              <Field
                label="E-mail de acesso"
                required
                type="email"
                placeholder="admin@escola.gov.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              <Field
                label="Senha de acesso"
                required
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
              />

              {/* Dica de Acesso Rápido */}
              <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-3 text-[11px] text-blue-300 flex items-start gap-2">
                <KeyRound size={15} className="mt-0.5 text-blue-400 shrink-0" />
                <div>
                  <b>Credenciais padrão para teste:</b>
                  <div className="text-slate-300 mt-0.5">E-mail: <code className="text-blue-300">admin@escola.gov.br</code></div>
                  <div className="text-slate-300">Senha: <code className="text-blue-300">admin123</code></div>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Button type="submit" disabled={processando} className="w-full h-11">
                  {processando ? 'Entrando...' : 'Entrar no sistema'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setIsSetup(true); setErro(''); }}
                  className="w-full text-center text-xs text-slate-400 hover:text-blue-400 pt-2 transition"
                >
                  Primeiro acesso ou deseja criar outro administrador? <b>Clique aqui</b>
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
