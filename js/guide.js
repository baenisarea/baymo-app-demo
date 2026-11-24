/* Six-Screen Exhibition · App Demo, in nine sections that follow the Baymo iOS source.
   Each step knows how to set the phone up (enter) and how to recognise the phone's screen (match),
   so the left column follows any tap on the phone and the phone follows Next / Back on the left. */
(function () {
  const B = window.Baymo, A = App.actions, I = App.I;
  const st = () => App.st;
  const IDLE_MS = 90000;
  let cur = -1;               // index into STEPS, -1 = start screen
  let pending = null;

  /* ---------- phone helpers ---------- */
  const top = () => App.topLayer();
  const topRoute = () => { const l = top(); return l && l.stack ? l.stack[l.stack.length - 1].r : null; };
  const topP = () => { const l = top(); return l && l.stack ? l.stack[l.stack.length - 1].p : {}; };
  const baseTop = () => { const s = App.baseStack(); return s[s.length - 1].r; };
  const sessionLayer = () => st().ui.layers.some((l) => l.stack && l.stack[0].r === 'session');
  const overlay = () => st().ui.layers.some((l) => l.stack);       // sheets and covers, not alerts
  function clean() {
    clearTimeout(pending); pending = null;
    App.endSession(); App.resetBt();
    const s = st(); s.ui.layers = []; s.ui.draft = null; s.ui.toast = null; s.ui.voice = null; s.ui.act = null; s.ui.weekDir = '';
    Object.assign(s.sim, { length: 30, moving: false, powered: true, heartbeat: true, outcome: 'usual' }); s.phone.bluetoothOn = true;
    B.ELECTRODES.forEach((e) => { s.sim.contacts[e.key] = true; });
  }
  function onboarding(page) { clean(); const s = st(); s.setupDone = false; s.page = page; s.vest.connected = page !== 'vest' && s.vest.connected; }
  function home(tab = 'home') {
    clean();
    const s = st();
    if (!s.recordings.length && !s.diary.length) B.seedHistory(s);   // after "Delete All Data"
    s.demoProfile = true; s.phone.permission = 'allowed'; s.vest.connected = true; s.vest.paired = true;
    if (!s.setupDone) App.completeSetup();
    s.ui.tab = tab; s.ui.stacks = {}; s.ui.layers = []; s.ui.historyDay = B.startOfDay(new Date());
    s.eveningPreview = false; hideFollowUp(true);
  }
  function hideFollowUp(hide) { const p = st().prefs; p.dismissedFollowUp = null; const f = B.homeFollowUp(st()); p.dismissedFollowUp = hide && f ? f.id : null; }
  function todayChecks(n) {
    const s = st(), now = Date.now();
    s.recordings = s.recordings.filter((r) => !B.sameDay(r.date, new Date()));
    for (let i = 0; i < n; i++) {
      const d = new Date(Math.max(B.startOfDay(new Date()).getTime() + 60000, now - (n - i) * 45 * 60000));
      s.recordings.unshift({ id: B.id('rec'), date: d, duration: 300, status: 'notAnalyzed', origin: 'simulated', demo: true, notes: '', symptoms: [], diaryEntryID: null, signal: { seed: 40 + i, hr: 96, changed: false } });
    }
    s.recordings.sort((a, b) => b.date - a.date);
  }
  function session(ready) {
    home(); App.startSession({});
    const se = st().session;
    if (ready) { App.clearTimer(se.checkTimer); App.clearTimer(se.deadline); se.rows = { received: 'passed', heartbeat: 'passed', electrodes: 'passed' }; se.stage = 'ready'; }
    return se;
  }
  function failedCheck(kind) {
    const s = st(), se = session(false);
    if (kind === 'electrodes') { s.sim.contacts.ra = false; s.sim.contacts.rl = false; } else s.vest.connected = false;
    App.clearTimer(se.deadline); se.checkStart = Date.now() - 5000; se.checkFinished = true;
  }
  function recording() { session(true); A.startRecording(); return st().session; }
  function result(outcome) {
    home(); const s = st();
    s.session = { stage: 'checkingResult', total: s.sim.length, elapsed: s.sim.length, rows: {}, looseDuring: new Set(), diaryEntryID: null, comparing: outcome !== 'savedOnly' };
    App.present('cover', 'session', {});
    App.saveRecording(outcome);
  }
  function symptomOutcome(sign) {
    home(); App.present('sheet', 'noteSign', {});
    st().ui.draft = { for: 'new', signs: [sign], text: '', ongoing: true, activity: '', medicine: '', startedAt: new Date(), showsNotes: false, showsContext: false, isSpoken: false };
    A.saveSigns();
    const e = st().diary[st().diary.length - 1]; if (e) e.demoPreview = true;
  }
  function journal(...more) {
    home(); App.present('sheet', 'journal', { day: new Date() });
    more.forEach((f) => f());
  }
  const picker = () => App.present('sheet', 'activityPicker', { day: new Date() });
  function history(day) {
    home('history'); todayChecks(1);
    st().diary = st().diary.filter((e) => !e.demoPreview);
    if (day) st().ui.historyDay = B.startOfDay(day);
  }
  const dayItems = (d) => B.timeline(st(), d).length;
  function emptyDay() { let d = B.addDays(new Date(), -16); while (dayItems(d)) d = B.addDays(d, -1); return d; }
  function profile(sub) { home(); App.push('profile', {}); if (sub) App.push(sub, {}); }

  /* phone state predicates */
  const setupPage = (p) => () => !st().setupDone && st().page === p;
  const onHome = () => st().setupDone && st().ui.tab === 'home' && baseTop() === 'home' && !overlay();
  const se = () => st().session;
  const checking = () => sessionLayer() && topRoute() !== 'result' && se() && (se().stage === 'checking' || se().stage === 'ready');
  const recStatus = () => { if (topRoute() !== 'result') return null; const r = st().recordings.find((x) => x.id === topP().id); return r && (r.status === 'notAnalyzed' ? (r.demo ? 'usual' : 'savedOnly') : { abnormal: 'changed', unsure: 'unclear', noChange: 'usual' }[r.status]); };
  const bt = () => App.btState();
  const onVest = () => setupPage('vest')() && st().phone.permission !== 'denied' && st().phone.bluetoothOn && !['btHelp', 'iosSettings'].includes(topRoute());
  function vestPage(permission) { onboarding('vest'); const s = st(); s.bt = null; s.phone.permission = permission; s.phone.bluetoothOn = true; s.vest.connected = false; s.vest.paired = false; }
  const recOf = () => { const r = st().recordings.find((x) => x.id === topP().id); return r && (r.status === 'abnormal' ? 'changed' : 'usual'); };
  const onHistory = () => st().setupDone && st().ui.tab === 'history';
  const afterSaveRoute = () => (topRoute() === 'afterSave' ? topP().route : topRoute() === 'emergency' && topP().urgent ? 'emergency' : null);

  /* ---------- the nine sections ----------
     steps: the parent's journey, in order.
     modes: other situations the app can show (states and alternative scenarios). They are not next actions;
            each one branches from the step named in `of` and returns there. */
  const checksToday = () => st().recordings.filter((r) => B.sameDay(r.date, new Date())).length;
  const homePlain = () => onHome() && !B.homeComplete(st()) && !B.showsJournalBanner(st()) && !B.homeFollowUp(st());
  const SECTIONS = [
    { name: 'Onboarding', steps: [
      { title: 'Welcome', text: "Baymo helps parents record their child's heart at home and keep the care team informed.", tap: 'Get Started',
        enter: () => onboarding('welcome'), match: setupPage('welcome') },
      { title: 'Not a replacement for the doctor', text: 'Baymo records heart activity for the care team to review. It doesn’t replace a medical diagnosis.', tap: 'Continue',
        enter: () => onboarding('purpose'), match: setupPage('purpose') },
      { title: 'What we record', text: 'Parents see what Baymo keeps on the phone: heart recordings, symptoms and recording history. The privacy policy is one tap away.', tap: 'Agree & Continue',
        enter: () => onboarding('overview'), match: setupPage('overview') },
      { title: 'Enter the doctor code', text: "A code from the doctor links the child's profile and care information to this phone.", tap: 'the boxes, then Continue', note: 'Demo code: 123456.',
        actions: [{ label: 'Simulate: type 123456', run() { A.fillCode({ code: '123456' }); } }],
        enter() { onboarding('profile'); st().doctorCode = ''; st().invalidCode = false; }, match: () => setupPage('profile')() && !st().invalidCode },
      { title: 'Profile ready', text: "Parents check the child's details before going on.", tap: 'Continue', note: 'Fictional child.',
        enter() { onboarding('profileReady'); st().demoProfile = true; }, match: setupPage('profileReady') },
      { title: 'Connect the vest', text: 'Baymo asks for Bluetooth so it can find and connect to the ECG vest.', tap: 'Continue, then Allow', note: 'Simulated vest. No Bluetooth is used.',
        enter() { vestPage('notDetermined'); },
        match: () => onVest() && !bt().requested && !bt().scanning && !bt().connecting && !st().vest.connected && topRoute() !== 'vestFound' },
      { title: 'Searching for your vest', text: 'Baymo looks for the vest nearby. Parents switch the vest on and keep the phone close to it.', note: 'Simulated vest. On the phone the vest is found after a few seconds.',
        action: { label: 'Simulate: the vest is nearby', run() { App.btShowFound(); } },
        enter() { vestPage('allowed'); const b = bt(); b.hold = true; App.startScan(); },
        match: () => onVest() && (bt().scanning || bt().requested) && !bt().connecting && !st().vest.connected && topRoute() !== 'vestFound' },
      { title: 'Vest Found', text: 'When a vest is found, Baymo asks the parent to confirm it is theirs before connecting.', tap: 'Connect', note: 'Simulated vest.',
        enter() { vestPage('allowed'); const b = bt(); b.hold = true; App.startScan(); App.btShowFound(); },
        match: () => setupPage('vest')() && topRoute() === 'vestFound' },
      { title: 'Connecting to your vest', text: 'Baymo connects to the confirmed vest. Both phones stay nearby while the connection is set up.', note: 'Simulated vest.',
        action: { label: 'Simulate: the connection completes', run() { App.btFinishConnect(); } },
        enter() { vestPage('allowed'); const b = bt(); b.requested = true; b.holdConnect = true; App.actions.btConnect(); },
        match: () => onVest() && bt().connecting },
      { title: 'Vest connected', text: 'The ECG vest is now connected to this phone.', tap: 'Continue', note: 'Simulated vest.',
        enter() { vestPage('allowed'); const s = st(); s.vest.connected = true; s.vest.paired = true; },
        match: () => onVest() && st().vest.connected },
      { title: 'Turn on notifications', text: 'Reminders tell parents when the next check is due and when to log the day.', tap: 'Turn on notifications', note: 'No notifications are sent in this demo.',
        enter() { onboarding('notifications'); st().vest.connected = true; }, match: setupPage('notifications') },
      { title: 'Set reminder times', text: 'Parents pick times when the child is usually rested.', tap: 'Done',
        enter() { onboarding('reminders'); st().vest.connected = true; }, match: setupPage('reminders') },
    ], modes: [
      { of: 3, title: 'Code not recognised', text: 'If the code is wrong, the boxes turn red and Baymo asks parents to check the 6 digits with the doctor.', tap: 'the boxes to try again',
        enter() { onboarding('profile'); A.fillCode({ code: '555555' }); A.setupNext(); }, match: () => setupPage('profile')() && !!st().invalidCode },
      { of: 5, title: 'Bluetooth is off', text: 'If Bluetooth is turned off, Baymo shows how to turn it on from Control Center.', tap: 'I’ve Turned Bluetooth On', note: 'Simulated phone settings.',
        enter() { onboarding('vest'); const s = st(); s.vest.connected = false; s.phone.permission = 'allowed'; s.phone.bluetoothOn = false; A.btHelp(); }, match: () => setupPage('vest')() && (topRoute() === 'btHelp' || (!st().phone.bluetoothOn && st().phone.permission !== 'denied')) },
      { of: 5, title: 'Bluetooth not allowed', text: 'If Bluetooth access was declined, Baymo explains why it is needed and links to Settings.', tap: 'Open Settings', note: 'Simulated phone settings.',
        enter() { onboarding('vest'); const s = st(); s.vest.connected = false; s.phone.permission = 'denied'; s.phone.bluetoothOn = true; },
        match: () => setupPage('vest')() && (st().phone.permission === 'denied' || topRoute() === 'iosSettings') && topRoute() !== 'btHelp' },
    ] },
    { name: 'Default Home – Everyday', steps: [
      { title: 'Today', base: 'Before the first check', text: 'Each day opens on the next ECG check, with shortcuts to log symptoms and the day.', tap: 'Start ECG check',
        enter() { home(); todayChecks(0); }, match: () => homePlain() && checksToday() === 0 },
      { title: 'Emergency help', text: 'The red button is always there: call an ambulance or the care team.', tap: 'Call 119', note: 'Calls can’t be placed from this demo.',
        enter: () => home('help'), match: () => st().setupDone && st().ui.tab === 'help' && !overlay() },
    ], modes: [
      { of: 0, title: 'After one check', text: 'Once the first check is done, Today shows it and points to the next one.', tap: 'Start ECG check',
        enter() { home(); todayChecks(1); }, match: () => homePlain() && checksToday() > 0 },
      { of: 0, title: 'A doctor follow-up', text: 'After a check where the rhythm looked different, Today asks whether the child has seen a doctor.', tap: 'the card to review that check',
        enter() { home(); todayChecks(0); hideFollowUp(false); }, match: () => onHome() && !!B.homeFollowUp(st()) && !B.showsJournalBanner(st()) && !B.homeComplete(st()) },
      { of: 0, title: 'Tonight', text: 'In the evening, Today reminds parents to log how the day went.', tap: 'Log the Day',
        enter() { home(); todayChecks(1); st().eveningPreview = true; st().prefs.journalBannerDismissedOn = null; }, match: () => onHome() && B.showsJournalBanner(st()) },
      { of: 0, title: 'Done for today', text: 'When both checks are done, Today says so. Parents can still record another check if their child has symptoms.',
        enter() { home(); todayChecks(2); }, match: () => onHome() && B.homeComplete(st()) && !B.showsJournalBanner(st()) },
    ] },
    { name: 'Getting Ready', steps: [
      { title: 'Get ready', text: 'After Start, Baymo checks that the vest is connected, a heartbeat comes through and all five electrodes touch the skin.', tap: 'Start Recording', note: 'Simulated vest.',
        enter: () => session(false), match: () => checking() && !Object.values(se().rows).includes('failed') && topRoute() === 'session' },
    ], modes: [
      { of: 0, title: 'Electrodes not sending data', text: 'If an electrode isn’t touching the skin, Baymo shows which one and how to fix it.', tap: 'Start Recording once it’s fixed',
        action: { label: 'Simulate: press the electrodes on', run() { const s = st(); B.ELECTRODES.forEach((e) => { s.sim.contacts[e.key] = true; }); } },
        enter: () => failedCheck('electrodes'), match: () => checking() && (se().rows.electrodes === 'failed' || se().rows.heartbeat === 'failed') },
      { of: 0, title: 'Vest not connected', text: 'If the vest isn’t connected, Baymo lists what to check and links to the connection settings.', tap: 'Open Settings, then reconnect',
        enter: () => failedCheck('vest'), match: () => sessionLayer() && se() && se().stage === 'checking' && (se().rows.received === 'failed' || topRoute() === 'bluetooth' || topRoute() === 'vestFound') },
    ] },
    { name: 'Recording', steps: [
      { title: 'Recording', text: 'The child sits still while the vest records. The countdown and rising water show the time left.', note: 'Simulated recording · 30 seconds. Then the result opens on its own.',
        enter: () => recording(), match: () => se() && se().stage === 'recording' && !se().isMoving && top().kind !== 'dialog' },
      { title: 'Comparing', text: "When the recording ends, Baymo compares it with the child's usual heart rhythm.", note: 'Simulated. The result opens after 3 seconds.',
        enter() {
          home(); const s = st();
          s.session = { stage: 'checkingResult', total: 30, elapsed: 30, rows: {}, looseDuring: new Set(), diaryEntryID: null, comparing: true };
          App.present('cover', 'session', {});
          pending = setTimeout(() => App.saveRecording('usual'), 3000);
        },
        match: () => se() && se().stage === 'checkingResult' && topRoute() === 'session' },
    ], modes: [
      { of: 0, title: 'The child is moving', text: 'Baymo asks the parent to help the child keep still. The recording keeps going.',
        action: { label: 'Simulate: the child keeps still', run() { st().sim.moving = false; App.sessionStatusChanged(); } },
        enter() { recording(); st().sim.moving = true; App.sessionStatusChanged(); }, match: () => se() && se().stage === 'recording' && se().isMoving && top().kind !== 'dialog' },
      { of: 0, title: 'Stopping a recording', text: 'Stopping asks first, because a stopped recording isn’t saved.', tap: 'Keep recording or Stop recording',
        enter() { recording(); A.confirmStop(); }, match: () => se() && se().stage === 'recording' && top().kind === 'dialog' },
      { of: 0, title: 'Vest disconnected', text: 'If the vest loses its connection, the recording stops and Baymo explains how to start again.', tap: 'Record Again',
        enter() { recording(); App.failSession('connection'); }, match: () => se() && se().stage === 'failed' && se().failure === 'connection' },
      { of: 0, title: 'Signal lost', text: 'If the vest stops picking up the heart rhythm, Baymo shows which electrodes to check.', tap: 'Record Again',
        enter() { const x = recording(); x.looseDuring.add('ra'); x.looseDuring.add('rl'); App.failSession('sensors'); }, match: () => se() && se().stage === 'failed' && se().failure === 'sensors' },
    ] },
    { name: 'Results', steps: [
      { title: 'The result', base: 'All looks good', text: "The check matches the child's usual heart rhythm, compared with their hospital baseline.", tap: 'Done', note: 'Simulated result. No ECG is analysed in this demo.',
        enter: () => result('usual'), match: () => recStatus() === 'usual', cta: { closeFlow: 1 } },
      { title: 'Full recording', base: 'All looks good', text: 'Parents can scroll through the whole recording. When something changed, Baymo marks where.', tap: 'Done',
        note: "Generated test signal, not a measurement of a child's heart.",
        enter() { result('usual'); App.present('sheet', 'fullSignal', { id: topP().id, sheet: true }); },
        match: () => topRoute() === 'fullSignal' && sessionLayer() && recOf() === 'usual', cta: { dismiss: 1 } },
    ], modes: [
      { of: 0, title: 'Changes detected', text: 'The rhythm looked different from usual. Baymo says it isn’t a diagnosis and asks parents to see the doctor today.', tap: 'Done', note: 'Simulated result.',
        enter: () => result('changed'), match: () => recStatus() === 'changed', cta: { closeFlow: 1 } },
      { of: 0, title: 'Unable to determine', text: 'If the recording can’t be read clearly, Baymo suggests trying again or calling the doctor.', tap: 'Try Again or Back to Today', note: 'Simulated result.',
        enter: () => result('unclear'), match: () => recStatus() === 'unclear', cta: { closeFlow: 1 } },
      { of: 1, title: 'Changes detected', text: 'Parents can scroll through the whole recording. When something changed, Baymo marks where.', tap: 'Done',
        note: "Generated test signal, not a measurement of a child's heart.",
        enter() { result('changed'); App.present('sheet', 'fullSignal', { id: topP().id, sheet: true }); },
        match: () => topRoute() === 'fullSignal' && sessionLayer() && recOf() === 'changed', cta: { dismiss: 1 } },
      { of: 0, title: 'Recording saved', text: 'Without a comparison, the recording is simply saved on the phone for the care team.', tap: 'Done', note: 'Simulated result.',
        enter: () => result('savedOnly'), match: () => recStatus() === 'savedOnly', cta: { closeFlow: 1 } },
    ] },
    { name: 'Log Symptoms', steps: [
      { title: 'Log symptoms', text: 'Noting how the child feels gives the care team more context about their condition.', tap: 'a symptom, then Save',
        enter() { home(); App.present('sheet', 'noteSign', {}); }, match: () => topRoute() === 'noteSign' },
      { title: 'Symptoms logged', text: 'The entry is saved and can be found in History.', tap: 'Done', note: 'Example: Tired quickly.',
        enter: () => symptomOutcome('tiresQuickly'), match: () => afterSaveRoute() === 'logged', cta: { closeSaved: 1 } },
    ], modes: [
      { of: 1, title: 'Check with your doctor', text: 'For signs like a pounding heart, Baymo asks parents to contact the care team and offers to record a check now.', tap: 'Record a Check Now or Back to Today', note: 'Example: Heart pounding.',
        enter: () => symptomOutcome('racingHeart'), match: () => afterSaveRoute() === 'contactDoctor', cta: { closeSaved: 1 } },
      { of: 1, title: 'Go to the hospital now', text: 'For fainting or a seizure, Baymo tells parents to call an ambulance or go to the nearest hospital.', tap: 'Back to Today', note: 'Example: Fainting. Calls can’t be placed from this demo.',
        enter: () => symptomOutcome('fainted'), match: () => afterSaveRoute() === 'emergency', cta: { closeSaved: 1 } },
    ] },
    { name: 'Logging Daily Activity', steps: [
      { title: 'Activity journal', text: "Parents log the child's day: meals, medicine, sleep and activities. Logged entries sit at the top; tap one to change it, or swipe left to delete it.", tap: 'Add Activity',
        enter: () => journal(), match: () => topRoute() === 'journal', cta: { dismiss: 'nextSection' } },
      { title: 'Pick an activity', text: 'One list of activities, with the family’s own at the top. A logged activity shows its time.', tap: 'Breakfast',
        enter: () => journal(picker), match: () => topRoute() === 'activityPicker' },
      { title: 'Quick log', text: 'One tap logs the activity now. Parents can add what they noticed or change the time.', tap: 'Log, or More details',
        enter: () => journal(picker, () => { st().ui.act = null; App.present('sheet', 'activityEditor', { title: 'Breakfast', day: new Date(), quick: true }, { size: 'medium' }); }),
        match: () => topRoute() === 'activityEditor' && st().ui.act && !st().ui.act.expanded },
      { title: 'Activity details', text: 'Details add an end time, notes, symptoms during the activity and a repeat, so a draft appears on matching days.', tap: 'Repeat',
        enter: () => journal(picker, () => { st().ui.act = null; App.present('sheet', 'activityEditor', { title: 'Breakfast', day: new Date(), quick: false }); }),
        match: () => topRoute() === 'activityEditor' && st().ui.act && st().ui.act.expanded },
    ], modes: [
      { of: 1, title: 'A new activity', text: 'Parents can add their own activity. It is logged straight away and joins the top of the list.', tap: 'Add',
        enter: () => journal(picker, () => { st().ui.newAct = 'Tennis'; App.present('sheet', 'newActivity', {}, { size: 'medium' }); }), match: () => topRoute() === 'newActivity' },
      { of: 0, title: 'Say it instead', text: 'Parents can describe the day out loud. Baymo turns it into activities to check before saving.', tap: 'the stop button, then Add 3 activities',
        note: 'Plays Baymo’s sample voice note. The microphone is not used.',
        enter: () => journal(() => A.openVoice()), match: () => topRoute() === 'voice' || topRoute() === 'voiceNewActivity' },
    ] },
    { name: 'History', steps: [
      { title: 'This week', text: 'History shows each day of the week. The marks show whether all checks were done, some, or a change was found.', tap: 'a day, or swipe the week',
        enter: () => history(), match: () => onHistory() && baseTop() === 'history' && !overlay() && B.sameDay(st().ui.historyDay, new Date()) },
      { title: 'A day in History', text: 'Checks, symptoms and activities appear in time order. Swipe left on one to delete it.', tap: 'an ECG check', note: 'Fictional history.',
        enter: () => history(B.addDays(new Date(), -2)), match: () => onHistory() && baseTop() === 'history' && !overlay() && !B.sameDay(st().ui.historyDay, new Date()) && dayItems(st().ui.historyDay) > 0 },
      { title: 'Check details', text: 'A saved check opens with its result. The full recording, and its details behind the info button, are one tap away.', tap: 'See Full Recording',
        enter() { const r = st().recordings.find((x) => x.status === 'abnormal'); history(r ? r.date : null); if (r || st().recordings[0]) A.openRecording({ id: (r || st().recordings[0]).id }); },
        match: () => onHistory() && ['recordingSummary', 'fullSignal', 'recordingDetail'].includes(topRoute()) },
      { title: 'Change an entry', text: 'Symptom, activity and journal entries open in the same form used to log them, ready to change.',
        enter() {
          history(B.addDays(new Date(), -2));
          const e = st().diary.find((x) => x.isSpoken && x.kind === 'symptom') || st().diary.find((x) => x.kind === 'symptom');
          if (e) { st().ui.historyDay = B.startOfDay(e.startedAt); A.viewDiary({ id: e.id }); }
        },
        match: () => ['noteSign', 'activityEditor', 'journalNote'].includes(topRoute()) },
    ], modes: [
      { of: 0, title: 'Calendar', text: 'The month view shows every day at a glance. Tapping a day opens it.', tap: 'a day',
        enter() { history(); A.openCalendar(); }, match: () => onHistory() && topRoute() === 'calendar' },
      { of: 1, title: 'Nothing logged', text: 'A day without checks, symptoms or activities says so.', tap: 'Back to Today',
        enter: () => history(emptyDay()), match: () => onHistory() && baseTop() === 'history' && !overlay() && !B.sameDay(st().ui.historyDay, new Date()) && dayItems(st().ui.historyDay) === 0 },
    ] },
    { name: "Profile and Patient's Data", steps: [
      { title: 'Child profile', text: "The profile shows the child's heart condition, doctor and hospital, the ECG schedule and reminder times, with app settings below.", tap: 'Care team & contacts', note: 'Clinic and doctor tools, including Doctor Sync, aren’t part of this demo.',
        enter: () => profile(), match: () => baseTop() === 'profile' && !overlay() && top() === undefined },
      { title: 'Care team & contacts', text: "Parents keep the care team's and an emergency contact's phone numbers here, used by Emergency help.", note: 'Fictional hospital and numbers.',
        enter: () => profile('contacts'), match: () => baseTop() === 'contacts' },
      { title: 'Privacy policy', text: 'What Baymo collects, how it is used and how voice notes work, in plain words.',
        enter: () => profile('terms'), match: () => baseTop() === 'terms' },
      { title: 'Privacy & data', text: 'Parents see what is saved on the phone and can delete it.', tap: 'Delete all data',
        enter: () => profile('privacyData'), match: () => baseTop() === 'privacyData' && !top() },
      { title: 'Delete all data', text: 'Parents confirm, then every check, symptom and journal entry is removed from the phone. Setting up again needs a new code from the doctor.', tap: 'Delete',
        note: 'In this demo, Restart brings the example data back.',
        enter() { profile(); A.startOver(); }, match: () => (top() && top().kind === 'alert' && /^Delete all of /.test(top().o.title || '')) || (top() && top().kind === 'dialog' && /Delete all data/.test(top().o.title || '')) },
    ], modes: [] },
  ];
  const STEPS = [];
  SECTIONS.forEach((sec, si) => {
    sec.steps.forEach((s, i) => { s.sec = si; s.i = i; s.kind = 'step'; STEPS.push(s); });
    sec.modes.forEach((s, i) => { s.sec = si; s.i = i; s.kind = 'mode'; STEPS.push(s); });
  });
  const stepIdx = (si, i) => STEPS.findIndex((x) => x.sec === si && x.kind === 'step' && x.i === i);
  const JOURNEY = STEPS.map((x, i) => i).filter((i) => STEPS[i].kind === 'step');
  /* Next / Back walk the journey only. From a mode they continue from the step it branches from. */
  const anchor = (n) => (STEPS[n].kind === 'mode' ? stepIdx(STEPS[n].sec, STEPS[n].of) : n);
  const nextOf = (n) => { const j = JOURNEY.indexOf(anchor(n)); return j < JOURNEY.length - 1 ? JOURNEY[j + 1] : -1; };
  const prevOf = (n) => { const j = JOURNEY.indexOf(n); return j > 0 ? JOURNEY[j - 1] : -1; };
  const opt = new Map();

  /* ---------- moving between steps ---------- */
  function goStep(n, { option } = {}) {
    if (n < 0) { boot(); return; }
    cur = Math.min(n, STEPS.length - 1);
    const s = STEPS[cur];
    if (s.options) opt.set(s, option || s.options.list[0][0]);
    s.enter(s.options ? opt.get(s) : undefined);
    // A jump from the left column lands on the screen at once: render now and finish entrance
    // animations (sheet, cover, push, page fade). Taps on the phone keep the iOS transitions.
    hold = { i: cur, until: Date.now() + 1500 };
    App.obDir = 'jump'; App.renderNow(); settle(); renderGuide();
  }
  function settle() {
    document.getElementById('screen').getAnimations({ subtree: true }).forEach((a) => {
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
      if (t && t.iterations !== Infinity && t.endTime !== Infinity) { try { a.finish(); } catch (e) { /* not finishable */ } }
    });
  }
  /* Delete All Data in the guided build (main.js, the kiosk build, has its own): everything goes, then setup opens. */
  if (!App.resetToOnboarding) App.resetToOnboarding = () => {
    const sim = st().sim, phone = st().phone;
    clean(); App.clearAllTimers();
    App.st = B.freshState();
    App.st.sim = sim; App.st.phone = { bluetoothOn: phone.bluetoothOn, permission: 'notDetermined' };
    App.renderNow();
  };
  const firstOf = (si) => stepIdx(si, 0);
  function boot() {
    clearTimeout(pending); pending = null; App.clearAllTimers();
    App.st = B.freshState(); B.seedHistory(App.st);
    cur = -1; opt.clear(); hold = null; App.obDir = null; App.btContext = null;
    clearTimeout(idleT); clearInterval(countT); document.getElementById('idlewarn').classList.remove('on');
    App.renderNow(); renderGuide();
  }
  /* The phone changed by itself or through a tap: follow it, preferring steps in the current section. */
  let hold = null;   // a screen just opened from the left column may need a moment (a check, a timer) to reach its state
  function follow() {
    if (cur < 0) return;
    const s = STEPS[cur];
    let ok = false; try { ok = s.match(); } catch (e) { ok = false; }
    if (hold && hold.i === cur) { if (ok || Date.now() > hold.until) hold = null; else return; }
    if (ok) return;
    const order = STEPS.map((x, i) => i).sort((a, b) => (STEPS[a].sec === s.sec ? 0 : 1) - (STEPS[b].sec === s.sec ? 0 : 1));
    for (const i of order) { let m = false; try { m = STEPS[i].match(); } catch (e) { m = false; } if (m) { cur = i; renderGuide(); return; } }
  }
  App.onRender.push(follow);

  function phoneClick(ev) {
    if (cur < 0) { ev.stopPropagation(); ev.preventDefault(); goStep(0); return; }
    const el = ev.target.closest('[data-a]');
    const cta = el && STEPS[cur].cta && STEPS[cur].cta[el.dataset.a];
    if (cta) {   // the step's own exit button continues the demo instead of going back to Today
      ev.stopPropagation(); ev.preventDefault();
      goStep(cta === 'nextSection' ? firstOf(STEPS[cur].sec + 1) : nextOf(cur));
      return;
    }
    App.handleClick(ev);
  }

  /* ---------- left column ---------- */
  function rail() {
    const active = cur < 0 ? -1 : STEPS[cur].sec;
    return `<nav class="g-rail">${SECTIONS.map((s, i) => `<button class="${i === active ? 'on' : ''}" data-g="sec" data-v="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${s.name}</span></button>`).join('')}</nav>`;
  }
  function renderGuide() {
    const g = document.getElementById('guide');
    if (cur < 0) {
      morph(g, `${rail()}<div class="g-body" data-key="intro"><h1 class="g-title g-hero">See how Baymo works</h1>
        <p class="g-text">Follow a parent through the app, from setting it up to looking back at their child’s heart checks. Start at the beginning or pick a section.</p>
        <div class="g-actions"><button id="gNext" class="g-next" data-g="start">Start Demo</button></div></div>`);
      return;
    }
    const s = STEPS[cur], sec = SECTIONS[s.sec], isMode = s.kind === 'mode';
    const base = STEPS[anchor(cur)];                       // the step on screen; a mode is a scenario of it
    const dots = sec.steps.map((x, i) => `<span class="${i < base.i ? 'done' : i === base.i ? 'on' : ''}"></span>`).join('');
    const own = sec.modes.map((m, i) => [m, i]).filter(([m]) => m.of === base.i);
    const nxt = nextOf(cur), lastStep = base.i === sec.steps.length - 1;
    const modes = own.length ? `<div class="g-modes" data-key="modes${s.sec}-${base.i}">
        <div class="g-optlabel">Modes <span>Other situations at this step, not the next step</span></div>
        <div class="g-results g-modelist"><button class="${isMode ? '' : 'on'}" data-g="mode" data-v="base">${base.base || base.title}</button>${own.map(([m, i]) => `<button class="${isMode && s.i === i ? 'on' : ''}" data-g="mode" data-v="${i}">${m.title}</button>`).join('')}</div></div>` : '';
    morph(g, `${rail()}<div class="g-body" data-key="steps">
      <div class="g-sec">${String(s.sec + 1).padStart(2, '0')} · ${sec.name}</div>
      <div class="g-progress"><div class="g-segs">${dots}</div><span class="g-count">Step ${base.i + 1} of ${sec.steps.length}</span></div>
      <h1 class="g-title">${s.title}</h1>
      <p class="g-text">${s.text}</p>
      ${s.tap ? `<p class="g-tap">On the phone, tap <b>${s.tap}</b></p>` : ''}
      ${s.action ? `<button class="g-sim" data-g="act">${s.action.label}</button>` : ''}${s.actions ? `<div class="g-sims">${s.actions.map((x, i) => `<button class="g-sim" data-g="acts" data-v="${i}">${x.label}</button>`).join('')}</div>` : ''}
      ${s.note ? `<p class="g-note">${I('info.circle')}${s.note}</p>` : ''}
      ${modes}
      <div class="g-actions"><button class="g-back" data-g="back">Back</button>
        <button id="gNext" class="g-next" data-g="next">${nxt < 0 ? 'Finish' : lastStep ? 'Next section' : 'Next'}</button></div>
      <p class="g-hint">${I('hand.tap')}You can interact directly with the phone screen to explore the app, or select Next to continue.</p></div>`);
  }
  function guideClick(ev) {
    const el = ev.target.closest('[data-g]'); if (!el) return;
    const g = el.dataset.g;
    if (g === 'start') goStep(0);
    else if (g === 'sec') goStep(firstOf(+el.dataset.v));
    else if (g === 'next') goStep(nextOf(cur));
    else if (g === 'back') goStep(prevOf(anchor(cur)));
    else if (g === 'mode') {
      const base = anchor(cur), v = el.dataset.v;
      const i = v === 'base' ? base : STEPS.findIndex((x) => x.sec === STEPS[cur].sec && x.kind === 'mode' && x.i === +v);
      if (i !== cur) goStep(i);
    }
    else if (g === 'act') { STEPS[cur].action.run(); App.render(); }
    else if (g === 'acts') { STEPS[cur].actions[+el.dataset.v].run(); App.render(); }
  }

  /* ---------- idle reset, scaling, guards ---------- */
  let idleT = null, countT = null;
  function bump() {
    clearTimeout(idleT); clearInterval(countT);
    const w = document.getElementById('idlewarn'); w.classList.remove('on');
    if (cur < 0) return;
    idleT = setTimeout(() => {
      let left = 10; w.classList.add('on'); w.querySelector('b').textContent = left;
      countT = setInterval(() => { left -= 1; w.querySelector('b').textContent = left; if (left <= 0) { clearInterval(countT); w.classList.remove('on'); goStep(-1); } }, 1000);
    }, IDLE_MS - 10000);
  }
  function fit() {
    const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    document.getElementById('stage').style.transform = `translate(-50%,-50%) scale(${k})`;
  }
  App.guide = { goStep, get step() { return cur; }, get count() { return STEPS.length; }, get title() { return cur < 0 ? 'start' : STEPS[cur].title; }, get kind() { return cur < 0 ? null : STEPS[cur].kind; }, get section() { return cur < 0 ? -1 : STEPS[cur].sec; } };

  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', () => {
    fit();
    const screen = document.getElementById('screen');
    screen.addEventListener('click', phoneClick);
    screen.addEventListener('input', App.handleInput);
    screen.addEventListener('change', App.handleTime);
    document.getElementById('guide').addEventListener('click', guideClick);
    document.getElementById('restartBtn').addEventListener('click', () => goStep(-1));
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => document.addEventListener(t, () => setTimeout(bump, 0), { passive: true }));
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('dragstart', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if ((e.key === 'Backspace' && !typing) || (e.altKey && /Arrow(Left|Right)/.test(e.key)) || e.key === 'F5' || ((e.ctrlKey || e.metaKey) && /^[rwnpsl]$/i.test(e.key))) e.preventDefault();
    });
    try { history.pushState({ demo: 1 }, '', '#demo'); } catch (e) { /* sandboxed */ }
    window.addEventListener('popstate', () => { try { history.pushState({ demo: 1 }, '', '#demo'); } catch (e) { /* sandboxed */ } });
    setInterval(() => { const sb = document.querySelector('#screen .statusbar span'); if (sb) sb.textContent = B.fmt.statusTime(new Date()); }, 15000);
    boot();
  });
})();
