// Presentation scope only. The full bank and account state remain available to
// validation, backups and synchronization so hiding a course never deletes it.
const STUDY_VISIBLE_SUBJECTS = Object.freeze(['DGT302']);
function studySubjectVisible(code) { return STUDY_VISIBLE_SUBJECTS.includes(code); }
function studyScopeSubject(code) { return studySubjectVisible(code) ? code : STUDY_VISIBLE_SUBJECTS[0]; }
function studyQuestionVisible(question) { return !!question && studySubjectVisible(question.subject); }
function studyVisibleIds(ids) { return ids.filter(id => studyQuestionVisible(BY_ID.get(id))); }
function studyVisibleBank() { return ICDuplicates.questions(BANK).filter(studyQuestionVisible); }
function studyVisibleExams() { return STUDY_EXAMS.filter(exam => studySubjectVisible(exam.subject)); }
function studyVisibleSubjectEntries() { return Object.entries(SUBJECTS).filter(([code]) => studySubjectVisible(code)); }
function studySessionVisible(session) {
 return !!session?.ids?.length && session.ids.every(id => studyQuestionVisible(BY_ID.get(id)));
}
function studyVisibleKeywordStudy() {
 const deck = S.keywordStudy;
 return deck?.ids?.length && deck.ids.every(id => studySubjectVisible(KEYWORD_BY_ID.get(id)?.subject)) ? deck : null;
}
function studyFocusBanner() {
 const code=studyScopeSubject(subject), total=subjectQuestions(code).length, progress=counts(subjectQuestions(code));
 return `<section class="study-home-strip"><div class="study-strip-symbol">${icon('wave',24)}</div><div><span class="study-kicker">DGT302 · XỬ LÝ TÍN HIỆU SỐ</span><strong>Ôn DGT theo tiến độ của bạn</strong><p>${progress.done}/${total} câu đã học · ${studyVisibleIds(wrongQuestionIds()).length} câu cần ôn lại</p></div><div class="btnrow">${btn('Luyện tập','nav','data-view="practice"','small primary')}${btn('Bản cô đọng','nav','data-view="brief"','small')}</div></section>`;
}
function studyFocusDailyCard() {
 const today=studyVisibleIds(S.daily[localDay()]||[]).length;
 return `<section class="panel daily"><div class="eyebrow">DGT302 · HÔM NAY</div><div class="goal"><strong>${today}</strong><span>câu đã học</span></div><p>Tiếp tục câu chưa làm, ôn lỗi sai, sau đó kiểm tra bằng đề thi thử.</p>${btn('Luyện 20 câu','daily','','small primary')}</section>`;
}
function studyFocusTimeline() {
 const arr=subjectQuestions('DGT302'), progress=counts(arr), wrong=studyVisibleIds(wrongQuestionIds()).length;
 const steps=[
  ['practice','pen','Hoàn thành lượt học đầu',`${arr.length-progress.done} câu chưa làm. Đọc lời giải và phân biệt các lựa chọn sau mỗi câu.`,'Luyện tập'],
  ['mistakes','retry','Ôn các câu còn sai',`${wrong} câu cần xem lại. Làm lại để kiểm tra cách hiểu, không nhớ theo vị trí đáp án.`,'Luyện câu sai'],
  ['knowledge','bulb','Củng cố công thức và điều kiện','Tra cứu biến đổi z, DFT, lọc số, lấy mẫu và các chủ đề liên quan.','Kiến thức & mẹo'],
  ['past-exams','data','Luyện đề thi cũ','Ôn từng đề DGT theo câu hỏi gốc và tiếp tục từ vị trí đã lưu.','Mở danh sách đề'],
  ['exam','exam','Kiểm tra bằng đề thi thử','Đề mặc định 50 câu. Xem kết quả và lời giải sau khi nộp.','Tạo đề thi thử'],
  ['brief','book','Ôn lại bản cô đọng','Nhắc lại công thức, điều kiện áp dụng và các lỗi dễ nhầm trước khi thi.','Ôn ngày cuối']
 ];
 return `${header('Lộ trình ôn DGT302','Chọn phần cần ôn bất kỳ lúc nào. Tiến độ cập nhật theo tài khoản.')}<section class="study-milestone"><div><span class="study-kicker">TIẾN ĐỘ DGT302</span><strong>${progress.done}/${arr.length} câu đã học</strong><p>${wrong} câu cần ôn lại</p></div><div class="study-coverage"><strong>${Math.round(progress.done/arr.length*100)}<span>%</span></strong><div class="progress"><i style="width:${progress.done/arr.length*100}%"></i></div></div></section><div class="brief-grid">${steps.map(([view,kind,title,note,label])=>`<article class="brief-card"><div class="study-strip-symbol">${icon(kind,22)}</div><h2>${title}</h2><p>${note}</p>${btn(label,'nav',`data-view="${view}"`,'small')}</article>`).join('')}</div>`;
}
