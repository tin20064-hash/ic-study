function icMergeProgress(current,incoming){
 const result=JSON.parse(JSON.stringify(current));
 result.pastExamStudy=icMergePastExamStudy(current.pastExamStudy,incoming.pastExamStudy);
 result.responses={...current.responses};
 for(const [id,response] of Object.entries(incoming.responses||{}))if(!result.responses[id]||Number(response.at)>Number(result.responses[id].at))result.responses[id]=response;
 result.bookmarks={...incoming.bookmarks,...current.bookmarks};
 result.notes={...incoming.notes,...current.notes};
 result.overrides={...incoming.overrides,...current.overrides};
 result.daily={...current.daily};for(const [day,ids]of Object.entries(incoming.daily||{}))result.daily[day]=[...new Set([...(result.daily[day]||[]),...ids])];
 const sessions=new Map();for(const session of [...(current.sessions||[]),...(incoming.sessions||[])]){const previous=sessions.get(session.id);if(!previous||Number(session.updated)>Number(previous.updated))sessions.set(session.id,session)}
 result.sessions=[...sessions.values()].sort((a,b)=>(b.updated||0)-(a.updated||0));
 const history=new Map();for(const entry of [...(current.history||[]),...(incoming.history||[])])history.set(JSON.stringify(entry),entry);result.history=[...history.values()].sort((a,b)=>(b.finished||0)-(a.finished||0));
 result.studyPlan={checks:{...(incoming.studyPlan?.checks||{}),...(current.studyPlan?.checks||{})},cards:{...(incoming.studyPlan?.cards||{}),...(current.studyPlan?.cards||{})}};
 if((!result.session||!Object.keys(result.session.answers||{}).length)&&incoming.session){result.session=sessions.get(incoming.session.id)||incoming.session;result.wrongIds=[...(incoming.wrongIds||[])]}
 result.accountLook=current.accountLook;
 if(!result.keywordStudy||Number(incoming.keywordStudy?.updated)>Number(result.keywordStudy.updated))result.keywordStudy=incoming.keywordStudy;
 return validate(result);
}

// Three-way reconciliation: preserve edits made on either device since its last
// successful save. A deletion is an edit too (bookmarks, notes and saved sessions).
function icReconcileProgress(local,remote,base=null,{preserveActive=true}={}){
 const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const choose=(a,b,c)=>base?(equal(a,c)?copy(b):copy(a)):copy(a===undefined?b:a);
 const fields=(a={},b={},c={})=>Object.fromEntries([...new Set([...Object.keys(a||{}),...Object.keys(b||{}),...Object.keys(c||{})])].flatMap(key=>{const value=choose(a?.[key],b?.[key],c?.[key]);return value===undefined?[]:[[key,value]]}));
 const result={...copy(remote),...copy(local)};
 result.pastExamStudy=icMergePastExamStudy(local.pastExamStudy,remote.pastExamStudy);
 result.responses={...copy(remote.responses||{})};
 for(const [id,response]of Object.entries(local.responses||{}))if(!result.responses[id]||Number(response.at)>=Number(result.responses[id].at))result.responses[id]=copy(response);
 for(const key of ['bookmarks','notes','overrides'])result[key]=fields(local[key],remote[key],base?.[key]);
 result.accountLook=fields(local.accountLook,remote.accountLook,base?.accountLook);
 result.keywordStudy=choose(local.keywordStudy,remote.keywordStudy,base?.keywordStudy);
 if(local.keywordStudy?.id&&local.keywordStudy.id===remote.keywordStudy?.id){
  result.keywordStudy=copy(Number(local.keywordStudy.updated)>=Number(remote.keywordStudy.updated)?local.keywordStudy:remote.keywordStudy);
  for(const key of ['selected','viewed'])result.keywordStudy[key]=fields(local.keywordStudy[key],remote.keywordStudy[key],base?.keywordStudy?.[key]);
  result.keywordStudy.optionOrders=copy(local.keywordStudy.optionOrders||remote.keywordStudy.optionOrders);
 }
 result.studyPlan={};for(const key of ['checks','cards'])result.studyPlan[key]=fields(local.studyPlan?.[key],remote.studyPlan?.[key],base?.studyPlan?.[key]);
 result.daily={...copy(remote.daily||{})};for(const [day,ids]of Object.entries(local.daily||{}))result.daily[day]=[...new Set([...(result.daily[day]||[]),...ids])];
 const sessionMap=state=>new Map([...(state?.sessions||[]),...(state?.session?[state.session]:[])].map(s=>[s.id,s]));
 const a=sessionMap(local),b=sessionMap(remote),c=sessionMap(base),sessions=new Map();
 for(const id of new Set([...a.keys(),...b.keys(),...c.keys()])){
  const left=a.get(id),right=b.get(id),previous=c.get(id);let merged;
  if(left&&right){
   merged=copy(Number(left.updated)>=Number(right.updated)?left:right);
   for(const key of ['answers','drafts'])merged[key]=fields(left[key],right[key],previous?.[key]);
   const priorMarks=previous?.examMarks;
   if(merged.mode==='exam'&&(left.examMarks||right.examMarks||priorMarks)){
    merged.examMarks=fields(left.examMarks??priorMarks,right.examMarks??priorMarks,priorMarks);
   }
   if(left.optionOrders||right.optionOrders)merged.optionOrders=copy(left.optionOrders||right.optionOrders);
   if(left.status==='completed'||right.status==='completed')merged.status='completed';
   if(preserveActive&&local.session?.id===id)merged.index=left.index;
  }else merged=choose(left,right,previous);
  if(merged)sessions.set(id,merged);
 }
 const trash=fields(Object.fromEntries((local.deletedSessions||[]).map(s=>[s.id,s])),Object.fromEntries((remote.deletedSessions||[]).map(s=>[s.id,s])),Object.fromEntries((base?.deletedSessions||[]).map(s=>[s.id,s])));
 for(const id of Object.keys(trash))sessions.delete(id);
 result.sessions=[...sessions.values()].sort((a,b)=>Number(b.updated)-Number(a.updated));
 result.deletedSessions=Object.values(trash);
 const preferred=preserveActive?local.session:[local.session,remote.session].filter(Boolean).sort((a,b)=>Number(b.updated)-Number(a.updated))[0];
 result.session=preferred?sessions.get(preferred.id)||null:null;
 const history=new Map();for(const h of [...(remote.history||[]),...(local.history||[])]){const key=h.sessionId||h.id||JSON.stringify([h.started,h.ids]);const prior=history.get(key);if(!prior||Number(h.finished)>=Number(prior.finished))history.set(key,copy(h))}
 result.history=[...history.values()].sort((a,b)=>Number(b.finished)-Number(a.finished)).slice(0,100).map(h=>{
  const session=sessions.get(h.sessionId);
  return session?.status==='completed'&&session.examMarks?{...h,examMarks:{...session.examMarks}}:h;
 });
 return validate(result);
}

function icMergePastExamStudy(local = {}, remote = {}) {
 const result = {};
 for (const id of new Set([...Object.keys(local || {}), ...Object.keys(remote || {})])) {
  let left = local?.[id], right = remote?.[id];
  // Reset starts a new attempt: older devices must not restore the previous attempt.
  const resetAt = Math.max(Number(left?.resetAt) || 0, Number(right?.resetAt) || 0);
  if ((Number(left?.resetAt) || 0) < resetAt) left = undefined;
  if ((Number(right?.resetAt) || 0) < resetAt) right = undefined;
  const latest = !right || Number(left?.updated || 0) >= Number(right.updated || 0) ? left : right;
  if (!latest) continue;
  const reviewed = {...right?.reviewed};
  for (const [index, at] of Object.entries(left?.reviewed || {})) reviewed[index] = Math.max(Number(at) || 0, Number(reviewed[index]) || 0);
  const combined = {...latest, reviewed};
  if (left?.answers || right?.answers) {
   combined.answers = {...right?.answers};
   for (const [index, response] of Object.entries(left?.answers || {})) {
    const previous = combined.answers[index];
    const revision = (Number(response.questionRevision) || 0) - (Number(previous?.questionRevision) || 0);
    if (!previous || revision > 0 || revision === 0 && Number(response.at) >= Number(previous.at)) combined.answers[index] = response;
   }
  }
  if (left?.optionOrders || right?.optionOrders) combined.optionOrders = {...right?.optionOrders, ...left?.optionOrders};
  result[id] = combined;
 }
 return result;
}
