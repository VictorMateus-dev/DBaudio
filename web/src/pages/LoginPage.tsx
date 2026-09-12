import React, { useState } from 'react';
import { 
  Volume2, Lock, Mail, ArrowRight, ShieldCheck, User, Phone, 
  CheckCircle2, Sparkles, Eye, EyeOff, AlertCircle, Building2 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, signUp, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@dbsound.com');
  const [loginPassword, setLoginPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI status feedback
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
        title: res.needsConfirmation ? 'Confirmação Necessária 📬' : 'Conta Criada com Sucesso! 🎉',
        message: res.message || 'Cadastro realizado. Verifique seu e-mail para ativar.',
        needsConfirmation: Boolean(res.needsConfirmation),
      });
      // Limpar formulário de cadastro
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

  // Password strength calculation
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
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Vaultflow Atmospheric Glow Background */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-violet-600/20 via-purple-600/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-[450px] h-[450px] bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-fuchsia-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-7 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium backdrop-blur-md shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>dBSound Acoustic Intelligence v2.0</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-glow-purple">
              <Volume2 className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              dBSound
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Plataforma moderna de monitoramento sonoro residencial e gestão inteligente de condomínios
          </p>
        </div>

        {/* Main Vaultflow Glass Card */}
        <div className="vault-card vault-border-glow rounded-3xl p-7 shadow-glass-card space-y-6">
          {/* Tabs Selector */}
          <div className="grid grid-cols-2 p-1 bg-space-900/90 border border-white/5 rounded-2xl">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-glow-purple'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setErrorMsg(null); }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
                activeTab === 'signup'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-glow-purple'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {/* Quick Demo Fillers */}
          {activeTab === 'login' && (
            <div className="flex items-center justify-between text-[11px] bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl">
              <span className="text-slate-400 font-medium">Acessos Rápidos:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className="px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 transition text-[10px] font-medium"
                >
                  Síndico
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('resident')}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition text-[10px] font-medium"
                >
                  Morador 101
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('pending')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition text-[10px] font-medium"
                >
                  Pendente
                </button>
              </div>
            </div>
          )}

          {/* Feedback: Error Alert */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl text-xs text-red-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Feedback: Success Alert / Email confirmation message */}
          {successInfo && (
            <div className="p-4 bg-violet-950/40 border border-violet-500/40 rounded-2xl space-y-2 text-xs animate-fadeIn">
              <div className="flex items-center gap-2 text-violet-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-violet-400" />
                <span>{successInfo.title}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{successInfo.message}</p>
              {successInfo.needsConfirmation && (
                <div className="pt-2 border-t border-violet-500/20 text-[11px] text-violet-300/80">
                  Após clicar no link de confirmação do e-mail, retorne aqui e faça o login.
                </div>
              )}
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium flex items-center justify-between">
                  <span>E-mail</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-space-900/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Senha</label>
                  <a href="#recuperar" className="text-violet-400 hover:text-violet-300 text-[11px] transition">
                    Esqueceu?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha de acesso"
                    className="w-full bg-space-900/80 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs shadow-glow-purple transition-all duration-200 flex items-center justify-center gap-2 border border-violet-400/20 disabled:opacity-50"
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

          {/* TAB 2: SIGNUP FORM */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-space-900/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">E-mail para Confirmação</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="morador@email.com"
                    className="w-full bg-space-900/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500">Um link de ativação será enviado pelo Supabase.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Telefone / WhatsApp (Opcional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full bg-space-900/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-space-900/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    required
                  />
                </div>
                {/* Strength Meter */}
                {signupPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="flex h-1 gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full h-full transition-all ${
                            step <= strength ? strengthColors[strength] : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Força: <strong className="text-slate-200">{strengthLabels[strength]}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full bg-space-900/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Informative Note */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300">
                <Building2 className="w-4 h-4 shrink-0 text-violet-400 mt-0.5" />
                <span>
                  Após o cadastro, o síndico vinculará você à sua unidade residencial para liberar o acesso ao monitoramento.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs shadow-glow-purple transition-all duration-200 flex items-center justify-center gap-2 border border-violet-400/20 disabled:opacity-50"
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

          {/* Privacy & LGPD Seal */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <span>Auditoria Criptografada • Proteção LGPD (Sem gravação de áudio)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
