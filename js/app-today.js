/* Today (HomeView.swift), the recording flow (SessionView / SessionModel / ResultView) and Emergency help. */
(function () {
  const { C, esc, I } = App, R = App.routes, A = App.actions, B = window.Baymo;
  const st = () => App.st;

  /* ---------- Today ---------- */
  R.home = () => {
    const s = st(), now = new Date(), complete = B.homeComplete(s);
    const pd = B.planDay(s, now);
    let line;
    if (complete) line = 'Next check: tomorrow';
    else if (s.recordings.some((r) => B.sameDay(r.date, now) && r.date <= now)) {
      const c = pd.checks.find((x) => x.state.kind !== 'done');
      line = `Let’s do check <b>${c.checkNumber} of ${pd.expected}</b>, <b>${s.plan.durationMinutes} minutes</b>`;
    } else line = `About ${s.plan.durationMinutes} minutes`;
    const headline = complete ? 'Done for today' : 'Start ECG check';
    const follow = B.homeFollowUp(s);
    let banners = '';
    if (follow) banners += `<div class="card row gap8" style="padding:16px;align-items:flex-start" data-key="fu">
        <span style="color:#A36500;font-size:20px">${I('stethoscope')}</span>
        <button class="col gap4 grow" style="text-align:left" data-a="openFollowUp" data-id="${follow.id}"><span class="t-sub bb">Has ${esc(s.child.first)} seen a doctor?</span>
        <span class="t-cap sec">${follow.origin === 'simulated' ? 'Demo result · review this example ECG.' : 'Review the guidance saved with this ECG.'}</span></button>
        <button class="iconbtn" data-a="dismissFollowUp" data-id="${follow.id}" aria-label="Dismiss">${I('xmark')}</button></div>`;
    if (B.showsJournalBanner(s)) banners += `<div class="card row gap12" style="padding:16px;align-items:flex-start" data-key="jb">
        <div class="col gap8 grow"><span class="row gap6 t-cap b" style="color:#6353CB">${I('moon.stars.fill')}TONIGHT</span>
        <span class="t-sub bb">How was ${esc(s.child.first)}'s day?</span><span class="t-sub sec">Add sleep, meal, medicine times and activities that ${esc(s.child.first)} has done today.</span>
        <button class="capsbtn" data-a="openJournal" data-id="home.journalBanner">Log the Day</button></div>
        <button class="iconbtn" data-a="dismissJournalBanner" aria-label="Dismiss">${I('xmark')}</button></div>`;
    const compact = !!banners;
    const quick = [['symptoms', 'Symptoms', 'Log how your child feels', 'waveform.path.ecg.magnifyingglass', 'home.noteSign'], ['journal', 'Journal', 'Note how the day went', 'square.and.pencil', 'home.journal']];
    return `<div class="page" data-key="home">
      <div class="homehead"><div class="t-body b sec">${B.fmt.longDate(now)}</div>
        <button class="glassbtn icon" data-a="openProfile" aria-label="Child profile" data-id="home.profile">${I('person.fill')}</button></div>
      <div class="col" style="flex:1;min-height:0;padding:12px 22px 112px;gap:${compact ? 12 : 20}px">${banners}
        <button class="herocard" data-a="startCheck" data-id="home.start" aria-label="Start ECG check">
          <div class="herobg ${complete ? 'done' : ''}">${complete ? '' : C.wave(560, 0.20, 'rgba(228,248,250,.55)', 'rgba(228,248,250,.55)', 'hw1') + C.wave(560, 0.28, 'rgba(228,248,250,.3)', '#A4E1E6', 'hw2')}</div>
          <div class="col gap12" style="position:relative;padding:20px;flex:1;justify-content:flex-end;min-height:0">
            ${complete ? `<div class="t-sub sec" style="text-align:left">If ${esc(s.child.first)} has any symptoms, you can do another check</div>` : ''}
            <div style="flex:1;min-height:0;position:relative;-webkit-mask-image:linear-gradient(#000 88%,transparent)">${complete ? `<img decoding="async" src="assets/img/HomeChecksComplete.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">` : C.illus('MotherVest', 300, 'position:absolute;inset:0;height:100%')}</div>
            <div class="row gap12"><div class="col gap6 grow" style="text-align:left"><div class="t-title" style="font-weight:600">${headline}</div><div class="t-body homeline">${line}</div></div>
            ${complete ? '' : `<span class="goarrow">${I('arrow.right')}</span>`}</div></div></button>
        <div class="row" style="gap:17px">${quick.map(([a, t, sub, sym, id]) => `<button class="quick" data-a="${a === 'symptoms' ? 'openSymptoms' : 'openJournal'}" data-id="${id}">
          <span class="tint" style="font-size:22px;font-weight:600">${I(sym)}</span><span class="col gap4"><span class="t-body b">${t}</span>${compact ? '' : `<span class="t-cap qsub">${sub}</span>`}</span></button>`).join('')}</div>
      </div></div>`;
  };
  A.openProfile = () => App.push('profile');
  A.dismissFollowUp = (d) => { st().prefs.dismissedFollowUp = d.id; App.render(); };
  A.openFollowUp = (d) => { const r = st().recordings.find((x) => x.id === d.id); if (r) App.push('recordingDetail', { id: r.id }); };
  A.dismissJournalBanner = () => { st().prefs.journalBannerDismissedOn = new Date(); App.render(); };
  A.openJournal = () => App.present('sheet', 'journal', { day: new Date() });
  A.openSymptoms = () => App.present('sheet', 'noteSign', {});
  A.startCheck = () => App.startSession({});

  /* ---------- Recording session (SessionView, vest over Bluetooth: followsVest) ---------- */
  const LAYERS = ['received', 'heartbeat', 'electrodes'];
  App.vestStatus = () => {
    const s = st(), connected = App.vestConnected();
    return { connected, heartbeat: connected && s.sim.heartbeat, contacts: { ...s.sim.contacts }, moving: connected && s.sim.moving };
  };
  App.startSession = ({ diaryEntryID = null }) => {
    const s = st();
    s.session = { stage: 'checking', elapsed: 0, total: s.sim.length, isMoving: false, checkFinished: false, rows: { received: 'checking', heartbeat: 'waiting', electrodes: 'waiting' },
      failure: null, looseDuring: new Set(), diaryEntryID, savedId: null, comparing: false, startedAt: null, checkStart: Date.now() };
    App.present('cover', 'session', {});
    runCheck();
  };
  function liveCheckStep() {
    const se = st().session; if (!se || se.stage !== 'checking') return;
    const v = App.vestStatus(), t = (Date.now() - se.checkStart) / 1000;
    // The check fills in connected → heartbeat → electrodes, as the vest reports.
    const r = se.rows;
    r.received = v.connected ? (t > 0.9 ? 'passed' : 'checking') : (se.checkFinished ? 'failed' : 'checking');
    r.heartbeat = r.received !== 'passed' ? 'waiting' : v.heartbeat ? (t > 1.8 ? 'passed' : 'checking') : (se.checkFinished ? 'failed' : 'checking');
    const allOn = Object.values(v.contacts).every(Boolean);
    r.electrodes = r.heartbeat !== 'passed' ? 'waiting' : allOn ? (t > 2.7 ? 'passed' : 'checking') : (se.checkFinished ? 'failed' : 'checking');
    if (LAYERS.every((l) => r[l] === 'passed')) { se.stage = 'ready'; App.clearTimer(se.checkTimer); App.clearTimer(se.deadline); }
    App.render();
  }
  function runCheck() {
    const se = st().session;
    se.checkStart = Date.now(); se.checkFinished = false;
    App.clearTimer(se.checkTimer); App.clearTimer(se.deadline);
    se.checkTimer = App.every(liveCheckStep, 300);
    // The app waits 20 s; the exhibition demo waits 8 s so visitors see the fix screen sooner.
    se.deadline = App.later(() => { if (se.stage === 'checking') { se.checkFinished = true; liveCheckStep(); } }, 8000);
    liveCheckStep();
  }
  App.recheckSession = () => { const se = st().session; if (se && se.stage === 'checking') runCheck(); };
  const failedLayer = (se) => LAYERS.find((l) => se.rows[l] === 'failed');

  R.session = () => {
    const s = st(), se = s.session; if (!se) return '<div class="page"></div>';
    const name = s.child.first;
    const preparing = se.stage === 'checking' || se.stage === 'ready';
    const flLayer = failedLayer(se);
    let body = '', actions = '', nav = '', bg;
    const interrupted = se.stage === 'failed';
    bg = C.clinicalBg({ neutral: interrupted || !!flLayer, attention: se.stage === 'recording' && se.isMoving, showsWave: se.stage !== 'recording', interrupted });
    if (preparing) {
      nav = C.nav({ left: C.back('closeFlow', 'flow.cancel'), title: 'Get Ready' });
      const v = App.vestStatus();
      const statusTxt = v.connected ? 'Connected' : se.checkFinished ? 'Not connected' : 'Checking…';
      const devStatus = `<div class="row gap10" style="padding:16px 20px" data-id="session.vest"><span style="font-size:20px">${I('dot.radiowaves.left.and.right')}</span><span class="grow">ECG Vest</span>
        <span class="t-foot statuspill ${v.connected ? 'ok' : se.checkFinished ? 'bad' : ''}">${statusTxt}</span></div>`;
      if (flLayer === 'received') body = `<div class="col gap16"><div style="background:var(--bg);border-radius:999px">${devStatus}</div>${disconnectedCard()}</div>`;
      else if (!flLayer) body = `<div class="card" style="overflow:hidden">${devStatus}${electrodesCard()}</div>`;
      else body = `<div class="col gap16"><div style="background:var(--bg);border-radius:999px">${devStatus}</div>${electrodesCard()}</div>`;
      if (se.stage === 'ready') actions = `<div class="col gap8" style="padding-bottom:10px"><div class="row"><span class="row gap6 t-headline grow">${I('moon.stars')}Calm and rested</span><span class="row gap4 t-cap sec">${I('clock')}${B.fmt.duration(se.total)}</span></div>
        <div class="t-sub sec">Start when ${esc(name)} is relaxed, for example sitting down with a favourite show.</div></div>`;
      actions += `<button class="btn pri" data-a="startRecording" ${se.stage === 'ready' ? '' : 'disabled'} data-id="signal.start">Start Recording</button>`;
      body = `<div style="padding-top:22px">${body}</div>`;
    } else if (se.stage === 'recording') {
      nav = C.nav({ left: `<button class="glassbtn" data-a="confirmStop">Stop</button>` });
      const left = Math.max(0, se.total - se.elapsed);
      const ends = new Date(Date.now() + left * 1000);
      body = `<div class="col" style="align-items:center;min-height:700px;padding-top:16px">
        <div class="row gap10 t-title">${I('waveform.path.ecg')}Recording…</div><div style="height:150px"></div>
        <div class="col gap8 center"><div class="t-title3">${left <= 10 ? 'Almost done' : 'Time left'}</div>
        <div class="bigtimer" data-id="session.timer">${[...B.fmt.mmss(left)].map((c, i) => `<span class="dg" data-key="d${i}${c}">${c}</span>`).join('')}</div><div class="t-title3 sec">Ends at about ${B.fmt.time(ends)}</div></div>
        ${se.isMoving ? `<div class="movewarn" style="margin:26px 15px 0"><div class="mw-top">${I('exclamationmark.circle.fill')}ATTENTION</div>
          <div class="row gap10" style="padding:16px;align-items:flex-start"><span style="font-size:22px">${I('figure.walk')}</span><div class="col gap4"><div class="t-headline">${esc(name)} is moving</div>
          <div class="t-sub sec">Help ${esc(name)} get comfortable and keep still. Moving can stop the vest from reading their heart clearly.</div></div></div></div>`
          : `<div style="flex:1"></div><div class="glasscap">All good, keep ${esc(name)} calm and still</div><div style="height:62px"></div>`}</div>`;
    } else if (se.stage === 'checkingResult') {
      body = `<div class="col center" style="gap:10px;align-items:center;padding-top:64px">
        <div class="t-title" style="max-width:319px" data-id="recording.complete.title">${se.comparing ? `Comparing with ${esc(name)}'s<br>usual heart rhythm...` : 'Recording complete'}</div>
        <div class="t-foot sec" style="max-width:319px">${se.comparing ? `You can now remove the vest from your child while we compare the results with ${esc(name)}'s baseline ECG.` : 'You can now remove the vest from your child while we save the ECG on this phone.'}</div>
        <div style="width:341px;margin-top:38px">${C.illus('MotherComparing', 407)}</div></div>`;
    } else if (interrupted) {
      const conn = se.failure === 'connection';
      const steps = conn ? [['1. Switch the vest on', 'Check the vest is switched on.'], ['2. Keep your phone nearby', 'Place your phone next to the vest for a better connection.'], ['3. Start Again', 'The recording restarts from 0:00.']]
        : [['1. Check the electrodes', `Make sure each electrode sits flat on ${name}'s skin and hasn’t moved.`], ['2. Start Again', `Keep ${name} still and relaxed. The recording restarts from 0:00.`]];
      body = `<div class="col gap24" style="padding-top:80px">${conn ? `<div style="height:135px;display:grid;place-items:center"><img decoding="async" src="assets/img/VestConnectionLost.png" alt="" style="max-height:135px"></div>`
          : `<div style="display:flex;justify-content:center">${sensorDiagram(diagramStates(), 150)}</div>`}
        <div class="card col gap24" style="padding:24px"><div class="col gap10"><div class="t-title">${conn ? 'Vest Disconnected' : 'Signal Lost'}</div>
        <div class="sec">${conn ? 'The recording stopped because the vest lost its connection.' : 'The recording stopped because the vest stopped picking up the heart rhythm.'}</div></div>${C.instructionSteps(steps)}</div></div>`;
      actions = `<button class="btn pri" data-a="recordAgain" data-id="session.giveUp">Record Again</button><button class="btn sec" data-a="closeFlow">Back to Today</button>`;
    }
    // RecordingWater: drawn every frame by animations.js from the session's progress.
    const water = se.stage === 'recording' ? `<canvas class="rwater" width="804" height="1748" data-key="rwater" data-static></canvas>` : '';
    return `<div class="page" data-key="session-${se.stage}">${bg}${water}${nav || '<div style="height:54px;flex:none"></div>'}
      <div class="scroll" style="position:relative"><div style="padding:0 22px 16px;min-height:100%">${body}</div></div>${actions ? `<div class="actionbar" style="padding-left:22px;padding-right:22px">${actions}</div>` : ''}</div>`;
  };
  function diagramStates() {
    const se = st().session, v = App.vestStatus(), out = {};
    B.ELECTRODES.forEach((e) => {
      if (se.stage === 'checking') out[e.key] = se.rows.heartbeat === 'passed' || se.checkFinished ? (v.contacts[e.key] ? 'passed' : 'failed') : null;
      else if (se.stage === 'failed') out[e.key] = se.looseDuring.has(e.key) ? 'failed' : 'passed';
      else out[e.key] = 'passed';
    });
    return out;
  }
  function sensorDiagram(states, height) {
    const w = height * 140 / 162;
    const attention = Object.values(states).includes('failed');                     // VestArtwork(neutral:) swaps to the VestFrontAttention artwork
    return `<div class="sensordiagram" style="width:${w}px;height:${height}px"><img decoding="async" src="assets/img/${attention ? 'VestFrontAttention' : 'VestFront'}.png" alt="">${B.ELECTRODES.map((e) => {
      const s = states[e.key];
      return `<span class="edot ${s || 'unknown'}" style="left:${e.x * 100}%;top:${e.y * 100}%" title="${e.name}">${s === 'failed' ? '!' : ''}</span>`;
    }).join('')}</div>`;
  }
  App.sensorDiagram = sensorDiagram;
  function electrodesCard() {
    const se = st().session, fl = failedLayer(se), needsFix = !!fl;
    const states = diagramStates(), touching = Object.values(states).filter((x) => x === 'passed').length;
    const label = touching === 0 && !se.checkFinished && !needsFix ? 'Checking…' : needsFix ? `${5 - touching} of 5 aren’t connected` : `${touching} of 5 in place`;
    let fix = '';
    if (needsFix) {
      if (fl === 'electrodes') fix = `<div class="t-headline">${5 - touching} ${5 - touching === 1 ? 'Electrode isn’t' : 'Electrodes aren’t'} sending data</div>`;
      else fix = `<div class="t-headline">We can't see a clear heartbeat yet.</div><div class="t-sub sec">Help ${esc(st().child.first)} stay still and calm for a moment.</div>`;
      fix += C.steps(['Check all the electrodes are touching the skin', 'Make sure the skin is dry and the electrodes lie flat against it.', 'Press the electrodes down gently for a few seconds.'], 'var(--attention)', { compact: true, font: 't-sub' });
    }
    return `<div style="background:${needsFix ? 'var(--warning-surface)' : 'var(--bg)'};border-radius:24px;overflow:hidden" data-id="session.sensors">
      ${needsFix ? '<div style="height:14px;background:var(--attention)"></div>' : ''}
      <div class="col gap16" style="padding:16px ${needsFix ? 14 : 24}px 24px"><div class="t-headline center">Electrodes</div>
      <div style="display:flex;justify-content:center">${sensorDiagram(states, 174)}</div>
      <div style="display:flex;justify-content:center"><span class="row gap6 t-cap" style="padding:7px 11px;border-radius:999px;background:${needsFix ? 'rgba(255,221,69,.16)' : 'var(--surface)'}">${I(needsFix ? 'exclamationmark.circle.fill' : 'checkmark.circle.fill')}${label}</span></div>
      ${fix}</div></div>`;
  }
  function disconnectedCard() {
    return `<div style="background:var(--disconnected-surface);border-radius:24px;overflow:hidden"><div style="height:14px;background:var(--emergency)"></div>
      <div class="col gap14" style="padding:20px"><div style="height:135px;display:grid;place-items:center;margin:6px 0 26px"><img decoding="async" src="assets/img/VestConnectionLost.png" alt="" style="max-height:135px"></div>
      <div class="t-headline">The vest is not connected</div>${C.steps(['Make sure Bluetooth is enabled.', 'Keep the vest close to your phone.', 'Make sure the vest is turned on.'], 'var(--gray2)', { compact: true, font: 't-callout' })}
      <button class="row t-sub b" style="padding:14px;margin-top:8px;border-radius:999px;background:var(--bg)" data-a="openConnectionSheet" data-id="session.connectionSettings"><span class="grow">Open Settings</span>${I('chevron.right')}</button>
      <div class="t-cap sec" style="padding:0 16px">Check vest & phone connection in Settings.</div></div></div>`;
  }
  A.openConnectionSheet = () => { App.resetBt(); App.present('sheet', 'bluetooth', { session: true }, { onDismiss: () => { App.resetBt(); App.recheckSession(); } }); };
  A.closeFlow = () => { endSession(); App.dismissUntil((l) => !(l.stack && l.stack[0].r === 'session')); App.dismiss(true); };
  function endSession() { const se = st().session; if (se) { App.clearTimer(se.checkTimer); App.clearTimer(se.deadline); App.clearTimer(se.tick); App.clearTimer(se.finishT); } st().session = null; }
  App.endSession = endSession;
  A.confirmStop = () => App.dialog({ title: 'Stop recording?', message: 'This recording won’t be saved.', cancel: 'Keep recording', buttons: [{ label: 'Stop recording', destructive: true, run: A.closeFlow }] });
  A.startRecording = () => {
    const se = st().session; if (se.stage !== 'ready') return;
    se.stage = 'recording'; se.elapsed = 0; se.isMoving = false; se.looseDuring = new Set(); se.total = st().sim.length; se.startedAt = new Date();
    se.tick = App.every(recTick, 1000); App.render();
  };
  function recTick() {
    const se = st().session; if (!se || se.stage !== 'recording') return;
    const v = App.vestStatus();
    if (!v.connected) { failSession('connection'); return; }
    // Bluetooth vest (followsVest): electrode loss doesn't stop the attempt; the finished recording is checked at the end.
    Object.entries(v.contacts).forEach(([k, on]) => { if (!on) se.looseDuring.add(k); });
    if (!v.heartbeat) se.noHeartbeat = true;
    se.isMoving = v.moving;
    se.elapsed += 1;
    if (se.elapsed >= se.total) finishRecording();
    App.render();
  }
  App.sessionStatusChanged = () => {
    const se = st().session; if (!se) return;
    if (se.stage === 'recording') { const v = App.vestStatus(); se.isMoving = v.moving; if (!v.connected) failSession('connection'); else Object.entries(v.contacts).forEach(([k, on]) => { if (!on) se.looseDuring.add(k); }); }
  };
  App.failSession = (k) => failSession(k);
  function failSession(kind) {
    const se = st().session; App.clearTimer(se.tick); se.stage = 'failed'; se.failure = kind; se.isMoving = false;
    if (kind === 'connection') st().vest.connected = false;
    App.render();
  }
  function finishRecording() {
    const s = st(), se = s.session; App.clearTimer(se.tick);
    if (se.looseDuring.size || se.noHeartbeat) { se.stage = 'failed'; se.failure = 'sensors'; if (!se.looseDuring.size) se.looseDuring.add('v1'); App.render(); return; }
    const outcome = s.sim.outcome; // DemoResultChoice: usual · changed · unclear · savedOnly
    se.comparing = outcome !== 'savedOnly';
    se.stage = 'checkingResult'; App.render();
    se.finishT = App.later(() => saveRecording(outcome), se.comparing ? 3000 : 1400);
  }
  App.saveRecording = saveRecording;
  function saveRecording(outcome) {
    const s = st(), se = s.session;
    const status = { usual: 'notAnalyzed', changed: 'abnormal', unclear: 'unsure', savedOnly: 'notAnalyzed' }[outcome];
    const linked = se.diaryEntryID ? s.diary.find((e) => e.id === se.diaryEntryID) : null;
    const rec = { id: B.id('rec'), date: new Date(), duration: se.total, status, origin: 'simulated', demo: outcome !== 'savedOnly', notes: '', symptoms: linked ? linked.signs.slice() : [],
      diaryEntryID: se.diaryEntryID, signal: { seed: Math.floor(Math.random() * 1000), hr: 96, changed: outcome === 'changed' } };
    s.recordings.unshift(rec);
    if (linked) linked.recordingID = rec.id;
    se.savedId = rec.id;
    App.currentStack().push({ r: 'result', p: { id: rec.id }, key: `res${rec.id}` });
    App.render();
  }
  A.recordAgain = () => { const se = st().session; Object.assign(se, { stage: 'checking', elapsed: 0, failure: null, looseDuring: new Set(), noHeartbeat: false, isMoving: false }); runCheck(); };

  /* ---------- Result (ResultView + RecordingOutcomeHeader) ---------- */
  App.outcomeHeader = (rec, { compact = false } = {}) => {
    const s = st(), name = s.child.first, demo = rec.demo && rec.status === 'notAnalyzed';
    const title = { notAnalyzed: demo ? 'All looks good' : 'Recording saved', noChange: 'All looks good', abnormal: 'Changes detected', unsure: 'Unable to determine' }[rec.status];
    const detail = { notAnalyzed: demo ? 'Demo result · matches the demo baseline.' : "Your ECG is saved on this phone. It has not been compared with your child's baseline.",
      noChange: `This recording matches ${name}'s usual heart rhythm.`, abnormal: `${esc(name)}'s heart rhythm looked <b>different from usual</b> in this recording. This isn’t a diagnosis. A doctor will tell you what it means.`,
      unsure: 'Try to record again or call the doctor if this keeps occurring.' }[rec.status];
    const img = rec.status === 'abnormal' ? 'ResultChanged' : rec.status === 'unsure' ? 'ResultUnclear' : rec.status === 'noChange' || demo ? 'ResultUsual' : null;
    const w = rec.status === 'abnormal' ? 262 : rec.status === 'unsure' ? 216 : 198, hgt = rec.status === 'abnormal' ? 92 : 78;
    return `<div class="col gap8 center" style="align-items:center">
      <div style="width:${w}px;height:${hgt}px;display:grid;place-items:center;margin-bottom:${rec.status === 'abnormal' ? 7 : 12}px">${img ? `<img decoding="async" src="assets/img/${img}.svg" alt="" style="max-width:100%;max-height:100%">` : `<span class="tint" style="font-size:62px">${I('tray.and.arrow.down')}</span>`}</div>
      <div class="t-title" data-id="recording.savedTitle">${title}</div><div class="t-sub sec">${rec.status === 'abnormal' ? detail : esc(detail)}</div>
      <div class="t-foot sec">${demo ? 'Demo · no ML analysis' : "Generated test signal · not a measurement of your child's heart."}</div>
      <span class="badge-demo">${I('info.circle')}Simulated result</span></div>`;
  };
  const resultRow = (title, sub, sym, action, attrs = '') => `<button class="resrow" data-a="${action}" ${attrs}><span class="row sec t-sub">${I(sym)}<span class="grow"></span>${I('arrow.right')}</span>
    <span class="t-sub b">${esc(title)}</span><span class="t-cap sec">${esc(sub)}</span></button>`;
  const guidance = (title, detail, sym, action) => `<${action ? `button data-a="${action}"` : 'div'} class="col gap8" style="text-align:left"><span class="sec">${I(sym)}</span><span class="t-sub bb">${esc(title)}</span><span class="t-sub sec">${esc(detail)}</span></${action ? 'button' : 'div'}>`;
  function nextCheckSummary() {
    const s = st(), pd = B.planDay(s, new Date());
    const remaining = Math.max(0, pd.expected - pd.checks.filter((c) => c.state.kind === 'done').length);
    const tomorrow = B.addDays(new Date(), 1);
    return `<div class="row gap6 t-sub sec" style="justify-content:center">${I('calendar.badge.clock')}${remaining > 0 ? (remaining === 1 ? 'One more check today' : `${remaining} more checks today`) : `Next check: ${B.fmt.WD[tomorrow.getDay()]}, ${tomorrow.getDate()} ${B.fmt.MON[tomorrow.getMonth()].slice(0, 3)}`}</div>`;
  }
  App.nextCheckSummary = nextCheckSummary;
  R.result = (p) => {
    const s = st(), rec = s.recordings.find((r) => r.id === p.id); if (!rec) return '<div class="page"></div>';
    const name = s.child.first;
    let body = App.outcomeHeader(rec);
    if (rec.status === 'unsure') {
      body += `<div class="col gap10"><div class="t-sub b">What to do now</div><div class="gcard col gap24">${guidance('Try recording again', 'Check that the vest is connected and all electrodes are in place before trying again.', 'waveform.path.ecg.rectangle')}
        ${guidance(`Contact ${name}'s doctor`, 'If you still can’t get a clear check, ask your doctor for guidance', 'person.line.dotted.person', 'callCareTeam')}</div></div>`;
    } else {
      if (rec.status === 'abnormal') body += `<div class="col gap10"><div class="t-sub b">What to do now</div><div class="gcard clear col gap24">${guidance(`Go to ${name}'s doctor today`, 'Doctor can review the recording and determine whether any follow-up is needed.', 'person.line.dotted.person', 'callCareTeam')}
        ${guidance('Watch for warning signs', `Let ${name} rest until you see the doctor. Call emergency services now if ${name} shows any concerning symptoms.`, 'exclamationmark.triangle')}</div></div>`;
      const noted = rec.symptoms.length;
      body += `<div class="col gap8">
        ${resultRow(noted ? 'Review Symptoms' : 'Log Symptoms', noted ? rec.symptoms.map((x) => B.SYMPTOMS[x].short).join(', ') : 'Log symptoms that happened during the recording', 'list.clipboard.fill', 'resultSymptoms', `data-id="${rec.id}"`)}
        ${resultRow(rec.status === 'abnormal' ? 'Where it looked different' : 'See Full Recording', `The whole ${B.fmt.duration(rec.duration)} recording`, 'waveform.path.ecg.rectangle', 'resultSignal', `data-id="${rec.id}"`)}
        ${rec.status !== 'abnormal' ? `<div style="padding-top:4px">${nextCheckSummary()}</div>` : ''}</div>`;
    }
    const linked = rec.diaryEntryID && s.diary.find((e) => e.id === rec.diaryEntryID);
    if (linked && B.afterSaveRoute(linked) === 'emergency') body += resultRow('Emergency help', `This can be serious. If ${name} has it right now, call an ambulance or open Emergency help.`, 'cross.case.fill', 'resultEmergency');
    const actions = rec.status === 'unsure' ? `<button class="btn pri" data-a="tryAgain" data-id="result.retry">Try Again</button><button class="btn sec" data-a="closeFlow" data-id="result.done">Back to Today</button>`
      : `<button class="btn pri" data-a="closeFlow" data-id="result.done">Done</button>`;
    return `<div class="page">${C.clinicalBg({ neutral: rec.status === 'unsure', attention: rec.status === 'abnormal', fillsPage: true })}${C.nav({ title: rec.status === 'unsure' ? 'Recording Problem' : 'Recording Result' })}
      <div class="scroll" style="position:relative"><div class="col gap24" style="padding:${rec.status === 'abnormal' ? 0 : 12}px 22px 24px">${body}</div></div><div class="actionbar">${actions}</div></div>`;
  };
  A.callCareTeam = () => App.callAlert(st().child.careTeamPhone, `Call ${st().child.careTeamName}`);
  App.callAlert = (number, label) => App.alert({ title: label || `Call ${number}`, message: 'Calls can’t be placed from this exhibition demo. On an iPhone, Baymo opens the phone call here.', buttons: [{ label: 'OK' }] });
  A.resultSymptoms = (d) => App.present('sheet', 'noteSign', { recordingID: d.id });
  A.resultSignal = (d) => App.present('sheet', 'fullSignal', { id: d.id, sheet: true });
  A.resultEmergency = () => App.present('cover', 'emergency', { urgent: false });
  A.tryAgain = () => { const sess = App.topLayer(); sess.stack.splice(1); A.recordAgain(); App.render(); };

  /* ---------- Full recording (FullSignalView) ---------- */
  R.fullSignal = (p) => {
    const s = st(), rec = s.recordings.find((r) => r.id === p.id); if (!rec) return '<div class="page"></div>';
    const samples = B.signalFor(s, rec), fs = ECGSignal.fs, perRow = fs * 4;
    const showsFindings = rec.status === 'abnormal';
    const statusTitle = { notAnalyzed: rec.demo ? 'All looks good' : 'Saved · not analysed', noChange: 'All looks good', abnormal: 'A change was found', unsure: 'Unable to determine' }[rec.status];
    const sym = rec.status === 'noChange' || (rec.demo && rec.status === 'notAnalyzed') ? 'checkmark.circle.fill' : rec.status === 'abnormal' ? 'exclamationmark.circle.fill' : 'waveform.path.ecg';
    const rows = [];
    for (let start = 0; start < samples.length; start += perRow) {
      const sec = start / fs, end = Math.min(start + perRow, samples.length);
      const frac = sec / rec.duration, diff = showsFindings && frac >= 0.25 - 4 / rec.duration && frac < 0.75;
      rows.push(`<div class="col gap6" data-key="row${start}"><div class="row gap8"><span class="t-cap sec" style="font-variant-numeric:tabular-nums">${B.fmt.clock(sec)}</span>${diff ? '<span class="t-cap b" style="background:var(--attention);padding:2px 8px">Different here</span>' : ''}</div>
        <div style="position:relative;height:64px;overflow:hidden;${diff ? 'background:rgba(255,221,69,.22)' : ''}">${C.ecgRow(samples, start, end, 330 * (end - start) / perRow, 64)}</div></div>`);
    }
    const left = p.sheet ? `<button class="glassbtn" data-a="dismiss">Done</button>` : C.back();
    return `<div class="page"><div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(var(--bg), var(--fullrec-end))" aria-hidden="true"></div>${C.nav({ left, title: 'Full recording', right: `<button class="glassbtn icon" data-a="pushDetail" data-id="${rec.id}" aria-label="Recording details" data-id2="recording.details">${I('info.circle')}</button>` })}
      <div class="scroll" style="position:relative"><div class="col gap16" style="padding:20px">
      <div class="col gap6"><div class="t-title3">${B.fmt.weekdayDayMonth(rec.date)}</div><div class="t-sub sec">Check at ${B.fmt.time(rec.date)}</div></div>
      <div class="row"><span class="row gap6 t-body b">${rec.status === 'abnormal' ? '<span class="attn-icon" aria-hidden="true">!</span>' : `<span class="tint">${I(sym)}</span>`}${statusTitle}</span><span class="grow"></span><span class="t-foot">${B.fmt.duration(rec.duration)} recording</span></div>
      ${rec.demo && rec.status === 'notAnalyzed' ? '<div class="t-cap sec">Demo · no ML analysis</div>' : ''}
      <div class="illus-label">${I('info.circle')}Generated test signal · not a measurement of your child's heart</div>
      <div class="card col gap14" style="padding:16px">${rows.join('')}</div>
      <div class="t-foot sec center">Scroll to see all ${B.fmt.duration(rec.duration)}. You can check it again in History.</div></div></div></div>`;
  };
  A.pushDetail = (d) => App.push('recordingDetail', { id: d.id });

  /* ---------- Emergency help (EmergencyView) ---------- */
  R.emergency = (p) => {
    const s = st(), name = s.child.first, urgent = !!p.urgent;
    const summary = (p.signs && p.signs.length) || p.note ? App.savedSummary(p.signs || [], p.note || '') : '';
    const closeTitle = p.closeTitle || (p.tab ? '' : 'Back');
    return `<div class="page" style="background:linear-gradient(var(--bg),var(--disconnected-surface) 45%,var(--disconnected-surface))">
      <div style="height:54px;flex:none"></div><div class="scroll"><div class="col gap22" style="padding:24px;padding-top:${urgent ? 60 : 24}px;align-items:center;text-align:center;min-height:100%;justify-content:${urgent ? 'flex-start' : 'center'}">
      <img decoding="async" src="assets/img/HospitalHelp.svg" alt="" style="width:206px;height:206px">
      <div class="t-title" style="color:${urgent ? '#582222' : 'var(--label)'}" data-id="${urgent ? 'symptoms.outcome.title' : 'emergency.title'}">${urgent ? 'Go to the hospital now' : 'Emergency help'}</div>
      <div class="t-sub sec">${urgent ? 'Call 119 or go to the nearest hospital now.' : `If ${esc(name)} is visibly unwell, call for help first.`}</div>
      ${summary}
      ${urgent ? '' : `<button class="linkbtn" data-a="callCare" data-id="emergency.callCareTeam">${I('phone')}Call ${esc(s.child.careTeamName)}</button>
        ${s.prefs.emergencyContactPhone ? `<button class="linkbtn" data-a="callContact">${I('person.crop.circle')}${s.prefs.emergencyContactName ? `Call ${esc(s.prefs.emergencyContactName)}` : 'Call emergency contact'}</button>` : ''}`}
      <div class="demo-hint" style="text-align:left">${I('info.circle')}<span>Exhibition demo: phone numbers are fictional and calls can’t be placed.</span></div></div></div>
      <div class="actionbar"><button class="btn emerg" data-a="callAmbulance" data-id="emergency.callAmbulance">Call ${B.AMBULANCE}</button>
      ${urgent ? '' : `<button class="linkbtn t-foot" style="font-size:13px;min-height:30px" data-a="callGeneral">Can't get through? Call ${B.GENERAL_EMERGENCY}</button>`}
      ${p.tab ? '' : `<button class="btn sec" data-a="${p.closeAction || 'dismiss'}" data-id="${p.closeId || 'emergency.done'}">${esc(closeTitle)}</button>`}</div></div>`;
  };
  R.help = () => R.emergency({ tab: true }).replace('<div class="page"', '<div class="page" data-key="help"').replace('<div class="actionbar">', '<div class="actionbar" style="padding-bottom:112px">');
  A.callAmbulance = () => App.callAlert(B.AMBULANCE, `Call ${B.AMBULANCE}`);
  A.callGeneral = () => App.callAlert(B.GENERAL_EMERGENCY, `Call ${B.GENERAL_EMERGENCY}`);
  A.callCare = () => App.callAlert(st().child.careTeamPhone, `Call ${st().child.careTeamName}`);
  A.callContact = () => App.callAlert(st().prefs.emergencyContactPhone, `Call ${st().prefs.emergencyContactName || 'emergency contact'}`);
  /* SavedSymptomsSummary: label above the list, both leading-aligned */
  App.savedSummary = (signs, note) => `<div class="card col gap10" style="padding:20px;width:100%;align-items:flex-start;text-align:left;border-radius:28px;box-shadow:0 3px 3px rgba(0,0,0,.06)">
    <span class="row gap6 t-sub sec">${I('list.clipboard')}${signs.length ? 'Symptoms' : 'Note'}</span><span style="text-align:left">${esc(signs.length ? B.SYMPTOM_ORDER.filter((x) => signs.includes(x)).map((x) => B.SYMPTOMS[x].short).join(', ') : note)}</span></div>`;
})();
