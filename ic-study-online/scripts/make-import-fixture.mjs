import fs from 'node:fs';
const bank=JSON.parse(fs.readFileSync('source/study.html','utf8').match(/<script[^>]*id=["']question-bank["'][^>]*>([\s\S]*?)<\/script>/)[1]);
const qs=bank.filter(q=>q.subject==='DGT302').slice(0,60),at=Date.parse('2026-11-08T08:00:00+07:00');const responses=Object.fromEntries(qs.map(q=>[q.id,{value:q.answer,at}]));
const session={id:'offline-import-demo',mode:'practice',ids:qs.map(q=>q.id),index:55,answers:Object.fromEntries(qs.map(q=>[q.id,q.answer])),drafts:{},fresh:true,started:at,updated:at,status:'saved',wrongIds:[]};
const backup={version:1,responses,bookmarks:{[qs[0].id]:true},notes:{},overrides:{},history:[],sessions:[session],session,wrongIds:[],daily:{},studyPlan:{checks:{},cards:{}},lastSubject:'DGT302'};
fs.mkdirSync('tests/fixtures',{recursive:true});fs.writeFileSync('tests/fixtures/html-progress.json',JSON.stringify(backup));console.log('Created a synthetic 60-question HTML backup for the local preview account.');
