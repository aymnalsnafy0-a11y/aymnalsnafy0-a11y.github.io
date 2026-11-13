/* الحقوق: اسم صاحب التطبيق داخل الواجهة، وتنبيه إذا شُغّل التطبيق من نسخة منسوخة على موقع آخر */
(function(){
  'use strict';
  var ORIGINAL = 'https://aymnalsnafy0-a11y.github.io';
  var OK = ['aymnalsnafy0-a11y.github.io', 'chinese-lessons-38ce0.web.app', 'chinese-lessons-38ce0.firebaseapp.com', 'alsiniya.pages.dev', 'localhost', '127.0.0.1', ''];
  var host = location.hostname;
  var copy = OK.indexOf(host) < 0 && !/\.alsiniya\.pages\.dev$/.test(host);
  function add(){
    // سطر الحقوق في الإعدادات وأسفل الرئيسية
    var set = document.querySelector('#mdSet .sheet');
    if(set && !document.getElementById('ownCredit')){
      var p = document.createElement('p'); p.id = 'ownCredit'; p.className = 'own-credit';
      p.innerHTML = "© 2026 <b>Ayman Alsanafi</b> — All rights reserved.<br>Free original version: <a href=\"" + ORIGINAL + '" target="_blank" rel="noopener">aymnalsnafy0-a11y.github.io</a>';
      set.appendChild(p);
    }
    var home = document.getElementById('pg-home');
    if(home && !document.getElementById('ownFoot')){
      var f = document.createElement('p'); f.id = 'ownFoot'; f.className = 'own-credit';
      f.innerHTML = "“Chinese in English” application prepared by <b>Ayman Alsanafi</b> © 2026 — All rights reserved";
      home.appendChild(f);
    }
    if(copy && !document.getElementById('copyWarn')){
      var w = document.createElement('div'); w.id = 'copyWarn'; w.className = 'copy-warn';
      w.innerHTML = "⚠️ This copy of Ayman Alsanafi’s Chinese Lessons was published without permission. The original is free here: <a href=\"" + ORIGINAL + '">' + ORIGINAL.replace('https://', '') + '</a>';
      document.body.insertBefore(w, document.body.firstChild);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  setTimeout(add, 1500);
})();
