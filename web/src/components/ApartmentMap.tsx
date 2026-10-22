import React, { useState } from 'react';
import { FloorPlanGrid } from './FloorPlanGrid';
import { Apartment } from '../types/database.types';
import { Search, RefreshCw } from 'lucide-react';

interface ApartmentMapProps {
  apartments: Apartment[];
  onSelectApartment: (apt: Apartment) => void;
  onRefresh?: () => void;
}

export const ApartmentMap: React.FC<ApartmentMapProps> = ({
  apartments,
  onSelectApartment,
  onRefresh,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchNumber, setSearchNumber] = useState<string>('');

  const filteredApartments = apartments.filter(apt => {
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    const matchesSearch = apt.number.includes(searchNumber.trim());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6" aria-label="Planta e filtros das unidades">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Planta das Unidades</h2>
          <p className="text-sm text-slate-500">
            Mapeamento acústico em tempo real por andar e unidade residencial.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Buscar unidade"
              placeholder="Buscar unidade (ex: 202)..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-48 shadow-subtle"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-subtle">
            <button
              aria-pressed={filterStatus === 'all'}
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterStatus === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              aria-pressed={filterStatus === 'normal'}
              onClick={() => setFilterStatus('normal')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterStatus === 'normal' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Normal
            </button>
            <button
              aria-pressed={filterStatus === 'warning'}
              onClick={() => setFilterStatus('warning')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterStatus === 'warning' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Atenção
            </button>
            <button
              aria-pressed={filterStatus === 'critical'}
              onClick={() => setFilterStatus('critical')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterStatus === 'critical' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Elevado
            </button>
            <button aria-pressed={filterStatus === 'offline'} onClick={() => setFilterStatus('offline')} className={`px-3 py-1.5 rounded-md font-medium transition ${filterStatus === 'offline' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-900'}`}>Offline</button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 shadow-subtle transition"
              title="Atualizar leituras"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      
      {filteredApartments.length === 0 && <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Nenhuma unidade encontrada para os filtros selecionados.</p>}
      {filteredApartments.length > 0 && <FloorPlanGrid
        apartments={filteredApartments}
        onSelectApartment={onSelectApartment}
      />}
    </div>
  );
};
