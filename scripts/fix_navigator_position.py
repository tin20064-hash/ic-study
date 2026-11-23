from pathlib import Path
root=Path(__file__).resolve().parent.parent
helper='''const navigatorScrollPositions=new Map();
function rememberNavigatorScroll(){
 const grid=document.querySelector('.number-grid');if(!grid?.dataset?.sessionKey)return;
 navigatorScrollPositions.set(grid.dataset.sessionKey,{top:grid.scrollTop,left:grid.scrollLeft});
}
function restoreNavigatorScroll(){
 const grid=document.querySelector('.number-grid');if(!grid||!S.session)return;
 const key=String(S.session.id||S.session.started||S.session.ids.join('|'));grid.dataset.sessionKey=key;
 const saved=navigatorScrollPositions.get(key);
 if(saved){grid.scrollTop=saved.top;grid.scrollLeft=saved.left;return}
 const current=grid.querySelector('.qnumber.current');
 if(current&&grid.scrollHeight>grid.clientHeight)grid.scrollTop=Math.max(0,grid.scrollTop+current.getBoundingClientRect().top-grid.getBoundingClientRect().top-(grid.clientHeight-current.offsetHeight)/2);
}
'''
files=[root/'IC_Study_Anime.html',root/'ic-study-online/source/study.html']
backup=root/'backups/before-navigator-2026-11-08';backup.mkdir(parents=True,exist_ok=True)
for p in files:
 data=p.read_bytes();s=data.decode('utf-8')
 assert 'navigatorScrollPositions' not in s
 if p.parent==root:(backup/p.name).write_bytes(data)
 s=s.replace('function render(){',helper+'function render(){\n rememberNavigatorScroll();',1)
 needle=" if(typeof syncArtwork==='function')syncArtwork();"
 assert needle in s
 s=s.replace(needle," restoreNavigatorScroll();\n"+needle,1)
 # A local-file origin cannot send its localStorage directly to the website.
 # Keep the current filename and storage keys, and offer its existing JSON export.
 if p.parent==root:
  s=s.replace('<button class="textbtn" data-act="backup">Xuất bản sao tiến độ ↗</button>', '<button class="textbtn" data-act="backup">Xuất bản sao tiến độ ↗</button><button class="textbtn" data-act="transfer-web">Chuyển tiến độ lên web ↗</button>',1)
  marker=" if(a==='nav'){setView(el.dataset.view)}"
  assert marker in s
  s=s.replace(marker,marker+'''\n else if(a==='transfer-web')modal(`<h2>Chuyển tiến độ đang học lên web</h2><p>1. Nhấn “Xuất bản sao tiến độ” bên dưới để tải file JSON.<br>2. Đăng nhập IC Study online.<br>3. Chọn “Nhập tiến độ từ HTML”, chọn file JSON vừa tải rồi gộp vào tài khoản.</p><p>File này có <strong>${Object.keys(S.responses).length} câu đã trả lời</strong> và ${S.sessions.length} phiên học. Hãy xuất từ đúng file và trình duyệt bạn đã dùng để học.</p><div class="btnrow">${btn('Xuất bản sao tiến độ','backup','','primary')}<a class="btn" href="https://ic-study-anime.lighthippo13.chatgpt.site" target="_blank" rel="noopener">Mở IC Study online ↗</a></div>`);''',1)
 p.write_bytes(s.encode('utf-8'))
 print('Updated',p.name,'without changing question data or storage keys')
