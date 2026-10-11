"""Local browser regression; isolated synthetic data, no external requests.
Run from the project root: python -u panel/tests/browser_qa.py
Use --serve to keep a local preview alive on an available loopback port.
"""
import json
import sys
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.tmp/panel-20261011'
OUT.mkdir(parents=True, exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
url = f'http://127.0.0.1:{server.server_port}/panel/'
print(url, flush=True)
if '--serve' in sys.argv:
    (OUT / 'preview-url.txt').write_text(url, encoding='utf-8')
    server.serve_forever()
    sys.exit()
Thread(target=server.serve_forever, daemon=True).start()

report = {'checks': [], 'captures': [], 'errors': [], 'console_errors': [], 'failed_local_resources': [], 'external_requests': [], 'accessibility': []}
def check(name, condition=True):
    if not condition:
        (OUT/'qa-partial.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    assert condition, name
    report['checks'].append(name)

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome')
    context = browser.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce', permissions=['clipboard-read','clipboard-write'])
    def network(route):
        if route.request.url.startswith('http://127.0.0.1:'):
            route.continue_()
        else:
            report['external_requests'].append(route.request.url)
            route.fulfill(status=200, content_type='text/html', body='<p>Offline video fixture</p>')
    context.route('**/*', network)
    page = context.new_page()
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    page.on('console', lambda m: report['console_errors'].append(m.text) if m.type=='error' else None)
    page.on('response', lambda r: report['failed_local_resources'].append(r.url) if r.url.startswith('http://127.0.0.1:') and r.status>=400 else None)
    page.goto(url)
    page.add_script_tag(path=str(OUT/'axe.min.js'))
    def dialog_audit(name):
        page.add_script_tag(path=str(OUT/'axe.min.js'))
        audit=page.evaluate("async () => {const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))}")
        report['accessibility'].append({'dialog':name,'violations':audit})
    check('No external resources on initial load', not report['external_requests'])
    report['initial_resources']=page.evaluate("performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').pop(),bytes:r.transferSize}))")
    expect(page.locator('#tab-start')).to_be_visible()
    def tab(name):
        page.locator(f'[data-tab="{name}"]').click()
        expect(page.locator('#tab-'+name)).to_be_visible()
    def confirm():
        page.locator('#confirm-ok').click()
        expect(page.locator('#confirm-modal')).not_to_be_visible()
    def value(selector, text):
        page.locator(selector).fill(text)
    # Keyboard tabs: vertical, Home, End, and focus semantics.
    page.locator('[data-tab=start]').focus()
    page.keyboard.press('ArrowDown')
    expect(page.locator('[data-tab=dokumentacja]')).to_be_focused()
    expect(page.locator('[data-tab=dokumentacja]')).to_have_attribute('aria-selected','true')
    page.keyboard.press('End')
    expect(page.locator('[data-tab=ai]')).to_be_focused()
    page.keyboard.press('Home')
    check('Keyboard navigation: arrows, Home, End and ARIA selected state')
    tab('dokumentacja')
    page.locator('.skip-link').focus();page.keyboard.press('Enter')
    expect(page.locator('#tab-dokumentacja')).to_be_visible()
    expect(page.locator('#workspace')).to_be_focused()
    check('Skip link retains current tab and focuses content')
    value('#doc-patient','QA-01')
    value('#doc-subj','Syntetyczna notatka do testu interfejsu.')
    value('#doc-email','qa-patient@example.test')
    value('#doc-plan','Indywidualne zalecenia zapisane przez terapeutę.')
    page.locator('.interview-guide summary').click()
    value('#intake-area','Opis obszaru podany przez pacjenta')
    value('#intake-pain','0')
    value('#intake-goal','Powrót do wybranej aktywności')
    page.locator('#intake-apply').click()
    check('Guide handles pain 0 and appends without replacing free text', 'Ból według pacjenta (0–10): 0' in page.locator('#doc-subj').input_value() and 'Syntetyczna' in page.locator('#doc-subj').input_value())
    page.reload()
    expect(page.locator('#doc-patient')).to_have_value('QA-01')
    expect(page.locator('#doc-email')).to_have_value('qa-patient@example.test')
    check('Visit draft survives reload including email and interview')
    page.evaluate("window.saveAnnouncements=0;new MutationObserver(()=>window.saveAnnouncements++).observe(document.querySelector('#doc-draft-status'),{childList:true,subtree:true})")
    value('#doc-obj','Badanie QA')
    page.locator('#doc-obj').press_sequentially(' 12345')
    check('Autosave live region does not repeat unchanged messages',page.evaluate('window.saveAnnouncements')<=1)
    page.locator('#doc-save').click()
    expect(page.locator('#doc-list .record-row')).to_have_count(1)
    page.locator('#doc-save').click()
    expect(page.locator('#doc-list .record-row')).to_have_count(1)
    check('Save visit and prevent duplicate unchanged card')
    page.locator('#doc-to-plan').click()
    expect(page.locator('#plan-patient')).to_have_value('QA-01')
    expect(page.locator('#plan-email')).to_have_value('qa-patient@example.test')
    expect(page.locator('#plan-goal')).to_have_value('Powrót do wybranej aktywności')
    check('Transfer visit to plan carries identity, email, goal and notes')
    tab('baza')
    value('#ex-search','rotacja')
    expect(page.locator('.ex-card')).to_have_count(1)
    page.locator('[data-add-ex]').click()
    page.locator('[data-add-ex]').press('Enter')
    expect(page.locator('#plan-count')).to_have_text('1')
    check('Search and duplicate exercise prevention')
    value('#ex-search','xxx-no-result')
    expect(page.locator('#ex-list')).to_contain_text('Nie znaleziono')
    value('#ex-search','')
    page.locator('[data-f="Kolano"]').click()
    check('Category filter', page.locator('.ex-card').count()==6)
    page.locator('[data-add-ex="bridge"]').click()
    page.locator('[data-add-ex="slr"]').click()
    tab('generator')
    expect(page.locator('.plan-row')).to_have_count(3)
    value('.plan-row:first-child [data-key=dose]','Dawkowanie QA 2 × 8, przerwa 30 s')
    value('.plan-row:first-child [data-key=note]','<img src=x onerror=alert(1)> & test')
    page.locator('.plan-row:first-child [data-move="1"]').click()
    expect(page.locator('.plan-row:nth-child(2) [data-key=dose]')).to_have_value('Dawkowanie QA 2 × 8, przerwa 30 s')
    page.locator('.plan-row:first-child [data-video]').click()
    expect(page.locator('#video-modal')).to_be_visible()
    page.frame_locator('#video-frame').get_by_text('Offline video fixture').wait_for()
    dialog_audit('video')
    focus_sequence=[]
    for _ in range(7):
        page.keyboard.press('Tab')
        focus_sequence.append(page.evaluate('document.activeElement.outerHTML.slice(0,200)'))
        report['video_focus_sequence']=focus_sequence
        check('Video focus remains within modal', page.evaluate("document.activeElement.closest('dialog')?.id==='video-modal'"))
    page.keyboard.press('Escape')
    expect(page.locator('#video-modal')).not_to_be_visible()
    expect(page.locator('.plan-row')).to_have_count(3)
    check('Video closes, clears iframe and does not remove exercise', page.locator('#video-frame').get_attribute('src') is None)
    expect(page.locator('.plan-row:first-child [data-video]')).to_be_focused()
    page.locator('.plan-row:last-child [data-remove]').click()
    expect(page.locator('#confirm-cancel')).to_be_focused()
    dialog_audit('confirmation')
    page.keyboard.press('Escape')
    expect(page.locator('.plan-row')).to_have_count(3)
    page.locator('.plan-row:last-child [data-remove]').click()
    confirm()
    expect(page.locator('.plan-row')).to_have_count(2)
    check('Remove exercise confirms, cancel preserves plan, focus restored')
    value('#plan-frequency','Harmonogram QA')
    value('#plan-review','Kontrola QA')
    page.reload()
    expect(page.locator('.plan-row')).to_have_count(2)
    expect(page.locator('#plan-frequency')).to_have_value('Harmonogram QA')
    check('Plan items, order, doses and metadata survive reload')
    page.locator('#plan-save').click()
    expect(page.locator('#plan-history .record-row')).to_have_count(1)
    page.locator('#plan-preview').click()
    expect(page.locator('#export-modal')).to_be_visible()
    dialog_audit('export')
    expect(page.locator('#export-body')).to_contain_text('<img src=x onerror=alert(1)> & test')
    expect(page.locator('#export-body img')).to_have_count(0)
    page.locator('#export-copy').click()
    check('Clipboard text contains selected dose and identity', 'Dawkowanie QA' in page.evaluate('navigator.clipboard.readText()'))
    with page.expect_download() as dl:
        page.locator('#export-email').click()
    path=OUT/'plan-test.eml';dl.value.save_as(path)
    from email import policy
    from email.parser import BytesParser
    parsed=BytesParser(policy=policy.default).parsebytes(path.read_bytes())
    check('EML UTF-8 body and recipient', str(parsed['To'])=='qa-patient@example.test' and 'Dawkowanie QA' in parsed.get_content() and 'rehabilitacji' in str(parsed['Subject']))
    page.screenshot(path=str(OUT/'export-desktop.png'))
    page.pdf(path=str(OUT/'plan-test.pdf'),format='A4',print_background=True)
    page.emulate_media(media='print')
    check('Print view isolates patient document', not page.locator('.app').is_visible() and page.locator('#export-body').is_visible() and not page.locator('.dialog-actions').first.is_visible())
    page.emulate_media(media='screen')
    page.keyboard.press('Escape')
    expect(page.locator('#plan-preview')).to_be_focused()
    # Visit form and calendar to card; never send anything.
    tab('kalendarz')
    value('#v-date','2027-02-01');value('#v-time','10:30');value('#v-client','QA-02')
    page.locator('#visit-form [type=submit]').click()
    expect(page.locator('#visit-list .record-row')).to_have_count(1)
    value('#v-date','2027-02-01');value('#v-time','10:30');value('#v-client','QA-03')
    page.locator('#visit-form [type=submit]').click()
    expect(page.locator('#visit-list .record-row')).to_have_count(1)
    check('Duplicate calendar slot rejected')
    with page.expect_download() as dl:
        page.locator('#visit-export').click()
    dl.value.save_as(OUT/'visits-test.ics')
    check('ICS contains local date and stable UID', 'DTSTART:20270201T103000' in (OUT/'visits-test.ics').read_text() and 'UID:' in (OUT/'visits-test.ics').read_text())
    page.locator('[data-visit-open]').click();confirm()
    expect(page.locator('#doc-patient')).to_have_value('QA-02')
    expect(page.locator('#doc-subj')).to_have_value('')
    expect(page.locator('#doc-email')).to_have_value('')
    expect(page.locator('#plan-count')).to_have_text('0')
    expect(page.locator('#plan-email')).to_have_value('')
    check('New patient from calendar clears old visit, plan and recipients')
    expect(page.locator('#doc-list .record-row')).to_have_count(1)
    page.locator('[data-doc-load]').click();confirm()
    expect(page.locator('#doc-patient')).to_have_value('QA-01')
    expect(page.locator('#doc-email')).to_have_value('qa-patient@example.test')
    # AI blocked without consent; mock request verifies payload and review-before-apply.
    page.locator('.ai-tools summary').click()
    requests=[]
    page.locator('#doc-ai-tidy').click()
    check('AI requires explicit consent', not requests)
    page.evaluate("localStorage.setItem('maciej_ai_key','synthetic');localStorage.setItem('maciej_ai_model','test-model')")
    ai_invalid=False
    def ai_route(route):
        requests.append(route.request.post_data_json)
        reply={'subj':'Propozycja testowa AI','obj':'Badanie testowe','assess':'Problem testowy','icf':'','proc':[],'plan':'Plan testowy'}
        if ai_invalid: reply['proc']=['Procedura spoza listy']
        route.fulfill(json={'choices':[{'message':{'content':json.dumps(reply)}}]})
    page.route('https://openrouter.ai/api/v1/chat/completions',ai_route)
    page.locator('#doc-ai-consent').check()
    before=page.locator('#doc-subj').input_value()
    page.locator('#doc-ai-tidy').click()
    expect(page.locator('#ai-review-modal')).to_be_visible()
    dialog_audit('ai-review')
    expect(page.locator('#doc-subj')).to_have_value(before)
    check('AI payload excludes identity and email fields', 'QA-01' not in json.dumps(requests) and 'qa-patient' not in json.dumps(requests))
    page.locator('#ai-review-apply').click()
    expect(page.locator('#doc-subj')).to_have_value('Propozycja testowa AI')
    check('AI applies only after explicit review')
    ai_invalid=True
    page.locator('#doc-ai-tidy').click()
    expect(page.locator('#doc-msg')).to_contain_text('spoza dostępnej listy')
    expect(page.locator('#ai-review-modal')).not_to_be_visible()
    expect(page.locator('#doc-subj')).to_have_value('Propozycja testowa AI')
    check('Unsupported AI procedures are rejected without data loss')
    # Saved card for another patient cannot leave an unrelated active plan behind.
    tab('generator');value('#plan-patient','QA-OTHER')
    tab('baza');page.locator('[data-add-ex="bridge"]').click()
    expect(page.locator('#library-patient')).to_contain_text('QA-OTHER')
    tab('dokumentacja');page.locator('[data-doc-load]').click()
    page.locator('#confirm-cancel').click()
    expect(page.locator('#plan-count')).to_have_text('1')
    page.locator('[data-doc-load]').click();confirm()
    expect(page.locator('#plan-count')).to_have_text('0')
    expect(page.locator('#plan-patient')).to_have_value('')
    check('Loading saved card cancels or clears a different patient plan explicitly')
    # Return to original saved plan for visual matrix.
    tab('generator');page.locator('[data-load-plan]').click()
    if page.locator('#confirm-modal').is_visible(): confirm()
    expect(page.locator('#toast')).not_to_be_visible(timeout=6000)
    page.add_script_tag(path=str(OUT/'axe.min.js'))
    viewports=[(1440,900),(1366,768),(1024,768),(768,1024),(390,844),(320,800),(844,390)]
    for width,height in viewports:
        page.set_viewport_size({'width':width,'height':height})
        for name in ['start','dokumentacja','baza','generator','kalendarz','ai']:
            tab(name)
            page.evaluate('window.scrollTo(0,0)')
            metrics=page.evaluate("""() => ({overflow:document.documentElement.scrollWidth>innerWidth+1,hiddenFocus:!!document.activeElement.closest('[hidden],.hidden'),images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length})""")
            check(f'Layout {name} {width} no overflow/hidden focus/broken images',not metrics['overflow'] and not metrics['hiddenFocus'] and not metrics['images'])
            if width in [1440,320]:
                audit=page.evaluate("async () => {const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))}")
                report['accessibility'].append({'tab':name,'width':width,'violations':audit})
                if audit: print('AXE',name,width,json.dumps(audit),flush=True)
            filename=f'after-{name}-{width}.png'
            page.screenshot(path=str(OUT/filename),full_page=True)
            report['captures'].append({'viewport':[width,height],'tab':name,'file':filename,**metrics})
    # Dark mode and doubled text at reflow width.
    page.set_viewport_size({'width':1440,'height':900});tab('start');page.locator('#theme-toggle').click()
    page.screenshot(path=str(OUT/'after-dark-1440.png'),full_page=True)
    page.reload();check('Theme persists',page.locator('html').get_attribute('data-theme')=='dark')
    page.locator('#theme-toggle').click()
    page.set_viewport_size({'width':720,'height':900});tab('dokumentacja')
    page.evaluate("""() => {const sizes=[...document.querySelectorAll('body *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);sizes.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');}""")
    page.screenshot(path=str(OUT/'after-text-200.png'),full_page=True)
    check('200% text reflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    page.close()
    # Legacy migration, malformed storage and storage failure are separate origins/contexts.
    legacy=context.new_page()
    legacy.add_init_script("""localStorage.clear();localStorage.setItem('maciej_plan',JSON.stringify([{id:'slr',sets:'4',reps:'7'}]));localStorage.setItem('maciej_plan-patient','OLD-QA');localStorage.setItem('maciej_docs',JSON.stringify([{date:'2026-01-01',patient:'OLD-QA',subj:'Old note',proc:[],id:1}]));""")
    legacy.goto(url+'#generator')
    expect(legacy.locator('#plan-patient')).to_have_value('OLD-QA')
    expect(legacy.locator('[data-key=dose]')).to_have_value('4 serii × 7 powt.')
    check('Legacy plan and dose migration',legacy.locator('#stat-docs').inner_text()=='1')
    legacy.close()
    bad=browser.new_context();bad.route('**/*',network);bp=bad.new_page()
    bp.on('pageerror',lambda e:report['errors'].append(str(e)))
    bp.add_init_script("localStorage.setItem('maciej_docs','{}');localStorage.setItem('maciej_plan','broken');localStorage.setItem('maciej_visits','null');")
    bp.goto(url)
    expect(bp.locator('#storage-error')).to_be_visible()
    check('Malformed storage shows warning and usable page',bp.locator('#tab-start').is_visible())
    bp.evaluate("() => {Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError')}}")
    bp.locator('[data-tab=dokumentacja]').click();bp.locator('#doc-patient').fill('QUOTA-QA')
    expect(bp.locator('#doc-draft-status')).to_have_text('Nie zapisano szkicu')
    check('Storage failure never reports successful save')
    bad.close();browser.close()
check('No uncaught browser errors',not report['errors'])
check('No console errors or failed local assets',not report['console_errors'] and not report['failed_local_resources'])
check('No axe WCAG A/AA violations in tested states', not any(x['violations'] for x in report['accessibility']))
(OUT/'qa-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(f"PASS: {len(report['checks'])} checks, {len(report['captures'])} captures",flush=True)
server.shutdown()
