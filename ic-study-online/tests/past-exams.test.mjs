import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {database, assets} from './d1-adapter.mjs';
import {fetchApp, passwordHash} from '../dist/server/index.js';

const exams = JSON.parse(fs.readFileSync('source/past-exams.json', 'utf8'));
const plain = value => JSON.parse(JSON.stringify(value));
const context = vm.createContext({document: {
 getElementById: () => ({textContent: JSON.stringify(exams)}),
 addEventListener() {}
}});
vm.runInContext(fs.readFileSync('source/past-exams.js', 'utf8') + '\n' + fs.readFileSync('account/progress-merge.js', 'utf8'), context);

test('Past papers cover all twelve source posts with fifty distinct attachment links per paper', () => {
 assert.equal(exams.length, 12);
 assert.equal(new Set(exams.map(exam => exam.id)).size, 12);
 for (const subject of ['ICI211', 'COS201', 'LOS201', 'DGT302']) {
  const papers = exams.filter(exam => exam.subject === subject);
  assert.equal(papers.length, 3);
  assert.deepEqual(papers.map(exam => [exam.term, exam.retake]), [['FA26', false], ['SU26', true], ['SU26', false]]);
 }
 for (const exam of exams) {
  assert.equal(exam.pages.length, 50);
  assert.equal(new Set(exam.pages.map(page => page.url)).size, 50);
  for (const page of exam.pages) {
   assert.equal(new URL(page.url).hostname, 'fuexam.me');
   assert.match(new URL(page.url).pathname, /^\/attachments\//);
  }
 }
});

test('All 600 screenshots have selectable text, valid answer keys, reasons and local original images', () => {
 const ids = new Set();
 for (const exam of exams) for (const question of exam.pages) {
  assert.ok(!ids.has(question.id)); ids.add(question.id);
  assert.ok(question.question.length >= 10);
  assert.ok(question.options.length >= 4 && question.options.length <= 5);
  assert.ok(question.options.every(option => typeof option === 'string' && option.trim().length));
  assert.ok(question.answer.length > 0 && question.answer.length <= 3);
  assert.equal(question.pickCount, question.answer.length);
  assert.ok(question.answer.every(index => Number.isInteger(index) && index >= 0 && index < question.options.length));
  assert.ok(question.reason.length >= 15);
  assert.ok(fs.existsSync('public/' + question.image.replace(/^\.\//, '')));
  assert.equal(new URL(question.mediaUrl).hostname, 'fuexam.me');
 }
 assert.equal(ids.size, 600);
});

test('Corrected scientific keys distinguish convolution, multiplication, FFT signs and incomplete source choices', () => {
 const byId = new Map(exams.flatMap(exam => exam.pages.map(question => [question.id, question])));
 const expected = {
  'dgt302-su26-fe-019': [3], 'dgt302-su26-fe-029': [2],
  'dgt302-su26-fe-038': [1], 'dgt302-su26-fe-re-033': [1],
  'dgt302-fa26-fe-026': [0], 'dgt302-fa26-fe-042': [0],
  'cos201-fa26-fe-030': [0], 'cos201-su26-fe-031': [1],
  'los201-fa26-fe-014': [0, 1, 3]
 };
 for (const [id, answer] of Object.entries(expected)) assert.deepEqual(byId.get(id).answer, answer, id);
 assert.equal(byId.get('dgt302-fa26-fe-026').options[0], 'Ω_c = tan(0.1) rad/s');
});

test('Source transcription records retain the original wording and option count with matching source-image hashes', () => {
 const transcripts = JSON.parse(fs.readFileSync('source/past-exam-transcripts.json','utf8'));
 assert.equal(Object.keys(transcripts).length,600);
 for (const exam of exams) for (const q of exam.pages) {
  const transcript = transcripts[q.id];
  const original=q.sourceCorrection||q;
  assert.deepEqual({question:original.question,options:original.options,pickCount:original.pickCount},{question:transcript.question,options:transcript.options,pickCount:transcript.pickCount});
  assert.equal(createHash('sha256').update(fs.readFileSync('public/'+q.image.replace(/^\.\//,''))).digest('hex'),transcript.imageSha256,q.id);
 }
 const byId = new Map(exams.flatMap(exam=>exam.pages.map(q=>[q.id,q])));
 assert.equal(byId.get('cos201-fa26-fe-001').sourceCorrection.question,'In-phase and quadrature');
 assert.deepEqual(byId.get('cos201-fa26-fe-001').options,['DC and AC','Input and output','In-phase and quadrature','DC and AC']);
 assert.equal(byId.get('cos201-fa26-fe-014').sourceCorrection.question,'If one OFDM subcarrier is lost, system will:');
 assert.match(byId.get('ici211-su26-fe-045').sourceCorrection.question,/Sense Delay Flip-Flop/);
 assert.equal(byId.get('dgt302-fa26-fe-016').sourceCorrection.options[1],'E_min^c > E_min^nc');
 assert.equal(byId.get('dgt302-fa26-fe-016').options[1],'E_min^c ≥ E_min^nc');
 assert.equal(byId.get('dgt302-su26-fe-037').sourceCorrection.options[0],'N = 2, where v is an integer.');
 assert.match(byId.get('dgt302-su26-fe-037').options[0],/2\^v/);
 assert.ok(!byId.get('dgt302-fa26-fe-017').question.includes('Index each tap'));
 assert.ok(!byId.get('cos201-fa26-fe-048').sourceCorrection.question.includes('AWGN'));
});

test('A future ungradable question still records the selection without a false grade', () => {
 const q = {...exams.find(e=>e.id==='dgt302-fa26-fe').pages[25],answer:[],questionRevision:undefined,caveat:'Đáp án nguồn chưa đủ để chấm câu này.'};
 context.esc = text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;');
 context.choiceLabel = index=>String.fromCharCode(65+index);
 for (const choice of [0,1,2,3]) {
  assert.equal(context.pastExamCorrect(q,{value:[choice],checked:true}),null);
  const feedback = context.pastExamFeedback(q,{value:[choice],checked:true},[0,1,2,3]);
  assert.match(feedback,/không chấm đúng\/sai/);
  assert.match(feedback,/Đề gốc có vấn đề/);
  assert.ok(!feedback.includes('Trả lời đúng') && !feedback.includes('Trả lời chưa đúng'));
 }
});

test('Equivalent QMF source choices remain visible and either single answer is accepted', () => {
 const q=exams.find(e=>e.id==='dgt302-su26-fe').pages[23];
 assert.equal(q.pickCount,1);
 assert.equal(q.options[0],'G0(z) = -H0(z) and G1(z) = H0(-z)');
 assert.equal(q.options[3],'G0(z) = H0(z) and G1(z) = -H0(-z)');
 assert.equal(context.pastExamCorrect(q,{value:[0],checked:true}),true);
 assert.equal(context.pastExamCorrect(q,{value:[3],checked:true}),true);
 assert.equal(context.pastExamCorrect(q,{value:[0,3],checked:true}),false);
});

test('Loading older progress retains other work when a previously added source option is removed', () => {
 const reduced='cos201-fa26-fe', five='cos201-fa26-fe';
 const restored=plain(context.normalizePastExamStudy({[reduced]:{index:36,updated:100,resetAt:20,reviewed:{29:50},answers:{29:{value:[4],checked:true,at:50},36:{value:[4],checked:false,at:80}},optionOrders:{29:[4,3,2,1,0],36:[4,3,2,1,0]}}}));
 assert.equal(restored[five].index,36);
 assert.equal(restored[five].resetAt,20);
 assert.ok(!restored[reduced].answers[29]);
 assert.deepEqual(restored[five].answers[36],{value:[4],checked:false,at:80});
 assert.deepEqual(restored[five].optionOrders[36],[4,3,2,1,0]);
});

test('Answer shuffling survives visits and grading uses canonical indices, with hidden answers until checked', () => {
 const id = exams[0].id, q = exams[0].pages[0];
 vm.runInContext(`var S={pastExamStudy:{}}, view='past-exams'; var persist=()=>{}, render=()=>{}, shuffle=values=>values.reverse(); pastExamId=${JSON.stringify(id)}; pastExamIndex=0;`, context);
 context.pastExamVisit();
 const order = plain(vm.runInContext('S.pastExamStudy[pastExamId].optionOrders[0]', context));
 assert.deepEqual(order, [3,2,1,0]);
 context.pastExamChoose(q.answer[0]);
 assert.equal(context.pastExamCorrect(q, vm.runInContext('S.pastExamStudy[pastExamId].answers[0]', context)), null);
 context.pastExamCheck();
 assert.equal(context.pastExamCorrect(q, vm.runInContext('S.pastExamStudy[pastExamId].answers[0]', context)), true);
 context.pastExamChoose((q.answer[0]+1)%4);
 assert.equal(context.pastExamCorrect(q, vm.runInContext('S.pastExamStudy[pastExamId].answers[0]', context)), true);
 context.pastExamVisit();
 assert.deepEqual(plain(vm.runInContext('S.pastExamStudy[pastExamId].optionOrders[0]', context)), order);
 context.pastExamRetry();
 assert.equal(context.pastExamCorrect(q, vm.runInContext('S.pastExamStudy[pastExamId].answers[0]', context)), null);
 context.pastExamChoose((q.answer[0]+1)%4); context.pastExamCheck();
 assert.equal(context.pastExamCorrect(q, vm.runInContext('S.pastExamStudy[pastExamId].answers[0]', context)), false);
});

test('Multiple-answer grading requires the exact answer set, independent of selection order', () => {
 const q = exams.find(exam => exam.id === 'los201-fa26-fe').pages[13];
 assert.equal(context.pastExamCorrect(q, {value:[3,0,1],checked:true}), true);
 assert.equal(context.pastExamCorrect(q, {value:[0,1],checked:true}), false);
 assert.equal(context.pastExamCorrect(q, {value:[0,1,2,3],checked:true}), false);
});

test('Device merge preserves separate question answers and a newer retry clears a previously checked answer', () => {
 const id = exams[0].id;
 const local = {[id]:{index:1,updated:400,answers:{0:{value:[],checked:false,at:400},1:{value:[1],checked:true,at:300}},optionOrders:{0:[3,2,1,0]},reviewed:{0:200,1:300}}};
 const remote = {[id]:{index:2,updated:350,answers:{0:{value:[0],checked:true,at:200},2:{value:[2],checked:false,at:350}},optionOrders:{0:[0,1,2,3],2:[2,3,0,1]},reviewed:{0:200}}};
 const merged = plain(context.icMergePastExamStudy(local, remote))[id];
 assert.deepEqual(merged.answers[0], local[id].answers[0]);
 assert.deepEqual(merged.answers[1], local[id].answers[1]);
 assert.deepEqual(merged.answers[2], remote[id].answers[2]);
 assert.deepEqual(merged.optionOrders[0], [3,2,1,0]);
 assert.deepEqual(merged.optionOrders[2], [2,3,0,1]);
 assert.equal(merged.index, 1);
});

test('Reset clears only the open paper, returns to question one, and regenerates stable answer order', () => {
 const id = exams[0].id, other = exams[1].id;
 const state = {responses:{'DGT302-529':{value:[2],at:10}},pastExamStudy:{
  [id]:{index:4,updated:50,reviewed:{0:20,4:50},answers:{0:{value:[0],checked:true,at:20},4:{value:[1],checked:false,at:50}},optionOrders:{0:[0,1,2,3],4:[0,1,2,3]}},
  [other]:{index:2,updated:40,reviewed:{1:30},answers:{1:{value:[2],checked:true,at:30}},optionOrders:{1:[2,1,3,0]}}
 }};
 vm.runInContext(`S=${JSON.stringify(state)};pastExamId=${JSON.stringify(id)};pastExamIndex=4;`, context);
 context.$ = () => ({close(){}});
 context.document.querySelector = () => null;
 context.studyRouteUrl = (section, fields) => '#' + section + '?' + new URLSearchParams(fields);
 context.writeStudyRoute = () => {};
 context.openStudyRoute = () => context.pastExamVisit();
 context.toast = () => {};
 context.pastExamReset();
 const saved = plain(vm.runInContext('S', context));
 const reset = saved.pastExamStudy[id];
 assert.equal(reset.index, 0);
 assert.ok(reset.resetAt > 0);
 assert.deepEqual(reset.answers, {});
 assert.deepEqual(reset.reviewed, {});
 assert.deepEqual(reset.optionOrders, {0:[3,2,1,0]});
 assert.deepEqual(saved.pastExamStudy[other], state.pastExamStudy[other]);
 assert.deepEqual(saved.responses, state.responses);
 assert.deepEqual(plain(context.normalizePastExamStudy(saved.pastExamStudy))[id], reset);
 context.pastExamVisit();
 assert.deepEqual(plain(vm.runInContext('S.pastExamStudy[pastExamId].optionOrders', context)), reset.optionOrders);
});

test('Reset survives stale devices in either merge direction, including edits made later on the stale attempt', () => {
 const id = exams[0].id;
 const fresh = {[id]:{index:0,updated:200,resetAt:200,reviewed:{},answers:{},optionOrders:{0:[3,2,1,0]}}};
 const stale = {[id]:{index:49,updated:900,reviewed:{49:900},answers:{49:{value:[2],checked:true,at:900}},optionOrders:{49:[0,1,2,3]}}};
 assert.deepEqual(plain(context.icMergePastExamStudy(fresh,stale)), fresh);
 assert.deepEqual(plain(context.icMergePastExamStudy(stale,fresh)), fresh);
 assert.deepEqual(plain(context.icMergePastExamStudy(fresh,context.icMergePastExamStudy(stale,fresh))), fresh);
 const concurrent = {[id]:{index:1,updated:250,resetAt:200,reviewed:{1:250},answers:{1:{value:[1],checked:true,at:250}},optionOrders:{1:[1,2,3,0]}}};
 const combined = plain(context.icMergePastExamStudy(fresh,concurrent))[id];
 assert.deepEqual(combined.answers,concurrent[id].answers);
 assert.deepEqual(combined.optionOrders,{0:[3,2,1,0],1:[1,2,3,0]});
 const latest = {[id]:{index:0,updated:300,resetAt:300,reviewed:{},answers:{},optionOrders:{}}};
 assert.deepEqual(plain(context.icMergePastExamStudy(concurrent,latest)), latest);
});

test('Restoring old progress retains per-paper positions and removes invalid question indices', () => {
 const saved = context.normalizePastExamStudy({
  [exams[0].id]: {index: 71, updated: 123, reviewed: {0: 100, 49: 110, 50: 120, '-1': 50, nope: 45}},
  'unknown-paper': {index: 2, reviewed: {0: 50}}
 });
 assert.deepEqual(plain(saved), {[exams[0].id]: {index: 49, updated: 123, reviewed: {0: 100, 49: 110}}});
 assert.deepEqual(plain(context.normalizePastExamStudy()), {});
});

test('Two devices combine reviewed questions and preserve the latest position for each paper', () => {
 const first = exams[0].id, second = exams[3].id;
 const local = {[first]: {index: 8, updated: 200, reviewed: {0: 100, 7: 180}}};
 const remote = {
  [first]: {index: 4, updated: 150, reviewed: {0: 120, 3: 140}},
  [second]: {index: 10, updated: 300, reviewed: {9: 290}}
 };
 const merged = plain(context.icMergePastExamStudy(local, remote));
 assert.deepEqual(merged[first], {index: 8, updated: 200, reviewed: {0: 120, 3: 140, 7: 180}});
 assert.deepEqual(merged[second], remote[second]);
 assert.deepEqual(plain(context.icMergePastExamStudy(merged, remote)), merged);
 assert.deepEqual(local[first].reviewed, {0: 100, 7: 180});
});

test('Authenticated cloud progress saves and restores past-paper work alongside existing study answers', async () => {
 const env = {DB: database(), ASSETS: assets(), IC_ADMIN_USERNAME: 'pastcheck', IC_ADMIN_HASH: await passwordHash('past-exam-roundtrip-2026')};
 const origin = 'https://ic-study.test';
 const call = (route, method = 'GET', body, cookie) => fetchApp(new Request(origin + route, {
  method, headers: {origin, 'content-type': 'application/json', 'x-ic-request': '1', ...(cookie ? {cookie} : {})},
  ...(body ? {body: JSON.stringify(body)} : {})
 }), env);
 const login = await call('/api/login', 'POST', {username: 'pastcheck', password: 'past-exam-roundtrip-2026'});
 assert.equal(login.status, 200);
 const cookie = login.headers.get('set-cookie').split(';')[0];
 const state = {version: 1, responses: {'LOS201-119': {value: [2], at: 100}}, pastExamStudy: {[exams[0].id]: {index: 14, updated: 300, resetAt:150, reviewed: {0: 200, 13: 250}, answers:{0:{value:[0],checked:true,at:200}},optionOrders:{0:[3,2,1,0]}}}};
 state.pastExamStudy['dgt302-fa26-fe']={index:15,updated:400,reviewed:{15:400},answers:{15:{value:[1],checked:true,at:400,questionRevision:1}},optionOrders:{15:[2,0,3,1]}};
 assert.equal((await call('/api/progress', 'PUT', {state, revision: 0}, cookie)).status, 200);
 const restored = await (await call('/api/progress', 'GET', null, cookie)).json();
 assert.deepEqual(restored.state.responses, state.responses);
 assert.deepEqual(restored.state.pastExamStudy, state.pastExamStudy);
 const study = await (await call('/study', 'GET', null, cookie)).text();
 assert.match(study, /Ôn đề thi cũ/);
 assert.match(study, /id="past-exams"/);
});
