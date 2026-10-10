# -*- coding: utf-8 -*-
"""يبني الدروس المنشورة من التطبيق (lessons/*.json) كدروس أصلية:
- lessons-extra.js : يضيفها إلى قائمة الدروس لكل الأجهزة
- audio/ + audio-index.js : أصوات Microsoft العصبية نفسها المستخدمة في الدروس الأصلية
- sw.js : رفع نسخة الكاش حتى تصل التحديثات للجميع
يُشغَّل تلقائيًا من GitHub Actions عند رفع درس جديد."""
import asyncio, glob, hashlib, json, os, re, sys, urllib.parse, urllib.request
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = {'zh-f': 'zh-CN-XiaoxiaoNeural', 'zh-m': 'zh-CN-YunxiNeural', 'ar-f': 'ar-SA-ZariyahNeural', 'ar-m': 'ar-SA-HamedNeural'}
# المقاطع تُسجَّل بسرعة 0.8 والصفحة تشغّلها بسرعتها الطبيعية (CLIP_RATE في index.html)
RATE = '-20%'
HOMO = {'觉': '叫', '还': '孩', '教': '叫', '系': '细'}   # نطق الدرس للحروف متعددة النطق
norm = lambda s: re.sub(r'[。，？！、,.?!；：\s…“”"\'（）()]', '', str(s))
fid = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
def ar_say(t):
    t = re.sub(r'\s*\([٠-٩0-9]+\)', '', t)
    return re.sub(r'\s*/\s*', '، أو ', t).replace('(', '، ').replace(')', '')
unesc = lambda s: str(s).replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")

def speak_hz(w): return w.get('shz') or ''.join(c[0] for c in w['ch'])
def sent_hz(s): return ''.join(t[0] for t in s['t']) + (s.get('ex') or ('？' if s.get('q') else '。'))

def human_clip(key):
    """تسجيل بشري لكلمات HSK من audio-cmn (متحدّثة أصلية، CC BY-SA) — أوضح من أي صوت آلي."""
    if not key or len(key) > 4: return None
    url = 'https://raw.githubusercontent.com/hugolpz/audio-cmn/master/64k/hsk/' + urllib.parse.quote('cmn-' + key + '.mp3')
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            data = r.read()
            return data if len(data) > 2000 else None
    except Exception:
        return None

def load_packs():
    out = []
    for fn in sorted(glob.glob(os.path.join(ROOT, 'lessons', '*.json'))):
        try:
            p = json.load(open(fn, encoding='utf-8'))
            les = p.get('lesson', p)
            if les.get('id') and les.get('words') and les.get('sents'): out.append(les)
        except Exception as e: print('skip', fn, e)
    return out

async def main():
    lessons = load_packs()
    idx_path = os.path.join(ROOT, 'audio-index.js')
    src = open(idx_path, encoding='utf-8').read()
    idx = json.loads(src[src.index('=') + 1:].strip().rstrip(';'))
    zh, ar = {}, {}
    for L in lessons:
        for w in L['words']:
            for t in [speak_hz(w)] + [c[0] for c in w['ch']]:
                if norm(t): zh.setdefault(norm(t), t)
            ar.setdefault(w['m'], unesc(w['m']))
        for s in L['sents'].values():
            for t in [sent_hz(s)] + [x[0] for x in s['t']]:
                if norm(t): zh.setdefault(norm(t), t)
            ar.setdefault(s['ar'], unesc(s['ar']))
    jobs = []
    for key, text in zh.items():
        if key in idx['zh']: continue
        idx['zh'][key] = fid(key)
        for v in ('zh-f', 'zh-m'): jobs.append((v, fid(key), HOMO.get(key, text)))
    for key, text in ar.items():
        if key in idx['ar']: continue
        idx['ar'][key] = fid(key)
        for v in ('ar-f', 'ar-m'): jobs.append((v, fid(key), ar_say(text)))
    sem = asyncio.Semaphore(8); fails = []
    human = {}  # الكلمة ← تسجيل بشري (audio-cmn) إن وُجد
    async def one(v, i, text):
        path = os.path.join(ROOT, 'audio', v, i + '.mp3')
        if os.path.exists(path) and os.path.getsize(path) > 500: return
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if v.startswith('zh-'):
            key = norm(text)
            if key not in human: human[key] = await asyncio.to_thread(human_clip, key)
            if human[key]:
                open(path, 'wb').write(human[key]); return
        async with sem:
            for a in range(4):
                try:
                    await edge_tts.Communicate(text, VOICES[v], rate=RATE).save(path)
                    if os.path.getsize(path) > 500: return
                except Exception: pass
                await asyncio.sleep(2 * (a + 1))
        fails.append((v, text))
    await asyncio.gather(*[one(*j) for j in jobs])
    print('lessons', len(lessons), 'clips', len(jobs), 'fails', len(fails), fails[:5])
    extra_path = os.path.join(ROOT, 'lessons-extra.js')
    extra = ('/* دروس نُشرت من التطبيق (تُبنى تلقائيًا من lessons/*.json — لا تعدّل يدويًا) */\n'
             'window.EXTRA_LESSONS=' + json.dumps([dict(L, published=True) for L in lessons], ensure_ascii=False, separators=(',', ':')) + ';\n')
    old_extra = open(extra_path, encoding='utf-8').read() if os.path.exists(extra_path) else ''
    if not jobs and extra == old_extra:
        print('nothing changed'); return
    open(idx_path, 'w', encoding='utf-8').write(src[:src.index('window.AUDIO_INDEX=')] + 'window.AUDIO_INDEX=' + json.dumps(idx, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(extra_path, 'w', encoding='utf-8').write(extra)
    sw = os.path.join(ROOT, 'sw.js'); s = open(sw, encoding='utf-8').read()
    s = re.sub(r"var CACHE = 'hsk-v(\d+)'", lambda m: "var CACHE = 'hsk-v%d'" % (int(m.group(1)) + 1), s)
    open(sw, 'w', encoding='utf-8').write(s)
    # رقم نسخة ملفّي الدروس والصوت في الصفحة حتى لا يبقى المتصفح على نسخة قديمة
    ih = os.path.join(ROOT, 'index.html'); h = open(ih, encoding='utf-8').read()
    h = re.sub(r'((?:audio-index|lessons-extra)\.js)\?v=[\w]+', lambda m: m.group(1) + '?v=b%d' % int(__import__('time').time()), h)
    open(ih, 'w', encoding='utf-8').write(h)
    if fails: sys.exit(1)

asyncio.run(main())
