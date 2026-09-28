/* قاموس فوري: كلك يمين (أو ضغطة مطوّلة على الجوال) على أي كلمة صينية في التطبيق
   تظهر نافذة بالمعنى العربي والبينيين، مع الاستماع والانتقال إلى بطاقة الكلمة إن كانت في الدروس. */
(function(){
  'use strict';
  const e = s => (typeof esc === 'function' ? esc(s) : String(s));
  const CJK = /[一-鿿]/;

  /* ---------- الفهرس: كلمات الدروس، مكوّنات الجمل، الحروف، كلماتي، وكلمات الامتحان ---------- */
  let DICT = null, MAXLEN = 1;
  function add(hz, entry){
    hz = String(hz || '').replace(/[^一-鿿]/g, ''); if(!hz) return;
    const cur = DICT.get(hz);
    // الأولوية: بطاقة درس > كلماتي > مكوّن جملة > حرف > امتحان
    const cards = (cur && cur.cards || []).slice();
    if(entry.card && !cards.some(c => c.card === entry.card)) cards.push({card: entry.card, lesson: entry.lesson});
    if(!cur || entry.rank > cur.rank || (entry.rank === cur.rank && entry.card && !cur.card)) DICT.set(hz, Object.assign({hz}, entry));
    DICT.get(hz).cards = cards;
    MAXLEN = Math.max(MAXLEN, hz.length);
  }
  function build(){
    DICT = new Map(); MAXLEN = 1;
    const lessons = (typeof LESSONS !== 'undefined' ? LESSONS : []).filter(l => l.id !== 'LX');
    for(const les of lessons){
      for(const w of les.words){
        add(wordHz(w).replace(/\s*\/\s*/g,''), {py: wordPy(w), ar: w.m, card: les.id + ':' + w.id, lesson: les.title, rank: 5});
        if(w.dhz && w.ch.length > 1) w.ch.forEach(c => add(c[0], {py: c[1], ar: w.m, card: les.id + ':' + w.id, lesson: les.title, rank: 5}));
        if(w.ch.length > 1) w.ch.forEach(c => { const m = typeof charMeaning === 'function' ? charMeaning(c[0], w) : ''; add(c[0], {py: c[1], ar: m || ('جزء من «' + wordHz(w) + '» (' + w.m + ')'), rank: m ? 3 : 1, inWord: wordHz(w), wordCard: les.id + ':' + w.id}); });
      }
      for(const s of Object.values(les.sents || {})) for(const t of s.t) add(t[0], {py: t[1], ar: t[2], rank: 2});
    }
    (state.myWords || []).forEach(w => add(w.hz, {py: w.py, ar: w.m, mine: true, rank: 4}));
    const B = window.HSK_BANK;
    if(B) (B.pic || []).forEach(p => add(p.w, {py: p.py.map(x=>x[1]).join(''), ar: p.ar, rank: 1, exam: true}));
    DICT._mine = (state.myWords || []).length;
  }
  const dict = () => (DICT || build(), DICT);

  /* ---------- أطول كلمة معروفة حول الحرف المضغوط ---------- */
  function wordAt(text, i){
    const d = dict();
    let best = null;
    for(let len = Math.min(MAXLEN, 8); len >= 1 && !best; len--){
      for(let start = Math.max(0, i - len + 1); start <= i; start++){
        const seg = text.slice(start, start + len);
        if(seg.length === len && !/[^一-鿿]/.test(seg) && d.has(seg)){ best = d.get(seg); break; }
      }
    }
    return best || { hz: text[i], unknown: true };
  }
  function textUnder(x, y){
    let node, off;
    if(document.caretPositionFromPoint){ const p = document.caretPositionFromPoint(x, y); if(p){ node = p.offsetNode; off = p.offset; } }
    else if(document.caretRangeFromPoint){ const r = document.caretRangeFromPoint(x, y); if(r){ node = r.startContainer; off = r.startOffset; } }
    if(!node || node.nodeType !== 3) return null;
    const t = node.textContent;
    // المؤشر قد يقع بين حرفين: نختار الحرف الصيني الأقرب
    for(const k of [off, off - 1]) if(k >= 0 && k < t.length && CJK.test(t[k])) return {text: t, i: k};
    return null;
  }
  function selectionWord(){
    const s = window.getSelection && String(window.getSelection()).trim();
    const hz = s && s.replace(/[^一-鿿]/g, '');
    if(!hz || hz.length > 12) return null;
    return dict().get(hz) || { hz, unknown: true };
  }

  /* ---------- النافذة ---------- */
  const pop = document.createElement('div');
  pop.className = 'lk-pop'; pop.hidden = true; pop.dir = 'rtl'; pop.setAttribute('role', 'dialog');
  document.body.appendChild(pop);
  function close(){ pop.hidden = true; }
  function charsInfo(hz){
    // لكلمة غير معروفة: نعرض ما نعرفه عن كل حرف
    return [...hz].map(c => { const d = dict().get(c); return d ? `<span class="lk-ch"><b class="hz">${e(c)}</b><i>${e(d.py||'')}</i><small>${e(d.ar||'')}</small></span>` : `<span class="lk-ch"><b class="hz">${e(c)}</b><i>؟</i></span>`; }).join('');
  }
  function show(entry, x, y){
    const hz = entry.hz;
    const here = (entry.cards || []).find(c => L && c.card.startsWith(L.id + ':'));
    const main = here || (entry.cards || [])[0];
    const card = (main && main.card) || entry.card || entry.wordCard;
    const others = (entry.cards || []).filter(c => c !== main).map(c => c.lesson);
    let body;
    if(entry.unknown){
      const known = [...hz].some(c => dict().has(c));
      body = `<div class="lk-hz hz">${e(hz)}</div>
        ${known ? `<div class="lk-chars">${charsInfo(hz)}</div>` : ''}
        <p class="lk-note">${hz.length > 1 ? 'هذه الكلمة ليست' : 'هذا الحرف ليس'} في دروسك بعد.</p><div class="lk-ai"></div>`;
    } else {
      body = `<div class="lk-hz hz">${e(hz)}</div>
        <div class="lk-py" dir="ltr">${e(entry.py || '')}</div>
        <div class="lk-ar">${e(entry.ar || '')}</div>
        ${main ? `<div class="lk-src">📘 ${e(main.lesson)}${others.length ? ' · وأيضًا في: ' + others.map(e).join('، ') : ''}</div>`
          : entry.inWord ? `<div class="lk-src">من كلمة «${e(entry.inWord)}»</div>`
          : entry.mine ? '<div class="lk-src">⭐ من كلماتي</div>'
          : entry.exam ? '<div class="lk-src">📝 من كلمات امتحان HSK 1</div>' : ''}`;
    }
    const acts = [
      `<button data-a="say">🔊 استمع</button>`,
      card ? `<button data-a="card" class="main">📖 افتح البطاقة${entry.wordCard && !entry.card ? ' «' + e(entry.inWord) + '»' : ''}</button>` : '',
      entry.mine ? `<button data-a="mine">⭐ كلماتي</button>` : '',
      `<button data-a="pron">🎤 انطق</button>`,
      card ? `<button data-a="write">✍️ اكتب</button>` : '',
      entry.unknown ? `<button data-a="ai" class="main">🔎 ابحث عن المعنى</button>` : '',
      `<button data-a="ask">💬 اسأل المعلّم</button>`
    ].filter(Boolean).join('');
    const inExam = !!document.querySelector('#hskExam:not([hidden])');
    pop.innerHTML = `<button class="lk-x" aria-label="إغلاق">✕</button>${body}<div class="lk-acts">${inExam ? '<button data-a="say">🔊 استمع</button>' : acts}</div>`;
    pop.hidden = false;
    // التموضع قرب المؤشر داخل الشاشة
    const W = window.innerWidth, H = window.innerHeight, r = pop.getBoundingClientRect();
    let left = Math.min(Math.max(8, x - r.width / 2), W - r.width - 8), top = y + 14;
    if(top + r.height > H - 8) top = Math.max(8, y - r.height - 14);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    pop.querySelector('.lk-x').onclick = close;
    pop.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if(a === 'say') return speak(hz);
      if(a === 'ai') return aiLookup(entry, b);
      close();
      if(a === 'card'){ const k = card; const w = findWord(k); const other = w && L && w._L !== L.id; openWord(k); if(other) toast('انتقلت إلى: ' + L.title); }
      else if(a === 'mine') go('mywords');
      else if(a === 'pron') pronCheck && pronCheck(hz, entry.py || '');
      else if(a === 'write'){ const w = card && findWord(card); if(w) openWrite(card); else toast('الكتابة متاحة لكلمات الدروس'); }
      else if(a === 'ask'){ openTutorPanel && openTutorPanel(); tutorAsk('اشرح لي ' + hz + ': المعنى بالعربي والبينيين ومثال.'); }
    });
  }
  const LK_SCHEMA = {type:'object', required:['word','py','ar'], properties:{word:{type:'string'}, py:{type:'string'}, ar:{type:'string'}, note:{type:'string'}}};
  async function aiLookup(entry, btn){
    const box = pop.querySelector('.lk-ai');
    if(typeof aiReady === 'function' && !aiReady()){ box.innerHTML = '<p class="lk-note">البحث يحتاج المعلّم الذكي — فعّله من ⚙ ← المعلّم الذكي.</p>'; return; }
    btn.disabled = true; btn.textContent = '⏳ أبحث…';
    try{
      const r = await aiCall('ما معنى «' + entry.hz + '»' + (entry.ctx ? ' في النص: ' + entry.ctx : '') + '؟', {
        system: 'أنت قاموس صيني-عربي دقيق لطالب مبتدئ. حدّد الكلمة الصينية الكاملة التي يقع فيها الحرف المسؤول عنه داخل النص (قد تكون حرفًا أو أكثر). word = الكلمة بالحروف المبسّطة، py = البينيين بعلامات النغمة، ar = المعنى بالعربية في كلمات قليلة، note = مثال قصير أو ملاحظة (اختياري). أعد JSON فقط.',
        turns: [], noRole: true, schema: LK_SCHEMA, temp: 0.1, max: 600});
      const d = JSON.parse(r.text);
      pop.querySelector('.lk-hz').textContent = d.word || entry.hz;
      box.innerHTML = `<div class="lk-py" dir="ltr">${e(d.py||'')}</div><div class="lk-ar">${e(d.ar||'')}</div>${d.note ? `<p class="lk-note">${e(d.note)}</p>` : ''}
        <button class="lk-add" data-hz="${e(d.word||entry.hz)}">＋ أضفها إلى كلماتي</button>`;
      pop.querySelector('.lk-note').remove();
      btn.remove();
      const add = box.querySelector('.lk-add');
      add.onclick = () => { close(); openTutorPanel && openTutorPanel(); if(typeof myWordAdd === 'function') myWordAdd(add.dataset.hz); };
    }catch(err){ btn.disabled = false; btn.textContent = '🔎 ابحث عن المعنى'; box.innerHTML = '<p class="lk-note">' + e((typeof AI_ERRS !== 'undefined' && AI_ERRS[err.code]) || 'تعذّر البحث الآن') + '</p>'; }
  }
  window.lookupWord = (hz, x, y) => show(dict().get(hz) || {hz, unknown: true}, x ?? innerWidth/2, y ?? innerHeight/3);

  function lookupAt(x, y){
    const sel = selectionWord();
    if(sel){ show(sel, x, y); return true; }
    const hit = textUnder(x, y); if(!hit) return false;
    const w = wordAt(hit.text, hit.i);
    if(w.unknown) w.ctx = hit.text.slice(Math.max(0, hit.i - 12), hit.i + 12);
    show(w, x, y); return true;
  }

  // كلك يمين (وفي أندرويد: الضغط المطوّل يُطلق نفس الحدث)
  document.addEventListener('contextmenu', ev => {
    if(ev.target.closest('input, textarea, select, .lk-pop')) return;
    if(lookupAt(ev.clientX, ev.clientY)){ ev.preventDefault(); try{ window.getSelection().removeAllRanges(); }catch(_){} }
  });
  // آيفون لا يُطلق contextmenu: ضغطة مطوّلة يدوية
  let lp = null;
  document.addEventListener('touchstart', ev => {
    if(ev.touches.length !== 1 || ev.target.closest('input, textarea, select, .lk-pop')) return;
    const t = ev.touches[0];
    lp = {x: t.clientX, y: t.clientY, timer: setTimeout(() => { if(lp && lookupAt(lp.x, lp.y)){ lp.fired = true; if(navigator.vibrate) navigator.vibrate(15); } }, 550)};
  }, {passive: true});
  const cancel = () => { if(lp){ clearTimeout(lp.timer); } };
  document.addEventListener('touchmove', ev => { if(lp){ const t = ev.touches[0]; if(Math.hypot(t.clientX-lp.x, t.clientY-lp.y) > 10) cancel(); } }, {passive: true});
  document.addEventListener('touchend', ev => { cancel(); if(lp && lp.fired){ ev.preventDefault(); } lp = null; });
  document.addEventListener('touchcancel', () => { cancel(); lp = null; });
  // الإغلاق
  document.addEventListener('pointerdown', ev => { if(!pop.hidden && !ev.target.closest('.lk-pop')) close(); }, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') close(); });
  window.addEventListener('scroll', close, true);
  window.addEventListener('resize', close);
  // إعادة بناء الفهرس عند تغيّر الدروس أو «كلماتي»
  const rebuild = () => { DICT = null; };
  ['tagLessons','installPack','restoreLessons'].forEach(n => { const f = window[n]; if(typeof f === 'function') window[n] = function(){ rebuild(); return f.apply(this, arguments); }; });
  const baseSave = save; save = function(){ if(DICT && (state.myWords||[]).length !== DICT._mine){ rebuild(); } return baseSave.apply(this, arguments); };

  // تلميح لمرة واحدة
  if(!state.set.lkHint){
    setTimeout(() => { toast('💡 جديد: كلك يمين (أو اضغط مطوّلًا) على أي كلمة صينية لترى معناها'); state.set.lkHint = 1; save(); }, 2500);
  }
})();
