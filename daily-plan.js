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
    LESSONS.forEach(l => l.words.forEach(w => { if(status(w) !== 'new') seenHz.add(wordHz(w)); }));
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
  function makePlan(n, keep){
    const keys = (keep || []).slice();
    candidates(keys).slice(0, Math.max(0, n - keys.length)).forEach(w => keys.push(wkey(w)));
    state.plan = {day: today(), keys, done: false, goal: n};
    save(); return state.plan;
  }

  function startPlan(){
    let p = plan();
    if(!p || (!p.keys.length)) p = makePlan(goal());
    if(!p.keys.length){ toast('🎉 ذاكرت كل الكلمات في كل الدروس! راجع المستحقّ أو اختبر نفسك'); go('quiz'); return; }
    go('vocab'); vFilter = 'plan'; vList = planWords();
    const done = studiedToday(); const first = vList.findIndex(w => !done.has(wordHz(w)));
    vPos = first >= 0 ? first : 0; paintVocab(); paintBar();
  }
  function morePlan(){
    const p = plan(); if(!p) return startPlan();
    makePlan(p.keys.length + goal(), p.keys); state.plan.done = false; save();
    toast('➕ أضفت ' + goal() + ' كلمات جديدة لخطة اليوم'); startPlan();
  }
  function finishPlan(){
    const p = plan(); if(!p) return; const pr = progress();
    if(pr.d < pr.n){ toast('باقي ' + (pr.n - pr.d) + ' كلمات في خطة اليوم'); return; }
    p.done = true; p.doneAt = Date.now(); try{ touchStreak(); }catch(e){} save();
    sfx('finish'); confetti();
    const st = (state.streak && state.streak.n) || 1;
    const lines = ['بطل! كلمة كلمة وتوصل 💪', 'هذا هو الالتزام اللي يوصلك للطلاقة 🔥', 'أحسنت! عقلك يحفظها الحين وأنت نايم 😴✨', 'ممتاز! استمر بنفس الحماس بكرة 🚀'];
    say('good', '<b>🎉 أنهيت خطة اليوم: ' + pr.n + ' كلمات!</b><small>' + lines[Math.floor(Math.random() * lines.length)] + (st > 1 ? '<br>🔥 ' + st + ' أيام متتالية' : '') + '</small>');
    try{
      appConfirm('🎉 أنهيت خطة اليوم!', 'تعلّمت اليوم <b>' + pr.n + '</b> كلمات جديدة' + (st > 1 ? '، وصار عندك <b>' + st + '</b> أيام متتالية 🔥' : '') + '.<br>راجعها بكرة مرة سريعة عشان تثبت. تبي تختبر نفسك فيها الحين؟', 'اختبرني فيها').then(ok => {
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
    bar.innerHTML = '<div class="pb-top"><b>📅 خطة اليوم</b><span>' + pr.d + ' / ' + pr.n + '</span></div>'
      + '<div class="gp-bar"><i style="width:' + (pr.n ? Math.round(100 * pr.d / pr.n) : 0) + '%"></i></div>'
      + (p.done ? '<div class="pb-done">✅ أنهيتها اليوم — <button class="btn o sm" onclick="dpMore()">➕ ' + goal() + ' كلمات إضافية</button></div>'
        : pr.d >= pr.n ? '<button class="btn g wide pb-finish" onclick="dpFinish()">🎉 أنهيت خطة اليوم</button>'
        : '<small>قيّم كل كلمة بـ «حفظتها» أو «تحتاج مراجعة» — الكلمات من: ' + [...new Set(planWords().map(w => (LESSONS.find(l => l.id === w._L) || {}).title))].map(esc).join('، ') + '</small>');
  }

  /* بطاقة الرئيسية */
  function paintHero(){
    const p = plan(), btn = $('#nextStudyBtn'), cnt = $('#dailyCount'), bar = $('#dailyProgress'), txt = $('#nextStudyText'), hint = $('#dailyHint');
    if(!btn) return;
    let due = 0; try{ due = W.filter(isDue).length; }catch(e){}
    if(!p){
      cnt.textContent = '0 / ' + goal() + ' خطة اليوم'; bar.max = goal(); bar.value = 0;
      txt.textContent = 'اضغط «ابدأ» وأجهّز لك ' + goal() + ' كلمات جديدة ما ذاكرتها من قبل، من أي درس.' + (due ? ' (وعندك ' + due + ' للمراجعة من ⏰)' : '');
      btn.textContent = '📅 ابدأ خطة اليوم (' + goal() + ' كلمات)'; btn.onclick = startPlan; hint.hidden = true; return;
    }
    const pr = progress();
    cnt.textContent = pr.d + ' / ' + pr.n + ' خطة اليوم'; bar.max = pr.n || 1; bar.value = pr.d;
    if(p.done){
      txt.textContent = '✅ أنهيت خطة اليوم! ممتاز 👏 تقدر تكتفي، أو تزيد كلمات، أو تراجع.';
      btn.textContent = '➕ ' + goal() + ' كلمات إضافية'; btn.onclick = morePlan;
    } else if(pr.d >= pr.n){
      txt.textContent = 'خلّصت كل كلمات الخطة! باقي تضغط الزر 👇';
      btn.textContent = '🎉 أنهيت خطة اليوم'; btn.onclick = finishPlan;
    } else {
      txt.textContent = 'باقي ' + (pr.n - pr.d) + ' كلمات في خطتك اليوم. كمّل من حيث وقفت.';
      btn.textContent = '▶ كمّل خطة اليوم'; btn.onclick = startPlan;
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
    paintVocab = window.paintVocab = function(){ const r = baseVocab.apply(this, arguments); try{ paintBar(); }catch(e){} return r; };
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
        setTimeout(() => say('good', '<b>خلّصت كلمات الخطة! 🎯</b><small>اضغط «🎉 أنهيت خطة اليوم» فوق</small>'), 600);
      }
      return r;
    };
    window.dpFinish = finishPlan; window.dpMore = morePlan; window.dpStart = startPlan;
    try{ paintHome(); }catch(e){}
  }
  hook();
})();
