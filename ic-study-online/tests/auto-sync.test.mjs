import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const empty=()=>({version:1,responses:{},bookmarks:{},notes:{},overrides:{},daily:{},sessions:[],deletedSessions:[],history:[],studyPlan:{checks:{},cards:{}},session:null,accountLook:{palette:'mint'}});
const saved=(id,answers={},updated=1)=>({id,mode:'practice',ids:['a','b','e'],index:0,answers,drafts:{},updated});
function context(){const c=vm.createContext({validate:s=>structuredClone(s)});vm.runInContext(fs.readFileSync('account/progress-merge.js','utf8'),c);return c}
function merge(a,b,base,options){const c=context();Object.assign(c,{a,b,base,options});return JSON.parse(vm.runInContext('JSON.stringify(icReconcileProgress(a,b,base,options))',c))}

test('Two devices merge checked answers and the latest response to a repeated question, including E',()=>{
 const base=empty(),a=empty(),b=empty();a.responses.a={value:[0],at:1};b.responses.b={value:[1],at:2};a.responses.e={value:[4],at:4};b.responses.e={value:[2],at:3};
 const out=merge(a,b,base);assert.deepEqual(Object.keys(out.responses).sort(),['a','b','e']);assert.deepEqual(out.responses.e.value,[4]);
});
test('Simultaneous work in the same session keeps both answers and the question open on this device',()=>{
 const base=empty();base.session=saved('one');base.sessions=[base.session];const a=structuredClone(base),b=structuredClone(base);
 a.session.answers.a=[0];a.session.drafts.a=[0];a.session.index=1;a.session.updated=5;
 b.session.answers.e=[4];b.session.drafts.e=[4];b.session.index=2;b.session.updated=6;
 const out=merge(a,b,base);assert.deepEqual(out.session.answers,{a:[0],e:[4]});assert.deepEqual(out.session.drafts,{a:[0],e:[4]});assert.equal(out.session.index,1);assert.deepEqual(out.sessions[0],out.session);
});
test('Remote edits arrive while local bookmark removal and note edits are retained',()=>{
 const base=empty();base.bookmarks.a=true;base.notes.a='old';const a=structuredClone(base),b=structuredClone(base);
 delete a.bookmarks.a;a.notes.a='local';b.bookmarks.b=true;b.notes.b='remote';b.accountLook.palette='ocean';
 const out=merge(a,b,base);assert.deepEqual(out.bookmarks,{b:true});assert.deepEqual(out.notes,{a:'local',b:'remote'});assert.equal(out.accountLook.palette,'ocean');
});
test('Session deletion syncs, preserves answers, and a later restore is respected',()=>{
 const base=empty();base.session=saved('one',{a:[0]});base.sessions=[base.session];base.responses.a={value:[0],at:1};
 const a=structuredClone(base),b=structuredClone(base);a.deletedSessions=[a.session];a.sessions=[];a.session=null;
 const deleted=merge(a,b,base);assert.equal(deleted.sessions.length,0);assert.equal(deleted.session,null);assert.ok(deleted.responses.a);assert.equal(deleted.deletedSessions.length,1);
 const restored=structuredClone(deleted);restored.sessions=restored.deletedSessions;restored.deletedSessions=[];
 const out=merge(restored,deleted,deleted);assert.equal(out.sessions.length,1);assert.equal(out.deletedSessions.length,0);
});
test('Old clients without a saved base keep both devices’ answers, sessions and notes',()=>{
 const a=empty(),b=empty();a.responses.a={value:[0],at:1};b.responses.b={value:[1],at:2};a.sessions=[saved('a')];b.sessions=[saved('b')];a.notes.a='a';b.notes.b='b';
 const out=merge(a,b,null);assert.equal(Object.keys(out.responses).length,2);assert.equal(out.sessions.length,2);assert.deepEqual(out.notes,{a:'a',b:'b'});
});
test('Completed exam history is deduplicated and completion does not revert on a stale device',()=>{
 const base=empty(),a=empty(),b=empty();a.session=saved('exam',{a:[0]},2);b.session={...saved('exam',{e:[4]},3),status:'completed'};a.history=[{sessionId:'exam',finished:2}];b.history=[{sessionId:'exam',finished:3}];
 const out=merge(a,b,base);assert.equal(out.session.status,'completed');assert.equal(out.history.length,1);assert.equal(out.history[0].finished,3);
});
test('Exam review marks merge per question and survive concurrent submission',()=>{
 const base=empty();base.bookmarks.e=true;
 base.session={...saved('exam'),mode:'exam',examMarks:{a:true}};base.sessions=[base.session];
 const a=structuredClone(base),b=structuredClone(base);
 delete a.session.examMarks.a;a.session.examMarks.b=true;
 b.session.examMarks.e=true;b.session.status='completed';
 b.history=[{sessionId:'exam',finished:3,examMarks:{...b.session.examMarks}}];b.session=null;
 const out=merge(a,b,base);
 assert.deepEqual(out.sessions[0].examMarks,{b:true,e:true});
 assert.deepEqual(out.history[0].examMarks,{b:true,e:true});
 assert.deepEqual(out.bookmarks,{e:true});
});

function clientHarness(){
 const data=new Map(),c=context(),server={state:empty(),revision:1,requests:[],fail:false,race:null};
 Object.assign(c,{IC_BOOT:{user:{id:'test'},revision:1},S:empty(),KEY:'state',initial:empty,
  localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},
  document:{getElementById:()=>null,activeElement:null,visibilityState:'visible'},window:{scrollX:0,scrollY:350,scrollTo(){}},restoreSessionDraft(){},render(){},setTimeout:()=>1,clearTimeout(){},
  fetch:async(path,options)=>{if(server.fail)throw Error('offline');if(options.method==='GET')return {ok:true,json:async()=>structuredClone(server)};
   const request=JSON.parse(options.body);server.requests.push(request);if(server.race){server.race(c,server);server.race=null}
   if(request.revision!==server.revision)return {ok:false,status:409,json:async()=>({error:'conflict'})};
   server.state=request.state;server.revision++;return {ok:true,json:async()=>({revision:server.revision})};}
 });
 const source=fs.readFileSync('account/account-client.js','utf8');vm.runInContext(source.slice(0,source.indexOf('function icAccountPanel')),c);
 c.base=empty();vm.runInContext('icBase=base;icLastSerialized=JSON.stringify(S)',c);return {c,server,data};
}
test('A stale revision automatically fetches, merges live local edits and retries without a recovery prompt',async()=>{
 const {c,server}=clientHarness();c.S.responses.a={value:[0],at:1};vm.runInContext('icQueueSync()',c);
 server.race=(c,s)=>{s.revision++;s.state.responses.b={value:[1],at:2};c.S.responses.e={value:[4],at:3}};
 await vm.runInContext('icFlush()',c);assert.equal(server.requests.length,2);assert.equal(Object.keys(server.state.responses).length,3);
 assert.equal(vm.runInContext('icDirty||icConflict',c),false);assert.equal(c.window.scrollY,350);
});
test('Glass preference persists online and can be turned off on another device',async()=>{
 const {c,server}=clientHarness();
 c.look={palette:'mint',opacity:10,effects:true,fit:'cover',glass:true};
 c.applyLook=()=>{};c.saveLookSettings=()=>{};
 vm.runInContext('icQueueSync()',c);
 await vm.runInContext('icFlush()',c);
 assert.equal(server.state.accountLook.glass,true);
 server.state.accountLook.glass=false;
 server.revision++;
 await vm.runInContext('icRefreshCloud()',c);
 assert.equal(c.look.glass,false);
});
test('Disconnected changes stay queued and save automatically after reconnect',async()=>{
 const {c,server,data}=clientHarness();server.fail=true;c.S.responses.e={value:[4],at:3};vm.runInContext('icQueueSync()',c);await vm.runInContext('icFlush()',c);
 assert.equal(JSON.parse(data.get('ic-sync:test')).dirty,true);assert.ok(JSON.parse(data.get('state')).responses.e);
 server.fail=false;await vm.runInContext('icFlush()',c);assert.equal(JSON.parse(data.get('ic-sync:test')).dirty,false);assert.deepEqual(server.state.responses.e.value,[4]);
});
test('Clean device receives new cloud answers without writing or moving its open question',async()=>{
 const {c,server}=clientHarness();c.S.session=saved('one',{},1);c.S.session.index=1;c.S.sessions=[c.S.session];
 server.state.session=saved('one',{e:[4]},3);server.state.session.index=2;server.state.sessions=[server.state.session];server.state.responses.e={value:[4],at:3};server.revision=2;
 await vm.runInContext('icRefreshCloud()',c);assert.deepEqual(c.S.responses.e.value,[4]);assert.equal(c.S.session.index,1);assert.equal(server.requests.length,0);assert.equal(vm.runInContext('icDirty',c),false);
});
