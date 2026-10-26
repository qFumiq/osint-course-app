(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CourseCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (value, max = 100000) => {
    if(typeof value !== 'string') return '';
    if(value.length > max) throw new Error('Слишком длинное поле в резервной копии. Исходная копия не изменена.');
    return value;
  };
  const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `r-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const emptyState = () => ({version:1, completedLessons:[], completedCases:[], favorites:[], caseDrafts:{}, reports:[], lastLesson:null});
  function safeURL(value) {
    try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
  }
  function cleanReport(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Некорректная запись отчёта');
    const result = {id:text(value.id,100) || uid(), sources:[], updatedAt:text(value.updatedAt,50)};
    for (const key of ['title','caseId','question','summary','method','findings','limitations','conclusion']) result[key] = text(value[key]);
    if (value.sources !== undefined && !Array.isArray(value.sources)) throw new Error('Некорректный список источников');
    result.sources = (value.sources || []).slice(0,500).map(s => {
      if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('Некорректная запись источника');
      return Object.fromEntries(['id','title','url','published','accessed','note'].map(k => [k,text(s[k],10000)]));
    });
    return result;
  }
  function validateState(input, data) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1) throw new Error('Это не резервная копия OSINT Практики версии 1.');
    const result = emptyState();
    for (const [key, collection] of [['completedLessons','lessons'],['completedCases','cases'],['favorites','tools']]) {
      if (!Array.isArray(input[key])) throw new Error('В копии отсутствует список ' + key);
      const allowed = new Set(data[collection].filter(x => key !== 'completedCases' || x.status !== 'upcoming').map(x => x.id));
      result[key] = [...new Set(input[key].filter(x => typeof x === 'string' && allowed.has(x)))];
    }
    if (!Array.isArray(input.reports) || input.reports.length > 200) throw new Error('Некорректный список отчётов (не более 200).');
    result.reports = input.reports.map(cleanReport);
    if (new Set(result.reports.map(r => r.id)).size !== result.reports.length) throw new Error('В копии повторяются идентификаторы отчётов.');
    if (!input.caseDrafts || typeof input.caseDrafts !== 'object' || Array.isArray(input.caseDrafts)) throw new Error('Некорректные черновики');
    for (const item of data.cases) {
      if (Object.prototype.hasOwnProperty.call(input.caseDrafts,item.id)) result.caseDrafts[item.id] = text(input.caseDrafts[item.id]);
    }
    if (data.lessons.some(l => l.id === input.lastLesson)) result.lastLesson = input.lastLesson;
    return result;
  }
  function newReport(caseId = '') {
    return {id:uid(),title:'Новое исследование',caseId,question:'',summary:'',method:'',findings:'',limitations:'',conclusion:'',sources:[],updatedAt:new Date().toISOString()};
  }
  function reportMarkdown(report) {
    const row = value => String(value || '').replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
    return `# ${report.title || 'Исследовательский отчёт'}\n\nКейс: ${report.caseId || 'собственное исследование'}\nОбновлено: ${report.updatedAt}\n\n` +
      [['Вопрос и границы','question'],['Краткое резюме','summary'],['Метод и ход исследования','method'],['Находки и доказательства','findings'],['Противоречия и ограничения','limitations'],['Вывод и уверенность','conclusion']].map(([title,key],i) => `## ${i+1}. ${title}\n\n${report[key] || '[Не заполнено]'}\n`).join('\n') +
      '\n## 7. Источники\n\n| ID | Название | URL / учебный ID | Дата публикации | Дата доступа | Примечание |\n| --- | --- | --- | --- | --- | --- |\n' +
      report.sources.map(s => '| '+['id','title','url','published','accessed','note'].map(k => row(s[k])).join(' | ')+' |').join('\n')+'\n';
  }
  function parseCoordinate(value, axis) {
    const source = String(value).trim().toUpperCase().replace(/,/g,'.');
    if (!source || /[^\d\s.\-+°º′'″"NSEWСЮВЗ]/u.test(source)) throw new Error('Введите десятичные градусы или градусы, минуты и секунды.');
    const directions = source.match(/[NSEWСЮВЗ]/gu) || [];
    if (directions.length > 1) throw new Error('Укажите одно полушарие.');
    const direction = directions[0];
    if (direction && !(axis === 'lat' ? ['N','S','С','Ю'] : ['E','W','В','З']).includes(direction)) throw new Error('Полушарие не соответствует широте или долготе.');
    const tokens = source.replace(/[NSEWСЮВЗ°º′'″"]/gu,' ').trim().split(/\s+/);
    if (tokens.length > 3 || tokens.some(x => !/^[+-]?\d+(?:\.\d+)?$/.test(x))) throw new Error('Проверьте запись координаты.');
    const numbers = tokens.map(Number);
    if (numbers.some(n => !Number.isFinite(n)) || numbers.slice(1).some(n => n < 0 || n >= 60)) throw new Error('Минуты и секунды должны быть от 0 до 60.');
    if (numbers.length > 1 && !Number.isInteger(numbers[0])) throw new Error('При наличии минут градусы должны быть целыми.');
    const negative = numbers[0] < 0 || Object.is(numbers[0],-0);
    if (negative && direction && !['S','W','Ю','З'].includes(direction)) throw new Error('Знак противоречит полушарию.');
    const sign = negative || ['S','W','Ю','З'].includes(direction) ? -1 : 1;
    const degrees = sign * (Math.abs(numbers[0]) + (numbers[1] || 0)/60 + (numbers[2] || 0)/3600);
    if (Math.abs(degrees) > (axis === 'lat' ? 90 : 180)) throw new Error('Широта должна быть в пределах ±90°, долгота — ±180°.');
    return degrees;
  }
  function toDMS(value, axis) {
    let total = Math.round(Math.abs(value) * 360000) / 100;
    const degrees = Math.floor(total/3600); total -= degrees*3600;
    const minutes = Math.floor(total/60); const seconds = (total-minutes*60).toFixed(2);
    return `${degrees}° ${minutes}′ ${seconds}″ ${axis === 'lat' ? (value < 0 ? 'S':'N') : (value < 0 ? 'W':'E')}`;
  }
  return {escape,uid,emptyState,safeURL,validateState,newReport,reportMarkdown,parseCoordinate,toDMS};
});
