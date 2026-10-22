const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('../web/node_modules/typescript');
const Module = require('node:module');
const source = fs.readFileSync('web/src/lib/noisePolicy.ts', 'utf8');
const moduleUnderTest = new Module('noisePolicy');
moduleUnderTest._compile(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, 'noisePolicy.cjs');
const { activePolicy, validatePolicies, advanceEpisode, noiseElapsed } = moduleUnderTest.exports;
const base={id:'day',name:'Diurna',enabled:true,start_time:'07:00',end_time:'22:00',warning_threshold_db:70,critical_threshold_db:80,min_duration_seconds:3,cooldown_seconds:60};
const night={...base,id:'night',name:'Noturna',start_time:'22:00',end_time:'07:00',warning_threshold_db:60,critical_threshold_db:70};
const policies=[base,night];let passed=0;
function test(name,fn){fn(); console.log('PASS',name);passed++;}
const at=t=>new Date('2026-10-22T'+t+'-03:00');
test('24h, midnight and exact boundaries in Brasília independent of machine timezone',()=>{
 for(const [time,id] of [['06:59:59','night'],['07:00:00','day'],['21:59:59','day'],['22:00:00','night'],['00:00:00','night']])assert.equal(activePolicy(policies,at(time)).id,id);
 assert.equal(activePolicy([{...base,enabled:false}],at('12:00:00')),undefined);
});
test('valid schedule and thresholds',()=>assert.equal(validatePolicies(policies),null));
test('overlap and gaps rejected',()=>{
 assert.match(validatePolicies([base,{...night,start_time:'21:00'}]),/sobrepor/);
 assert.match(validatePolicies([base,{...night,start_time:'23:00'}]),/24 horas/);
});
test('invalid numeric inputs, reversed thresholds, equal times rejected',()=>{
 for(const update of [{critical_threshold_db:NaN},{critical_threshold_db:69},{min_duration_seconds:0},{cooldown_seconds:0},{start_time:'22:00'},{start_time:'25:00'}])assert.ok(validatePolicies([{...base,...update},night]));
});
const now=at('12:00:10').getTime();const sample=(db,offset)=>({apartment_id:'101',decibel:db,recorded_at:new Date(now+offset).toISOString()});
test('a single reading polled repeatedly never meets duration',()=>{
 let e=advanceEpisode(undefined,sample(80,-4000),base,now);
 e=advanceEpisode(e,sample(80,-4000),base,now);assert.equal(e.last-e.since,0);
});
test('threshold equality, sustained samples and below threshold reset',()=>{
 let e=advanceEpisode(undefined,sample(80,-4000),base,now);
 e=advanceEpisode(e,sample(81,0),base,now);assert.ok(e.last-e.since>=3000);
 assert.equal(advanceEpisode(e,sample(79,0),base,now),undefined);
});
test('dismissal survives subsequent high readings; normalized episode can rearm',()=>{
 let e=advanceEpisode(undefined,sample(85,-4000),base,now);e.dismissed=true;
 e=advanceEpisode(e,sample(86,0),base,now);assert.equal(e.dismissed,true);
 e=advanceEpisode(e,sample(60,0),base,now);
 e=advanceEpisode(e,sample(85,0),base,now);assert.equal(e.dismissed,false);
});
test('stale/future/nonfinite readings do not open modal',()=>{
 for(const [db,offset] of [[85,-31000],[85,2000],[NaN,0]])assert.equal(advanceEpisode(undefined,sample(db,offset),base,now),undefined);
});
test('configuration change resets duration',()=>{
 let e=advanceEpisode(undefined,sample(85,-4000),base,now);
 e=advanceEpisode(e,sample(85,0),{...base,critical_threshold_db:84},now);assert.equal(e.last-e.since,0);
});
test('reading from previous period cannot trigger new period',()=>{
 assert.equal(advanceEpisode(undefined,{apartment_id:'101',decibel:85,recorded_at:at('21:59:59').toISOString()},night,at('22:00:01').getTime()),undefined);
});
test('clock shows ten minutes, pluralization and hours',()=>{
 assert.deepEqual(noiseElapsed(0,600000),{clock:'00:10:00',text:'10 minutos e 0 segundos'});
 assert.deepEqual(noiseElapsed(0,3661000),{clock:'01:01:01',text:'1 hora e 1 minuto e 1 segundo'});
 assert.equal(noiseElapsed(1000,0).clock,'00:00:00');
});
test('continuous readings preserve original start for ten minutes',()=>{
 let e;
 for(let i=0;i<=600;i+=10){const timestamp=now+i*1000;e=advanceEpisode(e,{apartment_id:'101',decibel:85,recorded_at:new Date(timestamp).toISOString()},base,timestamp);}
 assert.equal(e.since,now);assert.equal(noiseElapsed(e.since,now+600000).clock,'00:10:00');
 assert.equal(advanceEpisode(e,{apartment_id:'101',decibel:60,recorded_at:new Date(now+610000).toISOString()},base,now+610000),undefined);
});
console.log(`${passed} tests passed`);
