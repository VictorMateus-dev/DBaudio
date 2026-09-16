import React from 'react';
import { SimulatedFine } from '../types/database.types';
import { Printer, Copy, Check, CheckCircle2, X } from 'lucide-react';

interface PrintableBoletoProps {
  fine: SimulatedFine;
  onClose: () => void;
  onSimulatePayment?: (fineId: string) => void;
}

export const printBoletoDocument = () => {
  window.print();
};

export const PrintableBoleto: React.FC<PrintableBoletoProps> = ({
  fine,
  onClose,
  onSimulatePayment,
}) => {
  const [copiedBarcode, setCopiedBarcode] = React.useState(false);
  const [copiedPix, setCopiedPix] = React.useState(false);

  const handleCopyBarcode = () => {
    if (fine.barcode) {
      navigator.clipboard.writeText(fine.barcode);
      setCopiedBarcode(true);
      setTimeout(() => setCopiedBarcode(false), 2000);
    }
  };

  const handleCopyPix = () => {
    if (fine.qr_code_pix) {
      navigator.clipboard.writeText(fine.qr_code_pix);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  const isCancelled = fine.status === 'cancelada';
  const isPaid = fine.status === 'paga';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl my-8">
        
        <div 
          id="printable-boleto-area" 
          className="bg-white text-slate-900 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl relative border-2 border-slate-300"
        >
          
          <div className="border-b-2 border-dashed border-red-400 pb-3 text-center">
            <div className="inline-block px-3 py-1 rounded bg-red-100 text-red-700 font-mono text-xs font-black uppercase tracking-widest border border-red-300">
              ⚠️ DOCUMENTO DE COBRANÇA SIMULADO — SEM VALIDADE FINANCEIRA
            </div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
              Ambiente de Demonstração Acadêmica dBSound • Não receber em rede bancária ou lotéricas
            </p>
          </div>

          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-black text-sm">
                  dB
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                    Condomínio Residencial Parque das Flores
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Administração Condominial dBSound • CNPJ: 00.000.000/0001-00
                  </p>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-mono font-bold text-slate-700 block">{fine.fine_number}</span>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
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
            <div className="p-3 rounded-xl bg-red-50 border-2 border-red-300 text-red-800 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <span>🚫 ESTA MULTA FOI CANCELADA PELO SÍNDICO</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong>Motivo do cancelamento:</strong> {fine.cancellation_reason || 'Revisão administrativa deferida.'}
              </p>
              {fine.cancelled_at && (
                <p className="text-[10px] text-red-600">
                  Data do cancelamento: {new Date(fine.cancelled_at).toLocaleString('pt-BR')} por {fine.cancelled_by || 'Administração'}
                </p>
              )}
            </div>
          )}

          
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Pagador / Unidade</span>
                <strong className="text-slate-900 text-xs">Apto {fine.apartment_number || '101'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Emissão</span>
                <strong className="text-slate-900 text-xs">{new Date(fine.issue_date).toLocaleDateString('pt-BR')}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Vencimento</span>
                <strong className="text-red-600 text-xs font-black">{new Date(fine.due_date).toLocaleDateString('pt-BR')}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Valor Documento</span>
                <strong className="text-slate-900 text-sm font-black">R$ {fine.amount.toFixed(2)}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Referência / Enquadramento Regimental:</span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">{fine.reason}</p>
              {fine.syndic_notes && (
                <p className="text-[11px] text-slate-500 italic mt-1 pt-1 border-t border-slate-200">
                  Parecer do Síndico: {fine.syndic_notes}
                </p>
              )}
            </div>

            
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between text-[11px] font-mono bg-slate-100 p-2.5 rounded-lg border border-slate-300 select-all">
                <span className="font-bold text-slate-800 tracking-wider break-all">{fine.barcode}</span>
                <span className="text-[9px] text-slate-500 uppercase shrink-0 ml-2">Linha Digitável Fictícia</span>
              </div>

              
              <div className="p-4 bg-white border border-slate-300 rounded-lg flex flex-col items-center justify-center space-y-1">
                <div className="flex items-center gap-[2px] h-12 w-full max-w-md justify-center">
                  {Array.from({ length: 55 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-slate-900 h-full"
                      style={{ width: i % 3 === 0 ? '4px' : i % 2 === 0 ? '2px' : '1px' }}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono tracking-widest text-slate-400 font-bold uppercase">
                  SIMULAÇÃO — NÃO LER EM CAIXA ELETRÔNICO
                </span>
              </div>
            </div>

            
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 space-y-0.5">
              <strong className="block font-bold">AVISO LEGAL OBRIGATÓRIO:</strong>
              <p>
                Este documento é uma <strong>representação gráfica fictícia de cobrança condominial</strong> gerada para fins de demonstração acadêmica do sistema dBSound. Não possui qualquer valor cambial, bancário ou contábil e não deve ser pago em agências bancárias ou canais de pagamento reais.
              </p>
            </div>
          </div>

          
          <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Fechar Visualizador
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyBarcode}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
              >
                {copiedBarcode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBarcode ? 'Copiado!' : 'Copiar Código'}</span>
              </button>

              {!isPaid && !isCancelled && onSimulatePayment && (
                <button
                  type="button"
                  onClick={() => onSimulatePayment(fine.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simular Baixa / Pagamento</span>
                </button>
              )}

              <button
                type="button"
                onClick={printBoletoDocument}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow transition flex items-center gap-1.5"
                title="Imprime SOMENTE este documento fictício"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Somente Boleto</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
