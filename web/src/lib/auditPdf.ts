import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildHours, displayDay, formatDb, HistoryFilter, HistoryResponse, pad } from './noiseHistory';

export function createAuditPdf(response: HistoryResponse, day: string, hour: number, filter: HistoryFilter, reportId: string) {
  const summary = buildHours(response.buckets)[hour];
  if (!summary || !Number.isInteger(hour)) throw new Error('Hora inválida.');
  const context = response.context;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const width = 174, left = 18;
  const text = (value: string, y: number, size = 10, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(35);
    doc.text(value, left, y);
  };
  text('dBSound', 22, 22, true);
  doc.setFontSize(9); doc.text(filter.test ? 'DADOS DE TESTE' : 'REGISTROS DE MONITORAMENTO', 192, 22, { align: 'right' });
  doc.setDrawColor(50); doc.line(left, 28, 192, 28);
  text('HISTÓRICO DE RUÍDO - RELATÓRIO POR HORA', 39, 13, true);
  text(`${displayDay(day)} | ${pad(hour)}:00 às ${pad(hour)}:59 | Horário: ${context.timezone}`, 47, 9);
  const devices = [...new Set(summary.intervals.flatMap(i => i.devices))].join(', ') || 'Sem dispositivo nos registros';
  const source = filter.source === 'esp32' ? 'ESP32' : filter.source === 'simulation' ? 'Simulação' : 'Manual';
  autoTable(doc, {
    startY: 55, margin: { left, right: left }, theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, overflow: 'linebreak', textColor: 35, lineColor: 190, lineWidth: { bottom: 0.2 } },
    columnStyles: { 0: { cellWidth: 32, fontStyle: 'bold' }, 1: { cellWidth: 142 } },
    body: [ ['CONDOMÍNIO', context.condominium], ['BLOCO / UNIDADE', `${context.building} / Apartamento ${context.apartment_number}`],
      ['EMISSOR', context.emitter_name || 'Síndico autenticado'],
      ['DISPOSITIVO(S)', devices], ['ORIGEM', `${source} | ${filter.test ? 'Marcado como teste' : 'Não marcado como teste'}`],
      ['SENSOR', filter.sensor ? context.sensors.find(s => s.id === filter.sensor)?.label || 'Sensor selecionado' : 'Todos os sensores registrados no filtro'],
      ['EMISSÃO', new Date(response.generated_at || Date.now()).toLocaleString('pt-BR', { timeZone: context.timezone })], ['IDENTIFICADOR', reportId] ],
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  text('MEDIÇÕES DA HORA SELECIONADA', y, 11, true);
  autoTable(doc, {
    startY: y + 5, margin: { left, right: left }, theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, textColor: 35, lineColor: 150, lineWidth: 0.2 },
    headStyles: { fillColor: [240,240,240], textColor: 25, fontStyle: 'bold' },
    head: [['INTERVALO', 'MÉDIA* (dB)', 'MAIOR (dB)', 'LEITURAS']],
    body: summary.intervals.map(i => [`${i.start} - ${i.end}`, formatDb(i.leq), formatDb(i.max), String(i.count)]),
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  text('RESUMO DA HORA', y, 11, true);
  text(`Média*: ${formatDb(summary.leq)} dB | Maior leitura: ${formatDb(summary.max)} dB`, y + 8, 9);
  text(`Total: ${summary.count} leituras | Faixas de 10 s com dados: ${summary.coverage}/360`, y + 15, 9);
  const notes = [
    summary.count === 0 ? 'SEM REGISTROS para os filtros e a hora selecionados.' : summary.coverage < 360 ? 'DADOS INCOMPLETOS: existem intervalos sem medição registrada.' : 'Faixas de 10 segundos preenchidas; isso não comprova medição contínua.',
    '* Média energética das amostras, com pesos iguais; não representa Leq contínuo certificado.',
    'Referência de cobertura: 1 leitura a cada 10 s. Duplicatas não aumentam as faixas preenchidas.',
    'Medições estimadas pelo protótipo MAX9814. Sem gravação ou transmissão de áudio.',
    'Registro de monitoramento; não é laudo técnico nem prova conclusiva para multa.',
    'Documento gerado a partir de uma consulta. Identificador sem assinatura digital ou registro permanente.',
  ];
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(90);
  let noteY = y + 22;
  for (const note of notes) {
    const lines = doc.splitTextToSize(note, width);
    if (noteY + lines.length * 4 > 278) { doc.addPage(); noteY = 22; }
    doc.text(lines, left, noteY); noteY += lines.length * 4 + 2;
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFontSize(8); doc.setTextColor(110);
    doc.text(`dBSound | Relatório de monitoramento | Página ${page} de ${pages}`, left, 288);
  }
  return doc;
}
