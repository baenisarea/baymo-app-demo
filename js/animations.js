/* Animations ported from the iOS source that need a frame loop or a gesture:
   RecordingWater (BaymoStyle.swift), SwipeToDelete / swipeActions, and HistoryDatePager swiping. */
(function () {
  /* ---------- RecordingWater ---------- */
  // height = H·(0.04 + 0.96·progress), eased linearly over 1 s per change; phase = t·0.65.
  // Back line: phase + 2, colour at 75 %, frame height + 26. Front: page colour at 85 % → the water colour.
  // Water colour: #ADEBF0 (dark #19494F); while moving, #FFF3A9 (dark #514725).
  let shown = 0, from = 0, to = 0, changedAt = 0;
  const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
  function waterline(g, w, top, phase) {
    g.moveTo(0, top + 26);
    for (let x = 0; x <= w; x += 2) g.lineTo(x, top + 26 + Math.sin((x / w) * Math.PI * 3 + phase) * 14 + Math.cos((x / w) * Math.PI * 5 - phase) * 6);
  }
  function frame(now) {
    const cv = document.querySelector('#screen canvas.rwater');
    const se = App.st && App.st.session;
    if (cv && se && se.stage === 'recording') {
      const target = Math.min(1, se.elapsed / Math.max(1, se.total));
      if (target !== to) { from = shown; to = target; changedAt = now; }
      shown = lerp(from, to, (now - changedAt) / 1000);
      const g = cv.getContext('2d'), s = 2, W = cv.width / s, H = cv.height / s;
      g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, W, H);
      const phase = (now / 1000) * 0.65, h = H * (0.04 + 0.96 * shown);
      const dark = !!App.st.prefs.darkMode;
      const rgb = se.isMoving ? (dark ? '81,71,37' : '255,243,169') : (dark ? '25,73,79' : '173,235,240'), bg = dark ? '16,29,35' : '255,255,255';
      g.beginPath(); waterline(g, W, H - (h + 26), phase + 2); g.lineTo(W, H); g.lineTo(0, H); g.closePath();
      g.fillStyle = `rgba(${rgb},.75)`; g.fill();
      const top = H - h, grad = g.createLinearGradient(0, top, 0, H);
      grad.addColorStop(0, `rgba(${bg},.85)`); grad.addColorStop(1, `rgb(${rgb})`);
      g.beginPath(); waterline(g, W, top, phase); g.lineTo(W, H); g.lineTo(0, H); g.closePath();
      g.fillStyle = grad; g.fill();
    } else if (!se || se.stage !== 'recording') { shown = 0; from = 0; to = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- swipe to delete (88 pt reveal, snappy spring) ---------- */
  const REVEAL = 88;
  let drag = null, suppressClick = false;
  function closeAll(except) {
    document.querySelectorAll('#screen .swipe.open').forEach((row) => { if (row !== except) { row.classList.remove('open'); row.querySelector('.swipe-content').style.transform = ''; } });
  }
  document.addEventListener('pointerdown', (e) => {
    const content = e.target.closest('#screen .swipe-content');
    const week = e.target.closest('#screen .wkwrap');
    if (!content && !e.target.closest('#screen .swipe-del')) closeAll();
    if (content) drag = { kind: 'row', row: content.parentElement, content, x: e.clientX, y: e.clientY, base: content.parentElement.classList.contains('open') ? -REVEAL : 0, moved: false };
    else if (week) drag = { kind: 'week', x: e.clientX, y: e.clientY, moved: false };
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = scale(), dx = (e.clientX - drag.x) / k, dy = (e.clientY - drag.y) / k;
    if (!drag.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) drag.moved = true;
    if (drag.moved && drag.kind === 'row') {
      drag.content.style.transition = 'none';
      drag.content.style.transform = `translateX(${Math.min(0, Math.max(drag.base + dx, -REVEAL * 1.3))}px)`;
    }
    drag.dx = dx;
  });
  document.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) { if (d.kind === 'row' && d.row.classList.contains('open')) { suppressClick = true; closeAll(); } return; }
    suppressClick = true;
    if (d.kind === 'row') {
      d.content.style.transition = '';
      const open = d.base + (d.dx || 0) < -REVEAL / 2;
      closeAll(d.row);
      d.row.classList.toggle('open', open);
      d.content.style.transform = open ? `translateX(${-REVEAL}px)` : '';
    } else if (Math.abs(d.dx || 0) > 40) {
      App.actions.shiftWeek({ n: d.dx < 0 ? 1 : -1 });
    }
  });
  // a drag is not a tap
  document.addEventListener('click', (e) => { if (suppressClick) { suppressClick = false; if (e.target.closest('#screen')) { e.stopPropagation(); e.preventDefault(); } } }, true);
  function scale() { const st = document.getElementById('stage'); const m = /scale\(([\d.]+)\)/.exec(st.style.transform || ''); const ph = document.querySelector('.g-phone .bezel'); return (m ? +m[1] : 1) * (ph ? 1.1 : 1); }

  /* Original players start paused; the iOS host calls setMotionActive(true). Do the same here. */
  document.addEventListener('load', (e) => {
    const f = e.target;
    if (f.tagName !== 'IFRAME') return;
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { f.contentWindow.setMotionActive ? f.contentWindow.setMotionActive(!still) : f.contentDocument.body.classList.toggle('paused', still); } catch (err) { /* bundle starts itself */ }
    f.setAttribute('data-ready', '');
  }, true);
  /* Warm the cache once the demo is idle: illustration posters and the onboarding artwork. */
  const warm = () => {
    Object.values(App.C.motionMap).forEach((r) => { new Image().src = `assets/motion/${r}/poster.png`; });
    ['ChildProfileConnected', 'VestConnectedNew', 'BluetoothUnavailable', 'VestFound', 'ReminderTimes'].forEach((n) => { new Image().src = `assets/svg/${n}.svg`; });
    new Image().src = 'assets/img/BluetoothSwitchGuide.png';
  };
  (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(warm);
})();
