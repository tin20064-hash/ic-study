import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('account/wallpaper-client.js','utf8').replace(/\nvoid icRestoreAccountWallpaper\(\);\s*$/,'');
const defaults=fs.readFileSync('source/study.html','utf8').match(/const DEFAULT_WALLPAPER=\{[\s\S]*?\n\};/)[0];
const original=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,7,8,9])],{type:'image/png'});
function fixture({record=null,remote={wallpaper:null,revision:null},meta=null}={}){
 let cached=record,server=remote,uploads=0;
 const storage=new Map();if(meta)storage.set('ic-wallpaper-sync:student',JSON.stringify(meta));
 const context={IC_BOOT:{user:{id:'student'}},window:{icLocalWallpaperReady:Promise.resolve()},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  document:{querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},addEventListener(){},
  look:{wallpaper:record?'blob:cached':null,source:record?'original':'default',name:record?.name||'Default'},sourceVersion:0,rawBlobUrl:null,localOriginalData:null,
  URL:{createObjectURL:()=> 'blob:restored',revokeObjectURL(){}},
  wallStorage:async(method,value)=>{if(method==='get')return cached;if(method==='put')cached=value;if(method==='delete')cached=null;},
  icApi:async()=>server,getImageDimensions:async()=>({width:857,height:1200}),clearProcessed(){},applyLook(){},saveLookSettings(){},appearancePanel(){},toast(){},
  fetch:async(url,options={})=>{
   if(url==='/api/wallpaper'){
    uploads++;assert.equal(options.headers['x-ic-wallpaper-version'],server.revision||'none');
    server=options.method==='DELETE'?{wallpaper:null,revision:'reset-v2'}:{wallpaper:{url:'/api/wallpaper/image?v=image-v2',name:'Original.png'},revision:'image-v2'};
    if(options.body)assert.deepEqual(new Uint8Array(await options.body.arrayBuffer()),new Uint8Array(await original.arrayBuffer()));
    return new Response(JSON.stringify(server));
   }
   return new Response(original,{headers:{'content-type':'image/png'}});
  }};
 vm.createContext(context);vm.runInContext(defaults+'\n'+source,context);
 return {context,storage,get record(){return cached},get uploads(){return uploads}};
}
async function settle(c){for(let n=0;n<10;n++){await new Promise(setImmediate);if(!vm.runInContext('icWallBusy',c))return;}throw Error('Wallpaper sync did not settle');}

test('An existing browser image automatically migrates to the account on first upgrade',async()=>{
 const f=fixture({record:{blob:original,name:'Original.png',width:857,height:1200}});
 await f.context.icRestoreAccountWallpaper();await settle(f.context);
 assert.equal(f.uploads,1);assert.equal(f.context.icHasPendingWallpaper(),false);
 assert.equal(JSON.parse(f.storage.get('ic-wallpaper-sync:student')).revision,'image-v2');
});
test('A fresh browser restores the cloud image and caches original bytes without uploading another copy',async()=>{
 const f=fixture({remote:{wallpaper:{url:'/api/wallpaper/image?v=image-v2',name:'Original.png'},revision:'image-v2'}});
 await f.context.icRestoreAccountWallpaper();
 assert.equal(f.uploads,0);assert.equal(f.context.look.wallpaper,'blob:restored');assert.equal(f.context.look.width,857);assert.equal(f.context.look.name,'Original.png');
 assert.deepEqual(new Uint8Array(await f.record.blob.arrayBuffer()),new Uint8Array(await original.arrayBuffer()));
});
test('A default-background change on another device clears stale local cache instead of re-uploading it',async()=>{
 const f=fixture({record:{blob:original,name:'Old.png'},remote:{wallpaper:null,revision:'reset-v2'},meta:{managed:true,revision:'image-v1'}});
 await f.context.icRestoreAccountWallpaper();
 assert.equal(f.uploads,0);assert.equal(f.context.look.wallpaper,null);assert.equal(f.record,null);
 assert.equal(f.context.look.name,'Hồ và núi lúc bình minh');
 assert.equal(f.context.look.width,1672);
 assert.equal(JSON.parse(f.storage.get('ic-wallpaper-sync:student')).revision,'reset-v2');
});
test('An interrupted upload keeps the pending image locally and retries successfully',async()=>{
 const f=fixture({record:{blob:original,name:'Original.png'}}),realFetch=f.context.fetch;let offline=true;
 f.context.fetch=async(...args)=>{if(offline)throw Error('Network offline');return realFetch(...args)};
 await f.context.icRestoreAccountWallpaper();await settle(f.context);
 assert.equal(f.context.icHasPendingWallpaper(),true);assert.ok(f.record.blob);
 offline=false;await f.context.icFlushWallpaper();assert.equal(f.context.icHasPendingWallpaper(),false);assert.equal(f.uploads,1);
});
