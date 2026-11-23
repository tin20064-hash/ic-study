from pathlib import Path
p=Path(__file__).resolve().parent.parent/'account/admin.js'
s=p.read_text(encoding='utf-8')
old="${u.disabled?'Mở tài khoản':'Khóa tài khoản'}</button>"
new=old+'''<button class="danger" data-action="delete-user" data-id="${u.id}">Xóa tài khoản</button>'''
assert s.count(old)==1
p.write_text(s.replace(old,new),encoding='utf-8')
