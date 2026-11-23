"""Append four gentle palettes while preserving both user-maintained anime banks."""
import re
import shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
backup=ROOT/'backups/before-wallpaper-gallery-2026-11-08';backup.mkdir(parents=True,exist_ok=True)
palettes="mochi:{name:'Mochi Pink',subtitle:'Hồng kem · má hồng đáng yêu',swatch:'#fce4ee',symbol:'#aa6182',flower:'♡'},sunny:{name:'Sunny Cream',subtitle:'Vàng bơ · nắng dịu',swatch:'#fff0bd',symbol:'#9b772e',flower:'☀'},ocean:{name:'Ocean Breeze',subtitle:'Xanh biển · gió mát',swatch:'#dcf3f6',symbol:'#3b8194',flower:'≈'},starlight:{name:'Starry Night',subtitle:'Tím trời · ánh sao',swatch:'#eae5fc',symbol:'#7867aa',flower:'✶'}"
css='''/* IC_EXTRA_PALETTES */
body[data-palette=mochi]{--bg:#fff8fc;--ink:#593c50;--muted:#937b8e;--line:#efd9e7;--green:#a8557e;--soft:#fbeaf3;--accent:#a8557e;--accent-light:#f8dfea;--accent-rgb:168,85,126}
body[data-palette=sunny]{--bg:#fffcf2;--ink:#5d4c2b;--muted:#948568;--line:#eee3c6;--green:#96722d;--soft:#fbf2d9;--accent:#96722d;--accent-light:#f7e8b5;--accent-rgb:150,114,45}
body[data-palette=ocean]{--bg:#f3fcfd;--ink:#315361;--muted:#728e99;--line:#d6eaef;--green:#357e93;--soft:#e4f3f7;--accent:#357e93;--accent-light:#d4edf3;--accent-rgb:53,126,147}
body[data-palette=starlight]{--bg:#f8f6ff;--ink:#47405f;--muted:#8b809f;--line:#e6dff2;--green:#7762a5;--soft:#eee8fa;--accent:#7762a5;--accent-light:#e5dcf6;--accent-rgb:119,98,165}
/* END_IC_EXTRA_PALETTES */'''
for target,name in [(ROOT/'IC_Study_Anime.html','offline.html'),(ROOT/'ic-study-online/source/study.html','online-source.html')]:
 s=target.read_text(encoding='utf-8')
 if not (backup/name).exists():shutil.copy2(target,backup/name)
 original=re.search(r'<script[^>]*id="question-bank"[^>]*>(.*?)</script>',s,re.S)[1]
 if "mochi:{name:'Mochi Pink'" not in s:
  a=s.index('const LOOK_PRESETS=');b=s.index(';',a)
  s=s[:b-1]+','+palettes+s[b-1:]
 if '/* IC_EXTRA_PALETTES */' not in s:s=s.replace('</head>','<style>'+css+'</style></head>',1)
 # Mirror the already-added exam feature in the offline edition if needed.
 online=(ROOT/'ic-study-online/source/study.html').read_text(encoding='utf-8')
 if 'function examQuestionPool(' not in s:
  a=s.index('function examSetup()');b=s.index('function finishExam()',a)
  oa=online.index('function examSetup()');ob=online.index('function finishExam()',oa)
  s=s[:a]+online[oa:ob]+s[b:]
 assert re.search(r'<script[^>]*id="question-bank"[^>]*>(.*?)</script>',s,re.S)[1]==original
 target.write_text(s,encoding='utf-8')
print('Added 4 palettes to both anime files; preserved question banks.')
