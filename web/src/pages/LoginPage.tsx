import { isSupabaseConfigured } from '../lib/supabaseClient';
import React, { useState } from 'react';
import { 
  Volume2, Lock, Mail, ArrowRight, ShieldCheck, User, Phone, 
  CheckCircle2, Sparkles, Eye, EyeOff, AlertCircle, Building2,
  Sun, Moon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const LoginPage: React.FC = () => {
  const { login, signUp, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const [loginEmail, setLoginEmail] = useState('admin@dbsound.com');
  const [loginPassword, setLoginPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ title: string; message: string; needsConfirmation: boolean } | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    const res = await login(loginEmail.trim().toLowerCase(), loginPassword);
    if (!res.success) {
      setErrorMsg(res.message || 'Credenciais inválidas. Verifique os dados ou confirme seu e-mail.');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanEmail) {
      setErrorMsg('Por favor, informe um e-mail válido.');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Por favor, informe seu nome completo.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    const res = await signUp({
      fullName: cleanName,
      email: cleanEmail,
      password: signupPassword,
      phone: phone.trim(),
    });

    if (res.success) {
      setSuccessInfo({
        title: res.needsConfirmation ? 'Confirmação Necessária' : 'Conta Criada com Sucesso',
        message: res.message || 'Cadastro realizado. Verifique seu e-mail para ativar.',
        needsConfirmation: Boolean(res.needsConfirmation),
      });
      setFullName('');
      setSignupEmail('');
      setPhone('');
      setSignupPassword('');
      setConfirmPassword('');
    } else {
      setErrorMsg(res.message || 'Erro ao realizar cadastro.');
    }
  };

  const handleQuickDemo = (role: 'admin' | 'resident' | 'pending') => {
    setActiveTab('login');
    setErrorMsg(null);
    setSuccessInfo(null);
    if (role === 'admin') {
      setLoginEmail('admin@dbsound.com');
      setLoginPassword('Admin@123456');
    } else if (role === 'resident') {
      setLoginEmail('morador101@dbsound.com');
      setLoginPassword('Morador@123456');
    } else {
      setLoginEmail('lucas.morador@email.com');
      setLoginPassword('Lucas@123456');
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(score, 4);
  };

  const strength = getPasswordStrength(signupPassword);
  const strengthLabels = ['Muito Fraca', 'Fraca', 'Média', 'Boa', 'Excelente'];
  const strengthColors = ['bg-slate-700', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 relative animate-fadeIn">
      
      {/* Botão de alternância de tema */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition flex items-center gap-2 text-xs font-semibold cursor-pointer"
          title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span>Modo Escuro</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full max-w-md space-y-7 relative z-10">
        
        {/* Marca & Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>dBSound Acoustic Intelligence v2.0</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm">
              <Volume2 className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              dBSound
            </h1>
          </div>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Plataforma moderna de monitoramento sonoro residencial e gestão inteligente de condomínios
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-7 shadow-card space-y-6">
          
          {/* Seletor de Abas */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setErrorMsg(null); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {isSupabaseConfigured && <p className="text-xs text-slate-600">Use a conta cadastrada no Supabase. Acesso administrativo exige perfil de síndico vinculado ao condomínio.</p>}
          {/* Atalhos Rápidos para Demonstração */}
          {activeTab === 'login' && !isSupabaseConfigured && (
            <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
              <span className="text-slate-500 font-medium text-[11px]">Acessos Rápidos:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-brand-700 border border-blue-200 transition text-[11px] font-semibold"
                >
                  Síndico
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('resident')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition text-[11px] font-semibold"
                >
                  Morador 101
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('pending')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition text-[11px] font-semibold"
                >
                  Pendente
                </button>
              </div>
            </div>
          )}

          {/* Alerta de Erro */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Alerta de Sucesso */}
          {successInfo && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs animate-fadeIn text-emerald-800">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successInfo.title}</span>
              </div>
              <p className="leading-relaxed">{successInfo.message}</p>
              {successInfo.needsConfirmation && (
                <div className="pt-2 border-t border-emerald-200 text-[11px] text-emerald-700 font-medium">
                  Após clicar no link de confirmação do e-mail, retorne aqui e faça o login.
                </div>
              )}
            </div>
          )}

          {/* Formulário de Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium flex items-center justify-between">
                  <span>E-mail</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-700 font-medium">Senha</label>
                  <a href="#recuperar" className="text-brand-600 hover:text-brand-700 text-[11px] font-semibold transition">
                    Esqueceu?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha de acesso"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Formulário de Cadastro */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">E-mail para Confirmação</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="morador@email.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500">Um link de ativação será enviado pelo Supabase.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Telefone / WhatsApp (Opcional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
                    required
                  />
                </div>
                
                {signupPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="flex h-1 gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full h-full transition-all ${
                            step <= strength ? strengthColors[strength] : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Força: <strong className="text-slate-800">{strengthLabels[strength]}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Informação sobre liberação de unidade */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-brand-800">
                <Building2 className="w-4 h-4 shrink-0 text-brand-600 mt-0.5" />
                <span>
                  Após o cadastro, o síndico vinculará você à sua unidade residencial para liberar o acesso ao monitoramento.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Criar Minha Conta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Rodapé de Segurança */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Auditoria Criptografada • Proteção LGPD (Sem gravação de áudio)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
