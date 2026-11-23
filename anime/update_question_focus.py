from pathlib import Path
p=Path(__file__).resolve().parent/'app.js'
s=p.read_text(encoding='utf-8')
old="function move(delta){const s=S.session;s.index=Math.max(0,Math.min(s.ids.length-1,s.index+delta));restoreSessionDraft();showSource=false;flipped=false;persist();render();window.scrollTo({top:0,behavior:'instant'})}"
new="""function focusCurrentQuestion(){
 const title=document.querySelector('.question-title');if(!title?.getBoundingClientRect)return;
 const choices=document.querySelector('.question-card .options')||title,start=title.getBoundingClientRect(),end=choices.getBoundingClientRect();
 const inset=Math.max(24,(window.innerHeight-(end.bottom-start.top))/2);
 window.scrollTo({top:Math.max(0,window.scrollY+start.top-inset),behavior:'instant'});
}
function move(delta){const s=S.session;s.index=Math.max(0,Math.min(s.ids.length-1,s.index+delta));restoreSessionDraft();showSource=false;flipped=false;persist();render();focusCurrentQuestion()}"""
assert old in s
s=s.replace(old,new)
s=s.replace("function setView(v){persist();view=v;page=0;render();window.scrollTo({top:0,behavior:'instant'})}","function setView(v){persist();view=v;page=0;render();if(v==='player')focusCurrentQuestion();else window.scrollTo({top:0,behavior:'instant'})}")
p.write_text(s,encoding='utf-8')
