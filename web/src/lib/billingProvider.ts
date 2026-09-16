export interface CreateChargeParams {
  amount: number;
  description: string;
  dueDate: string;
  apartmentNumber: string;
  occurrenceId?: string;
  recipientName?: string;
}

export interface ChargeResult {
  chargeId: string;
  fineNumber: string;
  barcode: string;
  qrCodePix: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  status: 'pendente' | 'paga' | 'vencida' | 'cancelada';
  provider: string;
}

export interface BillingProvider {
  name: string;
  createCharge(params: CreateChargeParams): Promise<ChargeResult>;
  getChargeStatus(chargeId: string): Promise<'pendente' | 'paga' | 'vencida' | 'cancelada'>;
  cancelCharge(chargeId: string): Promise<boolean>;
}

function generateSimulatedBarcode(amount: number, fineNumber: string): string {
  const cleanAmount = Math.round(amount * 100).toString().padStart(10, '0');
  const seed = fineNumber.replace(/\D/g, '').padEnd(8, '7').slice(-8);
  const campo1 = `34191.${seed.slice(0, 5)}`;
  const campo2 = `${seed.slice(5, 8)}43.510047`;
  const campo3 = `91020.150008`;
  const dvGeral = '5';
  const campoValor = cleanAmount;
  return `${campo1} ${campo2} ${campo3} ${dvGeral} ${campoValor}`;
}

function generateSimulatedPixPayload(amount: number, fineNumber: string): string {
  return `00020126580014BR.GOV.BCB.PIX0136dbsound-condominio-simulado-${fineNumber}520400005303986540${amount.toFixed(2)}5802BR5925Condominio dBSound Demo6009Sao Paulo62070503***6304SIMU`;
}

export class SimulatedBillingProvider implements BillingProvider {
  name = 'simulated';

  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const fineNumber = `DOC-2026-${randomSuffix}`;
    const issueDate = new Date().toISOString().split('T')[0];

    return {
      chargeId: `chg-${Date.now()}-${randomSuffix}`,
      fineNumber,
      barcode: generateSimulatedBarcode(params.amount, fineNumber),
      qrCodePix: generateSimulatedPixPayload(params.amount, fineNumber),
      amount: params.amount,
      dueDate: params.dueDate,
      issueDate,
      status: 'pendente',
      provider: this.name,
    };
  }

  async getChargeStatus(_chargeId: string): Promise<'pendente' | 'paga' | 'vencida' | 'cancelada'> {
    return 'pendente';
  }

  async cancelCharge(_chargeId: string): Promise<boolean> {
    return true;
  }
}

export const currentBillingProvider: BillingProvider = new SimulatedBillingProvider();
