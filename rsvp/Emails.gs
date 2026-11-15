/**
 * Hannah & Lawrence: the emails guests receive.
 * Style: "Engraved card". Ivory, bottle green and antique gold, centred like a letterpress card.
 *
 * Kept in its own file so the wording and design can change without touching Code.gs.
 * Images are served from the website: hannahandlawrence.com/email/
 */

var EMAIL = {
  IVORY: '#FBF8F1',
  GREEN: '#1E3829',
  GOLD: '#B8925A',
  MUTED: '#5E6F63',
  RULE: '#E6DFCF',
  SERIF: "Georgia,'Times New Roman',serif",
  IMAGES: 'https://hannahandlawrence.com/email/'
};

/** Pure: subject, plain text and HTML for a reply confirmation. */
function confirmationEmail(info) {
  var names = joinNames(info.people.map(function (p) { return p.first; }));
  var replyUrl = CONFIG.SITE + '/#rsvp';
  var rows = info.people.map(function (p) {
    var extra = [];
    if (p.yes && p.friday) extra.push('Friday drinks');
    if (p.yes && p.sunday) extra.push('Sunday');
    return { name: p.first, status: p.yes ? 'Joyfully accepts' : 'Regretfully declines',
      extra: extra.length ? joinNames(extra) + ' too' : '' };
  });

  var subject, title, opening, preheader, body;
  if (info.coming) {
    subject = 'See you at Markree';
    title = 'See you at Markree';
    opening = 'thank you for replying, we can’t wait to celebrate with you.';
    preheader = names + ', we can’t wait to celebrate with you.';
    body = 'Guests arrive from 2pm, and it’s black tie. More about the weekend will follow on our website.';
  } else {
    subject = 'Thank you for letting us know';
    title = 'We’ll miss you';
    opening = 'thank you for letting us know. We’ll raise a glass to you at Markree.';
    preheader = 'Thank you for letting us know, ' + names + '.';
    body = '';
  }

  var text = [
    'Dear ' + names + ',',
    opening.charAt(0).toUpperCase() + opening.slice(1),
    '',
    'Here’s what we have:'
  ].concat(rows.map(function (r) { return '  ' + r.name + ': ' + r.status.toLowerCase() + (r.extra ? ', plus ' + r.extra.replace(/ too$/, '') : ''); }),
    [''], body ? [body, ''] : [],
    ['With love,', 'Hannah & Lawrence', '',
     'Plans change? You can update your reply until 1 March 2027 at ' + replyUrl + ' (the password is on your invitation).']).join('\n');

  var e = EMAIL;
  var rowHtml = rows.map(function (r) {
    return '<tr><td align="center" style="padding:14px 0;border-top:1px solid ' + e.RULE + ';font-family:' + e.SERIF + ';color:' + e.GREEN + '">' +
      '<span style="font-size:22px;line-height:1.3">' + esc_(r.name) + '</span><br>' +
      '<span style="font-size:15px;line-height:1.5;font-style:italic;color:' + e.MUTED + '">' + r.status + (r.extra ? ' &middot; ' + r.extra : '') + '</span>' +
      '</td></tr>';
  }).join('');

  var inner =
    titleBlock_(title, 'Saturday 18 September 2027') +
    para_('Dear ' + esc_(names) + ',<br>' + esc_(opening), 17, '0 6px') +
    '<tr><td align="center" style="padding:30px 0 12px;font-family:' + e.SERIF + ';font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:' + e.GOLD + '">Here’s what we have</td></tr>' +
    '<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rowHtml +
      '<tr><td style="border-top:1px solid ' + e.RULE + ';font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>' +
    (body ? para_(esc_(body).replace('our website', '<a href="' + CONFIG.SITE + '" style="color:' + e.GREEN + '">our website</a>'), 16, '26px 6px 0') : '') +
    signOff_() +
    fionn_('22px 0 0');

  var footer = 'Plans change? <a href="' + replyUrl + '" style="color:' + e.GREEN + '">Update your reply</a> until 1 March 2027.<br>The password is on your invitation.';
  return { subject: subject, text: text, html: emailShell_(inner, preheader, footer) };
}

/** Pure: a reminder for a household that hasn't replied. */
function reminderEmail(firstNames) {
  var names = joinNames(firstNames);
  var replyUrl = CONFIG.SITE + '/#rsvp';
  var e = EMAIL;
  var subject = 'A gentle reminder: replies by 1 March';
  var preheader = 'We’d love to know whether you can join us at Markree.';
  var opening = 'we’d love to know whether you can join us at Markree Castle. Replies close on 1 March, and it only takes a minute.';

  var text = ['Dear ' + names + ',', opening.charAt(0).toUpperCase() + opening.slice(1), '',
    'Reply here: ' + replyUrl + ' (the password is on your invitation).', '',
    'With love,', 'Hannah & Lawrence', '',
    'If you’ve already let us know another way, thank you, and please ignore this.'].join('\n');

  var button =
    '<tr><td align="center" style="padding:30px 0 0">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td align="center" bgcolor="' + e.GREEN + '" style="background:' + e.GREEN + ';border-radius:2px">' +
        '<a href="' + replyUrl + '" style="display:inline-block;padding:15px 40px;font-family:' + e.SERIF + ';font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:' + e.IVORY + ';text-decoration:none">Reply now</a>' +
      '</td></tr></table>' +
    '</td></tr>' +
    para_('The password is on your invitation.', 14, '12px 6px 0', e.MUTED, true);

  var inner =
    titleBlock_('Will you join us?', 'Saturday 18 September 2027') +
    para_('Dear ' + esc_(names) + ',<br>' + esc_(opening), 17, '0 6px') +
    button +
    fionn_('20px 0 0') +
    signOff_('14px 0 0');

  var footer = 'Already let us know another way? Thank you, and please ignore this.';
  return { subject: subject, text: text, html: emailShell_(inner, preheader, footer) };
}

/* ---------------- building blocks ---------------- */

function titleBlock_(title, date) {
  var e = EMAIL;
  return '<tr><td align="center" style="padding:18px 0 6px"><img src="' + e.IMAGES + 'knot.png" width="160" height="28" alt="" style="display:block;border:0;outline:none;width:160px;height:auto"></td></tr>' +
    '<tr><td align="center" style="padding:14px 0 0;font-family:' + e.SERIF + ';font-size:30px;line-height:1.2;font-weight:normal;color:' + e.GREEN + '">' + esc_(title) + '</td></tr>' +
    '<tr><td align="center" style="padding:6px 0 28px;font-family:' + e.SERIF + ';font-size:16px;font-style:italic;color:' + e.MUTED + '">' + esc_(date) + '</td></tr>';
}

function para_(html, size, padding, color, italic) {
  var e = EMAIL;
  return '<tr><td align="center" style="padding:' + padding + ';font-family:' + e.SERIF + ';font-size:' + size + 'px;line-height:1.65;color:' + (color || e.GREEN) +
    (italic ? ';font-style:italic' : '') + '">' + html + '</td></tr>';
}

function signOff_(padding) {
  var e = EMAIL;
  return '<tr><td align="center" style="padding:' + (padding || '30px 0 0') + ';font-family:' + e.SERIF + ';font-size:17px;line-height:1.5;color:' + e.GREEN + '">' +
    'With love,<br><span style="font-size:22px">Hannah &amp; Lawrence</span></td></tr>';
}

function fionn_(padding) {
  var e = EMAIL;
  return '<tr><td align="center" style="padding:' + padding + '"><img src="' + e.IMAGES + 'fionn.png" width="96" height="82" alt="Fionn, Markree’s wolfhound" ' +
    'style="display:block;border:0;outline:none;width:96px;height:auto;font-family:' + e.SERIF + ';font-size:12px;font-style:italic;color:' + e.MUTED + '"></td></tr>';
}

/** The card every email sits in. */
function emailShell_(inner, preheader, footer) {
  var e = EMAIL;
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
    '<style>:root{color-scheme:light only}body{margin:0;padding:0}a{color:' + e.GREEN + '}' +
    '@media (max-width:480px){.card-pad{padding:32px 16px !important}}</style></head>' +
    '<body style="margin:0;padding:0;background:' + e.IVORY + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' + e.IVORY + '">' + esc_(preheader || '') + '&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + e.IVORY + '" style="background:' + e.IVORY + '"><tr>' +
    '<td align="center" class="card-pad" style="padding:44px 20px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">' +
      '<tr><td align="center" style="font-family:' + e.SERIF + ';font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:' + e.GOLD + '">Hannah &amp; Lawrence</td></tr>' +
      inner +
      '<tr><td style="padding:26px 0 0;border-bottom:1px solid ' + e.GOLD + ';font-size:0;line-height:0">&nbsp;</td></tr>' +
      '<tr><td align="center" style="padding:18px 6px 0;font-family:' + e.SERIF + ';font-size:13px;line-height:1.6;color:' + e.MUTED + '">' + footer + '</td></tr>' +
      '<tr><td align="center" style="padding:14px 0 0;font-family:' + e.SERIF + ';font-size:12px;letter-spacing:.08em;color:' + e.MUTED + '"><a href="' + CONFIG.SITE + '" style="color:' + e.MUTED + ';text-decoration:none">hannahandlawrence.com</a></td></tr>' +
      '</table>' +
    '</td></tr></table></body></html>';
}
