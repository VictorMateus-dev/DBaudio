const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {createRequire}=require('node:module');
const requireWeb=createRequire(path.resolve('web/package.json'));
const ts=requireWeb('typescript');
const load=(filename,deps={})=>{const exports={};const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','exports',code)(name=>deps[name]||requireWeb(name),exports);return exports};
const history=load('web/src/lib/noiseHistory.ts');
const pdf=load('web/src/lib/auditPdf.ts',{'./noiseHistory':history});
const hours=history.buildHours([{slot:78,count:2,energy_sum:11000000,leq_db:67.4036268949,max_db:70,occupied_slots:2,devices:['ESP32-TESTE-01']}]);
assert.equal(hours.length,24);assert.equal(hours[13].intervals.length,6);assert.equal(hours[13].count,2);assert.ok(Math.abs(hours[13].leq-67.4036268949)<1e-8);assert.equal(hours[0].leq,null);assert.equal(hours[23].intervals[5].end,'23:59');
assert.equal(history.monthDays('2024-02').filter(Boolean).length,29);
assert.equal(history.todayFortaleza(new Date('2026-10-16T02:59:59Z')),'2026-10-15');
assert.throws(()=>history.buildHours([{slot:144,count:1}]));
const context={emitter_name:'Síndico de teste',apartment_id:'unit',apartment_number:'101',building:'Bloco A',condominium:'Residencial dBSound',condominium_id:'condo',timezone:'America/Fortaleza',devices:[],sensors:[]};
const empty=pdf.createAuditPdf({context,buckets:[],days:[],generated_at:'2026-10-27T20:00:00Z'},'2026-10-26',13,{source:'esp32',test:true,device:'',sensor:''},'teste-sem-registros');
assert.equal(empty.getNumberOfPages(),1);
assert.ok(empty.output().includes('SEM REGISTROS'));assert.ok(empty.output().includes('DADOS DE TESTE'));
console.log('PASS: 24 hours, six intervals, energetic weighting, missing readings, calendar leap year, timezone, invalid aggregation, empty PDF and test label');
if(process.env.AUDIT_PDF_FIXTURE){const fixture=JSON.parse(fs.readFileSync(process.env.AUDIT_PDF_FIXTURE,'utf8'));const report=pdf.createAuditPdf(fixture,'2026-10-26',19,{source:'esp32',test:true,device:'',sensor:''},'exemplo-validacao-26out-19h');assert.equal(report.getNumberOfPages(),1);fs.writeFileSync('../outputs/dBSound-auditoria-101-2026-10-26-19h.pdf',Buffer.from(report.output('arraybuffer')));console.log('PDF verified and saved');}
