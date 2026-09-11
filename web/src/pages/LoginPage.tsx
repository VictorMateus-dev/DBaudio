import React, { useState } from 'react';
import { Volume2, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('admin@dbsound.com');
  const [password, setPassword] = useState('Admin@123456');
  const [roleSelection, setRoleSelection] = useState<'admin' | 'resident'>('admin');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const ok = await login(email, roleSelection);
      if (!ok) {
        setErrorMsg('Credenciais inválidas. Verifique os dados ou use o acesso de teste.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao efetuar login.');
    }
  };

  const handleQuickFill = (targetRole: 'admin' | 'resident') => {
    setRoleSelection(targetRole);
    if (targetRole === 'admin') {
      setEmail('admin@dbsound.com');
      setPassword('Admin@123456');
    } else {
      setEmail('morador101@dbsound.com');
      setPassword('Morador@123456');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Volume2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">dBSound</h1>
          <p className="text-xs text-slate-400">Sistema Inteligente de Monitoramento Acústico Residencial</p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white">Acessar Plataforma</h2>
            <div className="flex bg-slate-950 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className={`px-3 py-1 rounded font-medium transition ${
                  roleSelection === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Síndico
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('resident')}
                className={`px-3 py-1 rounded font-medium transition ${
                  roleSelection === 'resident' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Morador
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">E-mail Cadastrado</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-medium">Senha de Acesso</label>
                <a href="#forgot" className="text-blue-400 hover:underline text-[11px]">Esqueceu a senha?</a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Acesso seguro isolado por RLS (Row Level Security). Moradores visualizam estritamente a telemetria de sua própria unidade.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
