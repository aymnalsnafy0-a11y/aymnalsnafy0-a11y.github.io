/* قسم البينيين: جداول الحروف الأولى والنهايات والنغمات بالصوت، جدول المقاطع، وتدريبات النطق والاستماع */
(function(){
  'use strict';
  const SYL = window.PY_SYL || {};                 // 'tian1': '天'
  const has = s => !!SYL[s];
  const bases = new Set(Object.keys(SYL).map(s => s.slice(0, -1)));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ---------- البيانات ---------- */
  const INITIALS = [
    ['b','bo1','«ب» خفيفة بدون نفَس — بين ب و P'], ['p','po1','«پ» مع نفخة هواء قوية (ضع يدك أمام فمك وستحسّ بالهواء)'],
    ['m','mo1','«م»'], ['f','fo2','«ف»'],
    ['d','de2','«د» خفيفة بدون نفَس — بين د و ت'], ['t','te4','«ت» مع نفخة هواء قوية'],
    ['n','ne4','«ن»'], ['l','le4','«ل» مرقّقة'],
    ['g','ge1','«ك» بدون نفَس (مثل g الإنجليزية لكن أخف)'], ['k','ke1','«ك» مع نفخة هواء قوية'],
    ['h','he1','«خ» خفيفة جدًا — بين هـ و خ'], ['j','ji1','«ج» رقيقة مع ابتسامة، وطرف اللسان خلف الأسنان السفلى'],
    ['q','qi1','«تش» مع نفخة والشفاه مبتسمة'], ['x','xi1','«ش» رقيقة مع ابتسامة'],
    ['zh','zhi1','«ج» مع لفّ طرف اللسان للأعلى، بدون نفَس'], ['ch','chi1','«تش» مع لفّ طرف اللسان ونفخة هواء'],
    ['sh','shi1','«ش» مع لفّ طرف اللسان للأعلى'], ['r','ri4','بين «ر» الإنجليزية و«ج» الفرنسية — اللسان ملفوف ولا يرتجف'],
    ['z','zi1','«دز» بدون نفَس (مثل ds في kids)'], ['c','ci4','«تس» مع نفخة قوية (مثل ts في cats)'],
    ['s','si1','«س»'], ['y','yi1','«ي»'], ['w','wu1','«و»']
  ];
  const FINALS = [
    ['a','a1','«آ» مفتوحة وواسعة'], ['o','o1','«أو» مع استدارة الشفتين'],
    ['e','e2','صوت من الحلق بين «أ» و«ـه»، الشفاه غير مستديرة (مثل e في the)'], ['i','yi1','«إي» طويلة مع ابتسامة'],
    ['u','wu1','«أو» طويلة والشفاه مستديرة للأمام'], ['ü','yu1','قل «ي» ثم ضمّ شفتيك كأنك تقول «و» (مثل ü الألمانية)'],
    ['ai','ai1','«آي»'], ['ei','ei1','«إي» مثل ay في say'], ['ui','wei1','«وي» — تُكتب ui وتُنطق uei'],
    ['ao','ao2','«آو»'], ['ou','ou1','«أو» ممدودة'], ['iu','you1','«يو» — تُكتب iu وتُنطق iou'],
    ['ie','ye1','«يِه»'], ['üe','yue1','«يوِه» والشفاه مضمومة'], ['er','er2','«أر» مع لفّ اللسان للأعلى'],
    ['an','an1','«آن»'], ['en','en1','«أَن» قصيرة (مثل un في under)'], ['in','yin1','«إين»'],
    ['un','wen1','«وِن» — تُكتب un وتُنطق uen'], ['ün','yun1','«يُن» والشفاه مضمومة'],
    ['ang','ang2','«آنغ» — الصوت يخرج من الأنف والحلق'], ['eng','eng1','«أَنغ»'], ['ing','ying1','«إينغ»'], ['ong','weng1','«أونغ» (الصوت تقريبي)']
  ];
  const WHOLE = ['zhi','chi','shi','ri','zi','ci','si','yi','wu','yu','ye','yue','yuan','yin','yun','ying'];
  const TONES = [
    {n: 1, name: 'النغمة الأولى', mark: 'ˉ', tip: 'عالية ومستوية — كأنك تغنّي نغمة واحدة طويلة', path: 'M8 10 L92 10'},
    {n: 2, name: 'النغمة الثانية', mark: 'ˊ', tip: 'صاعدة — مثل سؤال المتعجّب «هاه؟»', path: 'M8 34 L92 8'},
    {n: 3, name: 'النغمة الثالثة', mark: 'ˇ', tip: 'تنخفض ثم ترتفع — وفي الكلام السريع تنخفض فقط', path: 'M8 26 Q40 50 55 44 T92 12'},
    {n: 4, name: 'النغمة الرابعة', mark: 'ˋ', tip: 'هابطة وحادة — مثل الأمر «لا!»', path: 'M8 8 L92 44'}
  ];
  const TABLES = [
    {k: 'dan', t: 'البسيطة', list: ['a','o','e','yi','wu','yu'], show: ['a','o','e','i','u','ü']},
    {k: 'fu', t: 'المركّبة', list: ['ai','ei','wei','ao','ou','you','ye','yue','er'], show: ['ai','ei','ui','ao','ou','iu','ie','üe','er']},
    {k: 'bi', t: 'الأنفية', list: ['an','en','yin','wen','yun','ang','eng','ying','weng'], show: ['an','en','in','un','ün','ang','eng','ing','ong']},
    {k: 'zt', t: 'المقاطع الكاملة', list: WHOLE, show: WHOLE}
  ];
  const ORDER = ['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];

  /* ---------- أدوات ---------- */
  function mark(s){
    const t = +s.slice(-1); let b = s.slice(0, -1).replace(/v/g, 'ü');
    if(!(t >= 1 && t <= 4)) return b;
    const M = {a: 'āáǎà', o: 'ōóǒò', e: 'ēéěè', i: 'īíǐì', u: 'ūúǔù', 'ü': 'ǖǘǚǜ'};
    let i = b.indexOf('a'); if(i < 0) i = b.indexOf('e'); if(i < 0 && b.includes('ou')) i = b.indexOf('o');
    if(i < 0) for(let k = b.length - 1; k >= 0; k--) if('aoeiuü'.includes(b[k])){ i = k; break; }
    return i < 0 ? b : b.slice(0, i) + M[b[i]][t - 1] + b.slice(i + 1);
  }
  function split(base){
    const ini = ORDER.find(x => base.startsWith(x) && base.length > x.length) || '';
    return [ini, base.slice(ini.length)];
  }
  const firstTone = base => [1, 2, 3, 4].map(t => base + t).find(has);
  let audio = null;
  function play(s, rate){
    if(!s || !has(s)) return Promise.resolve();
    try{ if(audio){ audio.pause(); } }catch(e){}
    audio = new Audio('audio/py/' + s.replace(/ü/g, 'v') + '.mp3');
    audio.playbackRate = rate || 1;
    return new Promise(res => { audio.onended = res; audio.onerror = res; audio.play().catch(res); });
  }
  const sfx = n => { try{ window.SFX && SFX.play(n); }catch(e){} };
  const praise = ok => { try{ ok ? window.tutorGood && tutorGood() : window.tutorBad && tutorBad(); }catch(e){} };
  const err = () => (state.pyErr = state.pyErr || {});

  /* ---------- الواجهة ---------- */
  let root, body, tabsEl, cur = 'ini', auto = 0;
  function build(){
    root = document.createElement('div'); root.className = 'py-app'; root.hidden = true; root.dir = 'rtl';
    root.innerHTML = `<header><button class="py-back" aria-label="رجوع">‹</button><b>🔤 البينيين والنغمات</b><span></span></header>
      <div class="py-tabs" role="tablist">
        <button data-t="ini">الحروف الأولى<small>声母</small></button><button data-t="fin">النهايات<small>韵母</small></button>
        <button data-t="tone">النغمات<small>声调</small></button><button data-t="chart">جدول المقاطع<small>拼读</small></button>
        <button data-t="drill">تدريبات<small>练习</small></button></div>
      <main></main>`;
    document.body.appendChild(root);
    body = root.querySelector('main'); tabsEl = root.querySelector('.py-tabs');
    root.querySelector('.py-back').onclick = close;
    tabsEl.onclick = e => { const b = e.target.closest('[data-t]'); if(b) show(b.dataset.t); };
  }
  function open(tab){ if(!root) build(); root.hidden = false; document.body.classList.add('py-open'); show(tab || cur); }
  function close(){ auto++; root.hidden = true; document.body.classList.remove('py-open'); try{ audio && audio.pause(); }catch(e){} }
  function show(t){
    auto++; cur = t;
    tabsEl.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    ({ini: paintIni, fin: paintFin, tone: paintTone, chart: paintChart, drill: paintDrill})[t]();
    body.scrollTop = 0;
  }
  function autoBtn(list){
    return `<button class="btn py-auto" data-auto='${esc(JSON.stringify(list))}'>▶ تشغيل تلقائي</button>`;
  }
  function wire(){
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { play(b.dataset.s); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 400); if(b.dataset.info) info(b.dataset.info); });
    body.querySelectorAll('[data-auto]').forEach(b => b.onclick = async () => {
      const run = ++auto, list = JSON.parse(b.dataset.auto);
      b.textContent = '⏹ إيقاف'; b.onclick = () => { auto++; wire(); b.textContent = '▶ تشغيل تلقائي'; };
      for(const s of list){
        if(run !== auto) return;
        const el = body.querySelector(`[data-s="${s}"]`); if(el){ el.classList.add('hit'); el.scrollIntoView({block: 'nearest'}); }
        await play(s); await new Promise(r => setTimeout(r, 450));
        if(el) el.classList.remove('hit');
      }
      if(run === auto){ b.textContent = '▶ تشغيل تلقائي'; wire(); }
    });
  }
  const card = (label, s, extra, infoKey) => `<button class="py-card${has(s) ? '' : ' off'}" data-s="${s}"${infoKey ? ` data-info="${esc(infoKey)}"` : ''}><b>${esc(label)}</b>${extra || ''}<i>🔊</i></button>`;

  function paintIni(){
    body.innerHTML = `<p class="py-note">اضغط أي حرف لتسمعه وتعرف كيف تنطقه. الحروف الأولى تُقرأ مع صوت مساعد (مثل b ← bo).</p>
      <div class="py-grid">${INITIALS.map(([l, s]) => card(l, s, '', 'i:' + l)).join('')}</div>${autoBtn(INITIALS.map(x => x[1]))}<div id="pyInfo"></div>`;
    wire();
  }
  function paintFin(){
    body.innerHTML = `<p class="py-note">النهايات (韵母) هي الجزء الأخير من المقطع، وعليها توضع علامة النغمة.</p>
      <div class="py-grid">${FINALS.map(([l, s]) => card(l, s, '', 'f:' + l)).join('')}</div>${autoBtn(FINALS.map(x => x[1]))}<div id="pyInfo"></div>`;
    wire();
  }
  function info(key){
    const [k, l] = [key[0], key.slice(2)];
    const row = (k === 'i' ? INITIALS : FINALS).find(x => x[0] === l); if(!row) return;
    // أمثلة من جدول المقاطع
    const ex = [...bases].filter(b => { const [i, f] = split(b); return k === 'i' ? i === l : (f === l.replace('ü', 'v') || f === l || (l === 'ü' && /^[jqxy]u$/.test(b))); }).slice(0, 8);
    const box = body.querySelector('#pyInfo'); if(!box) return;
    box.innerHTML = `<div class="py-info"><div class="py-big">${esc(l)}</div><div class="py-tip">${esc(row[2])}</div>
      <div class="row eq"><button class="btn o sm" data-s="${row[1]}">🔊 استمع</button><button class="btn o sm" id="pySlow">🐢 ببطء</button>${row[1] && SYL[row[1]] ? `<button class="btn o sm" data-pron="${esc(SYL[row[1]])}" data-py="${esc(mark(row[1]))}">🎤 انطق</button>` : ''}</div>
      ${ex.length ? `<div class="py-sub">أمثلة — اضغط لتسمع:</div><div class="py-chips">${ex.map(b => { const s = firstTone(b); return `<button class="py-chip" data-s="${s}">${mark(s)}<small class="hz">${SYL[s]}</small></button>`; }).join('')}</div>` : ''}</div>`;
    box.querySelector('#pySlow').onclick = () => play(row[1], .65);
    box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => play(b.dataset.s));
    box.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
  let toneTab = 'dan';
  function paintTone(){
    const T = TABLES.find(x => x.k === toneTab);
    const all = [];
    body.innerHTML = `<div class="py-tones">${TONES.map(t => `<div class="py-tone"><svg viewBox="0 0 100 52"><path d="${t.path}"/></svg><b>${t.n} ${t.mark}</b><span>${t.tip}</span></div>`).join('')}</div>
      <p class="py-note">مثال — نفس المقطع، أربعة معانٍ مختلفة:</p><div class="py-chips" style="margin-bottom:10px"><button class="py-chip" data-s="ma1">mā <small class="hz">妈</small></button><button class="py-chip" data-s="ma2">má <small class="hz">麻</small></button><button class="py-chip" data-s="ma3">mǎ <small class="hz">马</small></button><button class="py-chip" data-s="ma4">mà <small class="hz">骂</small></button></div>
      <div class="py-sub-tabs">${TABLES.map(x => `<button data-tt="${x.k}" class="${x.k === toneTab ? 'on' : ''}">${x.t}</button>`).join('')}</div>
      ${T.list.map((b, i) => { const row = [1, 2, 3, 4].map(t => { all.push(b + t); return card(mark(b + t), b + t, SYL[b + t] ? `<small class="hz">${SYL[b + t]}</small>` : ''); }).join(''); return `<div class="py-row-l">${esc(T.show[i])}</div><div class="py-grid">${row}</div>`; }).join('')}
      ${autoBtn(all.filter(has))}`;
    body.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { toneTab = b.dataset.tt; paintTone(); });
    wire();
  }
  function paintChart(){
    const groups = {};
    [...bases].sort().forEach(b => { const [i] = split(b); (groups[i || '·'] = groups[i || '·'] || []).push(b); });
    const keys = ['·', ...ORDER.filter(x => groups[x])];
    body.innerHTML = `<p class="py-note">كل المقاطع الصينية (حوالي 400 مقطع). اضغط أي مقطع لتسمع نغماته الأربع.</p>
      ${keys.map(k => `<div class="py-crow"><b>${k === '·' ? 'بدون حرف أول' : k}</b><div class="py-chips">${groups[k].map(b => `<button class="py-chip" data-b="${b}">${b.replace(/v/g, 'ü')}</button>`).join('')}</div></div>`).join('')}
      <div class="py-pop" hidden></div>`;
    const pop = body.querySelector('.py-pop');
    body.querySelectorAll('[data-b]').forEach(el => el.onclick = () => {
      const b = el.dataset.b;
      pop.innerHTML = `<div class="py-popc"><div class="py-big">${b.replace(/v/g, 'ü')}</div><div class="py-grid">${[1, 2, 3, 4].map(t => card(mark(b + t), b + t, SYL[b + t] ? `<small class="hz">${SYL[b + t]}</small>` : '')).join('')}</div>
        <div class="row eq">${autoBtn([1, 2, 3, 4].map(t => b + t).filter(has))}<button class="btn o" data-x>إغلاق</button></div></div>`;
      pop.hidden = false;
      pop.querySelector('[data-x]').onclick = () => { pop.hidden = true; auto++; };
      pop.onclick = e => { if(e.target === pop){ pop.hidden = true; auto++; } };
      wire(); play(firstTone(b));
    });
  }

  /* ---------- التدريبات ---------- */
  const DRILLS = [
    {k: 'tone', i: '🎵', t: 'ميّز النغمة', d: 'اسمع واختر رقم النغمة'},
    {k: 'listen', i: '👂', t: 'اسمع واختر البينيين', d: 'أصوات متشابهة مثل zh/z و an/ang'},
    {k: 'build', i: '🧩', t: 'ركّب المقطع', d: 'اسمع ثم اختر الحرف الأول والنهاية والنغمة'},
    {k: 'py2hz', i: '🀄', t: 'اقرأ البينيين واختر الحرف', d: 'من كلمات دروسك'},
    {k: 'hz2py', i: '🔤', t: 'اختر البينيين الصحيح للحرف', d: 'من كلمات دروسك'},
    {k: 'mix', i: '🎲', t: 'تدريب منوّع', d: 'كل الأنواع معًا'},
    {k: 'err', i: '🔁', t: 'أخطائي', d: 'المقاطع التي غلطت فيها'}
  ];
  const GROUPS = [['b','p'],['d','t'],['g','k'],['j','q','x'],['zh','ch','sh','r'],['z','c','s'],['zh','z'],['ch','c'],['sh','s','x'],['n','l'],['f','h'],['j','zh'],['q','ch']];
  const FGROUPS = [['an','ang'],['en','eng'],['in','ing'],['ian','iang'],['uan','uang'],['u','ü'],['ie','üe'],['un','ong'],['ei','ai'],['ou','uo'],['e','o'],['i','ü']];
  const pickN = (a, n) => a.slice().sort(() => Math.random() - .5).slice(0, n);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const allSyl = () => Object.keys(SYL);
  function lessonChars(){
    const out = new Map();
    try{
      LESSONS.forEach(l => l.words.forEach(w => w.ch.forEach(([c, p]) => {
        if(!/^[一-鿿]$/.test(c) || !p) return;
        const s = numbered(p); if(s && !out.has(c)) out.set(c, s);
      })));
    }catch(e){}
    return [...out.entries()];
  }
  // 'tiān' → 'tian1'
  function numbered(p){
    p = String(p).toLowerCase().trim(); let t = 5;
    const M = {'ā':'a1','á':'a2','ǎ':'a3','à':'a4','ē':'e1','é':'e2','ě':'e3','è':'e4','ī':'i1','í':'i2','ǐ':'i3','ì':'i4','ō':'o1','ó':'o2','ǒ':'o3','ò':'o4','ū':'u1','ú':'u2','ǔ':'u3','ù':'u4','ǖ':'ü1','ǘ':'ü2','ǚ':'ü3','ǜ':'ü4'};
    let b = '';
    for(const ch of p){ if(M[ch]){ b += M[ch][0]; t = +M[ch][1]; } else if(/[a-zü]/.test(ch)) b += ch; }
    return b ? b + t : '';
  }
  function similar(s){
    const t = s.slice(-1), b = s.slice(0, -1), [ini, fin] = split(b), out = new Set();
    GROUPS.filter(g => g.includes(ini)).forEach(g => g.forEach(x => { if(x !== ini && bases.has(x + fin)) out.add(x + fin + t); }));
    FGROUPS.filter(g => g.includes(fin)).forEach(g => g.forEach(x => { if(x !== fin && bases.has(ini + x)) out.add(ini + x + t); }));
    [1, 2, 3, 4].forEach(k => { if(String(k) !== t) out.add(b + k); });
    return [...out].filter(x => x !== s);
  }
  let D = null;
  function paintDrill(){
    const n = Object.keys(err()).length;
    body.innerHTML = `<p class="py-note">كل تدريب 10 أسئلة. المقاطع التي تغلط فيها تُحفظ في «أخطائي» وتظهر لك أكثر.</p>
      <div class="py-drills">${DRILLS.map(d => `<button class="py-drill" data-d="${d.k}"${d.k === 'err' && !n ? ' disabled' : ''}><i>${d.i}</i><b>${d.t}</b><small>${d.k === 'err' ? (n ? n + ' مقطع' : 'لا أخطاء بعد 🎉') : d.d}</small></button>`).join('')}</div>`;
    body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => startDrill(b.dataset.d));
  }
  function makeQ(kind){
    const errs = Object.keys(err()).filter(has);
    const pool = D.kind === 'err' && errs.length ? errs : (Math.random() < .3 && errs.length ? errs : allSyl());
    if(kind === 'mix' || kind === 'err') kind = rnd(['tone', 'listen', 'build', 'py2hz', 'hz2py']);
    if(kind === 'py2hz' || kind === 'hz2py'){
      const lc = lessonChars().filter(([, s]) => /[1-4]$/.test(s));
      if(lc.length >= 4){
        const [c, s] = rnd(lc);
        const others = pickN(lc.filter(([c2, s2]) => c2 !== c && s2 !== s), 3);
        if(kind === 'py2hz') return {kind, s, ans: c, opts: pickN([c, ...others.map(x => x[0])], 4), say: c};
        const wrong = pickN(similar(s).filter(x => x !== s), 3);
        return {kind, s, c, ans: s, opts: pickN([s, ...wrong], 4), say: c};
      }
      kind = 'listen';
    }
    const s = rnd(pool);
    if(kind === 'tone') return {kind, s, ans: s.slice(-1), opts: ['1', '2', '3', '4']};
    if(kind === 'listen'){ const w = pickN(similar(s), 3); return {kind, s, ans: s, opts: pickN([s, ...w], 4)}; }
    // build
    const b = s.slice(0, -1), [ini, fin] = split(b);
    const inis = pickN([...new Set([ini, ...(GROUPS.find(g => g.includes(ini)) || []), ...pickN(ORDER, 3)])].filter(x => x !== ini), 3);
    const fins = pickN([...new Set([...(FGROUPS.find(g => g.includes(fin)) || []), ...pickN(FINALS.map(f => f[0]), 4)])].filter(x => x !== fin && x), 3);
    return {kind: 'build', s, ini, fin, t: s.slice(-1), iniO: pickN([ini, ...inis], 4), finO: pickN([fin, ...fins], 4), pick: {}};
  }
  function startDrill(kind){ D = {kind, i: 0, n: 10, score: 0, wrong: []}; nextQ(); }
  function nextQ(){
    if(D.i >= D.n) return drillDone();
    D.q = makeQ(D.kind); D.done = false; paintQ();
    setTimeout(() => sayQ(), 250);
  }
  function sayQ(slow){ const q = D.q; if(q.say){ try{ speak(q.say, slow ? .6 : undefined); }catch(e){} } else play(q.s, slow ? .65 : 1); }
  const lbl = s => mark(s.replace(/v/g, 'ü'));
  function paintQ(){
    const q = D.q, head = `<div class="py-qh"><span>${D.i + 1} / ${D.n}</span><span>✓ ${D.score}</span><button class="btn o sm" data-a="quit">إنهاء</button></div>`;
    let main = '';
    const play2 = `<div class="row eq"><button class="btn" data-a="play">🔊 استمع</button><button class="btn o" data-a="slow">🐢 ببطء</button></div>`;
    if(q.kind === 'tone') main = `<h3>اسمع: أي نغمة؟</h3>${play2}<div class="py-opts four">${q.opts.map(o => `<button data-o="${o}"><svg viewBox="0 0 100 52"><path d="${TONES[o - 1].path}"/></svg>${o} ${TONES[o - 1].mark}</button>`).join('')}</div>`;
    if(q.kind === 'listen') main = `<h3>اسمع واختر البينيين الصحيح</h3>${play2}<div class="py-opts">${q.opts.map(o => `<button data-o="${o}" dir="ltr">${lbl(o)}</button>`).join('')}</div>`;
    if(q.kind === 'py2hz') main = `<h3>اقرأ البينيين واختر الحرف</h3><div class="py-bigpy" dir="ltr">${lbl(q.s)}</div><div class="py-opts hz">${q.opts.map(o => `<button data-o="${o}" class="hz">${o}</button>`).join('')}</div>`;
    if(q.kind === 'hz2py') main = `<h3>ما البينيين الصحيح لهذا الحرف؟</h3><div class="py-bighz hz">${q.c}</div><div class="py-opts">${q.opts.map(o => `<button data-o="${o}" dir="ltr">${lbl(o)}</button>`).join('')}</div>`;
    if(q.kind === 'build') main = `<h3>اسمع وركّب المقطع</h3>${play2}
      <div class="py-build" dir="ltr"><span>${q.pick.i != null ? q.pick.i || '∅' : '?'}</span>+<span>${q.pick.f ? q.pick.f.replace('v', 'ü') : '?'}</span>+<span>${q.pick.t ? TONES[q.pick.t - 1].mark : '?'}</span></div>
      <div class="py-sub">الحرف الأول</div><div class="py-opts small" dir="ltr">${q.iniO.map(o => `<button data-bi="${o}" class="${q.pick.i === o ? 'sel' : ''}">${o || '∅'}</button>`).join('')}</div>
      <div class="py-sub">النهاية</div><div class="py-opts small" dir="ltr">${q.finO.map(o => `<button data-bf="${o}" class="${q.pick.f === o ? 'sel' : ''}">${o.replace('v', 'ü')}</button>`).join('')}</div>
      <div class="py-sub">النغمة</div><div class="py-opts small">${[1, 2, 3, 4].map(o => `<button data-bt="${o}" class="${+q.pick.t === o ? 'sel' : ''}">${o} ${TONES[o - 1].mark}</button>`).join('')}</div>
      <button class="btn g wide" data-a="check" ${q.pick.i != null && q.pick.f && q.pick.t ? '' : 'disabled'}>تحقّق</button>`;
    body.innerHTML = `<div class="py-q">${head}${main}<div class="py-res"></div></div>`;
    body.querySelector('[data-a="quit"]').onclick = () => drillDone();
    const pa = body.querySelector('[data-a="play"]'); if(pa) pa.onclick = () => sayQ();
    const sl = body.querySelector('[data-a="slow"]'); if(sl) sl.onclick = () => sayQ(true);
    body.querySelectorAll('[data-o]').forEach(b => b.onclick = () => answer(b.dataset.o, b));
    if(q.kind === 'build'){
      const set = (k, v) => { if(D.done) return; q.pick[k] = v; sfx('tap'); paintQ(); };
      body.querySelectorAll('[data-bi]').forEach(b => b.onclick = () => set('i', b.dataset.bi));
      body.querySelectorAll('[data-bf]').forEach(b => b.onclick = () => set('f', b.dataset.bf));
      body.querySelectorAll('[data-bt]').forEach(b => b.onclick = () => set('t', b.dataset.bt));
      body.querySelector('[data-a="check"]').onclick = () => answer((q.pick.i || '') + q.pick.f + q.pick.t);
    }
  }
  function answer(o, btn){
    if(D.done) return; D.done = true;
    const q = D.q, ok = String(o) === String(q.ans || q.s);
    if(ok){ D.score++; const e = err(); if(e[q.s]){ e[q.s]--; if(e[q.s] <= 0) delete e[q.s]; } }
    else { err()[q.s] = (err()[q.s] || 0) + 2; D.wrong.push(q.s); }
    try{ save(); }catch(e){}
    sfx(ok ? 'good' : 'bad'); praise(ok);
    body.querySelectorAll('[data-o]').forEach(b => { b.disabled = true; if(b.dataset.o === String(q.ans)) b.classList.add('ok'); else if(b === btn) b.classList.add('no'); });
    const hz = q.c || q.say || SYL[q.s] || '';
    body.querySelector('.py-res').innerHTML = `<div class="note ${ok ? 'g' : 'r'}"><b>${ok ? '✓ صحيح' : '✗ الصحيح:'}</b> <span dir="ltr" class="py-ans">${lbl(q.s)}</span> ${hz ? `<span class="hz">${esc(hz)}</span>` : ''}
      <button class="btn o sm" data-a="again">🔊</button></div><button class="btn wide" data-a="next">${D.i + 1 < D.n ? 'التالي ▶' : 'النتيجة'}</button>`;
    body.querySelector('[data-a="again"]').onclick = () => play(q.s);
    body.querySelector('[data-a="next"]').onclick = () => { D.i++; nextQ(); };
    if(!ok) setTimeout(() => play(q.s), 500);
  }
  function drillDone(){
    const pct = D.n ? Math.round(D.score / Math.max(1, D.i + (D.done ? 1 : 0)) * 100) : 0;
    sfx(pct >= 70 ? 'finish' : 'fail');
    try{ touchStreak(); save(); }catch(e){}
    state.pyLog = (state.pyLog || []).concat({k: D.kind, s: D.score, t: D.n, at: Date.now()}).slice(-50);
    body.innerHTML = `<div class="py-q"><div class="py-done"><div class="py-bigsc">${D.score}/${D.n}</div>
      <p>${pct >= 90 ? 'أذنك ممتازة! 👂🎉' : pct >= 70 ? 'جيد جدًا — استمر 💪' : 'التدريب يصنع الفرق — أعد المحاولة 🔁'}</p>
      ${D.wrong.length ? `<div class="py-sub">راجع هذه — اضغط لتسمع:</div><div class="py-chips" dir="ltr">${[...new Set(D.wrong)].map(s => `<button class="py-chip" data-s="${s}">${lbl(s)}</button>`).join('')}</div>` : ''}
      <div class="row eq"><button class="btn o" data-a="menu">التدريبات</button><button class="btn" data-a="again">مرة أخرى</button></div></div></div>`;
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => play(b.dataset.s));
    body.querySelector('[data-a="menu"]').onclick = paintDrill;
    body.querySelector('[data-a="again"]').onclick = () => startDrill(D.kind);
    try{ window.tutorSay && tutorSay(pct >= 70 ? 'good' : 'info', `<b>${D.score}/${D.n} في البينيين</b><small>${pct >= 70 ? 'نطقك وسمعك يتحسّنان 👏' : 'ركّز على الأصوات المتشابهة واسمعها ببطء 🐢'}</small>`, {force: true}); }catch(e){}
  }

  /* ---------- الربط ---------- */
  window.openPinyin = open;
  window.PinyinKit = {mark, numbered, play};
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && root && !root.hidden) close(); });
  function tile(){
    const tiles = document.querySelector('#pg-home .tiles'); if(!tiles) return setTimeout(tile, 200);
    if(document.getElementById('pyTile')) return;
    const b = document.createElement('button'); b.className = 'tile py-tile'; b.id = 'pyTile';
    b.innerHTML = '<i>🔤</i><b>البينيين والنغمات</b><small>الأصوات، النغمات، وتدريبات النطق والاستماع</small>';
    b.onclick = () => open();
    tiles.prepend(b);
  }
  tile();
})();
