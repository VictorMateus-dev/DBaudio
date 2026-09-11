import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Role } from '../types/database.types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface AuthContextType {
  user: Profile | null;
  role: Role;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, role?: Role) => Promise<boolean>;
  logout: () => Promise<void>;
  switchRole: (role: Role) => void;
}

const defaultAdminProfile: Profile = {
  id: 'aaaa1111-0000-0000-0000-000000000001',
  full_name: 'Carlos Síndico Geral',
  email: 'admin@dbsound.com',
  phone: '(11) 98888-0001',
  role: 'admin',
  condominium_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultResidentProfile: Profile = {
  id: 'bbbb2222-0000-0000-0000-000000000101',
  full_name: 'João Silva (Apto 101)',
  email: 'morador101@dbsound.com',
  phone: '(11) 97777-0101',
  role: 'resident',
  condominium_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  apartment_id: '10100000-0000-0000-0000-000000000101',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(defaultAdminProfile);
  const [role, setRole] = useState<Role>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);

  useEffect(() => {
    const client = supabase;
    if (isSupabaseConfigured && client) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setUser(data as Profile);
                setRole(data.role);
                setIsDemoMode(false);
              }
            });
        }
      });

      const { data: authListener } = client.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (data) {
            setUser(data as Profile);
            setRole(data.role);
            setIsDemoMode(false);
          }
        } else {
          setUser(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, targetRole: Role = 'admin'): Promise<boolean> => {
    setIsLoading(true);
    try {
      const client = supabase;
      if (isSupabaseConfigured && client) {
        // Login com Supabase Auth
        const { error } = await client.auth.signInWithPassword({
          email,
          password: 'Password123!',
        });
        if (!error) return true;
      }
      
      // Demo login
      if (targetRole === 'admin' || email.includes('admin')) {
        setUser(defaultAdminProfile);
        setRole('admin');
      } else {
        setUser(defaultResidentProfile);
        setRole('resident');
      }
      return true;
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
    <AuthContext.Provider value={{ user, role, isLoading, isDemoMode, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};
