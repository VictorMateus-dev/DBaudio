import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardOverview } from './pages/DashboardOverview';
import { FloorPlanPage } from './pages/FloorPlanPage';
import { ApartmentDetailPage } from './pages/ApartmentDetailPage';
import { OccurrencesPage } from './pages/OccurrencesPage';
import { DevicesPage } from './pages/DevicesPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { ResidentsManagementPage } from './pages/ResidentsManagementPage';
import { SimulatorLabPage } from './pages/SimulatorLabPage';
import { ResidentMobileView } from './pages/ResidentMobileView';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './contexts/AuthContext';
import { DataService, localStore } from './lib/dataService';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { Apartment, Device, Sensor, Alert, Occurrence, NoisePolicy, Profile } from './types/database.types';

// Componente para proteção de rotas com base em autenticação e papel (RBAC)
interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'resident';
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Carregando ambiente dBSound...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Morador tentando acessar rotas administrativas do síndico -> Redirecionado para visão do morador
  const isExplicitAdmin = user.role === 'admin' || user.email?.toLowerCase().includes('admin') || user.email === 'admin@dbsound.com';
  if (requiredRole === 'admin' && !isExplicitAdmin) {
    return <Navigate to="/morador/inicio" replace />;
  }

  return <>{children}</>;
};

// Wrapper para detalhe do apartamento com parâmetros de rota
const ApartmentDetailRouteWrapper: React.FC<{
  apartments: Apartment[];
  devices: Device[];
  sensors: Sensor[];
  occurrences: Occurrence[];
  alerts: Alert[];
  onOpenSimulator: (aptId: string) => void;
}> = ({ apartments, devices, sensors, occurrences, alerts, onOpenSimulator }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apt = apartments.find(a => a.id === id || a.number === id);

  if (!apt) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        <span>Apartamento não encontrado.</span>
        <button
          onClick={() => navigate('/sindico/apartamentos')}
          className="ml-2 text-violet-400 hover:text-violet-300 font-semibold underline"
        >
          Voltar para unidades
        </button>
      </div>
    );
  }

  return (
    <ApartmentDetailPage
      apartment={apt}
      device={devices.find(d => d.apartment_id === apt.id)}
      sensors={sensors.filter(s => s.device_id === apt.id)}
      occurrences={occurrences}
      alerts={alerts}
      onBack={() => navigate('/sindico/apartamentos')}
      onOpenSimulator={(aptId) => {
        onOpenSimulator(aptId);
        navigate('/sindico/simulador');
      }}
    />
  );
};

// Layout Web Admin do Síndico (Desktop Cockpit)
interface SindicoLayoutProps {
  alerts: Alert[];
  occurrences: Occurrence[];
  pendingResidentsCount: number;
}

const SindicoLayout: React.FC<SindicoLayoutProps> = ({
  alerts,
  occurrences,
  pendingResidentsCount,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determina aba ativa pela URL
  const path = location.pathname;
  let currentTab: NavTab = 'overview';
  if (path.includes('/sindico/apartamento')) currentTab = 'floorplan';
  else if (path.includes('/sindico/apartamentos')) currentTab = 'floorplan';
  else if (path.includes('/sindico/moradores')) currentTab = 'residents';
  else if (path.includes('/sindico/ocorrencias')) currentTab = 'occurrences';
  else if (path.includes('/sindico/dispositivos')) currentTab = 'devices';
  else if (path.includes('/sindico/politicas')) currentTab = 'policies';
  else if (path.includes('/sindico/simulador')) currentTab = 'simulator';
  else if (path.includes('/sindico/dashboard')) currentTab = 'overview';

  const handleSelectTab = (tab: NavTab) => {
    switch (tab) {
      case 'overview': navigate('/sindico/dashboard'); break;
      case 'floorplan': navigate('/sindico/apartamentos'); break;
      case 'residents': navigate('/sindico/moradores'); break;
      case 'occurrences': navigate('/sindico/ocorrencias'); break;
      case 'devices': navigate('/sindico/dispositivos'); break;
      case 'policies': navigate('/sindico/politicas'); break;
      case 'simulator': navigate('/sindico/simulador'); break;
    }
  };

  return (
    <div className="flex h-screen bg-space-950 text-slate-100 overflow-hidden">
      {/* Sidebar fixo lateral esquerdo */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        openAlertsCount={alerts.filter(a => !a.read).length}
        openOccurrencesCount={occurrences.filter(o => o.status === 'aberta').length}
        pendingResidentsCount={pendingResidentsCount}
      />

      {/* Área principal do Síndico */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          alerts={alerts}
          onSelectApartment={(aptId) => {
            navigate(`/sindico/apartamento/${aptId}`);
          }}
        />

        <main className="flex-1 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Estados de dados da plataforma
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [policies, setPolicies] = useState<NoisePolicy[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [simulatorAptId, setSimulatorAptId] = useState<string | undefined>(undefined);

  const loadAllData = async () => {
    const [apts, devs, sens, alts, occs, pols, profs] = await Promise.all([
      DataService.getApartments(),
      DataService.getDevices(),
      DataService.getSensors(),
      DataService.getAlerts(),
      DataService.getOccurrences(),
      DataService.getPolicies(),
      DataService.getProfiles(),
    ]);
    setApartments([...apts]);
    setDevices([...devs]);
    setSensors([...sens]);
    setAlerts([...alts]);
    setOccurrences([...occs]);
    setPolicies([...pols]);
    setProfiles([...profs]);
  };

  useEffect(() => {
    loadAllData();

    // 1. Inscrição reativa local (mesma aba/janela)
    const unsubscribeLocal = localStore.subscribe(() => {
      loadAllData();
    });

    // 2. Sincronização entre abas/janelas via evento 'storage' do navegador
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dbsound_apartments' || e.key === 'dbsound_allocations' || e.key === 'dbsound_profiles') {
        loadAllData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Heartbeat polling a cada 2.5s para assegurar sincronismo contínuo entre telas
    const heartbeatInterval = setInterval(() => {
      loadAllData();
    }, 2500);

    // 4. Supabase Realtime Channel (quando conectado ao backend remoto)
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase
          .channel('schema-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, () => {
            loadAllData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
            loadAllData();
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'noise_readings' }, () => {
            loadAllData();
          })
          .subscribe();
      } catch (e) {
        console.warn('Realtime channel error:', e);
      }
    }

    return () => {
      unsubscribeLocal();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(heartbeatInterval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const pendingResidentsCount = profiles.filter(p => {
    const isExplicitAdmin = p.role === 'admin' && (p.email.toLowerCase().includes('admin') || p.email === 'admin@dbsound.com');
    return !isExplicitAdmin && !p.apartment_id && !p.apartment_number;
  }).length;

  // Resolução da unidade do morador
  const getResidentApartment = () => {
    if (!user) return null;
    let residentApt = (user.apartment_id || user.apartment_number)
      ? apartments.find(a => 
          (user.apartment_id && a.id === user.apartment_id) || 
          (user.apartment_number && a.number === user.apartment_number)
        ) || null
      : null;

    // Se o morador já possui apartment_id ou apartment_number mas a lista geral ainda não o contém, sintetiza
    if (!residentApt && (user.apartment_id || user.apartment_number)) {
      residentApt = {
        id: user.apartment_id || '10100000-0000-0000-0000-000000000101',
        building_id: '00000000-0000-0000-0000-000000000002',
        number: user.apartment_number || '101',
        floor: 1,
        current_db: 40.0,
        status: 'normal',
        peak_db: 40.0,
        avg_db: 40.0,
        custom_day_threshold_db: 70,
        custom_night_threshold_db: 60,
        custom_critical_threshold_db: 80,
        created_at: user.created_at || new Date().toISOString(),
      };
    }
    return residentApt;
  };

  return (
    <Routes>
      {/* 1. Rota de Login / Cadastro */}
      <Route
        path="/login"
        element={
          user ? (
            user.role === 'admin' || user.email.toLowerCase().includes('admin') ? (
              <Navigate to="/sindico/dashboard" replace />
            ) : (
              <Navigate to="/morador/inicio" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />

      {/* 2. Rotas do Síndico (Web Admin Cockpit) - Protegidas para Administradores */}
      <Route
        path="/sindico"
        element={
          <ProtectedRoute requiredRole="admin">
            <SindicoLayout
              alerts={alerts}
              occurrences={occurrences}
              pendingResidentsCount={pendingResidentsCount}
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/sindico/dashboard" replace />} />
        
        <Route
          path="dashboard"
          element={
            <DashboardOverview
              apartments={apartments}
              devices={devices}
              alerts={alerts}
              occurrences={occurrences}
              onNavigateTab={(tab) => {
                switch (tab) {
                  case 'overview': navigate('/sindico/dashboard'); break;
                  case 'floorplan': navigate('/sindico/apartamentos'); break;
                  case 'residents': navigate('/sindico/moradores'); break;
                  case 'occurrences': navigate('/sindico/ocorrencias'); break;
                  case 'devices': navigate('/sindico/dispositivos'); break;
                  case 'policies': navigate('/sindico/politicas'); break;
                  case 'simulator': navigate('/sindico/simulador'); break;
                }
              }}
              onSelectApartment={(apt) => {
                navigate(`/sindico/apartamento/${apt.id}`);
              }}
            />
          }
        />

        <Route
          path="apartamentos"
          element={
            <FloorPlanPage
              apartments={apartments}
              onSelectApartment={(apt) => {
                navigate(`/sindico/apartamento/${apt.id}`);
              }}
              onRefresh={loadAllData}
            />
          }
        />

        <Route
          path="apartamento/:id"
          element={
            <ApartmentDetailRouteWrapper
              apartments={apartments}
              devices={devices}
              sensors={sensors}
              occurrences={occurrences}
              alerts={alerts}
              onOpenSimulator={(aptId) => {
                setSimulatorAptId(aptId);
              }}
            />
          }
        />

        <Route
          path="moradores"
          element={
            <div className="p-8">
              <ResidentsManagementPage />
            </div>
          }
        />

        <Route
          path="ocorrencias"
          element={
            <OccurrencesPage
              occurrences={occurrences}
              onRefresh={loadAllData}
            />
          }
        />

        <Route
          path="dispositivos"
          element={
            <DevicesPage
              devices={devices}
              onRefresh={loadAllData}
            />
          }
        />

        <Route
          path="politicas"
          element={
            <PoliciesPage
              policies={policies}
              onRefresh={loadAllData}
            />
          }
        />

        <Route
          path="simulador"
          element={
            <SimulatorLabPage
              apartments={apartments}
              devices={devices}
              initialApartmentId={simulatorAptId}
              onSimulationTriggered={loadAllData}
            />
          }
        />
      </Route>

      {/* 3. Rotas do Morador (Mobile App/PWA) - Protegidas para Moradores */}
      <Route
        path="/morador/*"
        element={
          <ProtectedRoute requiredRole="resident">
            <ResidentMobileView
              apartment={getResidentApartment()}
              alerts={alerts}
              occurrences={occurrences}
              onRefresh={loadAllData}
            />
          </ProtectedRoute>
        }
      />

      {/* 4. Rota Raiz - Despacha inteligentemente conforme o perfil logado */}
      <Route
        path="/"
        element={
          isLoading ? (
            <div className="min-h-screen bg-space-950 flex items-center justify-center text-slate-400">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Iniciando dBSound...</span>
              </div>
            </div>
          ) : !user ? (
            <Navigate to="/login" replace />
          ) : user.role === 'admin' || user.email?.toLowerCase().includes('admin') ? (
            <Navigate to="/sindico/dashboard" replace />
          ) : (
            <Navigate to="/morador/inicio" replace />
          )
        }
      />

      {/* 5. Fallback para rotas não mapeadas */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
