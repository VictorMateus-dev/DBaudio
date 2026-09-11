import React, { useState } from 'react';
import { FloorPlanGrid } from '../components/FloorPlanGrid';
import { Apartment } from '../types/database.types';
import { Search, Filter, RefreshCw } from 'lucide-react';

interface FloorPlanPageProps {
  apartments: Apartment[];
  onSelectApartment: (apt: Apartment) => void;
  onRefresh?: () => void;
}

export const FloorPlanPage: React.FC<FloorPlanPageProps> = ({
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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Planta Geral dos Apartamentos</h1>
          <p className="text-sm text-slate-400">
            Mapeamento acústico em tempo real por andar e unidade residencial.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar unidade (ex: 202)..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterStatus === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('normal')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterStatus === 'normal' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setFilterStatus('warning')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterStatus === 'warning' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Atenção
            </button>
            <button
              onClick={() => setFilterStatus('critical')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterStatus === 'critical' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Elevado
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Atualizar leituras"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Floor Plan Grid */}
      <FloorPlanGrid
        apartments={filteredApartments}
        onSelectApartment={onSelectApartment}
      />
    </div>
  );
};
