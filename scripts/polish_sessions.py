from pathlib import Path
root=Path(__file__).resolve().parent.parent
for file in ['src/app.js','anime/app.js']:
 p=root/file;s=p.read_text(encoding='utf-8')
 s=s.replace("newSession([id],'practice')", "newSession([id],'practice',{reviewWrong:view==='mistakes'||view==='result'})")
 s=s.replace("exam?'Phiên thi thử':flash?'Chậm lại, nhớ sâu hơn.':'Tập trung vào câu hiện tại.'", "exam?'Phiên thi thử':flash?'Chậm lại, nhớ sâu hơn.':s.reviewWrong?'Đề luyện câu sai':'Tập trung vào câu hiện tại.'")
 s=s.replace("exam?'Thi có hẹn giờ':flash?'Thẻ ghi nhớ':'Luyện tập'", "exam?'Thi có hẹn giờ':flash?'Thẻ ghi nhớ':s.reviewWrong?'Luyện câu sai':'Luyện tập'")
 s=s.replace('và ${pendingImport.history.length} bài thi.', 'và ${pendingImport.history.length} bài thi, ${pendingImport.sessions.length} phiên học.')
 p.write_text(s,encoding='utf-8')
p=root/'anime/home.js';s=p.read_text(encoding='utf-8').replace('Sakura hồng, Lavender tím hay Milk Tea ấm áp?', '9 bảng màu pastel, từ Sakura, Blue Sky đến Mint Garden.');p.write_text(s,encoding='utf-8')
