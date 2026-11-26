/* RFC 5545 calendar (.ics) export for InterviewGearUp plans and tasks (Phase 21).
   Pure functions, local calendar timestamps (floating local time, no UTC day drift), and privacy-safe defaults. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  const SRS = IGU.srs;

  function pad2(n) {
    return String(Math.floor(n)).padStart(2, '0');
  }

  function validDayFallback(day) {
    if (SRS && SRS.validDay && SRS.validDay(day)) return day;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ''));
    return m ? day : '2026-01-01';
  }

  function shiftCalendarDay(day, delta) {
    const clean = validDayFallback(day);
    if (!delta) return clean;
    if (SRS && SRS.addDays) return SRS.addDays(clean, delta);
    const p = clean.split('-').map(Number);
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + delta));
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  /* Parses "HH:MM" (defaults 09:00) + offsetMinutes into local RFC 5545 YYYYMMDDTHHMMSS without Date timezone shifts. */
  function formatLocalDateTime(day, startTime, offsetMinutes) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(startTime || '').trim());
    const hh = m ? Math.min(23, Math.max(0, Number(m[1]))) : 9;
    const mm = m ? Math.min(59, Math.max(0, Number(m[2]))) : 0;
    const total = hh * 60 + mm + Math.max(0, Math.round(Number(offsetMinutes) || 0));
    const dayShift = Math.floor(total / 1440);
    const rem = total % 1440;
    const endDay = shiftCalendarDay(day, dayShift);
    return endDay.replace(/-/g, '') + 'T' + pad2(Math.floor(rem / 60)) + pad2(rem % 60) + '00';
  }

  function escapeText(text) {
    return String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  /* Folds lines to max 75 UTF-8 octets per RFC 5545 section 3.1. */
  function foldLine(line) {
    const str = String(line || '');
    const out = [];
    let cur = '';
    let bytes = 0;
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const chBytes = encoder ? encoder.encode(ch).length : (ch.charCodeAt(0) < 128 ? 1 : 3);
      if (bytes + chBytes > (out.length === 0 ? 75 : 74) && cur) {
        out.push(cur);
        cur = ' ' + ch;
        bytes = 1 + chBytes;
      } else {
        cur += ch;
        bytes += chBytes;
      }
    }
    if (cur) out.push(cur);
    return out.join('\r\n');
  }

  function slug(s) {
    return String(s || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'event';
  }

  function formatEvent(ev, opts) {
    opts = opts || {};
    const day = validDayFallback(ev.day);
    const duration = Math.min(240, Math.max(5, Math.round(Number(ev.durationMinutes) || 30)));
    const startTime = ev.startTime || opts.startTime || '09:00';
    const dtStart = formatLocalDateTime(day, startTime, ev.offsetMinutes || 0);
    const dtEnd = formatLocalDateTime(day, startTime, (ev.offsetMinutes || 0) + duration);
    const dtStamp = day.replace(/-/g, '') + 'T000000Z';
    const uid = 'igu-' + day.replace(/-/g, '') + '-' + slug(ev.id || ev.title) + '@interviewgearup.local';

    const descParts = [];
    if (ev.summary) descParts.push(String(ev.summary));
    if (ev.details) descParts.push(String(ev.details));
    if (opts.includeNotes && ev.note) descParts.push('Personal note: ' + String(ev.note));
    if (ev.url) descParts.push('Link: ' + String(ev.url));

    const lines = [
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + dtStamp,
      'DTSTART:' + dtStart,
      'DTEND:' + dtEnd,
      'SUMMARY:' + escapeText(ev.title || 'InterviewGearUp study block'),
      'DESCRIPTION:' + escapeText(descParts.join('\n\n') || 'Offline study session in InterviewGearUp.'),
      'CATEGORIES:InterviewGearUp,InterviewPrep',
      'END:VEVENT'
    ];
    return lines.map(foldLine).join('\r\n');
  }

  function buildIcs(events, opts) {
    const header = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//InterviewGearUp//Prep Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + escapeText((opts && opts.calName) || 'InterviewGearUp Study Plan')
    ];
    const body = (events || []).map(function (ev) { return formatEvent(ev, opts); });
    return header.concat(body, ['END:VCALENDAR']).join('\r\n') + '\r\n';
  }

  function buildDayEvents(dailyPlan, day, opts) {
    opts = opts || {};
    const tasks = (dailyPlan && dailyPlan.tasks) || [];
    if (!tasks.length) return [];
    const noteMap = opts.notes || {};
    const includeNotes = !!opts.includeNotes;

    if (opts.mode === 'tasks') {
      let offset = 0;
      return tasks.map(function (t, i) {
        const mins = Math.max(5, Math.round(Number(t.minutes) || 10));
        const ev = {
          id: (t.kind || 'task') + '-' + (t.id || i),
          day: day,
          startTime: opts.startTime || '',
          offsetMinutes: offset,
          durationMinutes: mins,
          title: 'IGU ' + (t.kind === 'review' ? 'Review: ' : '') + t.title,
          summary: t.why || '',
          note: includeNotes && noteMap[t.id] ? noteMap[t.id] : ''
        };
        offset += mins;
        return ev;
      });
    }

    const totalMins = Math.max(15, tasks.reduce(function (n, t) { return n + (Number(t.minutes) || 0); }, 0));
    const lines = tasks.map(function (t, i) {
      let line = (i + 1) + '. [' + t.kind + ', ' + t.minutes + 'm] ' + t.title;
      if (includeNotes && noteMap[t.id]) line += ' — Note: ' + noteMap[t.id];
      return line;
    });
    const label = (dailyPlan.phase && dailyPlan.phase.label) ? dailyPlan.phase.label : 'Daily study';
    return [{
      id: 'day-plan',
      day: day,
      startTime: opts.startTime || '',
      durationMinutes: totalMins,
      title: 'InterviewGearUp: ' + label + ' (' + tasks.length + (tasks.length === 1 ? ' task' : ' tasks') + ')',
      summary: (dailyPlan.phase && dailyPlan.phase.why) || '',
      details: lines.join('\n')
    }];
  }

  function buildWeekEvents(profile, bank, ctx, startDay, opts) {
    opts = opts || {};
    const daysCount = Math.min(14, Math.max(1, Math.round(Number(opts.days) || 7)));
    const simDone = Object.assign({}, (ctx && ctx.done) || {});
    const events = [];

    for (let i = 0; i < daysCount; i++) {
      const d = shiftCalendarDay(startDay, i);
      const dayPlan = IGU.planner ? IGU.planner.daily(profile, bank, Object.assign({}, ctx, { done: simDone }), d, {}) : { tasks: [] };
      buildDayEvents(dayPlan, d, opts).forEach(function (ev) { events.push(ev); });
      (dayPlan.tasks || []).forEach(function (t) {
        if (t.kind === 'new' && t.id) simDone[t.id] = 1;
      });
    }
    return events;
  }

  function exportTask(task, day, opts) {
    opts = opts || {};
    const includeNotes = !!opts.includeNotes;
    const noteMap = opts.notes || {};
    const ev = {
      id: (task.kind || 'task') + '-' + (task.id || 'item'),
      day: validDayFallback(day),
      durationMinutes: Math.max(5, Math.round(Number(task.minutes) || 10)),
      title: 'InterviewGearUp: ' + (task.kind === 'review' ? 'Review — ' : '') + task.title,
      summary: task.why || '',
      note: includeNotes && task.id && noteMap[task.id] ? noteMap[task.id] : ''
    };
    return buildIcs([ev], opts);
  }

  IGU.calendar = {
    escapeText: escapeText,
    foldLine: foldLine,
    formatLocalDateTime: formatLocalDateTime,
    formatEvent: formatEvent,
    buildIcs: buildIcs,
    buildDayEvents: buildDayEvents,
    buildWeekEvents: buildWeekEvents,
    exportTask: exportTask
  };
})();
