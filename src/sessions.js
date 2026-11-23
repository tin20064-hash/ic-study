// Session answers are isolated from cumulative learning coverage.
function sessionId(){return 's-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)}
function normalizeSavedSession(s){
 if(!s||!['practice','exam','flash'].includes(s.mode)||!Array.isArray(s.ids))return null;
 const ids=[...new Set(s.ids.filter(id=>BY_ID.has(id)))];if(!ids.length)return null;
 if(s.mode==='exam'&&(!Number.isFinite(s.deadline)||!Number.isFinite(s.started)))return null;
 const choices=obj=>Object.fromEntries(Object.entries(obj&&typeof obj==='object'?obj:{}).filter(([id,a])=>ids.includes(id)&&Array.isArray(a)&&a.length<=4&&a.every(n=>Number.isInteger(n)&&n>=0&&n<4)).map(([id,a])=>[id,[...new Set(a)].sort()]));
 return {id:typeof s.id==='string'?s.id.slice(0,120):'legacy-'+(Number(s.started)||Date.now()),mode:s.mode,ids,index:Math.max(0,Math.min(ids.length-1,Number(s.index)||0)),answers:choices(s.answers),drafts:choices(s.drafts),fresh:true,started:Number(s.started)||Date.now(),updated:Number(s.updated)||Number(s.started)||Date.now(),finished:Number(s.finished)||null,status:s.status==='completed'?'completed':'saved',deadline:s.deadline,duration:s.duration,subject:s.subject,studyTask:typeof s.studyTask==='string'?s.studyTask:undefined,reviewWrong:s.reviewWrong===true,wrongIds:Array.isArray(s.wrongIds)?[...new Set(s.wrongIds.filter(id=>BY_ID.has(id)))]:[]};
}
function normalizeSessionStore(out,data){
 out.sessions=(Array.isArray(data.sessions)?data.sessions:[]).map(normalizeSavedSession).filter(Boolean);
 out.sessions=[...new Map(out.sessions.map(s=>[s.id,s])).values()];
 out.wrongIds=Array.isArray(data.wrongIds)?[...new Set(data.wrongIds.filter(id=>BY_ID.has(id)))]:Object.keys(out.responses).filter(id=>!same(out.responses[id].value,out.overrides[id]||BY_ID.get(id).answer));
 out.session=normalizeSavedSession(data.session);
 if(out.session){if(!Array.isArray(data.session.wrongIds))out.session.wrongIds=[...out.wrongIds];out.sessions=out.sessions.filter(s=>s.id!==out.session.id);out.sessions.unshift(JSON.parse(JSON.stringify(out.session)))}
}
function saveActiveSession(){
 const s=S.session;if(!s)return;
 if(!s.id)s.id=sessionId();s.fresh=true;s.updated=Date.now();s.drafts??={};s.wrongIds=[...(S.wrongIds||[])];
 S.sessions??=[];const i=S.sessions.findIndex(x=>x.id===s.id),snapshot=JSON.parse(JSON.stringify(s));if(i<0)S.sessions.unshift(snapshot);else S.sessions[i]=snapshot;
}
function updateWrong(id,a){S.wrongIds??=[];if(correct(BY_ID.get(id),a))S.wrongIds=S.wrongIds.filter(x=>x!==id);else if(!S.wrongIds.includes(id))S.wrongIds.push(id)}
function wrongQuestionIds(){return (S.wrongIds||[]).filter(id=>BY_ID.has(id))}
function startWrongReview(ids=wrongQuestionIds()){const selected=studyRestrictIds(ids);if(!selected.length){toast('Chưa có câu sai trong nhóm này.');return}newSession(shuffle(selected),'practice',{reviewWrong:true})}
function resumeSavedSession(id){
 const saved=S.sessions.find(s=>s.id===id);if(!saved)return;
 if(saved.mode==='exam'&&saved.status==='completed'){const index=S.history.findIndex(h=>h.sessionId===saved.id||h.started===saved.started);if(index>=0){resultIndex=index;reviewFilter='all';setView('result')}else toast('Kết quả bài thi này không còn trong lịch sử.');return}
 persist();S.session=JSON.parse(JSON.stringify(saved));S.wrongIds=[...(saved.wrongIds||[])];subject=BY_ID.get(saved.ids[0]).subject;restoreSessionDraft();showSource=false;flipped=false;persist();setView('player');
 if(S.session?.mode==='exam'&&Date.now()>=S.session.deadline)finishExam();
}
function restoreSessionDraft(){const s=S.session;if(s)draft=[...((s.mode==='exam'?s.answers:s.drafts)?.[s.ids[s.index]]||[])]}
function sessionStats(s){const answered=s.ids.filter(id=>s.answers[id]?.length),right=answered.filter(id=>correct(BY_ID.get(id),s.answers[id])).length;return {done:answered.length,right,wrong:answered.length-right}}
function sessionTitle(s){const courses=[...new Set(s.ids.map(id=>BY_ID.get(id).subject))].join(' + ');return (s.reviewWrong?'Luyện câu sai':s.mode==='exam'?'Thi thử':s.mode==='flash'?'Thẻ ghi nhớ':'Luyện tập')+' · '+courses}
function sessionsPage(){
 const sessions=[...(S.sessions||[])].sort((a,b)=>b.updated-a.updated);
 return `${header('LƯU LẠI NHỊP HỌC','Phiên học của bạn','Tự lưu sau mỗi lựa chọn và mỗi lần chuyển câu. Tiếp tục đúng chỗ đã dừng, hoặc tạo một phiên hoàn toàn mới.')}<div class="session-library-top panel"><div><strong>${sessions.length} phiên đã lưu</strong><p>Phiên mới có đáp án và danh sách câu sai riêng. Phiên cũ vẫn giữ bài làm để tiếp tục.</p></div>${btn('Tạo phiên luyện tập mới →','nav','data-view="practice"','primary')}</div>${sessions.length?`<div class="session-library">${sessions.map(s=>{const c=sessionStats(s),active=S.session?.id===s.id,blocked=!studySessionAllowed(s),expired=s.mode==='exam'&&Date.now()>=s.deadline;return `<article class="panel session-record"><div class="session-record-icon">${icon(s.reviewWrong?'retry':s.mode==='exam'?'exam':s.mode==='flash'?'cards':'book',23)}</div><div class="session-record-body"><div class="btnrow"><span class="pill">${s.status==='completed'?'Đã hoàn tất':active?'Phiên hiện tại':'Đã lưu'}${expired&&s.status!=='completed'?' · Hết giờ':''}</span><span class="quiet">${new Date(s.updated).toLocaleString('vi-VN')}</span></div><h2>${esc(sessionTitle(s))}</h2><p>${c.done}/${s.ids.length} câu đã làm · Đang ở câu ${s.index+1}${s.mode!=='exam'||s.status==='completed'?` · ${c.wrong} câu sai`:''}</p><div class="progress"><i style="width:${c.done/s.ids.length*100}%"></i></div>${s.mode==='exam'&&s.status!=='completed'?'<p class="quiet">Đồng hồ thi vẫn chạy khi rời trang.</p>':''}</div><div class="session-record-actions">${btn(s.status==='completed'?'Xem lại phiên':expired?'Nộp bài hết giờ':'Tiếp tục →','session-resume',`data-id="${esc(s.id)}" ${blocked?'disabled':''}`,'small primary')}${c.wrong&&(s.mode!=='exam'||s.status==='completed')?btn('Luyện câu sai','session-wrong',`data-id="${esc(s.id)}" ${blocked?'disabled':''}`,'small'):''}${blocked?'<span class="quiet">Giữ phiên cho sau chuỗi ngày ôn riêng môn.</span>':''}</div></article>`}).join('')}</div>`:empty('Phiên đầu tiên đang chờ bạn','Bắt đầu luyện tập; bài làm sẽ tự xuất hiện ở đây khi bạn rời trang.')}`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;if(b.dataset.act==='session-resume')resumeSavedSession(b.dataset.id);else if(b.dataset.act==='session-wrong'){const s=S.sessions.find(s=>s.id===b.dataset.id);if(s)startWrongReview(s.ids.filter(id=>s.answers[id]?.length&&!correct(BY_ID.get(id),s.answers[id])))}else if(b.dataset.act==='pause-session'){persist();setView('sessions');toast('Đã lưu phiên. Bạn có thể tiếp tục bất cứ lúc nào.')}});
