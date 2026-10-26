const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../app/core.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../app/data.js'),'utf8'),context);
const D = JSON.parse(JSON.stringify(context.window.COURSE_DATA));

test('course has complete lesson content and distinguishes pending cases', () => {
  assert.equal(D.lessons.length,27);
  assert.equal(D.tools.length,25);
  assert.equal(D.cases.filter(c=>c.status!=='upcoming').length,14);
  assert.equal(D.cases.filter(c=>c.status==='upcoming').length,5);
  for(const l of D.lessons){assert.ok(l.text.join(' ').length>250,l.id);assert.ok(l.task);assert.ok(D.chapters.some(ch=>ch.id===l.chapter));}
  assert.equal(new Set(D.cases.map(c=>c.id)).size,19);
});
test('distributed data does not include private paths or the local source archive', () => {
  const serialized=JSON.stringify(D);
  assert.equal(/\b[A-Za-z]:[\\/]|local_inventory|LOCAL_MATERIALS\.md/.test(serialized),false);
  for(const t of D.tools) assert.ok(C.safeURL(t.url),t.id);
});
test('coordinates support decimal commas, hemisphere and degree/minute/second input', () => {
  assert.equal(C.parseCoordinate('55,75','lat'),55.75);
  assert.equal(C.parseCoordinate('55° 45′ 0″ N','lat'),55.75);
  assert.equal(C.parseCoordinate('37 30 0 W','lon'),-37.5);
  assert.equal(C.parseCoordinate('-0 30 0','lat'),-.5);
  assert.equal(C.parseCoordinate('55 45 С','lat'),55.75);
  assert.equal(C.parseCoordinate('180 E','lon'),180);
});
test('invalid coordinates cannot silently become plausible locations', () => {
  for(const [value,axis] of [['91','lat'],['180 0 1','lon'],['55 60 0','lat'],['-55 N','lat'],['55 W','lat'],['','lat'],['1 2 3 4','lat'],['55 hello','lat'],['55..7','lat']]) assert.throws(()=>C.parseCoordinate(value,axis),value);
});
test('rounded DMS does not emit 60 seconds and round trips', () => {
  const dms=C.toDMS(55.999999999,'lat');
  assert.equal(dms,'56° 0′ 0.00″ N');
  for(const n of [-89.99,-.5,0,55.75,90]) assert.ok(Math.abs(C.parseCoordinate(C.toDMS(n,'lat'),'lat')-n)<.00001);
});
test('external links exclude script, data and file protocols', () => {
  for(const url of ['javascript:alert(1)','data:text/html,x','file:///C:/private','#local','not a url'])assert.equal(C.safeURL(url),null);
  assert.equal(C.safeURL('https://example.org/?a=1&b=2'),'https://example.org/?a=1&b=2');
  assert.equal(C.escape('<img src=x onerror="x">'),'&lt;img src=x onerror=&quot;x&quot;&gt;');
});
test('backup round trip preserves work, sources, dates and drafts', () => {
  const state=C.emptyState();state.completedLessons=['L01'];state.completedCases=['C01'];state.favorites=['T01'];state.caseDrafts.C01='Найдено доказательство D02';state.lastLesson='L02';
  const report=C.newReport('C01');report.title='Проверка';report.sources.push({id:'S01',title:'Документ',url:'D01',published:'2025-09-02',accessed:'2026-10-26+03:00',note:'Основание'});state.reports.push(report);
  assert.deepEqual(C.validateState(JSON.parse(JSON.stringify(state)),D),state);
});
test('unknown IDs are discarded and malformed backups rejected before replacement', () => {
  const state=C.emptyState();state.completedLessons=['L01','invalid','L01'];state.caseDrafts.C01='OK';state.caseDrafts.invalid='bad';
  const clean=C.validateState(state,D);assert.deepEqual(clean.completedLessons,['L01']);assert.deepEqual(clean.caseDrafts,{C01:'OK'});
  assert.throws(()=>C.validateState({version:2},D));
  assert.throws(()=>C.validateState({...state,reports:{}},D));
  assert.throws(()=>C.validateState({...state,reports:[{id:'x',sources:'not an array'}]},D));
  assert.throws(()=>C.validateState({...state,reports:[{id:'same'},{id:'same'}]},D));
  assert.throws(()=>C.validateState({...state,caseDrafts:{C01:'x'.repeat(100001)}},D));
});
test('Markdown exports every report section, source dates and escaped table cells', () => {
  const r=C.newReport('C18');r.title='Исследование';r.question='Когда?';r.findings='Утверждение → D02';r.sources=[{id:'D02',title:'Анонс | версия 2',url:'D02',published:'2025-09-11',accessed:'2026-10-26',note:'Одна\nстрока'}];
  const md=C.reportMarkdown(r);
  for(const expected of ['# Исследование','Когда?','Утверждение → D02','2025-09-11','2026-10-26','Анонс \\| версия 2','Одна строка','[Не заполнено]'])assert.ok(md.includes(expected),expected);
});
