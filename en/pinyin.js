/* قسم البينيين: جداول الحروف الأولى والنهايات والنغمات بالصوت، جدول المقاطع، وتدريبات النطق والاستماع */
(function(){
  'use strict';
  const SYL = window.PY_SYL || {};                 // 'tian1': '天'
  const has = s => Object.prototype.hasOwnProperty.call(SYL, s);   // القيمة '' = نغمة بلا حرف شائع (صوت مولّد من نفس المقطع)
  const bases = new Set(Object.keys(SYL).map(s => s.slice(0, -1)));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ---------- البيانات ---------- */
  const INITIALS = [
    ['b','bo1',"“B” is light without breath — between B and P"], ['p','po1',"“P” with a strong puff of air (put your hand in front of your mouth and you will feel the air)"],
    ['m','mo1',"«M»"], ['f','fo2',"«F»"],
    ['d','de2',"“D” is light without breath — between D and T"], ['t','te4',"“T” with a strong puff of air"],
    ['n','ne4',"“N”"], ['l','le4',"“L” is embossed"],
    ['g','ge1',"“K” without a breath (like the English g but lighter)"], ['k','ke1',"“K” with a strong puff of air"],
    ['h','he1',"“Kh” is very light - between H and KH"], ['j','ji1',"“C” is thin with a smile, and the tip of the tongue is behind the lower teeth"],
    ['q','qi1',"“Tch” with a murmur and smiling lips"], ['x','xi1',"“Sh” is gentle with a smile"],
    ['zh','zhi1',"“C” with the tip of the tongue curled upwards, without breathing"], ['ch','chi1',"“Tch” with a twist of the tip of the tongue and a puff of air"],
    ['sh','shi1',"“sh” with the tip of the tongue curled upward"], ['r','ri4',"Between the English “r” and the French “g” — the tongue is coiled and does not tremble"],
    ['z','zi1',"“dz” without a breath (like ds in kids)"], ['c','ci4',"“ts” with a strong murmur (like ts in cats)"],
    ['s','si1',"«S»"], ['y','yi1',"“Y”"], ['w','wu1',"“and”"]
  ];
  const FINALS = [
    ['a','a1',"“A” is open and wide"], ['o','o1',"“or” with rounded lips"],
    ['e','e2',"A throat sound between “a” and “ha”, the lips are not rounded (like the e in the)"], ['i','yi1',"“E” is long and with a smile"],
    ['u','wu1',"“or” is long and the lips are rounded forward"], ['ü','yu1',"Say “y” and then purse your lips as if you were saying “and” (like the German ü)"],
    ['ai','ai1',"“Aye”"], ['ei','ei1',"“ay” like ay in say"], ['ui','wei1',"“Wei” — written ui and pronounced uei"],
    ['ao','ao2',"“Aw”"], ['ou','ou1',"“or” is extended"], ['iu','you1',"“Yu” — written iu and pronounced iou"],
    ['ie','ye1',"“Yeh”"], ['üe','yue1',"“Yuh” with pursed lips"], ['er','er2',"“Ar” with the tongue rolled up"],
    ['an','an1',"“Anne”"], ['en','en1',"“That” is short (like un in under)"], ['in','yin1',"“In”"],
    ['un','wen1',"“Wen” - written un and pronounced uen"], ['ün','yun1',"“Yun” with pursed lips"],
    ['ang','ang2',"“Aang” — the sound comes from the nose and throat"], ['eng','eng1',"“Aang”"], ['ing','ying1',"“Ing”"], ['ong','weng1',"“Aung” (approximate sound)"]
  ];
  const WHOLE = ['zhi','chi','shi','ri','zi','ci','si','yi','wu','yu','ye','yue','yuan','yin','yun','ying'];
  const TONES = [
    {n: 1, name: "The first tone", mark: 'ˉ', tip: "High and level — as if you were singing one long note", path: 'M8 10 L92 10'},
    {n: 2, name: "The second tone", mark: 'ˊ', tip: "Rising — like a wondering question, “Huh?”", path: 'M8 34 L92 8'},
    {n: 3, name: "The third tone", mark: 'ˇ', tip: "It goes down and then goes up - and in fast speech it only goes down", path: 'M8 26 Q40 50 55 44 T92 12'},
    {n: 4, name: "The fourth tone", mark: 'ˋ', tip: "Low and sharp — like the command “No!”", path: 'M8 8 L92 44'}
  ];
  const TABLES = [
    {k: 'dan', t: "Simple", list: ['a','o','e','yi','wu','yu'], show: ['a','o','e','i','u','ü']},
    {k: 'fu', t: "The vehicle", list: ['ai','ei','wei','ao','ou','you','ye','yue','er'], show: ['ai','ei','ui','ao','ou','iu','ie','üe','er']},
    {k: 'bi', t: "Nasal", list: ['an','en','yin','wen','yun','ang','eng','ying','weng'], show: ['an','en','in','un','ün','ang','eng','ing','ong']},
    {k: 'zt', t: "Complete clips", list: WHOLE, show: WHOLE}
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
    audio = new Audio('audio/py/' + s.replace(/ü/g, 'v') + '.mp3?v=4');
    audio.playbackRate = rate || 1;
    return new Promise(res => { audio.onended = res; audio.onerror = res; audio.play().catch(res); });
  }
  const sfx = n => { try{ window.SFX && SFX.play(n); }catch(e){} };
  const praise = ok => { try{ ok ? window.tutorGood && tutorGood() : window.tutorBad && tutorBad(); }catch(e){} };
  const err = () => (state.pyErr = state.pyErr || {});

  /* ---------- الواجهة ---------- */
  let root, body, tabsEl, cur = 'ini', auto = 0;
  function build(){
    root = document.createElement('div'); root.className = 'py-app'; root.hidden = true; root.dir = document.documentElement.dir;
    root.innerHTML = `<header><button class=\"py-back\" aria-label=\"Back\">‹</button><b>🔤 Pinyins and tones</b><span></span></header>\n      <div class=\"py-tabs\" role=\"tablist\">\n        <button data-t=\"ini\">The first letters<small>声母</small></button><button data-t=\"fin\">Endings<small>韵母</small></button>\n        <button data-t=\"tone\">Ringtone<small>声调</small></button><button data-t=\"chart\">Section table<small>拼读</small></button>\n        <button data-t=\"drill\">Exercises<small>练习</small></button></div>\n      <main></main>\n      <footer class=\"py-credit\">🎙 Human recordings: Chen Wang via <a href=\"https://github.com/hugolpz/audio-cmn\" target=\"_blank\" rel=\"noopener\">audio-cmn</a> (CC BY-SA) and<a href=\"https://github.com/davinfifield/mp3-chinese-pinyin-sound\" target=\"_blank\" rel=\"noopener\">mp3-chinese-pinyin-sound</a></footer>`;
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
    return `<button class="btn py-auto" data-auto='${esc(JSON.stringify(list))}'>▶ Autoplay</button>`;
  }
  function wire(){
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { play(b.dataset.s); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 400); if(b.dataset.info) info(b.dataset.info); });
    body.querySelectorAll('[data-auto]').forEach(b => b.onclick = async () => {
      const run = ++auto, list = JSON.parse(b.dataset.auto);
      b.textContent = "⏹ Off"; b.onclick = () => { auto++; wire(); b.textContent = "▶ Autoplay"; };
      for(const s of list){
        if(run !== auto) return;
        const el = body.querySelector(`[data-s="${s}"]`); if(el){ el.classList.add('hit'); el.scrollIntoView({block: 'nearest'}); }
        await play(s); await new Promise(r => setTimeout(r, 450));
        if(el) el.classList.remove('hit');
      }
      if(run === auto){ b.textContent = "▶ Autoplay"; wire(); }
    });
  }
  const card = (label, s, extra, infoKey) => `<button class="py-card${has(s) ? '' : ' off'}" data-s="${s}"${infoKey ? ` data-info="${esc(infoKey)}"` : ''}><b>${esc(label)}</b>${extra || ''}<i>🔊</i></button>`;

  function paintIni(){
    body.innerHTML = `<p class=\"py-note\">Click on any letter to hear it and learn how to pronounce it. The first letters are read with an auxiliary sound (e.g. b ← bo).</p>\n      <div class=\"py-grid\">${INITIALS.map(([l, s]) => card(l, s, '', 'i:' + l)).join('')}</div>${autoBtn(INITIALS.map(x => x[1]))}<div id="pyInfo"></div>`;
    wire();
  }
  function paintFin(){
    body.innerHTML = `<p class=\"py-note\">The endings (韵母) are the final part of the syllable, and are marked with the tone.</p>\n      <div class=\"py-grid\">${FINALS.map(([l, s]) => card(l, s, '', 'f:' + l)).join('')}</div>${autoBtn(FINALS.map(x => x[1]))}<div id="pyInfo"></div>`;
    wire();
  }
  function info(key){
    const [k, l] = [key[0], key.slice(2)];
    const row = (k === 'i' ? INITIALS : FINALS).find(x => x[0] === l); if(!row) return;
    // أمثلة من جدول المقاطع
    const ex = [...bases].filter(b => { const [i, f] = split(b); return k === 'i' ? i === l : (f === l.replace('ü', 'v') || f === l || (l === 'ü' && /^[jqxy]u$/.test(b))); }).slice(0, 8);
    const box = body.querySelector('#pyInfo'); if(!box) return;
    box.innerHTML = `<div class="py-info"><div class="py-big">${esc(l)}</div><div class="py-tip">${esc(row[2])}</div>
      <div class="row eq"><button class="btn o sm" data-s="${row[1]}\">🔊 Listen</button><button class=\"btn o sm\" id=\"pySlow\">🐢 Slowly</button>${row[1] && SYL[row[1]] ? `<button class="btn o sm" data-pron="${esc(SYL[row[1]])}" data-py="${esc(mark(row[1]))}\">🎤 Speak</button>` : ''}</div>
      ${ex.length ? `<div class=\"py-sub\">Examples - click to listen:</div><div class=\"py-chips\">${ex.map(b => { const s = firstTone(b); return `<button class="py-chip" data-s="${s}">${mark(s)}<small class="hz">${SYL[s]}</small></button>`; }).join('')}</div>` : ''}</div>`;
    box.querySelector('#pySlow').onclick = () => play(row[1], .65);
    box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => play(b.dataset.s));
    box.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
  let toneTab = 'dan';
  function paintTone(){
    const T = TABLES.find(x => x.k === toneTab);
    const all = [];
    body.innerHTML = `<div class="py-tones">${TONES.map(t => `<div class="py-tone"><svg viewBox="0 0 100 52"><path d="${t.path}"/></svg><b>${t.n} ${t.mark}</b><span>${t.tip}</span></div>`).join('')}</div>\n      <p class=\"py-note\">Example - Same passage, four different meanings:</p><div class=\"py-chips\" style=\"margin-bottom:10px\"><button class=\"py-chip\" data-s=\"ma1\">mā <small class=\"hz\">妈</small></button><button class=\"py-chip\" data-s=\"ma2\">má <small class=\"hz\">麻</small></button><button class=\"py-chip\" data-s=\"ma3\">mǎ <small class=\"hz\">马</small></button><button class=\"py-chip\" data-s=\"ma4\">mà <small class=\"hz\">骂</small></button></div>\n      <div class=\"py-sub-tabs\">${TABLES.map(x => `<button data-tt="${x.k}" class="${x.k === toneTab ? 'on' : ''}">${x.t}</button>`).join('')}</div>
      ${T.list.map((b, i) => { const row = [1, 2, 3, 4].map(t => { all.push(b + t); return card(mark(b + t), b + t, SYL[b + t] ? `<small class="hz">${SYL[b + t]}</small>` : ''); }).join(''); return `<div class="py-row-l">${esc(T.show[i])}</div><div class="py-grid">${row}</div>`; }).join('')}
      ${autoBtn(all.filter(has))}`;
    body.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { toneTab = b.dataset.tt; paintTone(); });
    wire();
  }
  function paintChart(){
    const groups = {};
    [...bases].sort().forEach(b => { const [i] = split(b); (groups[i || '·'] = groups[i || '·'] || []).push(b); });
    const keys = ['·', ...ORDER.filter(x => groups[x])];
    body.innerHTML = `<p class=\"py-note\">All Chinese clips (about 400 clips). Click any clip to hear its four tones.</p>\n      ${keys.map(k => `<div class="py-crow"><b>${k === '·' ? "without a first letter" : k}</b><div class="py-chips">${groups[k].map(b => `<button class="py-chip" data-b="${b}">${b.replace(/v/g, 'ü')}</button>`).join('')}</div></div>`).join('')}
      <div class="py-pop" hidden></div>`;
    const pop = body.querySelector('.py-pop');
    body.querySelectorAll('[data-b]').forEach(el => el.onclick = () => {
      const b = el.dataset.b;
      pop.innerHTML = `<div class="py-popc"><div class="py-big">${b.replace(/v/g, 'ü')}</div><div class="py-grid">${[1, 2, 3, 4].map(t => card(mark(b + t), b + t, SYL[b + t] ? `<small class="hz">${SYL[b + t]}</small>` : '')).join('')}</div>
        <div class="row eq">${autoBtn([1, 2, 3, 4].map(t => b + t).filter(has))}<button class=\"btn o\" data-x>Close</button></div></div>`;
      pop.hidden = false;
      pop.querySelector('[data-x]').onclick = () => { pop.hidden = true; auto++; };
      pop.onclick = e => { if(e.target === pop){ pop.hidden = true; auto++; } };
      wire(); play(firstTone(b));
    });
  }

  /* ---------- التدريبات ---------- */
  const DRILLS = [
    {k: 'tone', i: '🎵', t: "Identify the tone", d: "Listen and choose the tone number"},
    {k: 'listen', i: '👂', t: "Listen and choose the pinyin", d: "Similar sounds such as zh/z and an/ang"},
    {k: 'build', i: '🧩', t: "Compose the clip", d: "Listen, then choose the first letter, the end, and the tone"},
    {k: 'py2hz', i: '🀄', t: "Read the pinyin and choose the letter", d: "From the words of your lessons"},
    {k: 'hz2py', i: '🔤', t: "Choose the correct pinyin for the letter", d: "From the words of your lessons"},
    {k: 'mix', i: '🎲', t: "Diversified training", d: "All kinds together"},
    {k: 'err', i: '🔁', t: "My mistakes", d: "The passages in which I made a mistake"}
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
    body.innerHTML = `<p class=\"py-note\">Each training has 10 questions. The passages in which you make mistakes are saved in “My Mistakes” and shown to you more often.</p>\n      <div class=\"py-drills\">${DRILLS.map(d => `<button class="py-drill" data-d="${d.k}"${d.k === 'err' && !n ? ' disabled' : ''}><i>${d.i}</i><b>${d.t}</b><small>${d.k === 'err' ? (n ? n + " Clip" : "No errors yet 🎉") : d.d}</small></button>`).join('')}</div>`;
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
    const q = D.q, head = `<div class="py-qh"><span>${D.i + 1} / ${D.n}</span><span>✓ ${D.score}</span><button class=\"btn o sm\" data-a=\"quit\">End</button></div>`;
    let main = '';
    const play2 = `<div class=\"row eq\"><button class=\"btn\" data-a=\"play\">🔊 Listen</button><button class=\"btn o\" data-a=\"slow\">🐢 Slowly</button></div>`;
    if(q.kind === 'tone') main = `<h3>Listen: What tone?</h3>${play2}<div class="py-opts four">${q.opts.map(o => `<button data-o="${o}"><svg viewBox="0 0 100 52"><path d="${TONES[o - 1].path}"/></svg>${o} ${TONES[o - 1].mark}</button>`).join('')}</div>`;
    if(q.kind === 'listen') main = `<h3>Listen and choose the correct pinyin</h3>${play2}<div class="py-opts">${q.opts.map(o => `<button data-o="${o}" dir="ltr">${lbl(o)}</button>`).join('')}</div>`;
    if(q.kind === 'py2hz') main = `<h3>Read the pinyin and choose the letter</h3><div class=\"py-bigpy\" dir=\"ltr\">${lbl(q.s)}</div><div class="py-opts hz">${q.opts.map(o => `<button data-o="${o}" class="hz">${o}</button>`).join('')}</div>`;
    if(q.kind === 'hz2py') main = `<h3>What is the correct pinyin for this letter?</h3><div class=\"py-bighz hz\">${q.c}</div><div class="py-opts">${q.opts.map(o => `<button data-o="${o}" dir="ltr">${lbl(o)}</button>`).join('')}</div>`;
    if(q.kind === 'build') main = `<h3>Listen and watch the clip</h3>${play2}
      <div class="py-build" dir="ltr"><span>${q.pick.i != null ? q.pick.i || '∅' : '?'}</span>+<span>${q.pick.f ? q.pick.f.replace('v', 'ü') : '?'}</span>+<span>${q.pick.t ? TONES[q.pick.t - 1].mark : '?'}</span></div>\n      <div class=\"py-sub\">The first letter</div><div class=\"py-opts small\" dir=\"ltr\">${q.iniO.map(o => `<button data-bi="${o}" class="${q.pick.i === o ? 'sel' : ''}">${o || '∅'}</button>`).join('')}</div>\n      <div class=\"py-sub\">The End</div><div class=\"py-opts small\" dir=\"ltr\">${q.finO.map(o => `<button data-bf="${o}" class="${q.pick.f === o ? 'sel' : ''}">${o.replace('v', 'ü')}</button>`).join('')}</div>\n      <div class=\"py-sub\">The tone</div><div class=\"py-opts small\">${[1, 2, 3, 4].map(o => `<button data-bt="${o}" class="${+q.pick.t === o ? 'sel' : ''}">${o} ${TONES[o - 1].mark}</button>`).join('')}</div>
      <button class="btn g wide" data-a="check" ${q.pick.i != null && q.pick.f && q.pick.t ? '' : 'disabled'}>Check</button>`;
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
    body.querySelector('.py-res').innerHTML = `<div class="note ${ok ? 'g' : 'r'}"><b>${ok ? "✓ True" : "✗ The correct one:"}</b> <span dir="ltr" class="py-ans">${lbl(q.s)}</span> ${hz ? `<span class="hz">${esc(hz)}</span>` : ''}
      <button class="btn o sm" data-a="again">🔊</button></div><button class="btn wide" data-a="next">${D.i + 1 < D.n ? "Next ▶" : "The result"}</button>`;
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
      <p>${pct >= 90 ? "Your ear is excellent! 👂🎉" : pct >= 70 ? "Very good — keep it up 💪" : "Training makes the difference — try again 🔁"}</p>
      ${D.wrong.length ? `<div class=\"py-sub\">Check this out — click to listen:</div><div class=\"py-chips\" dir=\"ltr\">${[...new Set(D.wrong)].map(s => `<button class="py-chip" data-s="${s}">${lbl(s)}</button>`).join('')}</div>` : ''}\n      <div class=\"row eq\"><button class=\"btn o\" data-a=\"menu\">Exercises</button><button class=\"btn\" data-a=\"again\">again</button></div></div></div>`;
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => play(b.dataset.s));
    body.querySelector('[data-a="menu"]').onclick = paintDrill;
    body.querySelector('[data-a="again"]').onclick = () => startDrill(D.kind);
    try{ window.tutorSay && tutorSay(pct >= 70 ? 'good' : 'info', `<b>${D.score}/${D.n} in pinyin</b><small>${pct >= 70 ? "Your speech and hearing improve 👏" : "Focus on similar sounds and hear them slowly 🐢"}</small>`, {force: true}); }catch(e){}
  }

  /* ---------- الربط ---------- */
  window.openPinyin = open;
  window.PinyinKit = {mark, numbered, play};
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && root && !root.hidden) close(); });
  function tile(){
    const tiles = document.querySelector('#pg-home .tiles'); if(!tiles) return setTimeout(tile, 200);
    if(document.getElementById('pyTile')) return;
    const b = document.createElement('button'); b.className = 'tile py-tile'; b.id = 'pyTile';
    b.innerHTML = "<i>🔤</i><b>Pinyin and tones</b><small>Sounds, tones, and pronunciation and listening exercises</small>";
    b.onclick = () => open();
    tiles.prepend(b);
  }
  tile();
})();
