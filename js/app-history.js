/* History (HistoryCalendarView.swift) and Child profile (ProfileView.swift, ProfileEditors.swift). */
(function () {
  const { C, esc, I } = App, R = App.routes, A = App.actions, B = window.Baymo;
  const st = () => App.st;
  const weekStart = (d) => { const x = B.startOfDay(d); const off = (x.getDay() + 6) % 7; return B.addDays(x, -off); };
  const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const STATUS_SHORT = { notAnalyzed: ['Saved · not analysed', 'waveform.path.ecg.rectangle', 'var(--accent)'], noChange: ['No change', 'checkmark.circle.fill', 'var(--green)'],
    unsure: ['Doctor to check', 'phone.fill', 'var(--orange)'], abnormal: ['Get help now', 'exclamationmark.triangle.fill', 'var(--red)'] };

  /* ---------- History ---------- */
  R.history = () => {
    const s = st(), now = new Date(), sel = B.startOfDay(s.ui.historyDay), ws = weekStart(sel);
    const isToday = B.sameDay(sel, now);
    const strip = Array.from({ length: 7 }, (_, i) => {
      const d = B.addDays(ws, i), on = B.sameDay(d, sel), today = B.sameDay(d, now), future = d > now && !today;
      return `<button class="daycell" data-a="pickDay" data-t="${d.getTime()}" aria-label="${B.fmt.weekdayDayMonth(d)}"><span class="t-cap2 b sec">${LETTERS[i]}</span>
        <span class="num" style="${on ? 'background:var(--calendar-accent);color:#fff;font-weight:600' : today ? 'box-shadow:inset 0 0 0 1.5px var(--calendar-accent)' : ''};${future && !on ? 'color:var(--label2)' : ''}">${d.getDate()}</span>${C.dayMark(B.dayMark(B.planDay(s, d)), 14)}</button>`;
    }).join('');
    const items = B.timeline(s, sel);
    const recCount = items.filter((x) => x.type !== 'diary').length;
    const dEntries = B.diaryOn(s, sel);
    let list;
    if (!items.length) list = `<div class="col gap18 center" style="align-items:center;padding:24px"><img decoding="async" src="assets/img/MotherProfile.png" alt="" style="height:180px">
      <div class="t-title3 bb">Nothing logged</div><div class="sec">No checks, journal or symptoms on this day.</div>${isToday ? '' : '<button class="glassbtn" data-a="historyToday">Back to today</button>'}</div>`;
    else list = `<div class="col gap8">${items.map((it) => App.swipeRow(`<div class="row gap12 hrow" style="padding:16px;align-items:flex-start">
        <span class="t-cap sec" style="width:60px;padding-top:2px">${B.fmt.time(it.time)}</span>${timelineRow(it)}</div>`, it.rec ? `data-a="deleteRecordingRow" data-id="${it.rec.id}"` : `data-a="deleteDiary" data-id="${it.entry.id}"`, `h${it.rec ? it.rec.id : it.entry.id}`)).join('')}</div>
      ${isToday ? '' : '<button class="linkbtn" style="width:100%" data-a="historyToday" data-id="history.returnToday">Back to Today</button>'}`;
    return `<div class="page" data-key="history">${C.clinicalBg({ fillsPage: true })}
      ${C.nav({ left: '<div class="t-title tint" style="white-space:nowrap;padding-left:4px">History</div>', right: `${isToday ? '' : '<button class="glassbtn" data-a="historyToday" data-id="history.today">Today</button>'}<button class="glassbtn icon" data-a="openCalendar" aria-label="Calendar" data-id="history.calendar">${I('calendar')}</button>` })}
      <div class="card row" style="margin:8px 16px;padding:12px 8px;border-radius:24px;flex:none;position:relative;z-index:2">
        <button class="weekarrow" data-a="shiftWeek" data-n="-1" aria-label="Previous week">${I('chevron.left')}</button><div class="wkwrap grow"><div class="row wk ${s.ui.weekDir || ''}" data-key="wk${ws.getTime()}" style="justify-content:space-between">${strip}</div></div>
        <button class="weekarrow" data-a="shiftWeek" data-n="1" aria-label="Next week">${I('chevron.right')}</button></div>
      <div class="scroll" style="position:relative"><div class="col gap16" style="padding:8px 16px 120px">
      <div class="col gap4"><div class="t-headline" data-id="history.selectedDay">${B.fmt.weekdayDayMonth(sel)}</div>
      <div class="t-cap sec">${recCount} ECG recordings · ${dEntries.filter((e) => e.kind !== 'symptom').length} journal entries · ${dEntries.filter((e) => e.kind === 'symptom').length} symptom entries</div></div>
      ${list}<div class="t-cap sec center">All history shown here is fictional demo data.</div></div></div></div>`;
  };
  function timelineRow(it) {
    if (it.type === 'diary') {
      const e = it.entry, signs = B.SYMPTOM_ORDER.filter((k) => e.signs.includes(k));
      return `<button class="row gap8 grow" data-a="viewDiary" data-id="${e.id}" style="text-align:left"><span class="col gap4 grow"><span class="t-headline">${esc(e.kind === 'symptom' ? 'Symptoms' : e.kind === 'activity' ? e.activityTitle : 'Journal note')}</span>
        ${signs.length ? `<span class="t-sub sec">${signs.map((k) => B.SYMPTOMS[k].short).join(', ')}</span>` : ''}${e.text ? `<span class="t-sub sec clamp2">${esc(e.text)}</span>` : ''}</span><span class="t-cap" style="color:var(--label3)">${I('chevron.right')}</span></button>`;
    }
    const r = it.rec, [label] = STATUS_SHORT[r.status], needs = B.STATUS[r.status].needsDoctor;
    return `<button class="row gap10 grow" data-a="openRecording" data-id="${r.id}" style="text-align:left" data-id2="history.row">${needs ? '<span style="width:16px;height:16px;border-radius:50%;background:var(--attention);flex:none"></span>' : ''}
      <span class="col gap4 grow"><span class="t-headline">ECG check</span><span class="row gap4 t-sub sec">${label}<span>· ${B.fmt.duration(r.duration)}</span></span>
      ${r.origin === 'simulated' ? '<span class="t-cap sec">Demo recording</span>' : ''}</span><span class="t-cap" style="color:var(--label3)">${I('chevron.right')}</span></button>`;
  }
  A.pickDay = (d) => { st().ui.historyDay = new Date(+d.t); App.render(); };
  A.shiftWeek = (d) => { st().ui.weekDir = +d.n > 0 ? 'from-r' : 'from-l'; st().ui.historyDay = B.addDays(st().ui.historyDay, 7 * +d.n); App.render(); };
  A.deleteRecordingRow = (d) => App.dialog({ title: 'Delete this recording?', message: "It can't be undone.", buttons: [{ label: 'Delete recording', destructive: true, run: () => { const s = st(); s.recordings = s.recordings.filter((r) => r.id !== d.id); delete s.signals[d.id]; App.render(); } }] });
  A.historyToday = () => { const s = st(), cur = B.startOfDay(s.ui.historyDay), now = B.startOfDay(new Date()); s.ui.weekDir = cur < now ? 'from-r' : 'from-l'; s.ui.historyDay = now; App.render(); };
  /* History opens the compact outcome first (RecordingSummarySheet); the full recording and its details sit behind it */
  A.openRecording = (d) => App.present('sheet', 'recordingSummary', { id: d.id }, { size: 'summary' });
  R.recordingSummary = (p) => {
    const s = st(), r = s.recordings.find((x) => x.id === p.id); if (!r) return '<div class="page"></div>';
    const d = r.date;
    return `<div class="page">${C.clinicalBg({ attention: r.status === 'abnormal', fillsPage: true })}${C.nav({ left: `<button class="glassbtn icon" data-a="dismiss" aria-label="Back" data-id="history.recordingClose">${I('chevron.left')}</button>`, title: 'ECG Monitoring',
        sub: `${B.fmt.WD[d.getDay()].slice(0, 3)}, ${B.fmt.MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` })}
      <div class="scroll" style="position:relative"><div class="col gap24" style="padding:16px 22px 20px">${App.outcomeHeader(r)}
      <button class="resrow" style="border-radius:30px" data-a="summaryFullSignal" data-id="${r.id}" data-id2="recording.fullSignal"><span class="row sec t-sub">${I('waveform.path.ecg.rectangle')}<span class="grow"></span>${I('arrow.right')}</span>
        <span class="t-sub b">${r.status === 'abnormal' ? 'Where it looked different' : 'See Full Recording'}</span><span class="t-cap sec">The whole ${B.fmt.duration(r.duration)} recording</span></button></div></div></div>`;
  };
  A.summaryFullSignal = (d) => { App.topLayer().size = 'large'; App.push('fullSignal', { id: d.id }); };
  A.openCalendar = () => { st().ui.calendarMonth = new Date(st().ui.historyDay); App.present('sheet', 'calendar', {}); };

  R.calendar = () => {
    const s = st(), m = new Date(s.ui.calendarMonth), first = new Date(m.getFullYear(), m.getMonth(), 1), now = new Date();
    const lead = (first.getDay() + 6) % 7, days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells = Array.from({ length: lead }, () => '<span style="height:64px"></span>').concat(Array.from({ length: days }, (_, i) => {
      const d = new Date(m.getFullYear(), m.getMonth(), i + 1), sel = B.sameDay(d, s.ui.historyDay), today = B.sameDay(d, now), future = d > now && !today;
      return `<button class="daycell" data-a="calendarPick" data-t="${d.getTime()}" data-id="calendar.day.${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}">
        <span class="num" style="${sel ? 'background:var(--calendar-accent);color:#fff;font-weight:600' : today ? 'box-shadow:0 0 0 1.5px var(--calendar-accent)' : ''};${future && !sel ? 'color:var(--label2)' : ''}">${i + 1}</span>
        <span style="height:22px;display:grid;place-items:center">${C.dayMark(B.dayMark(B.planDay(s, d)), 22)}</span></button>`;
    })).join('');
    const legend = [['complete', 'All checks done'], ['partial', 'Some checks done'], ['changed', 'Change found'], ['missed', 'Missed']]
      .map(([k, t]) => `<span class="row gap8">${C.dayMark(k, 16)}${t}</span>`).join('');
    return `<div class="page">${C.nav({ left: C.close(), title: 'Calendar' })}<div class="scroll"><div class="col gap10" style="padding:20px">
      <div class="row"><button class="glassbtn icon" data-a="shiftMonth" data-n="-1" aria-label="Previous month">${I('chevron.left')}</button><div class="grow center t-title3">${B.fmt.monthYear(m)}</div>
      <button class="glassbtn icon" data-a="shiftMonth" data-n="1" aria-label="Next month">${I('chevron.right')}</button></div>
      <div style="border-radius:24px;overflow:hidden;box-shadow:inset 0 0 0 .5px var(--label3)"><div class="row" style="height:36px;background:var(--card)">${LETTERS.map((l) => `<span class="grow center t-cap b sec">${l}</span>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);row-gap:8px;padding:8px 6px 12px">${cells}</div></div>
      <div class="t-cap sec">Tap a day to see the details.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:8px" class="t-cap sec">${legend}</div></div></div></div>`;
  };
  A.shiftMonth = (d) => { const m = new Date(st().ui.calendarMonth); m.setDate(1); m.setMonth(m.getMonth() + +d.n); st().ui.calendarMonth = m; App.render(); };
  A.calendarPick = (d) => { st().ui.weekDir = ''; st().ui.historyDay = new Date(+d.t); App.dismiss(); };

  /* ---------- Recording detail (RecordingDetailView; WhatWeSawCard replaced by the labelled test signal) ---------- */
  R.recordingDetail = (p) => {
    const s = st(), r = s.recordings.find((x) => x.id === p.id), name = s.child.first;
    if (!r) return `<div class="page">${C.nav({ left: C.back() })}</div>`;
    const samples = B.signalFor(s, r), fs = ECGSignal.fs;
    const strip = `<div class="card col gap10" style="padding:16px"><div class="t-sub b">Recorded signal · lead II</div>
      <div style="height:64px;overflow:hidden">${C.ecgRow(samples, fs * 2, fs * 8, 330, 64)}</div>
      <div class="illus-label">${I('info.circle')}Generated test signal · not a measurement of your child's heart</div>
      <button class="linkbtn" style="justify-content:flex-start" data-a="resultSignalPush" data-id="${r.id}">${I('waveform.path.ecg.rectangle')}View entire recording</button></div>`;
    const signs = B.SYMPTOM_ORDER.filter((k) => r.symptoms.includes(k));
    const header = r.status === 'notAnalyzed' ? `<div class="card col gap18" style="padding:20px;border-radius:26px">${App.outcomeHeader(r, { compact: true })}<div class="row t-sub"><span class="grow">Duration</span><span class="sec">${B.fmt.duration(r.duration)}</span></div></div>` : App.outcomeHeader(r, { compact: true });
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.back(), title: `${B.fmt.abbrevDate(r.date)}, ${B.fmt.time(r.date)}`, sub: 'ECG vest', right: `<button class="glassbtn icon" data-a="editRecordingNotes" data-id="${r.id}" aria-label="Edit">${I('pencil')}</button>` })}
      <div class="scroll" style="position:relative"><div class="col gap14" style="padding:8px 16px 40px">${header}${strip}
      <div class="col gap10"><div class="t-headline">Symptoms</div>${signs.length ? signs.map((k) => `<div style="padding:14px;border-radius:999px;background:var(--surface)">${esc(B.SYMPTOMS[k].title)}</div>`).join('') : '<div class="sec">Nothing noted</div>'}</div>
      <div class="col gap8" style="padding:20px;border-radius:24px;background:var(--neutral)"><div class="t-headline">Notes</div><div class="${r.notes ? '' : 'sec'}" data-id="detail.note">${esc(r.notes || 'No notes added')}</div>
      <button class="linkbtn" style="justify-content:flex-start" data-a="editRecordingNotes" data-id="${r.id}" data-id2="detail.editSymptoms">Edit symptoms & notes</button></div>
      ${r.status !== 'notAnalyzed' ? `<div class="col gap8" style="padding:16px;border-radius:24px;background:var(--gray5)"><div class="t-sub">We compared heart rate, rhythm and beat shape with ${esc(name)}'s hospital recording. The app doesn't look for ST changes.</div>
        <div class="row gap8 t-sub" style="align-items:flex-start"><span class="sec">${I('info.circle.fill')}</span><span>This is not a diagnosis. Please show this to ${esc(name)}'s doctor. Using it to start or change medicine elsewhere could lead to the wrong treatment.</span></div>
        <div class="t-cap sec">In this demo the comparison is scripted. No analysis was run.</div></div>` : ''}
      <button class="linkbtn" style="color:var(--red);width:100%" data-a="deleteRecording" data-id="${r.id}" data-id2="detail.delete">${I('trash')}Delete recording</button></div></div></div>`;
  };
  A.resultSignalPush = (d) => App.push('fullSignal', { id: d.id });
  A.editRecordingNotes = (d) => { st().ui.draft = null; App.present('sheet', 'noteSign', { recordingID: d.id }); };
  A.deleteRecording = (d) => App.dialog({ title: 'Delete this recording?', message: "It can't be undone.", buttons: [{ label: 'Delete recording', destructive: true, run: () => {
    const s = st(); s.recordings = s.recordings.filter((r) => r.id !== d.id); delete s.signals[d.id]; App.pop(); } }] });

  /* ---------- Child profile (ProfileView: pushed from Today, Back on the left, Doctor Sync on the right) ---------- */
  const section = (title, body, foot = '', locked = false) => `<div class="col gap8"><div class="row"><span class="t-headline grow">${esc(title)}</span>${locked ? `<span class="sec t-cap" aria-label="Set by the clinic">${I('lock.fill')}</span>` : ''}</div><div class="pcard">${body}</div>${foot ? `<div class="t-foot sec">${foot}</div>` : ''}</div>`;
  const rowIcon = (sym, color = 'var(--accent)') => `<span style="width:28px;font-size:20px;color:${color};display:grid;place-items:center;flex:none">${I(sym)}</span>`;
  const dataRow = (title, value, sym) => `<div class="prow">${rowIcon(sym)}<span style="white-space:nowrap">${esc(title)}</span><span class="grow"></span><span class="sec" style="text-align:right">${esc(value)}</span></div>`;
  const link = (label, sym, action, extra = '') => `<button class="prow" style="width:100%" data-a="${action}" ${extra}>${rowIcon(sym)}<span class="grow" style="text-align:left">${esc(label)}</span><span class="t-foot" style="color:var(--label3)">${I('chevron.right')}</span></button>`;
  const unavailable = (label, sym, why) => `<button class="prow" style="width:100%;opacity:.55" data-a="unavailable" data-why="${esc(why)}">${rowIcon(sym, 'currentColor')}<span class="grow" style="text-align:left">${esc(label)}</span><span class="badge-off">Not in demo</span></button>`;
  const pdiv = '<div class="pdiv"></div>';
  const checkLabel = (n, i) => n === 1 ? 'Daily check' : i === 0 ? 'First check' : i === 1 ? 'Second check' : `Check ${i + 1}`;
  const LINK_WHY = 'Linking to a clinic needs the clinic’s Mac app. It isn’t part of this parent demo.';
  R.profile = () => {
    const s = st(), c = s.child, b = c.birth;
    const freq = s.plan.days === 'Every day' ? `${s.plan.perDay}x a day` : s.plan.days;
    const reminders = s.reminderTimes.map((t, i) => `<div class="prow" style="padding-block:9px">${rowIcon('bell')}<span class="grow">${checkLabel(s.reminderTimes.length, i)}</span>${C.timePill(App.timeOf(t), 'setProfileReminder', `data-i="${i}" data-id="profile.reminder.${i}"`)}</div>${pdiv}`).join('');
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.back('pop', 'profile.close'), right: `<button class="linkbtn row gap6" style="font-size:17px;white-space:nowrap" data-a="doctorSync" data-id="profile.sync">${I('arrow.trianglehead.2.clockwise.rotate.90')}Doctor Sync</button>` })}<div class="scroll" style="position:relative"><div class="col gap30" style="padding:6px 22px 24px">
      <div class="col gap5" style="margin-bottom:-10px"><div class="t-title" data-id="profile.childName">${esc(c.name)}</div><div class="t-sub">Born ${B.fmt.abbrevDate(b)} (${B.age(b)} years old)</div><span class="badge-demo" style="align-self:flex-start;margin-top:6px">${I('info.circle')}Fictional demo child</span></div>
      ${section(`About ${c.first}`, `${dataRow('Heart condition', c.condition, 'heart')}${pdiv}${dataRow('Doctor', (s.prefs.careDoctorName || '').trim() || 'Not provided', 'stethoscope')}${pdiv}${dataRow('Hospital', (c.careTeamName || '').trim() || 'Not provided', 'cross.case')}`, 'Saved on this iPhone.')}
      ${section('ECG Schedule', `${dataRow('How often', freq, 'calendar')}${pdiv}${dataRow('Duration for each', `${s.plan.durationMinutes} min.`, 'clock')}`, "Follow the schedule agreed with your child's care team.")}
      ${section('Reminders', `${reminders}<div class="prow" style="padding-block:9px">${rowIcon('square.and.pencil')}<span class="grow">Nightly Journal</span>${C.timePill(App.minutesToDate(s.prefs.journalReminderMinutes), 'setJournalReminder', 'data-id="reminders.journalTime"')}</div>`, `Pick times when ${esc(c.first)} is usually rested.`)}
      ${section('Appearance', `<div class="prow">${rowIcon('moon')}<span class="grow">Dark mode</span>${C.toggle(s.prefs.darkMode, 'toggleDark', 'data-id="profile.darkMode"')}</div>`, 'Baymo stays light unless you turn this on.')}
      ${section('Help and data', `${link('How to put on the vest', 'tshirt', 'openVestHelp')}${pdiv}${link('Privacy Policy', 'doc.text', 'openTerms')}`)}
      <button class="prow" style="width:100%;min-height:52px;border-radius:20px;background:var(--bg)" data-a="startOver" data-id="profile.startOver">${rowIcon('trash', 'var(--red)')}<span class="grow" style="text-align:left;color:var(--red)">Delete All Data</span></button>
      ${section('App settings', `${unavailable('Recording plan', 'calendar', 'The recording plan is agreed with the care team. Changing it isn’t part of this parent demo.')}${pdiv}${unavailable('Link phone', 'link', LINK_WHY)}${pdiv}
        ${link('Care team & contacts', 'phone', 'openContacts')}${pdiv}${link('Notification settings', 'bell', 'openReminderSettings', 'data-id="profile.reminders"')}${pdiv}${link('Recording source', 'sensor.tag.radiowaves.forward', 'openSource')}${pdiv}${link('Privacy & data', 'square.and.arrow.up', 'openPrivacyData', 'data-id="profile.data"')}`)}
      ${section('ECG reference & analysis', `${unavailable('Patient baseline', 'waveform.path.ecg.rectangle', 'Baselines are set by the care team. Doctor tools aren’t part of this parent demo.')}${pdiv}
        ${unavailable('Saved ECG analysis', 'arrow.clockwise', 'ECG analysis isn’t connected in this demo. Results here are scripted.')}`)}
      <div class="t-cap sec">Baymo · Saved on this iPhone. Automatic ECG analysis is not connected.</div></div></div></div>`;
  };
  /* ReminderTimesView */
  A.openReminderSettings = () => App.push('reminderSettings', {});
  R.reminderSettings = () => {
    const s = st(), p = s.prefs;
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.back(), title: 'Reminders' })}<div class="scroll" style="position:relative"><div class="col gap20" style="padding:20px">
      <div class="formcard"><div class="row"><span class="grow">Reminder notifications</span>${C.toggle(p.remindersEnabled, 'toggleReminders')}</div></div>
      <div class="col gap8"><div class="formcard">${s.reminderTimes.map((t, i) => `<div class="row"><span class="grow">Reminder ${i + 1}</span>${C.timePill(App.timeOf(t), 'setProfileReminder', `data-i="${i}"`)}</div>`).join('<div class="divider"></div>')}</div>
      <div class="t-cap sec" style="padding-left:16px">You get a reminder at each time, on the days ${esc(s.child.name)} is due to record.</div></div>
      <div class="col gap8"><div class="t-foot sec" style="padding-left:16px">ACTIVITY JOURNAL</div><div class="formcard"><div class="row"><span class="grow">Evening journal reminder</span>${C.toggle(p.journalRemindersEnabled, 'toggleJournalReminder')}</div><div class="divider"></div>
      <div class="row"><span class="grow">Log the day</span>${C.timePill(App.minutesToDate(p.journalReminderMinutes), 'setJournalReminder', 'data-id="reminders.journalTime"')}</div></div></div>
      <div class="demo-hint">${I('info.circle')}<span>Notifications aren’t sent from this exhibition demo.</span></div></div></div></div>`;
  };
  A.toggleJournalReminder = () => { const p = st().prefs; p.journalRemindersEnabled = !p.journalRemindersEnabled; App.render(); };
  A.doctorSync = () => App.alert({ title: 'Not available in this demo', message: LINK_WHY, buttons: [{ label: 'OK' }] });
  A.unavailable = (d) => App.alert({ title: 'Not available in this demo', message: d.why, buttons: [{ label: 'OK' }] });
  A.setProfileReminder = (d, el, h, m) => { st().reminderTimes[+d.i] = [h, m]; App.toast('Reminder time updated'); };
  A.toggleReminders = () => { const p = st().prefs; p.remindersEnabled = !p.remindersEnabled; App.render(); };
  A.toggleDark = () => { const p = st().prefs; p.darkMode = !p.darkMode; App.render(); };
  A.openTerms = () => App.push('terms', {});
  A.openContacts = () => App.push('contacts', {});
  A.openVestHelp = () => App.push('vestHelp', {});
  A.openSource = () => App.push('source', {});
  A.openPrivacyData = () => App.push('privacyData', {});
  A.startOver = () => App.alert({ title: `Delete all of ${st().child.first}'s data?`, message: 'This removes every check, symptom and journal entry from this phone. It can\u2019t be undone.',
    buttons: [{ label: 'Cancel', cls: 'b', id: 'profile.cancelStartOver' }, { label: 'Delete', cls: 'destr', id: 'profile.confirmStartOver', run: () => App.deleteAllData() }] });
  /* LocalDataDeletion + DataDeletedView: everything goes; a receipt names the child, then setup opens */
  App.deleteAllData = () => { const name = st().child.first; App.resetToOnboarding(); App.present('cover', 'dataDeleted', { name }); };
  R.dataDeleted = (p) => `<div class="page" style="background:var(--bg)"><div class="col gap16 center" style="flex:1;align-items:center;justify-content:center;padding:24px 22px;text-align:center">
      <div style="width:230px;height:230px;border-radius:50%;background:rgba(228,248,250,.45);display:grid;place-items:center"><img decoding="async" src="assets/img/MotherProfile.png" alt="" style="height:146px"></div>
      <div class="t-title tint" data-id="data.deletedTitle">${esc(p.name)}'s data is deleted</div><div class="t-body sec">To set up again, you'll need a code from your child's doctor.</div></div>
      <div class="actionbar"><button class="btn pri" data-a="dismiss" data-id="data.deletedDone">Done</button></div></div>`;

  R.contacts = () => {
    const s = st();
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.back(), title: 'Care team & contacts' })}<div class="scroll" style="position:relative"><div class="col gap20" style="padding:20px">
      <div class="col gap8"><div class="t-headline">Care team</div><div class="formcard"><input class="field" placeholder="Doctor name (optional)" data-bind="st.prefs.careDoctorName" value="${esc(s.prefs.careDoctorName || '')}"><div class="divider"></div><input class="field" placeholder="Hospital or doctor" data-bind="st.child.careTeamName" value="${esc(s.child.careTeamName)}"><div class="divider"></div>
      <input class="field" placeholder="Phone number" inputmode="tel" data-bind="st.child.careTeamPhone" value="${esc(s.child.careTeamPhone)}"></div></div>
      <div class="col gap8"><div class="t-headline">Emergency contact</div><div class="formcard"><input class="field" placeholder="Name" data-bind="st.prefs.emergencyContactName" value="${esc(s.prefs.emergencyContactName)}"><div class="divider"></div>
      <input class="field" placeholder="Phone number" inputmode="tel" data-bind="st.prefs.emergencyContactPhone" value="${esc(s.prefs.emergencyContactPhone)}"></div></div>
      <div class="t-cap sec">Changes are saved as you type. These contacts are stored on this phone.</div>
      <div class="demo-hint">${I('info.circle')}<span>The hospital and phone number are fictional demo values.</span></div></div></div></div>`;
  };
  A.nameChanged = () => { const c = st().child; c.first = (c.name.trim().split(/\s+/)[0]) || 'Child'; };
  document.addEventListener('change', (ev) => { const el = ev.target; if (el.dataset && el.dataset.dateaction === 'setBirth' && el.value) { const [y, m, d] = el.value.split('-').map(Number); st().child.birth = new Date(y, m - 1, d); App.render(); } });
  R.vestHelp = () => `<div class="page">${C.journalBg()}${C.nav({ left: C.back(), title: 'Your vest' })}<div class="scroll" style="position:relative"><div class="col gap20" style="padding:20px;align-items:center;text-align:center">
      <img decoding="async" src="assets/img/VestFront.png" alt="" style="height:220px"><div class="t-title2">Put on & check the vest</div><div class="sec">Follow the fitting instructions provided with your vest and by your care team.</div></div></div></div>`;
  R.source = () => {
    const s = st();
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.back(), title: 'Recording source' })}<div class="scroll" style="position:relative"><div class="col gap20" style="padding:20px">
      <div class="col gap8"><div class="t-headline">Default source</div><div class="formcard"><div class="row"><span class="grow">ECG vest</span><span class="tint">${I('checkmark')}</span></div><div class="divider"></div>
      <div class="row" style="opacity:.5"><span class="grow">Import CSV file</span><span class="badge-off">Not in demo</span></div></div></div>
      <div class="col gap8"><div class="t-headline">Vest source</div><div class="formcard"><div class="row gap12"><span class="tint">${I('bluetooth')}</span><span class="grow">Vest Simulator over Bluetooth</span><span class="sec">${App.vestConnected() ? 'Connected' : 'Not connected'}</span></div>
      <div class="divider"></div><button class="linkbtn" style="justify-content:flex-start" data-a="openConnectionFromProfile">Connect your vest</button></div></div>
      <div class="col gap8"><div class="t-headline">Simulator demo</div><div class="formcard"><div class="row gap8 tint">${I('checkmark.circle.fill')}Demo baseline ready</div></div>
      <div class="t-cap sec">Choose Demo result in Vest Simulator before recording. These are scripted test outcomes, not ML analysis. Existing patient baselines are kept.</div></div>
      <div class="col gap8"><div class="t-headline">Test recording</div><div class="seg">${[[30, '30 seconds'], [60, '1 minute'], [300, '5 minutes']].map(([v, l]) => `<button class="${s.sim.length === v ? 'on' : ''}" data-a="setLength" data-v="${v}">${l}</button>`).join('')}</div></div></div></div></div>`;
  };
  A.setLength = (d) => { st().sim.length = +d.v; App.render(); };
  A.openConnectionFromProfile = () => { App.resetBt(); App.present('sheet', 'bluetooth', { session: true }, { onDismiss: () => App.resetBt() }); };
  R.privacyData = () => {
    const s = st();
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.back(), title: 'Privacy & data' })}<div class="scroll" style="position:relative"><div class="col gap20" style="padding:20px">
      <div class="formcard"><div class="row"><span class="grow">ECG recordings</span><span class="sec">${s.recordings.length}</span></div><div class="divider"></div>
      <div class="row"><span class="grow">Baseline versions</span><span class="sec">1</span></div><div class="divider"></div><div class="row"><span class="grow">Analysis attempts</span><span class="sec">0</span></div><div class="divider"></div>
      <div class="row"><span class="grow">Journal & symptom entries</span><span class="sec">${s.diary.length}</span></div></div>
      <div class="formcard" style="opacity:.55"><div class="row gap10">${I('square.and.arrow.up')}<span class="grow">Export all data</span><span class="badge-off">Not in demo</span></div></div>
      <div class="t-cap sec">Includes the profile, settings, all baseline versions, analysis attempts, original ECG signals, symptoms and journal. The clinic PIN is not included.</div>
      <button class="row gap10" style="padding:18px;border-radius:22px;background:var(--bg);color:var(--red);width:100%" data-a="deleteAllData">${I('trash')}Delete all data</button>
      <div class="t-cap sec">This removes saved data from Baymo and starts setup again. Exported copies are not removed.</div></div></div></div>`;
  };
  A.deleteAllData = () => App.dialog({ title: 'Delete all data from this phone?', message: "The child's profile, ECG recordings, baseline versions, analysis attempts, journal, settings and clinic PIN will be removed. This cannot be undone.",
    buttons: [{ label: 'Delete all data', destructive: true, run: () => App.deleteAllData() }] });
})();
