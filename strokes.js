/* أنواع الخطوط الصينية: تلوين كل نوع بلون، خطوة واحدة في كل ضغطة، واسم الخط مع تمرين عليه وحده */
(function(){
  'use strict';

  /* ---------- تصنيف الخط من مساره الأوسط (median) ---------- */
  // بيانات hanzi-writer: مربّع 1024، المحور y للأعلى. نحوّله لاتجاه الشاشة (y للأسفل).
  function rdp(pts, eps){
    if(pts.length < 3) return pts.slice();
    const [a, b] = [pts[0], pts[pts.length-1]];
    let best = -1, idx = 0;
    const dx = b[0]-a[0], dy = b[1]-a[1], L = Math.hypot(dx, dy) || 1;
    for(let i = 1; i < pts.length-1; i++){
      const d = Math.abs(dy*pts[i][0] - dx*pts[i][1] + b[0]*a[1] - b[1]*a[0]) / L;
      if(d > best){ best = d; idx = i; }
    }
    if(best <= eps) return [a, b];
    return rdp(pts.slice(0, idx+1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
  }
  const ang = (p, q) => Math.atan2(-(q[1]-p[1]), q[0]-p[0]) * 180 / Math.PI; // موجب = للأسفل
  function dirOf(a){
    if(a >= -22 && a < 22) return 'H';
    if(a >= 22 && a < 62) return 'N';
    if(a >= 62 && a < 112) return 'V';
    if(a >= 112 && a <= 180) return 'P';
    if(a < -22 && a >= -80) return 'T';
    if(a < -150) return 'L';          // لليسار أفقيًا
    return 'U';                        // للأعلى / أعلى يسار
  }
  function classify(median){
    const pts = median.map(p => [p[0], p[1]]);
    let total = 0; for(let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]);
    let segs = [];
    const s = rdp(pts, Math.max(22, total * .07));
    for(let i = 1; i < s.length; i++){
      const len = Math.hypot(s[i][0]-s[i-1][0], s[i][1]-s[i-1][1]);
      segs.push({d: dirOf(ang(s[i-1], s[i])), a: ang(s[i-1], s[i]), len});
    }
    // الخطّاف: جزء أخير قصير يغيّر الاتجاه
    let hook = false;
    if(segs.length > 1){
      const last = segs[segs.length-1], prev = segs[segs.length-2];
      const short = last.len < Math.max(150, total * .25) && last.len < 260;
      if(short && (last.d === 'U' || last.d === 'L' || (last.d === 'T' && prev.d !== 'V' && prev.d !== 'H') ||
                   (last.d === 'P' && (prev.d === 'H' || prev.d === 'V' || prev.d === 'N')))){
        hook = true; segs.pop();
      }
    }
    // حذف الأجزاء الانتقالية القصيرة ودمج المتشابهة
    segs = segs.filter((g, i) => i === 0 || i === segs.length-1 || g.len > total * .12);
    const merged = [];
    segs.forEach(g => { const p = merged[merged.length-1]; if(p && p.d === g.d){ p.len += g.len; } else merged.push({...g}); });
    let code = merged.map(g => g.d === 'L' ? 'P' : g.d === 'U' ? 'T' : g.d).join('');
    if(merged.length === 1 && !hook && total < 230 && ['N','V','P'].includes(code)) code = 'D';
    if(merged.length === 1 && !hook && total < 190 && code === 'T') code = 'T';
    return code + (hook ? 'G' : '');
  }

  /* ---------- الأسماء ---------- */
  const PY = {'卧':'wò','横':'héng','竖':'shù','撇':'piě','捺':'nà','点':'diǎn','提':'tí','折':'zhé','钩':'gōu','弯':'wān','斜':'xié'};
  const FIXED = {
    H:'横', V:'竖', P:'撇', N:'捺', D:'点', T:'提',
    HV:'横折', HP:'横撇', HG:'横钩', HVG:'横折钩', HPG:'横折钩', HVT:'横折提', HPT:'横折提',
    HVHG:'横折弯钩', HPHG:'横折弯钩', HVNG:'横折弯钩', HNG:'横斜钩', HPNG:'横撇弯钩', HPVG:'横折折折钩', HPHPG:'横折折折钩',
    HVH:'横折弯', HPH:'横折弯', HPHP:'横折折撇', HPNP:'横折折撇',
    VG:'竖钩', VH:'竖折', VT:'竖提', VHG:'竖弯钩', VNHG:'竖弯钩', VNG:'竖弯钩', VHVG:'竖折折钩', VHPG:'竖折折钩', VHV:'竖折折', VHP:'竖折撇',
    PH:'撇折', PT:'撇折', PN:'撇点', PD:'撇点', PG:'竖钩',
    NG:'斜钩', DG:'斜钩', NT:'斜钩', NH:'捺', DH:'点', PV:'撇', VP:'撇', VN:'捺', ND:'捺'
  };
  function nameOf(code){
    if(FIXED[code]) return FIXED[code];
    const base = {H:'横',V:'竖',P:'撇',N:'捺',D:'点',T:'提'};
    let n = base[code[0]] || '折';
    for(let i = 1; i < code.length; i++){
      const c = code[i];
      n += c === 'G' ? '钩' : c === 'P' ? '撇' : c === 'T' ? '提' : c === 'N' ? '弯' : '折';
    }
    return n;
  }
  const AR = {
    '横':['أفقي','خط أفقي يُكتب من اليسار إلى اليمين'],
    '竖':['عمودي','خط مستقيم من الأعلى إلى الأسفل'],
    '撇':['مائل لليسار','ينزل من الأعلى مائلًا إلى اليسار ويَرِقّ في آخره'],
    '捺':['مائل لليمين','ينزل مائلًا إلى اليمين ويتّسع ثم يَرِقّ في آخره'],
    '点':['نقطة','ضغطة قصيرة مائلة للأسفل'],
    '提':['صاعد','يبدأ عريضًا ويصعد قصيرًا إلى اليمين'],
    '横折':['أفقي ثم عمودي','أفقي إلى اليمين ثم ينكسر للأسفل (زاوية)'],
    '横撇':['أفقي ثم مائل','أفقي إلى اليمين ثم ينكسر مائلًا لليسار'],
    '横钩':['أفقي بخطّاف','أفقي إلى اليمين ثم خطّاف صغير للأسفل يسارًا'],
    '横折钩':['أفقي، عمودي، خطّاف','أفقي ثم ينكسر للأسفل وينتهي بخطّاف لليسار'],
    '横折提':['أفقي، عمودي، صاعد','أفقي ثم ينكسر للأسفل ثم يصعد قصيرًا لليمين'],
    '横折弯钩':['أفقي، نزول، انحناء، خطّاف','أفقي ثم للأسفل ثم ينحني لليمين وينتهي بخطّاف للأعلى'],
    '横折弯':['أفقي، نزول، انحناء','أفقي ثم للأسفل ثم ينحني لليمين'],
    '横斜钩':['أفقي ثم مائل بخطّاف','أفقي ثم ينزل مائلًا لليمين وينتهي بخطّاف للأعلى'],
    '横撇弯钩':['أفقي، مائل، انحناء، خطّاف','مثل الأذن في 阝: أفقي، مائل، ينحني ثم خطّاف'],
    '横折折折钩':['ثلاث انكسارات وخطّاف','أفقي ينكسر ثلاث مرات وينتهي بخطّاف (كما في 乃)'],
    '横折折撇':['أفقي بانكسارين ثم مائل','أفقي، ينكسر، ثم أفقي قصير وينتهي مائلًا لليسار'],
    '竖钩':['عمودي بخطّاف','عمودي للأسفل وينتهي بخطّاف لليسار'],
    '竖折':['عمودي ثم أفقي','للأسفل ثم ينكسر أفقيًا لليمين'],
    '竖提':['عمودي ثم صاعد','للأسفل ثم يصعد قصيرًا لليمين'],
    '竖弯钩':['عمودي، انحناء، خطّاف','للأسفل ثم ينحني أفقيًا لليمين وينتهي بخطّاف للأعلى'],
    '竖折折钩':['عمودي بانكسارين وخطّاف','للأسفل، أفقي، للأسفل، ثم خطّاف (كما في 马)'],
    '竖折折':['عمودي بانكسارين','للأسفل، أفقي، ثم للأسفل'],
    '竖折撇':['عمودي، أفقي، مائل','للأسفل ثم أفقي ثم مائل لليسار'],
    '撇折':['مائل ثم صاعد','مائل لليسار ثم ينكسر صاعدًا لليمين (كما في 纟)'],
    '撇点':['مائل ثم نقطة','مائل لليسار ثم ينكسر نازلًا لليمين (كما في 女)'],
    '斜钩':['مائل بخطّاف','ينزل مائلًا لليمين طويلًا وينتهي بخطّاف للأعلى (كما في 我)'],
    '卧钩':['خطّاف مستلقٍ','منحنى مستلقٍ يتّجه لليمين وينتهي بخطّاف للأعلى يسارًا (كما في 心)'],
    '弯钩':['منحنٍ بخطّاف','ينزل منحنيًا قليلًا وينتهي بخطّاف لليسار (كما في 子 و 了)'],
    '竖弯':['عمودي ثم منحنٍ','للأسفل ثم ينحني أفقيًا لليمين بدون خطّاف (كما في 四)'],
    '横折折':['أفقي بانكسارين','أفقي، للأسفل، ثم أفقي'],
    '横折折折':['ثلاث انكسارات','أفقي، للأسفل، أفقي، ثم للأسفل (كما في 凸)'],
  };
  /* بيانات أنواع الخطوط الدقيقة (stroke-order.js) مع التخمين كاحتياط */
  const LETTER = {a:'横折折撇',b:'竖弯',c:'横折',d:'点',o:'横斜钩',j:'横',l:'捺',r:'横折钩',f:'竖',g:'竖钩',k:'点',s:'撇',n:'撇折',
    x:'竖折撇',w:'横撇弯钩',z:'竖折折钩',i:'提',t:'弯钩',y:'斜钩',v:'横折弯',e:'横撇',p:'横折提',q:'横折折折',h:'竖提',m:'撇点',u:'竖弯钩'};
  let ORD = null;
  function orders(){
    if(ORD) return ORD;
    const src = typeof window !== 'undefined' && window.STROKE_ORDERS; if(!src) return null;
    ORD = {}; src.split(',').forEach(x => { const c = String.fromCodePoint(x.codePointAt(0)); ORD[c] = x.slice(c.length); });
    return ORD;
  }
  function strokeName(ch, data, i){
    const o = orders(), seq = o && o[ch], med = data.medians[i];
    if(!seq || seq.length !== data.strokes.length) return nameOf(classify(med));
    const L = seq[i], code = classify(med);
    if(L === 'e') return /G$/.test(code) ? '横钩' : '横撇';
    if(L === 'y'){ const a = med[0], b = med[med.length-1]; const deg = Math.atan2(a[1]-b[1], b[0]-a[0]) * 180 / Math.PI; return deg < 35 ? '卧钩' : '斜钩'; }
    if(L === 'w' && '乃仍奶扔秀透携诱'.includes(ch)) return '横折折折钩';
    if(L === 'v' && '凹'.includes(ch)) return '横折折';
    if(L === 'x' && '鼎'.includes(ch)) return '竖折折';
    return LETTER[L] || nameOf(code);
  }
  function info(zh){
    const py = [...zh].map(c => PY[c] || '').join('');
    const ar = AR[zh] || ['خط مركّب', 'خط بعدّة انكسارات، اتبع الاتجاه كما في الحركة'];
    return {zh, py, ar: ar[0], desc: ar[1]};
  }

  /* ---------- الألوان ---------- */
  const COLORS = {
    '横':'#1f6fd1','竖':'#138a4f','撇':'#e07a10','捺':'#8a3ffc','点':'#d6336c','提':'#0e9aa7',
    '横折':'#7b4b2a','横撇':'#b8860b','横钩':'#3949ab','横折钩':'#6a1b9a','竖钩':'#2e7d32','竖弯钩':'#c2185b',
    '斜钩':'#5e35b1','撇折':'#ef6c00','撇点':'#ad1457','竖折':'#00796b','竖提':'#00838f','横折提':'#795548',
    '横斜钩':'#303f9f','弯钩':'#558b2f','卧钩':'#d84315','竖弯':'#00897b','横折弯钩':'#6d4c41','横撇弯钩':'#4527a0','竖折折钩':'#827717','横折弯':'#5d4037',
  };
  const EXTRA = ['#455a64','#8d6e63','#546e7a','#9e9d24','#bf360c','#1565c0','#4e342e','#00695c'];
  function colorOf(zh){
    if(COLORS[zh]) return COLORS[zh];
    let h = 0; for(const c of zh) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return EXTRA[h % EXTRA.length];
  }

  const api = {classify, nameOf, strokeName, info, colorOf};
  if(typeof module !== 'undefined' && module.exports){ module.exports = api; return; }
  window.StrokeTypes = api;
  if(typeof document === 'undefined') return;

  /* ---------- الرسم فوق مربّع الكتابة ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for(const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  let uid = 0;
  const medLen = m => { let L = 0; for(let i = 1; i < m.length; i++) L += Math.hypot(m[i][0]-m[i-1][0], m[i][1]-m[i-1][1]); return L; };
  const medPath = m => 'M ' + m.map(p => p[0] + ' ' + p[1]).join(' L ');

  // ينشئ طبقة SVG ملوّنة لحرف؛ strokeIdx اختياري لعرض خط واحد فقط
  function buildLayer(ch, data, opts){
    opts = opts || {};
    const svg = mk('svg', {viewBox: '0 0 1024 1024', class: 'st-layer', style: 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none'});
    const g = mk('g', {transform: 'translate(0, 900) scale(1, -1)'});
    svg.appendChild(g);
    const id = 'st' + (++uid);
    const items = [];
    data.strokes.forEach((d, i) => {
      if(opts.only != null && i !== opts.only) return;
      const inf = info(strokeName(ch, data, i));
      const col = colorOf(inf.zh);
      const cp = mk('clipPath', {id: id + '_' + i}); cp.appendChild(mk('path', {d})); g.appendChild(cp);
      const m = data.medians[i], L = medLen(m) + 40;
      const anim = mk('path', {d: medPath(m), fill: 'none', stroke: col, 'stroke-width': 180, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        'clip-path': 'url(#' + id + '_' + i + ')', 'stroke-dasharray': L + ' ' + L, 'stroke-dashoffset': L});
      const hit = mk('path', {d, fill: 'transparent', class: 'st-hit', style: 'pointer-events:all;cursor:pointer'});
      g.appendChild(anim); g.appendChild(hit);
      const it = {i, inf, col, anim, hit, L, shown: false};
      hit.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); if(opts.onPick) opts.onPick(ch, data, it); });
      hit.addEventListener('click', ev => { ev.stopPropagation(); if(opts.onPick) opts.onPick(ch, data, it); });
      items.push(it);
    });
    return {svg, items};
  }
  function show(it, on){ it.anim.style.transition = 'none'; it.anim.setAttribute('stroke-dashoffset', on ? 0 : it.L); it.shown = on; }
  function draw(it, run, check){
    return new Promise(res => {
      const dur = Math.round(260 + it.L * .75);
      show(it, false); void it.anim.getBoundingClientRect();
      it.anim.style.transition = 'stroke-dashoffset ' + dur + 'ms linear';
      it.anim.setAttribute('stroke-dashoffset', 0); it.shown = true;
      setTimeout(() => res(check ? check(run) : true), dur + 40);
    });
  }

  // تكبير الخط الواحد وتوسيطه داخل المربّع للتمرين
  function zoom(path, median){
    const nums = path.match(/-?\d+(\.\d+)?/g).map(Number);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for(let k = 0; k + 1 < nums.length; k += 2){ x0 = Math.min(x0, nums[k]); x1 = Math.max(x1, nums[k]); y0 = Math.min(y0, nums[k+1]); y1 = Math.max(y1, nums[k+1]); }
    const sc = Math.min(3, 760 / Math.max(x1 - x0, y1 - y0, 1));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const tx = v => Math.round((v - cx) * sc + 512), ty = v => Math.round((v - cy) * sc + 388);
    let n = 0;
    const d = path.replace(/-?\d+(\.\d+)?/g, m => (n++ % 2 ? ty : tx)(Number(m)));
    return {strokes: [d], medians: [median.map(p => [tx(p[0]), ty(p[1])])], radStrokes: []};
  }

  /* ---------- نافذة اسم الخط والتمرين عليه ---------- */
  let pop = null, popWriter = null, popRun = 0;
  function closePop(){ popRun++; if(popWriter){ try{ popWriter.cancelQuiz(); }catch(e){} } popWriter = null; if(pop) pop.hidden = true; }
  function openStroke(ch, data, it){
    if(!pop){
      pop = document.createElement('div'); pop.className = 'st-pop'; pop.hidden = true;
      pop.addEventListener('click', ev => { if(ev.target === pop) closePop(); });
      document.body.appendChild(pop);
    }
    closePop();
    const inf = it.inf, same = [];
    (window.__wrStrokeList || []).forEach(x => { if(x.it.inf.zh === inf.zh) same.push(x); });
    pop.innerHTML = `<div class="st-card" role="dialog" aria-label="نوع الخط">
      <div class="st-head">
        <span class="st-sw" style="background:${it.col}"></span>
        <b class="hz" style="color:${it.col}">${inf.zh}</b>
        <span class="st-py" dir="ltr">${inf.py}</span>
        <button class="btn o sm" data-a="say" title="استمع">🔊</button>
        <button class="btn o sm st-x" data-a="x">✕</button>
      </div>
      <div class="st-ar"><b>${inf.ar}</b> — ${inf.desc}</div>
      <div class="st-where">الخطوة ${it.i + 1} في <span class="hz">${ch}</span>${same.length > 1 ? ' · يتكرّر هذا النوع ' + same.length + ' مرات هنا' : ''}</div>
      <div class="st-box"><div class="st-q"></div></div>
      <div class="st-msg">ارسم الخط بإصبعك من بدايته إلى نهايته</div>
      <div class="row eq">
        <button class="btn sm" data-a="demo">▶ شاهد الحركة</button>
        <button class="btn sm g" data-a="quiz">✍️ تمرّن مرة أخرى</button>
      </div>
    </div>`;
    pop.hidden = false;
    const box = pop.querySelector('.st-q'), msg = pop.querySelector('.st-msg');
    const size = Math.min(240, window.innerWidth - 90);
    box.style.width = box.style.height = size + 'px';
    const one = zoom(data.strokes[it.i], data.medians[it.i]);
    let ok = 0;
    if(typeof HanziWriter === 'undefined'){ msg.textContent = 'أداة الكتابة غير متوفرة'; return; }
    popWriter = HanziWriter.create(box, ch, {
      width: size, height: size, padding: 6, showCharacter: false, showOutline: true,
      strokeColor: it.col, outlineColor: '#d3dfeb', highlightColor: it.col, drawingColor: '#a8393c',
      drawingWidth: Math.max(12, Math.round(size * .08)), strokeAnimationSpeed: .8,
      charDataLoader: (c, done) => done(one)
    });
    const quiz = () => {
      const run = ++popRun; popWriter.cancelQuiz(); popWriter.hideCharacter({duration: 0});
      msg.textContent = 'ارسم الخط بإصبعك من بدايته إلى نهايته';
      popWriter.quiz({showHintAfterMisses: 2, leniency: 1.1,
        onMistake(){ if(run === popRun) msg.textContent = 'حاول مرة أخرى — ابدأ من الطرف الصحيح واتبع الاتجاه'; },
        onComplete(d){ if(run !== popRun) return; ok++; msg.textContent = (d.totalMistakes ? 'جيد ✓' : 'ممتاز ✓') + ' — أتقنته ' + ok + ' مرة. ارسمه مرة أخرى'; setTimeout(() => { if(run === popRun) quiz(); }, 900); }
      });
    };
    pop.querySelector('.st-card').addEventListener('click', ev => {
      const a = ev.target.closest('[data-a]'); if(!a) return;
      const k = a.dataset.a;
      if(k === 'x') closePop();
      else if(k === 'say'){ if(typeof speak === 'function') speak(inf.zh); }
      else if(k === 'demo'){ const run = ++popRun; popWriter.cancelQuiz(); popWriter.animateCharacter({onComplete(){ if(run === popRun) setTimeout(() => { if(run === popRun) quiz(); }, 500); }}); msg.textContent = 'شاهد اتجاه الخط…'; }
      else if(k === 'quiz') quiz();
    });
    const run = ++popRun;
    popWriter.animateCharacter({onComplete(){ if(run === popRun) setTimeout(() => { if(run === popRun) quiz(); }, 400); }});
    msg.textContent = 'شاهد اتجاه الخط…';
  }
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape' && pop && !pop.hidden) closePop(); });
  window.StrokeTypes.openStroke = openStroke;

  /* ---------- دمج مع نافذة الكتابة ---------- */
  let layers = [], seq = [], stepPos = 0;
  function legend(){
    const el = document.getElementById('wrLegend'); if(!el) return;
    const seen = new Map();
    seq.forEach(x => { if(!seen.has(x.it.inf.zh)) seen.set(x.it.inf.zh, x); });
    el.innerHTML = [...seen.values()].map((x, n) => `<button class="st-lg" data-n="${seq.indexOf(x)}" style="--c:${x.it.col}"><i></i><span class="hz">${x.it.inf.zh}</span> <span dir="ltr">${x.it.inf.py}</span> · ${x.it.inf.ar}</button>`).join('')
      + (seen.size ? '<div class="st-tip">اضغط على أي خط في الرسم (أو كلك يمين) لتعرف اسمه وتتمرّن عليه وحده</div>' : '');
    el.querySelectorAll('.st-lg').forEach(b => b.onclick = () => { const x = seq[+b.dataset.n]; openStroke(x.ch, x.data, x.it); });
  }
  function attach(){
    layers = []; seq = []; stepPos = 0;
    const ents = (typeof wrEntries !== "undefined" ? wrEntries : []);
    const box = document.getElementById('hwTarget'); if(!box) return;
    const cards = box.children;
    ents.forEach((e, n) => {
      const data = window.HZ_DATA && HZ_DATA[e.ch]; const card = cards[n]; if(!data || !card) return;
      const target = card.firstChild; target.style.position = 'relative';
      const L = buildLayer(e.ch, data, {onPick: openStroke});
      target.appendChild(L.svg);
      L.items.forEach(it => { show(it, true); seq.push({ch: e.ch, data, it}); });
      layers.push({e, L});
    });
    window.__wrStrokeList = seq;
    legend();
  }
  function setLayers(visible){ layers.forEach(l => l.L.svg.style.display = visible ? '' : 'none'); }
  window.StrokeTypes.layers = setLayers;
  function hideWriterChars(){ ((typeof wrEntries !== "undefined" ? wrEntries : [])).forEach(e => { if(e.writer) e.writer.hideCharacter({duration: 0}); }); }
  const msg = t => { const m = document.getElementById('wrMsg'); if(m) m.innerHTML = t; };
  const label = x => `<span class="hz">${x.ch}</span> · الخطوة ${x.it.i + 1}: <span style="color:${x.it.col}"><span class="hz">${x.it.inf.zh}</span> <span dir="ltr">${x.it.inf.py}</span></span> — ${x.it.inf.ar}`;

  function wrStep(){
    if(!seq.length) return;
    closePop();
    if(typeof stopWriters === 'function') stopWriters();
    const run = window.__wrRunTok = (window.__wrRunTok || 0) + 1;
    hideWriterChars(); setLayers(true);
    if(stepPos === 0 || stepPos >= seq.length){ seq.forEach(x => show(x.it, false)); stepPos = 0; }
    const x = seq[stepPos++];
    draw(x.it, run);
    msg(label(x) + ` <small>(${stepPos}/${seq.length})</small>`);
    const s = document.getElementById('wrSteps');
    if(s) s.textContent = stepPos >= seq.length ? 'اكتمل ✓ — اضغط «خطوة واحدة» للبدء من جديد' : 'اضغط «خطوة واحدة» للخطوة التالية';
  }
  async function animateAll(){
    if(!seq.length) return false;
    closePop();
    if(typeof stopWriters === 'function') stopWriters();
    const run = window.__wrRunTok = (window.__wrRunTok || 0) + 1;
    hideWriterChars(); setLayers(true); stepPos = 0;
    seq.forEach(x => show(x.it, false));
    for(const x of seq){
      if(run !== window.__wrRunTok) return true;
      msg(label(x));
      await draw(x.it, run);
      await new Promise(r => setTimeout(r, 180));
    }
    if(run === window.__wrRunTok){ msg('اكتمل عرض الخطوات ✓ — اضغط على أي خط لتعرف اسمه'); stepPos = seq.length; }
    return true;
  }

  function hook(){
    if(typeof pickChar !== 'function') return setTimeout(hook, 200);
    const basePick = pickChar;
    pickChar = window.pickChar = function(){ closePop(); const r = basePick.apply(this, arguments); try{ attach(); }catch(e){ console.warn(e); } return r; };
    const baseStop = stopWriters;
    stopWriters = window.stopWriters = function(){ window.__wrRunTok = (window.__wrRunTok || 0) + 1; return baseStop.apply(this, arguments); };
    const baseAnim = wrAnimate;
    wrAnimate = window.wrAnimate = function(){ return seq.length ? animateAll() : baseAnim.apply(this, arguments); };
    const baseQuiz = wrQuiz;
    wrQuiz = window.wrQuiz = function(){ closePop(); setLayers(false); stepPos = 0; return baseQuiz.apply(this, arguments); };
    window.wrStep = wrStep;
    const baseClose = window.closeModal;
    if(typeof baseClose === 'function') closeModal = window.closeModal = function(id){ if(id === 'mdWrite') closePop(); return baseClose.apply(this, arguments); };
  }
  hook();
})();
