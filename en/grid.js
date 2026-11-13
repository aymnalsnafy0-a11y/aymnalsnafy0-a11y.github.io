/* مربّعات الكتابة مثل الورق الصيني: 米字格 / 田字格 / بدون */
(function(){
  'use strict';
  const MODES = [
    {k: 'mi', label: '▦ 米字格'},
    {k: 'tian', label: '▦ 田字格'},
    {k: 'none', label: "▢ Without lines"}
  ];
  function cur(){ const k = (typeof state !== 'undefined' && state.set && state.set.grid) || 'mi'; return MODES.find(m => m.k === k) || MODES[0]; }
  function apply(){
    const m = cur();
    document.body.classList.remove('grid-mi', 'grid-tian', 'grid-none');
    document.body.classList.add('grid-' + m.k);
    const b = document.getElementById('gridBtn'); if(b) b.textContent = m.label;
  }
  window.cycleGrid = function(){
    const i = MODES.indexOf(cur());
    state.set.grid = MODES[(i + 1) % MODES.length].k; save(); apply();
    toast(cur().k === 'mi' ? "米字格: Horizontal, vertical and diagonal lines" : cur().k === 'tian' ? "田字格: Horizontal and vertical line in the middle" : "A square without lines");
  };
  function init(){ if(typeof state === 'undefined') return setTimeout(init, 200); apply(); }
  init();
})();
