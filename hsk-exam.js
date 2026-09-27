/* محاكي امتحان HSK 1 — نفس أقسام الامتحان الرسمي:
   الاستماع ٢٠ سؤالًا (٤ أجزاء، كل تسجيل يُسمع مرتين) + القراءة ٢٠ سؤالًا (٤ أجزاء، ١٧ دقيقة).
   الدرجة من ٢٠٠ (١٠٠ لكل قسم) والنجاح من ١٢٠. */
(function(){
  'use strict';
  const B = window.HSK_BANK; if(!B) return;
  const LETTERS = ['A','B','C','D','E','F'];
  const PARTS = [
    {sec:'L', t:'l1', name:'الاستماع — الجزء ١', how:'استمع إلى الكلمة، وحدّد: هل الصورة مطابقة لما سمعت؟ ✓ أو ✗'},
    {sec:'L', t:'l2', name:'الاستماع — الجزء ٢', how:'استمع إلى الجملة، واختر الصورة المناسبة من الثلاث.'},
    {sec:'L', t:'l3', name:'الاستماع — الجزء ٣', how:'استمع إلى الحوار، واختر الصورة المناسبة له من A إلى F.'},
    {sec:'L', t:'l4', name:'الاستماع — الجزء ٤', how:'استمع إلى الجملة ثم إلى السؤال، واختر الإجابة الصحيحة.'},
    {sec:'R', t:'r1', name:'القراءة — الجزء ١', how:'هل الكلمة مطابقة للصورة؟ ✓ أو ✗'},
    {sec:'R', t:'r2', name:'القراءة — الجزء ٢', how:'اختر الصورة المناسبة لكل جملة من A إلى F.'},
    {sec:'R', t:'r3', name:'القراءة — الجزء ٣', how:'اختر الجواب المناسب لكل سؤال من A إلى F.'},
    {sec:'R', t:'r4', name:'القراءة — الجزء ٤', how:'اختر الكلمة المناسبة للفراغ من A إلى F.'}
  ];
  const READ_SECONDS = 17 * 60, ANSWER_GAP = 9;
  const shuf = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const pick = (a, n) => shuf(a).slice(0, n);
  const e = s => (typeof esc === 'function' ? esc(s) : String(s));
  const ruby = arr => '<span class="hx-zh" dir="ltr">' + arr.map(([c,p]) => c==='___' ? '<span class="hx-blank">（　　）</span>' : (p ? `<ruby>${e(c)}<rt>${e(p)}</rt></ruby>` : e(c))).join('') + '</span>';
  const pyLine = arr => arr.map(x=>x[1]).filter(Boolean).join(' ');

  /* ---------- بناء امتحان عشوائي ---------- */
  function build(){
    const qs = [];
    // صور مختلفة الرموز
    const picPool = shuf(B.pic);
    const l1 = picPool.slice(0,5), r1 = picPool.slice(5,10);
    const judge = (t, list) => list.forEach(p => {
      const ok = Math.random() < 0.5;
      const other = pick(B.pic.filter(x=>x.e!==p.e), 1)[0];
      qs.push({t, p, show: ok ? p.e : other.e, ans: ok});
    });
    judge('l1', l1);
    pick(B.l2, 5).forEach(it => { const o = shuf(it.opts); qs.push({t:'l2', it, opts:o, ans:o.indexOf(it.opts[0])}); });
    // الجزء ٣: خمسة حوارات بصور مختلفة + صورة زائدة
    const l3 = []; for(const d of shuf(B.l3)){ if(l3.length<5 && !l3.some(x=>x.e===d.e)) l3.push(d); }
    const extra3 = pick(B.pic.filter(p=>!l3.some(d=>d.e===p.e)), 1)[0].e;
    const l3opts = shuf(l3.map(d=>d.e).concat(extra3));
    l3.forEach(it => qs.push({t:'l3', it, opts:l3opts, ans:l3opts.indexOf(it.e)}));
    pick(B.l4, 5).forEach(it => { const o = shuf(it.opts); qs.push({t:'l4', it, opts:o, ans:o.indexOf(it.opts[0])}); });
    judge('r1', r1);
    const r2 = []; for(const d of shuf(B.r2)){ if(r2.length<5 && !r2.some(x=>x.e===d.e)) r2.push(d); }
    const extra2 = pick(B.pic.filter(p=>!r2.some(d=>d.e===p.e)), 1)[0].e;
    const r2opts = shuf(r2.map(d=>d.e).concat(extra2));
    r2.forEach(it => qs.push({t:'r2', it, opts:r2opts, ans:r2opts.indexOf(it.e)}));
    const r3 = pick(B.r3, 6), r3opts = shuf(r3.map(x=>x));
    r3.slice(0,5).forEach(it => qs.push({t:'r3', it, opts:r3opts, ans:r3opts.indexOf(it)}));
    // الجزء ٤: لا نجمع كلمتين تصلحان لنفس الفراغ
    let r4 = [];
    for(let tries=0; tries<50; tries++){
      r4 = pick(B.r4, 5);
      const words = r4.map(x=>x.ans);
      if(r4.every(x => !x.alt.some(a => words.includes(a)))) break;
    }
    const used = r4.map(x=>x.ans);
    const extra4 = shuf(B.r4.filter(x => !used.includes(x.ans) && !r4.some(y=>y.alt.includes(x.ans))))[0];
    const r4opts = shuf(r4.concat(extra4 ? [extra4] : []).map(x=>({w:x.ans, py:x.anspy})));
    r4.forEach(it => qs.push({t:'r4', it, opts:r4opts, ans:r4opts.findIndex(o=>o.w===it.ans)}));
    return qs;
  }

  /* ---------- الحالة ---------- */
  let X = null; // {mode, qs, answers, i, phase, readLeft, timer, audio, playing}
  const root = document.createElement('div');
  root.id = 'hskExam'; root.className = 'hx'; root.hidden = true; root.dir = 'rtl';
  root.setAttribute('role','dialog'); root.setAttribute('aria-label','محاكي امتحان HSK 1');
  document.body.appendChild(root);

  function history(){ return Array.isArray(state.hsk) ? state.hsk : (state.hsk = []); }

  /* ---------- الصوت ---------- */
  let player = null, playToken = 0;
  function stopAudio(){ playToken++; if(player){ player.pause(); player = null; } if('speechSynthesis' in window) speechSynthesis.cancel(); }
  function playOne(id, text, token){
    return new Promise(res => {
      if(token !== playToken) return res();
      const a = new Audio('audio/exam/' + id + '.mp3'); player = a;
      const fallback = () => {
        if(token !== playToken || !('speechSynthesis' in window)) return res();
        const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; u.rate = 0.85;
        u.onend = u.onerror = () => res(); try{ speechSynthesis.speak(u); }catch(_){ res(); }
      };
      a.onended = () => res(); a.onerror = fallback;
      a.play().catch(fallback);
    });
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function clips(q){
    if(q.t==='l1') return [[q.p.au, q.p.w]];
    if(q.t==='l2') return [[q.it.au, q.it.s]];
    if(q.t==='l3') return q.it.d.map(l => [l.au, l.s]);
    if(q.t==='l4') return [[q.it.au[0], q.it.s], [q.it.au[1], q.it.q]];
    return [];
  }
  async function playQ(q, times){
    stopAudio(); const token = playToken;
    setPlaying(true);
    for(let n=0; n<times; n++){
      for(const [id, text] of clips(q)){ await playOne(id, text, token); if(token!==playToken) return; await wait(450); }
      if(n < times-1) await wait(1400);
    }
    if(token === playToken) setPlaying(false);
    return token === playToken;
  }
  function setPlaying(on){ const b = root.querySelector('.hx-play'); if(b){ b.classList.toggle('on', on); b.textContent = on ? '🔊 يُشغَّل الآن…' : '🔊 استمع مرة أخرى'; } }

  /* ---------- الواجهة ---------- */
  function open(){ root.hidden = false; document.body.classList.add('hx-lock'); home(); }
  function close(){
    if(X && X.phase !== 'done' && !confirm('تخرج من الامتحان؟ لن تُحفظ هذه المحاولة.')) return;
    stopAudio(); clearInterval(X && X.timer); clearTimeout(X && X.auto); X = null;
    root.hidden = true; document.body.classList.remove('hx-lock');
  }
  window.openHskExam = open;

  function shell(title, sub, body, foot){
    root.innerHTML = `<div class="hx-top"><div><b>HSK 1 · ${e(title)}</b><small>${sub||''}</small></div><div class="hx-top-r"><span id="hxClock"></span><button class="hx-x" aria-label="إغلاق">✕</button></div></div>
      <div class="hx-body">${body}</div>${foot ? `<div class="hx-foot">${foot}</div>` : ''}`;
    root.querySelector('.hx-x').onclick = close;
  }

  function home(){
    stopAudio();
    const h = history();
    const best = h.length ? Math.max(...h.map(x=>x.total)) : null;
    shell('محاكي الامتحان', 'نفس أقسام الامتحان الرسمي', `
      <div class="hx-card hx-hero"><h2>📝 امتحان HSK 1 تجريبي</h2>
        <p>٤٠ سؤالًا مثل الامتحان الحقيقي، بأسئلة جديدة في كل مرة:</p>
        <div class="hx-grid2"><div><b>🎧 الاستماع</b><br>٢٠ سؤالًا · ٤ أجزاء<br>كل تسجيل يُسمع مرتين<br>١٠٠ درجة</div>
        <div><b>📖 القراءة</b><br>٢٠ سؤالًا · ٤ أجزاء<br>١٧ دقيقة<br>١٠٠ درجة</div></div>
        <p class="hx-note">الدرجة الكلية ٢٠٠، و<b>النجاح من ١٢٠</b>. البينيين مكتوب فوق الحروف كما في ورقة الامتحان.</p></div>
      <div class="hx-card"><h3>اختر الوضع</h3>
        <button class="hx-btn hx-main" data-m="exam">⏱ امتحان حقيقي<small>وقت محدد، التسجيل مرتين فقط، والنتيجة في النهاية</small></button>
        <button class="hx-btn" data-m="practice">🧑‍🏫 وضع التدريب<small>بلا وقت، تسمع كما تشاء، وترى التصحيح والترجمة بعد كل سؤال</small></button></div>
      ${h.length ? `<div class="hx-card"><h3>محاولاتك السابقة ${best!=null?`<span class="hx-pill">أفضل درجة: ${best}/200</span>`:''}</h3>
        ${h.slice(0,6).map(x=>`<div class="hx-hist"><span>${new Date(x.at).toLocaleDateString('ar',{day:'numeric',month:'short'})} · ${x.mode==='exam'?'امتحان':'تدريب'}</span><span>🎧 ${x.l} · 📖 ${x.r}</span><b class="${x.total>=120?'ok':'no'}">${x.total}/200</b></div>`).join('')}</div>` : ''}`);
    root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => start(b.dataset.m));
  }

  function start(mode){
    X = {mode, qs: build(), answers: Array(40).fill(null), checked: Array(40).fill(false), i: 0, phase: 'L', readLeft: READ_SECONDS, timer: null, auto: null};
    touchStreak && touchStreak();
    partIntro(0);
  }

  function partOf(i){ return PARTS[Math.floor(i/5)]; }
  function partIntro(i){
    const p = partOf(i);
    if(i % 5 !== 0 || X.mode === 'practice'){ return show(i); }
    shell(p.name, `الأسئلة ${i+1}–${i+5}`, `<div class="hx-card hx-intro"><div class="hx-big">${p.sec==='L'?'🎧':'📖'}</div><h2>${e(p.name)}</h2><p>${e(p.how)}</p>
      ${i===20?'<p class="hx-note">بدأ وقت القراءة: ١٧ دقيقة لكل الأسئلة من ٢١ إلى ٤٠، وتقدر تتنقّل بينها بحرية.</p>':''}</div>`,
      `<button class="hx-btn hx-main" id="hxGo">ابدأ ←</button>`);
    root.querySelector('#hxGo').onclick = () => { if(i===20) startReading(); show(i); };
  }

  function startReading(){
    X.phase = 'R'; clearInterval(X.timer);
    if(X.mode !== 'exam') return;
    X.timer = setInterval(() => {
      X.readLeft--; paintClock();
      if(X.readLeft <= 0){ clearInterval(X.timer); toast('انتهى الوقت — تم تسليم الامتحان'); finish(); }
    }, 1000);
  }
  function paintClock(){
    const c = root.querySelector('#hxClock'); if(!c || !X) return;
    if(X.mode === 'exam' && X.phase === 'R'){ const m = Math.floor(X.readLeft/60), s = X.readLeft%60; c.textContent = '⏱ ' + m + ':' + String(s).padStart(2,'0'); c.classList.toggle('warn', X.readLeft < 120); }
    else c.textContent = '';
  }

  function qBody(q, i){
    const a = X.answers[i], lock = X.mode==='practice' && X.checked[i];
    const judgeBtns = () => `<div class="hx-judge">${[true,false].map(v=>`<button class="hx-opt ${a===v?'sel':''} ${lock?(v===q.ans?'right':(a===v?'wrong':'')):''}" data-v="${v}">${v?'✓ مطابقة':'✗ غير مطابقة'}</button>`).join('')}</div>`;
    const letterOpts = (render) => `<div class="hx-opts ${q.opts.length>3?'six':''}">${q.opts.map((o,k)=>`<button class="hx-opt ${a===k?'sel':''} ${lock?(k===q.ans?'right':(a===k?'wrong':'')):''}" data-v="${k}"><span class="hx-l">${LETTERS[k]}</span>${render(o)}</button>`).join('')}</div>`;
    const listenBtn = X.mode==='practice' ? `<button class="hx-btn hx-play">🔊 استمع</button>` : `<div class="hx-play hx-auto">🔊 يُشغَّل التسجيل مرتين…</div>`;
    switch(q.t){
      case 'l1': return `${listenBtn}<div class="hx-pic">${q.show}</div>${judgeBtns()}`;
      case 'l2': return `${listenBtn}${letterOpts(o=>`<span class="hx-emo">${o}</span>`)}`;
      case 'l3': return `${listenBtn}${letterOpts(o=>`<span class="hx-emo">${o}</span>`)}`;
      case 'l4': return `${listenBtn}${letterOpts(o=>`<span class="hx-txt">${ruby(o.py)}</span>`)}`;
      case 'r1': return `<div class="hx-pic">${q.show}</div><div class="hx-word">${ruby(q.p.py)}</div>${judgeBtns()}`;
      case 'r2': return `<div class="hx-sent">${ruby(q.it.py)}</div>${letterOpts(o=>`<span class="hx-emo">${o}</span>`)}`;
      case 'r3': return `<div class="hx-sent">${ruby(q.it.qpy)}</div>${letterOpts(o=>`<span class="hx-txt">${ruby(o.apy)}</span>`)}`;
      case 'r4': return `<div class="hx-sent">${ruby(q.it.py)}</div>${letterOpts(o=>`<span class="hx-txt">${ruby(o.py)}</span>`)}`;
    }
  }
  function explain(q){
    const ok = isRight(q, X.answers[X.qs.indexOf(q)]);
    let t = '';
    if(q.t==='l1'||q.t==='r1') t = `${ruby(q.p.py)} = ${e(q.p.ar)} ${q.p.e}`;
    else if(q.t==='l2') t = `${ruby(q.it.py)}<br>${e(q.it.ar)}`;
    else if(q.t==='l3') t = q.it.d.map(l=>`${l.who==='F'?'👩':'👨'} ${ruby(l.py)}`).join('<br>') + `<br>${e(q.it.ar)}`;
    else if(q.t==='l4') t = `${ruby(q.it.spy)}<br>❓ ${ruby(q.it.qpy)}<br>${e(q.it.ar)}`;
    else if(q.t==='r2') t = `${e(q.it.ar)} ${q.it.e}`;
    else if(q.t==='r3') t = `${ruby(q.it.apy)}<br>${e(q.it.ar)}`;
    else if(q.t==='r4') t = `الكلمة: ${ruby(q.it.anspy)}<br>${e(q.it.ar)}`;
    return `<div class="hx-exp ${ok?'ok':'no'}"><b>${ok?'✓ إجابة صحيحة':'✗ الإجابة الصحيحة: '+correctLabel(q)}</b><div>${t}</div></div>`;
  }
  function correctLabel(q){ return (q.t==='l1'||q.t==='r1') ? (q.ans?'✓ مطابقة':'✗ غير مطابقة') : LETTERS[q.ans]; }
  function isRight(q, a){ return a !== null && a === q.ans; }

  function show(i){
    clearTimeout(X.auto); X.i = i;
    const q = X.qs[i], p = partOf(i), isL = p.sec === 'L';
    const palette = (!isL || X.mode==='practice') ? `<div class="hx-pal">${X.qs.map((_,k)=>{ const inSec = X.mode==='practice' || k>=20; return inSec ? `<button class="${k===i?'cur':''} ${X.answers[k]!==null?'done':''}" data-k="${k}">${k+1}</button>` : ''; }).join('')}</div>` : '';
    const foot = X.mode==='practice'
      ? `<button class="hx-btn" id="hxPrev" ${i===0?'disabled':''}>→ السابق</button>${X.checked[i]?'':`<button class="hx-btn hx-main" id="hxCheck" ${X.answers[i]===null?'disabled':''}>تحقّق</button>`}<button class="hx-btn ${X.checked[i]?'hx-main':''}" id="hxNext">${i===39?'النتيجة':'التالي ←'}</button>`
      : isL ? `<span class="hx-cd" id="hxCd"></span><button class="hx-btn hx-main" id="hxNext">التالي ←</button>`
            : `<button class="hx-btn" id="hxPrev" ${i===20?'disabled':''}>→ السابق</button>${i===39?'':'<button class="hx-btn hx-main" id="hxNext">التالي ←</button>'}<button class="hx-btn hx-submit" id="hxSubmit">تسليم الامتحان</button>`;
    shell(p.name, `سؤال ${i+1} من ٤٠ · ${e(p.how)}`, `<div class="hx-card hx-q"><div class="hx-num">${i+1}</div>${qBody(q,i)}${X.mode==='practice'&&X.checked[i]?explain(q):''}</div>${palette}`, foot);
    paintClock();
    root.querySelectorAll('.hx-opt').forEach(b => b.onclick = () => {
      if(X.mode==='practice' && X.checked[i]) return;
      const v = b.dataset.v; X.answers[i] = (v==='true'||v==='false') ? v==='true' : Number(v);
      show(i);
    });
    root.querySelectorAll('.hx-pal [data-k]').forEach(b => b.onclick = () => { stopAudio(); show(Number(b.dataset.k)); });
    const pr = root.querySelector('#hxPrev'); if(pr) pr.onclick = () => { stopAudio(); show(i-1); };
    const nx = root.querySelector('#hxNext'); if(nx) nx.onclick = () => next(i);
    const ck = root.querySelector('#hxCheck'); if(ck) ck.onclick = () => { X.checked[i] = true; show(i); };
    const sb = root.querySelector('#hxSubmit'); if(sb) sb.onclick = () => {
      const empty = X.answers.slice(20).filter(a=>a===null).length;
      if(!confirm(empty ? `بقي ${empty} سؤالًا بلا إجابة. تسلّم الامتحان؟` : 'تسلّم الامتحان الآن؟')) return;
      finish();
    };
    const pl = root.querySelector('button.hx-play'); if(pl) pl.onclick = () => playQ(q, 1);
    // وضع الامتحان: الاستماع يُشغَّل مرتين تلقائيًا ثم ينتقل بعد مهلة الإجابة
    if(isL && X.mode==='exam' && !X.played?.[i]){
      X.played = X.played || {}; X.played[i] = true;
      playQ(q, 2).then(done => { if(!done || !X || X.i!==i) return; countdown(i, ANSWER_GAP); });
    } else if(isL && X.mode==='exam'){ const a = root.querySelector('.hx-auto'); if(a) a.textContent = '✓ انتهى التسجيل'; }
    if(isL && X.mode==='practice' && !X.checked[i] && !(X.heard||{})[i]){ X.heard = X.heard || {}; X.heard[i] = true; playQ(q, 1); }
  }
  function countdown(i, s){
    const cd = root.querySelector('#hxCd'); const a = root.querySelector('.hx-auto'); if(a) a.textContent = '✓ انتهى التسجيل — اختر إجابتك';
    if(cd) cd.textContent = 'السؤال التالي بعد ' + s + ' ث';
    if(s <= 0) return next(i);
    X.auto = setTimeout(() => { if(X && X.i===i) countdown(i, s-1); }, 1000);
  }
  function next(i){
    stopAudio(); clearTimeout(X.auto);
    if(i >= 39){ if(X.mode==='practice'){ finish(); } return; }
    const n = i + 1;
    if(n % 5 === 0) partIntro(n); else show(n);
  }

  function finish(){
    stopAudio(); clearInterval(X.timer); clearTimeout(X.auto);
    X.phase = 'done';
    const right = X.qs.map((q,k)=>isRight(q, X.answers[k]));
    const lc = right.slice(0,20).filter(Boolean).length, rc = right.slice(20).filter(Boolean).length;
    const l = lc*5, r = rc*5, total = l + r, pass = total >= 120;
    history().unshift({at: Date.now(), mode: X.mode, l, r, total});
    state.hsk = history().slice(0, 20); save();
    const parts = PARTS.map((p,k)=>({p, n: right.slice(k*5,k*5+5).filter(Boolean).length}));
    const weakest = parts.slice().sort((a,b)=>a.n-b.n)[0];
    shell('النتيجة', X.mode==='exam'?'امتحان حقيقي':'وضع التدريب', `
      <div class="hx-card hx-result ${pass?'ok':'no'}"><div class="hx-score">${total}<small>/200</small></div>
        <h2>${pass?'🎉 ناجح! مستوى HSK 1':'لم تصل للنجاح بعد — تحتاج ١٢٠'}</h2>
        <div class="hx-grid2"><div>🎧 الاستماع<br><b>${l}/100</b><br><small>${lc} من ٢٠</small></div><div>📖 القراءة<br><b>${r}/100</b><br><small>${rc} من ٢٠</small></div></div>
        <p class="hx-note">ركّز على: <b>${e(weakest.p.name)}</b> (${weakest.n} من ٥).</p></div>
      <div class="hx-card"><h3>الأجزاء</h3>${parts.map(x=>`<div class="hx-bar"><span>${e(x.p.name)}</span><i><u style="width:${x.n*20}%"></u></i><b>${x.n}/5</b></div>`).join('')}</div>
      <div class="hx-card"><h3>مراجعة الإجابات</h3>${X.qs.map((q,k)=>`<details class="hx-rev ${right[k]?'ok':'no'}"><summary><span>${right[k]?'✓':'✗'} ${k+1}. ${e(partOf(k).name)}</span>${q.t[0]==='l'?`<button class="hx-mini" data-p="${k}">🔊</button>`:''}</summary>
        <div>إجابتك: <b>${X.answers[k]===null?'—':((q.t==='l1'||q.t==='r1')?(X.answers[k]?'✓':'✗'):LETTERS[X.answers[k]])}</b> · الصحيحة: <b>${correctLabel(q)}</b></div>${explain(q)}</details>`).join('')}</div>`,
      `<button class="hx-btn" id="hxHome">القائمة</button><button class="hx-btn hx-main" id="hxAgain">امتحان جديد</button>`);
    root.querySelectorAll('[data-p]').forEach(b => b.onclick = ev => { ev.preventDefault(); playQ(X.qs[Number(b.dataset.p)], 1); });
    root.querySelector('#hxHome').onclick = () => { X = null; home(); };
    root.querySelector('#hxAgain').onclick = () => start(X.mode);
  }

  /* ---------- نقاط الدخول ---------- */
  function entryCard(){
    return `<div class="card hx-entry"><h2 class="sec"><b>📝</b> محاكي امتحان HSK 1</h2>
      <p class="sml muted" style="margin:0 0 8px">٤٠ سؤالًا بنفس أقسام الامتحان الرسمي: استماع وقراءة، ودرجة من ٢٠٠.</p>
      <button class="btn wide" onclick="openHskExam()">ابدأ الامتحان التجريبي</button></div>`;
  }
  function inject(){
    const quizPage = document.getElementById('pg-quiz');
    if(quizPage && !quizPage.querySelector('.hx-entry')) quizPage.insertAdjacentHTML('afterbegin', entryCard());
    const list = document.getElementById('lessonList');
    const homeCard = list && list.closest('.card');
    if(homeCard && !document.querySelector('#pg-home .hx-entry')) homeCard.insertAdjacentHTML('beforebegin', entryCard());
  }
  inject();
  root.addEventListener('keydown', ev => { if(ev.key==='Escape') close(); });
})();
