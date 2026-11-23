const STUDY_ROUTE_SECTIONS = new Set([
 'home', 'timeline', 'brief', 'knowledge', 'practice', 'sessions', 'keywords', 'past-exams',
 'flash', 'exam', 'mistakes', 'answered', 'saved', 'history', 'sources',
 'player', 'result', 'topic-practice', 'brief-practice', 'question-practice'
]);
const STUDY_ROUTE_POOLS = ['practice', 'flash', 'exam', 'mistakes', 'answered', 'saved', 'sources'];
const STUDY_PRACTICE_ROUTES = ['topic-practice', 'brief-practice', 'question-practice'];
const STUDY_ROUTE_SELECTOR = [
 'nav', 'course', 'knowledge-subject', 'knowledge-jump', 'knowledge-quiz', 'study-brief',
 'study-card-quiz',
 'study-day', 'study-today', 'resume', 'session-resume', 'pause-session',
 'move', 'jump', 'result', 'open', 'start-quick'
].map(action => `button[data-act="${action}"]:not(:disabled)`).join(',');
const studyRouteMemory = new Map();
let studyRouteEntry, studyExamId, studyRouteReady = false, studyRouteReplace = false;

function studyRouteUrl(section, fields = {}) {
 const params = new URLSearchParams();
 for (const [name, value] of Object.entries(fields)) if (value) params.set(name, value);
 return '#' + section + (params.size ? '?' + params : '');
}

function readStudyRoute(hash) {
 const [section, search] = hash.slice(1).split('?', 2);
 return {section: STUDY_ROUTE_SECTIONS.has(section) ? section : 'home', params: new URLSearchParams(search)};
}

function studyPlayerUrl(session, index) {
 return studyRouteUrl('player', {session: session?.id, question: session?.ids?.[index]});
}

function studyKnowledgeCode() {
 return typeof studyScopeSubject==='function'?studyScopeSubject(knowledgeSubject||S.lastSubject):knowledgeSubject || (COURSE_KNOWLEDGE[S.lastSubject] ? S.lastSubject : 'DGT302');
}

function studyLinkFor(button) {
 const {act, view: section, subject: code, card, date, id, index, step} = button.dataset;
 switch (act) {
  case 'nav':
   return studyRouteUrl(section);
  case 'course':
   return studyRouteUrl('practice', {subject: code});
  case 'start-quick':
   return studyRouteUrl('practice', {subject: S.lastSubject});
  case 'knowledge-subject':
   return studyRouteUrl('knowledge', {subject: code});
  case 'knowledge-jump':
   return studyRouteUrl('knowledge', {subject: studyKnowledgeCode(), topic: card});
  case 'knowledge-quiz':
   return studyRouteUrl('topic-practice', {subject: code, topic: card});
  case 'study-brief':
   return studyRouteUrl('brief', {subject: code});
  case 'study-card-quiz':
   return studyRouteUrl('brief-practice', {subject: code, topic: card});
  case 'study-day':
  case 'study-today':
   return studyRouteUrl('timeline', {day: date || studyDefaultDay()});
  case 'pause-session':
   return studyRouteUrl('sessions');
  case 'resume':
   return studyPlayerUrl(S.session);
  case 'session-resume':
   return studyPlayerUrl({id});
  case 'move':
   return studyPlayerUrl(S.session, S.session.index + Number(step));
  case 'jump':
   return studyPlayerUrl(S.session, Number(index));
  case 'result':
   return studyRouteUrl('result', {result: S.history[Number(index)]?.id});
  case 'open': {
   const question = BY_ID.get(id);
   return question ?
    studyRouteUrl('question-practice', {question: id, retry: view === 'mistakes' || view === 'result' ? '1' : ''}) : '';
  }
 }
}

function renderStudyLinks(root = document) {
 if (!studyRouteReady) return;
 for (const button of root.querySelectorAll(STUDY_ROUTE_SELECTOR)) {
  const href = studyLinkFor(button);
  if (!href) continue;
  const link = document.createElement('a');
  for (const {name, value} of button.attributes) {
   if (name !== 'type' && name !== 'aria-pressed') link.setAttribute(name, value);
  }
  if (button.getAttribute('aria-pressed') === 'true') link.setAttribute('aria-current', 'page');
  link.setAttribute('href', href);
  link.dataset.studyLink = '';
  link.append(...button.childNodes);
  button.replaceWith(link);
 }
}

function rememberStudyRoute() {
 if (!studyRouteEntry) return;
 studyRouteMemory.set(studyRouteEntry, {
  y: window.scrollY,
  query: $('search')?.value || '',
  knowledgeQuery: $('knowledge-search')?.value || '',
  filter: $('status-select')?.value || 'all',
  reviewFilter: $('result-filter')?.value || 'all',
  page: Number($('app')?.dataset.studyPage) || 0
 });
}

function writeStudyRoute(href, replace = false) {
 const h = window.history;
 if (href === window.location.hash && studyRouteEntry) return;
 if (!replace) rememberStudyRoute();
 studyRouteEntry = Date.now().toString(36) + Math.random().toString(36).slice(2);
 h[replace ? 'replaceState' : 'pushState']({icStudyRoute: studyRouteEntry}, '', href);
}

function recordStudyRoute() {
 if (!studyRouteReady) return;
 let href = studyRouteUrl(view);
 if (view === 'player' && S.session) {
  href = studyPlayerUrl(S.session, S.session.index);
  if (S.session.mode === 'exam') studyExamId = S.session.id;
 }
 else if (view === 'result') href = studyRouteUrl('result', {result: S.history[resultIndex]?.id, page});
 else if (view === 'timeline') href = studyRouteUrl('timeline', {day: studySelectedDay});
 else if (view === 'past-exams') href = pastExamId ? pastExamUrl(pastExamId, pastExamIndex) : studyRouteUrl('past-exams', {subject: pastExamSubject, term: pastExamTerm});
 else if (view === 'brief') href = studyRouteUrl('brief', {subject: briefSubject});
 else if (view === 'knowledge') href = studyRouteUrl('knowledge', {subject: studyKnowledgeCode()});
 else if (STUDY_ROUTE_POOLS.includes(view)) href = studyRouteUrl(view, {subject, page});
 writeStudyRoute(href, studyRouteReplace);
}

function loadStudyPlayer(params) {
 const id = params.get('session');
 const s = id ? (S.session?.id === id ? S.session : S.sessions.find(item => item.id === id)) : S.session;
 if (!s || typeof studySessionVisible==='function'&&!studySessionVisible(s)) return 'sessions';
 if (s.mode === 'exam' && s.status === 'completed') {
  resultIndex = S.history.findIndex(item => item.sessionId === s.id || item.started === s.started);
  return resultIndex < 0 ? 'history' : 'result';
 }
 const requested = params.get('question'), index = s.ids.indexOf(requested);
 S.session = JSON.parse(JSON.stringify(s));
 if (index >= 0) S.session.index = index;
 subject = BY_ID.get(s.ids[S.session.index]).subject;
 if (s.mode === 'exam') studyExamId = s.id;
 restoreSessionDraft();
 showSource = flipped = false;
 return 'player';
}

function openStudyRoute(href, {click = false, restore = false} = {}) {
 const {section, params} = readStudyRoute(href);
 const requested = params.get('subject');
 const code = Object.hasOwn(SUBJECTS, requested) && (typeof studySubjectVisible!=='function'||studySubjectVisible(requested)) ? requested : '';
 const topic = params.get('topic'), memory = restore ? studyRouteMemory.get(studyRouteEntry) : null;
 const previousView = view, previousSubject = studyKnowledgeCode();
 if (STUDY_PRACTICE_ROUTES.includes(section)) {
  const candidate = BY_ID.get(params.get('question'));
   const question = typeof studyQuestionVisible==='function'&&!studyQuestionVisible(candidate) ? null : candidate;
  const briefCard = section === 'brief-practice' && code ? STUDY_BRIEFS[code]?.find(card => card.id === topic) : null;
  const ids = briefCard ? studyRelatedIds(code, briefCard) :
   section === 'topic-practice' && code ? knowledgeCards(code).find(c => c.id === topic)?.ids :
   section === 'question-practice' && question ? [question.id] : null;
  if (ids?.length) {
   subject = code || question.subject;
   studyRouteReplace = !click;
   const extra = briefCard ? {briefOrigin: {subject: code, card: briefCard.id}} : {reviewWrong: params.get('retry') === '1'};
   try { newSession(ids, 'practice', extra); }
   finally { studyRouteReplace = false; }
   return;
  }
  if (click) {
   toast('Không tìm thấy câu để luyện.');
   return;
  }
  view = section === 'brief-practice' ? 'brief' : section === 'topic-practice' ? 'knowledge' : 'sources';
 } else {
  view = section;
 }
 if (view === 'past-exams') {
  const candidate = PAST_EXAM_BY_ID.get(params.get('exam'));
   const exam = candidate && (typeof studySubjectVisible!=='function'||studySubjectVisible(candidate.subject)) ? candidate : null;
  pastExamId = exam?.id || '';
  pastExamSubject = code || (typeof studyScopeSubject==='function'?studyScopeSubject(): 'all');
  pastExamTerm = ['FA26', 'SU26'].includes(params.get('term')) ? params.get('term') : 'all';
  if (exam) {
   const requestedIndex = params.has('question') ? Number(params.get('question')) - 1 : S.pastExamStudy?.[exam.id]?.index || 0;
   pastExamIndex = Math.max(0, Math.min(exam.pages.length - 1, Math.trunc(requestedIndex) || 0));
   pastExamVisit();
  }
 }
 if (view === 'player') view = loadStudyPlayer(params);
 if (view === 'result' && section === 'result') {
  resultIndex = S.history.findIndex(item => String(item.id) === params.get('result'));
  if (resultIndex < 0 || typeof studySessionVisible==='function'&&!studySessionVisible(S.history[resultIndex])) view = 'history';
 }
 if (view !== previousView) keywordRevealed = false;
 if (view === 'timeline') {
  const day = params.get('day');
  studySelectedDay = Object.hasOwn(STUDY_NEW, day) || STUDY_EXAMS.some(e => e.review === day || e.date === day) ? day : studyDefaultDay();
 }
 if (view === 'brief') briefSubject = code || briefSubject;
 if (view === 'knowledge') {
  knowledgeSubject = code || previousSubject;
  knowledgeQuery = memory?.knowledgeQuery ?? (click && topic && previousView === 'knowledge' && knowledgeSubject === previousSubject ? knowledgeQuery : '');
 }
 if (STUDY_ROUTE_POOLS.includes(view)) {
  const collection = ['mistakes', 'answered', 'saved'].includes(view);
  subject = typeof studyScopeSubject==='function'?studyScopeSubject(code):code || (collection || requested === 'all' ? 'all' : S.lastSubject);
 }
 page = memory?.page ?? Math.max(0, Math.min(50, Number.parseInt(params.get('page'), 10) || 0));
 query = memory?.query || '';
 filter = memory?.filter || 'all';
 reviewFilter = memory?.reviewFilter || 'all';
 $('modal').close();
 render();
 const briefCard = view === 'brief' && code === briefSubject && params.has('card') ? $('brief-card-' + params.get('card')) : null;
 if (memory) window.scrollTo({top: memory.y, behavior: 'instant'});
 else if (view === 'player') focusCurrentQuestion();
 else if (view === 'past-exams' && pastExamId) document.querySelector('.past-exam-reader')?.scrollIntoView({block: 'start', behavior: 'instant'});
 else if (briefCard) {
  if (click) briefCard.focus({preventScroll: true});
  briefCard.scrollIntoView({block: 'start'});
 }
 else if (view === 'knowledge' && topic && (!code || code === knowledgeSubject) && $('knowledge-topic-' + topic)) {
  const card = $('knowledge-topic-' + topic);
  if (click) card.focus({preventScroll: true});
  card.scrollIntoView({block: 'start'});
 } else if (view === 'timeline' && params.has('day')) document.querySelector('.study-detail-head')?.scrollIntoView({block: 'start'});
 else window.scrollTo({top: 0, behavior: 'instant'});
 if (click && view === 'player') persist();
}

function initStudyRouting() {
 studyRouteReady = true;
 const h = window.history;
 h.scrollRestoration = 'manual';
 studyRouteEntry = h.state?.icStudyRoute;
 const initialUrl = window.location.hash || '#home';
 writeStudyRoute(initialUrl, true);
 openStudyRoute(initialUrl, {restore: true});
 document.addEventListener('click', event => {
  const link = event.target.closest('a[data-study-link]');
  if (!link || event.defaultPrevented) return;
  event.stopPropagation();
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const href = link.getAttribute('href');
  const {section} = readStudyRoute(href);
  if (!STUDY_PRACTICE_ROUTES.includes(section)) writeStudyRoute(href);
  openStudyRoute(href, {click: true});
 }, true);
 window.addEventListener('popstate', event => {
  rememberStudyRoute();
  studyRouteEntry = event.state?.icStudyRoute;
  if (!studyRouteEntry) writeStudyRoute(window.location.hash || '#home', true);
  openStudyRoute(window.location.hash || '#home', {restore: true});
 });
}
