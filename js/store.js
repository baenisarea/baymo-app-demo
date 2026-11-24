/* Baymo web demo · state and demo data.
   Ported from DemoData.swift / DemoStore.swift / DaySlots.swift. Everything is fictional and in memory only. */
(function () {
  const DAY = 86400000;
  let uid = 1;
  const id = (p = 'id') => `${p}${uid++}`;
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const at = (daysAgo, h, m) => { const x = addDays(startOfDay(new Date()), -daysAgo); x.setHours(h, m, 0, 0); return x; };
  const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

  /* ---------- Formatting (English, as in the app's Localizable strings) ---------- */
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fmt = {
    time: (d) => { let h = d.getHours(); const m = d.getMinutes(); const ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; },
    statusTime: (d) => { let h = d.getHours() % 12 || 12; return `${h}:${String(d.getMinutes()).padStart(2, '0')}`; },
    longDate: (d) => `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`,
    dayTitle: (d) => sameDay(d, new Date()) ? 'Today' : sameDay(d, addDays(new Date(), -1)) ? 'Yesterday' : `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`,
    weekdayDayMonth: (d) => `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`,
    weekdayDayMonAbbr: (d) => `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)}`,
    abbrevDateTime: (d) => `${d.getDate()} ${MON[d.getMonth()].slice(0, 3)} ${d.getFullYear()} at ${fmt.time(d)}`,
    birth: (d) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`,
    monthYear: (d) => `${MON[d.getMonth()]} ${d.getFullYear()}`,
    abbrevDate: (d) => `${d.getDate()} ${MON[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`,
    duration: (s) => { s = Math.round(s); const m = Math.floor(s / 60), r = s % 60; return m && r ? `${m} min, ${r} sec` : m ? `${m} min` : `${r} sec`; },
    mmss: (s) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`,
    clock: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`,
    WD, MON,
  };

  /* ---------- Clinical vocabulary (Models.swift; unchanged) ---------- */
  const SYMPTOMS = {
    fainted: { short: 'Fainting', title: 'Fainted or nearly fainted', symbol: 'hurricane', tier: 'emergency' },
    racingHeart: { short: 'Heart pounding', title: 'Heart racing or pounding', symbol: 'bolt.heart', tier: 'contactTeam' },
    suddenlyWeak: { short: 'Sudden weakness', title: 'Suddenly weak or floppy', symbol: 'figure.fall', tier: 'contactTeam' },
    seizure: { short: 'Seizure', title: 'Had a seizure (fit)', symbol: 'brain.head.profile', tier: 'emergency' },
    tiresQuickly: { short: 'Tired quickly', title: 'Tired quickly', symbol: 'battery.25percent', tier: 'noteForDoctor' },
    chestPain: { short: 'Chest pain', title: 'Says their chest hurts', symbol: 'bandage', tier: 'contactTeam' },
    breathing: { short: 'Short of breath', title: 'Short of breath', symbol: 'lungs', tier: 'contactTeam' },
    worried: { short: 'Something else', title: 'Something else', symbol: 'ellipsis.circle', tier: 'contactTeam' },
    fever: { short: 'Fever', title: 'Fever', symbol: 'thermometer.medium', tier: 'noteForDoctor' },
  };
  const SYMPTOM_ORDER = ['racingHeart', 'fainted', 'suddenlyWeak', 'chestPain', 'breathing', 'seizure', 'tiresQuickly', 'fever', 'worried'];
  const LOGGING_CHOICES = ['fainted', 'racingHeart', 'suddenlyWeak', 'seizure', 'tiresQuickly', 'chestPain', 'breathing', 'worried'];
  const ACTIVITIES = { resting: 'Resting', justWokeUp: 'Just woke up', atSchool: 'At school', playingOrSport: 'Playing or sport', afterSport: 'After sport', eating: 'Eating', goingToSleep: 'Going to sleep', somethingElse: 'Something else' };
  const STATUS = {
    notAnalyzed: { title: 'Recording saved', short: 'Saved · not analysed', symbol: 'waveform.path.ecg.rectangle', color: 'var(--accent)', needsDoctor: false },
    noChange: { title: 'No change', short: 'No change', symbol: 'checkmark.circle.fill', color: 'var(--green)', needsDoctor: false },
    unsure: { title: 'Please contact your doctor', short: 'Doctor to check', symbol: 'phone.fill', color: 'var(--orange)', needsDoctor: true },
    abnormal: { title: 'Get help now', short: 'Get help now', symbol: 'exclamationmark.triangle.fill', color: 'var(--red)', needsDoctor: true },
  };
  const ELECTRODES = [
    { key: 'ra', code: 'RA', name: 'Right arm', x: 32.2355 / 140, y: 59.9662 / 162 },
    { key: 'la', code: 'LA', name: 'Left arm', x: 91.1593 / 140, y: 61.5099 / 162 },
    { key: 'v1', code: 'V1', name: 'Chest', x: 58.7374 / 140, y: 95.2169 / 162 },
    { key: 'rl', code: 'RL', name: 'Right leg', x: 22.2003 / 140, y: 124.807 / 162 },
    { key: 'll', code: 'LL', name: 'Left leg', x: 96.3038 / 140, y: 127.123 / 162 },
  ];
  const AMBULANCE = '119', GENERAL_EMERGENCY = '112';

  /* ---------- Fresh state ---------- */
  function freshState() {
    return {
      setupDone: false,
      page: 'welcome',
      doctorCode: '', invalidCode: false,
      /* DemoData.child, with fictional values replacing the real hospital and condition */
      child: { name: 'Rakha Wijaya', first: 'Rakha', birth: new Date(2018, 3, 1), condition: 'Arrhythmia', careTeamName: 'Demo Children’s Hospital', careTeamPhone: '+62 21 0000 0000', photo: null, height: '', weight: '' },
      demoProfile: false,
      prefs: { remindersEnabled: true, journalReminderMinutes: 21 * 60 + 30, journalRemindersEnabled: true, darkMode: false, emergencyContactName: '', emergencyContactPhone: '',
        dismissedFollowUp: null, journalBannerDismissedOn: null, customActivities: [], hiddenActivities: [] },
      plan: { perDay: 2, durationMinutes: 5, days: 'Every day', timing: 'at rest' },
      reminderTimes: [[7, 0], [16, 0]],   // DemoData.firstVisitReminderTimes
      recordings: [],
      diary: [],
      signals: {},
      ui: { tab: 'home', layers: [], historyDay: startOfDay(new Date()), historyWeek: startOfDay(new Date()), calendarMonth: new Date(), toast: null },
      /* The iPhone running Baymo (system settings shown in the simulator panel) */
      phone: { bluetoothOn: true, permission: 'notDetermined' },
      /* Bluetooth link state inside Baymo (BluetoothVestSource) */
      vest: { paired: false, connected: false, peerName: 'VEST-0783' },
      /* The Vest Simulator app's controls (VestSimulatorApp.swift) */
      sim: { powered: true, heartbeat: true, moving: false, battery: 100, contacts: { ra: true, la: true, rl: true, ll: true, v1: true },
        outcome: 'usual', length: 30, demo: 'smooth', streaming: true, dropNext: false },
      eveningPreview: false,
      session: null,
    };
  }

  /* ---------- Seeded history: DemoData.history() and DemoData.diary() ---------- */
  function seedHistory(st) {
    const pastDay = (daysAgo) => {
      switch (daysAgo) {
        case 1: return [{ h: 7, m: 3, changed: true, notes: 'Seemed more tired than usual after breakfast.', symptoms: ['tiresQuickly'] }, { h: 15, m: 44 }];
        case 3: return [{ h: 7, m: 6 }, { h: 15, m: 42 }, { h: 18, m: 20, notes: 'Checked again, the first one felt rushed.' }];
        case 4: return [{ h: 7, m: 8 }];
        case 5: return [{ h: 7, m: 1 }, { h: 15, m: 47, changed: true, notes: 'Felt warm after school.', symptoms: ['fever'] }];
        default: return [{ h: 7, m: (daysAgo * 7) % 10 }, { h: 15, m: 40 + ((daysAgo * 3) % 10) }];
      }
    };
    const recs = [];
    for (let d = 1; d <= 14; d++) {
      for (const p of pastDay(d)) {
        recs.push({ id: id('rec'), date: at(d, p.h, p.m), duration: 300, status: p.changed ? 'unsure' : 'noChange', origin: 'simulated', demo: false,
          notes: p.notes || '', symptoms: p.symptoms || [], diaryEntryID: null, signal: { seed: d * 31 + p.h, hr: 104, changed: false } });
      }
    }
    // The 170 bpm recording made during signs, two days ago.
    recs.push({ id: id('rec'), date: at(2, 11, 24), duration: 300, status: 'abnormal', origin: 'simulated', demo: false, notes: '', symptoms: [], diaryEntryID: null,
      signal: { seed: 77, hr: 104, changed: true } });
    st.recordings = recs.sort((a, b) => b.date - a.date);
    const e = (d, h, m, sign, activity, text = '', ongoing = false) => ({ id: id('dia'), kind: 'symptom', startedAt: at(d, h, m), endedAt: null,
      loggedAt: new Date(at(d, h, m).getTime() + (ongoing ? 2 : 30) * 60000), wasOngoing: ongoing, signs: [sign], activity, text, activityTitle: '', isSpoken: false, recordingID: null, medicine: '' });
    const spoken = e(2, 11, 20, 'racingHeart', 'afterSport', 'After PE, my child said the heart was beeping and had to sit down.', true);
    spoken.isSpoken = true;
    st.diary = [
      e(1, 19, 30, 'fever', 'resting', 'Felt warm in the evening.'),
      spoken,
      e(5, 10, 40, 'racingHeart', 'playingOrSport', 'Heart racing while playing football.'),
      e(6, 7, 5, 'tiresQuickly', 'justWokeUp', "Woke up very tired, didn't want breakfast."),
      e(8, 11, 5, 'racingHeart', 'afterSport'),
    ];
  }

  /* ---------- Plan and day logic (DaySlots / PlanChecks, at-rest plan) ---------- */
  const lastVisit = () => addDays(startOfDay(new Date()), -14);
  function planDay(st, day, now = new Date()) {
    const d0 = startOfDay(day);
    const active = d0 >= lastVisit() && d0 <= addDays(lastVisit(), 28);
    const expected = active ? st.plan.perDay : 0;
    const recs = st.recordings.filter((r) => sameDay(r.date, day) && r.date <= now).sort((a, b) => a.date - b.date);
    const isToday = sameDay(day, now), isPast = d0 < startOfDay(now), isFuture = d0 > startOfDay(now);
    const checks = [];
    let nextTaken = false;
    for (let i = 0; i < expected; i++) {
      const r = recs[i];
      const time = new Date(d0); time.setHours(st.reminderTimes[i] ? st.reminderTimes[i][0] : 12, st.reminderTimes[i] ? st.reminderTimes[i][1] : 0);
      let state;
      if (r) state = { kind: 'done', changed: STATUS[r.status].needsDoctor, id: r.id };
      else if (isPast) state = { kind: 'missed' };
      else if (isToday && !nextTaken) { nextTaken = true; state = { kind: 'next' }; }
      else state = { kind: 'upcoming' };
      checks.push({ time: r ? r.date : time, state, checkNumber: i + 1 });
    }
    const extras = recs.slice(expected).map((r) => ({ time: r.date, state: { kind: 'done', changed: STATUS[r.status].needsDoctor, id: r.id }, isExtra: true }));
    return { day: d0, expected, checks, extras, isFuture };
  }
  function dayMark(pd) {
    if (pd.isFuture) return 'none';
    const all = pd.checks.concat(pd.extras);
    if (all.some((s) => s.state.kind === 'done' && s.state.changed)) return 'changed';
    const done = pd.checks.filter((s) => s.state.kind === 'done').length;
    if (done > 0) return done === pd.checks.length ? 'complete' : 'partial';
    if (pd.extras.some((s) => s.state.kind === 'done')) return pd.checks.length ? 'partial' : 'complete';
    return pd.checks.some((s) => s.state.kind === 'missed') ? 'missed' : 'none';
  }
  const checksDoneToday = (st) => planDay(st, new Date()).checks.filter((c) => c.state.kind === 'done').length;
  const homeComplete = (st) => { const pd = planDay(st, new Date()); return pd.expected > 0 && checksDoneToday(st) >= pd.expected; };
  const diaryOn = (st, day) => st.diary.filter((e) => sameDay(e.startedAt, day));
  function timeline(st, day) {
    const pd = planDay(st, day);
    const items = [];
    pd.checks.forEach((c) => { if (c.state.kind === 'done') items.push({ type: 'check', time: c.time, rec: st.recordings.find((r) => r.id === c.state.id), slot: c }); });
    pd.extras.forEach((c) => items.push({ type: 'extra', time: c.time, rec: st.recordings.find((r) => r.id === c.state.id), slot: c }));
    diaryOn(st, day).forEach((e) => items.push({ type: 'diary', time: e.startedAt, entry: e }));
    return items.sort((a, b) => a.time - b.time);
  }
  function homeFollowUp(st) {
    const latest = st.recordings.filter((r) => STATUS[r.status].needsDoctor && r.date > lastVisit() && r.date <= new Date()).sort((a, b) => b.date - a.date)[0];
    return latest && latest.id !== st.prefs.dismissedFollowUp ? latest : null;
  }
  function showsJournalBanner(st) {
    const now = new Date();
    const evening = st.eveningPreview || now.getHours() >= 19;
    if (!evening) return false;
    if (diaryOn(st, now).some((e) => e.kind === 'journal' && e.text)) return false;
    return !(st.prefs.journalBannerDismissedOn && sameDay(st.prefs.journalBannerDismissedOn, now));
  }
  /** AfterSaveRoute.route(for:) */
  function afterSaveRoute(entry) {
    if (!entry.wasOngoing || !entry.signs.length) return 'done';
    if (entry.signs.some((s) => SYMPTOMS[s].tier === 'emergency')) return 'emergency';
    return entry.signs.some((s) => SYMPTOMS[s].tier === 'contactTeam') ? 'contactDoctor' : 'logged';
  }
  /** KeywordDiaryParser, reduced to the sign words the demo transcript and notes use. */
  function keywordSigns(text) {
    const t = (text || '').toLowerCase(), out = [];
    if (/beep|racing|pounding|heart (was )?fast/.test(t)) out.push('racingHeart');
    if (/faint|passed out/.test(t)) out.push('fainted');
    if (/seizure|fit\b/.test(t)) out.push('seizure');
    if (/chest (hurt|pain)/.test(t)) out.push('chestPain');
    if (/short of breath|breathing hard|breathless/.test(t)) out.push('breathing');
    return out;
  }
  /** JournalVoiceDraft.activities(in:) — ported regex parser. */
  function parseJournal(transcript, day) {
    const re = /\b(medicine|medication|breakfast|lunch|dinner|meal|nap|napped|sleep|slept|swimming|swam|football|sport|play|played|school|woke up)\b/gi;
    const matches = [...transcript.matchAll(re)];
    return matches.map((m, i) => {
      const end = i + 1 < matches.length ? matches[i + 1].index : transcript.length;
      const clause = transcript.slice(m.index, end).trim();
      const w = m[1].toLowerCase();
      const title = { medicine: 'Medicine', medication: 'Medicine', nap: 'Nap', napped: 'Nap', sleep: 'Sleep', slept: 'Sleep', swimming: 'Swimming', swam: 'Swimming', play: 'Play', played: 'Play', 'woke up': 'Wake up' }[w] || (w[0].toUpperCase() + w.slice(1));
      const times = [...clause.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/gi)].map((t) => {
        let h = +t[1]; const min = t[2] != null ? +t[2] : 0; const p = (t[3] || '').toLowerCase();
        if (!(min >= 0 && min < 60) || !(p || (t[2] != null && (h === 0 || h > 12)))) return null;
        if (p) { if (h < 1 || h > 12) return null; h = (h % 12) + (p.startsWith('p') ? 12 : 0); }
        if (h > 23) return null;
        const d = startOfDay(day); d.setHours(h, min); return d;
      }).filter(Boolean);
      return { id: id('draft'), title, startedAt: times[0] || null, endedAt: times[1] || null, note: clause };
    });
  }
  const ACTIVITY_GROUPS = [['Daytime', ['Breakfast', 'School', 'Morning sunlight', 'Run', 'Lunch', 'Swim']], ['Nighttime', ['Dinner', 'Music Lesson', 'Sleep']], ['Other', ['Medicine']]];
  function activitySymbol(title) {
    return ({ 'wake up': 'sunrise.fill', school: 'book.fill', 'music lesson': 'book.fill', 'morning sunlight': 'sun.max.fill', run: 'figure.disc.sports', swim: 'figure.disc.sports', breakfast: 'carrot.fill', dinner: 'carrot.fill',
      meal: 'fork.knife', lunch: 'fork.knife', medicine: 'pills.fill', nap: 'moon.zzz', rest: 'moon.zzz', play: 'figure.play', swimming: 'figure.pool.swim', sport: 'figure.run', football: 'figure.run', sleep: 'sun.max.fill' })[title.toLowerCase()] || 'sparkles';
  }
  function signalFor(st, rec) {
    if (!st.signals[rec.id]) {
      const s = rec.signal || { seed: 3, hr: 90 };
      st.signals[rec.id] = ECGSignal.generate(rec.duration, s.hr, s.changed ? { fasterFrom: 0.25, fasterTo: 0.75, fasterRate: 170, seed: s.seed } : { seed: s.seed });
    }
    return st.signals[rec.id];
  }
  const age = (birth) => { const n = new Date(); let a = n.getFullYear() - birth.getFullYear(); if (n < new Date(n.getFullYear(), birth.getMonth(), birth.getDate())) a--; return a; };

  window.Baymo = { id, startOfDay, addDays, at, sameDay, fmt, SYMPTOMS, SYMPTOM_ORDER, LOGGING_CHOICES, ACTIVITIES, STATUS, ELECTRODES, AMBULANCE, GENERAL_EMERGENCY,
    freshState, seedHistory, planDay, dayMark, checksDoneToday, homeComplete, diaryOn, timeline, homeFollowUp, showsJournalBanner, afterSaveRoute, keywordSigns,
    parseJournal, ACTIVITY_GROUPS, activitySymbol, signalFor, age, lastVisit, DAY };
})();
