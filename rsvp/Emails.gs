/**
 * Hannah & Lawrence: the emails guests receive.
 * Style: "Engraved card". Ivory, bottle green and antique gold, centred like a letterpress card.
 *
 * Kept in its own file so the wording and design can change without touching Code.gs.
 * Links use CONFIG.SITE (hannahandlawrence.wedding). Images load from hannahandlawrence.wedding/email/.
 */

var EMAIL = {
  IVORY: '#FBF8F1',
  SURROUND: '#1E3829',   // bottle green, like the back of the invitation
  ON_GREEN: '#C9D2C3',
  GREEN: '#1E3829',
  GOLD: '#B8925A',
  MUTED: '#5E6F63',
  RULE: '#E6DFCF',
  SERIF: "Georgia,'Times New Roman',serif",
  IMAGES: 'https://hannahandlawrence.wedding/email/',
  IMAGES_BACKUP: 'https://raw.githubusercontent.com/TrainTango/wedding-website/main/email/',  // used if the website can't be reached
  FLOWERS: 'crest'   // 'crest': the posy sits at the top in place of the knot. 'corner': the posy is tucked into the top-right corner.
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
    opening = 'Thank you for replying, we can’t wait to celebrate with you.';
    preheader = names + ', we can’t wait to celebrate with you.';
    body = 'Guests arrive from 2pm, and it’s black tie. More about the weekend will follow on our website.';
  } else {
    subject = 'Thank you for letting us know';
    title = 'We’ll miss you';
    opening = 'Thank you for letting us know. We’ll miss you, and we’ll raise a glass to you at Markree.';
    preheader = 'Thank you for letting us know, ' + names + '.';
    body = '';
  }

  var text = [
    'Dear ' + names + ',',
    '',
    opening,
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
      '<span style="font-size:15px;line-height:1.5;font-style:italic;color:' + e.MUTED + '">' + r.status + (r.extra ? '<br>' + r.extra : '') + '</span>' +
      '</td></tr>';
  }).join('');

  // A lone "regretfully declines" would only repeat the sentence above it.
  var showList = info.coming || rows.length > 1;
  var inner =
    titleBlock_(title) +
    para_('Dear ' + esc_(names) + ',', 18, '0 6px') +
    para_(esc_(opening), 17, '10px 6px 0') +
    (showList ? '<tr><td align="center" style="padding:30px 0 12px;font-family:' + e.SERIF + ';font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:' + e.GOLD + '">Here’s what we have</td></tr>' +
    '<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rowHtml +
      '<tr><td style="border-top:1px solid ' + e.RULE + ';font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>' : '') +
    (body ? para_(esc_(body).replace('our website', '<a href="' + CONFIG.SITE + '" style="color:' + e.GREEN + '">our website</a>'), 16, '26px 6px 0') : '') +
    signOff_();

  var footer = 'Plans change? <a href="' + replyUrl + '" style="color:' + e.GREEN + '">Update your reply</a> until 1&nbsp;March&nbsp;2027.<br>The password is on your invitation.';
  return { subject: subject, text: text, html: emailShell_(inner, preheader, footer) };
}

/** Pure: a reminder for a household that hasn't replied. */
function reminderEmail(firstNames) {
  var names = joinNames(firstNames);
  var replyUrl = CONFIG.SITE + '/#rsvp';
  var e = EMAIL;
  var subject = 'A gentle reminder: replies by 1 March';
  var preheader = 'We’d love to know whether you can join us at Markree.';
  var opening = 'We’d love to know whether you can join us at Markree Castle. Replies close on 1 March, and it only takes a minute.';

  var text = ['Dear ' + names + ',', '', opening, '',
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
    titleBlock_('Will you join us?') +
    para_('Dear ' + esc_(names) + ',', 18, '0 6px') +
    para_(esc_(opening), 17, '10px 6px 0') +
    button +
    signOff_('30px 0 0');

  var footer = 'Already let us know another way? Thank you, and please ignore this.';
  return { subject: subject, text: text, html: emailShell_(inner, preheader, footer) };
}

/* ---------------- building blocks ---------------- */

function titleBlock_(title) {
  var e = EMAIL;
  var emblem = e.FLOWERS === 'crest'
    ? '<tr><td align="center" style="padding:14px 0 0"><img src="' + e.IMAGES + 'posy.png" width="84" height="84" alt="" style="display:block;border:0;outline:none;width:84px;height:auto"></td></tr>'
    : '<tr><td align="center" style="padding:18px 0 6px"><img src="' + e.IMAGES + 'knot.png" width="160" height="28" alt="" style="display:block;border:0;outline:none;width:160px;height:auto"></td></tr>';
  return emblem +
    '<tr><td align="center" style="padding:14px 0 0;font-family:' + e.SERIF + ';font-size:28px;line-height:1.2;font-weight:normal;color:' + e.GREEN + '">' + esc_(title) + '</td></tr>' +
    '<tr><td align="center" style="padding:8px 0 30px;font-family:' + e.SERIF + ';font-size:15px;line-height:1.5;font-style:italic;color:' + e.MUTED + '">Saturday 18 September 2027<br>Markree Castle, Co. Sligo</td></tr>';
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

/** The foot of the card: Fionn on his own, under the sign-off. */
function cardFoot_() {
  var e = EMAIL;
  return '<tr><td align="center" style="padding:20px 0 26px"><img src="' + e.IMAGES + 'fionn.png" width="88" height="75" alt="Fionn, Markree’s wolfhound" ' +
    'style="display:block;border:0;outline:none;width:88px;height:auto;font-family:' + e.SERIF + ';font-size:12px;font-style:italic;color:' + e.MUTED + '"></td></tr>';
}

/** In 'corner' style, the posy tucked into the card's top-right corner. */
function cornerPosy_() {
  var e = EMAIL;
  if (e.FLOWERS !== 'corner') return '';
  return '<tr><td align="right" style="padding:6px 6px 0 0;font-size:0;line-height:0"><img src="' + e.IMAGES + 'posy-hang.png" width="78" height="78" alt="" style="display:block;border:0;outline:none;width:78px;height:auto;margin-left:auto"></td></tr>';
}

/**
 * Attaches the card's images to the email itself, so they show straight away
 * instead of waiting behind "show images". Falls back to the web address if an image can't be fetched.
 */
function inlineImages_(html) {
  var images = {};
  html = html.replace(/https:\/\/hannahandlawrence\.(?:wedding|com)\/email\/([\w-]+)\.png/g, function (url, name) {
    var blob = emailImage_(name);
    if (!blob) return url;
    images[name] = blob;
    return 'cid:' + name;
  });
  return { html: html, images: images };
}

function emailImage_(name) {
  try {
    var cache = CacheService.getScriptCache(), key = 'img2_' + name;
    var b64 = cache.get(key);
    if (!b64) {
      var sources = [EMAIL.IMAGES, EMAIL.IMAGES_BACKUP], res = null;
      for (var i = 0; i < sources.length && !b64; i++) {
        try { res = UrlFetchApp.fetch(sources[i] + name + '.png', { muteHttpExceptions: true, followRedirects: true }); } catch (err) { res = null; }
        if (res && res.getResponseCode() === 200 && /png/i.test(String(res.getHeaders()['Content-Type'] || 'png'))) b64 = Utilities.base64Encode(res.getContent());
      }
      if (!b64) return null;
      cache.put(key, b64, 21600);
    }
    return Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', name + '.png');
  } catch (e) { console.error(e); return null; }
}

/** The card every email sits in: ivory, inside a fine double gold rule, on bottle green. */
function emailShell_(inner, preheader, footer) {
  var e = EMAIL;
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
    '<style>:root{color-scheme:light only}body{margin:0;padding:0}a{color:' + e.GREEN + '}' +
    '@media (min-width:600px){.outer{padding:44px 20px !important}.inner{padding-left:34px !important;padding-right:34px !important}}</style></head>' +
    '<body style="margin:0;padding:0;background:' + e.SURROUND + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' + e.SURROUND + '">' + esc_(preheader || '') + '&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + e.SURROUND + '" style="background:' + e.SURROUND + '"><tr>' +
    '<td align="center" class="outer" style="padding:28px 12px">' +
      // the card: outer gold rule, a sliver of ivory, inner gold rule
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + e.IVORY + '" style="max-width:480px;background:' + e.IVORY + ';border:1px solid ' + e.GOLD + ';border-radius:16px"><tr><td style="padding:5px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ' + e.GOLD + ';border-radius:12px">' +
      cornerPosy_() +
      '<tr><td align="center" class="inner" style="padding:' + (e.FLOWERS === 'corner' ? '0' : '30px') + ' 22px 0">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
        '<tr><td align="center" style="font-family:' + e.SERIF + ';font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:' + e.GOLD + '">Hannah &amp; Lawrence</td></tr>' +
        inner +
        '</table>' +
      '</td></tr>' +
      cardFoot_() +
      '</table>' +
      '</td></tr></table>' +
      // small print, outside the card
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px"><tr>' +
      '<td align="center" style="padding:22px 10px 0;font-family:' + e.SERIF + ';font-size:13px;line-height:1.6;color:' + e.ON_GREEN + '">' + footer.replace(/color:#1E3829/g, 'color:' + e.IVORY) + '</td></tr>' +
      '<tr><td align="center" style="padding:12px 0 0;font-family:' + e.SERIF + ';font-size:12px;letter-spacing:.1em;color:' + e.ON_GREEN + '"><a href="' + CONFIG.SITE + '" style="color:' + e.ON_GREEN + ';text-decoration:none">' + CONFIG.SITE.replace(/^https?:\/\//, '') + '</a></td></tr>' +
      '</table>' +
    '</td></tr></table></body></html>';
}
