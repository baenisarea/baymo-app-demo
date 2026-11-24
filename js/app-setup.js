/* Onboarding (OfflineSetupView.swift) and the Bluetooth vest connection (BluetoothConnectionView.swift). */
(function () {
  const { C, esc, I } = App, R = App.routes, A = App.actions, B = window.Baymo;
  const PAGES = ['welcome', 'purpose', 'overview', 'profile', 'profileReady', 'vest', 'notifications', 'reminders'];
  const st = () => App.st;
  const curve = (w, h, depth) => `clip-path:path('M0 0 H${w} V${h - depth} Q${w / 2} ${h + depth} 0 ${h - depth} Z')`;
  const go = (p) => { st().page = p; App.render(); };
  /* SetupFlowView: NavigationStack › ScrollView › VStack(spacing 28), padding 24 (top 12 or 20, bottom 24),
     bottom safeAreaInset with the actions (VStack spacing 10, padding 24 × 12). Text styles are iOS Dynamic Type (Large). */
  const heading = (t, sub, centered = false, id = 'setup.title') => `<div class="ob-head${centered ? ' c' : ''}"><div class="t-title tint" data-id="${id}">${t}</div>${sub ? `<div class="t-body sec">${sub}</div>` : ''}</div>`;
  const back = (a = 'setupBack', id = 'setup.back') => C.back(a, id);
  const page = (key, content, actions, { bg = C.bg(), top = 20, center = false, backBtn = true, cls = '', state = '' } = {}) =>
    `<div class="page ob ${cls}" data-key="${key}">${bg}${C.nav({ left: backBtn ? back() : '<span class="ob-navgap"></span>' })}
      <div class="scroll ob-scroll"><div class="ob-abs${center ? ' center' : ''}" style="padding-top:${top}px" data-key="abs-${key}${state}">${content}</div></div>
      <div class="ob-actions" data-key="act-${key}${state}">${actions}</div></div>`;
  const pri = (label, a, id, extra = '') => `<button class="btn pri" data-a="${a}" ${id ? `data-id="${id}"` : ''} ${extra}>${label}</button>`;
  const glass = (label, a, id) => `<button class="btn glass" data-a="${a}" ${id ? `data-id="${id}"` : ''}>${label}</button>`;
  const row = (sym, t, d) => C.infoRow(sym, t, d);
  const card = (html, cls = '') => `<div class="ob-card ${cls}">${html}</div>`;
  const welcomeBg = `<div class="ob-welcomebg" aria-hidden="true">${C.bg(0.18)}<div style="position:absolute;top:0;left:0;right:0"></div></div>`;   // BaymoBackground(waveFraction: 0.18) + 260 pt surface band

  R.setup = () => {
    const s = st(), pg = s.page, name = esc(s.child.first);
    switch (pg) {
      case 'vest': return R.bluetooth({ onboarding: true }, { depth: 1 });
      case 'welcome':
        // Figma canvas 418.161835 × 423, bottom-aligned in the 464 pt player, clipped to 440 pt with a 100 pt arc.
        return page('setup-welcome', `<div class="ob-hero" style="height:452px;${curve(402, 452, 100)}"><div style="transform:translateY(${((464 - 402 * 423 / 418.161835) / 2).toFixed(2)}px)">${C.illus('MotherWelcome', 464)}</div></div>
          <div style="padding:0 24px">${heading('Welcome to Baymo', 'Record your child\'s heart at home and keep their care team informed.', true)}</div>`,
          pri('Get Started', 'setupNext', 'setup.continue'), { bg: welcomeBg, top: 12, backBtn: false });
      case 'purpose':
        return page('setup-purpose', `<div class="ob-hero" style="height:380px;${curve(402, 380, 70)}">${C.illus('CareTeamIllustration', 404)}</div>
          ${heading('This app doesn\'t replace medical advice', 'It records your child\'s heart activity for their care team to review. It doesn\'t replace professional diagnosis.', true)}`,
          pri('Continue', 'setupNext', 'setup.continue'));
      case 'overview':
        return page('setup-overview', `${heading('What we record', 'Here\'s what we collect in our app.')}
          ${card(`${row('heart', 'Heart recordings', 'ECG recordings from your child\'s ECG vest.')}${row('list.clipboard', 'Symptoms & context', 'How your child feels during each recording.')}${row('calendar.badge.clock', 'Recording history', 'Dates, times and recording status.')}`, 'shadow gap32')}
          <button class="ob-policy" data-a="showPrivacy" data-id="setup.privacy"><span class="tint ob-doc">${I('doc.text')}</span><span class="grow col gap3"><span class="t-body">Privacy Policy</span><span class="t-cap sec">Learn how your child's data is handled.</span></span><span class="sec ob-chev">${I('chevron.right')}</span></button>`,
          `<div class="t-cap sec" style="text-align:center">By tapping Agree, you allow Baymo to keep your child's heart data on this phone.</div>${pri('Agree &amp; Continue', 'setupNext', 'setup.continue')}`);
      case 'profile': {
        const code = s.doctorCode, bad = s.invalidCode;
        const boxes = Array.from({ length: 6 }, (_, i) => `<span class="ob-box ${bad ? 'bad' : i < code.length || i === Math.min(code.length, 5) ? 'cur' : ''}">${code[i] ? `<i>${esc(code[i])}</i>` : ''}</span>`).join('');
        return page('setup-profile', `<div class="ob-codewrap">${heading('Enter Doctor Code', 'This is provided by your doctor to connect your phone to your child\'s health records.', true)}
          <label class="ob-code">${boxes}<input class="codeinput" inputmode="numeric" autocomplete="one-time-code" maxlength="6" value="${esc(code)}" data-codeinput aria-label="Doctor code" data-id="setup.doctorCode"></label>
          ${bad ? '<div class="t-foot ob-red" data-id="setup.codeHint">This code doesn\'t match our records. Please check with your doctor and try again.</div>' : ''}</div>`,
          `<div class="t-foot sec ob-label">${I('lock')}<span>Your child's ECG baseline stays private during setup.</span></div>${pri('Continue', 'setupNext', 'setup.continue', code.length !== 6 ? 'disabled' : '')}`);
      }
      case 'profileReady': {
        return page('setup-profileReady', `<div class="ob-still" style="height:215px"><img decoding="async" src="assets/svg/ChildProfileConnected.svg" alt=""></div>
          ${heading('Profile ready', `${name}'s demo profile is ready on this iPhone.`, true)}
          <div class="ob-card ob-pcard">
            <div class="ob-prow"><span class="tint">${I('person.crop.circle')}</span><div class="col gap4"><div class="t-sub sec">Full name</div><div class="t-body">${esc(s.child.name)}</div></div></div><div class="ob-div"></div>
            <div class="ob-prow"><span class="tint">${I('calendar')}</span><div class="col gap4"><div class="t-sub sec">Date of birth</div><div class="t-body">${B.fmt.abbrevDate(s.child.birth)}</div></div></div><div class="ob-div"></div>
            <div class="ob-prow"><span class="tint">${I('heart.text.square')}</span><div class="col gap4"><div class="t-sub sec">Heart condition</div><div class="t-body">${esc(s.child.condition)}</div></div></div></div>`,
          pri('Continue', 'setupNext', 'setup.continue'));
      }
      case 'notifications':
        return page('setup-notifications', `<div class="ob-stack">
            <div class="ob-notif" style="${curve(309, 324, 26)}">${C.illus('NotificationPhone', 586.462, 'width:309px')}</div>
            <div style="padding-top:24px">${heading('Turn on notifications', '', true)}</div>
            <div style="padding-top:12px">${card(`${row('calendar.badge.clock', 'Recording reminders', 'Know when it\'s time for your child\'s next check.')}${row('bell.and.waves.left.and.right.fill', 'Nightly Journals', `Get reminded when it’s time to complete ${name}'s daily journal`)}`, 'shadow notif')}</div></div>`,
          pri('Turn on notifications', 'setupNext', 'setup.continue') + glass('Not Now', 'skipNotifications', 'setup.skipNotifications'), { bg: '', top: 12 });
      case 'reminders': {
        const n = s.reminderTimes.length, labels = n === 1 ? ['Daily check'] : s.reminderTimes.map((_, i) => (i === 0 ? 'First check' : i === 1 ? 'Second check' : `Check ${i + 1}`));
        const rows = s.reminderTimes.map((t, i) => `<div class="ob-trow"><span class="tint">${I('bell')}</span><span class="grow t-body">${labels[i]}</span>${C.timePill(timeOf(t), 'setReminder', `data-i="${i}" data-id="setup.reminder.${i}"`)}</div><div class="ob-div t"></div>`).join('')
          + `<div class="ob-trow"><span class="tint">${I('square.and.pencil')}</span><span class="grow t-body">Nightly Journal</span>${C.timePill(minutesToDate(s.prefs.journalReminderMinutes), 'setJournalReminder')}</div>`;
        const desc = n === 1 ? `Set a time for ${name}'s daily check, when they're usually rested.` : `Set times for ${name}'s ${n} checks a day, when they're usually rested.`;
        return page('setup-reminders', `<div class="ob-still" style="height:200px"><img decoding="async" src="assets/svg/ReminderTimes.svg" alt=""></div>
          ${heading('Set reminder times', desc, true)}
          <div class="col gap12"><div class="ob-card ob-tcard">${rows}</div><div class="t-foot sec">You can change these any time in Profile.</div></div>`,
          pri('Done', 'setupNext', 'setup.continue'), { top: 0, bg: '<div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(var(--bg) 15%, var(--reminders-end) 85%)" aria-hidden="true"></div>' });
      }
    }
    return '<div class="page"></div>';
  };
  const timeOf = (t) => { const d = new Date(); d.setHours(t[0], t[1], 0, 0); return d; };
  const minutesToDate = (m) => { const d = new Date(); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; };
  App.timeOf = timeOf; App.minutesToDate = minutesToDate;
  App.ob = { page, heading, back, pri, glass, row, card };

  A.setupBack = () => { const i = PAGES.indexOf(st().page); if (i > 0) { App.obDir = 'back'; go(PAGES[i - 1]); } };
  A.setupNext = () => {
    const s = st(), page = s.page;
    if (page === 'profile') {
      if (s.doctorCode.length !== 6) return;
      if (s.doctorCode !== '123456') { s.invalidCode = true; App.render(); return; }
      s.invalidCode = false; s.demoProfile = true;
    }
    if (page === 'notifications') {
      App.alert({ ios26: true, title: '“Baymo” Would Like to Send You Notifications', message: 'Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.',
        buttons: [{ label: 'Don’t Allow', run: () => { s.prefs.remindersEnabled = false; go('reminders'); } }, { label: 'Allow', cls: 'pri', run: () => { s.prefs.remindersEnabled = true; go('reminders'); } }] });
      return;
    }
    if (page === 'reminders') { App.completeSetup(); return; }
    go(PAGES[PAGES.indexOf(page) + 1]);
  };
  A.skipNotifications = () => { st().prefs.remindersEnabled = false; go('reminders'); };
  A.showPrivacy = () => App.present('sheet', 'terms', { sheetDone: true }, { noGrabber: false });
  A.key = (d) => { const s = st(); if (d.k === 'del') s.doctorCode = s.doctorCode.slice(0, -1); else if (s.doctorCode.length < 6) s.doctorCode += d.k; s.invalidCode = false; App.render(); };
  A.fillCode = (d) => { st().doctorCode = (d && d.code) || '123456'; st().invalidCode = false; App.render(); };
  A.setReminder = (d, el, h, m) => { st().reminderTimes[+d.i] = [h, m]; App.render(); };
  A.setJournalReminder = (d, el, h, m) => { st().prefs.journalReminderMinutes = h * 60 + m; App.render(); };
  App.completeSetup = () => {
    const s = st();
    s.reminderTimes.sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
    s.setupDone = true; s.ui.tab = 'home'; s.ui.stacks = {}; s.ui.layers = [];
    App.render();
  };
  document.addEventListener('input', (ev) => {
    if (!ev.target.matches('[data-codeinput]')) return;
    const s = st(); s.doctorCode = ev.target.value.replace(/\D/g, '').slice(0, 6); s.invalidCode = false; App.render();
  });

  /* ---------- Privacy policy (TermsView) ---------- */
  R.terms = (p) => {
    const sec = (t, b) => `<div class="col gap4"><div class="b">${t}</div><div>${b}</div></div>`;
    const body = `<div class="ob-tbody t-sub"><div class="b">Your child's privacy matters.</div>
      <div>Baymo keeps your child's profile and monitoring records on this iPhone. This policy describes the features available in this version.</div>
      ${sec('1. Information we collect', 'The profile you set up; ECG signals and recording times; symptoms, activities, medicines and notes you confirm; device connection status and your app settings.')}
      ${sec('2. How we use your information', 'To keep your child\'s monitoring history, display saved recordings and send the reminders you enable. Demo results use generated test data. When available, on-device analysis compares the first minute of a saved ECG with a baseline you choose. This comparison is not a diagnosis. There is no automatic clinic connection.')}
      ${sec('3. Voice notes', 'Voice notes use Apple\'s on-device speech recognition. An English speech model may need to download first. Audio is not saved by Baymo; the text you confirm is saved.')}
      ${sec('4. Sharing and deletion', 'You choose when and where to export records. Exports include health information, your profile and original ECG signals. You can delete local records in Profile. Deleting data in Baymo does not remove copies you have already exported.')}
      <div>Closing the app does not remove your records.</div></div>`;
    if (p.sheetDone) return `<div class="page ob ob-terms">${C.nav({ title: 'Privacy Policy' })}<div class="scroll">${body}</div>
      <div class="ob-actions">${pri('Got it', 'dismiss', 'setup.privacyDone')}</div></div>`;
    return `<div class="page">${C.nav({ left: C.back(), title: 'Privacy Policy' })}<div class="scroll">${body}</div></div>`;
  };

  /* ---------- Bluetooth vest connection ---------- */
  /** Bluetooth radio state as Baymo sees it. */
  App.radio = () => { const ph = st().phone; if (ph.permission === 'denied') return 'unauthorized'; if (!ph.bluetoothOn) return 'poweredOff'; return 'poweredOn'; };
  App.vestReachable = () => st().sim.powered && st().phone.bluetoothOn;
  /** The link Baymo holds with the simulator phone. */
  App.vestConnected = () => st().vest.connected && App.vestReachable();
  const bt = () => st().bt || (st().bt = { requested: false, scanning: false, connecting: false, rejected: false, message: 'Scan for the vest simulator.' });

  /* BluetoothConnectionView: ScrollView › VStack(leading, spacing 28) padding 24, BaymoClinicalBackground, actionBar. */
  R.bluetooth = (p) => {
    const s = st(), b = bt(), radio = App.radio();
    const ready = App.vestConnected(), denied = radio === 'unauthorized', off = radio === 'poweredOff';
    const busy = b.scanning || b.connecting, searching = b.requested || busy;
    const { heading, pri, glass } = App.ob;
    const later = glass('Not Now', 'btLater', 'bluetooth.later');
    let art;
    if (ready) art = '<div class="ob-still" style="height:363px"><img decoding="async" src="assets/svg/VestConnectedNew.svg" alt=""></div>';
    else if (denied || off) art = '<div class="ob-still" style="height:310px"><img decoding="async" src="assets/svg/BluetoothUnavailable.svg" alt="" style="max-width:280px"></div>';
    else if (searching) art = C.illus('VestSearching', 260);
    else art = `<div style="${curve(354, 414, 28)}">${C.illus('BluetoothPermission', 414)}</div>`;
    const title = ready ? 'Vest connected' : denied ? 'Allow Bluetooth for Baymo' : off ? 'Bluetooth is turned off' : b.connecting ? 'Connecting to your vest…' : b.scanning ? 'Searching for your vest…' : 'Connect your vest';
    const detail = ready ? 'The ECG vest is now connected to this phone.' : denied ? 'Bluetooth access is needed to find and connect to your ECG vest. You can turn it on in Settings.'
      : off ? 'Turn on Bluetooth to connect to your vest.' : b.connecting ? 'Keep both phones nearby while the connection is set up.' : b.scanning ? 'Confirm your vest when it is found.' : 'Allow Bluetooth so Baymo can find and connect to your ECG vest.';
    const showsTitle = ready || denied || off || (!b.requested && !busy);
    let extra = '';
    if (ready) extra = '';                                   // the connected screen no longer names the device
    else if (off) extra = '<button class="t-body tint ob-link" data-a="btHelp">How to turn on Bluetooth</button>';
    else if (!denied && searching) extra = `<div class="ob-card shadow gap20"><div class="t-sub sec">${b.scanning ? 'Searching for your vest…' : esc(b.message)}</div>
      ${C.instructionSteps([['1. Switch the vest on', 'Make sure your ECG vest is powered on.'], ['2. Keep your phone nearby', 'Place your phone next to the vest for a better connection.']])}</div>`;
    let actions = '';
    if (ready) actions = pri('Continue', 'btContinue', 'bluetooth.next');
    else if (denied) actions = pri('Open Settings', 'btOpenSettings', 'bluetooth.openSettings') + later;
    else if (!busy) actions = pri(off ? 'Find My Vest' : b.requested ? 'Search again' : 'Continue', 'btScan', 'bluetooth.scan') + (off || b.requested ? later : '');
    const content = `<div style="padding-top:${busy ? 60 : ready ? 0 : 24}px">${art}</div>${showsTitle ? `<div class="ob-head c gap10"><div class="t-title tint" data-id="bluetooth.title">${title}</div><div class="t-body sec" style="${ready ? 'max-width:320px;margin:0 auto' : ''}">${detail}</div></div>` : ''}${extra}`;
    const state = ready ? '-ready' : denied ? '-denied' : off ? '-off' : searching ? '-search' : '-ask';
    const backAction = p.onboarding ? 'setupBack' : 'btLater';
    return `<div class="page ob ob-bt" data-key="bt">${C.clinicalBg({ showsWave: !busy })}${C.nav({ left: back(backAction, p.onboarding ? 'setup.back' : 'session.settingsBack') })}
      <div class="scroll ob-scroll"><div class="ob-abs" data-key="abs-bt${state}">${content}</div></div>
      <div class="ob-actions" data-key="act-bt${state}">${actions}</div></div>`;
  };
  App.btContext = null; // {onboarding:true} or {session:true}
  A.btScan = () => {
    const radio = App.radio(), b = bt();
    if (radio === 'poweredOff') { A.btHelp(); return; }
    if (st().phone.permission === 'notDetermined') {
      App.alert({ ios26: true, title: '“Baymo” Would Like to Use Bluetooth', message: 'Connects to Vest Simulator on another phone over Bluetooth to receive a test ECG.',
        buttons: [{ label: 'Don’t Allow', run: () => { st().phone.permission = 'denied'; App.render(); } }, { label: 'Allow', cls: 'pri', run: () => { st().phone.permission = 'allowed'; startScan(); } }] });
      return;
    }
    b.rejected = false; startScan();
  };
  function startScan() {
    const b = bt();
    b.requested = true; b.scanning = true; b.message = 'Searching for your vest…';
    App.clearTimer(b.scanTimer); App.clearTimer(b.giveUp);
    App.render();
    const look = () => {
      if (!b.scanning) return;
      if (App.radio() !== 'poweredOn') { b.scanning = false; b.message = 'Bluetooth is turned off.'; App.render(); return; }
      if (st().sim.powered && !b.rejected && !b.found && !b.hold) { showFound(); return; }   // hold: the guide keeps this screen up
      b.scanTimer = App.later(look, 700);
    };
    b.scanTimer = App.later(look, 2200);
    b.giveUp = App.later(() => { if (b.scanning && !b.found && !b.hold) { b.scanning = false; b.message = 'Scanning for your vest…'; App.render(); } }, 16000);
  }
  App.startScan = startScan;
  App.btState = () => bt();
  App.btShowFound = () => { const b = bt(); b.hold = false; if (!b.found) showFound(); };
  function showFound() {
    const b = bt(); b.found = true;
    App.present('sheet', 'vestFound', {}, { size: 'found', onDismiss: () => { b.found = false; } });
  }
  R.vestFound = () => `<div class="page ob ob-found"><div class="scroll"><div class="ob-foundcol">
      <div class="col gap6" style="text-align:center"><div class="t-title2">Vest Found</div><div class="t-sub sec">We found a nearby device. Is this your ECG vest?</div></div>
      <img decoding="async" src="assets/svg/VestFound.svg" alt="" class="ob-fv"><div class="t-headline">${esc(st().vest.peerName)}</div>
      ${App.ob.pri('Connect', 'btConnect', 'bluetooth.confirmConnect')}${App.ob.glass('Not My Vest', 'btReject', 'bluetooth.reject')}</div></div></div>`;
  A.btConnect = () => {
    const b = bt(); App.clearTimer(b.giveUp);
    b.scanning = false; b.connecting = true; b.found = false; b.message = `Connecting to ${st().vest.peerName}…`;
    App.dismiss(true);
    if (!b.holdConnect) b.connectTimer = App.later(finishConnect, 1600);
    App.render();
  };
  function finishConnect() {
    const b = bt(); b.holdConnect = false; if (!b.connecting) return;
    b.connecting = false;
    if (!App.vestReachable()) { b.message = "Couldn't connect."; App.render(); return; }
    st().vest.connected = true; st().vest.paired = true; App.render();
  }
  App.btFinishConnect = finishConnect;
  A.btReject = () => { const b = bt(); b.rejected = true; b.found = false; App.dismiss(true); App.render(); };
  A.btLater = () => { resetBt(); if (st().ui.layers.length && App.topLayer().stack && App.topLayer().stack[0].r === 'bluetooth') App.dismiss(); else if (!st().setupDone) go('notifications'); };
  A.btContinue = () => { resetBt(); if (!st().setupDone) go('notifications'); else App.dismiss(); };
  function resetBt() { const b = bt(); App.clearTimer(b.scanTimer); App.clearTimer(b.giveUp); App.clearTimer(b.connectTimer); st().bt = null; }
  App.resetBt = resetBt;
  A.btOpenSettings = () => App.present('cover', 'iosSettings', {}, { anim: 'smooth' });
  R.iosSettings = () => `<div class="page ios-settings"><div class="nav"><button class="ob-back" style="position:static" data-a="closeIosSettings" aria-label="Back">${I('chevron.left')}</button><div class="title">Baymo</div><div></div></div>
      <div class="ios-row"><span class="grow">Bluetooth</span>${C.toggle(st().phone.permission === 'allowed', 'toggleIosBluetooth', 'data-id="settings.bluetooth"')}</div></div>`;
  A.toggleIosBluetooth = () => { const ph = st().phone; ph.permission = ph.permission === 'allowed' ? 'denied' : 'allowed'; App.render(); };
  A.closeIosSettings = () => { App.dismiss(true); };
  A.btHelp = () => { if (!(App.topLayer() && App.topLayer().stack && App.topLayer().stack[0].r === 'btHelp')) App.present('sheet', 'btHelp', {}); };
  R.btHelp = () => `<div class="page ob ob-bthelp">${C.nav({ left: C.back('dismiss'), title: 'Bluetooth is turned off' })}<div class="scroll"><div class="ob-helpcol">
      ${C.infoRow('rectangle.topthird.inset.filled', '1. Open Control Center', 'Swipe down from the top-right corner of your screen.')}
      ${C.illus('ControlCenterGuide', 145)}
      ${C.infoRow('antenna.radiowaves.left.and.right', '2. Turn on Bluetooth', 'Tap the Bluetooth icon until it turns blue.')}
      <div class="ob-sw" style="height:170px"><img decoding="async" src="assets/img/BluetoothSwitchGuide.png" alt=""><img decoding="async" src="assets/img/BluetoothSwitchGuide.png" alt="" class="ob-sw-on"></div>
      ${App.radio() === 'poweredOff' ? '<div class="t-foot sec">Bluetooth is still off. Turn it on in Control Center to continue.</div>' : ''}</div></div>
      <div class="ob-actions">${App.ob.pri('I\'ve Turned Bluetooth On', 'btRetryPower', 'bluetooth.retryPower')}</div></div>`;
  A.btRetryPower = () => { st().phone.bluetoothOn = true; App.dismiss(true); startScan(); };
  /** The simulator panel turned Bluetooth on while the help sheet was open: search straight away. */
  App.onRadioChange = () => {
    const top = App.topLayer();
    if (App.radio() === 'poweredOn' && top && top.stack && top.stack[0].r === 'btHelp') { App.dismiss(true); startScan(); }
  };
})();
