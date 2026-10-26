/* OSINT Практика — dependency-free local application. */
(function () {
  'use strict';
  const D = window.COURSE_DATA, C = window.CourseCore, E = C.escape;
  const STORAGE = 'osint-practice-v1';
  const main = document.getElementById('main');
  let state = C.emptyState(), storageOK = true, unreadableStored = null, toastTimer;
  let ui = {query:'', category:'all', favorites:false};
  try {
    const stored = localStorage.getItem(STORAGE);
    if (stored) {
      unreadableStored = stored;
      state = C.validateState(JSON.parse(stored), D);
      unreadableStored = null;
    }
  } catch (error) {
    storageOK = false;
    setTimeout(() => toast('Не удалось прочитать сохранение. Существующие данные не перезаписаны. Скачайте резервную копию перед изменениями.',true), 500);
  }
  const icons = {
    home:'M3 11 12 3l9 8v10h-6v-7H9v7H3Z',
    course:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3Zm9 2v16',
    cases:'M3 7h18v14H3ZM8 7V3h8v4M3 12h18M10 12v3h4v-3',
    tools:'m14 6 4-4 4 4-4 4-4-4M14 10 4 20l-2-2L12 8',
    reports:'M5 3h10l4 4v14H5ZM14 3v6h5M8 13h8M8 17h8',
    check:'m5 12 4 4L19 6',
    arrow:'M4 12h16m-6-6 6 6-6 6',
    pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
    link:'m9 15 6-6m-7 3-2 2a4 4 0 0 0 6 6l3-3m1-5 2-2a4 4 0 0 0-6-6l-3 3'
  };
  function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name] || icons.course}"></path></svg>`; }
  const chapter = id => D.chapters.find(x => x.id === id);
  const lesson = id => D.lessons.find(x => x.id === id);
  const caseById = id => D.cases.find(x => x.id === id);
  function toast(message, error = false) {
    const node = document.getElementById('toast');
    node.textContent = message; node.classList.toggle('error',error); node.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, 5000);
  }
  function persist() {
    if (unreadableStored !== null) {
      toast('Существующее сохранение не читается и не перезаписано. Скачайте его копию в разделе «Мои работы». Новые изменения пока остаются в памяти.',true);
      return false;
    }
    try { localStorage.setItem(STORAGE,JSON.stringify(state)); storageOK = true; return true; }
    catch { storageOK = false; toast('Данные остались только в памяти. Скачайте резервную копию: хранилище браузера недоступно или заполнено.',true); return false; }
  }
  function toggle(collection, id) {
    state[collection] = state[collection].includes(id) ? state[collection].filter(x => x !== id) : [...state[collection],id];
    persist();
  }
  function setPage(title, content, nav = 'home') {
    document.title = title + ' · OSINT Практика';
    document.getElementById('breadcrumb').textContent = title;
    document.getElementById('navigation').innerHTML = [['home','Обзор','home'],['course','Курс','course'],['cases','Практикум','cases'],['tools','Инструменты','tools'],['reports','Мои работы','reports']].map(([id,label,ico]) => `<a class="nav-link ${id===nav?'active':''}" ${id===nav?'aria-current="page"':''} href="#${id}">${icon(ico)}${label}</a>`).join('');
    main.innerHTML = content;
    for(const field of main.querySelectorAll('input[data-report-field],textarea[data-report-field],textarea[data-case-draft]')) field.maxLength=100000;
    for(const field of main.querySelectorAll('input[data-source-field]')) field.maxLength=10000;
  }
  const button = (label, href, secondary = false) => `<a class="button ${secondary?'secondary':''}" href="${E(href)}">${E(label)} ${icon('arrow')}</a>`;
  function nextLesson() { return D.lessons.find(l => l.id === state.lastLesson && !state.completedLessons.includes(l.id)) || D.lessons.find(l => !state.completedLessons.includes(l.id)) || D.lessons[0]; }
  function chapterCard(ch,index) {
    const lessons = D.lessons.filter(l => l.chapter === ch.id), completed = lessons.filter(l => state.completedLessons.includes(l.id)).length;
    return `<a class="card card-link chapter-card" href="#chapter/${ch.id}"><div class="row space-between"><span class="card-icon">${icon(ch.id==='geoint'?'pin':'course')}</span><span class="tiny muted">${String(index+1).padStart(2,'0')}</span></div><h3>${E(ch.title)}</h3><p>${E(ch.subtitle)}</p><div class="card-foot"><span>${lessons.length ? `${lessons.length} урока · ${ch.cases.length} практики`:'Итоговый кейс готовится'}</span><span class="arrow">↗</span></div>${lessons.length?`<progress value="${completed}" max="${lessons.length}" aria-label="Пройдено ${completed} из ${lessons.length}"></progress>`:''}</a>`;
  }
  function caseCard(item) {
    const status = {local:['В приложении','green'],external:['На сайте автора','blue'],upcoming:['Готовится','orange']}[item.status];
    const complete = state.completedCases.includes(item.id);
    return `<a class="card card-link case-card ${item.status==='upcoming'?'upcoming':''}" href="#case/${item.id}"><div class="row space-between"><span class="pill ${status[1]}">${status[0]}</span><span class="tiny muted">${item.id}</span></div><h3>${E(item.title)}</h3><p>${E(item.task || item.submission)}</p><div class="card-foot"><span>${E(chapter(item.chapter).title)}</span><span class="${complete?'check':'arrow'}">${complete?'✓ Выполнено':'↗'}</span></div></a>`;
  }
  function home() {
    const next = nextLesson(), available = D.cases.filter(c => c.status !== 'upcoming').length;
    setPage('Обзор', `<div class="welcome"><div><div class="eyebrow">ВАША СЛЕДУЮЩАЯ НАХОДКА НАЧИНАЕТСЯ ЗДЕСЬ</div><h1>Пространство исследователя</h1><p>От первого вопроса до отчёта с доказательствами.</p></div><span class="date-label">Учитесь в своём темпе</span></div>
      ${!storageOK?'<div class="notice warning">Не удалось прочитать сохранение. Данные доступны в этой сессии; используйте резервное копирование в разделе «Мои работы».</div>':''}
      <section class="hero"><div class="hero-content"><span class="pill dark">ОТКРЫТЫЕ ИСТОЧНИКИ · ПРАКТИЧЕСКИЙ КУРС</span><h2>Учитесь видеть больше.</h2><p>Находите источники, проверяйте версии и превращайте отдельные наблюдения в обоснованные выводы.</p><a class="button light" href="#lesson/${next.id}">${state.completedLessons.length?'Продолжить обучение':'Начать обучение'} ${icon('arrow')}</a><div class="hero-meta"><span>27 коротких уроков</span><span>9 направлений</span><span>Без вступительных тестов</span></div></div><svg class="hero-art" viewBox="0 0 420 340" aria-hidden="true"><g class="contour"><ellipse cx="250" cy="170" rx="190" ry="140"/><ellipse cx="250" cy="170" rx="170" ry="120"/><ellipse cx="250" cy="170" rx="150" ry="100"/><ellipse cx="250" cy="170" rx="130" ry="80"/><ellipse cx="250" cy="170" rx="110" ry="60"/><path d="M30 20 400 310M70 0 420 280M0 70 340 340M0 120 300 340M0 170 250 340M130 0 420 220M190 0 420 160"/></g><g class="target"><circle cx="250" cy="170" r="47"/><circle cx="250" cy="170" r="30"/><path d="M250 104v23m0 86v23M184 170h23m86 0h23"/></g><circle class="dot" cx="250" cy="170" r="5"/><circle class="dot" cx="341" cy="78" r="3"/><circle class="dot" cx="110" cy="250" r="3"/></svg></section>
      <div class="stats"><div class="card stat"><span class="card-icon">${icon('course')}</span><div><div class="number">${state.completedLessons.length}<span class="muted tiny"> / 27</span></div><div class="label">Уроков пройдено</div></div></div><div class="card stat"><span class="card-icon">${icon('cases')}</span><div><div class="number">${state.completedCases.length}<span class="muted tiny"> / ${available}</span></div><div class="label">Кейсов выполнено</div></div></div><div class="card stat"><span class="card-icon">${icon('reports')}</span><div><div class="number">${state.reports.length}</div><div class="label">Ваших отчётов</div></div></div></div>
      <div class="section-title"><h2>Направления курса</h2><a href="#course">Все главы →</a></div><div class="grid grid-3">${D.chapters.slice(0,6).map(chapterCard).join('')}</div>
      <div class="section-title"><h2>Попробуйте на практике</h2><a href="#cases">Весь практикум →</a></div><div class="grid grid-2">${[caseById('C01'),caseById('C09')].map(caseCard).join('')}</div>
      <div class="card progress-panel helpers"><div><h3>Ваш путь к первому исследованию</h3><p>Читайте уроки, сохраняйте находки и собирайте свой отчёт.</p></div><div><div class="progress-label"><span>Общий прогресс</span><span>${Math.round(state.completedLessons.length/27*100)}%</span></div><progress max="27" value="${state.completedLessons.length}" aria-label="Общий прогресс курса"></progress></div></div>`);
  }
  function course() {
    setPage('Курс', `<div class="eyebrow">ТЕОРИЯ, КОТОРАЯ ВЕДЁТ К ПРАКТИКЕ</div><h1>Курс исследования открытых источников</h1><p class="page-intro">Выбирайте нужную главу или проходите по порядку. Каждый урок заканчивается небольшим действием; практика объединяет навыки в исследование.</p><div class="grid grid-3">${D.chapters.map(chapterCard).join('')}</div>`, 'course');
  }
  function chapterPage(id) {
    const ch = chapter(id); if (!ch) return notFound();
    const lessons = D.lessons.filter(l => l.chapter === id);
    setPage(ch.title, `<a class="back-link" href="#course">← Все главы</a><div class="eyebrow">ГЛАВА ${String(D.chapters.indexOf(ch)+1).padStart(2,'0')}</div><h1>${E(ch.title)}</h1><p class="page-intro">${E(ch.subtitle)}. ${lessons.length?`${lessons.length} коротких урока с самостоятельной практикой.`:'Самостоятельное итоговое исследование после основных глав.'}</p><div class="lesson-list">${lessons.map((l,i)=>`<a class="lesson-item" href="#lesson/${l.id}"><span class="lesson-number">${state.completedLessons.includes(l.id)?'✓':String(i+1).padStart(2,'0')}</span><span class="lesson-title">${E(l.title)}</span><span class="muted">${state.completedLessons.includes(l.id)?'Пройдено':'Урок'}</span><span class="arrow">→</span></a>`).join('')}</div><div class="section-title"><h2>Практические задания</h2></div><div class="grid grid-2">${ch.cases.map(caseById).map(caseCard).join('')}</div>`, 'course');
  }
  function lessonPage(id) {
    const l = lesson(id); if (!l) return notFound();
    const ch = chapter(l.chapter), current = D.lessons.indexOf(l), next = D.lessons[current+1];
    state.lastLesson = id; persist();
    setPage(l.title, `<a class="back-link" href="#chapter/${ch.id}">← ${E(ch.title)}</a><div class="split"><article class="card reader"><span class="pill purple">УРОК ${current+1} ИЗ 27</span><h1>${E(l.title)}</h1>${l.text.map(p=>`<p>${E(p)}</p>`).join('')}<div class="takeaways"><h3>Что взять с собой</h3><ul>${l.takeaways.map(t=>`<li>${E(t)}</li>`).join('')}</ul></div><div class="task-box"><h3>Попробуйте сейчас</h3><p>${E(l.task)}</p></div><div class="reader-actions"><button class="button ${state.completedLessons.includes(id)?'secondary':''}" data-action="lesson-complete" data-id="${id}">${state.completedLessons.includes(id)?'✓ Урок пройден':'Отметить пройденным'}</button>${next?button('Следующий урок','#lesson/'+next.id,true):button('К практике','#cases',true)}</div></article><aside class="card lesson-outline"><h3>${E(ch.title)}</h3>${D.lessons.filter(item=>item.chapter===l.chapter).map((item,i)=>`<a class="outline-link ${item.id===id?'active':''}" href="#lesson/${item.id}"><span class="step">${state.completedLessons.includes(item.id)?'✓':i+1}</span><span>${E(item.title)}</span></a>`).join('')}<div class="section-title"><h3>Практика главы</h3></div>${ch.cases.map(caseById).map(c=>`<a class="outline-link" href="#case/${c.id}">${icon('cases')} ${E(c.title)}</a>`).join('')}</aside></div>`, 'course');
  }
  function filterBar(kind, categories) {
    return `<div class="filter-bar"><label class="sr-only" for="list-query">Поиск ${kind==='tools'?'инструментов':'кейсов'}</label><input id="list-query" type="search" data-filter-input placeholder="${kind==='tools'?'Название или задача инструмента…':'Название или навык…'}" value="${E(ui.query)}"><label class="sr-only" for="category-filter">Направление</label><select id="category-filter" data-category-filter><option value="all">Все направления</option>${categories.map(c=>`<option value="${c.id}" ${ui.category===c.id?'selected':''}>${E(c.title)}</option>`).join('')}</select>${kind==='tools'?`<button class="chip ${ui.favorites?'active':''}" data-action="favorites-filter" aria-pressed="${ui.favorites}">★ Избранное</button>`:''}</div><p class="tiny muted" id="result-count"></p><div class="grid grid-3" id="filtered-grid"></div>`;
  }
  function cases() {
    setPage('Практикум',`<div class="eyebrow">НАВЫК ПОЯВЛЯЕТСЯ В ДЕЙСТВИИ</div><h1>Практические кейсы</h1><p class="page-intro">14 заданий доступны сейчас: работайте с документами в приложении или на площадках авторов. Ещё пять наборов готовятся. Решения и заметки сохраняются на вашем устройстве.</p>${filterBar('cases',D.chapters)}`, 'cases'); renderFiltered('cases');
  }
  function toolCard(tool) {
    const favorite = state.favorites.includes(tool.id);
    return `<article class="card tool-card"><div class="row space-between"><span class="pill purple">${E({osint:'OSINT / WEBINT',imint:'МЕДИА',geoint:'GEOINT',report:'ДАННЫЕ / ОТЧЁТ'}[tool.group])}</span><button class="icon-button ${favorite?'selected':''}" data-action="favorite" data-id="${tool.id}" aria-label="${favorite?'Убрать из избранного':'Добавить в избранное'}: ${E(tool.name)}" aria-pressed="${favorite}">${icon('star')}</button></div><h3>${E(tool.name)}</h3><p>${E(tool.purpose)}</p><details><summary>Применение и ограничения</summary><p class="tool-note">${E(tool.note)}</p>${tool.links.slice(1).map(l=>`<p><a href="${E(C.safeURL(l.url))}" target="_blank" rel="noopener noreferrer">${E(l.title)} ↗</a></p>`).join('')}</details><div class="card-foot"><span>${tool.id}</span><a href="${E(C.safeURL(tool.url))}" target="_blank" rel="noopener noreferrer">Открыть инструмент ↗</a></div></article>`;
  }
  function renderFiltered(kind) {
    const query = ui.query.toLocaleLowerCase('ru');
    const items = (kind==='tools'?D.tools:D.cases).filter(item =>
      (ui.category==='all' || (kind==='tools'?item.group:item.chapter)===ui.category) &&
      (!ui.favorites || kind!=='tools' || state.favorites.includes(item.id)) &&
      (kind==='tools'?[item.name,item.purpose,item.note]:[item.title,item.task,item.meta]).join(' ').toLocaleLowerCase('ru').includes(query));
    document.getElementById('result-count').textContent = `Найдено: ${items.length}`;
    document.getElementById('filtered-grid').innerHTML = items.length ? items.map(kind==='tools'?toolCard:caseCard).join('') : '<div class="empty"><h2>Совпадений пока нет</h2><p>Измените запрос или выберите другое направление.</p></div>';
  }
  function toolsPage() {
    setPage('Инструменты', `<div class="eyebrow">ПОДБИРАЙТЕ ПОД ИССЛЕДОВАТЕЛЬСКИЙ ВОПРОС</div><h1>Рабочий набор исследователя</h1><p class="page-intro">25 инструментов с объяснением задач и ограничений. Сторонние сайты открываются отдельно; описания доступны без интернета.</p><div class="toolbar"><a class="button secondary small" href="#helpers">Встроенные помощники →</a></div>${filterBar('tools',[{id:'osint',title:'OSINT / WEBINT'},{id:'imint',title:'Фото и видео'},{id:'geoint',title:'GEOINT'},{id:'report',title:'Данные и отчёты'}])}`, 'tools'); renderFiltered('tools');
  }
  function casePage(id) {
    const item = caseById(id); if (!item) return notFound();
    const upcoming = item.status==='upcoming', local = item.status==='local';
    setPage(item.title, `<a class="back-link" href="#cases">← Весь практикум</a><div class="row"><span class="pill purple">${E(chapter(item.chapter).title)}</span><span class="pill ${local?'green':upcoming?'orange':'blue'}">${local?'Материалы в приложении':upcoming?'Готовится':'Задание внешнего автора'}</span><span class="tiny muted">${id}</span></div><h1 class="helpers">${E(item.title)}</h1><p class="page-intro">${E(item.meta)}</p>${upcoming?'<div class="notice warning">Это спецификация будущего задания. Исходные материалы ещё не подготовлены; выполнение пока недоступно.</div>':''}<div class="split"><div class="stack"><section class="card case-detail"><div class="detail-block"><h2>Задача</h2><p>${E(item.task)}</p></div><div class="detail-block"><h2>Что сдавать</h2><p>${E(item.submission)}</p></div><div class="detail-block"><h2>На что обратить внимание</h2><p>${E(item.criteria)}</p></div>${local?'<h2>Учебный набор «Свет и форма»</h2><p class="tiny muted">Все события и участники вымышлены. Для задания достаточно материалов ниже.</p><div class="document-buttons"><button class="button secondary small" data-doc="brief">Условия</button><button class="button secondary small" data-doc="materials">Документы D01–D07</button><button class="button secondary small" data-doc="interviews">Интервью H01–H04</button></div><details><summary>Подсказки к исследованию</summary><p>Разделите анонс, репетицию и публичное событие. Для каждой даты проверьте источник знания. Сопоставьте время в одном часовом поясе.</p></details><button class="button secondary small" data-doc="solution">Открыть разбор с ответами</button>':item.url?`<a class="button" href="${E(C.safeURL(item.url))}" target="_blank" rel="noopener noreferrer">Открыть задание у автора ↗</a><p class="tiny muted helpers">Условия доступа определяет авторская площадка. Сохраните ход решения и доказательства здесь.</p>`:''}</section>${!upcoming?`<section class="card"><div class="row space-between"><h2>Ваше решение</h2><span class="saving" id="case-save-status">${storageOK?'Сохраняется на устройстве':'Только в памяти'}</span></div><label class="sr-only" for="case-answer">Решение кейса ${id}</label><textarea id="case-answer" class="answer-area" data-case-draft="${id}" placeholder="Версия, источники, найденные доказательства и ограничения…">${E(state.caseDrafts[id] || '')}</textarea><div class="row space-between helpers"><button class="button ${state.completedCases.includes(id)?'secondary':''}" data-action="case-complete" data-id="${id}">${state.completedCases.includes(id)?'✓ Отмечено выполненным':'Отметить выполненным'}</button><button class="button secondary" data-action="new-report" data-id="${id}">Создать отчёт →</button></div><p class="tiny muted helpers">Отметка выполнения — ваша самооценка. Сопоставьте работу с критериями; автоматической проверки достоверности здесь нет.</p></section>`:''}</div><aside class="card detail-sidebar"><h3>От находки к выводу</h3><ol class="details-rubric"><li>Запишите вопрос и версии.</li><li>Зафиксируйте источники.</li><li>Проверьте независимость.</li><li>Объясните противоречия.</li><li>Оформите вывод с оговорками.</li></ol><button class="button secondary small" data-doc="template">Шаблон отчёта</button><p class="helpers tiny">Доступ к главе открыт без входного теста.</p><a href="#chapter/${item.chapter}">Уроки по теме →</a></aside></div>`, 'cases');
  }
  function reportList() {
    const reports = [...state.reports].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    setPage('Мои работы', `<div class="eyebrow">СОБИРАЙТЕ СОБСТВЕННОЕ ПОРТФОЛИО</div><h1>Мои исследования</h1><p class="page-intro">От первых наблюдений до законченного отчёта. Черновики сохраняются в этом браузере; резервная копия помогает перенести их на другое устройство.</p><div class="toolbar"><button class="button" data-action="new-report">+ Новое исследование</button><button class="button secondary" data-doc="template">Шаблон и критерии</button></div>${reports.length?`<div class="grid grid-2">${reports.map(r=>`<article class="card report-card"><div class="row space-between"><span class="pill purple">${E(r.caseId || 'Своя тема')}</span><small class="muted">${formatDate(r.updatedAt)}</small></div><h3 class="helpers">${E(r.title || 'Без названия')}</h3><p>${E(r.question || 'Сформулируйте исследовательский вопрос')}</p><div class="row"><a class="button small" href="#report/${encodeURIComponent(r.id)}">Продолжить →</a><button class="button secondary small" data-action="export-report" data-id="${E(r.id)}">Скачать .md</button><button class="icon-button" data-action="delete-report" data-id="${E(r.id)}" aria-label="Удалить отчёт ${E(r.title)}">×</button></div></article>`).join('')}</div>`:'<div class="empty"><span class="empty-symbol">▤</span><h2>Здесь появятся ваши исследования</h2><p>Начните с кейса «Свет и форма» или создайте отчёт по собственной теме.</p><a class="button secondary" href="#case/C01">Открыть первый кейс →</a></div>'}<div class="card backup-bar"><div><h3>Сохраните свою работу</h3><p>Очистка данных браузера удаляет локальные записи. Копия содержит прогресс, решения и отчёты.</p></div><div class="row"><button class="button secondary small" data-action="backup">Скачать копию</button><button class="button secondary small" data-action="import">Восстановить</button></div></div>`, 'reports');
  }
  function field(label,key,value,rows=5) {
    return `<div class="field"><label for="report-${key}">${label}</label><textarea id="report-${key}" data-report-field="${key}" rows="${rows}" placeholder="${E({question:'Какой вопрос вы проверяете и каковы границы исследования?',summary:'Основной результат, опорные доказательства и главное ограничение.',method:'Исходные данные, шаги и запросы.',findings:'Утверждение → доказательство (ID) → интерпретация.',limitations:'Противоречия, альтернативы и недостающие сведения.',conclusion:'Что подтверждено, что вероятно, что осталось неизвестным?'}[key])}">${E(value)}</textarea></div>`;
  }
  function sourceEditor(source,i) {
    return `<div class="source-row"><div class="row space-between"><h3>Источник ${i+1}</h3><button class="icon-button" data-action="remove-source" data-index="${i}" aria-label="Удалить источник ${i+1}">×</button></div><div class="source-grid">${[['id','ID','S01'],['title','Название','Название документа'],['url','URL или учебный ID','https://… или D01'],['published','Дата публикации','Если известна'],['accessed','Дата доступа и пояс','2026-10-26T12:00+03:00'],['note','Что подтверждает / ограничения','Происхождение и связь с выводом']].map(([key,label,placeholder])=>`<div class="field"><label for="source-${i}-${key}">${label}</label><input id="source-${i}-${key}" data-source-field="${key}" data-index="${i}" value="${E(source[key] || '')}" placeholder="${E(placeholder)}"></div>`).join('')}</div></div>`;
  }
  function reportPage(id) {
    const report = state.reports.find(r=>r.id===id); if (!report) return notFound();
    setPage('Редактор отчёта', `<a class="back-link" href="#reports">← Мои исследования</a><div class="toolbar"><span class="saving" id="report-save-status">${storageOK?'Все изменения сохраняются автоматически':'Только в памяти — скачайте копию'}</span><button class="button secondary small" data-action="export-report" data-id="${E(id)}">Скачать Markdown</button><a class="button secondary small" href="#preview/${encodeURIComponent(id)}">Просмотр и печать</a><button class="button secondary small" data-doc="template">Памятка</button></div><div class="card editor" id="report-editor" data-report-id="${E(id)}"><label class="sr-only" for="report-title">Название исследования</label><input class="editor-title-input" id="report-title" data-report-field="title" value="${E(report.title)}" placeholder="Название исследования"><div class="field"><label for="report-caseId">Кейс</label><select id="report-caseId" data-report-field="caseId"><option value="">Собственная тема</option>${D.cases.filter(c=>c.status!=='upcoming').map(c=>`<option value="${c.id}" ${report.caseId===c.id?'selected':''}>${c.id} · ${E(c.title)}</option>`).join('')}</select></div>${[['1. Вопрос и границы','question'],['2. Краткое резюме','summary'],['3. Метод и ход исследования','method'],['4. Находки и доказательства','findings'],['5. Противоречия и ограничения','limitations'],['6. Вывод и уверенность','conclusion']].map(([title,key])=>field(title,key,report[key])).join('')}<h2>7. Реестр источников</h2><p class="tiny muted">Ссылайтесь на ID в тексте находок. Для учебных материалов достаточно обозначения D01, H02 и названия.</p><div id="sources-editor">${report.sources.map(sourceEditor).join('')}</div><button class="button secondary small" data-action="add-source">+ Добавить источник</button></div>`, 'reports');
  }
  function previewReport(id) {
    const report=state.reports.find(r=>r.id===id); if(!report) return notFound();
    setPage('Просмотр отчёта',`<div class="toolbar"><a class="button secondary" href="#report/${encodeURIComponent(id)}">← Редактировать</a><button class="button" data-action="print">Печать / Сохранить PDF</button><button class="button secondary" data-action="export-report" data-id="${E(id)}">Скачать .md</button></div><article class="card reader prose">${markdown(C.reportMarkdown(report))}</article>`,'reports');
  }
  function helpers() {
    setPage('Встроенные помощники',`<a class="back-link" href="#tools">← Каталог инструментов</a><div class="eyebrow">НЕБОЛЬШИЕ ИНСТРУМЕНТЫ ДЛЯ ПОВСЕДНЕВНЫХ ЗАДАЧ</div><h1>Помощники исследователя</h1><p class="page-intro">Расчёты выполняются на вашем устройстве. Они помогают оформлению и проверке, а обоснование выводов остаётся частью исследования.</p><div class="grid grid-2"><section class="card"><span class="card-icon">${icon('pin')}</span><h2 class="helpers">Формат координат</h2><p class="tiny muted">Десятичные градусы или запись вида 55° 45′ 0″ N. Порядок: широта, долгота.</p><form id="coordinates-form" class="helper-form"><div class="helper-inputs"><div class="field"><label for="latitude">Широта</label><input id="latitude" name="latitude" value="55.75" required></div><div class="field"><label for="longitude">Долгота</label><input id="longitude" name="longitude" value="37.6167" required></div></div><button class="button" type="submit">Преобразовать</button></form><div id="coordinate-result" class="result-box" aria-live="polite" hidden></div></section><section class="card"><span class="card-icon">${icon('reports')}</span><h2 class="helpers">SHA-256 файла</h2><p class="tiny muted">Выберите файл до 100 МБ. Он обрабатывается локально и никуда не загружается. Хеш сравнивает содержимое файлов, а не достоверность фактов.</p><div class="field"><label for="hash-file">Файл для расчёта</label><input id="hash-file" type="file"></div><div id="hash-result" class="result-box" aria-live="polite" hidden></div></section></div>`, 'tools');
  }
  function search(query) {
    const q = query.toLocaleLowerCase('ru');
    const groups = [ ['Уроки',D.lessons.filter(l=>[l.title,...l.text].join(' ').toLocaleLowerCase('ru').includes(q)).map(l=>({title:l.title,note:chapter(l.chapter).title,url:'#lesson/'+l.id}))], ['Практика',D.cases.filter(c=>[c.title,c.task].join(' ').toLocaleLowerCase('ru').includes(q)).map(c=>({title:c.title,note:c.status==='upcoming'?'Готовится':chapter(c.chapter).title,url:'#case/'+c.id}))], ['Инструменты',D.tools.filter(t=>[t.name,t.purpose,t.note].join(' ').toLocaleLowerCase('ru').includes(q)).map(t=>({title:t.name,note:t.purpose,url:t.url}))] ];
    setPage('Результаты поиска',`<h1>Поиск: ${E(query)}</h1><p class="page-intro">Найдено ${groups.reduce((sum,[,list])=>sum+list.length,0)} совпадений в учебных материалах.</p>${groups.map(([title,list])=>list.length?`<section class="search-group"><h2>${title}</h2>${list.map(item=>`<a class="search-result" href="${E(item.url)}" ${item.url.startsWith('http')?'target="_blank" rel="noopener noreferrer"':''}>${E(item.title)}<small>${E(item.note)}</small></a>`).join('')}</section>`:'').join('') || '<div class="empty"><h2>Попробуйте другой запрос</h2><p>Например: источник, геолокация, интервью, архив.</p></div>'}`);
  }
  function about() {
    setPage('О приложении',`<div class="eyebrow">OSINT ПРАКТИКА · ВЕРСИЯ 0.1</div><h1>Ваше пространство для обучения</h1><p class="page-intro">Локальный курс: читайте, исследуйте и оформляйте доказательства в одном месте.</p><div class="about-grid"><section class="card"><h2>Данные остаются у вас</h2><p>Прогресс и работы хранятся в этом браузере. Приложение не отправляет их на серверы и не использует внешние шрифты или аналитику.</p><p>Очистка данных браузера удалит записи. Разные браузеры, адреса и порты имеют отдельное хранилище. Для переноса используйте резервную копию.</p><a class="button secondary" href="#reports">Мои работы и резервные копии →</a></section><section class="card"><h2>Об учебных материалах</h2><p>27 коротких вводных уроков и 14 доступных практик. Пять дополнительных наборов ещё готовятся. Вымышленный кейс «Свет и форма» создан для курса; внешние задания открываются на сайтах авторов.</p><p>Отметки прохождения отражают вашу самооценку. Приложение не выполняет автоматическую экспертизу свободных отчётов.</p><ul><li><a href="https://challenge.bellingcat.com/" target="_blank" rel="noopener noreferrer">Bellingcat Challenge</a></li><li><a href="https://gralhix.com/list-of-osint-exercises/" target="_blank" rel="noopener noreferrer">Sofia Santos / Gralhix</a></li><li><a href="https://tryhackme.com/room/searchlightosint" target="_blank" rel="noopener noreferrer">TryHackMe Searchlight</a></li><li><a href="https://humanrights.berkeley.edu/projects/developing-the-berkeley-protocol-on-digital-open-source-investigations/" target="_blank" rel="noopener noreferrer">Berkeley Protocol</a></li></ul><p class="tiny muted">Описания инструментов первоначально проверены 25 октября 2026 года. Условия внешних сервисов могут меняться.</p></section></div>`);
  }
  function notFound() { setPage('Страница не найдена','<div class="empty"><h1>Страница не найдена</h1><p>Возможно, адрес изменился или работа отсутствует в этом браузере.</p><a class="button" href="#home">На главную</a></div>'); }
  function route() {
    if(document.getElementById('document-dialog').open) document.getElementById('document-dialog').close();
    const [view,id] = location.hash.replace(/^#/,'').split('/').map(s=>{try{return decodeURIComponent(s);}catch{return '';}});
    ui = {query:'',category:'all',favorites:false};
    const routes = {home,course,chapter:()=>chapterPage(id),lesson:()=>lessonPage(id),cases,case:()=>casePage(id),tools:toolsPage,reports:reportList,report:()=>reportPage(id),preview:()=>previewReport(id),helpers,search:()=>search(id || ''),about};
    (routes[view || 'home'] || notFound)();
    window.scrollTo(0,0);
  }
  function formatDate(value) { const d=new Date(value); return Number.isNaN(d.getTime())?'':d.toLocaleDateString('ru-RU'); }
  function inline(value) {
    let escaped = E(value);
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,raw) => {
      const decoded = raw.replace(/&amp;/g,'&'); const safe = C.safeURL(decoded);
      if(safe) return `<a href="${E(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      const doc = /SOLUTION\.md/.test(decoded)?'solution':/INTERVIEWS\.md/.test(decoded)?'interviews':/MATERIALS\.md/.test(decoded)?'materials':/BRIEF\.md/.test(decoded)?'brief':/REPORT_TEMPLATE\.md/.test(decoded)?'template':null;
      return doc?`<a href="#" data-doc="${doc}">${label}</a>`:label;
    });
    return escaped.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
  }
  function markdown(body) {
    const lines = body.split(/\r?\n/); let html='', list=null;
    const closeList=()=>{if(list){html+=`</${list}>`;list=null;}};
    for(let i=0;i<lines.length;i++) {
      const line=lines[i];
      if(line.startsWith('|')) {
        closeList(); const rows=[]; while(i<lines.length && lines[i].startsWith('|')) rows.push(lines[i++]); i--;
        const cells=r=>r.replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(s=>s.trim().replace(/\\\|/g,'|'));
        html+='<div class="table-wrap"><table><thead><tr>'+cells(rows[0]).map(c=>`<th>${inline(c)}</th>`).join('')+'</tr></thead><tbody>'+rows.slice(1).filter(r=>!/^\|[\s:|\-]+\|$/.test(r)).map(r=>'<tr>'+cells(r).map(c=>`<td>${inline(c)}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>'; continue;
      }
      const heading=line.match(/^(#{1,4})\s+(.+)/);
      if(heading){closeList();html+=`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;continue;}
      const bullet=line.match(/^(- |\d+\. )(.+)/);
      if(bullet){const type=bullet[1]==='- '?'ul':'ol';if(list!==type){closeList();html+=`<${type}>`;list=type;}html+=`<li>${inline(bullet[2])}</li>`;continue;}
      closeList();if(line.trim()) html+=`<p>${inline(line)}</p>`;
    }
    closeList();return html;
  }
  function showDocument(id) {
    const doc=D.documents.find(d=>d.id===id); if(!doc) return;
    if(id==='solution' && !confirm('В разборе содержатся ответы. Открыть его сейчас?')) return;
    document.getElementById('document-title').textContent=doc.title;
    document.getElementById('document-body').innerHTML=markdown(doc.body);
    const dialog=document.getElementById('document-dialog'); if(!dialog.open) dialog.showModal();
    document.getElementById('document-body').scrollTop=0; dialog.scrollTop=0;
  }
  function download(content,name,type) {
    const url=URL.createObjectURL(new Blob([content],{type})), a=document.createElement('a');
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportReport(id) {
    const report=state.reports.find(r=>r.id===id); if(!report) return;
    const name=(report.title || 'report').replace(/[^\p{L}\p{N}_\- ]/gu,'').slice(0,70) || 'report';
    download(C.reportMarkdown(report),name+'.md','text/markdown;charset=utf-8');
  }
  function editingReport() { const editor=document.getElementById('report-editor'); return editor?state.reports.find(r=>r.id===editor.dataset.reportId):null; }
  document.addEventListener('click', event => {
    const docButton=event.target.closest('[data-doc]');
    if(docButton){event.preventDefault();showDocument(docButton.dataset.doc);return;}
    if(event.target.closest('[data-close-dialog]')){document.getElementById('document-dialog').close();return;}
    const target=event.target.closest('[data-action]');if(!target) return;
    const {action,id}=target.dataset;
    if(action==='lesson-complete'){toggle('completedLessons',id);lessonPage(id);}
    if(action==='case-complete'){
      if(!state.completedCases.includes(id) && (state.caseDrafts[id] || '').trim().length<20) return toast('Сначала запишите краткое решение и основания вывода.',true);
      toggle('completedCases',id);casePage(id);
    }
    if(action==='favorite'){toggle('favorites',id);renderFiltered('tools');}
    if(action==='favorites-filter'){ui.favorites=!ui.favorites;target.classList.toggle('active',ui.favorites);target.setAttribute('aria-pressed',String(ui.favorites));renderFiltered('tools');}
    if(action==='new-report'){
      if(state.reports.length>=200) return toast('Достигнут лимит 200 отчётов. Скачайте копию и удалите ненужные работы перед созданием новой.',true);
      const report=C.newReport(id || '');if(id){const item=caseById(id);report.title=item.title;report.question=item.task;report.findings=state.caseDrafts[id] || '';}
      state.reports.push(report);persist();location.hash='report/'+encodeURIComponent(report.id);
    }
    if(action==='export-report') exportReport(id);
    if(action==='delete-report' && confirm('Удалить этот отчёт с устройства?')){state.reports=state.reports.filter(r=>r.id!==id);persist();reportList();}
    if(action==='add-source'){const r=editingReport();if(r.sources.length>=500)return toast('В одном отчёте можно сохранить до 500 источников.',true);r.sources.push({id:'S'+String(r.sources.length+1).padStart(2,'0'),title:'',url:'',published:'',accessed:new Date().toISOString(),note:''});r.updatedAt=new Date().toISOString();persist();document.getElementById('sources-editor').innerHTML=r.sources.map(sourceEditor).join('');for(const input of document.querySelectorAll('[data-source-field]'))input.maxLength=10000;}
    if(action==='remove-source'){const r=editingReport();r.sources.splice(Number(target.dataset.index),1);r.updatedAt=new Date().toISOString();persist();document.getElementById('sources-editor').innerHTML=r.sources.map(sourceEditor).join('');}
    if(action==='print') window.print();
    if(action==='backup') download(unreadableStored ?? JSON.stringify({format:'osint-practice-backup',createdAt:new Date().toISOString(),state},null,2),'osint-backup-'+new Date().toISOString().slice(0,10)+'.json','application/json');
    if(action==='import') document.getElementById('backup-file').click();
  });
  document.addEventListener('input', event => {
    const el=event.target;
    if(el.matches('[data-filter-input]')){ui.query=el.value;renderFiltered(location.hash.startsWith('#tools')?'tools':'cases');}
    if(el.matches('[data-case-draft]')){state.caseDrafts[el.dataset.caseDraft]=el.value;const ok=persist();document.getElementById('case-save-status').textContent=ok?'Сохранено на устройстве':'Только в памяти — скачайте копию';}
    if(el.matches('[data-report-field],[data-source-field]')){
      const r=editingReport();if(!r)return;
      if(el.dataset.reportField) r[el.dataset.reportField]=el.value;
      else r.sources[Number(el.dataset.index)][el.dataset.sourceField]=el.value;
      r.updatedAt=new Date().toISOString();const ok=persist();document.getElementById('report-save-status').textContent=ok?'Сохранено на устройстве':'Только в памяти — скачайте копию';
    }
  });
  document.addEventListener('change', async event => {
    const el=event.target;
    if(el.matches('[data-category-filter]')){ui.category=el.value;renderFiltered(location.hash.startsWith('#tools')?'tools':'cases');}
    if(el.id==='hash-file' && el.files[0]){
      const file=el.files[0], output=document.getElementById('hash-result');output.hidden=false;
      if(file.size>100*1024*1024){output.textContent='Выберите файл размером не более 100 МБ.';return;}
      output.textContent='Вычисляем SHA-256…';
      try {const bytes=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());output.textContent=file.name+'\n\n'+[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');} catch {output.textContent='Расчёт недоступен. Запустите приложение через Start.cmd на локальном адресе.';}
    }
    if(el.id==='backup-file' && el.files[0]){
      try {
        if(el.files[0].size>10*1024*1024) throw new Error('Размер копии не должен превышать 10 МБ.');
        const value=JSON.parse(await el.files[0].text());
        if(value.format!=='osint-practice-backup') throw new Error('Выберите резервную копию OSINT Практики.');
        const restored=C.validateState(value.state,D);
        if(!confirm('Заменить текущий прогресс и работы данными из копии? Перед заменой можно отменить действие и скачать текущую копию.'))return;
        state=restored;unreadableStored=null;const saved=persist();location.hash='reports';reportList();toast(saved?'Резервная копия восстановлена.':'Копия открыта в памяти. Сохранение браузера недоступно.',!saved);
      } catch(error){toast('Не удалось восстановить копию: '+error.message,true);} finally{el.value='';}
    }
  });
  document.addEventListener('submit',event=>{
    if(event.target.id==='global-search'){event.preventDefault();const q=document.getElementById('global-query').value.trim();if(q)location.hash='search/'+encodeURIComponent(q);}
    if(event.target.id==='coordinates-form'){
      event.preventDefault();const output=document.getElementById('coordinate-result');output.hidden=false;
      try {const lat=C.parseCoordinate(document.getElementById('latitude').value,'lat'),lon=C.parseCoordinate(document.getElementById('longitude').value,'lon');output.textContent=`Десятичные градусы: ${lat.toFixed(6)}, ${lon.toFixed(6)}\n\n${C.toDMS(lat,'lat')}\n${C.toDMS(lon,'lon')}`;} catch(error){output.textContent=error.message;}
    }
  });
  document.getElementById('document-dialog').addEventListener('click',event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close();}});
  window.addEventListener('hashchange',route);
  route();
})();
