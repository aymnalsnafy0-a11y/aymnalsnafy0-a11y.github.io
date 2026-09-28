/* أصوات الدروس المضافة من الصور: تُولَّد بنماذج الصوت من Google (Gemini TTS) بمفتاح الطالب،
   وتُحفظ في الجهاز (IndexedDB)، فتُنطق مثل الدروس الأصلية تمامًا — كلمات وجمل وحروف ومعانٍ عربية.
   نطلب عدة أسطر في تسجيل واحد ثم نقسّمه عند أطول السكتات (عدد الأسطر معروف)، مع فحص يرفض أي تقسيم مشكوك فيه. */
(function(){
  'use strict';
  const MODELS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-lite-tts'];
  const VOICE = { f: 'Kore', m: 'Puck' };
  const BATCH = 12, OUT_RATE = 16000;
  const NORM = s => String(s).replace(/[。，？！、,.?!；：\s…“”"'（）()]/g, '');
  const arSay = t => String(t).replace(/\s*\([٠-٩0-9]+\)/g, '').replace(/\s*\/\s*/g, '، أو ').replace(/[()]/g, '، ');

  /* ---------- التخزين ---------- */
  const MAP = { zh: {}, ar: {} }; // key → objectURL
  let dbp = null;
  function db(){
    if(dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if(!window.indexedDB) return rej(new Error('noidb'));
      const r = indexedDB.open('hsk_audio', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('clips');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function put(id, blob){ return db().then(d => new Promise((res, rej) => { const t = d.transaction('clips', 'readwrite'); t.objectStore('clips').put(blob, id); t.oncomplete = res; t.onerror = () => rej(t.error); })); }
  function loadAll(){
    return db().then(d => new Promise(res => {
      const t = d.transaction('clips', 'readonly'), st = t.objectStore('clips'), rq = st.openCursor();
      rq.onsuccess = () => { const c = rq.result; if(!c) return res(); const [lang, key] = String(c.key).split('|'); if(MAP[lang]) MAP[lang][key] = URL.createObjectURL(c.value); c.continue(); };
      rq.onerror = () => res();
    })).catch(() => {});
  }
  const ready = loadAll();

  window.LocalAudio = {
    src(lang, text){ const k = lang === 'zh' ? NORM(text) : String(text); return (MAP[lang] && MAP[lang][k]) || ''; },
    ready
  };

  /* ---------- ما الذي ينقصه صوت؟ ---------- */
  function hasAudio(lang, text){
    const idx = window.AUDIO_INDEX && window.AUDIO_INDEX[lang];
    const k = lang === 'zh' ? NORM(text) : String(text);
    return !!((idx && idx[k]) || MAP[lang][k]);
  }
  function missingFor(lessons){
    const zh = new Map(), ar = new Map();
    const addZh = t => { const k = NORM(t); if(k && /[一-鿿]/.test(k) && !hasAudio('zh', t) && !zh.has(k)) zh.set(k, String(t)); };
    const addAr = t => { if(t && !hasAudio('ar', t) && !ar.has(t)) ar.set(t, String(t)); };
    lessons.forEach(L => {
      (L.words || []).forEach(w => { addZh(speakHz(w)); w.ch.forEach(c => addZh(c[0])); addAr(w.m); });
      Object.keys(L.sents || {}).forEach(k => { const s = L.sents[k]; addZh(sentHz(k, L.sents)); s.t.forEach(t => addZh(t[0])); addAr(s.ar); });
    });
    return { zh: [...zh.entries()], ar: [...ar.entries()] };
  }
  function packLessons(){ return (state.packs || []).map(p => p.lesson || p).map(p => LESSONS.find(l => l.id === p.id)).filter(Boolean); }
  window.LocalAudio.missing = () => { const m = missingFor(packLessons()); return m.zh.length + m.ar.length; };

  /* ---------- أصوات Microsoft العصبية (نفس أصوات الدروس الأصلية) ----------
     خدمة «القراءة بصوت عالٍ» في Edge. غير رسمية: إن تعطّلت نرجع تلقائيًا إلى Gemini TTS. */
  const EDGE_VOICES = { zh: { f: 'zh-CN-XiaoxiaoNeural', m: 'zh-CN-YunxiNeural' }, ar: { f: 'ar-SA-ZariyahNeural', m: 'ar-SA-HamedNeural' } };
  const EDGE_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4', EDGE_VER = '1-143.0.3650.75';
  // الحروف متعددة النطق وحدها: نولّدها بحرف مطابق لنطق الدرس
  const HOMO = { '觉': '叫', '还': '孩', '教': '叫', '系': '细' };
  const uuid = () => ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  async function gec(){
    let s = Math.floor(Date.now() / 1000) + 11644473600; s -= s % 300;
    const str = (BigInt(s) * 10000000n).toString() + EDGE_TOKEN;
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let edgeBroken = 0;
  async function edgeTTS(text, voice){
    const url = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=' + EDGE_TOKEN
      + '&ConnectionId=' + uuid().replace(/-/g, '') + '&Sec-MS-GEC=' + await gec() + '&Sec-MS-GEC-Version=' + EDGE_VER;
    return new Promise((res, rej) => {
      let ws; try{ ws = new WebSocket(url); }catch(e){ return rej(e); }
      ws.binaryType = 'arraybuffer';
      const chunks = [], ts = new Date().toString();
      const timer = setTimeout(() => { try{ ws.close(); }catch(_){} rej(new Error('timeout')); }, 20000);
      ws.onopen = () => {
        ws.send('X-Timestamp:' + ts + '\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n'
          + '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n');
        ws.send('X-RequestId:' + uuid().replace(/-/g, '') + '\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:' + ts + 'Z\r\nPath:ssml\r\n\r\n'
          + "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='" + voice + "'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>"
          + xmlEsc(text) + '</prosody></voice></speak>');
      };
      ws.onmessage = ev => {
        if(typeof ev.data === 'string'){ if(ev.data.indexOf('Path:turn.end') >= 0){ clearTimeout(timer); ws.close(); chunks.length ? res(new Blob(chunks, { type: 'audio/mpeg' })) : rej(new Error('empty')); } return; }
        const b = new Uint8Array(ev.data); if(b.length < 2) return;
        const hl = (b[0] << 8) | b[1], head = new TextDecoder().decode(b.subarray(2, hl + 2));
        if(head.indexOf('Path:audio') >= 0) chunks.push(b.subarray(hl + 2));
      };
      ws.onerror = () => { clearTimeout(timer); rej(new Error('ws')); };
      ws.onclose = () => { clearTimeout(timer); };
    });
  }
  async function runEdge(lang, list, g, prog){
    let done = 0, fails = 0; const q = list.slice();
    async function worker(){
      while(q.length){
        const [key, text] = q.shift();
        const say = lang === 'ar' ? arSay(text) : (HOMO[NORM(text)] || text);
        try{
          const blob = await edgeTTS(say, EDGE_VOICES[lang][g]);
          await put(lang + '|' + key, blob); MAP[lang][key] = URL.createObjectURL(blob); done++; prog(done);
        }catch(e){ fails++; if(fails >= 3 && !done){ edgeBroken = Date.now(); throw Object.assign(new Error('edge'), { code: 'edge' }); } }
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()]);
    return done;
  }

  /* ---------- Gemini TTS (احتياطي) ---------- */
  const spent = () => { const s = state.set.ttsSpent; if(!s || s.day !== today()) state.set.ttsSpent = { day: today(), m: {} }; return state.set.ttsSpent.m; };
  async function ttsCall(text, g){
    const key = typeof aiKey === 'function' ? aiKey() : '';
    if(!key) throw Object.assign(new Error('nokey'), { code: 'nokey' });
    let last;
    for(const model of MODELS){
      if(spent()[model]) continue;
      for(let attempt = 0; attempt < 2; attempt++){
        let r;
        try{
          r = await fetch(AI_PROVIDERS.gemini.base + 'models/' + model + ':generateContent', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE[g] || 'Kore' } } } } })
          });
        }catch(e){ last = Object.assign(new Error('offline'), { code: 'offline' }); await new Promise(z => setTimeout(z, 1500)); continue; }
        if(r.ok){
          const j = await r.json();
          const p = j.candidates && j.candidates[0] && j.candidates[0].content && (j.candidates[0].content.parts || []).find(x => x.inlineData);
          if(!p) { last = Object.assign(new Error('empty'), { code: 'empty' }); break; }
          return decode(p.inlineData);
        }
        const body = await r.text();
        last = Object.assign(new Error('http ' + r.status), { code: r.status === 429 ? 'quota' : 'http', status: r.status });
        if(r.status === 429){ if(/PerDay/i.test(body) || attempt){ spent()[model] = 1; save(); break; } await new Promise(z => setTimeout(z, 3000)); continue; }
        if(r.status === 404 || r.status === 400){ spent()[model] = 1; save(); break; }
        await new Promise(z => setTimeout(z, 2000));
      }
    }
    throw last || Object.assign(new Error('quota'), { code: 'quota' });
  }
  function decode(inl){
    const bin = atob(inl.data), u8 = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    let off = 0, rate = 24000;
    const m = /rate=(\d+)/.exec(inl.mimeType || ''); if(m) rate = Number(m[1]);
    if(u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46){
      const dv = new DataView(u8.buffer); rate = dv.getUint32(24, true);
      for(let i = 12; i < u8.length - 8; i++){ if(u8[i] === 0x64 && u8[i+1] === 0x61 && u8[i+2] === 0x74 && u8[i+3] === 0x61){ off = i + 8; break; } }
    }
    const n = Math.floor((u8.length - off) / 2), pcm = new Int16Array(n), dv = new DataView(u8.buffer, off);
    for(let i = 0; i < n; i++) pcm[i] = dv.getInt16(i * 2, true);
    return { pcm, rate };
  }

  /* ---------- التقسيم عند أطول السكتات ---------- */
  function splitN(a, n){
    const fr = Math.round(a.rate * 0.02), thr = 600, en = [];
    for(let i = 0; i < a.pcm.length; i += fr){ let m = 0; for(let j = i; j < Math.min(i + fr, a.pcm.length); j++){ const v = Math.abs(a.pcm[j]); if(v > m) m = v; } en.push(m > thr); }
    const first = en.indexOf(true), last = en.lastIndexOf(true); if(first < 0) return null;
    const gaps = [];
    for(let i = first; i <= last; i++){ if(!en[i]){ let j = i; while(j <= last && !en[j]) j++; gaps.push({ len: j - i, a: i, b: j }); i = j; } }
    if(gaps.length < n - 1) return null;
    const byLen = gaps.slice().sort((x, y) => y.len - x.len), cuts = byLen.slice(0, n - 1), rest = byLen.slice(n - 1);
    // فحص: السكتة الفاصلة يجب أن تكون أطول بوضوح من أي وقفة داخلية
    const minCut = n > 1 ? Math.min(...cuts.map(c => c.len)) : 99, maxRest = rest.length ? rest[0].len : 0;
    if(n > 1 && (minCut < 18 || minCut < maxRest * 1.5)) return null;
    cuts.sort((x, y) => x.a - y.a);
    const segs = []; let s = first;
    cuts.forEach(c => { segs.push([s, c.a]); s = c.b; }); segs.push([s, last + 1]);
    const pad = 5; // 100ms هامش
    return segs.map(([x, y]) => [Math.max(0, x - pad) * fr, Math.min(en.length, y + pad) * fr]);
  }
  function wav(pcm, rate){
    const ratio = rate / OUT_RATE, n = Math.floor(pcm.length / ratio), out = new Int16Array(n);
    for(let i = 0; i < n; i++) out[i] = pcm[Math.floor(i * ratio)];
    const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (p, s) => { for(let i = 0; i < s.length; i++) v.setUint8(p + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, OUT_RATE, true); v.setUint32(28, OUT_RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    new Int16Array(buf, 44).set(out); return new Blob([buf], { type: 'audio/wav' });
  }
  // مدة معقولة لكل سطر: صيني ≈ 0.1–0.9 ث للحرف، عربي ≈ 0.04–0.35 ث للحرف
  function plausible(lang, lines, segs, rate){
    return segs.every(([a, b], i) => {
      const sec = (b - a) / rate, len = Math.max(1, NORM(lines[i][1]).length);
      return lang === 'zh' ? (sec / len > 0.09 && sec / len < 1.1 && sec < 14) : (sec / len > 0.03 && sec / len < 0.4 && sec < 16);
    });
  }
  async function batch(lang, lines, g){
    const say = lines.map(([k, t]) => lang === 'ar' ? arSay(t) : t);
    const a = await ttsCall(say.join('\n\n'), g);
    const segs = splitN(a, lines.length);
    if(!segs || !plausible(lang, lines, segs, a.rate)) return false;
    for(let i = 0; i < lines.length; i++){
      const blob = wav(a.pcm.subarray(segs[i][0], segs[i][1]), a.rate), key = lines[i][0];
      await put(lang + '|' + key, blob); MAP[lang][key] = URL.createObjectURL(blob);
    }
    return true;
  }
  async function runLang(lang, list, g, prog){
    const q = [list.slice()]; let done = 0;
    while(q.length){
      const cur = q.shift(); if(!cur.length) continue;
      for(let i = 0; i < cur.length; i += BATCH){
        const part = cur.slice(i, i + BATCH);
        let ok = false;
        try{ ok = await batch(lang, part, g); }
        catch(e){ if(e.code === 'quota' || e.code === 'nokey' || e.code === 'offline') throw e; }
        if(ok){ done += part.length; prog(done); }
        else if(part.length > 1){ const h = Math.ceil(part.length / 2); q.push(part.slice(0, h), part.slice(h)); }
        await new Promise(z => setTimeout(z, 800));
      }
    }
    return done;
  }

  /* ---------- التشغيل مع لوحة تقدّم ---------- */
  let busy = false;
  async function prepare(opts){
    opts = opts || {};
    if(busy) return; await ready;
    const miss = missingFor(opts.lessons || packLessons()), total = miss.zh.length + miss.ar.length;
    if(!total){ if(opts.verbose) toast('✓ كل الدروس المضافة أصواتها جاهزة'); return; }
    if(typeof aiReady === 'function' && !aiReady()){ if(opts.verbose) toast('الأصوات تحتاج المعلّم الذكي — فعّله من ⚙'); return; }
    busy = true; paintBar(0, total);
    const g = state.set.zhVoice === 'm' ? 'm' : 'f', ga = state.set.arVoice === 'm' ? 'm' : 'f';
    let done = 0;
    try{
      // أولًا: نفس أصوات الدروس الأصلية (Microsoft)، ثم Gemini لما تبقّى
      if(!edgeBroken || Date.now() - edgeBroken > 3600000){
        try{
          done += await runEdge('zh', miss.zh, g, n => paintBar(n, total));
          const b0 = done; done += await runEdge('ar', miss.ar, ga, n => paintBar(b0 + n, total));
        }catch(e){ /* الخدمة غير متاحة الآن: نكمل بـ Gemini */ }
      }
      const left2 = missingFor(opts.lessons || packLessons());
      const base0 = total - left2.zh.length - left2.ar.length;
      done = base0;
      done += await runLang('zh', left2.zh, g, n => paintBar(base0 + n, total));
      const base = done;
      done += await runLang('ar', left2.ar, ga, n => paintBar(base + n, total));
      const left = window.LocalAudio.missing();
      paintBar(total - left, total, left ? '⚠ بقي ' + left + ' مقطعًا — سأكملها لاحقًا' : '✓ الأصوات جاهزة مثل الدروس الأصلية');
    }catch(e){
      const left = window.LocalAudio.missing();
      paintBar(total - left, total, e.code === 'quota' ? '⏸ انتهت حصة الأصوات اليوم — تكتمل تلقائيًا غدًا (بقي ' + left + ')' : '⏸ توقّف تجهيز الأصوات — سأكمل لاحقًا (بقي ' + left + ')');
    }finally{ busy = false; setTimeout(() => { const b = document.getElementById('ttsBar'); if(b && !busy) b.remove(); }, 6000); }
  }
  window.LocalAudio.prepare = prepare;
  function paintBar(n, total, msg){
    let b = document.getElementById('ttsBar');
    if(!b){ b = document.createElement('div'); b.id = 'ttsBar'; document.body.appendChild(b); }
    const pct = Math.round(n / Math.max(1, total) * 100);
    b.innerHTML = `<b>🔊 ${msg || 'أجهّز أصوات الدرس… ' + n + ' / ' + total}</b><i><u style="width:${pct}%"></u></i>`;
  }

  // بعد تركيب درس من الصور: جهّز أصواته فورًا. وعند فتح التطبيق: أكمل أي أصوات ناقصة.
  if(typeof prevInstall === 'function'){
    const base = prevInstall;
    window.prevInstall = prevInstall = function(){ const r = base.apply(this, arguments); setTimeout(() => prepare({}), 800); return r; };
  }
  ready.then(() => setTimeout(() => {
    const ls = packLessons(); if(!ls.length) return;
    // بيانات رسم الحروف للدروس المضافة (لتمرين الكتابة وصور الحفظ)
    if(typeof ensureStrokes === 'function') ensureStrokes([...new Set(ls.flatMap(l => l.words.flatMap(w => w.ch.map(c => c[0]))))]).catch(() => {});
    if(window.LocalAudio.missing()) prepare({});
  }, 4000));
})();
