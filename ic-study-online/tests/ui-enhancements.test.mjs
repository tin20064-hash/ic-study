import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const html=fs.readFileSync('source/study.html','utf8');
const bank=JSON.parse(html.match(/<script[^>]*id="question-bank"[^>]*>([\s\S]*?)<\/script>/)[1]);
const line=name=>html.split('\n').find(s=>s.startsWith('function '+name+'('));
test('Admin theme uses the account preference and follows changes in another study tab',()=>{
 const prefs=new Map([['on-tap-anime-look-v2:admin',JSON.stringify({palette:'mint',glass:false})]]);
 const dataset={},listeners={};
 const context={document:{documentElement:{dataset}},localStorage:{getItem:key=>prefs.get(key)??null},window:{
  IC_ADMIN_LOOK:{userId:'admin',palettes:['sakura','mint','crimson-ops'],look:{palette:'crimson-ops',glass:true}},
  addEventListener:(name,listener)=>{listeners[name]=listener}
 }};
 const script=fs.readFileSync('account/admin-appearance.js','utf8');
 vm.runInNewContext(script,context);
 assert.deepEqual(dataset,{palette:'crimson-ops',glass:'on'});
 prefs.set('on-tap-anime-look-v2:admin',JSON.stringify({palette:'mint',glass:false}));
 listeners.storage({key:'on-tap-anime-look-v2:other-account'});
 assert.deepEqual(dataset,{palette:'crimson-ops',glass:'on'});
 listeners.storage({key:'on-tap-anime-look-v2:admin'});
 assert.deepEqual(dataset,{palette:'mint',glass:'off'});
 prefs.set('ic-sync:admin',JSON.stringify({dirty:true}));
 prefs.set('on-tap-anime-v1:admin',JSON.stringify({accountLook:{palette:'mint',glass:false}}));
 vm.runInNewContext(script,context);
 assert.deepEqual(dataset,{palette:'mint',glass:'off'});
});
function exam(subject='all'){
 let created=null;
 const c={BANK:bank,S:{responses:{},bookmarks:{}},SUBJECTS:{DGT302:{},COS201:{},LOS201:{},ICI211:{}},subject,
  wrongQuestionIds:()=>[],shuffle:a=>a,
  $:id=>({value:({'exam-count':'40','exam-duration':'30','exam-pool':'answered'})[id]}),newSession:(...args)=>{created=args}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('source/study-focus.js','utf8').replace("Object.freeze(['DGT302'])","Object.freeze(['DGT302','COS201','LOS201','ICI211'])"),c);vm.runInContext(['studyResponse','studyCorrect','studySaved','studyNote','studyMatches','toggleStudySaved','subjectQuestions','unique','examQuestionPool','startExam'].map(line).join('\n'),c);
 return {c,get created(){return created}};
}
test('Answered-only exams contain both correct and wrong checked answers and never fill from unseen questions',()=>{
 const e=exam(),chosen=[bank[0],bank[1],bank.find(q=>q.subject==='COS201')];
 for(const [i,q]of chosen.entries())e.c.S.responses[q.id]={value:i===0?q.answer:[(q.answer[0]+1)%4],at:1};
 e.c.startExam();assert.equal(e.created[0].length,3);assert.deepEqual(new Set(e.created[0]),new Set(chosen.map(q=>q.id)));assert.equal(e.created[1],'exam');
 e.c.subject='COS201';assert.equal(e.c.examQuestionPool('answered').length,1);
 e.c.subject='all';assert.equal(e.c.examQuestionPool('answered').length,3);
});
test('An answered duplicate remains eligible even when the first identical question was never answered',()=>{
 const e=exam();const groups=new Map();let duplicate;
 for(const q of bank){const key=JSON.stringify([q.subject,q.question,q.options,q.answer]);if(groups.has(key)){duplicate=q;break}groups.set(key,q)}
 assert.ok(duplicate);e.c.S.responses[duplicate.id]={value:duplicate.answer,at:1};
 assert.equal(e.c.examQuestionPool('answered').length,1);assert.equal(e.c.examQuestionPool('answered')[0].id,duplicate.id);
 e.c.S.responses={};assert.equal(e.c.examQuestionPool('answered').length,0);
});
test('Closing a conflict notice removes only the notice and keeps unsynced progress and conflict protection',()=>{
 const elements=[];const doc={querySelectorAll:()=>elements.filter(e=>!e.removed),createElement(tag){return {tag,children:[],setAttribute(k,v){this[k]=v},append(...children){this.children.push(...children)},remove(){this.removed=true}}},body:{append(node){elements.push(node)}}};
 const c={document:doc,S:{responses:{example:{value:[1],at:1}}},icConflict:true,download(){}};
 const source=fs.readFileSync('account/account-client.js','utf8'),a=source.indexOf('function icShowConflictBanner'),b=source.indexOf('function icQueueSync',a);
 vm.createContext(c);vm.runInContext(source.slice(a,b),c);const before=JSON.stringify(c.S);
 c.icShowConflictBanner('Conflict');const box=elements[0],close=box.children[0];assert.equal(close['aria-label'],'Đóng thông báo');close.onclick();
 assert.equal(box.removed,true);assert.equal(JSON.stringify(c.S),before);assert.equal(c.icConflict,true);
 c.icShowConflictBanner('Again');c.icShowConflictBanner('Latest');assert.equal(elements.filter(e=>!e.removed).length,1);
});
test('Gallery uses four distinct local illustrations and supports matching themes or keeping the current palette',async()=>{
 const seen=[];const c={look:{name:'',palette:'mint'},escapeLook:String,document:{addEventListener(){}},icSetWallStatus(){},toast(){},fetch:async src=>{seen.push(src);return new Response(new Blob(['image'],{type:'image/webp'}))},File,useNewWallpaper:async file=>{seen.push(file.name)}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('account/wallpaper-gallery.js','utf8'),c);
 const presets=vm.runInContext('IC_WALLPAPER_PRESETS',c);assert.equal(presets.length,4);const hashes=new Set();
 for(const p of presets){assert.ok(html.includes(p.palette+':{name:'));const bytes=fs.readFileSync('public'+p.src);assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.ok(fs.existsSync('public'+p.thumb));hashes.add(createHash('sha256').update(bytes).digest('hex'));}
 assert.equal(hashes.size,4);assert.ok(c.icWallpaperGallery().includes('Đổi sang theme gợi ý cùng ảnh'));
 await c.icSelectWallpaperPreset('ocean',true);assert.equal(c.look.palette,'ocean');assert.ok(seen.includes('ic-study-ocean.webp'));
 c.look.palette='mint';await c.icSelectWallpaperPreset('mochi',false);assert.equal(c.look.palette,'mint');
});

test('Bold themes have distinct art, render in both editions, and preserve custom wallpaper',()=>{
 const css=fs.readFileSync('source/bold-themes.css','utf8').trim();
 const offline=fs.readFileSync('../IC_Study_Anime.html','utf8').replaceAll('\r\n','\n');
 assert.ok(html.replaceAll('\r\n','\n').includes(css));
 assert.ok(offline.includes(css));
 const props=new Map(),dataset={};
 const look={palette:'crimson-ops',opacity:10,effects:true,fit:'cover',source:'original',wallpaper:'blob:custom'};
 const c=vm.createContext({look,document:{body:{dataset,style:{setProperty:(k,v)=>props.set(k,v),removeProperty:k=>props.delete(k)}},querySelectorAll:()=>[]},activeArt:()=>look.wallpaper,syncArtwork(){}});
 const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b));
 vm.runInContext(section('const LOOK_PRESETS=','let look=')+section('function applyLook(','function getWallStatus(')+section('function renderLookCards(','function appearancePanel('),c);
 for(const id of ['crimson-ops','neon-circuit','ironworks','steel-blueprint']){
  assert.ok(css.includes('[data-bold-preset="'+id+'"]'));
  assert.match(c.renderLookCards(true),new RegExp(`data-value="${id}"`));
  look.palette=id;c.applyLook();
  assert.equal(dataset.lookStyle,'bold');
  assert.equal(dataset.lookTone,id==='steel-blueprint'?'light':'dark');
  assert.equal(props.get('--user-wall'),'url("blob:custom")');
 }
 look.palette='sakura';c.applyLook();
 assert.equal(dataset.lookStyle,'pastel');
 assert.match(c.renderLookCards(false),/data-value="sakura" aria-pressed="true"/);
});

test('Liquid Glass keeps the saved setting and both editions have a clear sidebar',()=>{
 const css=fs.readFileSync('source/liquid-glass.css','utf8').trim();
 const offline=fs.readFileSync('../IC_Study_Anime.html','utf8');
 for(const edition of [html,offline]){
  assert.ok(edition.replaceAll('\r\n','\n').includes(css));
  assert.match(edition,/<input id="look-glass" type="checkbox"/);
  assert.match(edition,/<strong>Liquid Glass<\/strong>/);
  assert.doesNotMatch(edition,/--glass-[xy]\b|\bglassMotion\b/);
  const sidebar=edition.match(/<aside[^>]*id="study-sidebar"[^>]*>[\s\S]*?<\/aside>/)[0];
  assert.doesNotMatch(sidebar,/sidebar-bottom|id="import-file"/);
  assert.match(edition,/<\/aside><input type="file" id="import-file"/);
 }
 assert.match(offline,/a==='help'\)modal\([^\n]*btn\('Chuyển tiến độ lên web','transfer-web'/);
 const data={},saved=new Map();
 const look={palette:'neon-circuit',opacity:10,effects:true,fit:'cover',source:'default',glass:false};
 const c=vm.createContext({
  look,
  document:{body:{dataset:data,style:{setProperty(){},removeProperty(){}}},querySelectorAll:()=>[]},
  localStorage:{setItem:(k,v)=>saved.set(k,JSON.parse(v))},LOOK_KEY:'looks',activeArt:()=>'',syncArtwork(){}
 });
 const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b));
 vm.runInContext(section('const LOOK_PRESETS=','let look=')+section('function saveLookSettings(','function clearProcessed(')+section('function applyLook(','function getWallStatus('),c);
 c.applyLook(true);
 assert.equal(data.glass,'off');
 assert.equal(saved.get('looks').glass,false);
 look.glass=true;c.applyLook(true);
 assert.equal(data.glass,'on');
 look.palette='sakura';c.applyLook(true);
 assert.equal(data.glass,'on');
 assert.equal(saved.get('looks').glass,true);
});
