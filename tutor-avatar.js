/* المعلّم بشكل شخصية: صورة كاملة في زاوية الشاشة، تتغيّر تعابيرها وتطلع منه رسائل تشجيع وتوضيح */
(function(){
  'use strict';
  const IMG = {idle: 'tutor/idle.webp', good: 'tutor/clap.webp', hi: 'tutor/smile.webp', info: 'tutor/smile.webp', bad: 'tutor/think.webp'};
  Object.values(IMG).forEach(src => { const i = new Image(); i.src = src; });   // تحميل مسبق

  const GOOD = ['أحسنت! 👏', 'ممتاز، كمّل كذا! 💪', 'برافو عليك 🎉', 'صح! أنت تتقدّم بسرعة', '很好 hěn hǎo — ممتاز!', 'إجابة ذكية 👌', 'هذا هو! 🔥'];
  const STREAK = ['ثلاث صح ورا بعض! 🔥', 'ما شاء الله، ولا غلطة! 🌟', 'أنت نار اليوم 🔥🔥'];
  const BAD = ['ولا يهمك، من الخطأ نتعلّم 🙂', 'قريبة! ركّز شوي', 'مو مشكلة، جرّب مرة ثانية'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const strip = h => { const d = document.createElement('div'); d.innerHTML = h; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };

  let fab, img, bubble, hideT, backT, streak = 0, lastAt = 0, quiet = 0;
  const mute = (fn, self, args) => { quiet++; try{ return fn.apply(self, args); } finally { quiet--; } };
  const on = () => !(typeof state !== 'undefined' && state.set && state.set.avatarOff);

  function build(){
    fab = document.querySelector('.fab'); if(!fab) return false;
    bubble = document.createElement('div'); bubble.className = 'av-bubble'; bubble.hidden = true;
    bubble.addEventListener('click', () => hide());
    document.body.appendChild(bubble);
    apply();
    return true;
  }
  function apply(){
    if(!fab) return;
    if(on()){
      fab.classList.add('av-fab');
      fab.textContent = '';
      img = document.createElement('img'); img.alt = 'المعلّم'; img.src = IMG.idle; img.draggable = false;
      fab.appendChild(img);
      fab.title = 'اضغط لتسأل المعلّم · اسحبني لأي مكان';
      img.addEventListener('load', () => window.dispatchEvent(new Event('resize')), {once: true});
    } else {
      fab.classList.remove('av-fab', 'av-bust'); fab.textContent = '💬'; img = null; hide();
      window.dispatchEvent(new Event('resize'));
    }
  }
  function place(){
    if(bubble.hidden) return;
    const r = fab.getBoundingClientRect(), bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    // فوق رأس الشخصية، وإن ما في مكان فبجانبه
    let x = r.left + r.width / 2 - bw / 2, y = r.top - bh - 10, below = false;
    if(y < 8){ y = Math.min(vh - bh - 8, r.top + 10); x = r.left > vw / 2 ? r.left - bw - 10 : r.right + 10; below = true; }
    x = Math.max(8, Math.min(vw - bw - 8, x));
    bubble.style.left = x + 'px'; bubble.style.top = y + 'px';
    bubble.classList.toggle('side', below);
    const tail = Math.max(14, Math.min(bw - 14, r.left + r.width / 2 - x));
    bubble.style.setProperty('--tail', tail + 'px');
  }
  function hide(){ if(bubble){ bubble.hidden = true; bubble.classList.remove('show'); } }
  function face(kind, ms){
    if(!img) return;
    clearTimeout(backT);
    img.src = IMG[kind] || IMG.idle;
    fab.classList.toggle('av-bust', kind !== 'idle');
    fab.classList.remove('av-pop'); void fab.offsetWidth; fab.classList.add('av-pop');
    backT = setTimeout(() => { if(img){ img.src = IMG.idle; fab.classList.remove('av-bust'); } }, ms);
  }
  // kind: good | bad | info | hi
  function say(kind, html, opts){
    opts = opts || {};
    if(!on() || !fab || !bubble) return;
    const t = Date.now();
    if(!opts.force && t - lastAt < 900) return;   // لا نغرق الشاشة بالرسائل
    lastAt = t;
    const ms = opts.ms || Math.min(9000, 3200 + strip(html).length * 55);
    bubble.className = 'av-bubble ' + kind;
    bubble.innerHTML = html;
    bubble.hidden = false; place();
    requestAnimationFrame(() => bubble.classList.add('show'));
    face(kind, ms);
    clearTimeout(hideT); hideT = setTimeout(hide, ms);
  }
  function good(extra){
    streak++;
    const base = streak >= 3 && streak % 3 === 0 ? pick(STREAK) : pick(GOOD);
    say('good', base + (extra ? '<small>' + extra + '</small>' : ''));
  }
  function bad(explain){
    streak = 0;
    say('bad', '<b>' + pick(BAD) + '</b>' + (explain ? '<small>' + explain + '</small>' : ''), {force: true});
  }

  /* ---------- ربط الأحداث ---------- */
  function hooks(){
    // الاختبار
    if(typeof resolveQ === 'function'){
      const base = resolveQ;
      resolveQ = window.resolveQ = function(ok, expl){
        const q = quiz.qs[quiz.i], was = q && q.answered;
        const r = mute(base, this, arguments);
        if(q && !was){ ok ? good() : bad('الصحيح: ' + strip(expl)); }
        return r;
      };
    }
    if(typeof quizDone === 'function'){
      const base = quizDone;
      quizDone = window.quizDone = function(){
        const s = quiz.score, t = quiz.qs.length, r = base.apply(this, arguments);
        const pct = t ? Math.round(s / t * 100) : 0;
        setTimeout(() => say(pct >= 70 ? 'good' : 'info', pct >= 90 ? `<b>${s}/${t} — أنت جاهز للدرس الجاي 🎉</b>` : pct >= 70 ? `<b>${s}/${t} — ممتاز!</b><small>راجع الأخطاء القليلة وتصير كامل</small>` : `<b>${s}/${t}</b><small>لا تحبط، راجع الكلمات اللي غلطت فيها وأعد الاختبار — أنا معك 💪</small>`, {force: true, ms: 7000}), 300);
        return r;
      };
    }
    // ترتيب الجملة في صفحة القواعد
    if(typeof checkOrder === 'function'){
      const base = checkOrder;
      checkOrder = window.checkOrder = function(pid, sk){
        let built = null, right = null;
        try{
          if(ORD[pid].length >= S[sk].t.length){
            built = ORD[pid].map(j => S[sk].t[j][0]); right = S[sk].t.map(t => t[0]);
          }
        }catch(e){}
        const r = mute(base, this, arguments);
        if(built){
          if(built.join('|') === right.join('|')) good('<span class="hz">' + right.join('') + '</span>');
          else {
            const pat = (typeof PATTERNS !== 'undefined' && PATTERNS || []).find(p => p.id === pid || p.drill === sk);
            let where = built.findIndex((w, i) => w !== right[i]);
            bad('الصحيح: <bdi dir="ltr" class="hz">' + right.join(' ') + '</bdi>'
              + (where >= 0 ? '<br>أول خطأ: الكلمة رقم ' + (where + 1) + ' لازم تكون <span class="hz">' + right[where] + '</span>' : '')
              + (pat && pat.f ? '<br>القاعدة: ' + pat.f : '<br>تذكّر: الفاعل ثم الفعل ثم الباقي'));
          }
        }
        return r;
      };
    }
    // أي رسالة صح/خطأ أخرى في التطبيق
    if(typeof toast === 'function'){
      const base = toast;
      toast = window.toast = function(m){
        const r = base.apply(this, arguments);
        if(quiet) return r;
        try{
          const t = String(m || '');
          if(/^✓\s*(صحيح|أحسنت|ممتاز)/.test(t)) good();
          else if(/غير صحيح|^✗|خطأ —/.test(t)) bad(t.replace(/^✗\s*/, ''));
        }catch(e){}
        return r;
      };
    }
    // بطاقات المفردات
    if(typeof gradeCur === 'function'){
      const base = gradeCur;
      gradeCur = window.gradeCur = function(g){ const r = base.apply(this, arguments); if(g){ if(Math.random() < .45) good(); } else say('info', '<b>تمام، بترجع لك قريبًا 🔁</b><small>اسمعها مرتين وقلها بصوت عالي</small>'); return r; };
    }
    // الكتابة بالإصبع (كل أنواعها)
    if(typeof HanziWriter !== 'undefined' && !HanziWriter.__av){
      HanziWriter.__av = true;
      const create = HanziWriter.create;
      HanziWriter.create = function(){
        const w = create.apply(this, arguments), quiz = w.quiz.bind(w);
        w.quiz = function(o){
          o = o || {}; const om = o.onMistake, oc = o.onComplete; let warned = -1;
          return quiz(Object.assign({}, o, {
            onMistake(d){ try{ if(d.mistakesOnStroke === 2 && warned !== d.strokeNum){ warned = d.strokeNum; say('bad', '<b>انتبه لاتجاه الخط 👀</b><small>الخط رقم ' + (d.strokeNum + 1) + ' — ابدأه من المكان الصحيح، والتلميح بيطلع لك</small>'); } }catch(e){} return om && om.apply(this, arguments); },
            onComplete(d){ try{ d.totalMistakes === 0 ? good('كتبته بدون ولا غلطة') : say('info', '<b>كتبته ✓</b><small>عندك ' + d.totalMistakes + ' أخطاء — المرة الجاية بدونها 💪</small>'); }catch(e){} return oc && oc.apply(this, arguments); }
          }));
        };
        return w;
      };
    }
    // النطق والإملاء: نراقب النتائج حين تظهر
    new MutationObserver(list => {
      for(const m of list) for(const n of m.addedNodes){
        if(n.nodeType !== 1) continue;
        const pr = n.matches('.pron-res') ? n : n.querySelector && n.querySelector('.pron-res');
        if(pr){
          const sc = parseInt((pr.querySelector('.pron-score') || {}).textContent, 10);
          if(!isNaN(sc)){
            const tip = pr.querySelector('.pron-syl .no small');
            sc >= 85 ? good('نطقك ' + sc + '/100 🎤') : sc >= 60 ? say('info', '<b>قريب! ' + sc + '/100</b><small>' + (tip ? tip.textContent : 'اسمع النطق الصحيح وقلّده') + '</small>') : bad((tip ? tip.textContent + ' — ' : '') + 'اسمع النطق الصحيح ثم جرّب مرة ثانية');
          }
        }
        const dict = n.closest && n.closest('#dictBody');
        if(dict){
          const res = dict.querySelector('.note.g > b, .note.r > b');
          if(res && !res.__av){ res.__av = true; res.closest('.note.g') ? good() : bad('اسمعها ببطء 🐢 وركّز على النغمات'); }
        }
      }
    }).observe(document.body, {childList: true, subtree: true});
    window.addEventListener('resize', place);
    document.addEventListener('pointerup', () => setTimeout(place, 0));
  }

  /* ---------- إعداد التشغيل والإيقاف ---------- */
  function settings(){
    const set = document.querySelector('#mdSet .sheet'); if(!set || document.getElementById('avRow')) return;
    const anchor = [...set.querySelectorAll('p')].find(p => p.textContent.includes('المعلّم الذكي'));
    const box = document.createElement('div'); box.id = 'avRow';
    box.innerHTML = `<p style="margin:2px 0 4px"><b>شكل المعلّم</b> <span class="sml muted">(الشخصية تشجّعك وتوضّح أخطاءك)</span></p>
      <div class="row eq" style="margin-bottom:12px"><button class="btn sm" data-av="1">🧑‍🏫 الشخصية</button><button class="btn o sm" data-av="0">💬 زر صغير</button></div>`;
    anchor ? set.insertBefore(box, anchor) : set.appendChild(box);
    const paint = () => box.querySelectorAll('[data-av]').forEach(b => b.classList.toggle('o', (b.dataset.av === '1') !== on()));
    box.addEventListener('click', ev => {
      const b = ev.target.closest('[data-av]'); if(!b) return;
      state.set.avatarOff = b.dataset.av !== '1'; save(); apply(); paint();
      if(on()) say('hi', '<b>أهلًا! رجعت 👋</b>', {force: true});
    });
    paint();
  }

  function init(){
    if(typeof state === 'undefined' || !document.querySelector('.fab') || typeof resolveQ !== 'function') return setTimeout(init, 200);
    if(!build()) return;
    hooks(); settings();
    window.tutorSay = say;
    if(on() && !sessionStorage.getItem('avHi')){
      try{ sessionStorage.setItem('avHi', '1'); }catch(e){}
      setTimeout(() => say('hi', '<b>أهلًا! أنا معلّمك 👋</b><small>بشجّعك وأوضّح لك أخطاءك. اضغط عليّ لأي سؤال، واسحبني لأي مكان.</small>', {force: true, ms: 7000}), 1600);
    }
  }
  init();
})();
