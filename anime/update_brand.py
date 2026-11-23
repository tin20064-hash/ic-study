from pathlib import Path
import re
root=Path(__file__).resolve().parent
p=root/'index.html';s=p.read_text(encoding='utf-8')
s=s.replace('Sakura Study Club','IC Study').replace('Sakura Study','IC Study')
s=re.sub(r'(<span class="brandmark" aria-hidden="true">)<svg.*?</svg>(</span>)',r'\1\2',s)
s=s.replace('<span class="avatar" aria-hidden="true">✿</span>','<span class="avatar" aria-hidden="true"></span>')
p.write_text(s,encoding='utf-8')
p=root/'home.js';s=p.read_text(encoding='utf-8').replace('SAKURA STUDY CLUB','IC STUDY').replace('Bạn đồng hành anime tóc tím, tai mèo, áo hồng ngồi học trong căn phòng sakura','Bạn đồng hành anime trong góc học IC Study');p.write_text(s,encoding='utf-8')
p=root/'appearance.js';s=p.read_text(encoding='utf-8').replace('Dùng nền Sakura','Dùng nền theo theme').replace('Đã dùng lại ảnh nền Sakura.','Đã dùng lại ảnh nền theo theme.').replace('Banner bạn đồng hành vẫn giữ để luôn có một góc anime dễ thương.','Ảnh bạn đồng hành tự phối màu theo theme đang chọn.');p.write_text(s,encoding='utf-8')
