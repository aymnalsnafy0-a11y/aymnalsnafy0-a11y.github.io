/* أصوات تفاعلية مولّدة داخل المتصفح (بدون ملفات): صح، خطأ، سلسلة صح، نهاية التمرين، ضغطة خفيفة */
(function(){
  'use strict';
  let ctx = null, master = null;
  const enabled = () => !(typeof state !== 'undefined' && state.set && state.set.sfxOff);
  function ac(){
    if(!ctx){
      const C = window.AudioContext || window.webkitAudioContext; if(!C) return null;
      ctx = new C(); master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination);
    }
    if(ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // نفتح الصوت مع أول لمسة (شرط في آيفون)
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if(enabled()) ac(); }, {once: true, passive: true, capture: true}));

  // نغمة واحدة: تردد، بداية، مدة، شكل الموجة، الارتفاع
  function tone(f, t0, dur, type, vol, glideTo){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if(glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + .012);
    g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + .05);
  }
  // جرس لامع: نغمة أساسية + توافقية خفيفة
  function bell(f, t0, dur, vol){ tone(f, t0, dur, 'sine', vol); tone(f * 2, t0, dur * .6, 'sine', vol * .25); tone(f * 3.01, t0, dur * .35, 'triangle', vol * .08); }

  const SOUNDS = {
    good(t){ bell(1046.5, t, .22, .42); bell(1568, t + .09, .45, .38); },                 // دو ← صول
    streak(t){ [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(f, t + i * .075, .4, .32)); },
    bad(t){
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(master);
      [[392, 0, .16], [311, .13, .3]].forEach(([f, d, dur]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square';
        o.frequency.setValueAtTime(f, t + d); o.frequency.exponentialRampToValueAtTime(f * .92, t + d + dur);
        g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.16, t + d + .015); g.gain.exponentialRampToValueAtTime(.0008, t + d + dur);
        o.connect(g); g.connect(lp); o.start(t + d); o.stop(t + d + dur + .05);
      });
    },
    finish(t){ [[523.25, 0], [659.25, .12], [783.99, .24], [1046.5, .36]].forEach(([f, d]) => bell(f, t + d, .35, .34)); bell(1318.5, t + .52, .9, .3); bell(1046.5, t + .52, .9, .22); },
    fail(t){ [[523.25, 0], [440, .16], [392, .32]].forEach(([f, d]) => bell(f, t + d, .35, .26)); },
    tap(t){ tone(1800, t, .05, 'sine', .12, 1200); },
    stroke(t){ tone(880, t, .09, 'triangle', .12, 1320); },
    hi(t){ bell(784, t, .2, .22); bell(1175, t + .1, .35, .2); }
  };
  let last = {};
  function play(name){
    if(!enabled() || !SOUNDS[name]) return;
    const now = performance.now();
    if(last[name] && now - last[name] < 60) return;
    last[name] = now;
    if(!ac()) return;
    try{ SOUNDS[name](ctx.currentTime + .01); }catch(e){}
  }
  window.SFX = {play};

  /* ضغطات خفيفة عند اختيار الكلمات في تمارين الترتيب */
  function hooks(){
    if(typeof qPick !== 'function' || typeof pickOrder !== 'function') return setTimeout(hooks, 200);
    const a = qPick; qPick = window.qPick = function(){ play('tap'); return a.apply(this, arguments); };
    const b = pickOrder; pickOrder = window.pickOrder = function(){ play('tap'); return b.apply(this, arguments); };
    // إعداد التشغيل والإيقاف
    const box = document.getElementById('avRow');
    if(box && !document.getElementById('sfxOn')){
      const l = document.createElement('label'); l.className = 'sml';
      l.style.cssText = 'display:flex;gap:8px;align-items:center;margin:-6px 0 12px';
      l.innerHTML = '<input type="checkbox" id="sfxOn"> 🔔 أصوات التفاعل (صح، خطأ، إنجاز)';
      box.appendChild(l);
      const c = l.querySelector('input'); c.checked = enabled();
      c.onchange = () => { state.set.sfxOff = !c.checked; save(); if(c.checked) play('good'); };
    } else if(!box) return setTimeout(hooks, 300);
  }
  hooks();
})();
