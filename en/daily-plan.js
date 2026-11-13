/* خطة اليوم: كلمات جديدة بعدد الهدف من أي درس لم تذاكره، ثم «أنهيت خطة اليوم» مع تشجيع */
(function(){
  'use strict';
  const $ = s => document.querySelector(s);
  const goal = () => Number(state.set.dailyGoal) || 5;
  const sfx = n => { try{ window.SFX && SFX.play(n); }catch(e){} };
  const say = (k, h) => { try{ window.tutorSay && tutorSay(k, h, {force: true, ms: 7000}); }catch(e){} };

  function plan(){ const p = state.plan; return p && p.day === today() ? p : null; }
  function studiedToday(){ return new Set(((state.daily || {})[today()] || {}).words || []); }
  function planWords(){ const p = plan(); return p ? p.keys.map(findWord).filter(Boolean) : []; }
  function progress(){
    const ws_ = planWords(), done = studiedToday();
    return {n: ws_.length, d: ws_.filter(w => done.has(wordHz(w))).length};
  }
  // كلمات جديدة فعلًا: لم تُذاكر في أي درس (نفس الحرف في درس آخر يُحسب مذاكَرًا)
  function candidates(exclude){
    const seenHz = new Set();
    const viewed = state.viewed || {};
    LESSONS.forEach(l => l.words.forEach(w => { if(status(w) !== 'new' || viewed[wkey(w)]) seenHz.add(wordHz(w)); }));
    exclude.forEach(k => { const w = findWord(k); if(w) seenHz.add(wordHz(w)); });
    const order = [L, ...LESSONS.filter(l => l !== L && l.id !== 'LX'), ...LESSONS.filter(l => l.id === 'LX' && l !== L)];
    const out = [], g = typeof curGroup === 'function' ? curGroup() : '';
    order.forEach(l => {
      let list = l.words;
      if(l === L && g) list = list.filter(w => String(w.g) === g).concat(list.filter(w => String(w.g) !== g));
      list.forEach(w => { const hz = wordHz(w); if(!seenHz.has(hz)){ seenHz.add(hz); out.push(w); } });
    });
    return out;
  }
  function makePlan(n, keep, avoid){
    const keys = (keep || []).slice();
    candidates(keys.concat(avoid || [])).slice(0, Math.max(0, n - keys.length)).forEach(w => keys.push(wkey(w)));
    state.plan = {day: today(), keys, done: false, goal: n};
    save(); return state.plan;
  }

  function preview(fresh){
    let p = plan();
    if(fresh || !p || !p.keys.length) p = makePlan(goal(), null, fresh ? (p ? p.keys : []) : []);
    if(!p.keys.length){ toast("🎉 I studied all the words in all the lessons! Check what is due or test yourself"); go('quiz'); return; }
    const ws_ = planWords();
    const old = document.querySelector('.dp-prev'); if(old) old.remove();
    const d = document.createElement('div'); d.className = 'cf-back dp-prev';
    d.innerHTML = "<div class=\"cf-box dp-box\" role=\"dialog\" aria-label=\"Today's plan\"><h3>📅 Today’s plan: " + ws_.length + " New words</h3>"
      + "<p class=\"sml muted\">Words that I did not remember before, I chose for you from the lessons:</p><div class=\"dp-list\">"
      + ws_.map((w, i) => '<div class="dp-item"><b class="hz">' + wordHz(w) + '</b><span dir="ltr" class="dp-py">' + esc(wordPy(w)) + '</span><span class="dp-m">' + esc(w.m) + '</span><small>' + esc((LESSONS.find(l => l.id === w._L) || {}).title || '') + '</small></div>').join('')
      + "</div><div class=\"cf-row\"><button class=\"btn o\" data-a=\"x\">Cancel</button><button class=\"btn o\" data-a=\"new\">🔄 Other words</button><button class=\"btn g\" data-a=\"go\">▶ Get started</button></div></div>";
    d.addEventListener('click', ev => {
      const a = ev.target.closest('[data-a]'); if(ev.target === d){ d.remove(); return; } if(!a) return;
      if(a.dataset.a === 'x'){ d.remove(); paintHome(); }
      else if(a.dataset.a === 'new'){ d.remove(); preview(true); }
      else { d.remove(); openPlan(); }
    });
    document.body.appendChild(d); paintHome();
  }
  function startPlan(){
    const p = plan(), pr = progress();
    if(!p || !p.keys.length || (!p.done && pr.d === 0)) return preview(false);
    openPlan();
  }
  function openPlan(){
    let p = plan(); if(!p) return preview(false);
    if(!p.keys.length){ toast("🎉 I studied all the words in all the lessons! Check what is due or test yourself"); go('quiz'); return; }
    go('vocab'); vFilter = 'plan'; vList = planWords();
    const done = studiedToday(); const first = vList.findIndex(w => !done.has(wordHz(w)));
    vPos = first >= 0 ? first : 0; paintVocab(); paintBar();
  }
  function morePlan(){
    const p = plan(); if(!p) return startPlan();
    makePlan(p.keys.length + goal(), p.keys); state.plan.done = false; save();
    toast("➕ I added " + goal() + " New words for today's plan"); openPlan();
  }
  function finishPlan(){
    const p = plan(); if(!p) return; const pr = progress();
    if(pr.d < pr.n){ toast("remains " + (pr.n - pr.d) + " Words in today's plan"); return; }
    p.done = true; p.doneAt = Date.now(); try{ touchStreak(); }catch(e){} save();
    sfx('finish'); confetti();
    const st = (state.streak && state.streak.n) || 1;
    const lines = ["Champion! Word by word and delivered 💪", "This is the commitment that leads you to fluency 🔥", "Well done! Your mind memorizes it while you are sleeping 😴✨", "Excellent! Continue with the same enthusiasm tomorrow 🚀"];
    say('good', "<b>🎉 I finished today’s plan: " + pr.n + " Words!</b><small>" + lines[Math.floor(Math.random() * lines.length)] + (st > 1 ? '<br>🔥 ' + st + " consecutive days" : '') + '</small>');
    try{
      appConfirm("🎉 I finished today's plan!", "I learned today <b>" + pr.n + "</b> New words" + (st > 1 ? ", and you have it <b>" + st + "</b> Consecutive days 🔥" : '') + ".<br>Review it quickly once tomorrow to confirm it. Would you like to test yourself on it now?", "Test me on it").then(ok => {
        if(ok){ go('quiz'); quizPlan(); } else go('home');
      });
    }catch(e){ go('home'); }
    paintAll(); paintBar();
  }
  // اختبار على كلمات الخطة نفسها
  function quizPlan(){
    const ws_ = planWords(); if(ws_.length < 2){ quizStart(6, false); return; }
    const types = ['mc_mean', 'mc_hz', 'listen', 'order'];
    quiz = {live: true, qs: [], i: 0, score: 0, wrong: [], all: true, lessonId: L.id};
    ws_.forEach((w, k) => { let t = types[k % types.length]; if(t === 'order' && !(w.ex && w._S && w._S[w.ex])) t = 'mc_mean'; quiz.qs.push({t, w}); });
    quiz.qs = shuffle(quiz.qs); go('quiz'); paintQ();
  }
  function confetti(){
    const box = document.createElement('div'); box.className = 'dp-confetti';
    const cols = ['#f5c518', '#15795e', '#1f6fd1', '#d6336c', '#8a3ffc', '#e07a10'];
    for(let i = 0; i < 60; i++){
      const s = document.createElement('i');
      s.style.cssText = 'left:' + Math.random() * 100 + '%;background:' + cols[i % cols.length] + ';animation-delay:' + Math.random() * .6 + 's;animation-duration:' + (1.8 + Math.random() * 1.4) + 's;transform:rotate(' + Math.random() * 360 + 'deg)';
      box.appendChild(s);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3800);
  }

  /* شريط الخطة في صفحة المفردات */
  function paintBar(){
    let bar = $('#planBar');
    if(!bar){ const pg = $('#pg-vocab'); if(!pg) return; bar = document.createElement('div'); bar.id = 'planBar'; bar.className = 'plan-bar'; pg.insertBefore(bar, pg.firstChild); }
    const p = plan();
    if(!p || vFilter !== 'plan'){ bar.hidden = true; return; }
    const pr = progress(); bar.hidden = false;
    bar.innerHTML = "<div class=\"pb-top\"><b>📅 Today’s plan</b><span>" + pr.d + ' / ' + pr.n + '</span></div>'
      + '<div class="gp-bar"><i style="width:' + (pr.n ? Math.round(100 * pr.d / pr.n) : 0) + '%"></i></div>'
      + (p.done ? "<div class=\"pb-done\">✅ I finished it today — <button class=\"btn o sm\" onclick=\"dpMore()\">➕ " + goal() + " Additional words</button></div>"
        : pr.d >= pr.n ? "<button class=\"btn g wide pb-finish\" onclick=\"dpFinish()\">🎉 I finished today's plan</button>"
        : "<small>Rate each word with “saved” or “needs review” — words from: " + [...new Set(planWords().map(w => (LESSONS.find(l => l.id === w._L) || {}).title))].map(esc).join('، ') + '</small>');
  }

  /* بطاقة الرئيسية */
  function paintHero(){
    const btn0 = $('#nextStudyBtn'); if(btn0 && btn0.hasAttribute('data-study')) btn0.removeAttribute('data-study');
    const p = plan(), btn = $('#nextStudyBtn'), cnt = $('#dailyCount'), bar = $('#dailyProgress'), txt = $('#nextStudyText'), hint = $('#dailyHint');
    if(!btn) return;
    let due = 0; try{ due = W.filter(isDue).length; }catch(e){}
    if(!p){
      cnt.textContent = '0 / ' + goal() + " Today's plan"; bar.max = goal(); bar.value = 0;
      txt.textContent = "Click “Start” and it will be prepared for you " + goal() + " New words that I had never remembered before, from any lesson." + (due ? " (And you have " + due + " For review from ⏰)" : '');
      btn.textContent = "📅 Start a plan today (" + goal() + " words)"; btn.onclick = startPlan; hint.hidden = true; return;
    }
    const pr = progress();
    cnt.textContent = pr.d + ' / ' + pr.n + " Today's plan"; bar.max = pr.n || 1; bar.value = pr.d;
    if(p.done){
      txt.textContent = "✅ I finished today's plan! Excellent 👏 You can stop, add words, or withdraw.";
      btn.textContent = '➕ ' + goal() + " Additional words"; btn.onclick = morePlan;
    } else if(pr.d >= pr.n){
      txt.textContent = "I finished all the words of the plan! The rest of you press the button 👇";
      btn.textContent = "🎉 I finished today's plan"; btn.onclick = finishPlan;
    } else {
      txt.textContent = "remains " + (pr.n - pr.d) + " Words in your plan today. Continue from where you stood.";
      btn.textContent = "▶ Complete today’s plan"; btn.onclick = startPlan;
    }
    hint.hidden = true;
  }

  function hook(){
    if(typeof paintOverview !== 'function' || typeof listFor !== 'function' || !$('#nextStudyBtn')) return setTimeout(hook, 200);
    const baseOv = paintOverview;
    paintOverview = window.paintOverview = function(){ const r = baseOv.apply(this, arguments); try{ paintHero(); }catch(e){} return r; };
    const baseList = listFor;
    listFor = window.listFor = function(f){ return f === 'plan' ? planWords() : baseList.apply(this, arguments); };
    const baseVocab = paintVocab;
    paintVocab = window.paintVocab = function(){
      const r = baseVocab.apply(this, arguments);
      try{ paintBar(); if(vFilter !== 'plan' && vList[vPos] && document.getElementById('pg-vocab').classList.contains('on')){ const k = wkey(vList[vPos]); state.viewed = state.viewed || {}; if(!state.viewed[k]){ state.viewed[k] = 1; save(); } } }catch(e){}
      return r;
    };
    const baseGoal = setDailyGoal;
    setDailyGoal = window.setDailyGoal = function(v){
      const r = baseGoal.apply(this, arguments); const p = plan();
      if(p && !p.done){ const done = studiedToday(); const keep = p.keys.filter(k => { const w = findWord(k); return w && done.has(wordHz(w)); }); makePlan(Math.max(goal(), keep.length), keep); paintHome(); }
      return r;
    };
    // عند تقييم آخر كلمة في الخطة: تنبيه لطيف
    const baseGrade = gradeCur;
    gradeCur = window.gradeCur = function(){
      const before = progress(); const r = baseGrade.apply(this, arguments); const after = progress(); const p = plan();
      if(p && !p.done && vFilter === 'plan' && after.d >= after.n && before.d < before.n){
        setTimeout(() => say('good', "<b>The words concluded the plan! 🎯</b><small>Click “🎉 I finished today’s plan” above</small>"), 600);
      }
      return r;
    };
    window.dpFinish = finishPlan; window.dpMore = morePlan; window.dpStart = startPlan;
    try{ paintHome(); }catch(e){}
  }
  hook();
})();
