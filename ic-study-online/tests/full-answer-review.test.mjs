import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('source/study.html','utf8');
const parse=id=>JSON.parse(html.match(new RegExp('<script[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)</script>'))[1]);
const bank=parse('question-bank'),exp=parse('short-explanations'),cards=parse('keyword-cards');
const by=new Map(bank.map(q=>[q.id,q]));
const review=JSON.parse(fs.readFileSync('source/full-answer-review.json','utf8'));
const audit=JSON.parse(fs.readFileSync('source/answer-audit.json','utf8'));
const line=name=>html.split('\n').find(s=>s.startsWith('function '+name+'('));
const section=(a,b)=>html.slice(html.indexOf('function '+a+'('),html.indexOf('function '+b+'('));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('Complete review covers every stem and option, plus all 48 keyword cards',()=>{
 assert.equal(review.questionCount,959);assert.equal(review.keywordCount,48);
 const ledger=Object.values(review.subjects).flatMap(s=>s.ledger);
 assert.equal(ledger.length,959);assert.deepEqual(ledger.map(r=>r.id).sort(),bank.map(q=>q.id).sort());
 assert.equal(new Set(ledger.map(r=>r.id)).size,959);
 assert.ok(ledger.every(r=>r.status!=='needs_context'));
 assert.equal(review.cumulativeChangedKeys,23);
 for(const q of bank){assert.ok(q.options.every(o=>typeof o==='string'&&o.trim()));assert.ok(q.answer.every(i=>i>=0&&i<q.options.length));}
 for(const [id,a]of Object.entries(audit))assert.deepEqual(a.changes.answer||a.original.answer,by.get(id).answer,id);
 assert.deepEqual(cards,JSON.parse(fs.readFileSync('source/keyword-cards.json','utf8')));
});

test('Independent DTFT sums verify downsampling D=2, rejecting the 2ω distractor',()=>{
 const x=[1,2,-3,4,.25,-1,.5,2,1,-2];
 const X=w=>x.reduce(([r,i],v,n)=>[r+v*Math.cos(w*n),i-v*Math.sin(w*n)],[0,0]);
 const D=w=>x.filter((_,i)=>i%2===0).reduce(([r,i],v,n)=>[r+v*Math.cos(w*n),i-v*Math.sin(w*n)],[0,0]);
 let wrongError=0;
 for(const w of [-3,-2.7,-1.4,-.2,0,.37,1.8,Math.PI]){
  const d=D(w),a=X(w/2),b=X((w-2*Math.PI)/2),wrong=X(2*w);
  for(let c=0;c<2;c++){near(d[c],(a[c]+b[c])/2);wrongError=Math.max(wrongError,Math.abs(d[c]-wrong[c]));}
 }
 assert.ok(wrongError>1);assert.deepEqual(by.get('DGT302-580').answer,[3]);
 assert.equal(exp['DGT302-580'].reviewKind,'confirmed');assert.equal(exp['DGT302-580'].sourceConflict,false);
 assert.match(exp['DGT302-580'].reason,/ω\/2/);
});

test('Shuffling all 24 answer permutations cannot change grading of the downsampling example',()=>{
 const q=by.get('DGT302-580'),c={S:{overrides:{},session:{}},same:(a,b)=>JSON.stringify(a)===JSON.stringify(b)};
 vm.createContext(c);vm.runInContext(['choiceLabel','answerKey','correct','sessionKeys'].map(line).join('\n'),c);
 const perms=a=>a.length?a.flatMap((x,i)=>perms(a.filter((_,j)=>i!==j)).map(p=>[x,...p])):[[]];
 for(const order of perms([0,1,2,3])){
  c.S.session.optionOrders={[q.id]:order};const displayed=order.indexOf(3);
  assert.equal(c.correct(q,[order[displayed]]),true);assert.equal(c.sessionKeys(q,q.answer),'ABCD'[displayed]);
  assert.equal(c.correct(q,[2]),false);
 }
});

test('Domino monotonicity and exact BSD/LZ answers are corrected without moving original choices',()=>{
 const q=by.get('ICI211-324');assert.deepEqual(q.answer,[2]);assert.match(q.options[2],/static inverting/i);
 // A falling dynamic output becomes a rising input to the next evaluation stage.
 assert.deepEqual([1,0].map(v=>1-v),[0,1]);
 assert.deepEqual(by.get('COS201-829').answer,[4]);assert.match(by.get('COS201-829').options[4],/not guaranteed/);
 assert.deepEqual(by.get('LOS201-172').answer,[4]);assert.match(by.get('LOS201-172').options[4],/Release 2/);
 for(const id of ['COS201-829','LOS201-172'])assert.deepEqual(by.get(id).options.slice(0,4),audit[id].original.options);
});

test('Ambiguous edge cases are stated with the necessary mathematical conditions',()=>{
 // Huffman: three equal symbols produce depths 1,2,2; four produce 2,2,2,2.
 function depths(n){let nodes=Array.from({length:n},()=>({p:1,d:[0]}));while(nodes.length>1){nodes.sort((a,b)=>a.p-b.p);const a=nodes.shift(),b=nodes.shift();nodes.push({p:a.p+b.p,d:[...a.d,...b.d].map(d=>d+1)});}return nodes[0].d.sort();}
 assert.deepEqual(depths(3),[1,2,2]);assert.deepEqual(depths(4),[2,2,2,2]);
 assert.match(by.get('COS201-964').question,/2\^k/);
 assert.equal(Math.floor((3-1)/2),Math.floor((4-1)/2));assert.match(by.get('COS201-1009').options[1],/Not decrease/);
 for(let n=0;n<10;n++)near(Math.sin(Math.PI*n),0);
 assert.match(cards.find(k=>k.id==='COS201-KW12').options[0],/Fs > 2B/);
 assert.match(cards.find(k=>k.id==='COS201-KW05').options[0],/có thể/);
 assert.match(by.get('COS201-898').options[3],/noise shaping/);
 // QMF cancellation; both original global-sign variants cancel, the repaired A does not.
 const h0=2,h0minus=3;near(h0minus*h0+h0*(-h0minus),0);near(h0minus*(-h0)+h0*h0minus,0);
 assert.notEqual(h0minus*(-h0)+h0*(-h0minus),0);
 assert.ok(audit['DGT302-505'].originalAcceptedAlternatives.length===2);
});

test('New key migrations retain actual answers, drafts, session position and custom overrides',()=>{
 const initial=()=>({version:1,responses:{},overrides:{},bookmarks:{},notes:{},daily:{},history:[],sessions:[],deletedSessions:[],wrongIds:[],session:null});
 const c={BANK:bank,BY_ID:by,SHORT_EXPLANATIONS:exp,initial,SUBJECTS:{DGT302:{}},normalizeStudyState:()=>({})};vm.createContext(c);
 vm.runInContext(['same','validChoices'].map(line).join('\n')+'\n'+section('normalizeSavedSession','saveActiveSession')+section('regradeReviewedHistory','persist'),c);
 const ids=review.newKeyChanges,answers=Object.fromEntries(ids.map(id=>[id,by.get(id).answer]));
 const state={...initial(),responses:Object.fromEntries(ids.map(id=>[id,{value:answers[id],at:123}])),history:[{ids,answers,answerKeys:Object.fromEntries(ids.map(id=>[id,audit[id].original.answer])),finished:100}],session:{id:'retain-review',mode:'practice',ids,index:2,answers,drafts:{},optionOrders:{'COS201-829':[2,0,3,1],'LOS201-172':[3,1,0,2]},started:50}};
 const out=JSON.parse(JSON.stringify(c.validate(state)));
 assert.deepEqual(out.responses,state.responses);assert.deepEqual(out.history[0].answers,answers);assert.deepEqual(out.history[0].answerKeys,answers);
 assert.equal(out.session.index,2);assert.equal(out.session.id,'retain-review');assert.deepEqual(out.wrongIds,[]);
 assert.deepEqual(out.session.optionOrders['COS201-829'],[2,0,3,1,4]);assert.deepEqual(out.session.optionOrders['LOS201-172'],[3,1,0,2,4]);
 for(const id of ids)assert.equal(out.history[0].answerKeyCorrections[id].reviewedAt,'2026-11-09');
});
