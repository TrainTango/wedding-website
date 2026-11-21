/**
 * Hannah & Lawrence: the emails guests receive.
 * Style: "Engraved card". Ivory, bottle green and antique gold, centred like a letterpress card.
 *
 * Light mode: an ivory card on bottle green.
 * Dark mode: the same card in bottle green with ivory ink, set by us (not left to the inbox to invert).
 *   - Apple Mail and iOS Mail follow the "prefers-color-scheme: dark" styles.
 *   - Outlook (web, iPhone, Android) follows the [data-ogsc] / [data-ogsb] styles.
 *   - Gmail and Yahoo apps ignore both and apply their own dark colours; nothing in an email can stop that.
 *
 * Kept in its own file so the wording and design can change without touching Code.gs.
 * Links use CONFIG.SITE (hannahandlawrence.wedding). Images load from hannahandlawrence.wedding/email/
 * and are always attached to the email itself.
 */

var EMAIL = {
  // light mode
  SURROUND: '#1E3829',   // bottle green around the card
  CARD: '#FBF8F1',       // ivory card
  TEXT: '#1E3829',       // bottle green ink
  MUTED: '#5E6F63',
  GOLD: '#B8925A',
  RULE: '#E6DFCF',
  ON_GREEN: '#C9D2C3',   // small print outside the card
  LINK_ON_GREEN: '#FBF8F1',
  // dark mode
  D_SURROUND: '#16281D',
  D_CARD: '#1E3829',
  D_TEXT: '#F3EDDD',
  D_MUTED: '#BFC9B9',
  D_GOLD: '#D3AF6E',
  D_RULE: '#3C5646',
  D_BUTTON_TEXT: '#16281D',

  SERIF: "Georgia,'Times New Roman',serif",
  IMAGES: 'https://hannahandlawrence.wedding/email/',
  IMAGES_BACKUP: 'https://raw.githubusercontent.com/TrainTango/wedding-website/main/email/',  // used if the website can't be reached
  FLOWERS: 'crest'   // 'crest': the posy seal sits at the top. 'corner': the posy is tucked into the top-right corner.
};

var POSTED_LINE = 'We’ll post a printed invitation to the address you gave us.';

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
    [''], body ? [body, ''] : [], info.printed ? [POSTED_LINE, ''] : [],
    ['With love,', 'Hannah & Lawrence', '',
     'Plans change? You can update your reply until 1 March 2027 at ' + replyUrl + '.']).join('\n');

  var e = EMAIL;
  var rowHtml = rows.map(function (r) {
    return '<tr><td align="center" class="tx rl" style="padding:14px 0;border-top:1px solid ' + e.RULE + ';font-family:' + e.SERIF + ';color:' + e.TEXT + '">' +
      '<span class="tx" style="font-size:22px;line-height:1.3;color:' + e.TEXT + '">' + esc_(r.name) + '</span><br>' +
      '<span class="mu" style="font-size:15px;line-height:1.5;font-style:italic;color:' + e.MUTED + '">' + r.status + (r.extra ? '<br>' + r.extra : '') + '</span>' +
      '</td></tr>';
  }).join('');

  // A lone "regretfully declines" would only repeat the sentence above it.
  var showList = info.coming || rows.length > 1;
  var inner =
    titleBlock_(title) +
    para_('Dear ' + esc_(names) + ',', 18, '0 6px') +
    para_(esc_(opening), 17, '10px 6px 0') +
    (showList ? '<tr><td align="center" class="gd" style="padding:30px 0 12px;font-family:' + e.SERIF + ';font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:' + e.GOLD + '">Here’s what we have</td></tr>' +
    '<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rowHtml +
      '<tr><td class="rl" style="border-top:1px solid ' + e.RULE + ';font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>' : '') +
    (body ? para_(esc_(body).replace('our website', '<a href="' + CONFIG.SITE + '" class="tx" style="color:' + e.TEXT + '">our website</a>'), 16, '26px 6px 0') : '') +
    (info.printed ? para_(esc_(POSTED_LINE), 16, '16px 6px 0', 'mu', true) : '') +
    signOff_();

  var footer = 'Plans change? <a href="' + replyUrl + '" style="color:' + e.LINK_ON_GREEN + '">Update your reply</a> until 1&nbsp;March&nbsp;2027.';
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
    'Reply here: ' + replyUrl, '',
    'With love,', 'Hannah & Lawrence'].join('\n');

  var button =
    '<tr><td align="center" style="padding:30px 0 0">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td align="center" class="btn" bgcolor="' + e.TEXT + '" style="background:' + e.TEXT + ';border-radius:2px">' +
        '<a href="' + replyUrl + '" class="btnt" style="display:inline-block;padding:15px 40px;font-family:' + e.SERIF + ';font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:' + e.CARD + ';text-decoration:none">Reply now</a>' +
      '</td></tr></table>' +
    '</td></tr>';

  var inner =
    titleBlock_('Will you join us?') +
    para_('Dear ' + esc_(names) + ',', 18, '0 6px') +
    para_(esc_(opening), 17, '10px 6px 0') +
    button +
    signOff_('30px 0 0');

  return { subject: subject, text: text, html: emailShell_(inner, preheader, '') };
}

/* ---------------- building blocks ---------------- */

function titleBlock_(title) {
  var e = EMAIL;
  // Light mode: the posy on its own. Dark mode: the posy in an ivory seal, so its dark outlines still show.
  // (The text colour on this cell lets Outlook mark it, so the dark-mode swap works there too.)
  var emblem = e.FLOWERS === 'crest'
    ? '<tr><td align="center" class="tx" style="padding:16px 0 0;color:' + e.TEXT + '">' +
        '<img class="lt" src="' + e.IMAGES + 'posy-light.png" width="96" height="96" alt="" style="display:block;border:0;outline:none;width:96px;height:96px">' +
        '<img class="dk" src="' + e.IMAGES + 'posy-seal.png" width="96" height="96" alt="" style="display:none;border:0;outline:none;width:96px;height:96px">' +
      '</td></tr>'
    : '<tr><td align="center" style="padding:18px 0 6px"><img src="' + e.IMAGES + 'knot.png" width="160" height="28" alt="" style="display:block;border:0;outline:none;width:160px;height:auto"></td></tr>';
  return emblem +
    '<tr><td align="center" class="tx" style="padding:14px 0 0;font-family:' + e.SERIF + ';font-size:28px;line-height:1.2;font-weight:normal;color:' + e.TEXT + '">' + esc_(title) + '</td></tr>' +
    '<tr><td align="center" class="mu" style="padding:8px 0 30px;font-family:' + e.SERIF + ';font-size:15px;line-height:1.5;font-style:italic;color:' + e.MUTED + '">Saturday 18 September 2027<br>Markree Castle, Co. Sligo</td></tr>';
}

/** One centred paragraph. tone: 'mu' for the muted colour, otherwise the main ink. */
function para_(html, size, padding, tone, italic) {
  var e = EMAIL;
  var cls = tone === 'mu' ? 'mu' : 'tx';
  return '<tr><td align="center" class="' + cls + '" style="padding:' + padding + ';font-family:' + e.SERIF + ';font-size:' + size + 'px;line-height:1.65;color:' + (cls === 'mu' ? e.MUTED : e.TEXT) +
    (italic ? ';font-style:italic' : '') + '">' + html + '</td></tr>';
}

function signOff_(padding) {
  var e = EMAIL;
  return '<tr><td align="center" class="tx" style="padding:' + (padding || '30px 0 0') + ';font-family:' + e.SERIF + ';font-size:17px;line-height:1.5;color:' + e.TEXT + '">' +
    'With love,<br><span class="tx" style="font-size:22px;color:' + e.TEXT + '">Hannah &amp; Lawrence</span></td></tr>';
}

/** The foot of the card: Fionn under the sign-off. Green ink in light mode, gold in dark mode so he still shows. */
function cardFoot_() {
  var e = EMAIL;
  var img = function (cls, file, display) {
    return '<img class="' + cls + '" src="' + e.IMAGES + file + '" width="84" height="84" alt="Fionn, Markree’s wolfhound" ' +
      'style="display:' + display + ';border:0;outline:none;width:84px;height:84px;font-family:' + e.SERIF + ';font-size:12px;font-style:italic;color:' + e.MUTED + '">';
  };
  return '<tr><td align="center" class="tx" style="padding:24px 0 28px;color:' + e.TEXT + '">' +
    img('lt', 'fionn-light.png', 'block') + img('dk', 'fionn-gold.png', 'none') + '</td></tr>';
}

/** In 'corner' style, the posy tucked into the card's top-right corner. */
function cornerPosy_() {
  var e = EMAIL;
  if (e.FLOWERS !== 'corner') return '';
  return '<tr><td align="right" style="padding:6px 6px 0 0;font-size:0;line-height:0"><img src="' + e.IMAGES + 'posy-hang.png" width="78" height="78" alt="" style="display:block;border:0;outline:none;width:78px;height:auto;margin-left:auto"></td></tr>';
}

/**
 * Attaches the card's images to the email itself, so they always show straight away
 * instead of waiting behind "show images". Only if an image can't be fetched at all
 * does the email fall back to its web address.
 */
function inlineImages_(html) {
  var images = {};
  html = html.replace(/https:\/\/hannahandlawrence\.(?:wedding|com)\/email\/([\w-]+)\.png/g, function (url, name) {
    var blob = emailImage_(name);
    if (!blob) { console.error('Could not attach ' + name + '.png'); return url; }
    images[name] = blob;
    return 'cid:' + name;
  });
  return { html: html, images: images };
}

/** Fetches an email image, keeping a copy for 6 hours. A storage problem never stops the image being attached. */
function emailImage_(name) {
  var key = 'img4_' + name, b64 = null, cache = null;
  try { cache = CacheService.getScriptCache(); b64 = cache.get(key); } catch (e) { b64 = null; }
  if (!b64) {
    var sources = [EMAIL.IMAGES, EMAIL.IMAGES_BACKUP];
    for (var i = 0; i < sources.length && !b64; i++) {
      try {
        var res = UrlFetchApp.fetch(sources[i] + name + '.png', { muteHttpExceptions: true, followRedirects: true });
        if (res.getResponseCode() === 200 && /png/i.test(String(res.getHeaders()['Content-Type'] || 'png'))) b64 = Utilities.base64Encode(res.getContent());
      } catch (e) { /* try the next source */ }
    }
    if (!b64) return null;
    try { if (cache && b64.length < 95000) cache.put(key, b64, 21600); } catch (e) { /* not stored, still attached */ }
  }
  try { return Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', name + '.png'); }
  catch (e) { console.error(e); return null; }
}

/** Dark-mode styles: Apple Mail via the media query, Outlook via its data-ogsc / data-ogsb markers. */
function darkCss_() {
  var e = EMAIL;
  var rules =
    '.sur{background:' + e.D_SURROUND + ' !important;background-color:' + e.D_SURROUND + ' !important}' +
    '.card{background:' + e.D_CARD + ' !important;background-color:' + e.D_CARD + ' !important;border-color:' + e.D_GOLD + ' !important}' +
    '.ring{border-color:' + e.D_GOLD + ' !important}' +
    '.tx{color:' + e.D_TEXT + ' !important}' +
    '.mu{color:' + e.D_MUTED + ' !important}' +
    '.gd{color:' + e.D_GOLD + ' !important}' +
    '.rl{border-color:' + e.D_RULE + ' !important}' +
    '.btn{background:' + e.D_GOLD + ' !important;background-color:' + e.D_GOLD + ' !important}' +
    '.btnt{color:' + e.D_BUTTON_TEXT + ' !important}' +
    '.lt{display:none !important}' +
    '.dk{display:block !important}';
  // Outlook: the same rules, scoped to the markers it adds when it recolours an element.
  var outlook = rules.replace(/\.(sur|card|btn)\{/g, '[data-ogsb] .$1{').replace(/\.(ring|tx|mu|gd|rl|btnt|lt|dk)\{/g, '[data-ogsc] .$1{');
  return '@media (prefers-color-scheme:dark){' + rules + '}' + outlook;
}

/** The card every email sits in: ivory (or bottle green in dark mode), inside a fine double gold rule. */
function emailShell_(inner, preheader, footer) {
  var e = EMAIL;
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">' +
    '<style>:root{color-scheme:light dark;supported-color-schemes:light dark}body{margin:0;padding:0}' +
    '@media (min-width:600px){.outer{padding:44px 20px !important}.inner{padding-left:34px !important;padding-right:34px !important}}' +
    darkCss_() + '</style></head>' +
    '<body class="sur" style="margin:0;padding:0;background:' + e.SURROUND + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' + e.SURROUND + '">' + esc_(preheader || '') + '&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="sur" bgcolor="' + e.SURROUND + '" style="background:' + e.SURROUND + '"><tr>' +
    '<td align="center" class="outer sur" style="padding:28px 12px;background:' + e.SURROUND + '">' +
      // the card: outer gold rule, a sliver of card colour, inner gold rule
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" bgcolor="' + e.CARD + '" style="max-width:480px;background:' + e.CARD + ';border:1px solid ' + e.GOLD + ';border-radius:16px"><tr><td style="padding:5px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="ring" style="border:1px solid ' + e.GOLD + ';border-radius:12px">' +
      cornerPosy_() +
      '<tr><td align="center" class="inner" style="padding:' + (e.FLOWERS === 'corner' ? '0' : '30px') + ' 22px 0">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
        '<tr><td align="center" class="gd" style="font-family:' + e.SERIF + ';font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:' + e.GOLD + '">Hannah &amp; Lawrence</td></tr>' +
        inner +
        '</table>' +
      '</td></tr>' +
      cardFoot_() +
      '</table>' +
      '</td></tr></table>' +
      // small print, outside the card (on green in both modes)
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">' +
      (footer ? '<tr><td align="center" style="padding:22px 10px 0;font-family:' + e.SERIF + ';font-size:13px;line-height:1.6;color:' + e.ON_GREEN + '">' + footer + '</td></tr>' : '') +
      '<tr><td align="center" style="padding:' + (footer ? '12px' : '22px') + ' 0 0;font-family:' + e.SERIF + ';font-size:12px;letter-spacing:.1em;color:' + e.ON_GREEN + '"><a href="' + CONFIG.SITE + '" style="color:' + e.ON_GREEN + ';text-decoration:none">' + CONFIG.SITE.replace(/^https?:\/\//, '') + '</a></td></tr>' +
      '</table>' +
    '</td></tr></table></body></html>';
}
