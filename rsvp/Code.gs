/**
 * Hannah & Lawrence: RSVP backend.
 *
 * A Google Apps Script web app bound to the private guest list sheet.
 * The website sends two kinds of request:
 *   { action: "find",   first, last }          -> finds a guest and their household
 *   { action: "submit", token, people, ... }    -> writes their replies into the sheet
 *
 * It also sends guests emails from your Google account:
 *   - a copy of their reply, whenever they reply with an email address
 *   - a gentle reminder in February to anyone who hasn't replied (see scheduleReminders)
 *
 * The guest list never leaves Google. Lookups return only the first names of the
 * guest's own household, and never return dietary or access answers or emails.
 * Setup steps are in rsvp/README.md.
 */

var CONFIG = {
  GUEST_TAB: 'Guest list',
  LOG_TAB: 'RSVP log',
  CLOSES: '2027-03-01T23:59:59Z',   // replies close at the end of 1 March 2027 (UK time)
  TOKEN_HOURS: 6,                    // how long a found invitation stays valid
  LOOKUPS_PER_MINUTE: 40,            // gentle limit on name lookups across the whole site

  // Emails
  SITE: 'https://hannahandlawrence.com',
  FROM_NAME: 'Hannah & Lawrence',
  FROM_ADDRESS: 'hello@hannahandlawrence.com',  // guests see and reply to this address
  SEND_CONFIRMATIONS: true,          // a copy of their reply, sent to the email they give
  REMINDERS_FROM: '2027-02-01T00:00:00Z',  // reminders never go out before this
  REMINDER_DATES: ['2027-02-08T10:00:00Z', '2027-02-24T10:00:00Z'],  // used by scheduleReminders()
  REMINDER_GAP_DAYS: 10              // never remind the same household twice within this many days
};

// Reply columns, added to the right of the guest list if they aren't there yet.
var REPLY_COLS = ['RSVP', 'Friday', 'Sunday', 'Dietary & access', 'Song request',
  'Plus-one name', 'Reply email', 'Message to us', 'Replied by', 'Replied at', 'Reminded at'];

var ACCEPT = 'Joyfully accepts', DECLINE = 'Regretfully declines';

/* ---------------- web app entry points ---------------- */

function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.action === 'find') out = handleFind(req);
    else if (req.action === 'submit') out = handleSubmit(req);
    else out = { ok: false, status: 'bad_request' };
  } catch (err) {
    out = { ok: false, status: 'error' };
    console.error(err && err.stack || err);
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, status: 'ready' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- find ---------------- */

function handleFind(req) {
  if (isClosed_()) return { ok: true, status: 'closed' };
  if (!allowLookup_()) return { ok: false, status: 'busy' };
  var sheet = guestSheet_();
  var table = readTable_(sheet);
  var matches = findMatches(table.rows, table.col, req.first, req.last);
  if (matches.length === 0) return { ok: true, status: 'not_found' };
  if (matches.length > 1) return { ok: true, status: 'ambiguous' };
  var me = matches[0];
  return buildFound(table, me, signToken_);
}

/** Pure: the reply for a found guest. Exposed for testing. */
function buildFound(table, me, sign) {
  var c = table.col;
  var household = String(me.cells[c['Household']] || '').trim();
  var members = [me];
  if (household) {
    table.rows.forEach(function (r) {
      if (r !== me && norm(r.cells[c['Household']]) === norm(household) && String(r.cells[c['First name']] || '').trim())
        members.push(r);
    });
  }
  var people = members.map(function (r) {
    var rsvp = String(r.cells[c['RSVP']] || '');
    return {
      id: r.row,
      first: String(r.cells[c['First name']]).trim(),
      plusOne: /^y/i.test(String(r.cells[c['Plus-one allowed?']] || '')),
      replied: !!rsvp,
      rsvp: rsvp === ACCEPT ? 'yes' : rsvp === DECLINE ? 'no' : '',
      friday: /^y/i.test(String(r.cells[c['Friday']] || '')),
      sunday: /^y/i.test(String(r.cells[c['Sunday']] || '')),
      song: String(r.cells[c['Song request']] || ''),
      plusOneName: String(r.cells[c['Plus-one name']] || ''),
      dietaryOnFile: !!String(r.cells[c['Dietary & access']] || '').trim()
    };
  });
  var keys = members.map(function (r) { return { row: r.row, key: personKey(r.cells, c) }; });
  var token = sign({ people: keys, by: me.row, exp: Date.now() + CONFIG.TOKEN_HOURS * 3600e3 });
  return { ok: true, status: 'found', token: token, you: me.row, people: people,
    replied: people.some(function (p) { return p.replied; }) };
}

/* ---------------- submit ---------------- */

function handleSubmit(req) {
  if (isClosed_()) return { ok: true, status: 'closed' };
  var claim = verifyToken_(req.token);
  if (!claim) return { ok: false, status: 'expired' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = guestSheet_();
    ensureReplyColumns_(sheet);
    var table = readTable_(sheet);
    var result = applySubmit(table, claim, req, new Date());
    if (!result.ok) return result;
    result.writes.forEach(function (w) {
      sheet.getRange(w.row, w.col + 1).setValue(w.value);
    });
    logReply_(result.log);
    notify_(result.log);
    var emailed = sendConfirmation_(result.confirm);
    return { ok: true, status: 'saved', coming: result.coming, emailed: emailed };
  } finally {
    lock.releaseLock();
  }
}

/** Pure: works out every cell to write. Exposed for testing. */
function applySubmit(table, claim, req, now) {
  var c = table.col;
  var byRow = {};
  table.rows.forEach(function (r) { byRow[r.row] = r; });
  // Re-check that each row in the token still holds the same person (rows can move).
  var allowed = {};
  for (var i = 0; i < claim.people.length; i++) {
    var p = claim.people[i], r = byRow[p.row];
    if (!r || personKey(r.cells, c) !== p.key) return { ok: false, status: 'changed' };
    allowed[p.row] = r;
  }
  var replier = allowed[claim.by];
  var people = (req.people || []).filter(function (p) { return allowed[p.id]; });
  if (!people.length) return { ok: false, status: 'bad_request' };
  var writes = [], stamp = Utilities_formatDate(now), coming = false, summary = [];
  function put(r, name, value) { writes.push({ row: r.row, col: c[name], value: value }); }
  people.forEach(function (p) {
    var r = allowed[p.id];
    var yes = p.rsvp === 'yes';
    if (p.rsvp !== 'yes' && p.rsvp !== 'no') return;
    coming = coming || yes;
    put(r, 'RSVP', yes ? ACCEPT : DECLINE);
    put(r, 'Friday', yes && p.friday ? 'Yes' : '');
    put(r, 'Sunday', yes && p.sunday ? 'Yes' : '');
    put(r, 'Song request', yes ? clip(p.song, 200) : '');
    if (r.cells[c['Plus-one allowed?']] && /^y/i.test(String(r.cells[c['Plus-one allowed?']])))
      put(r, 'Plus-one name', yes ? clip(p.plusOneName, 120) : '');
    var diet = clip(p.dietary, 500);
    if (diet) {
      // Write-only: add to what's there, never shown back to the guest.
      var prev = String(r.cells[c['Dietary & access']] || '').trim();
      put(r, 'Dietary & access', prev ? prev + ' | ' + stamp + ': ' + diet : diet);
    }
    put(r, 'Replied by', String(replier.cells[c['First name']]).trim());
    put(r, 'Replied at', stamp);
    summary.push(String(r.cells[c['First name']]).trim() + ' ' + String(r.cells[c['Surname']]).trim() +
      ': ' + (yes ? 'yes' : 'no') + (yes && p.friday ? ', Fri' : '') + (yes && p.sunday ? ', Sun' : ''));
  });
  var email = clip(req.email, 200);
  if (email && /.+@.+\..+/.test(email)) {
    people.forEach(function (p) { put(allowed[p.id], 'Reply email', email); });
  } else {
    email = storedEmail_(replier, c);
  }
  var msg = clip(req.message, 1000);
  if (msg) put(replier, 'Message to us', msg);
  var answered = people.filter(function (p) { return p.rsvp === 'yes' || p.rsvp === 'no'; });
  var confirm = email ? {
    to: email,
    coming: coming,
    people: answered.map(function (p) {
      return { first: String(allowed[p.id].cells[c['First name']]).trim(), yes: p.rsvp === 'yes',
        friday: p.rsvp === 'yes' && !!p.friday, sunday: p.rsvp === 'yes' && !!p.sunday,
        plusOne: p.rsvp === 'yes' ? clip(p.plusOneName, 120) : '' };
    })
  } : null;
  return { ok: true, writes: writes, coming: coming, confirm: confirm,
    log: { at: stamp, household: String(replier.cells[c['Household']] || '').trim(),
      by: String(replier.cells[c['First name']]).trim() + ' ' + String(replier.cells[c['Surname']]).trim(),
      summary: summary.join('; '), message: msg ? 'Yes' : '' } };
}

/* ---------------- emails ---------------- */

/** The address we already hold for a guest: their last reply email, else the one on the list. */
function storedEmail_(r, c) {
  var list = [c['Reply email'], c['Email (optional)'], c['Email']];
  for (var i = 0; i < list.length; i++) {
    if (list[i] == null) continue;
    var v = String(r.cells[list[i]] || '').trim();
    if (/.+@.+\..+/.test(v)) return v;
  }
  return '';
}

/** "Lee", "Lee and Jenny", "Ann, Bob and Cat" */
function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Pure: subject, plain text and HTML for a reply confirmation. Exposed for testing. */
function confirmationEmail(info) {
  var names = joinNames(info.people.map(function (p) { return p.first; }));
  var replyUrl = CONFIG.SITE + '/#rsvp';
  var lines = info.people.map(function (p) {
    if (!p.yes) return p.first + ': regretfully declines';
    var extra = [];
    if (p.friday) extra.push('Friday drinks');
    if (p.sunday) extra.push('Sunday');
    return p.first + ': joyfully accepts' + (extra.length ? ', plus ' + joinNames(extra) : '') +
      (p.plusOne ? ', with ' + p.plusOne : '');
  });
  var intro, outro, subject;
  if (info.coming) {
    subject = 'See you at Markree';
    intro = ['Thank you for replying. We’re so happy you’ll be with us at Markree Castle on Saturday 18 September 2027.'];
    outro = ['Guests arrive from 2pm, and it’s black tie. Over the coming months we’ll add more to the website about the weekend, from travel to where to stay.'];
  } else {
    subject = 'Thank you for letting us know';
    intro = ['Thank you for replying. We’ll miss you, and we’ll raise a glass to you at Markree.'];
    outro = [];
  }
  var change = 'If anything changes, you can update your reply until 1 March 2027 at ' + replyUrl + ' (the password is on your invitation).';

  var text = ['Dear ' + names + ',', ''].concat(intro, ['', 'Here’s what we have:'], lines.map(function (l) { return '  ' + l; }),
    [''], outro, outro.length ? [''] : [], [change, '', 'With love,', 'Hannah & Lawrence']).join('\n');

  var html = emailShell_(
    '<p>Dear ' + esc_(names) + ',</p>' +
    intro.map(function (t) { return '<p>' + esc_(t) + '</p>'; }).join('') +
    '<p style="margin:24px 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#B8925A">Here’s what we have</p>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">' +
    lines.map(function (l) { return '<tr><td style="padding:8px 0;border-top:1px solid #E6DFCF">' + esc_(l) + '</td></tr>'; }).join('') +
    '</table>' +
    outro.map(function (t) { return '<p style="margin-top:24px">' + esc_(t) + '</p>'; }).join('') +
    '<p style="margin-top:24px">If anything changes, you can <a href="' + replyUrl + '" style="color:#1E3829">update your reply</a> until 1 March 2027. The password is on your invitation.</p>');
  return { subject: subject, text: text, html: html };
}

/** Pure: a reminder for a household that hasn't replied. Exposed for testing. */
function reminderEmail(firstNames) {
  var names = joinNames(firstNames);
  var replyUrl = CONFIG.SITE + '/#rsvp';
  var subject = 'A gentle reminder: replies by 1 March';
  var body = 'We’d love to know whether you can join us at Markree Castle on Saturday 18 September 2027. ' +
    'Replies close on 1 March, and it only takes a minute.';
  var text = ['Dear ' + names + ',', '', body, '', 'Reply here: ' + replyUrl + ' (the password is on your invitation).', '',
    'If you’ve already let us know another way, thank you, and please ignore this.', '', 'With love,', 'Hannah & Lawrence'].join('\n');
  var html = emailShell_(
    '<p>Dear ' + esc_(names) + ',</p><p>' + esc_(body) + '</p>' +
    '<p style="margin:28px 0"><a href="' + replyUrl + '" style="display:inline-block;padding:12px 28px;background:#1E3829;color:#FBF8F1;text-decoration:none;letter-spacing:.08em">Reply now</a></p>' +
    '<p>The password is on your invitation. If you’ve already let us know another way, thank you, and please ignore this.</p>');
  return { subject: subject, text: text, html: html };
}

function emailShell_(inner) {
  return '<div style="background:#FBF8F1;padding:32px 16px">' +
    '<div style="max-width:520px;margin:0 auto;font-family:Georgia,\'Times New Roman\',serif;font-size:17px;line-height:1.6;color:#1E3829">' +
    '<p style="text-align:center;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#B8925A;margin:0 0 28px">Hannah &amp; Lawrence · 18 September 2027</p>' +
    inner +
    '<p style="margin-top:28px">With love,<br>Hannah &amp; Lawrence</p>' +
    '<p style="margin-top:36px;text-align:center;font-size:13px;color:#6B7A70"><a href="' + CONFIG.SITE + '" style="color:#6B7A70">hannahandlawrence.com</a></p>' +
    '</div></div>';
}

/**
 * Sends from hello@ when this Google account has it set up under Gmail's "Send mail as".
 * Otherwise it sends from the account itself, with replies still going to hello@.
 */
function send_(to, mail) {
  var from = CONFIG.FROM_ADDRESS;
  var aliases = [];
  try { aliases = GmailApp.getAliases(); } catch (e) { /* no Gmail access: fall back below */ }
  if (from && aliases.indexOf(from) >= 0) {
    GmailApp.sendEmail(to, mail.subject, mail.text, { from: from, name: CONFIG.FROM_NAME, htmlBody: mail.html });
    return;
  }
  var opts = { to: to, subject: mail.subject, body: mail.text, htmlBody: mail.html, name: CONFIG.FROM_NAME };
  if (from) opts.replyTo = from;
  MailApp.sendEmail(opts);
}

function sendConfirmation_(info) {
  if (!CONFIG.SEND_CONFIRMATIONS || !info || !info.people.length) return false;
  try { send_(info.to, confirmationEmail(info)); return true; }
  catch (e) { console.error(e); return false; }
}

/** Pure: who would get a reminder now. One email per address, greeting everyone in the household. */
function reminderList(table, now) {
  var c = table.col, groups = {}, order = [];
  table.rows.forEach(function (r) {
    if (!String(r.cells[c['First name']] || '').trim()) return;
    var key = norm(r.cells[c['Household']]) || ('row' + r.row);
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(r);
  });
  var out = [], seen = {};
  order.forEach(function (key) {
    var rows = groups[key];
    if (rows.some(function (r) { return String(r.cells[c['RSVP']] || '').trim(); })) return;   // someone has replied
    var recent = rows.some(function (r) {
      var v = c['Reminded at'] != null ? r.cells[c['Reminded at']] : '';
      var t = v instanceof Date ? v.getTime() : Date.parse(v);
      return t && now.getTime() - t < CONFIG.REMINDER_GAP_DAYS * 864e5;
    });
    if (recent) return;
    var to = '';
    rows.some(function (r) { to = storedEmail_(r, c); return !!to; });
    if (!to || seen[to.toLowerCase()]) return;
    seen[to.toLowerCase()] = true;
    out.push({ to: to, rows: rows.map(function (r) { return r.row; }),
      names: rows.map(function (r) { return String(r.cells[c['First name']]).trim(); }) });
  });
  return out;
}

/** Sends reminders to everyone who hasn't replied. Normally run by scheduleReminders(). */
function sendReminders() {
  var now = new Date();
  if (isClosed_() || now < new Date(CONFIG.REMINDERS_FROM)) { console.log('Not reminder time yet, so nothing was sent.'); return; }
  var sheet = guestSheet_();
  ensureReplyColumns_(sheet);
  var table = readTable_(sheet), list = reminderList(table, now), sent = 0;
  var col = table.col['Reminded at'] + 1;
  list.forEach(function (g) {
    try {
      send_(g.to, reminderEmail(g.names));
      g.rows.forEach(function (row) { sheet.getRange(row, col).setValue(now); });
      sent++;
    } catch (e) { console.error('Could not email ' + g.names.join(', ') + ': ' + e); }
  });
  console.log('Sent ' + sent + ' reminder' + (sent === 1 ? '' : 's') + '.');
}

/** Lists who would get a reminder if it went out now, without sending anything. */
function previewReminders() {
  var table = readTable_(guestSheet_());
  var list = reminderList(table, new Date());
  console.log(list.length + ' households would get a reminder:\n' +
    list.map(function (g) { return joinNames(g.names); }).join('\n'));
  var noEmail = 0, c = table.col;
  table.rows.forEach(function (r) {
    if (String(r.cells[c['First name']] || '').trim() && !String(r.cells[c['RSVP']] || '').trim() && !storedEmail_(r, c)) noEmail++;
  });
  console.log(noEmail + ' guests who haven’t replied have no email address in the sheet.');
}

/** Run once: sets reminders to go out automatically on CONFIG.REMINDER_DATES. */
function scheduleReminders() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendReminders') ScriptApp.deleteTrigger(t);
  });
  CONFIG.REMINDER_DATES.forEach(function (d) {
    ScriptApp.newTrigger('sendReminders').timeBased().at(new Date(d)).create();
  });
  console.log('Reminders scheduled for ' + CONFIG.REMINDER_DATES.join(' and ') + '.');
}

/** Sends you one of each email, so you can see exactly what guests will get. */
function sendSampleEmails() {
  var me = Session.getEffectiveUser().getEmail();
  send_(me, confirmationEmail({ coming: true, people: [
    { first: 'Alex', yes: true, friday: true, sunday: true, plusOne: '' },
    { first: 'Sam', yes: true, friday: false, sunday: true, plusOne: '' }] }));
  send_(me, confirmationEmail({ coming: false, people: [{ first: 'Alex', yes: false }] }));
  send_(me, reminderEmail(['Alex', 'Sam']));
  console.log('Three sample emails sent to ' + me + '.');
}

/* ---------------- matching ---------------- */

/** Lower-case, strip accents, apostrophes, hyphens and extra spaces. */
function norm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[’'`.\-]/g, '').replace(/\s+/g, ' ').trim();
}

function lev(a, b) {
  if (a === b) return 0;
  var m = a.length, n = b.length, d = [], i, j;
  for (i = 0; i <= m; i++) { d[i] = [i]; }
  for (j = 0; j <= n; j++) { d[0][j] = j; }
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    // swapped neighbouring letters count as one slip ("Exampel" for "Example")
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}

function close(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 5 && lev(a, b) <= 1;
}

/**
 * Pure: rows whose surname matches and whose first name (or an "also known as")
 * matches. Exact matches win over near ones, so "Dan" never pulls in "Dana".
 */
function findMatches(rows, c, first, last) {
  var f = norm(first), l = norm(last);
  if (!f || !l) return [];
  function names(r) {
    var list = [norm(r.cells[c['First name']])];
    String(r.cells[c['Also known as']] || '').split(',').forEach(function (a) { if (norm(a)) list.push(norm(a)); });
    return list;
  }
  var withSurname = rows.filter(function (r) { return norm(r.cells[c['Surname']]); });
  var exact = withSurname.filter(function (r) {
    return norm(r.cells[c['Surname']]) === l && names(r).indexOf(f) >= 0;
  });
  if (exact.length) return exact;
  return withSurname.filter(function (r) {
    return close(norm(r.cells[c['Surname']]), l) && names(r).some(function (n) { return close(n, f); });
  });
}

function personKey(cells, c) {
  return norm(cells[c['First name']]) + '|' + norm(cells[c['Surname']]);
}

function clip(s, n) { return String(s == null ? '' : s).trim().slice(0, n); }

/* ---------------- sheet helpers ---------------- */

function guestSheet_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.GUEST_TAB);
  if (!sheet) throw new Error('No tab called ' + CONFIG.GUEST_TAB);
  return sheet;
}

function readTable_(sheet) {
  var values = sheet.getDataRange().getValues();
  var header = values[0].map(function (h) { return String(h).trim(); });
  var col = {};
  header.forEach(function (h, i) { if (h && !(h in col)) col[h] = i; });
  ['First name', 'Surname', 'Household'].forEach(function (h) {
    if (!(h in col)) throw new Error('Missing column: ' + h);
  });
  var rows = [];
  for (var i = 1; i < values.length; i++) rows.push({ row: i + 1, cells: values[i] });
  return { col: col, rows: rows };
}

function ensureReplyColumns_(sheet) {
  var lastCol = sheet.getLastColumn();
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  var missing = REPLY_COLS.filter(function (h) { return header.indexOf(h) < 0; });
  if (!missing.length) return;
  sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing])
    .setFontWeight('bold').setBackground('#1E3829').setFontColor('#FFFFFF');
}

function logReply_(log) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(CONFIG.LOG_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.LOG_TAB);
    sheet.appendRow(['Replied at', 'Household', 'Replied by', 'Replies', 'Message?']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#1E3829').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([log.at, log.household, log.by, log.summary, log.message]);
}

/** Optional: set a Script Property NOTIFY_EMAIL to get an email for every reply. */
function notify_(log) {
  var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (!to) return;
  try {
    MailApp.sendEmail(to, 'New RSVP: ' + log.by, log.summary + (log.message ? '\n\nThey left you a message: see the sheet.' : ''));
  } catch (e) { console.error(e); }
}

function isClosed_() { return Date.now() > Date.parse(CONFIG.CLOSES); }

function allowLookup_() {
  var cache = CacheService.getScriptCache();
  var key = 'lk' + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n <= CONFIG.LOOKUPS_PER_MINUTE;
}

function Utilities_formatDate(d) {
  return Utilities.formatDate(d, 'Europe/London', 'd MMM yyyy, HH:mm');
}

/* ---------------- signed tokens ---------------- */

function secret_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('TOKEN_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('TOKEN_SECRET', s); }
  return s;
}

function b64_(bytes) { return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ''); }

function signToken_(claim) {
  var body = b64_(Utilities.newBlob(JSON.stringify(claim)).getBytes());
  var sig = b64_(Utilities.computeHmacSha256Signature(body, secret_()));
  return body + '.' + sig;
}

function verifyToken_(token) {
  if (!token || String(token).indexOf('.') < 0) return null;
  var parts = String(token).split('.');
  var sig = b64_(Utilities.computeHmacSha256Signature(parts[0], secret_()));
  if (sig !== parts[1]) return null;
  var claim = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  if (!claim.exp || claim.exp < Date.now()) return null;
  return claim;
}

/** Run once from the editor to add the reply columns and check everything is wired up. */
function setup() {
  ensureReplyColumns_(guestSheet_());
  secret_();
  console.log('Ready. Reply columns are in place.');
}
