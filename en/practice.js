/* تمرين الإملاء والاستماع + المراجعة الأسبوعية الذكية */
(function(){
  'use strict';
  const e = s => (typeof esc === 'function' ? esc(s) : String(s));
  const shuf = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const stripTone = s => String(s||'').toLowerCase().replace(/u:/g,'v').replace(/[üǖǘǚǜ]/g,'v').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zv]/g,'');
  const toneMarks = s => { // يقبل الأرقام: ni3 hao3 ← nǐ hǎo
    const M = {a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù',v:'ǖǘǚǜ'};
    return String(s||'').toLowerCase().replace(/u:/g,'v').replace(/ü/g,'v').replace(/([a-zv]+)([1-5])/g,(m,syl,t)=>{
      if(t==='5') return syl.replace(/v/g,'ü');
      const i = /a/.test(syl) ? syl.indexOf('a') : /e/.test(syl) ? syl.indexOf('e') : /ou/.test(syl) ? syl.indexOf('o') : Math.max(...['a','e','i','o','u','v'].map(v=>syl.lastIndexOf(v)));
      const ch = syl[i]; return (syl.slice(0,i) + M[ch][t-1] + syl.slice(i+1)).replace(/v/g,'ü');
    });
  };
  const normPy = s => toneMarks(s).normalize('NFC').toLowerCase().replace(/[^a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g,'');

  /* ================= الإملاء والاستماع ================= */
  const md = document.createElement('div'); md.className = 'modal'; md.id = 'mdDict';
  md.innerHTML = "<div class=\"sheet dict-sheet\"><h3><span>🎧 Dictation and listening</span><button class=\"btn o sm\" data-close>Close ✕</button></h3><div id=\"dictBody\"></div></div>";
  document.body.appendChild(md);
  md.querySelector('[data-close]').onclick = () => { stopChineseAudio(); closeModal('mdDict'); };
  let D = null;
  function sentences(){ return Object.keys(S).filter(k => S[k].t.length >= 2 && S[k].t.length <= 8); }
  function dictStart(mode){
    const items = [];
    if(mode === 'order'){ shuf(sentences()).slice(0, 8).forEach(k => items.push({t:'order', k})); }
    else if(mode === 'pinyin'){ shuf(W).slice(0, 10).forEach(w => items.push({t:'pinyin', w})); }
    else { shuf(sentences()).slice(0, 8).forEach(k => items.push({t:'mean', k})); }
    D = {mode, items, i:0, score:0, pick:[], done:false, typed:''};
    if(!items.length){ toast("There are not enough sentences in this lesson"); return; }
    dictPaint(); dictPlay();
  }
  function dictPlay(slow){
    const it = D.items[D.i]; const text = it.t==='pinyin' ? speakHz(it.w) : sentHz(it.k);
    playText(text, 'zh', slow ? 0.65 : (Number(state.set.rate)||0.9));
  }
  function dictHome(){
    const h = (state.dict || {})[L.id] || [];
    document.getElementById('dictBody').innerHTML = `\n      <p class=\"sml muted\" style=\"margin:0 0 10px\">Train your ear on words and sentences «${e(L.title)}». Only sound - no letters in front of you.</p>\n      <button class=\"btn wide dict-mode\" data-m=\"order\">🧩 Arrange what you hear<small>You hear a sentence, and you arrange its letters in the correct order</small></button>\n      <button class=\"btn o wide dict-mode\" data-m=\"pinyin\">⌨️ Write pinyin<small>You hear a word and write down its pronunciation (such as ni3 hao3 or ni hao)</small></button>\n      <button class=\"btn o wide dict-mode\" data-m=\"mean\">👂 What did you hear?<small>You hear a sentence and choose its meaning in English</small></button>\n      ${h.length ? `<p class=\"sml muted\" style=\"margin:10px 0 0\">Your latest results: ${h.slice(0,5).map(x=>x.s+'/'+x.t).join(' · ')}</p>` : ''}`;
    document.querySelectorAll('#dictBody [data-m]').forEach(b => b.onclick = () => dictStart(b.dataset.m));
  }
  window.openDictation = () => { openModal('mdDict'); dictHome(); };
  function dictPaint(){
    const it = D.items[D.i], body = document.getElementById('dictBody');
    const head = `<div class="dict-head"><span>${D.i+1} / ${D.items.length}</span><span>✓ ${D.score}</span></div>\n      <div class=\"row eq\" style=\"margin-bottom:10px\"><button class=\"btn\" id=\"dPlay\">🔊 Listen</button><button class=\"btn o\" id=\"dSlow\">🐢 Slowly</button></div>`;
    let main = '', reveal = '';
    if(D.done){
      const text = it.t==='pinyin' ? speakHz(it.w) : sentHz(it.k);
      const py = it.t==='pinyin' ? wordPy(it.w) : S[it.k].t.map(t=>t[1]).join(' ');
      const ar = it.t==='pinyin' ? it.w.m : S[it.k].ar;
      reveal = `<div class="note ${D.ok?'g':'r'}"><b>${D.ok?"✓ True":"✗ Not quite"}</b><span class="hz" style="font-size:26px">${e(text)}</span><br><span dir="ltr">${e(py)}</span><br>${e(ar)}${D.extra||''}</div>`;
    }
    if(it.t === 'order'){
      const toks = S[it.k].t;
      D.pool = D.pool || shuf(toks.map((_,i)=>i));
      main = `<div class="dict-slot">${D.pick.map(i=>`<span class="tok"><span class="hz">${e(toks[i][0])}</span></span>`).join('') || "<span class=\"sml muted\">Click the letters in the order you heard them</span>"}</div>
        <div class="dict-pool">${D.pool.map(i=>`<button class="tok" data-i="${i}" ${D.pick.includes(i)||D.done?'disabled':''}><span class="hz">${e(toks[i][0])}</span></button>`).join('')}</div>
        ${D.done?'':`<div class=\"row eq\"><button class=\"btn o sm\" id=\"dUndo\">↶ Retreat</button><button class=\"btn sm\" id=\"dCheck\" ${D.pick.length<toks.length?'disabled':''}>Check</button></div>`}`;
    } else if(it.t === 'pinyin'){
      main = `<input id=\"dIn\" dir=\"ltr\" autocomplete=\"off\" autocapitalize=\"off\" spellcheck=\"false\" placeholder=\"Example: ni3 hao3 or ni hao\" value=\"${e(D.typed)}" ${D.done?'disabled':''} class="dict-in">
        ${D.done?'':"<button class=\"btn wide\" id=\"dCheck\">Check</button>"}`;
    } else {
      D.opts = D.opts || shuf([it.k].concat(shuf(Object.keys(S).filter(k=>k!==it.k && S[k].ar!==S[it.k].ar)).slice(0,3)));
      main = `<div class="dict-mean">${D.opts.map(k=>`<button class="btn o wide ${D.done?(k===it.k?'g':(D.choice===k?'r':'')):''}" data-k="${k}" ${D.done?'disabled':''}>${e(S[k].ar)}</button>`).join('')}</div>`;
    }
    const foot = D.done ? `<button class="btn wide" id="dNext">${D.i+1<D.items.length?"Next ←":"The result"}</button>` : '';
    body.innerHTML = head + main + reveal + foot;
    body.querySelector('#dPlay').onclick = () => dictPlay(false);
    body.querySelector('#dSlow').onclick = () => dictPlay(true);
    body.querySelectorAll('.dict-pool [data-i]').forEach(b => b.onclick = () => { D.pick.push(Number(b.dataset.i)); speak(S[it.k].t[Number(b.dataset.i)][0]); dictPaint(); });
    const undo = body.querySelector('#dUndo'); if(undo) undo.onclick = () => { D.pick.pop(); dictPaint(); };
    body.querySelectorAll('.dict-mean [data-k]').forEach(b => b.onclick = () => { D.choice = b.dataset.k; finishItem(D.choice === it.k); });
    const ck = body.querySelector('#dCheck'); if(ck) ck.onclick = () => {
      if(it.t === 'order'){ const toks = S[it.k].t; finishItem(D.pick.map(i=>toks[i][0]).join('') === toks.map(t=>t[0]).join('')); }
      else {
        D.typed = body.querySelector('#dIn').value;
        const want = wordPy(it.w), okBase = stripTone(D.typed) === stripTone(want), okTone = normPy(D.typed) === normPy(want);
        D.extra = okBase && !okTone && /[1-5āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(toneMarks(D.typed)) ? "<br><small>The letters are correct, but check the tones.</small>" : (okBase && !okTone ? "<br><small>True! Next time try writing the notes in numbers (such as ni3).</small>" : '');
        finishItem(okBase);
        if(typeof grade === 'function') grade(it.w, okBase);
      }
    };
    const inp = body.querySelector('#dIn'); if(inp && !D.done){ inp.focus(); inp.onkeydown = ev => { if(ev.key==='Enter') body.querySelector('#dCheck').click(); }; }
    const nx = body.querySelector('#dNext'); if(nx) nx.onclick = () => {
      D.i++; D.pick = []; D.pool = null; D.opts = null; D.done = false; D.ok = false; D.typed = ''; D.extra = ''; D.choice = null;
      if(D.i >= D.items.length) return dictResult();
      dictPaint(); dictPlay();
    };
  }
  function finishItem(ok){
    D.done = true; D.ok = ok; if(ok) D.score++;
    const it = D.items[D.i];
    if(it.k && !ok && typeof addMistake === 'function') addMistake('sent', L.id + '|' + it.k);
    touchStreak && touchStreak(); dictPaint();
    if(it.k) playText(sentHz(it.k), 'zh', Number(state.set.rate)||0.9);
  }
  function dictResult(){
    state.dict = state.dict || {}; (state.dict[L.id] = state.dict[L.id] || []).unshift({s:D.score, t:D.items.length, m:D.mode, at:Date.now()});
    state.dict[L.id] = state.dict[L.id].slice(0, 10); save();
    const pct = Math.round(D.score / D.items.length * 100);
    document.getElementById('dictBody').innerHTML = `<div class="note ${pct>=70?'g':'b'}" style="text-align:center"><div style="font-size:42px;font-weight:800">${D.score}/${D.items.length}</div>
      ${pct>=90?"Your ear is excellent 👂🎉":pct>=70?"Very good — keep going":"Repeat the exercise; Listening improves with repetition"}</div>\n      <div class=\"row eq\"><button class=\"btn o\" id=\"dHome\">Exercises</button><button class=\"btn\" id=\"dAgain\">again</button></div>`;
    document.getElementById('dHome').onclick = dictHome;
    document.getElementById('dAgain').onclick = () => dictStart(D.mode);
  }

  /* ================= المراجعة الأسبوعية ================= */
  const WEEK = 7 * 86400000;
  function allWords(){ return LESSONS.filter(l=>l.id!=='LX').flatMap(l=>l.words); }
  function weekStats(){
    const now = Date.now(), since = now - WEEK;
    const days = Object.keys(state.daily || {}).filter(d => new Date(d).getTime() >= since - 86400000);
    const studied = new Set(days.flatMap(d => (state.daily[d].words || [])));
    const words = allWords();
    const known = new Set(words.filter(w=>status(w)==='known').map(wordHz)).size;
    const weak = words.filter(w => ws(wkey(w)).bad > 0).sort((a,b) => ws(wkey(b)).bad - ws(wkey(a)).bad).slice(0, 6);
    const pron = (state.pronLog || []).filter(x => x.at >= since);
    const pronAvg = pron.length ? Math.round(pron.reduce((a,x)=>a+x.s,0)/pron.length) : null;
    const pronLow = pron.slice().sort((a,b)=>a.s-b.s).filter((x,i,arr)=>arr.findIndex(y=>y.hz===x.hz)===i).slice(0,3);
    const exams = (state.hsk || []).filter(x => x.at >= since);
    const bestExam = exams.length ? Math.max(...exams.map(x=>x.total)) : null;
    const prev = (state.weekly || {}).snap;
    return {days: days.length, studied: studied.size, known, knownDelta: prev ? known - prev.known : null, weak, pronAvg, pronN: pron.length, pronLow, bestExam, examN: exams.length, due: words.filter(isDue).length};
  }
  const wkMd = document.createElement('div'); wkMd.className = 'modal'; wkMd.id = 'mdWeek';
  wkMd.innerHTML = "<div class=\"sheet\"><h3><span>🗓 Your weekly review</span><button class=\"btn o sm\" data-close>Close ✕</button></h3><div id=\"weekBody\"></div></div>";
  document.body.appendChild(wkMd);
  wkMd.querySelector('[data-close]').onclick = () => closeModal('mdWeek');
  function weekOpen(){
    const s = weekStats();
    document.getElementById('weekBody').innerHTML = `
      <div class="wk-grid">
        <div><b>${s.days}/7</b><span>Study days</span></div>\n        <div><b>${s.studied}</b><span>A word I reviewed</span></div>\n        <div><b>${s.known}${s.knownDelta!=null?` <small class="${s.knownDelta>=0?'up':'down'}">${s.knownDelta>=0?'+':''}${s.knownDelta}</small>`:''}</b><span>A preserved word</span></div>\n        <div><b>${s.pronAvg!=null?s.pronAvg:'—'}</b><span>Your average pronunciation${s.pronN?` (${s.pronN})`:''}</span></div>
        <div><b>${s.bestExam!=null?s.bestExam:'—'}</b><span>The best HSK exam</span></div>\n        <div><b>${s.due}</b><span>Due for review</span></div>\n      </div>\n      ${s.weak.length ? `<h4 class=\"wk-h\">The words you get wrong the most</h4><div class=\"wk-weak\">${s.weak.map(w=>`<button class="chip" onclick="closeModal('mdWeek');openWord('${wkey(w)}')"><span class="hz">${e(wordHz(w))}</span>${e(w.m.split(' /')[0])} <small>✗${ws(wkey(w)).bad}</small></button>`).join('')}</div>` : "<p class=\"sml muted\">No errors reported — excellent!</p>"}
      ${s.pronLow.length ? `<h4 class=\"wk-h\">Pronunciation needs improvement</h4><div class=\"wk-weak\">${s.pronLow.map(x=>`<button class="chip" data-pron="${e(x.hz)}"><span class="hz">${e(x.hz)}</span>${x.s}/100</button>`).join('')}</div>` : ''}\n      <div id=\"weekAi\"></div>\n      <button class=\"btn wide\" id=\"wkGo\" style=\"margin-top:10px\">▶ Start the review session (15 questions from all lessons)</button>\n      <div class=\"row eq\" style=\"margin-top:8px\"><button class=\"btn o sm\" id=\"wkAi\">🧑‍🏫 Teacher’s report and plan for the week</button><button class=\"btn o sm\" id=\"wkExam\">📝 HSK exam</button></div>`;
    openModal('mdWeek');
    document.getElementById('wkGo').onclick = () => {
      state.weekly = {last: Date.now(), snap: {known: s.known, at: Date.now()}}; save();
      closeModal('mdWeek'); go('quiz'); quizStart(15, true); paintWeekCard();
    };
    document.getElementById('wkExam').onclick = () => { closeModal('mdWeek'); openHskExam && openHskExam(); };
    document.getElementById('wkAi').onclick = async () => {
      const box = document.getElementById('weekAi');
      if(typeof aiReady === 'function' && !aiReady()){ box.innerHTML = "<div class=\"note\">The report needs a smart teacher. <button class=\"btn sm\" onclick=\"closeModal('mdWeek');openModal('mdAI')\">🤖 Activate</button></div>"; return; }
      box.innerHTML = "<div class=\"note b\">⏳ The teacher writes your report...</div>";
      const facts = `Study days this week: ${s.days}/7. Words reviewed: ${s.studied}. Reserved: ${s.known}${s.knownDelta!=null?" (Change "+s.knownDelta+')':''}. Due: ${s.due}. `
        + `Most incorrect words: ${s.weak.map(w=>wordHz(w)+' '+w.m+' ×'+ws(wkey(w)).bad).join('، ')||"Nothing"}. Average pronunciation: ${s.pronAvg??"He did not try"}. Weakest pronunciation: ${s.pronLow.map(x=>x.hz+' '+x.s).join('، ')||'—'}. Best HSK Exam: ${s.bestExam??"He was not tested"}/200. `
        + `Lessons: ${LESSONS.filter(l=>l.id!=='LX').map(l=>l.title).join(' | ')}.`;
      try{
        const r = await aiCall("Write my weekly report", {system: "You are a Chinese teacher who encourages an English-speaking student. Write a short weekly report in English without Markdown: 1) what you improved on (honestly from numbers), 2) your top 2 weaknesses with a Chinese example in pinyin for each one, 3) a plan for the coming week with 4 short daily steps. Do not exceed 140 words. Data: " + facts, turns: [], noRole: true, max: 1500});
        box.innerHTML = '<div class="note g wk-ai">' + chatFmt(r.text.replace(/\n\s*\n+/g,'\n').trim()) + '</div>';
      }catch(err){ box.innerHTML = '<div class="note r">' + e((AI_ERRS && AI_ERRS[err.code]) || "Unable to report now") + '</div>'; }
    };
  }
  window.openWeekly = weekOpen;

  /* ================= بطاقات الدخول ================= */
  function paintWeekCard(){
    const t = document.getElementById('weekTile'); if(!t) return;
    const w = state.weekly || {}, dueWeek = !w.last || Date.now() - w.last >= WEEK;
    const seen = allWords().some(x => ws(wkey(x)).seen > 0);
    t.classList.toggle('due', dueWeek && seen);
    document.getElementById('weekTileTxt').textContent = dueWeek && seen ? "Its time has come!" : (w.last ? "The last one " + new Date(w.last).toLocaleDateString('ar',{day:'numeric', month:'short'}) : "Your report");
  }
  function paintQuizCard(){
    const q = document.getElementById('pg-quiz'); if(!q || q.querySelector('.quiz-tiles')) return;
    const c = document.createElement('div'); c.className = 'tiles tiles3 quiz-tiles';
    c.innerHTML = `<button class=\"tile\" onclick=\"openDictation()\"><i>🎧</i><b>Dictation</b><small>Train your ear</small></button>\n      <button class=\"tile\" onclick=\"openHskExam()\"><i>📝</i><b>HSK exam</b><small>40 questions</small></button>\n      <button class=\"tile\" onclick=\"openWeekly()\"><i>🗓</i><b>Weekly</b><small>All lessons</small></button>`;
    q.prepend(c);
  }
  const basePaintHome = paintHome;
  paintHome = function(){ basePaintHome.apply(this, arguments); try{ paintWeekCard(); }catch(_){} };
  paintWeekCard(); paintQuizCard();
})();
