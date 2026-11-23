// Wording and memory cues are independent of grading and shuffled answer labels.
const TEACHING_EXPLANATIONS = JSON.parse(document.getElementById('teaching-explanations').textContent);
const TEACHING_LESSONS = JSON.parse(document.getElementById('explanation-lessons')?.textContent || '{}');
function teachingDetail(id) {
 const explanation = TEACHING_EXPLANATIONS[id];
 return explanation?.detailLesson ? TEACHING_LESSONS[explanation.detailLesson] : undefined;
}
function renderTeachingExplanation(id) {
 const explanation = TEACHING_EXPLANATIONS[id];
 if (!explanation) return '';
 const detail=teachingDetail(id);
 // A rich existing mechanism is kept once, rather than repeating the same
 // explanation before the comparison. Short reasons receive the extra steps.
 const mechanism=detail&&explanation.source?.kind!=='word-reference'&&explanation.paragraphs.join(' ').length<200?detail.mechanism:'';
 return `<div class="teaching-explanation" lang="vi"><div class="teaching-reason"><h4>Giải thích</h4>${explanation.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}${mechanism?`<p class="teaching-mechanism">${esc(mechanism)}</p>`:''}</div>${detail?.comparisons?.length?`<section class="teaching-comparisons" aria-label="Phân biệt các lựa chọn"><h4>Phân biệt các lựa chọn và trường hợp áp dụng</h4><dl>${detail.comparisons.map(item=>`<div class="teaching-comparison"><dt>${esc(item.concept)}</dt><dd>${esc(item.explanation)}</dd></div>`).join('')}</dl></section>`:''}${explanation.understand ? `<div class="teaching-memory"><h4>Hiểu nhanh / mẹo nhớ</h4><p>${esc(explanation.understand)}</p></div>` : ''}</div>`;
}
function teachingExplanationText(id) {
 const explanation = TEACHING_EXPLANATIONS[id];
 if(!explanation)return '';
 const detail=teachingDetail(id),mechanism=detail&&explanation.source?.kind!=='word-reference'&&explanation.paragraphs.join(' ').length<200?detail.mechanism:'';
 return 'Giải thích:\n'+explanation.paragraphs.join('\n\n')+(mechanism?'\n\n'+mechanism:'')+(detail?.comparisons?.length?'\n\nPhân biệt các lựa chọn và trường hợp áp dụng:\n'+detail.comparisons.map(item=>item.concept+': '+item.explanation).join('\n\n'):'')+(explanation.understand?'\n\nHiểu nhanh / mẹo nhớ:\n'+explanation.understand:'');
}
