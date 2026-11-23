from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'anime/sessions.js'
s=p.read_text(encoding='utf-8')
s=s.replace(' out.session=normalizeSavedSession(data.session);', ' out.deletedSessions=(Array.isArray(data.deletedSessions)?data.deletedSessions:[]).map(normalizeSavedSession).filter(Boolean);\n out.session=normalizeSavedSession(data.session);')
s=s.replace("${blocked?'<span class=\"quiet\">Giữ phiên", "${btn('Xóa phiên','session-delete',`data-id=\"${esc(s.id)}\"`,'small session-delete')}${blocked?'<span class=\"quiet\">Giữ phiên")
s=s.replace("đây khi bạn rời trang.')}`;", "đây khi bạn rời trang.')}${deletedSessionsPanel()}`;")
s=s.replace("if(b.dataset.act==='session-resume')", "if(b.dataset.act==='session-delete')deleteSavedSession(b.dataset.id);else if(b.dataset.act==='session-restore')restoreDeletedSession(b.dataset.id);else if(b.dataset.act==='session-resume')")
s+='''
function deleteSavedSession(id){
 persist();const saved=S.sessions.find(s=>s.id===id);if(!saved)return;
 S.deletedSessions??=[];S.deletedSessions.unshift(JSON.parse(JSON.stringify(saved)));
 if(S.session?.id===id){S.session=null;S.wrongIds=[];draft=[];showSource=false;flipped=false}
 S.sessions=S.sessions.filter(s=>s.id!==id);persist();setView('sessions');toast('Đã xóa phiên. Có thể khôi phục trong “Phiên đã xóa”.');
}
function restoreDeletedSession(id){
 const saved=(S.deletedSessions||[]).find(s=>s.id===id);if(!saved)return;
 if(!S.sessions.some(s=>s.id===id))S.sessions.unshift(saved);
 S.deletedSessions=S.deletedSessions.filter(s=>s.id!==id);persist();render();toast('Đã khôi phục phiên học.');
}
function deletedSessionsPanel(){
 const deleted=S.deletedSessions||[];if(!deleted.length)return '';
 return `<details class="deleted-sessions"><summary>Phiên đã xóa (${deleted.length}) · Khôi phục khi cần</summary><div class="list">${deleted.map(s=>`<article class="list-item"><div><h3>${esc(sessionTitle(s))}</h3><p>${sessionStats(s).done}/${s.ids.length} câu đã làm</p></div>${btn('Khôi phục','session-restore',`data-id="${esc(s.id)}"`,'small')}</article>`).join('')}</div></details>`;
}
'''
assert 'session-delete' in s and '${deletedSessionsPanel()}' in s
p.write_text(s,encoding='utf-8')
for filename in ['anime/build.py','anime/test.cjs']:
 p=root/filename;s=p.read_text(encoding='utf-8').replace("ROOT/'src/sessions.js'", "DIR/'sessions.js'").replace("'src/sessions.js'", "'anime/sessions.js'");p.write_text(s,encoding='utf-8')
p=root/'anime/themes.css';s=p.read_text(encoding='utf-8');s+='\n.session-record-actions .session-delete{background:transparent;color:var(--red);border-color:color-mix(in srgb,var(--red) 25%,var(--line))}.session-record-actions .session-delete:hover{background:color-mix(in srgb,var(--red) 7%,#fff)}.deleted-sessions{margin-top:24px;border-top:1px solid var(--line);padding-top:18px}.deleted-sessions summary{cursor:pointer;color:var(--muted);font-size:12px}.deleted-sessions .list{margin-top:14px}\n';p.write_text(s,encoding='utf-8')
