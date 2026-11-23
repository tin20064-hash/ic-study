from pathlib import Path
root=Path(__file__).resolve().parent
p=root/'appearance.js';s=p.read_text(encoding='utf-8')
s=s.replace("function applyLook(save=false){", "function syncArtwork(){document.querySelectorAll('.hero-background').forEach(img=>{const src=look.wallpaper||ANIME_ART;if(img.getAttribute('src')!==src)img.src=src;img.alt=look.wallpaper?'Ảnh nền bạn đã chọn':'Bạn đồng hành IC Study'})}\nfunction applyLook(save=false){document.body.dataset.userWallpaper=look.wallpaper?'true':'false';")
s=s.replace("document.querySelectorAll('[data-ui=\"appearance\"]').forEach", "syncArtwork();document.querySelectorAll('[data-ui=\"appearance\"]').forEach")
s=s.replace('Dùng nền theo theme','Dùng nền mặc định').replace('Đã dùng lại ảnh nền theo theme.','Đã dùng lại ảnh nền mặc định.').replace('Ảnh bạn đồng hành tự phối màu theo theme đang chọn.','Banner và ảnh bạn đồng hành dùng cùng ảnh nền bạn chọn, giữ nguyên màu gốc.')
p.write_text(s,encoding='utf-8')
p=root/'app.js';s=p.read_text(encoding='utf-8');old=":sources())}";assert old in s;s=s.replace(old,":sources());if(typeof syncArtwork==='function')syncArtwork()}");p.write_text(s,encoding='utf-8')
p=root/'themes.css';s=p.read_text(encoding='utf-8')
s=s.replace('/* Theme emblems and companion portraits use the same palette as the study UI.\n   Luminosity keeps the illustration\'s detail while taking hue from the theme. */','/* Theme emblems follow the palette; artwork keeps its original colours. */')
s=s.replace('background-blend-mode:luminosity;', 'background-image:var(--user-wall,var(--anime-art));background-blend-mode:normal;')
s=s.replace('background-image:linear-gradient(100deg,var(--soft),transparent),var(--anime-art);', 'background-image:linear-gradient(100deg,var(--soft),transparent),var(--user-wall,var(--anime-art));')
s=s.replace('background-blend-mode:normal,luminosity;', 'background-blend-mode:normal,normal;')
s=s.replace('.hero-background{mix-blend-mode:luminosity}', '.hero-background{mix-blend-mode:normal;filter:none}')
s+='\nbody[data-user-wallpaper=true] .study-companion-avatar{background-position:center;background-size:cover}body[data-user-wallpaper=true] .sidebar-buddy{background-position:0 0,center}body[data-user-wallpaper=true] .hero-background{object-position:center}\n'
p.write_text(s,encoding='utf-8')
