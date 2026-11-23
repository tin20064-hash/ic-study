// Keyword cards keep their own deck; main question answers and exam scores are untouched.
let keywordRevealed=false;
function normalizeKeywordStudy(s){
 if(!s||!Array.isArray(s.ids))return null;
 const ids=[...new Set(s.ids.filter(id=>KEYWORD_BY_ID.has(id)))];if(!ids.length)return null;
 const optionOrders=Object.fromEntries(ids.map(id=>{const a=s.optionOrders?.[id];return[id,Array.isArray(a)&&a.length===4&&new Set(a).size===4&&a.every(i=>Number.isInteger(i)&&i>=0&&i<4)?[...a]:[0,1,2,3]]}));
 const selected=Object.fromEntries(Object.entries(s.selected||{}).filter(([id,i])=>ids.includes(id)&&Number.isInteger(i)&&i>=0&&i<4));
 const viewed=Object.fromEntries(Object.entries(s.viewed||{}).filter(([id,at])=>ids.includes(id)&&Number.isFinite(at)&&at>0));
 return {id:typeof s.id==='string'?s.id.slice(0,120):'legacy-keywords',subject:SUBJECTS[s.subject]?s.subject:'all',ids,index:Math.max(0,Math.min(ids.length-1,Number(s.index)||0)),optionOrders,selected,viewed,updated:Number(s.updated)||0};
}
function startKeywordStudy(course='all'){
 const ids=shuffle(KEYWORD_CARDS.filter(c=>course==='all'||c.subject===course).map(c=>c.id));
 if(!ids.length)return;
 const previous=S.keywordStudy?.optionOrders;
 const optionOrders=Object.fromEntries(ids.map(id=>{const a=shuffle([0,1,2,3]),before=previous?.[id]||[0,1,2,3];if(a.every((n,i)=>n===before[i]))a.push(a.shift());return[id,a]}));
 S.keywordStudy={id:sessionId(),subject:course,ids,index:0,optionOrders,selected:{},viewed:{},updated:Date.now()};keywordRevealed=false;persist();setView('keywords');
}
function keywordMove(step){const s=S.keywordStudy;if(!s)return;s.index=Math.max(0,Math.min(s.ids.length-1,s.index+step));s.updated=Date.now();keywordRevealed=false;persist();render()}
function keywordToggle(){const s=S.keywordStudy;if(!s)return;keywordRevealed=!keywordRevealed;if(keywordRevealed)s.viewed[s.ids[s.index]]=Date.now();s.updated=Date.now();persist();render()}
function keywordSelect(i){const s=S.keywordStudy;if(!s||!Number.isInteger(i)||i<0||i>3)return;s.selected[s.ids[s.index]]=i;s.updated=Date.now();keywordRevealed=false;persist();render()}
function keywordsPage(){
 const s=S.keywordStudy,count=KEYWORD_CARDS.length;
 const picker=`<div class="panel keyword-controls"><label class="field">Bộ thẻ<select id="keyword-course" aria-label="Môn học keyword"><option value="all" ${s?.subject==='all'?'selected':''}>Tất cả 4 môn</option>${Object.entries(SUBJECTS).map(([id,c])=>`<option value="${id}" ${s?.subject===id?'selected':''}>${id} · ${esc(c.name)}</option>`).join('')}</select></label><div><span class="quiet">${count} thẻ · 4 lựa chọn/thẻ · Tự lưu vị trí</span><p class="quiet">Thứ tự câu và đáp án đổi ở bộ mới, giữ nguyên khi quay lại.</p></div>${btn(s?'Trộn bộ thẻ mới ↻':'Bắt đầu học keyword →','keyword-start','','primary')}</div>`;
 let body='';
 if(!s)body=`<div class="panel empty"><h2>Nhìn keyword, nhớ kiến thức.</h2><p>Chọn câu trả lời trước hoặc tự nhẩm, rồi bấm hiện đáp án. Bấm lần nữa để ẩn cả lời giải và màu đúng/sai.</p></div>`;
 else{
  const c=KEYWORD_BY_ID.get(s.ids[s.index]),order=s.optionOrders[c.id],selected=s.selected[c.id],correctAt=order.indexOf(c.answer);
  body=`<article class="question-card keyword-card"><div class="question-meta"><span class="eyebrow">KEYWORD ${s.index+1} / ${s.ids.length}</span><span class="pill">${c.subject}</span></div><p class="keyword-prompt-label">Gặp keyword này, bạn nghĩ đến điều gì?</p><h2 class="question-title keyword-prompt">${esc(c.prompt)}</h2><div class="options" role="group" aria-label="Bốn đáp án keyword">${order.map((i,pos)=>`<button class="option ${keywordRevealed?(i===c.answer?'correct':selected===i?'incorrect':''):selected===i?'selected':''}" data-keyword-choice="${i}" aria-pressed="${selected===i}"><span class="letter">${choiceLabel(pos)}</span><span>${esc(c.options[i])}</span><span class="choice-mark" aria-hidden="true"></span></button>`).join('')}</div><div class="keyword-reveal"><button class="btn primary" data-keyword-toggle aria-expanded="${keywordRevealed}" aria-controls="keyword-answer">${keywordRevealed?'Ẩn đáp án':'Hiện đáp án'}</button><span class="quiet">Tự nhẩm hoặc chọn một đáp án trước khi xem.</span></div>${keywordRevealed?`<section class="feedback" id="keyword-answer" aria-live="polite"><h3>${selected===undefined?'Đáp án và mẹo nhớ':selected===c.answer?'✓ Trả lời đúng':'Đáp án và lời giải'}</h3><p><strong>${choiceLabel(correctAt)}. ${esc(c.options[c.answer])}</strong></p><p>${esc(c.reason)}</p><p class="keyword-pair"><b>${esc(c.prompt)}</b> → ${esc(c.options[c.answer])}</p></section>`:''}<div class="question-bottom">${btn('← Thẻ trước','keyword-move',`data-step="-1" ${s.index===0?'disabled':''}`)}<span class="quiet">Đã xem ${Object.keys(s.viewed).length}/${s.ids.length} đáp án</span>${btn(s.index===s.ids.length-1?'Về thẻ đầu ↻':'Thẻ tiếp →','keyword-move',`data-step="${s.index===s.ids.length-1?-s.index:1}"`,'primary')}</div></article><div class="keyword-jumps" aria-label="Chọn thẻ từ khóa">${s.ids.map((id,i)=>`<button class="qnumber ${i===s.index?'current':''} ${s.viewed[id]?'done':''}" data-keyword-jump="${i}" aria-label="Đến thẻ từ khóa ${i+1}" ${i===s.index?'aria-current="true"':''}>${i+1}</button>`).join('')}</div>`;
 }
 return `${header('Ôn theo từ khóa','Chọn đáp án, sau đó mở lời giải để kiểm tra dấu hiệu nhận biết và điều kiện áp dụng.') }<div class="keyword-layout">${picker}${body}<p class="quiet keyword-footnote">Tiến độ thẻ được lưu riêng. Phím 1–4 chọn đáp án, phím cách hiện hoặc ẩn lời giải, phím ← và → chuyển thẻ.</p></div>`;
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled||view!=='keywords')return;
 if(b.dataset.act==='keyword-start')startKeywordStudy(document.getElementById('keyword-course').value);
 else if(b.dataset.act==='keyword-move')keywordMove(Number(b.dataset.step));
 else if(b.hasAttribute('data-keyword-toggle'))keywordToggle();
 else if(b.hasAttribute('data-keyword-choice'))keywordSelect(Number(b.dataset.keywordChoice));
 else if(b.hasAttribute('data-keyword-jump')){const index=Number(b.dataset.keywordJump);if(Number.isInteger(index)&&index>=0&&index<S.keywordStudy.ids.length)keywordMove(index-S.keywordStudy.index)}
});
document.addEventListener('keydown',e=>{if(view!=='keywords'||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,button,summary,a,[contenteditable]'))return;if(/^[1-4]$/.test(e.key)&&S.keywordStudy){e.preventDefault();keywordSelect(S.keywordStudy.optionOrders[S.keywordStudy.ids[S.keywordStudy.index]][Number(e.key)-1])}else if(e.key===' '){e.preventDefault();keywordToggle()}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();keywordMove(e.key==='ArrowLeft'?-1:1)}});
