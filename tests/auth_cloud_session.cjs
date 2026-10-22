const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('../web/node_modules/typescript');
const Module=require('node:module');
function loadAuth(configured, authResult) {
 let profileReads=0,stateIndex=0;const writes=[];
 const react={createContext:()=>({Provider:'Provider'}),createElement:(type,props)=>({type,props}),useState:initial=>{const index=stateIndex++;return[typeof initial==='function'?initial():initial,value=>writes.push({index,value})]},useEffect:()=>{},useContext:()=>null};
 const profile={id:'real-user',email:'owner@example.com',role:'admin',condominium_id:'real-condo',full_name:'Owner',created_at:'2026-01-01'};
 const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:profile,error:null})};
 const client={auth:{signInWithPassword:async()=>authResult},from:()=>chain};
 const m=new Module('AuthContext');m.require=name=>{
  if(name==='react')return {...react,default:react};
  if(name.includes('supabaseClient'))return{isSupabaseConfigured:configured,supabase:configured?client:null};
  if(name.includes('dataService'))return{DataService:{getProfiles:async()=>{profileReads++;return[{...profile,email:'admin@dbsound.com'}]}},localStore:{profiles:[],apartments:[]},getStoredAllocations:()=>({}),DEFAULT_CONDO_ID:'demo',DEFAULT_BUILDING_ID:'building'};
  throw Error(name);
 };
 m._compile(ts.transpileModule(fs.readFileSync('web/src/contexts/AuthContext.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,'AuthContext.cjs');
 return {auth:m.exports.AuthProvider({children:null}).props.value,writes,get profileReads(){return profileReads}};
}
(async()=>{
 const invalid=loadAuth(true,{data:{user:null},error:{message:'Invalid login credentials'}});
 const result=await invalid.auth.login('admin@dbsound.com','invalid');
 assert.equal(result.success,false);assert.equal(invalid.profileReads,0);assert.match(result.message,/Supabase não autenticou/);
 const valid=loadAuth(true,{data:{user:{id:'real-user',email:'owner@example.com',user_metadata:{}}},error:null});
 assert.equal((await valid.auth.login('owner@example.com','existing')).success,true);assert.equal(valid.profileReads,0);
 const local=loadAuth(false,null);assert.equal((await local.auth.login('admin@dbsound.com','demo')).success,true);
 assert.ok(local.writes.some(w=>w.index===3&&w.value===true));
 console.log('3 testes aprovados: falha cloud sem fallback admin, sessão cloud válida, demonstração local identificada.');
})().catch(e=>{console.error(e);process.exitCode=1});
