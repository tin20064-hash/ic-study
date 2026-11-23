"""Update only explanation UI and derived grading, preserving the custom anime page."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
renderer=r'''function shortExplanation(q){
 const x=SHORT_EXPLANATIONS[q.id];
 if(!x)return '<p class="explain-warning">Câu này chưa có lời giải rút gọn. Bạn có thể mở ảnh nguồn để đối chiếu.</p>';
 const changed=S.overrides[q.id]&&!same(S.overrides[q.id],q.answer);
 const refs=(x.references||[]).filter(r=>/^https:\/\//.test(r.url)).map(r=>`<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a>`).join(' · ');
 return `<div class="quick-explanation" lang="vi">${x.verified?`<div class="explain-warning" role="note"><strong>Đã kiểm tra và hiệu chỉnh</strong> · ${esc(x.correctionNote)}</div>`:x.sourceConflict?'<div class="explain-warning" role="note">Khóa nguồn cần kiểm tra thêm.</div>':''}${changed?'<div class="explain-warning">Bạn đang dùng đáp án hiệu chỉnh cá nhân. Lời giải kiến thức bên dưới không thay đổi theo khóa cá nhân.</div>':''}<p class="explain-row"><strong class="explain-label">Vì sao đúng</strong>${esc(x.reason)}</p><p class="explain-row quick-tip"><strong class="explain-label">✦ Mẹo chọn nhanh</strong>${esc(x.tip)}</p>${refs?`<p class="quiet" style="font-size:12px">Đối chiếu kiến thức: ${refs}</p>`:''}<div class="explanation-actions"><button class="textbtn" data-act="copy-explanation" data-id="${q.id}">Sao chép lời giải ↗</button><button class="textbtn" data-act="zoom" data-id="${q.id}" data-kind="note">Đối chiếu ảnh nguồn ↗</button></div></div>`;
}
function explanation(q,a){return `<section class="feedback ${a&&!correct(q,a)?'bad':''}" aria-live="polite"><h3>${a?(correct(q,a)?'✓ Đúng theo khóa chấm':'Cùng xem lại câu này.'): 'Đáp án và cách nhớ'}</h3><p>Đáp án ${S.overrides[q.id]?'bạn đã hiệu chỉnh':SHORT_EXPLANATIONS[q.id]?.verified?'đã kiểm tra':'hiện tại'}: <strong>${keys(answerKey(q))}</strong></p>${shortExplanation(q)}</section>`}
async function copyExplanation(id){
 const q=BY_ID.get(id),x=SHORT_EXPLANATIONS[id];if(!q||!x)return;
 const text=q.id+'\nĐáp án theo khóa chấm: '+keys(answerKey(q))+'\n'+(x.verified?x.correctionNote+'\n':'')+'Vì sao đúng: '+x.reason+'\nMẹo chọn nhanh: '+x.tip+(x.references?.length?'\nTham khảo: '+x.references.map(r=>r.url).join('\n'):'');
 try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else{const t=document.createElement('textarea');t.value=text;document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)throw Error()}toast('Đã sao chép lời giải.')}catch(e){modal(`<h2>Sao chép lời giải</h2><p>Bôi đen rồi nhấn Ctrl+C.</p><textarea readonly style="width:100%;height:240px">${esc(text)}</textarea>`)}
}
'''
migration=r'''function regradeReviewedHistory(out){
 for(const h of out.history){
  for(const id of h.ids){
   const e=SHORT_EXPLANATIONS[id];
   if(!e?.verified||out.overrides[id]||same(e.originalAnswer,e.correctedAnswer)||!same(h.answerKeys[id],e.originalAnswer))continue;
   h.answerKeyCorrections={...h.answerKeyCorrections,[id]:{from:[...e.originalAnswer],to:[...e.correctedAnswer],reviewedAt:'2026-11-08'}};
   h.answerKeys[id]=[...e.correctedAnswer];
  }
 }
 const refresh=s=>{if(s)s.wrongIds=s.mode==='exam'&&s.status!=='completed'?[]:s.ids.filter(id=>s.answers[id]?.length&&!same(s.answers[id],out.overrides[id]||BY_ID.get(id).answer))};
 for(const s of [...out.sessions,...out.deletedSessions])refresh(s);
 refresh(out.session);
}
'''
for p in [ROOT/'IC_Study_Anime.html',ROOT/'ic-study-online/source/study.html']:
 s=p.read_text(encoding='utf-8')
 const="const SHORT_EXPLANATIONS=JSON.parse(document.getElementById('short-explanations').textContent);\n"
 s=s.replace(const,'')
 anchor='const BY_ID=new Map(BANK.map(q=>[q.id,q]));\n'
 assert anchor in s
 s=s.replace(anchor,anchor+const,1)
 a=s.index('function shortExplanation(q)');b=s.index('function player()',a)
 s=s[:a]+renderer+s[b:]
 if 'function regradeReviewedHistory(out)' not in s:
  s=s.replace('function validate(data){',migration+'function validate(data){',1)
 if "if(typeof regradeReviewedHistory==='function')regradeReviewedHistory(out);" not in s:
  s=s.replace(' normalizeSessionStore(out,data);',' normalizeSessionStore(out,data);\n if(typeof regradeReviewedHistory===\'function\')regradeReviewedHistory(out);',1)
 s=s.replace('Đáp án khi nộp: <b>${keys(k)}</b>',"Đáp án${h.answerKeyCorrections?.[id]?' đã sửa khóa':' khi nộp'}: <b>${keys(k)}</b>")
 p.write_text(s,encoding='utf-8')

# Keep the maintenance generator from undoing verified answers/explanations.
p=ROOT/'scripts/update_short_explanations.py';s=p.read_text(encoding='utf-8')
a=s.index("renderer = r'''");b=s.index("\n'''",a)+4
s=s[:a]+"renderer = r'''"+renderer+"'''"+s[b:]
anchor='assert len(explanations) == 959'
merge="""audit_path=ROOT/'data/answer-audit.json'
if audit_path.exists():
    for qid,a in json.loads(audit_path.read_text(encoding='utf-8')).items():
        explanations[qid].update(reason=a['reason'],tip=a['tip'],sourceConflict=True,verified=True,
            originalAnswer=a['original']['answer'],correctedAnswer=a['changes'].get('answer',a['original']['answer']),
            correctionNote=a['note'],references=a['references'])
"""
if 'audit_path=' not in s:s=s.replace(anchor,merge+anchor,1)
p.write_text(s,encoding='utf-8')
print('Updated explanation renderer and history/session regrading in both anime editions.')
