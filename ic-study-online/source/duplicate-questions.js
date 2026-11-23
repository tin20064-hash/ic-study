// Curated equivalence groups; source IDs and actual choices remain intact.
function createDuplicateIndex(bank, groups) {
 const by=new Map(bank.map(q=>[q.id,q])), roots=new Map(), families=new Map();
 for(const q of bank){roots.set(q.id,q.id);families.set(q.id,[q.id]);}
 for(const group of groups){
  const ids=group.ids.filter(id=>by.has(id));if(ids.length<2)continue;
  const root=ids[0];families.set(root,ids);
  for(const id of ids){roots.set(id,root);if(id!==root)families.delete(id);}
 }
 const root=id=>roots.get(id)||id;
 const members=id=>families.get(root(id))||[id];
 function questions(pool) {
  const seen=new Set(),out=[];
  for(const q of pool){
   const key=root(q.id);if(seen.has(key))continue;seen.add(key);
   out.push(by.get(key)||q);
  }
  return out;
 }
 function ids(values,original=false){const seen=new Set();return values.filter(id=>{if(!by.has(id)||seen.has(root(id)))return false;seen.add(root(id));return true;}).map(id=>original?id:root(id));}
 function response(id,state){let found=null;for(const x of members(id)){const r=state.responses?.[x];if(r?.value?.length&&(!found||(Number(r.at)||0)>(Number(found.response.at)||0)))found={id:x,response:r};}return found;}
 function isWrong(id,state){const found=response(id,state);if(!found)return false;const key=state.overrides?.[found.id]||by.get(found.id).answer,a=found.response.value;return a.length!==key.length||[...a].sort((a,b)=>a-b).some((v,i)=>v!==[...key].sort((a,b)=>a-b)[i]);}
 function session(s){
  const known=[...new Set([...(s.sourceIds||[]),...s.ids])].filter(id=>by.has(id));
  if(s.mode==='exam'&&s.status==='completed')return {ids:[...s.ids],index:Math.max(0,Math.min(s.ids.length-1,Number(s.index)||0)),sourceIds:known,duplicateIds:s.duplicateIds||[]};
  const current=s.ids[Math.max(0,Math.min(s.ids.length-1,Number(s.index)||0))],keep=ids(s.ids,true);
  const selected=keep.map(id=>{const candidates=s.ids.filter(x=>root(x)===root(id));return candidates.includes(current)?current:candidates.find(x=>s.answers?.[x]?.length)||candidates.find(x=>s.drafts?.[x]?.length)||id;});
  return {ids:selected,index:Math.max(0,selected.indexOf(current)),sourceIds:known,
   duplicateIds:[...new Set([...(s.duplicateIds||[]),...s.ids.filter(id=>!selected.includes(id))])].filter(id=>by.has(id))};
 }
 function saved(id,state){return members(id).some(x=>state.bookmarks?.[x]);}
 function toggleSaved(id,state){if(saved(id,state))for(const x of members(id))delete state.bookmarks[x];else state.bookmarks[id]=true;}
 function note(id,state){
  if(state.notes?.[id])return state.notes[id];
  const entries=members(id).filter(x=>state.notes?.[x]);
  if(entries.length===1)return state.notes[entries[0]];
  return entries.map(x=>x+': '+state.notes[x]).join('\n\n');
 }
 function matches(id,term){return members(id).some(x=>{const q=by.get(x);return `${q.question} ${q.options.join(' ')} ${x}`.toLowerCase().includes(term);});}
 return {root,members,questions,ids,response,isWrong,session,saved,toggleSaved,note,matches,total:families.size};
}
