"""Add curated copyable explanations without rebuilding the user's anime UI."""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [ROOT / 'IC_Study_Anime.html', ROOT / 'ic-study-online/source/study.html']
BANK_RE = r'(<script[^>]*id=["\']question-bank["\'][^>]*>)([\s\S]*?)(</script>)'
SHORT_RE = r'<script id="short-explanations" type="application/json">[\s\S]*?</script>\n?'
rows = {}
for line in (ROOT / 'data/short-explanations.tsv').read_text(encoding='utf-8').splitlines():
    parts = line.split('\t')
    assert len(parts) in (2, 3), parts[0]
    assert parts[0] not in rows, parts[0]
    rows[parts[0]] = parts[1:]

questions = json.loads((ROOT / 'data/questions.json').read_text(encoding='utf-8'))
norm = lambda text: re.sub(r'\s+', ' ', text).strip().casefold()
by_question = {norm(q['question']): q['id'] for q in questions if q['id'] in rows}
conflicts = {
    'DGT302-510', 'DGT302-519', 'DGT302-521', 'DGT302-529', 'COS201-941',
    'ICI211-268', 'ICI211-334', 'ICI211-350', 'ICI211-363', 'ICI211-405',
    'ICI211-407', 'ICI211-411', 'ICI211-433', 'ICI211-440', 'ICI211-450',
}

def resolve(question_id, seen=None):
    seen = set() if seen is None else seen
    assert question_id not in seen, 'Alias cycle: ' + question_id
    seen.add(question_id)
    row = rows[question_id]
    if row[0].startswith('@'):
        return resolve(row[0][1:], seen)
    assert len(row) == 2 and all(row), question_id
    return {'reason': row[0], 'tip': row[1]}

explanations = {}
for q in questions:
    key = q['id'] if q['id'] in rows else by_question[norm(q['question'])]
    entry = dict(resolve(key))
    if q['id'] in conflicts:
        entry['sourceConflict'] = True
    explanations[q['id']] = entry
audit_path=ROOT/'data/answer-audit.json'
if audit_path.exists():
    for qid,a in json.loads(audit_path.read_text(encoding='utf-8')).items():
        explanations[qid].update(reason=a['reason'],tip=a['tip'],sourceConflict=a.get('reviewKind')!='confirmed',verified=True,
            reviewKind=a.get('reviewKind','corrected'),reviewedAt=a['reviewedAt'],
            originalAnswer=a['original']['answer'],correctedAnswer=a['changes'].get('answer',a['original']['answer']),
            correctionNote=a['note'],references=a['references'])
tip_review_path=ROOT/'data/tip-review.json'
if tip_review_path.exists():
    tip_review=json.loads(tip_review_path.read_text(encoding='utf-8'))
    for change in tip_review['changes']:
        explanations[change['id']].update(change['after'],tipReviewedAt=tip_review['reviewedAt'])
        if change.get('references'):explanations[change['id']]['references']=change['references']
assert len(explanations) == 959

css = '''/* IC_SHORT_EXPLANATIONS */
.quick-explanation{margin-top:14px;user-select:text;color:var(--ink);font-size:16px;line-height:1.65;overflow-wrap:anywhere}
.quick-explanation .explain-row{margin:0 0 12px;font-size:16px;color:var(--ink);line-height:1.65}
.quick-explanation .explain-label{display:block;font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;margin-bottom:3px;color:var(--green)}
.quick-explanation .quick-tip{padding:12px 15px;border:1px solid var(--line);border-left:3px solid var(--green);border-radius:10px;background:var(--paper,#fff)}
.quick-explanation .explain-warning{font-size:13px;line-height:1.6;padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:12px;color:var(--ink);background:var(--paper,#fff)}
.explanation-actions{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:12px}
.explanation-actions .textbtn{font-size:12px;font-weight:650}
.feedback .quick-explanation p{color:var(--ink)}
@media(max-width:600px){.quick-explanation,.quick-explanation .explain-row{font-size:15px}.quick-explanation .quick-tip{padding:10px 12px}}
/* END_IC_SHORT_EXPLANATIONS */'''

renderer = r'''function shortExplanation(q){
 const x=SHORT_EXPLANATIONS[q.id];
 if(!x)return '<p class="explain-warning">Câu này chưa có lời giải rút gọn. Bạn có thể mở ảnh nguồn để đối chiếu.</p>';
 const changed=S.overrides[q.id]&&!same(S.overrides[q.id],q.answer);
 const refs=(x.references||[]).filter(r=>/^https:\/\//.test(r.url)).map(r=>`<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a>`).join(' · ');
 return `<div class="quick-explanation" lang="vi">${x.verified?`<div class="explain-warning" role="note"><strong>${x.reviewKind==='confirmed'?'Đã đối chiếu, giữ nguyên đáp án':'Đã kiểm tra và hiệu chỉnh'}</strong> · Theo thứ tự ảnh gốc: ${esc(x.correctionNote)}</div>`:x.sourceConflict?'<div class="explain-warning" role="note">Khóa nguồn cần kiểm tra thêm.</div>':''}${changed?'<div class="explain-warning">Bạn đang dùng đáp án hiệu chỉnh cá nhân. Lời giải kiến thức bên dưới không thay đổi theo khóa cá nhân.</div>':''}<p class="explain-row"><strong class="explain-label">Vì sao đúng</strong>${esc(x.reason)}</p><p class="explain-row quick-tip"><strong class="explain-label">✦ Mẹo chọn nhanh</strong>${esc(x.tip)}</p>${refs?`<p class="quiet" style="font-size:12px">Đối chiếu kiến thức: ${refs}</p>`:''}<div class="explanation-actions"><button class="textbtn" data-act="copy-explanation" data-id="${q.id}">Sao chép lời giải ↗</button><button class="textbtn" data-act="zoom" data-id="${q.id}" data-kind="note">Đối chiếu ảnh nguồn ↗</button></div></div>`;
}
function sessionKeys(q,a,orders=S.session?.optionOrders){const candidate=orders?.[q.id],order=Array.isArray(candidate)&&candidate.length===q.options.length&&new Set(candidate).size===q.options.length&&candidate.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length)?candidate:q.options.map((_,i)=>i);return a.map(i=>order.indexOf(i)).sort((a,b)=>a-b).map(choiceLabel).join(' + ')}
function explanation(q,a){return `<section class="feedback ${a&&!correct(q,a)?'bad':''}" aria-live="polite"><h3>${a?(correct(q,a)?'✓ Đúng theo khóa chấm':'Cùng xem lại câu này.'): 'Đáp án và cách nhớ'}</h3><p>Đáp án ${S.overrides[q.id]?'bạn đã hiệu chỉnh':SHORT_EXPLANATIONS[q.id]?.verified?'đã kiểm tra':'hiện tại'}: <strong>${sessionKeys(q,answerKey(q))}</strong></p>${shortExplanation(q)}</section>`}
async function copyExplanation(id){
 const q=BY_ID.get(id),x=SHORT_EXPLANATIONS[id];if(!q||!x)return;
 const text=q.id+'\nĐáp án theo khóa chấm: '+sessionKeys(q,answerKey(q),view==='result'?S.history[resultIndex]?.optionOrders||{}:S.session?.optionOrders||{})+'\n'+(x.verified?x.correctionNote+'\n':'')+'Vì sao đúng: '+x.reason+'\nMẹo chọn nhanh: '+x.tip+(x.references?.length?'\nTham khảo: '+x.references.map(r=>r.url).join('\n'):'');
 try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else{const t=document.createElement('textarea');t.value=text;document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)throw Error()}toast('Đã sao chép lời giải.')}catch(e){modal(`<h2>Sao chép lời giải</h2><p>Bôi đen rồi nhấn Ctrl+C.</p><textarea readonly style="width:100%;height:240px">${esc(text)}</textarea>`)}
}
'''

payload = json.dumps(explanations, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
backup = ROOT / 'backups/before-short-explanations-2026-11-08'
backup.mkdir(parents=True, exist_ok=True)
for path in TARGETS:
    text = path.read_text(encoding='utf-8')
    original_bank = re.search(BANK_RE, text).group(2)
    bank = json.loads(original_bank)
    assert {q['id'] for q in bank} == set(explanations)
    for q in bank:
        original = next(item for item in questions if item['id'] == q['id'])
        assert q['answer'] == original['answer'], q['id']
    backup_path = backup / ('offline.html' if path == TARGETS[0] else 'online-source.html')
    if not backup_path.exists(): shutil.copy2(path, backup_path)
    text = re.sub(SHORT_RE, '', text)
    bank_end = re.search(BANK_RE, text).end()
    text = text[:bank_end] + '\n<script id="short-explanations" type="application/json">' + payload + '</script>\n' + text[bank_end:]
    text = re.sub(r'<style>\s*/\* IC_SHORT_EXPLANATIONS \*/[\s\S]*?/\* END_IC_SHORT_EXPLANATIONS \*/\s*</style>\n?', '', text)
    text = text.replace('</head>', '<style>\n' + css + '\n</style>\n</head>', 1)
    # Replace only the old explanation renderer; all custom themes and render logic remain.
    if 'function shortExplanation(q)' in text:
        start=text.index('function shortExplanation(q)')
    else:
        start=text.index('function explanation(q,a)')
    end=text.index('function player()', start)
    const_line="const SHORT_EXPLANATIONS=JSON.parse(document.getElementById('short-explanations').textContent);\n"
    if const_line not in text:
        renderer_text=const_line+renderer
    else:
        renderer_text=renderer
    text=text[:start]+renderer_text+text[end:]
    old='<details><summary style="font-size:12px;color:var(--green);cursor:pointer">Xem giải thích từ nguồn</summary><img class="source-note" loading="lazy" src="${q.noteImage}" alt="Đáp án và giải thích từ nguồn"></details>'
    if old in text: text=text.replace(old, '${shortExplanation(q)}', 1)
    if "else if(a==='copy-explanation')" not in text:
        text=text.replace("else if(a==='copy')copyQuestion();", "else if(a==='copy')copyQuestion();\n else if(a==='copy-explanation')copyExplanation(el.dataset.id);", 1)
    text=text.replace('Mỗi câu đều có đáp án và ảnh giải thích từ tài liệu gốc.', 'Mỗi câu có lý do ngắn gọn và mẹo keyword bằng chữ. Ảnh nguồn chỉ mở khi cần đối chiếu.')
    assert re.search(BANK_RE, text).group(2) == original_bank, 'Question bank changed'
    assert '<img class="source-note"' not in text[text.index('function shortExplanation(q)'):text.index('function player()')]
    path.write_text(text, encoding='utf-8')

(ROOT / 'ic-study-online/source/short-explanations.json').write_text(json.dumps(explanations, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(f'Updated offline + online anime: {len(explanations)} text explanations; {len(conflicts)} source-key caveats; question banks unchanged.')
