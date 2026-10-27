const fs=require('fs');
const assert=require('node:assert/strict');
const {PGlite}=require('../web/node_modules/@electric-sql/pglite');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
(async()=>{
const db=new PGlite();let passed=0;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.condominiums(id uuid primary key,name text);
CREATE TABLE public.buildings(id uuid primary key,name text,condominium_id uuid);
CREATE TABLE public.apartments(id uuid primary key,number text,building_id uuid);
CREATE TABLE public.profiles(id uuid primary key,role text,condominium_id uuid);
CREATE TABLE public.devices(id uuid primary key,apartment_id uuid,device_uid text);
CREATE TABLE public.sensors(id uuid primary key,device_id uuid,name text,position text,channel integer);
CREATE TABLE public.noise_readings(id uuid default gen_random_uuid(),apartment_id uuid,device_id uuid,sensor_id uuid,decibel numeric(5,2),source text,is_test_data boolean,recorded_at timestamptz);
CREATE INDEX idx_noise_readings_apt_time ON public.noise_readings(apartment_id,recorded_at DESC);
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon; GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated,anon;
INSERT INTO public.condominiums VALUES ('${id(1)}','Residencial A'),('${id(2)}','Residencial B');
INSERT INTO public.buildings VALUES ('${id(3)}','A','${id(1)}'),('${id(4)}','B','${id(2)}');
INSERT INTO public.apartments VALUES ('${id(5)}','101','${id(3)}'),('${id(6)}','202','${id(4)}');
INSERT INTO public.profiles VALUES ('${id(7)}','admin','${id(1)}'),('${id(8)}','admin','${id(2)}'),('${id(9)}','resident','${id(1)}');
INSERT INTO public.devices VALUES ('${id(10)}','${id(5)}','ESP32-101'),('${id(11)}','${id(6)}','ESP32-202');
INSERT INTO public.sensors VALUES ('${id(12)}','${id(10)}','Sala','Sala',1),('${id(13)}','${id(11)}','Sala','Sala',1);
INSERT INTO public.noise_readings(apartment_id,device_id,sensor_id,decibel,source,is_test_data,recorded_at) VALUES
('${id(5)}','${id(10)}','${id(12)}',60,'esp32',false,'2026-10-15T16:00:00Z'),
('${id(5)}','${id(10)}','${id(12)}',70,'esp32',false,'2026-10-15T16:09:59Z'),
('${id(5)}','${id(10)}','${id(12)}',80,'esp32',false,'2026-10-15T16:10:00Z'),
('${id(5)}','${id(10)}','${id(12)}',90,'esp32',true,'2026-10-15T16:00:01Z'),
('${id(5)}','${id(10)}','${id(12)}',95,'simulation',true,'2026-10-15T16:00:02Z'),
('${id(5)}','${id(10)}','${id(12)}',45,'esp32',false,'2026-10-16T02:59:59Z'),
('${id(5)}','${id(10)}','${id(12)}',55,'esp32',false,'2026-10-16T03:00:00Z'),
('${id(6)}','${id(11)}','${id(13)}',100,'esp32',false,'2026-10-15T16:00:00Z');`);
await db.exec("ALTER TABLE public.profiles ADD COLUMN full_name text DEFAULT 'Sindico de teste'; ALTER TABLE public.profiles ADD COLUMN status text DEFAULT 'approved';");
await db.exec(fs.readFileSync('supabase/migrations/20261022000001_apartment_noise_history.sql','utf8'));
const session=async(uid,role='authenticated')=>{await db.exec(`RESET ROLE; SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${uid||''}',false);`)};
const read=async(mode='day',period='2026-10-15',source='esp32',test=false,apt=id(5),device=null,sensor=null)=> (await db.query('SELECT public.noise_history($1,$2,$3,$4,$5,$6,$7) AS result',[apt,period,mode,source,test,device,sensor])).rows[0].result;
const test=async(name,fn)=>{await fn();console.log('PASS',name);passed++};
await session(id(7));
await test('contexto limitado a unidade e sem token do dispositivo',async()=>{const r=await read('context');assert.equal(r.context.apartment_number,'101');assert.equal(r.context.building,'A');assert.equal(r.context.devices.length,1);assert.equal(JSON.stringify(r).includes('secret_token'),false)});
await test('fronteiras de dez minutos e média energética',async()=>{const r=await read();const b=r.buckets.find(b=>b.slot===78);assert.equal(b.count,2);assert.ok(Math.abs(b.leq_db-67.4036268949)<1e-8);assert.equal(b.max_db,70);assert.equal(r.buckets.find(b=>b.slot===79).count,1)});
await test('calendário por data de Fortaleza e sem mistura de teste',async()=>{const r=await read('month','2026-10-01');assert.deepEqual(r.days,[{day:'2026-10-15',count:4},{day:'2026-10-16',count:1}])});
await test('teste e simulador isolados',async()=>{assert.equal((await read('day','2026-10-15','esp32',true)).buckets[0].max_db,90);assert.equal((await read('day','2026-10-15','simulation',true)).buckets[0].max_db,95)});
await test('dia sem registros retorna vazio e não zeros fictícios',async()=>assert.deepEqual((await read('day','2026-10-14')).buckets,[]));
await test('admin não acessa outro condomínio ou hardware',async()=>{await assert.rejects(()=>read('day','2026-10-15','esp32',false,id(6)),e=>e.code==='42501');await assert.rejects(()=>read('day','2026-10-15','esp32',false,id(5),id(11)),e=>e.code==='42501')});
await test('rejeita datas futuras e origem inválida',async()=>{await assert.rejects(()=>read('day','2099-01-01'));await assert.rejects(()=>read('day','2026-10-15','all'))});
await test('morador não acessa o RPC administrativo',async()=>{await session(id(9));await assert.rejects(()=>read(),e=>e.code==='42501')});
await test('segundo admin isolado',async()=>{await session(id(8));await assert.rejects(()=>read(),e=>e.code==='42501');assert.equal((await read('day','2026-10-15','esp32',false,id(6))).buckets[0].max_db,100)});
await test('anônimo não executa RPC',async()=>{await session(null,'anon');await assert.rejects(()=>read(),e=>e.code==='42501')});
await db.close();console.log(`${passed} testes SQL aprovados em PostgreSQL isolado (PGlite).`);
})().catch(e=>{console.error(e);process.exitCode=1});
