"""Merge the complete, independently researched review without rebuilding the UI."""
import copy
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'ic-study-online'
SOURCE = SITE / 'source'
DATE = '2026-11-09'
TARGETS = [ROOT / 'IC_Study_Anime.html', SOURCE / 'study.html']

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def pattern(name):
    return r'(<script[^>]*id="'+name+r'"[^>]*>)([\s\S]*?)(</script>)'

def embedded(text, name):
    return json.loads(re.search(pattern(name), text)[2])

html = TARGETS[1].read_text(encoding='utf-8')
bank = embedded(html, 'question-bank')
by = {q['id']: q for q in bank}
explanations = embedded(html, 'short-explanations')
audit = read(SOURCE / 'answer-audit.json')
reports = {s:read(ROOT / f'data/full-audit-{s}.json') for s in ('DGT302','COS201','ICI211','LOS201')}
proposals = []

def refs(items):
    out=[]
    for r in items:
        if isinstance(r,str):
            from urllib.parse import urlparse
            r={'title':urlparse(r).netloc.replace('www.','')+' · tài liệu đối chiếu','url':r}
        if r not in out: out.append(r)
    return out

for row in reports['DGT302']['ledger']:
    if not row.get('proposal'): continue
    p=copy.deepcopy(row['proposal'])
    p.update(id=row['id'],reason=p['reasonVi'],tip=p['tipVi'],kind=p['severity'])
    p['note']='Đã khôi phục ký hiệu và làm rõ giả thiết; đáp án giữ nguyên.' if p['severity']=='ocr' else 'Đã làm rõ điều kiện áp dụng; đáp án giữ nguyên.'
    if row['id']=='DGT302-505':
        p['note']='Bản cũ có A và D cùng triệt alias vì chỉ khác dấu toàn cục. Đã sửa phương án nhiễu và nêu rõ quan hệ QMF.'
        p['originalAcceptedAlternatives']=[[0],[3]]
    if row['id']=='DGT302-580':
        p.update(reviewKind='confirmed',note='Giữ nguyên đáp án có ω/2. Biểu thức dùng 2ω trong phương án C không phải công thức giảm mẫu D=2.')
    proposals.append(p)

proposals += copy.deepcopy(reports['COS201']['proposals'])
proposals += copy.deepcopy(reports['ICI211']['changes'])
proposals += copy.deepcopy(reports['LOS201']['changes'])
sdm='https://www.mathworks.com/help/msblks/ug/delta-sigma-modulator-data-converter-with-half-band-filter-for-decimation.html'
proposals += [
 dict(id='COS201-852',kind='scope',changes={'question':'Which set of topics provides the signal-level foundation for studying communication systems?'},reason='Biểu diễn tín hiệu, điều chế và nhiễu là các nội dung nền để phân tích đường truyền thông tin.',tip='Communications foundation → signals, modulation, noise.',note='Bỏ khẳng định về chương cụ thể khi không có đề cương; hỏi trực tiếp kiến thức nền.',references=['https://ocw.mit.edu/courses/6-450-principles-of-digital-communications-i-fall-2006/']),
 dict(id='COS201-886',kind='scope',changes={'question':'In the OSI model, modulation, waveform coding and transmitting signals through physical channels are primarily functions of which layer?'},reason='Lớp vật lý xử lý dạng sóng và việc truyền bit qua môi trường; các lớp trên xử lý khung, định tuyến hoặc dịch vụ ứng dụng.',tip='Modulation / waveform / physical medium → Physical layer.',note='Thay câu hỏi phạm vi giáo trình bằng chức năng lớp OSI có thể đối chiếu.',references=['https://technav.ieee.org/topic/physical-layer/']),
 dict(id='COS201-898',kind='scope',changes={'question':'What is a characteristic advantage of an oversampled low-pass delta-sigma modulator followed by digital low-pass filtering and decimation?','options':by['COS201-898']['options'][:3]+['Reducing in-band quantization noise through oversampling and noise shaping']},reason='Vòng delta-sigma đẩy phần lớn nhiễu lượng tử ra ngoài dải quan tâm; lọc số và giảm mẫu loại bớt nhiễu ngoài dải. Không loại bỏ lượng tử hóa hoặc mọi dạng overload.',tip='delta-sigma → oversampling + noise shaping + low-pass/decimation.',note='Nhận định giảm slope overload phụ thuộc kiến trúc. Đã hỏi rõ lợi ích đặc trưng của delta-sigma thông thấp.',references=[sdm]),
]
assert len({p['id'] for p in proposals})==len(proposals)
for p in proposals:
    q=by[p['id']]
    if p['id']=='LOS201-95':
        p['changes']['question']='In the legacy Linux Kbuild model, which TWO listed artifacts are respectively the final uncompressed ELF kernel and an intermediate aggregation of built-in objects?'
    if p['id']=='LOS201-172':
        p['changes']['question']='What is the exact name, including the final revision number, of the last BSD distribution released by Berkeley CSRG?'
        p['note']='Làm rõ tên phiên bản chính xác: họ 4.4BSD-Lite có Release 1 và Release 2; thêm E cho bản cuối Release 2 (1995).'
    if p['id']=='COS201-1009':
        p['changes']['question']='For a block code, which general guarantee holds whenever its minimum Hamming distance increases?'
    before={k:copy.deepcopy(q[k]) for k in ('question','options','answer')}
    original=copy.deepcopy(audit.get(q['id'],{}).get('original',before))
    old_entry=copy.deepcopy(audit.get(q['id']))
    q.update(p['changes'])
    q['review']=False
    e=explanations[q['id']]
    reason=p['reason']
    tip=p.get('tip') or e['tip']
    # Mechanical OCR repairs keep the already-written Vietnamese conceptual explanation.
    if p['id'] in ['LOS201-'+str(i) for i in (14,25,60,102,114,116,130,138,155,178)] or (reason.startswith(('Restored','Corrected','Keep','The correct','OCR')) and p.get('kind')=='ocr'):
        reason=e['reason'];tip=e['tip']
    note=p['note']
    if q['id'].startswith('COS') and q['id'] not in ('COS201-852','COS201-886','COS201-898'):
        note='Đã làm rõ giả thiết và phương án để có một đáp án phù hợp.'
        if p.get('originalAcceptedAlternatives'):
            note='Bản cũ có cách hiểu khiến nhiều phương án cùng đúng. Đã làm rõ câu hỏi hoặc phương án; xem lý do bên dưới.'
        if q['id']=='COS201-829':note='Đổi khóa B → E: từ điển LZ lớn hơn không bảo đảm tỷ lệ nén tăng với mọi dữ liệu.'
    if p.get('kind')=='ocr' and q['id'].startswith('LOS') and not any('\u00c0'<=c<='\u1ef9' for c in note):
        note='Đã sửa ký tự nhận dạng sai; đáp án giữ nguyên.'
    review_kind=p.get('reviewKind','corrected')
    r=refs(p.get('references',[]))
    e.update(reason=reason,tip=tip,verified=True,reviewKind=review_kind,reviewedAt=DATE,
             sourceConflict=review_kind!='confirmed',originalAnswer=original['answer'],correctedAnswer=q['answer'],correctionNote=note,references=r)
    merged_changes={k:copy.deepcopy(q[k]) for k in ('question','options','answer') if q[k]!=original[k]}
    merged_changes['review']=False
    a=dict(reviewedAt=DATE,kind=p.get('kind','wording'),reviewKind=review_kind,original=original,changes=merged_changes,
           reason=reason,tip=tip,note=note,references=r)
    if old_entry:a['previousReview']=old_entry
    if p.get('originalAcceptedAlternatives'):a['originalAcceptedAlternatives']=p['originalAcceptedAlternatives']
    audit[q['id']]=a

# Reconcile the three context-dependent questions by explicitly documented rewording.
for row in reports['COS201']['ledger']:
    if row['id'] in ('COS201-852','COS201-886','COS201-898'):
        row['originalReviewStatus']=row['status'];row['status']='resolved_by_rewording'
        row['resolution']=audit[row['id']]['changes']

keywords=read(SOURCE/'keyword-cards.json')
for row in reports['COS201']['keywordCards']:
    if row.get('changes'):
        card=next(k for k in keywords if k['id']==row['id'])
        card.update(row['changes'])
        if row['id']=='COS201-KW05':card['reason']='Huffman tối ưu độ dài trung bình trong lớp mã prefix theo ký hiệu. Trường hợp 2^k ký hiệu đồng xác suất cho mã cùng dài k bit.'

backup=ROOT/'backups/before-full-answer-review-2026-11-09'
backup.mkdir(parents=True,exist_ok=True)
for path in TARGETS:
    dest=backup/('offline.html' if path==TARGETS[0] else 'online-source.html')
    if not dest.exists():shutil.copy2(path,dest)
    text=path.read_text(encoding='utf-8')
    target_bank=embedded(text,'question-bank')
    for q in target_bank:
        other=by[q['id']]
        for k in ('question','options','answer','review'):q[k]=copy.deepcopy(other[k])
    for name,value in [('question-bank',target_bank),('short-explanations',explanations),('keyword-cards',keywords)]:
        payload=json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
        text=re.sub(pattern(name),lambda m:m[1]+payload+m[3],text,count=1)
    text=text.replace('<strong>Đã kiểm tra và hiệu chỉnh</strong>','<strong>${x.reviewKind===\'confirmed\'?\'Đã đối chiếu, giữ nguyên đáp án\':\'Đã kiểm tra và hiệu chỉnh\'}</strong>')
    text=text.replace("reviewedAt:'2026-11-08'", "reviewedAt:e.reviewedAt||'2026-11-08'")
    path.write_text(text,encoding='utf-8')

questions=read(ROOT/'data/questions.json')
for q in questions:
    for k in ('question','options','answer','review'):q[k]=copy.deepcopy(by[q['id']][k])
write(ROOT/'data/questions.json',questions)
corrections=read(ROOT/'data/text-corrections.json')
for p in proposals:
    q=by[p['id']]
    corrections[q['id']]={**corrections.get(q['id'],{}),**{k:q[k] for k in ('question','options','answer','review')}}
write(ROOT/'data/text-corrections.json',corrections)
(ROOT/'data/short-explanations.tsv').write_text(''.join(q['id']+'\t'+explanations[q['id']]['reason']+'\t'+explanations[q['id']]['tip']+'\n' for q in bank),encoding='utf-8')
write(SOURCE/'short-explanations.json',explanations)
write(SOURCE/'keyword-cards.json',keywords)
(SOURCE/'keyword-cards.tsv').write_text(''.join('\t'.join([k['subject'],k['prompt'],*k['options'],k['reason']])+'\n' for k in keywords),encoding='utf-8')
for path in (ROOT/'data/answer-audit.json',SOURCE/'answer-audit.json'):write(path,audit)

coverage={'reviewedAt':DATE,'questionCount':len(bank),'keywordCount':len(keywords),
 'method':'All stems and all options read independently. Definitions, equations, numerical cases and ambiguous alternatives checked; targeted external verification uses primary textbooks, university course material and official project documentation. This records a reasoned review, not a guarantee of infallibility.',
 'changedThisReview':len(proposals)-1,'confirmedExample':'DGT302-580',
 'newKeyChanges':['COS201-829','ICI211-324','LOS201-172'],
 'cumulativeChangedKeys':sum(a['original']['answer']!=by[id]['answer'] for id,a in audit.items()),
 'subjects':reports}
write(SOURCE/'full-answer-review.json',coverage)
write(ROOT/'data/full-answer-review.json',coverage)
print(json.dumps({k:v for k,v in coverage.items() if k!='subjects'},ensure_ascii=False))
print('Audited records:',len(audit),'five-option questions:',sum(len(q['options'])==5 for q in bank))
