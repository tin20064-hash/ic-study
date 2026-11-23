import re
import shutil
from pathlib import Path
root=Path(__file__).resolve().parents[1]
backup=root/'backups/before-exam-wallpaper-library-2026-11-08'
backup.mkdir(parents=True,exist_ok=True)
for path,name in [(root/'IC_Study_Anime.html','offline.html'),(root/'ic-study-online/source/study.html','online-source.html')]:
    text=path.read_text(encoding='utf-8')
    if not (backup/name).exists():shutil.copy2(path,backup/name)
    bank=re.search(r'<script[^>]*id="question-bank"[^>]*>(.*?)</script>',text,re.S)[1]
    assert '<option value="answered">Chỉ những câu đã làm</option>' not in text
    text=text.replace('<option value="unanswered">Ưu tiên câu chưa làm</option>','<option value="unanswered">Ưu tiên câu chưa làm</option><option value="answered">Chỉ những câu đã làm</option>',1)
    old="let arr=unique(subjectQuestions());if(pool==='wrong')arr=arr.filter(q=>wrongQuestionIds().includes(q.id));if(pool==='saved')arr=arr.filter(q=>S.bookmarks[q.id]);"
    assert old in text
    text=text.replace(old,'let arr=examQuestionPool(pool);',1)
    helper="function examQuestionPool(pool){let arr=subjectQuestions();const focus=studyFocus();if(focus)arr=arr.filter(q=>q.subject===focus);if(pool==='answered')arr=arr.filter(q=>S.responses[q.id]?.value?.length);if(pool==='wrong'){const wrong=new Set(wrongQuestionIds());arr=arr.filter(q=>wrong.has(q.id))}if(pool==='saved')arr=arr.filter(q=>S.bookmarks[q.id]);return unique(arr)}\n"
    text=text.replace('function startExam(){',helper+'function startExam(){',1)
    text=text.replace('Câu trùng nguyên văn được gộp trong cùng một đề. Hết giờ, bài tự nộp;', 'Câu trùng nguyên văn được gộp trong cùng một đề. “Chỉ những câu đã làm” lấy cả câu đúng và sai đã chấm; nếu nhóm có ít câu hơn số chọn, đề dùng số câu hiện có. Hết giờ, bài tự nộp;',1)
    assert re.search(r'<script[^>]*id="question-bank"[^>]*>(.*?)</script>',text,re.S)[1]==bank
    path.write_text(text,encoding='utf-8')
print('Added answered-only exam pool to both anime editions; filter runs before deduplication.')
