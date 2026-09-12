import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Role } from '../types/database.types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { localStore } from '../lib/dataService';

interface AuthResponse {
  success: boolean;
  needsConfirmation?: boolean;
  message?: string;
}

interface AuthContextType {
  user: Profile | null;
  role: Role;
  isLoading: boolean;
  isDemoMode: boolean;
  isPendingAssignment: boolean;
  login: (email: string, password?: string, targetRole?: Role) => Promise<AuthResponse>;
  signUp: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  switchRole: (role: Role) => void;
  refreshProfile: () => Promise<void>;
}

const defaultAdminProfile: Profile = {
  id: 'aaaa1111-0000-0000-0000-000000000001',
  full_name: 'Carlos Síndico Geral',
  email: 'admin@dbsound.com',
  phone: '(11) 98888-0001',
  role: 'admin',
  condominium_id: 'c1',
  apartment_id: null,
  created_at: new Date(Date.now() - 3600000 * 24 * 120).toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultResidentProfile: Profile = {
  id: 'bbbb2222-0000-0000-0000-000000000101',
  full_name: 'João Silva',
  email: 'morador101@dbsound.com',
  phone: '(11) 97777-0101',
  role: 'resident',
  condominium_id: 'c1',
  apartment_id: '10100000-0000-0000-0000-000000000101',
  apartment_number: '101',
  created_at: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
  updated_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(defaultAdminProfile);
  const [role, setRole] = useState<Role>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);

  const isPendingAssignment = Boolean(user && user.role === 'resident' && !user.apartment_id);

  const fetchProfile = async (userId: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('profiles')
        .select('*, apartments(number)')
        .eq('id', userId)
        .single();

      if (data) {
        const prof: Profile = {
          ...data,
          apartment_number: data.apartments?.number || undefined,
        };
        setUser(prof);
        setRole(prof.role);
        setIsDemoMode(false);
        return;
      }
    }

    // Fallback local store
    const localProf = localStore.profiles.find(p => p.id === userId);
    if (localProf) {
      setUser(localProf);
      setRole(localProf.role);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const client = supabase;
    if (isSupabaseConfigured && client) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchProfile(session.user.id);
        }
      });

      const { data: authListener } = client.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password = 'Password123!', targetRole: Role = 'admin'): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const client = supabase;
      if (isSupabaseConfigured && client) {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            return {
              success: false,
              needsConfirmation: true,
              message: 'E-mail não confirmado! Por favor, acesse sua caixa de entrada e clique no link de ativação enviado pelo Supabase.',
            };
          }
          return { success: false, message: error.message };
        }

        if (data.user) {
          await fetchProfile(data.user.id);
          return { success: true };
        }
      }

      // Demo login no store local
      const foundInStore = localStore.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
      if (foundInStore) {
        setUser(foundInStore);
        setRole(foundInStore.role);
        return { success: true };
      }

      if (targetRole === 'admin' || email.includes('admin')) {
        setUser(defaultAdminProfile);
        setRole('admin');
      } else {
        setUser(defaultResidentProfile);
        setRole('resident');
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro inesperado ao efetuar login.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const client = supabase;
      if (isSupabaseConfigured && client) {
        const { data: authData, error } = await client.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              phone: data.phone,
            },
          },
        });

        if (error) {
          return { success: false, message: error.message };
        }

        // Se o Supabase exigir confirmação por email
        if (authData.user && !authData.session) {
          return {
            success: true,
            needsConfirmation: true,
            message: 'Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail. Ative sua conta antes de fazer o primeiro login.',
          };
        }

        if (authData.user) {
          await fetchProfile(authData.user.id);
          return {
            success: true,
            needsConfirmation: false,
            message: 'Conta criada e ativada com sucesso! Aguarde a alocação do seu apartamento pelo síndico.',
          };
        }
      }

      // Modo Demo Local: Cadastra morador pendente no store local
      const newLocalProfile: Profile = {
        id: `usr-${Date.now()}`,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        role: 'resident',
        condominium_id: 'c1',
        apartment_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStore.profiles.unshift(newLocalProfile);
      localStore.notify();

      setUser(newLocalProfile);
      setRole('resident');

      return {
        success: true,
        needsConfirmation: false,
        message: 'Conta criada com sucesso! Aguarde a alocação do seu apartamento pelo síndico.',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao realizar cadastro.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const client = supabase;
    if (isSupabaseConfigured && client) {
      await client.auth.signOut();
    }
    setUser(null);
  };

  const switchRole = (newRole: Role) => {
    setRole(newRole);
    if (newRole === 'admin') {
      setUser(defaultAdminProfile);
    } else {
      setUser(defaultResidentProfile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isDemoMode,
        isPendingAssignment,
        login,
        signUp,
        logout,
        switchRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};
