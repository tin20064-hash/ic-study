function adminBriefExtraIds(code) {
 if (code !== 'LOS201' && code !== 'ICI211') return [];
 const covered = new Set(STUDY_BRIEFS[code].flatMap(card => studyRelatedIds(code, card)));
 return ICDuplicates.questions(BANK)
  .filter(question => question.subject === code && !covered.has(question.id))
  .map(question => question.id);
}

function renderAdminBriefExtra(code) {
 const count = adminBriefExtraIds(code).length;
 if (!count) return '';
 return `<section class="brief-intro" aria-labelledby="admin-brief-extra-heading">
  <div>
   <h2 id="admin-brief-extra-heading">Ôn bổ sung · ${code}</h2>
   <p>${count} câu ngoài các bộ luyện theo thẻ trong Ôn ngày cuối.</p>
  </div>
  ${btn(`Luyện ${count} câu`,'admin-brief-extra',`data-subject="${code}"`,'small primary')}
 </section>`;
}

document.addEventListener('click', event => {
 const button = event.target.closest('button[data-act="admin-brief-extra"]');
 if (!button || button.disabled) return;
 const code = button.dataset.subject;
 const ids = adminBriefExtraIds(code);
 if (!ids.length) return;
 subject = code;
 newSession(ids, 'practice', {briefOrigin:{subject:code}});
});
