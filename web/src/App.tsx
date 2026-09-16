import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
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
import { MessagesManagementPage } from './pages/MessagesManagementPage';
import { ResidentMobileView } from './pages/ResidentMobileView';
import { LoginPage } from './pages/LoginPage';
import { BoletoPage } from './pages/BoletoPage';
import { useAuth } from './contexts/AuthContext';
import { DataService, localStore } from './lib/dataService';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { Apartment, Device, Sensor, Alert, Occurrence, NoisePolicy, Profile } from './types/database.types';

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

  const isExplicitAdmin = user.role === 'admin' || user.email?.toLowerCase().includes('admin') || user.email === 'admin@dbsound.com';
  if (requiredRole === 'admin' && !isExplicitAdmin) {
    return <Navigate to="/morador/inicio" replace />;
  }

  return <>{children}</>;
};

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

interface SindicoLayoutProps {
  alerts: Alert[];
  occurrences: Occurrence[];
  pendingResidentsCount: number;
  unreadMessagesCount: number;
}

const SindicoLayout: React.FC<SindicoLayoutProps> = ({
  alerts,
  occurrences,
  pendingResidentsCount,
  unreadMessagesCount,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const path = location.pathname;
  let currentTab: NavTab = 'overview';
  if (path.includes('/sindico/apartamento')) currentTab = 'floorplan';
  else if (path.includes('/sindico/apartamentos')) currentTab = 'floorplan';
  else if (path.includes('/sindico/moradores')) currentTab = 'residents';
  else if (path.includes('/sindico/ocorrencias')) currentTab = 'occurrences';
  else if (path.includes('/sindico/mensagens')) currentTab = 'messages';
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
      case 'messages': navigate('/sindico/mensagens'); break;
      case 'devices': navigate('/sindico/dispositivos'); break;
      case 'policies': navigate('/sindico/politicas'); break;
      case 'simulator': navigate('/sindico/simulador'); break;
    }
  };

  return (
    <div className="h-screen w-screen bg-space-950 text-slate-100 overflow-hidden lg:grid lg:grid-cols-[260px_minmax(0,1fr)] flex flex-col">
      
      <div className="hidden lg:block h-full w-[260px] shrink-0">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          openAlertsCount={alerts.filter(a => !a.read).length}
          openOccurrencesCount={occurrences.filter(o => o.status === 'aberta').length}
          pendingResidentsCount={pendingResidentsCount}
          unreadMessagesCount={unreadMessagesCount}
        />
      </div>

      
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-space-900 border-b border-white/10 shrink-0 select-none">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex items-center gap-2.5 text-white font-bold text-sm hover:text-violet-300 transition"
        >
          <Menu className="w-5 h-5 text-violet-400" />
          <span>{currentTab === 'occurrences' ? 'Ocorrências & Decisões' : 'dBSound Síndico'}</span>
        </button>

        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
          Admin
        </span>
      </div>

      
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fadeIn">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="relative w-[270px] h-full z-10 shadow-2xl bg-space-900 flex flex-col">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={handleSelectTab}
              onClose={() => setIsMobileMenuOpen(false)}
              openAlertsCount={alerts.filter(a => !a.read).length}
              openOccurrencesCount={occurrences.filter(o => o.status === 'aberta').length}
              pendingResidentsCount={pendingResidentsCount}
              unreadMessagesCount={unreadMessagesCount}
            />
          </div>
        </div>
      )}

      
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
        <Header
          alerts={alerts}
          onSelectApartment={(aptId) => {
            navigate(`/sindico/apartamento/${aptId}`);
          }}
        />

        <main className="flex-1 min-w-0 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [policies, setPolicies] = useState<NoisePolicy[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [simulatorAptId, setSimulatorAptId] = useState<string | undefined>(undefined);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  const loadAllData = async () => {
    const [apts, devs, sens, alts, occs, pols, profs, unreadMsgs] = await Promise.all([
      DataService.getApartments(),
      DataService.getDevices(),
      DataService.getSensors(),
      DataService.getAlerts(),
      DataService.getOccurrences(),
      DataService.getPolicies(),
      DataService.getProfiles(),
      DataService.getUnreadMessagesCount(undefined, true),
    ]);
    setApartments([...apts]);
    setDevices([...devs]);
    setSensors([...sens]);
    setAlerts([...alts]);
    setOccurrences([...occs]);
    setPolicies([...pols]);
    setProfiles([...profs]);
    setUnreadMessagesCount(unreadMsgs);
  };

  useEffect(() => {
    loadAllData();

    const unsubscribeLocal = localStore.subscribe(() => {
      loadAllData();
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dbsound_apartments' || e.key === 'dbsound_allocations' || e.key === 'dbsound_profiles' || e.key === 'dbsound_conversations' || e.key === 'dbsound_messages' || e.key === 'dbsound_fines') {
        loadAllData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const heartbeatInterval = setInterval(() => {
      loadAllData();
    }, 2500);

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
          .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
            loadAllData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_messages' }, () => {
            loadAllData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'fines' }, () => {
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

  const getResidentApartment = () => {
    if (!user) return null;
    let residentApt = (user.apartment_id || user.apartment_number)
      ? apartments.find(a => 
          (user.apartment_id && a.id === user.apartment_id) || 
          (user.apartment_number && a.number === user.apartment_number)
        ) || null
      : null;

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

      
      <Route
        path="/sindico"
        element={
          <ProtectedRoute requiredRole="admin">
            <SindicoLayout
              alerts={alerts}
              occurrences={occurrences}
              pendingResidentsCount={pendingResidentsCount}
              unreadMessagesCount={unreadMessagesCount}
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
                  case 'messages': navigate('/sindico/mensagens'); break;
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
          path="mensagens"
          element={
            <MessagesManagementPage
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

      
      <Route path="/boleto/:multaId" element={<BoletoPage />} />

      
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

      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
