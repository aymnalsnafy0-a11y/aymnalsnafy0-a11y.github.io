/* حفظ كتابة الرموز: جلسة بمؤقت وعدد تكرارات حسب الصعوبة، إخفاء تدريجي للشكل، ومراجعة متباعدة من الذاكرة */
(function(){
  'use strict';
  const DAY = 864e5;
  const GAPS = [0, 1, 3, 7, 14, 30, 60];           // أيام بين كل مراجعة وأخرى
  const $id = id => document.getElementById(id);
  const srs = () => (state.wsrs = state.wsrs || {});
  const now = () => Date.now();

  /* ---------- صعوبة الرمز ---------- */
  function difficulty(ch){
    const d = window.HZ_DATA && HZ_DATA[ch]; if(!d) return null;
    const n = d.strokes.length;
    let compound = 0;
    try{ for(let i = 0; i < n; i++) if(StrokeTypes.strokeName(ch, d, i).length > 1) compound++; }catch(e){}
    const score = n + compound * 1.5;
    const lv = score <= 6 ? 0 : score <= 11 ? 1 : score <= 16 ? 2 : 3;
    const name = ["Easy", "Average", "Difficult", "Very difficult"][lv];
    let reps = [3, 5, 7, 9][lv];
    const known = (srs()[ch] || {}).lvl || 0;
    if(known >= 3) reps = Math.max(2, reps - 2);   // رمز تتقنه: تكرارات أقل
    const secs = Math.round((45 + n * 9 + compound * 6) / 15) * 15 * (reps / [3, 5, 7, 9][lv]);
    return {n, compound, lv, name, reps, secs: Math.max(45, Math.round(secs / 15) * 15)};
  }
  const fmt = s => (s < 0 ? '+' : '') + Math.floor(Math.abs(s) / 60) + ':' + String(Math.abs(s) % 60).padStart(2, '0');

  /* ---------- جدولة المراجعة ---------- */
  function grade(ch, mistakes, usedHint){
    const r = srs()[ch] || {lvl: 0, due: 0, err: 0, n: 0};
    r.n = (r.n || 0) + 1; r.last = now();
    if(mistakes === 0 && !usedHint){ r.lvl = Math.min(GAPS.length - 1, r.lvl + 1); }
    else if(mistakes <= 2 && !usedHint){ /* يبقى في مستواه */ }
    else { r.lvl = Math.max(0, r.lvl - 2); r.err = (r.err || 0) + 1; }
    const gap = GAPS[r.lvl] || 0;
    r.due = gap ? now() + gap * DAY - 3 * 36e5 : now() + 10 * 6e4;
    srs()[ch] = r;
    if(mistakes === 0) state.wr[ch] = 1;
    return r;
  }
  function dueChars(){
    const t = now();
    return Object.entries(srs()).filter(([c, r]) => r.due && r.due <= t).map(([c]) => c);
  }
  function wordsFor(chars){
    const want = new Set(chars), seen = new Set(), out = [];
    const all = (typeof W !== 'undefined' && W ? W : []).concat(...LESSONS.map(l => l.words));
    for(const w of all){
      const hz = w.ch.map(c => c[0]);
      if(!hz.some(c => want.has(c))) continue;
      const k = hz.join(''); if(seen.has(k)) continue;
      if(hz.every(c => window.HZ_DATA && HZ_DATA[c])){ seen.add(k); out.push(w); hz.forEach(c => want.delete(c)); }
      if(!want.size) break;
    }
    return out;
  }

  /* ---------- جلسة الحفظ داخل نافذة الكتابة ---------- */
  let S = null;
  function stopSession(silent){
    if(!S) return;
    clearInterval(S.tick); S.alive = false;
    try{ S.writer.cancelQuiz(); }catch(e){}
    try{ S.writer.showOutline(); }catch(e){}
    if(!silent){ const p = $id('wtPanel'); if(p) p.hidden = true; }
    S = null;
  }
  function paintPanel(){
    const p = $id('wtPanel'); if(!p || !S) return;
    const left = S.secs - Math.round((now() - S.t0) / 1000);
    const pct = Math.max(0, Math.min(100, 100 * left / S.secs));
    const stage = stageOf(S.done);
    p.innerHTML = `<div class="wt-top">
        <span class="wt-lv wt-l${S.d.lv}">${S.d.name}</span>
        <span class="hz">${S.ch}</span>
        <span class="wt-time ${left < 0 ? 'over' : left <= 15 ? 'low' : ''}">⏱ ${fmt(left)}</span>\n        <button class=\"btn o sm\" onclick=\"wtStop()\">Off</button>\n      </div>\n      <div class=\"wt-bar\"><i style=\"width:${pct}%"></i></div>
      <div class="wt-reps">${Array.from({length: S.d.reps}, (_, i) => `<b class="${i < S.done ? 'ok' : i === S.done ? 'cur' : ''}">${i < S.done ? '✓' : i + 1}</b>`).join('')}</div>
      <div class="wt-stage">${S.finished ? '' : "Stage: " + stage.label}</div>`;
  }
  function stageOf(i){
    const N = S.d.reps;
    if(i < Math.ceil(N * .3)) return {outline: true, hint: 1, label: "Copy over the shape 👀"};
    if(i < Math.ceil(N * .7)) return {outline: false, hint: 2, label: "Without form — error hint"};
    return {outline: false, hint: 3, label: "Completely from memory 🧠"};
  }
  function msg(t){ const m = $id('wrMsg'); if(m) m.innerHTML = t; }

  function startSession(){
    const ch = typeof wrChar !== 'undefined' && wrChar; if(!ch) return;
    const d = difficulty(ch); if(!d){ toast("There is no step data for this code"); return; }
    if(state.set.writeMode === 'all') setWriteMode('single');
    pickChar(ch);
    const e = (typeof wrEntries !== 'undefined' ? wrEntries : []).find(x => x.ch === ch && x.writer);
    if(!e) return;
    stopSession(true);
    try{ StrokeTypes.layers(false); }catch(err){}
    S = {ch, d, writer: e.writer, done: 0, t0: now(), secs: d.secs, alive: true, miss: 0, tries: 0};
    const p = $id('wtPanel'); p.hidden = false;
    S.tick = setInterval(() => {
      if(!S) return;
      const left = S.secs - Math.round((now() - S.t0) / 1000);
      if(left === 0 && !S.warned){ S.warned = true; toast("⏱ Suggested time has expired — complete the reps"); }
      paintPanel();
    }, 1000);
    paintPanel();
    msg("Watch the writing method first and then repeat it " + d.reps + " times");
    try{ speak(ch); }catch(err){}
    const run = S;
    S.writer.hideCharacter({duration: 0});
    S.writer.showOutline();
    S.writer.animateCharacter({onComplete(){ if(S === run && run.alive) setTimeout(() => { if(S === run) rep(); }, 600); }});
  }
  function rep(){
    const run = S; if(!run || !run.alive) return;
    const st = stageOf(run.done);
    run.tries++;
    st.outline ? run.writer.showOutline() : run.writer.hideOutline();
    run.writer.hideCharacter({duration: 0});
    let hinted = false;
    msg(`Repetition ${run.done + 1} from ${run.d.reps} — ${st.label}`);
    paintPanel();
    run.writer.quiz({
      showHintAfterMisses: st.hint, leniency: 1.05, showOutline: st.outline,
      onMistake(dd){ if(S !== run) return; if(dd.mistakesOnStroke >= st.hint) hinted = true; },
      onComplete(dd){
        if(S !== run) return;
        const good = dd.totalMistakes <= (st.hint === 3 ? 0 : 1) && !(hinted && st.hint === 3);
        run.miss += dd.totalMistakes;
        if(good){ run.done++; msg("✓ Well done" + (run.done < run.d.reps ? " — Next" : '')); }
        else msg("✗ Not counted (" + dd.totalMistakes + " Errors) — repeat this iteration");
        paintPanel();
        if(run.done >= run.d.reps) return setTimeout(() => finish(run), 700);
        setTimeout(() => { if(S === run) rep(); }, good ? 700 : 1200);
      }
    });
  }
  function finish(run){
    if(S !== run) return;
    try{ window.SFX && SFX.play('finish'); }catch(e){}
    clearInterval(run.tick);
    const used = Math.round((now() - run.t0) / 1000);
    const inTime = used <= run.secs;
    const r = grade(run.ch, run.miss > run.d.reps ? 3 : run.miss > 0 ? 1 : 0, false);
    run.finished = true; run.alive = false;
    try{ touchStreak(); }catch(e){}
    save(); try{ paintAll(); }catch(e){}
    run.writer.showOutline(); run.writer.showCharacter();
    try{ speak(run.ch); }catch(e){}
    const acc = Math.round(100 * run.d.reps / run.tries);
    const next = GAPS[r.lvl] ? "After " + GAPS[r.lvl] + (GAPS[r.lvl] === 1 ? " day" : " days") : "Today again";
    const p = $id('wtPanel');
    p.innerHTML = `<div class=\"wt-done\">\n      <b>🎉 I ended the session: <span class=\"hz\">${run.ch}</span></b>\n      <div>Time ${fmt(used)} from ${fmt(run.secs)} ${inTime ? '✓' : "(Time exceeded - it's okay)"} · Accuracy ${acc}%</div>\n      <div>Next review from memory: <b>${next}</b></div>\n      <div class=\"row eq\" style=\"margin-top:8px\"><button class=\"btn sm\" onclick=\"wtStart()\">🔁 Another session</button><button class=\"btn o sm\" onclick=\"wtStop()\">Done</button></div>\n    </div>`;
    msg('');
    S = null;
  }

  /* ---------- مراجعة الكتابة من الذاكرة ---------- */
  let R = null;
  function ensureRecallModal(){
    if($id('mdRecall')) return;
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'mdRecall';
    m.innerHTML = `<div class=\"sheet\">\n      <h3><span>🧠 Write from memory</span><span><button class=\"btn o sm\" onclick=\"closeModal('mdRecall')\">Close ✕</button></span></h3>\n      <div id=\"rcBody\"></div></div>`;
    m.addEventListener('click', ev => { if(ev.target === m) closeModal('mdRecall'); });
    document.body.appendChild(m);
  }
  function openRecall(chars){
    ensureRecallModal();
    const list = wordsFor(chars && chars.length ? chars : dueChars());
    if(!list.length){ toast("There are no codes to review now — start a “save session” from the writing window"); return; }
    R = {list, i: 0, res: []};
    openModal('mdRecall');
    recallWord();
  }
  function recallWord(){
    const body = $id('rcBody'); if(!R) return;
    if(R.i >= R.list.length) return recallDone();
    const w = R.list[R.i], chars = w.ch.map(c => c[0]);
    const size = Math.min(chars.length > 1 ? 150 : 220, Math.floor((Math.min(560, window.innerWidth) - 60) / Math.min(chars.length, 3)));
    body.innerHTML = `<div class=\"rc-top\">word ${R.i + 1} from ${R.list.length}</div>
      <div class="rc-q"><div class="rc-m">${esc(w.m)}</div>
        <div class="rc-py" dir="ltr">${esc(wordPy(w))}</div>\n        <button class=\"btn o sm\" id=\"rcSay\">🔊 Listen</button></div>\n      <div class=\"rc-boxes\" dir=\"ltr\">${chars.map((c, k) => `<div class="rc-box" id="rcB${k}" style="width:${size}px;height:${size}px"></div>`).join('')}</div>\n      <div class=\"hwmsg\" id=\"rcMsg\">Write the first symbol from your memory (without form)</div>\n      <div class=\"row eq\"><button class=\"btn o sm\" id=\"rcHint\">💡 Show figure (counted as an error)</button><button class=\"btn o sm\" id=\"rcSkip\">I don’t remember ↩</button></div>`;
    const say = () => { try{ speak(speakHz(w)); }catch(e){} };
    $id('rcSay').onclick = say; say();
    const writers = chars.map((c, k) => HanziWriter.create($id('rcB' + k), c, {
      width: size, height: size, padding: 6, showCharacter: false, showOutline: false,
      strokeColor: '#1f5f9e', outlineColor: '#d3dfeb', drawingColor: '#a8393c', highlightColor: '#15795e',
      drawingWidth: Math.max(10, Math.round(size * .075)), charDataLoader: (x, done) => done(HZ_DATA[x])
    }));
    let k = 0, hint = new Set(), token = {};
    R.cur = token;
    const next = () => {
      if(R.cur !== token) return;
      if(k >= chars.length){
        writers.forEach(x => x.showCharacter());
        say(); R.i++; setTimeout(() => { if(R && R.cur === token) recallWord(); }, 1500);
        return;
      }
      $id('rcMsg').textContent = "Write the code " + (k + 1) + " from " + chars.length + " From your memory";
      writers[k].quiz({showHintAfterMisses: 3, leniency: 1.05,
        onMistake(dd){ if(dd.mistakesOnStroke >= 3) hint.add(k); },
        onComplete(dd){
          if(R.cur !== token) return;
          const r = grade(chars[k], dd.totalMistakes, hint.has(k));
          R.res.push({ch: chars[k], ok: dd.totalMistakes === 0 && !hint.has(k), lvl: r.lvl});
          $id('rcMsg').textContent = dd.totalMistakes === 0 && !hint.has(k) ? "✓ Excellent" : "✗ This will be back soon";
          save(); k++; setTimeout(next, 600);
        }});
    };
    $id('rcHint').onclick = () => { if(k < chars.length){ hint.add(k); writers[k].showOutline(); } };
    $id('rcSkip').onclick = () => {
      if(k >= chars.length) return;
      writers[k].cancelQuiz(); hint.add(k);
      grade(chars[k], 9, true); R.res.push({ch: chars[k], ok: false}); save();
      writers[k].showOutline();
      writers[k].animateCharacter({onComplete(){ if(R.cur === token){ k++; setTimeout(next, 500); } }});
      $id('rcMsg').textContent = "Watch How — This code will be back for review today";
    };
    next();
  }
  function recallDone(){
    const ok = R.res.filter(x => x.ok).length, bad = R.res.filter(x => !x.ok).map(x => x.ch);
    try{ touchStreak(); }catch(e){}
    save(); try{ paintAll(); }catch(e){} paintTile();
    $id('rcBody').innerHTML = `<div class=\"wt-done\"><b>Review finished: ${ok} from ${R.res.length} is correct</b>\n      ${bad.length ? `<div>You need to repeat: <span class=\"hz\">${[...new Set(bad)].join(' ')}</span></div>
      <div class="row eq" style="margin-top:8px"><button class="btn sm" onclick="wtRecall(${esc(JSON.stringify([...new Set(bad)]))})\">Retry missed questions</button></div>` : "<div>Excellent! The next icons will appear at their scheduled time 🎉</div>"}
    </div>`;
    R = null;
  }

  /* ---------- الربط بالواجهة ---------- */
  function paintTile(){
    const t = document.querySelector('[data-write-next]'); if(!t) return;
    const n = dueChars().length, sm = t.querySelector('small');
    if(sm) sm.textContent = n ? '🔁 ' + n + " Code for review" : "Draw the letters";
    t.classList.toggle('wt-due', !!n);
  }
  function hook(){
    if(typeof pickChar !== 'function' || !window.StrokeTypes || !document.querySelector('[data-write-next]')) return setTimeout(hook, 200);
    // لوحة الجلسة وأزرارها ونصائح الحفظ داخل نافذة الكتابة
    const hw = document.querySelector('#mdWrite .hwwrap');
    if(hw && !$id('wtPanel')){
      const p = document.createElement('div'); p.id = 'wtPanel'; p.className = 'wt-panel'; p.hidden = true;
      hw.parentNode.insertBefore(p, hw);
      const tips = document.createElement('details'); tips.className = 'vopts wt-tips';
      tips.innerHTML = `<summary>💡 How to memorize writing and not forget it</summary><ol>\n        <li><b>Divide the code into parts:</b> Open the “Image of memorization and decomposition of the letter” in the word card, and memorize the parts, not the lines.</li>\n        <li><b>Pronounce as you write:</b> Say the sound and meaning out loud with each repetition. The session pronounces it for you at the beginning and end.</li>\n        <li><b>From copying to memory:</b> The memorization session begins with the figure visible, then hides it, and then asks to write from memory without a hint.</li>\n        <li><b>Spaced review:</b> After a day, then 3 days, then a week, then two weeks, then a month. The “Write” button on the main page reminds you of the number.</li>\n        <li><b>Recall and do not re-read:</b> “Write from memory” displays only the meaning and sound, so you can recall the entire word.</li>\n        <li><b>Errors return faster:</b> The code you make a mistake will be downgraded and returned to you soon.</li>\n        <li><b>Know the types of fonts:</b> Click on the difficult line and practice it alone.</li>\n        <li><b>Write on paper also:</b> After the application, write the word 3 times on a piece of paper within a short sentence.</li>\n        <li><b>A little every day:</b> 10 minutes a day is better than an hour once a week.</li></ol>`;
      const hint = $id('wrHint'); hint.parentNode.insertBefore(tips, hint.nextSibling);
    }
    // تحديث تسمية الصعوبة عند اختيار رمز
    const basePick = pickChar;
    pickChar = window.pickChar = function(){
      if(S && S.alive) stopSession();
      const r = basePick.apply(this, arguments);
      const d = difficulty(typeof wrChar !== 'undefined' ? wrChar : '');
      const s = $id('wrSteps');
      if(d && s) s.textContent += ` · Difficulty: ${d.name} (${d.reps} repetitions, ${fmt(d.secs)})`;
      return r;
    };
    const baseStop = stopWriters;
    stopWriters = window.stopWriters = function(){ if(S && S.alive) stopSession(); return baseStop.apply(this, arguments); };
    const baseClose = closeModal;
    closeModal = window.closeModal = function(id){ if(id === 'mdRecall' && R){ R.cur = null; R = null; paintTile(); } return baseClose.apply(this, arguments); };
    const tile = document.querySelector('[data-write-next]');
    tile.onclick = () => dueChars().length ? openRecall() : writeNextWord();
    const baseHome = typeof paintHome === 'function' ? paintHome : null;
    if(baseHome) paintHome = window.paintHome = function(){ const r = baseHome.apply(this, arguments); paintTile(); return r; };
    paintTile();
    setInterval(paintTile, 60000);
  }
  window.wtStart = startSession;
  window.wtStop = () => { stopSession(); msg(''); };
  window.wtRecall = openRecall;
  window.WriteTrain = {difficulty, dueChars, grade};
  hook();
})();
