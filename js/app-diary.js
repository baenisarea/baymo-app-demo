/* Symptoms (NoteSignFlowView + AfterSaveView) and the Activity Journal (JournalView, DailyActivityPicker, ActivityEditor, JournalVoiceView). */
(function () {
  const { C, esc, I } = App, R = App.routes, A = App.actions, B = window.Baymo;
  const st = () => App.st;

  /* ---------- Log symptoms ---------- */
  function draftFor(p) {
    const s = st();
    if (!s.ui.draft || s.ui.draft.for !== (p.recordingID || p.entryID || 'new')) {
      const rec = p.recordingID && s.recordings.find((r) => r.id === p.recordingID);
      const linked = rec && rec.diaryEntryID ? s.diary.find((e) => e.id === rec.diaryEntryID) : p.entryID ? s.diary.find((e) => e.id === p.entryID) : null;
      s.ui.draft = { for: p.recordingID || p.entryID || 'new', signs: (linked ? linked.signs : rec ? rec.symptoms : []).slice(), text: linked ? linked.text : rec ? rec.notes : '',
        ongoing: linked ? linked.wasOngoing : true, activity: linked ? linked.activity : '', medicine: '', startedAt: linked ? linked.startedAt : new Date(), showsNotes: false, showsContext: false, isSpoken: !!(linked && linked.isSpoken) };
    }
    return s.ui.draft;
  }
  R.noteSign = (p) => {
    const s = st(), d = draftFor(p), name = s.child.first;
    const canSave = d.signs.length > 0 || d.text.trim().length > 0;
    const choices = B.LOGGING_CHOICES.concat(d.signs.includes('fever') ? ['fever'] : []);
    const grid = `<div class="sym-grid ${d.signs.length ? 'picked' : ''}">${choices.map((k) => { const on = d.signs.includes(k); return `<button class="sym-tile ${on ? 'on' : ''}" data-a="toggleSign" data-k="${k}" aria-label="${esc(B.SYMPTOMS[k].title)}" data-id="symptom.${k}">
      <span class="top">${I(B.SYMPTOMS[k].symbol)}${I(on ? 'checkmark.square.fill' : 'square')}</span><span class="t-sub" style="color:var(--label)">${esc(B.SYMPTOMS[k].short)}</span></button>`; }).join('')}</div>`;
    const notes = d.showsNotes || d.text || d.signs.includes('worried')
      ? `<div class="col gap8" style="padding:16px;border-radius:20px;background:var(--neutral)"><div class="t-cap sec">What else did you notice?</div>
         <textarea class="field" rows="3" placeholder="Write down any notes you want to log." data-bind="st.ui.draft.text" data-rerender data-id="noteSign.note">${esc(d.text)}</textarea></div>`
      : `<button class="linkbtn t-headline" style="width:100%" data-a="showNotes" data-id="noteSign.addNotes">${I('plus.circle.fill')}Add notes</button>`;
    const context = canSave ? `<div class="col gap12"><button class="row t-sub" style="width:100%" data-a="toggleContext"><span class="grow">More context (optional)</span><span class="tint">${I(d.showsContext ? 'chevron.down' : 'chevron.right')}</span></button>
      ${d.showsContext ? `<div class="col gap16" style="padding-top:12px"><div class="row t-sub"><span class="grow">Still happening</span>${C.toggle(d.ongoing, 'toggleOngoing', 'data-id="noteSign.ongoing"')}</div>
        <label class="row t-sub"><span class="grow">Activity (optional)</span><select class="selectpill" data-bind="st.ui.draft.activity"><option value="">Not specified</option>${Object.entries(B.ACTIVITIES).map(([k, v]) => `<option value="${k}" ${d.activity === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>` : ''}</div>` : '';
    const bottom = canSave
      ? `<div class="row gap8 t-sub" style="padding:8px 8px 8px 14px;border-radius:999px;background:var(--neutral)" data-id="noteSign.startedAt"><span class="tint">${I('clock')}</span><span class="grow">Started</span>${C.timePill(d.startedAt, 'setSignStart')}</div>`
      : `<div class="t-cap sec center">Pick at least one to save.</div>`;
    return `<div class="page" style="background:linear-gradient(var(--bg), var(--notesign-end))">${C.nav({ left: C.close('dismiss', 'noteSign.cancel'), title: 'Log symptoms' })}
      <div class="scroll"><div class="col gap10" style="padding:0 20px 20px">
      <div class="row gap10"><div class="col gap6 grow"><div class="t-title3" style="font-weight:600">How is ${esc(name)} feeling?</div><div class="t-foot sec">Tap anything you noticed. It helps his doctor.</div></div>
      <img decoding="async" src="assets/img/MotherProfile.png" alt="" style="width:60px;height:80px;object-fit:contain"></div>
      ${d.isSpoken ? `<div class="row gap6 t-sub sec" data-id="noteSign.spokenCaption">${I('waveform')}Filled in from what you said. Check before saving.</div>` : ''}
      ${grid}${notes}${context}</div></div>
      <div class="actionbar" style="background:transparent">${bottom}<button class="btn pri" data-a="saveSigns" ${canSave ? '' : 'disabled'} data-id="noteSign.save">Save</button></div></div>`;
  };
  A.toggleSign = (d) => { const dr = st().ui.draft, i = dr.signs.indexOf(d.k); if (i >= 0) dr.signs.splice(i, 1); else dr.signs.push(d.k); App.render(); };
  A.showNotes = () => { st().ui.draft.showsNotes = true; App.render(); App.later(() => { const t = document.querySelector('[data-id="noteSign.note"]'); if (t) t.focus(); }, 60); };
  A.toggleContext = () => { const dr = st().ui.draft; dr.showsContext = !dr.showsContext; App.render(); };
  A.toggleOngoing = () => { const dr = st().ui.draft; dr.ongoing = !dr.ongoing; App.render(); };
  A.setSignStart = (d, el, h, m) => { const dr = st().ui.draft, x = new Date(dr.startedAt); x.setHours(h, m, 0, 0); if (x > new Date()) x.setDate(x.getDate() - 1); dr.startedAt = x; App.render(); };
  A.saveSigns = () => {
    const s = st(), dr = s.ui.draft, layer = App.topLayer(), p = layer.stack[0].p;
    if (!(dr.signs.length || dr.text.trim())) return;
    let entry;
    if (p.recordingID) {
      const rec = s.recordings.find((r) => r.id === p.recordingID);
      rec.symptoms = dr.signs.slice(); rec.notes = dr.text.trim();
      entry = rec.diaryEntryID && s.diary.find((e) => e.id === rec.diaryEntryID);
      if (entry) Object.assign(entry, { signs: dr.signs.slice(), text: dr.text.trim(), wasOngoing: dr.ongoing, activity: dr.activity });
      else entry = { signs: dr.signs.slice(), text: dr.text.trim(), wasOngoing: dr.ongoing };
    } else if (p.entryID) {
      entry = s.diary.find((e) => e.id === p.entryID);
      Object.assign(entry, { signs: dr.signs.slice(), text: dr.text.trim(), wasOngoing: dr.ongoing, activity: dr.activity, startedAt: dr.startedAt });
    } else {
      entry = { id: B.id('dia'), kind: 'symptom', startedAt: dr.startedAt, endedAt: null, loggedAt: new Date(), wasOngoing: dr.ongoing, signs: dr.signs.slice(), activity: dr.activity, text: dr.text.trim(), isSpoken: dr.isSpoken, recordingID: null, medicine: dr.medicine };
      s.diary.push(entry);
    }
    // The advice also reads the note: a sign written but not ticked still counts.
    const advised = { ...entry, signs: [...new Set(entry.signs.concat(B.keywordSigns(entry.text)))] };
    const route = B.afterSaveRoute(advised);
    s.ui.draft = null;
    const followsRecording = !!p.recordingID;
    if (route === 'emergency') App.present('cover', 'emergency', { urgent: true, signs: entry.signs, note: entry.text, closeTitle: followsRecording ? 'Back to recording' : 'Back to Today', closeAction: 'closeSaved', closeId: 'noteSign.notNow' }, { anim: 'smooth' });
    else App.present('cover', 'afterSave', { entryId: entry.id, signs: entry.signs, note: entry.text, route, followsRecording, allowsLogAnother: !p.recordingID && !p.entryID }, { anim: 'smooth' });
  };
  /** Closes the saved outcome and the symptom sheet under it. */
  A.closeSaved = () => { App.dismiss(true); App.dismiss(true); };
  R.afterSave = (p) => {
    const s = st(), contact = p.route === 'contactDoctor', logged = !contact;
    const surface = contact ? 'var(--warning-surface)' : 'var(--surface)';
    const ill = contact ? `<div style="width:206px;height:206px;border-radius:50%;overflow:hidden;background:${surface}"><div style="transform:translateY(40px)">${C.illus('CareTeamIllustration', 206)}</div></div>`
      : `<img decoding="async" src="assets/img/SymptomsSaved.svg" alt="" style="width:206px;height:206px;object-fit:contain">`;
    let actions = contact && !p.followsRecording ? `<button class="btn attn" data-a="recordNow" data-entry="${p.entryId || ''}" data-id="noteSign.recordNow">Record a Check Now</button>`
      : `<button class="btn pri" data-a="closeSaved" data-id="symptoms.savedDone">Done</button>`;
    if (!logged || p.allowsLogAnother) actions += `<button class="btn sec" data-a="${logged ? 'logAnother' : 'closeSaved'}" data-id="${logged ? 'symptoms.logAnother' : 'noteSign.notNow'}">${logged ? 'Log Another' : p.followsRecording ? 'Back to recording' : 'Back to Today'}</button>`;
    return `<div class="page" style="background:linear-gradient(var(--bg),${surface} 50%,${surface})"><div style="height:54px;flex:none"></div>
      <div class="scroll"><div class="col gap12" style="padding:${logged ? 48 : 80}px 22px 24px;align-items:center;text-align:center">${logged ? App.nextCheckSummary() : ''}<div style="margin-bottom:8px">${ill}</div>
      <div class="t-title" style="color:${contact ? '#493513' : 'var(--label)'}" data-id="symptoms.outcome.title">${contact ? 'Check with your doctor' : 'Symptoms logged'}</div>
      ${logged ? '<div class="t-sub sec">You can see them any time in History.</div>' : `<div class="t-sub sec">Please contact ${esc(s.child.first)}'s care team about these symptoms. If it gets worse: fainting, a seizure or hard breathing, call ${B.AMBULANCE}.</div>`}
      ${App.savedSummary(p.signs, p.note)}</div></div><div class="actionbar">${actions}</div></div>`;
  };
  A.logAnother = () => { st().ui.draft = null; App.dismiss(true); };
  A.recordNow = (d) => { App.dismissAll(); st().ui.tab = 'home'; App.startSession({ diaryEntryID: d.entry || null }); };

  /* ---------- Activity Journal ---------- */
  const dayEntries = (day) => B.diaryOn(st(), day).filter((e) => e.kind !== 'symptom').sort((a, b) => a.startedAt - b.startedAt);
  App.journalRow = (e) => {
    const sym = e.kind === 'activity' ? B.activitySymbol(e.activityTitle) : 'note.text';
    const title = e.kind === 'activity' ? e.activityTitle : 'Journal note';
    const time = e.endedAt ? `${B.fmt.time(e.startedAt)} – ${B.fmt.time(e.endedAt)}` : B.fmt.time(e.startedAt);
    return `<span class="row gap14" style="width:100%"><span class="tint" style="font-size:20px;width:28px">${I(sym)}</span><span class="col gap4 grow" style="text-align:left"><span class="t-body">${esc(title)}</span>
      ${e.kind === 'journal' && e.text ? `<span class="t-cap sec" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(e.text)}</span>` : ''}</span><span class="t-sub sec">${time}</span></span>`;
  };
  R.journal = (p) => {
    const s = st(), day = new Date(p.day || new Date()), name = s.child.first;
    const rows = dayEntries(day).map((e) => App.swipeRow(`<button class="jrow" data-a="viewDiary" data-id="${e.id}">${App.journalRow(e)}</button>`, `data-a="deleteDiary" data-id="${e.id}"`, `j${e.id}`)).join('');
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.close('dismiss', 'journal.close'), title: 'Activity Journal' })}
      <div class="scroll" style="position:relative"><div class="col gap10" style="padding:5px 20px 20px">
      <div class="col gap6"><div class="t-sub sec">${B.fmt.dayTitle(day)}</div><div class="t-title3 bb">${esc(name)}'s Activity Journal</div></div>
      ${rows}
      <button class="addact" data-a="openActivityPicker" data-id="journal.addActivity">${I('plus.circle.fill')}Add Activity</button>
      <button class="card row gap14" style="padding:16px;width:100%" data-a="openVoice" data-id="journal.speak"><span class="micdot">${I('mic.fill')}</span>
        <span class="col gap4 grow" style="text-align:left"><span class="t-headline">Say It Instead</span><span class="t-sub sec">Tell Baymo about ${esc(name)}'s day. You can check it all after.</span></span><span class="sec">${I('chevron.right')}</span></button>
      <div class="t-foot sec" style="padding-top:10px">You can add any activity ${esc(name)} does during the day. You can also write symptoms that might happen during the activity.</div></div></div>
      <div class="actionbar"><button class="btn pri" data-a="dismiss">OK</button></div></div>`;
  };
  A.openActivityPicker = () => App.present('sheet', 'activityPicker', { day: App.topLayer().stack[0].p.day || new Date() });
  A.openVoice = () => { st().ui.voice = null; App.present('sheet', 'voice', { day: App.topLayer().stack[0].p.day || new Date() }); startListening(); };
  A.deleteDiary = (d) => App.dialog({ title: 'Delete this entry?', buttons: [{ label: 'Delete', destructive: true, run: () => { const s = st(); s.diary = s.diary.filter((e) => e.id !== d.id); App.render(); } }] });
  /* DiaryDetailView: History and Journal open the same populated forms used to log an entry */
  A.viewDiary = (d) => {
    const e = st().diary.find((x) => x.id === d.id); if (!e) return;
    if (e.kind === 'activity') { st().ui.act = null; App.present('sheet', 'activityEditor', { entryId: e.id, title: e.activityTitle, day: e.startedAt, quick: true }, { size: e.endedAt || e.signs.length ? 'large' : 'medium' }); }
    else if (e.kind === 'journal') { st().ui.jnote = null; App.present('sheet', 'journalNote', { entryId: e.id, day: e.startedAt }); }
    else { st().ui.draft = null; App.present('sheet', 'noteSign', { entryID: e.id }); }
  };

  R.activityPicker = (p) => {
    const s = st(), day = new Date(p.day);
    const titles = s.prefs.customActivities.slice().reverse().concat(...B.ACTIVITY_GROUPS.map(([, list]) => list)).filter((t) => !s.prefs.hiddenActivities.includes(t));
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.close('dismiss', 'activityChoices.close'), title: 'Log activity', right: `<button class="glassbtn icon" data-a="addCustomActivity" aria-label="Add new activity" data-id="journal.customActivity">${I('plus')}</button>` })}
      <div class="scroll" style="position:relative"><div class="col gap10" style="padding:5px 20px 20px">${titles.map((t) => {
        const last = s.diary.filter((e) => e.kind === 'activity' && e.activityTitle === t && B.sameDay(e.startedAt, day)).pop();
        return `<button class="actpill ${last ? 'on' : ''}" data-a="pickActivity" data-t="${esc(t)}" data-id="activityChoice.${esc(t)}"><span style="width:16px">${I(B.activitySymbol(t))}</span><span class="grow">${esc(t)}</span>${last ? `<span class="sec">${B.fmt.time(last.startedAt)}</span><span class="sec t-cap">${I('chevron.right')}</span>` : ''}</button>`;
      }).join('')}</div></div>
      <div class="actionbar"><button class="btn pri" data-a="dismiss" data-id="activityChoices.done">Done</button></div></div>`;
  };
  A.pickActivity = (d) => { const p = App.topLayer().stack[0].p; st().ui.act = null; App.present('sheet', 'activityEditor', { title: d.t, day: p.day, quick: true }, { size: 'medium' }); };
  A.addCustomActivity = () => { st().ui.newAct = ''; App.present('sheet', 'newActivity', {}, { size: 'medium' }); };
  R.newActivity = () => `<div class="page">${C.journalBg()}${C.nav({ left: C.close('dismiss'), title: 'Add new activity' })}<div class="scroll" style="position:relative"><div class="col gap8" style="padding:20px">
      <div class="t-sub b">Activity Name</div><input class="field card" style="padding:16px" placeholder="Write down the activity here." data-bind="st.ui.newAct" value="${esc(st().ui.newAct || '')}"></div></div>
      <div class="actionbar"><button class="btn pri" data-a="saveCustomActivity">Add</button></div></div>`;
  A.saveCustomActivity = () => {
    const s = st(), t = (s.ui.newAct || '').trim(); if (!t) return;
    const same = (x) => x.localeCompare(t, undefined, { sensitivity: 'accent' }) === 0;
    s.prefs.hiddenActivities = s.prefs.hiddenActivities.filter((x) => !same(x));
    if (!B.ACTIVITY_GROUPS.some(([, list]) => list.includes(t)) && !s.prefs.customActivities.some(same)) s.prefs.customActivities.push(t);
    App.dismiss(true);
    const p = App.topLayer().stack[0].p, start = new Date(p.day || new Date()), now = new Date();
    start.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);                // JournalActivityDraft.defaultStart
    s.diary.push({ id: B.id('dia'), kind: 'activity', activityTitle: t, startedAt: start, endedAt: null, loggedAt: now, wasOngoing: false, signs: [], text: '', activity: '', isSpoken: false, recordingID: null, medicine: '', repeat: null });
    App.render();
  };
  function actDraft(p) {
    const s = st();
    if (!s.ui.act) {
      const e = p.entryId && s.diary.find((x) => x.id === p.entryId);
      const base = new Date(p.day || new Date()), now = new Date();
      const start = e ? new Date(e.startedAt) : (B.sameDay(base, now) ? now : (base.setHours(12, 0, 0, 0), base));
      s.ui.act = { repeat: e ? e.repeat || null : null, title: e ? e.activityTitle : p.title, start, end: e && e.endedAt ? new Date(e.endedAt) : null, note: e ? e.text : '', hasSymptoms: !!(e && e.signs.length), signs: e ? e.signs.slice() : [], expanded: !p.quick || !!(e && (e.endedAt || e.signs.length)) };
    }
    return s.ui.act;
  }
  R.activityEditor = (p) => {
    const a = actDraft(p), quick = p.quick && !a.expanded;
    let body;
    if (quick) body = `<div class="card col gap6" style="padding:16px"><div class="t-foot">What did you notice?</div><textarea class="field" rows="2" placeholder="Write down any notes you want to log." data-bind="st.ui.act.note" data-id="activity.note">${esc(a.note)}</textarea></div>
      <div class="card row" style="padding:16px"><span class="grow">Time</span>${C.timePill(a.start, 'setActStart')}</div>
      <button class="linkbtn t-sub" style="font-size:15px" data-a="actMore" data-id="activity.moreDetails">More details</button>`;
    else body = `<input class="field card" style="padding:16px" placeholder="Activity Name" value="${esc(a.title)}" data-bind="st.ui.act.title" data-id="activity.title">
      <div class="card col gap12" style="padding:16px"><div class="t-sub b">When</div><div class="row"><span class="grow">Start time</span>${C.timePill(a.start, 'setActStart')}</div>
      ${a.end ? `<div class="row"><span class="grow">End time</span>${C.timePill(a.end, 'setActEnd')}</div><button class="linkbtn t-sub" style="font-size:15px;justify-content:flex-start;min-height:30px" data-a="removeActEnd">Remove end time</button>`
        : `<button class="linkbtn t-sub" style="font-size:15px;justify-content:flex-start;min-height:30px" data-a="addActEnd">Add end time (optional)</button>`}</div>
      <div class="formcard"><button class="row gap8" style="width:100%;min-height:28px" data-a="openRepeat" data-id="activity.repeat"><span class="row gap8 grow">${I('repeat')}Repeat</span><span class="sec">${esc(App.repeatTitle(a.repeat))}</span><span class="sec t-cap">${I('chevron.up.chevron.down')}</span></button>
        ${a.repeat ? '<div class="t-cap sec">A draft will appear on each matching day. Review and save it to log what actually happened.</div>' : ''}</div>
      <div class="col gap8"><div class="t-sub b">Notes (optional)</div><textarea class="field card" style="padding:18px" rows="3" placeholder="Add a note about this activity" data-bind="st.ui.act.note" data-id="activity.note">${esc(a.note)}</textarea></div>
      <div class="card col gap16" style="padding:18px"><div class="row"><span class="grow">Any symptoms during this activity?</span>${C.toggle(a.hasSymptoms, 'toggleActSymptoms', 'data-id="activity.hasSymptoms"')}</div>
      ${a.hasSymptoms ? `<div class="sym-grid ${a.signs.length ? 'picked' : ''}">${B.LOGGING_CHOICES.map((k) => { const on = a.signs.includes(k); return `<button class="sym-tile ${on ? 'on' : ''}" data-a="toggleActSign" data-k="${k}"><span class="top">${I(B.SYMPTOMS[k].symbol)}${I(on ? 'checkmark.square.fill' : 'square')}</span><span class="t-sub" style="color:var(--label)">${B.SYMPTOMS[k].short}</span></button>`; }).join('')}</div>` : ''}</div>
`;
    if (p.entryId) body += `<button class="linkbtn" style="color:var(--red)" data-a="deleteActivity" data-id="${p.entryId}">Delete activity</button>`;
    const title = p.quick ? a.title : p.entryId ? 'Edit activity' : 'Add activity';
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.close('dismiss'), title })}<div class="scroll" style="position:relative"><div class="col gap14" style="padding:20px">${body}</div></div>
      <div class="actionbar"><button class="btn pri" data-a="saveActivity" data-id="activity.save">${p.quick && !p.entryId ? 'Log' : 'Save'}</button></div></div>`;
  };
  /* ActivityRepeatPicker: Never, the frequencies, Every 2 weeks, Custom… */
  App.repeatTitle = (r) => (!r ? 'Never' : r.interval === 2 ? 'Every 2 weeks' : { daily: 'Every day', weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' }[r.frequency]);
  A.openRepeat = () => {
    const set = (r) => () => { st().ui.act.repeat = r; App.render(); };
    App.dialog({ title: 'Repeat', buttons: [{ label: 'Never', run: set(null) }, { label: 'Every day', run: set({ frequency: 'daily' }) }, { label: 'Every week', run: set({ frequency: 'weekly' }) },
      { label: 'Every 2 weeks', run: set({ frequency: 'weekly', interval: 2 }) }, { label: 'Every month', run: set({ frequency: 'monthly' }) }, { label: 'Every year', run: set({ frequency: 'yearly' }) },
      { label: 'Custom…', run: () => App.alert({ title: 'Custom repeat', message: 'Choosing your own repeat pattern isn’t part of this demo.', buttons: [{ label: 'OK' }] }) }] });
  };
  A.actMore = () => { st().ui.act.expanded = true; const l = App.topLayer(); l.size = 'large'; App.render(); };
  A.setActStart = (d, el, h, m) => { const a = st().ui.act; a.start = new Date(a.start); a.start.setHours(h, m, 0, 0); if (a.end && a.end < a.start) a.end = new Date(a.start); App.render(); };
  A.setActEnd = (d, el, h, m) => { const a = st().ui.act; a.end = new Date(a.start); a.end.setHours(h, m, 0, 0); App.render(); };
  A.addActEnd = () => { const a = st().ui.act; a.end = new Date(a.start.getTime() + 30 * 60000); App.render(); };
  A.removeActEnd = () => { st().ui.act.end = null; App.render(); };
  A.toggleActSymptoms = () => { const a = st().ui.act; a.hasSymptoms = !a.hasSymptoms; App.render(); };
  A.toggleActSign = (d) => { const a = st().ui.act, i = a.signs.indexOf(d.k); if (i >= 0) a.signs.splice(i, 1); else a.signs.push(d.k); App.render(); };
  A.saveActivity = () => {
    const s = st(), a = s.ui.act, p = App.topLayer().stack[0].p;
    const title = (a.title || '').trim() || 'Activity';
    const existing = p.entryId && s.diary.find((x) => x.id === p.entryId);
    const data = { repeat: a.repeat || null, kind: 'activity', activityTitle: title, startedAt: new Date(a.start), endedAt: a.end ? new Date(a.end) : null, text: (a.note || '').trim(), signs: a.hasSymptoms ? a.signs.slice() : [] };
    if (existing) Object.assign(existing, data);
    else s.diary.push(Object.assign({ id: B.id('dia'), loggedAt: new Date(), wasOngoing: false, activity: '', isSpoken: false, recordingID: null, medicine: '' }, data));
    s.ui.act = null; App.dismiss(true);
    App.toast(`${title} logged`);
  };
  A.deleteActivity = (d) => App.dialog({ title: 'Delete this activity?', buttons: [{ label: 'Delete activity', destructive: true, run: () => { const s = st(); s.diary = s.diary.filter((e) => e.id !== d.id); s.ui.act = null; App.dismiss(true); } }] });
  A.editActivity = (d) => A.viewDiary(d);

  /* ---------- Say It Instead (JournalVoiceView with the app's sample voice note) ---------- */
  const SAMPLE = 'Medicine at 6:00 AM. Breakfast at 7:00 AM. Play from 7:30 AM to 8:00 AM.';
  function startListening() {
    const s = st();
    s.ui.voice = { phase: 'listening', shown: '', activities: [], transcript: '', showTranscript: true, startedAt: Date.now() };
    const words = SAMPLE.split(' ');
    let i = 0;
    const v = s.ui.voice;
    v.timer = App.every(() => {
      if (!st().ui.voice || st().ui.voice !== v || v.phase !== 'listening') { App.clearTimer(v.timer); return; }
      if (i < words.length) v.shown = words.slice(0, ++i).join(' ');
      App.render();
    }, 380);
  }
  R.voice = (p) => {
    const s = st(), v = s.ui.voice || { phase: 'listening', shown: '' }, name = s.child.first;
    let body = `<div class="col gap8" style="padding:12px 0"><div class="t-title3 bb">${v.phase === 'review' ? "Here's what Baymo heard" : `What did ${esc(name)} do today?`}</div>
      <div class="t-sub sec">${v.phase === 'review' ? 'Review the activities. Times and notes are optional. Tap to edit or swipe to remove.' : 'Tell us about meals, medicine, play and sleep. Include times when you can. Log symptoms separately in Symptoms.'}</div></div>`;
    let actions = '';
    if (v.phase === 'listening') {
      const el = Math.max(0, Math.floor((Date.now() - (v.startedAt || Date.now())) / 1000));
      body += `<div class="listen"><div class="t-body" style="min-height:190px" data-id="journal.voice.transcript">${esc(v.shown) || 'Listening…'}</div></div>
        <div class="col gap16" style="align-items:center;padding:8px 0"><span class="tint" style="font-size:44px;line-height:0">${I('waveform', 'ic44')}</span>
        <span class="sec" style="font-variant-numeric:tabular-nums">${Math.floor(el / 60)}:${String(el % 60).padStart(2, '0')}</span></div>
        <div class="demo-hint">${I('info.circle')}<span>Demo: plays Baymo's sample voice note. The microphone is not used.</span></div>`;
      actions = `<div class="col gap8" style="align-items:center"><button class="stopbtn" data-a="voiceStop" aria-label="Stop recording" data-id="journal.voice.stop">${I('stop.fill')}</button><div class="t-cap sec">Tap when you're done</div></div>`;
    } else {
      body += v.activities.map((a, i) => App.swipeRow(`<button class="jrow" data-a="voiceEdit" data-i="${i}">${App.journalRow({ kind: 'activity', activityTitle: a.title, startedAt: a.startedAt || new Date(), endedAt: a.endedAt })}</button>`, `data-a="voiceRemove" data-i="${i}"`, `v${a.id || i}${a.title}`)).join('');
      body += `<button class="card linkbtn" style="justify-content:flex-start;padding:0 16px;width:100%;font-size:17px" data-a="voiceAdd" data-id="journal.voice.addActivity">${I('plus.circle')}Add activity</button>
        <div class="card col gap8" style="padding:16px"><button class="row" style="width:100%" data-a="voiceTranscript"><span class="grow">What you said</span><span class="tint">${I(v.showTranscript ? 'chevron.down' : 'chevron.right')}</span></button>
        ${v.showTranscript ? `<div class="sec" data-id="journal.voice.reviewTranscript">${esc(v.transcript)}</div>` : ''}</div>
        <div class="t-cap sec">The full transcript will also be saved as a journal note.</div>`;
      actions = `<button class="linkbtn" style="width:100%" data-a="voiceAgain">Record Again</button><button class="btn pri" data-a="voiceSave" data-id="journal.voice.save">${v.activities.length ? `Add ${v.activities.length} activities` : 'Save journal note'}</button>`;
    }
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.close('voiceCancel'), title: 'Say It Instead' })}<div class="scroll" style="position:relative"><div class="col gap10" style="padding:0 20px 20px">${body}</div></div><div class="actionbar">${actions}</div></div>`;
  };
  A.voiceStop = () => {
    const s = st(), v = s.ui.voice, p = App.topLayer().stack[0].p;
    App.clearTimer(v.timer); v.phase = 'review'; v.transcript = SAMPLE; v.activities = B.parseJournal(SAMPLE, new Date(p.day || new Date())); App.render();
  };
  A.voiceAgain = () => startListening();
  A.voiceRemove = (d) => { st().ui.voice.activities.splice(+d.i, 1); App.render(); };
  A.voiceTranscript = () => { const v = st().ui.voice; v.showTranscript = !v.showTranscript; App.render(); };
  A.voiceEdit = (d) => { const a = st().ui.voice.activities[+d.i]; App.toast(`${a.title}${a.startedAt ? ` · ${B.fmt.time(a.startedAt)}` : ''}`); };
  A.voiceAdd = () => { st().ui.newAct = ''; App.present('sheet', 'voiceNewActivity', {}, { size: 'medium' }); };
  R.voiceNewActivity = () => `<div class="page">${C.journalBg()}${C.nav({ left: C.close('dismiss'), title: 'Add activity' })}<div class="scroll" style="position:relative"><div class="col gap8" style="padding:20px">
      <div class="t-sub b">Activity</div><input class="field card" style="padding:16px" placeholder="Activity Name" data-bind="st.ui.newAct" value="${esc(st().ui.newAct || '')}"></div></div>
      <div class="actionbar"><button class="btn pri" data-a="voiceAddSave">Save</button></div></div>`;
  A.voiceAddSave = () => { const s = st(), t = (s.ui.newAct || '').trim(); if (!t) return; s.ui.voice.activities.push({ id: B.id('draft'), title: t, startedAt: null, endedAt: null, note: '' }); App.dismiss(true); };
  A.voiceCancel = () => {
    const v = st().ui.voice;
    if (v && v.phase === 'review') App.dialog({ title: 'Discard this voice note?', cancel: 'Keep Editing', buttons: [{ label: 'Discard', destructive: true, run: () => { st().ui.voice = null; App.dismiss(true); } }] });
    else { if (v) App.clearTimer(v.timer); st().ui.voice = null; App.dismiss(true); }
  };
  A.voiceSave = () => {
    const s = st(), v = s.ui.voice, p = App.topLayer().stack[0].p, day = new Date(p.day || new Date()), now = new Date();
    const at = (d) => d || (B.sameDay(day, now) ? now : new Date(day.setHours(12, 0, 0, 0)));
    v.activities.forEach((a) => s.diary.push({ id: B.id('dia'), kind: 'activity', activityTitle: a.title, startedAt: at(a.startedAt), endedAt: a.endedAt, loggedAt: now, wasOngoing: false, signs: [], text: '', activity: '', isSpoken: true, recordingID: null, medicine: '' }));
    s.diary.push({ id: B.id('dia'), kind: 'journal', activityTitle: '', startedAt: now, endedAt: null, loggedAt: now, wasOngoing: false, signs: [], text: v.transcript, activity: '', isSpoken: true, recordingID: null, medicine: '' });
    const n = v.activities.length; s.ui.voice = null; App.dismiss(true); App.toast(n ? `${n} activities added` : 'Journal note saved');
  };

  /* ---------- Journal note editor (JournalNoteEditor) ---------- */
  R.journalNote = (p) => {
    const s = st(), e = p.entryId && s.diary.find((x) => x.id === p.entryId);
    if (!s.ui.jnote) s.ui.jnote = { text: e ? e.text : '', date: new Date(e ? e.startedAt : Math.min(+new Date(p.day || new Date()), Date.now())) };
    const j = s.ui.jnote;
    return `<div class="page">${C.journalBg()}${C.nav({ left: C.close('dismiss'), title: e ? 'Edit journal note' : 'Add to journal' })}
      <div class="scroll" style="position:relative"><div class="col gap20" style="padding:20px">
      <div class="col gap8"><div class="t-foot sec" style="padding-left:16px">JOURNAL NOTE</div><textarea class="field card" style="padding:16px" rows="5" placeholder="Write about the day" data-bind="st.ui.jnote.text" data-id="journal.note.text">${esc(j.text)}</textarea></div>
      <div class="card row" style="padding:12px 16px"><span class="grow">When</span><span class="sec">${B.fmt.abbrevDate(j.date)}</span>&nbsp;${C.timePill(j.date, 'setJournalNoteTime')}</div></div></div>
      <div class="actionbar"><button class="btn pri" data-a="saveJournalNote" data-id="journal.note.save">Save</button></div></div>`;
  };
  A.setJournalNoteTime = (d, el, h, m) => { const j = st().ui.jnote; j.date = new Date(j.date); j.date.setHours(h, m, 0, 0); App.render(); };
  A.saveJournalNote = () => {
    const s = st(), j = s.ui.jnote, p = App.topLayer().stack[0].p, e = p.entryId && s.diary.find((x) => x.id === p.entryId);
    if (e) Object.assign(e, { startedAt: new Date(j.date), text: (j.text || '').trim(), kind: 'journal' });
    else s.diary.push({ id: B.id('dia'), kind: 'journal', activityTitle: '', startedAt: new Date(j.date), endedAt: null, loggedAt: new Date(), wasOngoing: false, signs: [], text: (j.text || '').trim(), activity: '', isSpoken: false, recordingID: null, medicine: '' });
    s.ui.jnote = null; App.dismiss(true);
  };
})();
