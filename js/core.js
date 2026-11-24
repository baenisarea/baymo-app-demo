/* Baymo web demo · engine: state, rendering, navigation (stacks, sheets, covers, alerts, dialogs) and shared components. */
(function () {
  const B = window.Baymo;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let keySeq = 1;
  const App = {
    st: null, routes: {}, actions: {}, timers: new Set(), intervals: new Set(), renderQueued: false, onRender: [],
    esc, I: (n, c) => window.Icon(n, c),
  };
  window.App = App;

  /* ---------- timers that are cleared on reset ---------- */
  App.later = (fn, ms) => { const t = setTimeout(() => { App.timers.delete(t); fn(); }, ms); App.timers.add(t); return t; };
  App.every = (fn, ms) => { const t = setInterval(fn, ms); App.intervals.add(t); return t; };
  App.clearTimer = (t) => { clearTimeout(t); clearInterval(t); App.timers.delete(t); App.intervals.delete(t); };
  App.clearAllTimers = () => { App.timers.forEach(clearTimeout); App.intervals.forEach(clearInterval); App.timers.clear(); App.intervals.clear(); };

  /* ---------- navigation ---------- */
  const entry = (r, p = {}) => ({ r, p, key: `pg${keySeq++}` });
  App.baseStack = () => {
    const ui = App.st.ui;
    if (!App.st.setupDone) return ui.setupStack || (ui.setupStack = [entry('setup')]);
    ui.stacks = ui.stacks || {};
    return ui.stacks[ui.tab] || (ui.stacks[ui.tab] = [entry(ui.tab)]);
  };
  App.topLayer = () => App.st.ui.layers[App.st.ui.layers.length - 1];
  App.currentStack = () => { const l = App.topLayer(); return l && l.stack ? l.stack : App.baseStack(); };
  App.push = (r, p) => { App.currentStack().push(entry(r, p)); App.render(); };
  App.pop = () => { const s = App.currentStack(); if (s.length > 1) s.pop(); App.render(); };
  App.present = (kind, r, p = {}, opts = {}) => {
    App.st.ui.layers.push({ key: `L${keySeq++}`, kind, size: opts.size || 'large', stack: [entry(r, p)], onDismiss: opts.onDismiss, noGrabber: opts.noGrabber, anim: opts.anim });
    App.render();
  };
  App.dismiss = (silent) => {
    const l = App.st.ui.layers.pop();
    if (l && l.onDismiss && !silent) l.onDismiss();
    App.render();
  };
  App.dismissAll = () => { App.st.ui.layers = []; App.render(); };
  App.dismissUntil = (pred) => { const ls = App.st.ui.layers; while (ls.length && !pred(ls[ls.length - 1])) ls.pop(); App.render(); };
  App.alert = (o) => { App.st.ui.layers.push({ key: `L${keySeq++}`, kind: 'alert', o }); App.render(); };
  App.dialog = (o) => { App.st.ui.layers.push({ key: `L${keySeq++}`, kind: 'dialog', o }); App.render(); };
  App.toast = (msg, ms = 2600) => { App.st.ui.toast = msg; App.render(); clearTimeout(App._toastT); App._toastT = setTimeout(() => { if (App.st) { App.st.ui.toast = null; App.render(); } }, ms); };

  /* ---------- rendering ---------- */
  App.render = () => {
    if (App.renderQueued) return;
    App.renderQueued = true;
    requestAnimationFrame(() => { App.renderQueued = false; App.renderNow(); });
  };
  App.renderNow = () => {
    const st = App.st, phone = document.getElementById('screen');
    phone.classList.toggle('dark', !!st.prefs.darkMode);
    let html = '';
    const base = App.baseStack();
    const helpOnly = st.setupDone && st.ui.tab === 'help';
    html += `<div class="base" data-key="base-${st.setupDone ? 'main' : 'setup'}">${renderPage(base[base.length - 1], base.length, { base: true })}`;
    if (st.setupDone && !st.ui.hideTabBar) html += tabBar();
    html += `</div>`;
    st.ui.layers.forEach((l, li) => { const z = `style="z-index:${40 + li * 2}"`;
      if (l.kind === 'alert') html += `<div class="layer alert" ${z} data-key="${l.key}">${alertBox(l.o)}</div>`;
      else if (l.kind === 'dialog') html += `<div class="layer dialog" ${z} data-key="${l.key}" data-a="dialogCancel">${dialogBox(l.o)}</div>`;
      else if (l.kind === 'sheet') {
        const top = l.stack[l.stack.length - 1];
        html += `<div class="layer sheet" ${z} data-key="${l.key}"><div class="dim"></div><div class="sheetbox ${l.size}">${l.noGrabber ? '' : '<div class="grabber"></div>'}${renderPage(top, l.stack.length, { sheet: true, layer: l })}</div></div>`;
      } else {
        const top = l.stack[l.stack.length - 1];
        html += `<div class="layer cover ${l.anim || ''}" ${z} data-key="${l.key}">${renderPage(top, l.stack.length, { cover: true, layer: l })}</div>`;
      }
    });
    html += `<div class="statusbar" data-key="sb">${statusBar()}</div><div class="island" data-key="isl"></div><div class="homebar" data-key="hb"></div>`;
    if (st.ui.toast) html += `<div class="ptoast" data-key="toast">${esc(st.ui.toast)}</div>`;
    const before = obSnapshot(phone);
    morph(phone, html);
    obTransition(phone, before);
    App.onRender.forEach((f) => f());
  };
  /* Onboarding: the screen that is leaving fades out while the new one eases in (forward or back). */
  function obSnapshot(phone) {
    const out = [];
    phone.querySelectorAll('.page.ob[data-key], .page.ob .ob-abs[data-key], .page.ob .ob-actions[data-key]').forEach((el) => out.push({ key: el.dataset.key, el, parent: el.parentElement, cls: el.className, rect: null }));
    return out;
  }
  function obTransition(phone, before) {
    const dir = App.obDir || 'fwd'; App.obDir = null;
    if (dir === 'jump') return;                                  // jumps from the guide don't cross-fade
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const alive = (k) => phone.querySelector(`[data-key="${CSS.escape(k)}"]`);
    before.forEach((b) => {
      if (alive(b.key)) return;
      const isPage = b.el.classList.contains('page');
      if (!isPage && !b.parent.isConnected) return;           // its page left as a whole
      const host = isPage ? phone.querySelector('.page.ob')?.parentElement : b.parent;
      if (!host) return;
      const ghost = b.el.cloneNode(true);
      ghost.removeAttribute('data-key');
      ghost.querySelectorAll('[data-key]').forEach((n) => n.removeAttribute('data-key'));
      ghost.querySelectorAll('iframe').forEach((f) => {           // a frozen frame instead of reloading the player
        const m = /motion\/([^/]+)\//.exec(f.getAttribute('src') || ''); const img = document.createElement('img');
        if (m) img.src = `assets/motion/${m[1]}/poster.png`; img.style.cssText = 'width:100%;height:100%;object-fit:contain'; f.replaceWith(img);
      });
      ghost.classList.add('ob-leave', dir === 'back' ? 'rev' : 'fwd');
      ghost.setAttribute('aria-hidden', 'true');
      if (isPage) ghost.style.cssText += ';position:absolute;inset:0;z-index:0';
      host.appendChild(ghost);
      setTimeout(() => ghost.remove(), 420);
    });
  }
  function renderPage(e, depth, ctx) {
    const fn = App.routes[e.r];
    const body = fn ? fn(e.p, Object.assign({ depth, entry: e }, ctx)) : `<div class="page"><div class="nav"></div><p class="pad">Missing ${esc(e.r)}</p></div>`;
    // pushed pages slide in; the wrapper key keeps identity stable across re-renders
    return `<div class="pagewrap" data-key="${e.key}" style="position:absolute;inset:0">${depth > 1 ? body.replace('class="page', 'class="page push') : body}</div>`;
  }
  function statusBar() {
    const now = new Date();
    return `<span>${B.fmt.statusTime(now)}</span><span class="r">${App.I('cellularbars')}${App.I('wifi')}${App.I('battery', 'bat')}</span>`;
  }
  function tabBar() {
    const t = App.st.ui.tab;
    return `<nav class="tabbar" data-key="tabbar">
      <button class="${t === 'home' ? 'on' : ''}" data-a="tab" data-tab="home" data-id="tab.today">${App.I('heart.fill')}Today</button>
      <button class="${t === 'history' ? 'on' : ''}" data-a="tab" data-tab="history" data-id="tab.history">${App.I('book.fill')}History</button>
    </nav><button class="tabhelp" data-key="tabhelp" data-a="tab" data-tab="help" aria-label="Help">${App.I('cross.case.fill')}</button>`;
  }
  function alertBox(o) {
    const btns = (o.buttons || [{ label: 'OK' }]).map((b, i) => `<button class="${b.cls || ''}" data-a="alertButton" data-i="${i}" ${b.id ? `data-id="${b.id}"` : ''}>${esc(b.label)}</button>`).join('');
    return `<div class="alertbox ${o.ios26 ? 'ios26' : ''}"><h3>${esc(o.title)}</h3>${o.message ? `<p>${esc(o.message)}</p>` : ''}<div class="btns ${((o.buttons || []).length > 2 || o.vertical) && !o.ios26 ? 'v' : ''}">${btns}</div></div>`;
  }
  function dialogBox(o) {
    const btns = o.buttons.map((b, i) => `<button class="${b.destructive ? 'destr' : ''}" data-a="dialogButton" data-i="${i}">${esc(b.label)}</button>`).join('');
    return `<div class="dialogbox" data-a="noop"><div class="grp">${o.title || o.message ? `<div class="msg">${o.title ? `<b>${esc(o.title)}</b>` : ''}${esc(o.message || '')}</div>` : ''}${btns}</div>
      <div class="grp"><button class="cancel" data-a="dialogCancel">${esc(o.cancel || 'Cancel')}</button></div></div>`;
  }

  /* ---------- events ---------- */
  App.handleClick = (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || !document.getElementById('screen').contains(el)) return;
    if (el.disabled || el.classList.contains('disabled')) return;
    const a = el.dataset.a;
    if (a === 'noop') { ev.stopPropagation(); return; }
    const fn = App.actions[a];
    if (fn) { ev.stopPropagation(); ev.preventDefault(); fn(el.dataset, el, ev); }
  };
  App.actions.alertButton = (d) => { const l = App.topLayer(); App.st.ui.layers.pop(); const b = (l.o.buttons || [])[+d.i]; App.render(); if (b && b.run) b.run(); };
  App.actions.dialogButton = (d) => { const l = App.topLayer(); App.st.ui.layers.pop(); const b = l.o.buttons[+d.i]; App.render(); if (b && b.run) b.run(); };
  App.actions.dialogCancel = (d, el, ev) => { if (ev.target.closest('.dialogbox') && !ev.target.closest('.cancel')) return; App.st.ui.layers.pop(); App.render(); };
  App.actions.pop = () => App.pop();
  App.actions.dismiss = () => App.dismiss();
  App.actions.tab = (d) => {
    const st = App.st;
    if (d.tab === 'help') st.ui.prevTab = st.ui.tab;
    st.ui.tab = d.tab; App.render();
  };
  /* two-way binding for inputs: data-bind="path.to.value" */
  App.get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), App);
  App.set = (path, v) => { const ks = path.split('.'); const last = ks.pop(); const o = ks.reduce((o, k) => o[k], App); o[last] = v; };
  App.handleInput = (ev) => {
    const el = ev.target; const path = el.dataset.bind; if (!path) return;
    App.set(path, el.type === 'checkbox' ? el.checked : el.value);
    if (el.dataset.onchange && App.actions[el.dataset.onchange]) App.actions[el.dataset.onchange](el.dataset, el);
    if (el.dataset.rerender !== undefined) App.render();
  };

  /* ---------- shared components ---------- */
  const C = (App.C = {});
  C.nav = ({ left = '', title = '', right = '', sub = '' } = {}) => `<div class="nav"><div class="row gap8">${left}</div><div class="title">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div><div class="row gap8">${right}</div></div>`;
  C.back = (a = 'pop', id = '') => `<button class="glassbtn icon" data-a="${a}" aria-label="Back" ${id ? `data-id="${id}"` : ''}>${App.I('chevron.left')}</button>`;
  C.close = (a = 'dismiss', id = '') => `<button class="glassbtn icon" data-a="${a}" aria-label="Close" ${id ? `data-id="${id}"` : ''}>${App.I('xmark')}</button>`;
  C.btn = (label, action, cls = 'pri', attrs = '') => `<button class="btn ${cls}" data-a="${action}" ${attrs}>${label}</button>`;
  C.motionMap = { MotherWelcome: 'welcome', MotherVest: 'checkECG', ChildProfileReady: 'profileConnected', NotificationPhone: 'notification', VestConnected: 'vestConnected',
    BluetoothPermission: 'bluetoothAllow', CareTeamIllustration: 'careTeam', ControlCenterGuide: 'controlCenter', VestSearching: 'vestSearching', MotherProcessing: 'recordingComplete', MotherComparing: 'recordingProcessing' };
  /** BaymoIllustration: authored motion bundle when one exists, else the static asset. */
  C.illus = (name, height, style = '') => {
    const res = C.motionMap[name];
    // As IllustrationPlayer: the poster (first frame) shows until the player is ready, then the player fades in over 0.15 s.
    if (res) return `<div class="illus-frame" style="height:${height}px;${style};background:url(assets/motion/${res}/poster.png) center/contain no-repeat" data-key="mo-${res}"><iframe src="assets/motion/${res}/index.html" tabindex="-1" scrolling="no" title="" aria-hidden="true" data-key="if-${res}"></iframe></div>`;
    const ext = ['HospitalHelp', 'ResultChanged', 'ResultUnclear', 'ResultUsual', 'SymptomsSaved'].includes(name) ? 'svg' : 'png';
    return `<div class="illus-frame" style="height:${height}px;${style}"><img decoding="async" src="assets/img/${name}.${ext}" alt=""></div>`;
  };
  C.img = (name, style) => `<img decoding="async" src="assets/img/${name}" alt="" style="${style || ''}">`;
  /** BaymoWave shape as SVG path, in a w×h box. */
  C.wavePath = (w, h, depth) => `M0 ${h * depth} C ${w * 0.4} ${h * -depth} ${w * 0.55} ${h * depth * 2.6} ${w} ${h * depth * 0.5} L ${w} ${h} L 0 ${h} Z`;
  C.wave = (height, depth, from, to, id) => `<svg class="wavebox" width="402" height="${height}" viewBox="0 0 402 ${height}" preserveAspectRatio="none" style="height:${height}px;width:100%"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><path d="${C.wavePath(402, height, depth)}" fill="url(#${id})"/></svg>`;
  /** BaymoBackground: white with a 35% surface wave. */
  C.bg = (fraction = 0.35) => `<div style="position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;justify-content:flex-end" aria-hidden="true">${C.wave(Math.round(874 * fraction), 0.16, 'rgba(228,248,250,.25)', 'var(--surface)', 'bgw' + Math.round(fraction * 100))}</div>`;
  /** BaymoClinicalBackground */
  /* BaymoClinicalBackground: page colour, optional interrupted / fills-page gradients, dot grid, and the lower wave (not when the page is filled) */
  C.clinicalBg = ({ neutral = false, attention = false, fillsPage = false, showsWave = true, interrupted = false } = {}) => {
    const layers = [interrupted ? 'linear-gradient(var(--interrupted-top), var(--interrupted-end))' : '',
      fillsPage ? (neutral ? 'linear-gradient(var(--neutral), var(--bg))' : `linear-gradient(var(--bg), ${attention ? 'var(--attention-fill)' : 'var(--surface)'})`) : ''].filter(Boolean);
    const waveEnd = interrupted ? 'var(--interrupted-wave)' : neutral ? 'var(--neutral)' : attention ? 'var(--warning-surface)' : '#B8ECEF';
    return `<div style="position:absolute;inset:0;pointer-events:none;background:${layers.length ? layers[layers.length - 1] + ', var(--bg)' : 'var(--bg)'}" aria-hidden="true">
      <div class="dotbg ${neutral ? 'neutral' : attention ? 'attention' : fillsPage ? 'fills' : ''}" style="position:absolute;inset:0"></div>
      ${showsWave && !fillsPage ? C.wave(227, 0.18, 'var(--bg)', waveEnd, 'cw' + (interrupted ? 'i' : neutral ? 'n' : attention ? 'a' : '')) : ''}</div>`;
  };
  C.journalBg = () => `<div style="position:absolute;inset:0;background:var(--journal-bg);pointer-events:none"></div>`;
  C.steps = (steps, color = 'var(--accent)', { compact = false, font = '' } = {}) => `<div class="steps-line">${steps.map((s, i) => `
    <div class="st"><div class="rail"><div class="dot" style="background:${color}"></div><div class="ln" style="background:${color};opacity:${i === steps.length - 1 ? 0 : 0.25}"></div></div>
    <div class="${font || (compact ? 't-foot' : 't-sub')}" style="flex:1;padding-bottom:${i === steps.length - 1 ? 0 : compact ? 12 : 20}px">${esc(s)}</div></div>`).join('')}</div>`;
  C.instructionSteps = (steps, color = 'var(--accent)') => `<div class="steps-line">${steps.map(([t, d], i) => `
    <div class="st"><div class="rail"><div class="dot" style="background:${color}"></div><div class="ln" style="background:${i === steps.length - 1 ? 'transparent' : color};opacity:.35"></div></div>
    <div class="col gap6" style="flex:1;padding-bottom:${i === steps.length - 1 ? 0 : 22}px"><div class="t-body b">${esc(t)}</div><div class="t-sub sec">${esc(d)}</div></div></div>`).join('')}</div>`;
  /** Swipe left to reveal Delete (iOS swipe actions / SwipeToDelete, 88 pt). */
  App.swipeRow = (content, delAttrs, key) => `<div class="swipe" data-key="${key}"><div class="swipe-del"><button ${delAttrs}>Delete</button></div><div class="swipe-content">${content}</div></div>`;
  C.toggle = (on, action, attrs = '') => `<button class="toggle ${on ? 'on' : ''}" data-a="${action}" role="switch" aria-checked="${on}" ${attrs}></button>`;
  /* OnboardingInfoRow: centred 21 pt symbol at 70 % accent, body-semibold title, purple-grey detail */
  C.infoRow = (symbol, title, detail) => `<div class="row ob-info" style="gap:15px;align-items:center"><span class="tint" style="font-size:21px;width:30px;height:27px;display:grid;place-items:center;opacity:.7;flex:none">${App.I(symbol)}</span>
    <div class="col gap6 grow"><div class="t-body b">${esc(title)}</div><div class="t-sub ob-infodetail">${esc(detail)}</div></div></div>`;
  C.dayMark = (state, size = 18) => {
    const s = `width:${size}px;height:${size}px`;
    switch (state) {
      case 'complete': return `<span class="mark" style="${s};background:var(--calendar-accent)"></span>`;
      case 'changed': return `<span class="mark" style="${s};background:var(--calendar-change)"></span>`;
      case 'partial': return `<span class="mark" style="${s};box-shadow:inset 0 0 0 1px var(--calendar-accent)"><span style="position:absolute;left:0;right:0;bottom:0;height:50%;background:var(--calendar-accent)"></span></span>`;
      case 'missed': return `<span class="mark" style="${s};box-shadow:inset 0 0 0 1px rgba(60,60,67,.3)"></span>`;
      default: return `<span class="mark" style="${s}"></span>`;
    }
  };
  /** Time picker shown as an iOS compact time pill; uses a native time input underneath. */
  C.timePill = (date, bindAction, attrs = '') => {
    const v = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return `<label class="timepill" style="position:relative;cursor:pointer">${B.fmt.time(date)}<input type="time" value="${v}" data-timeaction="${bindAction}" ${attrs} style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>`;
  };
  App.handleTime = (ev) => {
    const el = ev.target; if (!el.dataset.timeaction) return;
    const [h, m] = el.value.split(':').map(Number);
    if (Number.isNaN(h)) return;
    const fn = App.actions[el.dataset.timeaction]; if (fn) fn(el.dataset, el, h, m);
  };
  C.ecgRow = (samples, start, end, w, h, ppmv = 24) => {
    const sec = (end - start) / ECGSignal.fs;
    let grid = '';
    for (let i = 0; i <= sec * 5; i++) { const x = (i / (sec * 5)) * w; grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="rgba(128,128,128,${i % 5 ? 0.12 : 0.28})" stroke-width="${i % 5 ? 0.5 : 0.8}"/>`; }
    for (let y = h; y >= 0; y -= w / (sec * 5)) grid += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(128,128,128,.12)" stroke-width=".5"/>`;
    return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;height:${h}px">${grid}<path d="${ECGSignal.path(samples, start, end, w, h, ppmv)}" fill="none" stroke="var(--label)" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
  };
})();
