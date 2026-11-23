const PAST_EXAMS = JSON.parse(document.getElementById('past-exams').textContent);
const PAST_EXAM_BY_ID = new Map(PAST_EXAMS.map(exam => [exam.id, exam]));
let pastExamId = '', pastExamIndex = 0, pastExamSubject = 'all', pastExamTerm = 'all';

function pastExamNeedsRecheck(question, response) {
 return !!(question?.questionRevision && response?.value?.length && response.questionRevision !== question.questionRevision);
}
function pastExamResponse(question, response) {
 return pastExamNeedsRecheck(question, response) ? {...response, checked: false} : response;
}

function normalizePastExamStudy(value) {
 const output = {};
 if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
 for (const exam of PAST_EXAMS) {
  const saved = value[exam.id];
  if (!saved || typeof saved !== 'object') continue;
  const count = exam.pages.length;
  const reviewed = Object.fromEntries(Object.entries(saved.reviewed || {}).filter(([index, at]) => /^\d+$/.test(index) && Number(index) < count && Number.isFinite(at) && at > 0));
  const record = {
   index: Math.max(0, Math.min(count - 1, Math.trunc(Number(saved.index) || 0))),
   updated: Number.isFinite(saved.updated) ? Math.max(0, saved.updated) : 0,
   reviewed
  };
  if (Number.isFinite(saved.resetAt) && saved.resetAt > 0) record.resetAt = saved.resetAt;
  if (saved.answers) record.answers = Object.fromEntries(Object.entries(saved.answers).filter(([index, response]) => {
   const question = /^\d+$/.test(index) && exam.pages[Number(index)];
   return question && response && Array.isArray(response.value) && response.value.every(choice => Number.isInteger(choice) && choice >= 0 && choice < question.options.length) && Number.isFinite(response.at);
  }).map(([index, response]) => {
   const question = exam.pages[Number(index)], current = pastExamResponse(question, response);
   return [index, {value: [...new Set(response.value)].sort((a, b) => a - b), checked: !!current.checked && response.value.length > 0, at: response.at, ...(question.questionRevision ? {questionRevision: Number.isInteger(response.questionRevision) ? response.questionRevision : 0} : {})}];
  }));
  if (saved.optionOrders) record.optionOrders = Object.fromEntries(Object.entries(saved.optionOrders).filter(([index, order]) => {
   const count = /^\d+$/.test(index) && exam.pages[Number(index)]?.options.length;
   return count && Array.isArray(order) && order.length === count && new Set(order).size === count && order.every(choice => Number.isInteger(choice) && choice >= 0 && choice < count);
  }));
  output[exam.id] = record;
 }
 return output;
}

function pastExamUrl(id, index = 0) {
 return studyRouteUrl('past-exams', {exam: id, question: String(index + 1)});
}

function pastExamVisit() {
 const exam = PAST_EXAM_BY_ID.get(pastExamId);
 if (!exam) return;
 S.pastExamStudy ??= {};
 const saved = S.pastExamStudy[exam.id] ||= {index: 0, updated: 0, reviewed: {}};
 saved.answers ??= {};
 saved.optionOrders ??= {};
 saved.index = pastExamIndex;
 saved.updated = Date.now();
 const options = exam.pages[pastExamIndex].options;
 if (options?.length && !saved.optionOrders[pastExamIndex]) saved.optionOrders[pastExamIndex] = shuffle(options.map((_, index) => index));
 persist();
}

function pastExamCorrect(question, response) {
 response = pastExamResponse(question, response);
 if (!response?.checked || !question.answer?.length) return null;
 return (question.acceptedAnswers || [question.answer]).some(key => response.value.length === key.length && response.value.every(choice => key.includes(choice)));
}

function pastExamChoose(choice) {
 const exam = PAST_EXAM_BY_ID.get(pastExamId), question = exam?.pages[pastExamIndex];
 if (!question || !Number.isInteger(choice) || choice < 0 || choice >= question.options.length) return;
 const saved = S.pastExamStudy[exam.id], current = saved.answers[pastExamIndex];
 if (pastExamResponse(question, current)?.checked) return;
 const value = question.pickCount > 1 ? (current?.value?.includes(choice) ? current.value.filter(index => index !== choice) : [...(current?.value || []), choice]) : [choice];
 saved.answers[pastExamIndex] = {value, checked: false, at: Date.now(), ...(question.questionRevision ? {questionRevision: question.questionRevision} : {})};
 saved.updated = Date.now();
 persist();
 render();
}

function pastExamCheck() {
 const saved = S.pastExamStudy?.[pastExamId], response = saved?.answers?.[pastExamIndex];
 const question = PAST_EXAM_BY_ID.get(pastExamId)?.pages[pastExamIndex];
 if (!response?.value.length || !question || pastExamResponse(question, response)?.checked) return;
 response.checked = true;
 if (question.questionRevision) response.questionRevision = question.questionRevision;
 response.at = Date.now();
 saved.reviewed[pastExamIndex] = saved.updated = Date.now();
 persist();
 render();
}

function pastExamRetry() {
 const saved = S.pastExamStudy?.[pastExamId];
 if (!saved) return;
 saved.answers[pastExamIndex] = {value: [], checked: false, at: Date.now()};
 saved.updated = Date.now();
 persist();
 render();
}

function pastExamResetPrompt() {
 const exam = PAST_EXAM_BY_ID.get(pastExamId);
 if (!exam) return;
 modal(`<h2>Làm lại đề?</h2><p>Toàn bộ lựa chọn và kết quả của <strong>${esc(exam.title)}</strong> sẽ được xóa. Lần làm mới bắt đầu từ câu 1 và đảo lại thứ tự đáp án.</p><div class="btnrow"><button class="btn" type="button" data-act="close">Hủy</button><button class="btn primary" type="button" data-past-reset-confirm>Làm lại đề</button></div>`);
}

function pastExamReset() {
 const exam = PAST_EXAM_BY_ID.get(pastExamId);
 if (!exam) return;
 const at = Math.max(Date.now(), (S.pastExamStudy?.[exam.id]?.resetAt || 0) + 1);
 S.pastExamStudy ??= {};
 S.pastExamStudy[exam.id] = {index: 0, updated: at, resetAt: at, reviewed: {}, answers: {}, optionOrders: {}};
 pastExamIndex = 0;
 $('modal').close();
 const grid = document.querySelector('.past-exam-layout .number-grid');
 if (grid) grid.scrollTop = grid.scrollLeft = 0;
 const url = pastExamUrl(exam.id, 0);
 writeStudyRoute(url);
 openStudyRoute(url, {click: true});
 toast('Đã bắt đầu lại đề từ câu 1.');
}

function pastExamCopy() {
 const question = PAST_EXAM_BY_ID.get(pastExamId)?.pages[pastExamIndex];
 if (!question) return;
 const order = S.pastExamStudy[pastExamId].optionOrders[pastExamIndex];
 const text = question.question + '\n\n' + order.map((choice, position) => choiceLabel(position) + '. ' + question.options[choice]).join('\n');
 navigator.clipboard.writeText(text).then(() => toast('Đã sao chép câu hỏi và các lựa chọn.')).catch(() => toast('Bạn có thể bôi đen câu hỏi và đáp án để sao chép.'));
}

function pastExamFeedback(question, response, order) {
 if (pastExamNeedsRecheck(question, response)) return '<p class="quiet">Câu đã được hiệu chỉnh. Hãy kiểm tra lại lựa chọn.</p>';
 const correct = pastExamCorrect(question, response);
 const teaching = typeof renderTeachingExplanation === 'function' ? renderTeachingExplanation(question.id) : '';
 if (!question.answer?.length) return `<section class="feedback past-exam-ungraded" role="status"><h3>Đề gốc có vấn đề về đáp án</h3><p>Câu này được giữ nguyên theo ảnh và không chấm đúng/sai.</p>${question.caveat ? `<p>${esc(question.caveat)}</p>` : ''}${teaching || (question.reason ? `<p><b>Giải thích.</b> ${esc(question.reason)}</p>` : '')}<button class="textbtn" type="button" data-past-retry>Làm lại câu này ↻</button></section>`;
 const labels = (question.acceptedAnswers || [question.answer]).map(key => key.map(choice => choiceLabel(order.indexOf(choice))).join(' + ')).join(' hoặc ');
 return `<section class="feedback ${correct ? '' : 'bad'}" aria-live="polite">
  <h3>${correct ? '✓ Trả lời đúng' : '× Trả lời chưa đúng'}</h3><p><strong>Đáp án · ${labels}</strong></p>
  ${teaching || `${question.reason ? `<p><b>Vì sao đúng.</b> ${esc(question.reason)}</p>` : ''}${question.tip ? `<p><b>Mẹo làm nhanh.</b> ${esc(question.tip)}</p>` : ''}`}
  ${question.sourceCorrection ? `<p class="past-exam-correction"><b>Đã hiệu chỉnh.</b> ${esc(question.sourceCorrection.note)}</p>` : question.caveat ? `<p class="past-exam-correction"><b>Lưu ý về đề gốc.</b> ${esc(question.caveat)}</p>` : ''}
  <div class="question-tools"><button class="textbtn" type="button" data-past-retry>Làm lại câu này ↻</button></div>
 </section>`;
}

function pastExamLibrary() {
 const exams = PAST_EXAMS.filter(exam => (pastExamSubject === 'all' || exam.subject === pastExamSubject) && (pastExamTerm === 'all' || exam.term === pastExamTerm));
 return `${header('Ôn đề thi cũ', 'Luyện theo từng đề gốc, kiểm tra đáp án sau mỗi câu và tiếp tục từ vị trí đã lưu.')}
  <div class="panel past-exam-filters">
   <label class="field">Môn học<select id="past-exam-subject"><option value="all">Tất cả 4 môn</option>${Object.entries(SUBJECTS).map(([code, course]) => `<option value="${code}" ${pastExamSubject === code ? 'selected' : ''}>${code} · ${esc(course.name)}</option>`).join('')}</select></label>
   <label class="field">Đợt thi<select id="past-exam-term"><option value="all">Tất cả đợt thi</option><option value="FA26" ${pastExamTerm === 'FA26' ? 'selected' : ''}>Fall 2026</option><option value="SU26" ${pastExamTerm === 'SU26' ? 'selected' : ''}>Summer 2026</option></select></label>
   <span class="quiet">${exams.length} đề · ${exams.reduce((total, exam) => total + exam.pages.length, 0)} câu hỏi</span>
  </div>
  <div class="past-exam-library">${exams.map(exam => {
   const saved = S.pastExamStudy?.[exam.id], done = exam.pages.filter((q, index) => pastExamResponse(q, saved?.answers?.[index])?.checked).length;
   const right = exam.pages.filter((question, index) => pastExamCorrect(question, saved?.answers?.[index]) === true).length;
   return `<article class="panel past-exam-card">
    <div class="btnrow"><span class="pill">${exam.subject}</span><span class="quiet">${exam.retake ? 'Thi lại' : 'Thi cuối kỳ'} · ${exam.term === 'FA26' ? 'Fall 2026' : 'Summer 2026'}</span></div>
    <h2>${esc(exam.title)}</h2><p>${esc(SUBJECTS[exam.subject].name)}</p>
    <div class="progress"><i style="width:${done / exam.pages.length * 100}%"></i></div>
    <p class="quiet">${done}/${exam.pages.length} câu đã làm${done ? ` · ${right} câu đúng` : ''}${saved ? ` · Vị trí gần nhất ${saved.index + 1}` : ''}</p>
    <div class="btnrow"><a class="btn primary" href="${pastExamUrl(exam.id, saved?.index || 0)}" data-study-link>${saved ? 'Tiếp tục ôn' : 'Mở đề'}</a><a class="textbtn" href="${esc(exam.url)}" target="_blank" rel="noopener noreferrer">Bài gốc trên FuExam ↗</a></div>
   </article>`;
  }).join('')}</div>`;
}

function pastExamsPage() {
 const exam = PAST_EXAM_BY_ID.get(pastExamId);
 if (!exam) return pastExamLibrary();
 const question = exam.pages[pastExamIndex], saved = S.pastExamStudy[exam.id], originalResponse = saved.answers[pastExamIndex], response = pastExamResponse(question, originalResponse);
 const done = exam.pages.filter((q, index) => pastExamResponse(q, saved.answers[index])?.checked).length;
 const order = saved.optionOrders[pastExamIndex] || question.options.map((_, index) => index);
 const correctChoices = [...new Set((question.acceptedAnswers || [question.answer]).flat())];
 return `<div class="past-exam-heading"><div>${header(esc(exam.title), esc(SUBJECTS[exam.subject].name))}</div><div class="btnrow"><button class="btn" type="button" data-past-reset>Làm lại đề</button><a class="btn" href="#past-exams" data-study-link>← Danh sách đề</a></div></div>
  <div class="study-layout past-exam-layout"><article class="question-card past-exam-reader">
   <div class="question-meta"><span class="eyebrow">CÂU ${pastExamIndex + 1} / ${exam.pages.length}</span><span class="pill">${question.sourceCorrection ? 'Đã hiệu chỉnh' : exam.retake ? 'Đề thi lại' : 'Đề cuối kỳ'}</span></div>
   <p class="quiet">Chọn ${question.pickCount || 1} đáp án</p><h2 class="question-title" lang="en">${esc(question.question)}</h2>
   ${question.diagram ? `<img class="past-exam-diagram" src="${esc(question.diagram)}" alt="Sơ đồ và công thức đi kèm câu hỏi">` : ''}
   <div class="question-tools"><button class="textbtn" type="button" data-past-copy>Sao chép câu hỏi ↗</button></div>
   <div class="options" role="group" aria-label="Lựa chọn đáp án">${order.map((choice, position) => {
    const selected = response?.value.includes(choice), checked = response?.checked, known = !!question.answer?.length;
    const style = checked && known ? correctChoices.includes(choice) ? 'correct' : selected ? 'incorrect' : '' : selected ? 'selected' : '';
    const letter = checked && known ? correctChoices.includes(choice) ? '✓' : selected ? '×' : choiceLabel(position) : choiceLabel(position);
    return `<button type="button" class="option ${style}" data-past-choice="${choice}" aria-pressed="${!!selected}" ${checked ? 'disabled' : ''}><span class="letter">${letter}</span><span lang="en">${typeof renderStudyMath === 'function' ? renderStudyMath(question.options[choice]) : esc(question.options[choice])}</span><span class="choice-mark" aria-hidden="true"></span></button>`;
   }).join('')}</div>
   ${response?.checked ? pastExamFeedback(question, response, order) : `<div class="btnrow past-exam-actions"><button class="btn primary" type="button" data-past-check ${response?.value.length ? '' : 'disabled'}>Kiểm tra đáp án</button><span class="quiet">${pastExamNeedsRecheck(question, originalResponse) ? 'Câu đã hiệu chỉnh. Lựa chọn cũ được giữ để bạn kiểm tra lại.' : 'Lựa chọn được tự động lưu'}</span></div>`}
   <details class="past-exam-original"><summary>Đối chiếu ảnh gốc</summary><figure class="past-exam-photo"><img src="${esc(question.image)}" alt="${esc(exam.title)} · Câu ${pastExamIndex + 1}" loading="lazy"><figcaption>Ảnh gốc có thể chứa đáp án nguồn. Các chữ cái theo thứ tự ban đầu.</figcaption></figure><a class="textbtn" href="${esc(question.mediaUrl)}" target="_blank" rel="noopener noreferrer">Mở ảnh nguồn ↗</a></details>
   <div class="question-bottom">${pastExamIndex ? `<a class="btn" href="${pastExamUrl(exam.id, pastExamIndex - 1)}" data-study-link>← Câu trước</a>` : '<span></span>'}${pastExamIndex < exam.pages.length - 1 ? `<a class="btn primary" href="${pastExamUrl(exam.id, pastExamIndex + 1)}" data-study-link>Câu tiếp theo →</a>` : '<a class="btn primary" href="#past-exams" data-study-link>Về danh sách đề</a>'}</div>
  </article><aside class="panel navigator" data-mode="practice"><h3>Điều hướng đề <span>${pastExamIndex + 1}/${exam.pages.length}</span></h3>
   <div class="number-grid">${exam.pages.map((question, index) => {
    const correct = pastExamCorrect(question, saved.answers[index]);
    const label = pastExamNeedsRecheck(question, saved.answers[index]) ? 'Cần kiểm tra lại' : correct === null ? saved.answers[index]?.checked ? 'Đã xem · đề nguồn có vấn đề' : 'Chưa chấm' : correct ? 'Đúng' : 'Sai';
    return `<a class="qnumber${index === pastExamIndex ? ' current' : ''}${correct !== null ? ' done' : ''}${correct === false ? ' wrong' : ''}" href="${pastExamUrl(exam.id, index)}" data-study-link aria-label="Câu ${index + 1} · ${label}" ${index === pastExamIndex ? 'aria-current="true"' : ''}>${index + 1}</a>`;
   }).join('')}</div>
   <div class="legend"><span><i class="done"></i> Đúng</span><span><i class="done wrong"></i> Sai</span><span><i class="empty"></i> Chưa làm</span></div>
   <p class="quiet">${done}/${exam.pages.length} câu đã làm</p><div class="progress"><i style="width:${done / exam.pages.length * 100}%"></i></div><a class="textbtn past-exam-source" href="${esc(exam.url)}" target="_blank" rel="noopener noreferrer">Nguồn · FuExam ↗</a>
  </aside></div>`;
}

document.addEventListener('change', event => {
 if (event.target.id === 'past-exam-subject') pastExamSubject = event.target.value;
 else if (event.target.id === 'past-exam-term') pastExamTerm = event.target.value;
 else return;
 recordStudyRoute();
 render();
});

document.addEventListener('click', event => {
 const button = event.target.closest('button');
 if (!button || button.disabled || view !== 'past-exams' || !pastExamId) return;
 if (button.hasAttribute('data-past-choice')) pastExamChoose(Number(button.dataset.pastChoice));
 else if (button.hasAttribute('data-past-check')) pastExamCheck();
 else if (button.hasAttribute('data-past-retry')) pastExamRetry();
 else if (button.hasAttribute('data-past-copy')) pastExamCopy();
 else if (button.hasAttribute('data-past-reset')) pastExamResetPrompt();
 else if (button.hasAttribute('data-past-reset-confirm')) pastExamReset();
});

document.addEventListener('keydown', event => {
 if (view !== 'past-exams' || !pastExamId || $('modal').open || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,button,a,summary,[contenteditable]')) return;
 const exam = PAST_EXAM_BY_ID.get(pastExamId), saved = S.pastExamStudy[pastExamId];
 if (/^[1-5]$/.test(event.key) && Number(event.key) <= exam.pages[pastExamIndex].options.length) {
  event.preventDefault();
  pastExamChoose(saved.optionOrders[pastExamIndex][Number(event.key) - 1]);
 } else if (event.key === 'Enter' && !pastExamResponse(exam.pages[pastExamIndex], saved.answers[pastExamIndex])?.checked) {
  event.preventDefault();
  pastExamCheck();
 } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Enter') {
  const next = pastExamIndex + (event.key === 'ArrowLeft' ? -1 : 1);
  if (next < 0 || next >= exam.pages.length) return;
  event.preventDefault();
  const url = pastExamUrl(exam.id, next);
  writeStudyRoute(url);
  openStudyRoute(url, {click: true});
 }
});
