import React, { useState, useEffect } from 'react';
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
import { Apartment, Device, Sensor, Alert, Occurrence, NoisePolicy } from './types/database.types';

export const App: React.FC = () => {
  const { user, role } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);

  // States
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [policies, setPolicies] = useState<NoisePolicy[]>([]);
  const [simulatorAptId, setSimulatorAptId] = useState<string | undefined>(undefined);

  const loadAllData = async () => {
    const [apts, devs, sens, alts, occs, pols] = await Promise.all([
      DataService.getApartments(),
      DataService.getDevices(),
      DataService.getSensors(),
      DataService.getAlerts(),
      DataService.getOccurrences(),
      DataService.getPolicies(),
    ]);
    setApartments([...apts]);
    setDevices([...devs]);
    setSensors([...sens]);
    setAlerts([...alts]);
    setOccurrences([...occs]);
    setPolicies([...pols]);
  };

  useEffect(() => {
    loadAllData();
    // Subscrição reativa para atualização instantânea em tempo real (inclusive do simulador)
    const unsubscribe = localStore.subscribe(() => {
      loadAllData();
    });
    return unsubscribe;
  }, []);

  // Se o usuário não estiver autenticado
  if (!user) {
    return <LoginPage />;
  }

  // Se o perfil selecionado for Morador, renderiza o App Morador (Mobile View)
  if (role === 'resident') {
    const residentApt = user?.apartment_id
      ? apartments.find(a => a.id === user.apartment_id) || null
      : null;

    return (
      <ResidentMobileView
        apartment={residentApt}
        alerts={alerts}
        occurrences={occurrences}
        onRefresh={loadAllData}
      />
    );
  }

  const handleSelectApartment = (apt: Apartment) => {
    setSelectedApartment(apt);
  };

  const handleOpenSimulatorForApt = (aptId: string) => {
    setSimulatorAptId(aptId);
    setSelectedApartment(null);
    setCurrentTab('simulator');
  };

  const pendingResidentsCount = localStore.profiles.filter(p => p.role === 'resident' && !p.apartment_id).length;

  return (
    <div className="flex h-screen bg-space-950 text-slate-100 overflow-hidden">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedApartment(null);
          setCurrentTab(tab);
        }}
        openAlertsCount={alerts.filter(a => !a.read).length}
        openOccurrencesCount={occurrences.filter(o => o.status === 'aberta').length}
        pendingResidentsCount={pendingResidentsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          alerts={alerts}
          onSelectApartment={(aptId) => {
            const apt = apartments.find(a => a.id === aptId);
            if (apt) {
              setSelectedApartment(apt);
            }
          }}
        />

        <main className="flex-1 pb-16">
          {/* Se um apartamento específico estiver selecionado, exibe os detalhes do apartamento */}
          {selectedApartment ? (
            <ApartmentDetailPage
              apartment={selectedApartment}
              device={devices.find(d => d.apartment_id === selectedApartment.id)}
              sensors={sensors.filter(s => s.device_id === selectedApartment.id)}
              occurrences={occurrences}
              alerts={alerts}
              onBack={() => setSelectedApartment(null)}
              onOpenSimulator={handleOpenSimulatorForApt}
            />
          ) : (
            <>
              {currentTab === 'overview' && (
                <DashboardOverview
                  apartments={apartments}
                  devices={devices}
                  alerts={alerts}
                  occurrences={occurrences}
                  onNavigateTab={setCurrentTab}
                  onSelectApartment={handleSelectApartment}
                />
              )}

              {currentTab === 'floorplan' && (
                <FloorPlanPage
                  apartments={apartments}
                  onSelectApartment={handleSelectApartment}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'residents' && (
                <div className="p-8">
                  <ResidentsManagementPage />
                </div>
              )}

              {currentTab === 'occurrences' && (
                <OccurrencesPage
                  occurrences={occurrences}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'devices' && (
                <DevicesPage
                  devices={devices}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'policies' && (
                <PoliciesPage
                  policies={policies}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'simulator' && (
                <SimulatorLabPage
                  apartments={apartments}
                  devices={devices}
                  initialApartmentId={simulatorAptId}
                  onSimulationTriggered={loadAllData}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
