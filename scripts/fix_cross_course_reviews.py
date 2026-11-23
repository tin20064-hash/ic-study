"""Keep aggregate review pools independent of the active session in both anime files."""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
targets = [ROOT/'IC_Study_Anime.html', ROOT/'ic-study-online/source/study.html']
backup = ROOT/'backups/before-cross-course-review-2026-11-08'
backup.mkdir(parents=True, exist_ok=True)

helpers = '''function answeredQuestionIds(){return BANK.filter(q=>S.responses[q.id]?.value?.length).map(q=>q.id)}
function wrongQuestionIds(){return answeredQuestionIds().filter(id=>!correct(BY_ID.get(id),S.responses[id].value))}
function collectionQuestions(mode){
 const pool=mode==='mistakes'?new Set(wrongQuestionIds()):mode==='answered'?new Set(answeredQuestionIds()):null;
 const focus=studyFocus(),term=query.trim().toLowerCase();
 return subjectQuestions().filter(q=>(!focus||q.subject===focus)&&(pool?pool.has(q.id):S.bookmarks[q.id])&&(!term||`${q.question} ${q.options.join(' ')} ${q.id}`.toLowerCase().includes(term)));
}
'''
collection = '''function collection(mode){
 const isWrong=mode==='mistakes',isAnswered=mode==='answered',arr=collectionQuestions(mode),total=arr.length;
 const title=isWrong?'Quay lại, làm tốt hơn.':isAnswered?'Luyện lại những câu đã làm':'Những câu bạn đã đánh dấu';
 const description=isWrong?'Tổng hợp câu còn sai từ lần trả lời đã chấm gần nhất của từng câu, trên tất cả các môn và phiên học. Làm lại đúng sẽ đưa câu đó ra khỏi danh sách.':isAnswered?'Gồm các câu bạn đã kiểm tra đáp án hoặc nộp bài thi, cả đúng và sai. Mỗi lượt luyện là phiên mới, ẩn đáp án cũ cho đến khi bạn trả lời lại.':'Một bộ sưu tập nhỏ cho những câu khó, câu hay hoặc kiến thức bạn muốn xem lại.';
 return `${header(isWrong?'BIẾN LỖI SAI THÀNH KIẾN THỨC':isAnswered?'CỦNG CỐ NHỮNG GÌ ĐÃ HỌC':'GIỮ LẠI ĐIỀU CẦN NHỚ',title,description)}${filters(false)}<div class="section-head"><span class="quiet">${total} câu${subject==='all'?' · tất cả 4 môn':` · ${esc(subject)}`}</span>${total?btn(isWrong?'Tạo đề luyện câu sai →':isAnswered?'Luyện lại câu đã làm →':'Ôn bộ đã lưu →','start-collection',`data-collection="${mode}"`,'small primary'):''}</div>${total?questionList(arr.slice(page*20,page*20+20))+pagination(total):empty(isWrong?'Chưa có câu cần ôn lại':isAnswered?'Chưa có câu đã làm trong nhóm này':'Chưa có câu được đánh dấu',isWrong?'Các câu trả lời sai đã chấm sẽ tự xuất hiện tại đây, kể cả khi bạn đổi môn hoặc tạo phiên mới.':isAnswered?'Kiểm tra đáp án trong luyện tập hoặc nộp bài thi để thêm câu vào mục này.':'Chạm vào ngôi sao ở đầu mỗi câu để thêm vào bộ sưu tập.')}`;
}
'''
new_session = """function newSession(ids,mode,extra={}){ids=studyRestrictIds(ids);if(studyFocus())subject=studyFocus();if(!ids.length){toast('Chưa có câu phù hợp với bộ lọc.');return}persist();S.session={id:sessionId(),mode,ids,index:0,answers:{},drafts:{},wrongIds:[],started:Date.now(),status:'saved',...extra,fresh:true};draft=[];showSource=false;flipped=false;S.lastSubject=subject;persist();setView('player')}"""

for target in targets:
    text=target.read_text(encoding='utf-8')
    name='offline.html' if target==targets[0] else 'online-source.html'
    if not (backup/name).exists(): shutil.copy2(target,backup/name)
    old_bank=re.search(r'<script[^>]*id="question-bank"[^>]*>(.*?)</script>',text,re.S)[1]
    def replace(old,new):
        assert old in text, 'Missing anchor: '+old[:100]
        return text.replace(old,new,1)
    # The global pool is derived from latest checked answers, never a session snapshot.
    text=replace("out.wrongIds=Array.isArray(data.wrongIds)?[...new Set(data.wrongIds.filter(id=>BY_ID.has(id)))]:Object.keys(out.responses).filter(id=>!same(out.responses[id].value,out.overrides[id]||BY_ID.get(id).answer));", "out.wrongIds=Object.keys(out.responses).filter(id=>out.responses[id].value?.length&&!same(out.responses[id].value,out.overrides[id]||BY_ID.get(id).answer));")
    text=replace("if(!s.id)s.id=sessionId();s.fresh=true;s.updated=Date.now();s.drafts??={};s.wrongIds=[...(S.wrongIds||[])];", "if(!s.id)s.id=sessionId();s.fresh=true;s.updated=Date.now();s.drafts??={};s.wrongIds=s.mode==='exam'&&s.status!=='completed'?[]:s.ids.filter(id=>s.answers[id]?.length&&!correct(BY_ID.get(id),s.answers[id]));")
    text=replace("function updateWrong(id,a){S.wrongIds??=[];if(correct(BY_ID.get(id),a))S.wrongIds=S.wrongIds.filter(x=>x!==id);else if(!S.wrongIds.includes(id))S.wrongIds.push(id)}", "function updateWrong(id,a){S.wrongIds=wrongQuestionIds()}")
    text=replace("function wrongQuestionIds(){return (S.wrongIds||[]).filter(id=>BY_ID.has(id))}\n",helpers)
    text=replace("S.session=JSON.parse(JSON.stringify(saved));S.wrongIds=[...(saved.wrongIds||[])];", "S.session=JSON.parse(JSON.stringify(saved));")
    text=replace("S.session=null;S.wrongIds=[];draft=[];", "S.session=null;draft=[];")
    text=replace("function persist(){saveActiveSession();", "function persist(){S.wrongIds=wrongQuestionIds();saveActiveSession();")
    text=replace("reviewWrong:s.reviewWrong===true,wrongIds:", "reviewWrong:s.reviewWrong===true,reviewAnswered:s.reviewAnswered===true,wrongIds:")
    text=replace("(s.reviewWrong?'Luyện câu sai':s.mode==='exam'", "(s.reviewWrong?'Luyện câu sai':s.reviewAnswered?'Luyện câu đã làm':s.mode==='exam'")
    text=replace("function setView(v){if(v==='home')", "function setView(v){if(v!==view&&['mistakes','answered','saved'].includes(v)){subject=studyFocus()||'all';query='';filter='all'}if(v==='home')")
    text=replace("['mistakes','retry','Luyện câu sai'],", "['mistakes','retry','Luyện câu sai'],['answered','check','Luyện câu đã làm'],")
    text=replace("${wrongQuestionIds().length}</span>`:v==='saved'", "${studyRestrictIds(wrongQuestionIds()).length}</span>`:v==='answered'?`<span class=\"count\">${studyRestrictIds(answeredQuestionIds()).length}</span>`:v==='saved'")
    text=replace("<option value=\"unanswered\" ${filter==='unanswered'?'selected':''}>Chưa trả lời</option>", "<option value=\"unanswered\" ${filter==='unanswered'?'selected':''}>Chưa trả lời</option><option value=\"answered\" ${filter==='answered'?'selected':''}>Đã làm · luyện lại</option>")
    text=replace("if(filter==='unanswered')arr=arr.filter(q=>!S.responses[q.id]);", "if(filter==='unanswered')arr=arr.filter(q=>!S.responses[q.id]?.value?.length);if(filter==='answered')arr=arr.filter(q=>S.responses[q.id]?.value?.length);")
    a=text.index('function collection(mode)');b=text.index('function pagination(',a)
    text=text[:a]+collection+text[b:]
    a=text.index('function newSession(');b=text.index('\nlet pendingSession=',a)
    text=text[:a]+new_session+text[b:]
    text=replace("else if(a==='start-collection'){filter=el.dataset.collection==='mistakes'?'wrong':'saved';newSession(shuffle(matching()).map(q=>q.id),'practice',{reviewWrong:el.dataset.collection==='mistakes'})}", "else if(a==='start-collection'){const mode=el.dataset.collection;newSession(shuffle(collectionQuestions(mode)).map(q=>q.id),'practice',{reviewWrong:mode==='mistakes',reviewAnswered:mode==='answered'})}")
    text=replace("['practice','flash','exam','saved','mistakes','brief']", "['practice','flash','exam','saved','mistakes','answered','brief']")
    text=replace("view==='saved'||view==='mistakes'?collection(view)", "view==='saved'||view==='mistakes'||view==='answered'?collection(view)")
    text=replace("s.reviewWrong?'Đề luyện câu sai':'Tập trung vào câu hiện tại.'", "s.reviewWrong?'Đề luyện câu sai':s.reviewAnswered?'Luyện lại câu đã làm':'Tập trung vào câu hiện tại.'")
    text=replace("s.reviewWrong?'Luyện câu sai':'Luyện tập'", "s.reviewWrong?'Luyện câu sai':s.reviewAnswered?'Luyện câu đã làm':'Luyện tập'")
    text=text.replace('Phiên mới có đáp án và danh sách câu sai riêng. Phiên cũ vẫn giữ bài làm để tiếp tục.', 'Mỗi phiên có bài làm riêng. Mục Luyện câu sai và Luyện câu đã làm tổng hợp kết quả đã chấm của tất cả các môn.')
    text=text.replace('Mỗi lần bắt đầu sẽ tạo phiên mới, trống đáp án và danh sách câu sai.', 'Mỗi lần bắt đầu sẽ tạo phiên mới với đáp án trống. Câu sai của các môn khác và tiến độ tổng vẫn được giữ.')
    assert re.search(r'<script[^>]*id="question-bank"[^>]*>(.*?)</script>',text,re.S)[1]==old_bank
    target.write_text(text,encoding='utf-8')
print('Updated both anime editions: global latest-answer review pools + answered-question practice; question banks preserved.')
