import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataService } from '../lib/dataService';
import { SimulatedFine } from '../types/database.types';
import { Printer, ArrowLeft, Check, Copy } from 'lucide-react';

export const BoletoPage: React.FC = () => {
  const { multaId } = useParams<{ multaId: string }>();
  const navigate = useNavigate();
  const [fine, setFine] = useState<SimulatedFine | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    const fetchFine = async () => {
      if (!multaId) return;
      try {
        const fines = await DataService.getFines();
        const found = fines.find(f => f.id === multaId || f.fine_number === multaId);
        setFine(found || null);
      } finally {
        setLoading(false);
      }
    };
    fetchFine();
  }, [multaId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <p className="text-sm text-slate-400">Carregando documento de cobrança simulada...</p>
      </div>
    );
  }

  if (!fine) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 space-y-4">
        <h2 className="text-lg font-bold text-red-400">Boleto não encontrado</h2>
        <p className="text-xs text-slate-400">O identificador de multa informado ({multaId}) não foi localizado.</p>
        <button
          onClick={() => navigate('/sindico/ocorrencias')}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold"
        >
          Voltar para Ocorrências
        </button>
      </div>
    );
  }

  const isCancelled = fine.status === 'cancelada';
  const isPaid = fine.status === 'paga';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center p-4 sm:p-8">
      
      <div className="w-full max-w-2xl flex items-center justify-between mb-6 print:hidden">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md transition"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Boleto</span>
        </button>
      </div>

      
      <div 
        id="printable-boleto-area"
        className="w-full max-w-2xl bg-white rounded-2xl p-6 sm:p-8 border-2 border-slate-300 shadow-xl space-y-6 print:shadow-none print:border-none print:p-0 print:m-0"
      >
        
        <div className="text-center border-b-2 border-dashed border-red-400 pb-3">
          <div className="inline-block px-3 py-1 bg-red-100 border border-red-300 rounded text-red-700 font-mono text-xs font-black uppercase tracking-wider">
            dBSound — COBRANÇA SIMULADA — SEM VALIDADE FINANCEIRA
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
            Documento gerado estritamente para simulação acadêmica e demonstração predial • Não repassar à rede bancária
          </p>
        </div>

        
        <div className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white font-black flex items-center justify-center text-sm">
              dB
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Condomínio Residencial dBSound</h2>
              <p className="text-[11px] text-slate-500">Administração Predial Inteligente • CNPJ: 00.000.000/0001-00</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-600 block">{fine.fine_number}</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              isPaid
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : isCancelled
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              STATUS: {fine.status.toUpperCase()}
            </span>
          </div>
        </div>

        
        {isCancelled && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs">
            <strong>AVISO: ESTA MULTA FOI CANCELADA PELO SÍNDICO</strong>
            <p className="text-[11px] mt-0.5">Motivo: {fine.cancellation_reason || 'Revisão administrativa deferida.'}</p>
          </div>
        )}

        
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Pagador:</span>
            <span className="font-bold text-slate-900 text-sm">Apartamento {fine.apartment_number}</span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Vencimento:</span>
            <span className="font-bold text-red-700 text-sm">
              {new Date(fine.due_date).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="col-span-2 border-t pt-2 mt-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Motivo / Enquadramento:</span>
            <span className="font-semibold text-slate-800">{fine.reason || 'Ruído excessivo'}</span>
          </div>

          <div className="col-span-2 flex items-center justify-between border-t pt-2">
            <span className="text-slate-500 font-bold text-xs uppercase">Valor Total a Pagar:</span>
            <span className="text-lg font-black font-mono text-emerald-700">
              R$ {Number(fine.amount).toFixed(2)}
            </span>
          </div>
        </div>

        
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Linha Digitável (Simulação):</span>
            <button
              type="button"
              onClick={() => {
                if (fine.barcode) {
                  navigator.clipboard.writeText(fine.barcode);
                  setCopiedBarcode(true);
                  setTimeout(() => setCopiedBarcode(false), 2000);
                }
              }}
              className="text-[10px] text-violet-700 font-semibold flex items-center gap-1 hover:underline print:hidden"
            >
              {copiedBarcode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedBarcode ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
          <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-300 font-mono text-center text-xs font-bold text-slate-800 tracking-wider">
            {fine.barcode || '34191.79001 01043.510047 91020.150008 5 99990000015000'}
          </div>

          
          <div className="py-3 px-4 bg-white border border-slate-200 rounded-lg flex flex-col items-center">
            <div className="flex items-center justify-center gap-[2px] h-12 w-full overflow-hidden max-w-md">
              {Array.from({ length: 70 }).map((_, i) => {
                const width = (i % 3 === 0 || i % 7 === 0) ? 'w-[3px]' : (i % 2 === 0) ? 'w-[2px]' : 'w-[1px]';
                const color = (i % 5 === 0 && i % 2 === 0) ? 'bg-transparent' : 'bg-slate-900';
                return <div key={i} className={`h-full ${width} ${color}`} />;
              })}
            </div>
            <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase font-bold tracking-widest">
              SIMULAÇÃO — NÃO VÁLIDO EM BANCO
            </span>
          </div>
        </div>

        
        <div className="border-t pt-3 flex items-center justify-between text-[10px] text-slate-400">
          <span>Emitido digitalmente via Sistema dBSound</span>
          <span>Autenticação: SIMULADA-{fine.id.slice(0, 12)}</span>
        </div>
      </div>
    </div>
  );
};
