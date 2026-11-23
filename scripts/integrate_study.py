from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
def replace_once(s,old,new):
    assert old in s,old[:120]
    return s.replace(old,new)
for relative in ['src/app.js','anime/app.js']:
    p=ROOT/relative;s=p.read_text(encoding='utf-8')
    if 'studyHomeBanner()+home()' in s:continue
    s=replace_once(s,"daily:{},session:null,lastSubject:'DGT302'","daily:{},studyPlan:normalizeStudyState(),session:null,lastSubject:'DGT302'")
    s=replace_once(s," const s=data.session;"," out.studyPlan=normalizeStudyState(data.studyPlan);\n const s=data.session;")
    s=replace_once(s,"['home','home','Tổng quan'],['practice'","['home','home','Tổng quan'],['timeline','clock','Lịch ôn thi'],['brief','book','Ôn ngày cuối'],['practice'")
    s=replace_once(s,"function subjectSelect(all=true){return", "function subjectSelect(all=true){const focus=studyFocus();if(focus)return `<select id=\"subject-select\" aria-label=\"Chọn môn\"><option value=\"${focus}\">${focus} · ${SUBJECTS[focus].name} — hôm nay chỉ môn này</option></select>`;return")
    s=replace_once(s,"function matching(){let arr=subjectQuestions();","function matching(){let arr=subjectQuestions();const focus=studyFocus();if(focus)arr=arr.filter(q=>q.subject===focus);")
    s=replace_once(s,"function newSession(ids,mode,extra={}){if(!ids.length)","function newSession(ids,mode,extra={}){ids=studyRestrictIds(ids);if(studyFocus())subject=studyFocus();if(!ids.length)")
    s=replace_once(s,"return s.mode==='exam'?s.answers[q.id]:S.responses[q.id]?.value}","return (s.mode==='exam'||s.fresh)?s.answers[q.id]:S.responses[q.id]?.value}")
    s=replace_once(s,"function selectChoice(i){const s=S.session,q=currentQ();","function selectChoice(i){if(!studySessionAllowed(S.session)){toast('Phiên này có môn khác với lịch ôn hôm nay.');return}const s=S.session,q=currentQ();")
    s=replace_once(s,"if(s.mode!=='exam'&&S.responses[q.id])return;","if(s.mode!=='exam'&&currentAnswer()!==undefined)return;")
    s=replace_once(s,"function submitAnswer(){const s=S.session,q=currentQ();if(!draft.length)return;if(S.responses[q.id])return;","function submitAnswer(){if(!studySessionAllowed(S.session))return;const s=S.session,q=currentQ();if(!draft.length)return;if(currentAnswer()!==undefined)return;")
    s=replace_once(s,"complete=s.ids.filter(id=>(exam||flash)?s.answers[id]?.length:S.responses[id]).length","complete=s.ids.filter(id=>(exam||flash||s.fresh)?s.answers[id]?.length:S.responses[id]).length")
    s=replace_once(s,"const r=(exam||flash)?s.answers[id]:S.responses[id]?.value","const r=(exam||flash||s.fresh)?s.answers[id]:S.responses[id]?.value")
    s=replace_once(s,'<aside class="panel navigator"><h3>','<aside class="panel navigator">${studyBuddyWidget()}<h3>')
    old="function render(){nav();$('app').innerHTML=view==='home'?home():view==='practice'||view==='flash'?setup(view):view==='exam'?examSetup():view==='player'?player():view==='saved'||view==='mistakes'?collection(view):view==='history'?history():view==='result'?result():sources()}"
    new="function render(){const focus=studyFocus();if(focus&&['practice','flash','exam','saved','mistakes','brief'].includes(view))subject=focus;nav();$('app').innerHTML=studyFocusBanner()+(view==='home'?studyHomeBanner()+home():view==='timeline'?timelinePage():view==='brief'?briefPage():view==='practice'||view==='flash'?setup(view):view==='exam'?examSetup():view==='player'?(studySessionAllowed(S.session)?player():studyBlockedSession()):view==='saved'||view==='mistakes'?collection(view):view==='history'?history():view==='result'?result():sources())}"
    s=replace_once(s,old,new)
    s=replace_once(s,"else if(a==='daily'){newSession(shuffle(unique(BANK))", "else if(a==='daily'){newSession(shuffle(unique(BANK.filter(q=>!studyFocus()||q.subject===studyFocus())))")
    p.write_text(s,encoding='utf-8')
for relative in ['scripts/package.py','anime/build.py']:
    p=ROOT/relative;s=p.read_text(encoding='utf-8')
    if relative.startswith('scripts'):
        s=replace_once(s,"css=(ROOT/'src/styles.css').read_text(encoding='utf-8')","css=(ROOT/'src/styles.css').read_text(encoding='utf-8')+'\\n'+(ROOT/'src/study.css').read_text(encoding='utf-8')")
        s=replace_once(s,"js=(ROOT/'src/app.js').read_text(encoding='utf-8')","js=(ROOT/'src/study.js').read_text(encoding='utf-8')+'\\n'+(ROOT/'src/app.js').read_text(encoding='utf-8')")
    else:
        s=replace_once(s,"css=(DIR/'base.css').read_text(encoding='utf-8')+'\\n'+(DIR/'pastel.css').read_text(encoding='utf-8')","css=(DIR/'base.css').read_text(encoding='utf-8')+'\\n'+(ROOT/'src/study.css').read_text(encoding='utf-8')+'\\n'+(DIR/'pastel.css').read_text(encoding='utf-8')+'\\n'+(DIR/'study-pastel.css').read_text(encoding='utf-8')")
        s=replace_once(s,"js=(DIR/'app.js').read_text(encoding='utf-8')","js=(ROOT/'src/study.js').read_text(encoding='utf-8')+'\\n'+(DIR/'app.js').read_text(encoding='utf-8')")
    p.write_text(s,encoding='utf-8')
for relative in ['scripts/test_app.cjs','anime/test.cjs']:
    p=ROOT/relative;s=p.read_text(encoding='utf-8');s=s.replace("vm.runInContext(fs.readFileSync(","vm.runInContext(fs.readFileSync('src/study.js','utf8')+'\\n'+fs.readFileSync(")
    p.write_text(s,encoding='utf-8')
print('Integrated study timeline into both editions.')
