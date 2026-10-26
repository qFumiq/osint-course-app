"""Build course data from the project's original materials, without private files."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content'

def read(name):
    return (CONTENT / name).read_text(encoding='utf-8-sig')

def plain(text):
    return re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', text).replace('**', '').replace('`', '')

def build():
    data = json.loads(read('lessons.json'))
    chapter_for = {cid: ch['id'] for ch in data['chapters'] for cid in ch['cases']}
    cases = []
    for m in re.finditer(r'^## (C\d{2})\. (.+)\n([\s\S]*?)(?=^## |\Z)', read('CASE_CATALOG.md'), re.M):
        cid, title, body = m.groups()
        body = re.sub(r' Локальный кандидат[^\n]*', '', body)
        local = 'учебный пакет готов' in body
        upcoming = 'спецификация' in body
        urls = re.findall(r'\[[^]]+\]\((https://[^)]+)\)', body)
        def field(names):
            return next((plain(line.split(':', 1)[1].strip()) for line in body.splitlines() if re.match(r'- (?:' + names + r'):', line)), '')
        cases.append(dict(id=cid, title=title, chapter=chapter_for[cid], status='upcoming' if upcoming else 'local' if local else 'external', body=body.strip(), task=field('Условие|Практика'), submission=field('Сдача'), criteria=field('Критерий'), meta=field('Глава'), url=urls[0] if urls and not local else None))
    tools = []
    group = 'osint'
    for line in read('TOOLS.md').splitlines():
        for heading, category in [('## IMINT', 'imint'), ('## GEOINT', 'geoint'), ('## Организации', 'report')]:
            if line.startswith(heading): group = category
        if not re.match(r'\| T\d{2} \|', line): continue
        cells = [s.strip() for s in line.strip('|').split('|')]
        links = re.findall(r'\[([^]]+)\]\((https://[^)]+)\)', cells[1])
        tools.append(dict(id=cells[0], name=links[0][0], url=links[0][1], group=group, purpose=plain(cells[2]), note=plain(cells[3]), links=[dict(title=t,url=u) for t,u in links]))
    docs = [('brief','Условия кейса','cases/exhibition/BRIEF.md'), ('materials','Документы D01–D07','cases/exhibition/MATERIALS.md'), ('interviews','Интервью H01–H04','cases/exhibition/INTERVIEWS.md'), ('solution','Разбор и ответы','cases/exhibition/SOLUTION.md'), ('template','Шаблон отчёта','REPORT_TEMPLATE.md')]
    data.update(version='0.1.0', cases=cases, tools=tools, documents=[dict(id=i,title=t,body=read(p)) for i,t,p in docs])
    assert len(data['lessons']) == 27 and len(cases) == 19 and len(tools) == 25
    encoded = json.dumps(data, ensure_ascii=False, indent=2)
    assert not re.search(r'\b[A-Za-z]:[\\/]', encoded)
    (ROOT / 'app').mkdir(exist_ok=True)
    (ROOT / 'app/data.js').write_text('window.COURSE_DATA = '+encoded+';\n', encoding='utf-8')
    print('Built 27 lessons, 19 case cards and 25 tools.')

if __name__ == '__main__': build()
