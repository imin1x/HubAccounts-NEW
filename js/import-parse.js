// HubAccounts — Smart field detection for bulk import.
// Classic script: shares the global scope with the other js/*.js files,
// loaded in the order listed in HubAccounts.html.
// ---------- AUTO-PARSE ----------
// format: UID|PASS|2FA|Email|Passemail|Email phụ|Cookie|Token|Khác|
// ---------- SMART FIELD DETECTION (auto-import) ----------
// Content-pattern checks used to catch and auto-correct common column-order mistakes
// when pasting bulk data — e.g. an email accidentally landing in the "2FA" slot.
function looksLikeUid(s){
  return /^\d{5,20}$/.test((s || '').trim());
}
// A real email address can never legally exceed 254 characters total, 64 in the
// local-part before "@" (RFC 5321/5322) — and it never contains ";" or spaces.
// Facebook cookie strings, by contrast, are long semicolon-separated key=value
// pairs (c_user=...;xs=...;datr=...) that can easily run past 300+ characters.
// Checking both shape AND length lets us tell a real email apart from a cookie
// blob that got pasted into the wrong column.
const EMAIL_MAX_TOTAL = 254;
const EMAIL_MAX_LOCAL = 64;
function looksLikeEmail(s){
  const v = (s || '').trim();
  if(!v || v.length > EMAIL_MAX_TOTAL) return false;
  if(v.includes(';') || v.includes(' ')) return false;
  const at = v.indexOf('@');
  if(at <= 0 || at !== v.lastIndexOf('@')) return false;
  if(v.slice(0, at).length > EMAIL_MAX_LOCAL) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function looksLike2FASecret(s){
  const t = (s || '').replace(/\s+/g, '');
  return t.length >= 16 && /^[A-Za-z2-7]+$/.test(t) && !t.includes('@');
}
// Cookie/token dumps are long and, for cookies specifically, made of several
// "key=value;" pairs — a shape a real email address never has.
// A browser cookie header has a very rigid, checkable shape: two or more
// "key=value" pairs joined by semicolons (that's literally the HTTP Cookie
// header format — e.g. "c_user=123;xs=abc;datr=xyz;"). Checking for THIS
// specific structure — rather than just "is it long" — is what actually
// separates a cookie from a token: plenty of real tokens (JWTs, Microsoft
// MSA artifacts, OAuth opaque tokens) are just as long as a cookie dump but
// don't have the "k=v;k=v" shape, so treating "long" alone as "must be a
// cookie" is exactly what was causing Cookie and Token to get mixed up.
function looksLikeCookieHeader(s){
  const v = (s || '').trim();
  if(v.length <= 20) return false;
  const kvPairs = v.split(';').map(p => p.trim()).filter(p => p.includes('=') && !p.includes(' ')).length;
  return kvPairs >= 2;
}
// Anything else long and opaque that ISN'T a cookie header and ISN'T a
// Facebook "EAA..." access token still behaves like a token/session blob —
// this is the fallback for token formats without a fixed prefix (JWTs, MSA
// artifacts, generic OAuth tokens). The 100-char floor keeps this from
// mistaking an unusually long but genuine PASSWORD for a token.
function looksLikeOpaqueTokenBlob(s){
  const v = (s || '').trim();
  if(v.length <= 100) return false;
  if(looksLikeCookieHeader(v)) return false; // cookie shape takes priority
  return true;
}

function looksLikeProxyValue(s){
  const raw = String(s || '').trim();
  if(!raw || raw.includes(' ') || raw.includes(';')) return false;
  const value = raw.replace(/^(?:https?|socks[45]?):\/\//i, '');
  const hostPort = value.includes('@') ? value.slice(value.lastIndexOf('@') + 1) : value;
  if(/^\[[0-9a-f:]+\]:\d{1,5}$/i.test(hostPort)){
    const port = Number(hostPort.slice(hostPort.lastIndexOf(':') + 1));
    return port > 0 && port <= 65535;
  }
  const match = hostPort.match(/^([^:]+):(\d{1,5})(?::[^:|]+(?::[^:|]+)?)?$/);
  if(!match) return false;
  const host = match[1];
  const port = Number(match[2]);
  if(port < 1 || port > 65535) return false;
  if(/^\d+(?:\.\d+){3}$/.test(host)){
    return host.split('.').every(part => Number(part) >= 0 && Number(part) <= 255);
  }
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(host);
}

function looksLikePhoneValue(s){
  const value = String(s || '').trim();
  const digits = value.replace(/[\s().-]/g, '').replace(/^\+/, '');
  return /^\d{8,15}$/.test(digits);
}

function looksLikeSteamId(s){
  return /^7656119\d{10}$/.test(String(s || '').trim());
}

function looksLikeSteamSecret(s){
  const value = String(s || '').trim();
  return value.length >= 24 && value.length <= 32 && /^[A-Za-z0-9+/]+={0,2}$/.test(value) && /[+/=]/.test(value);
}

function looksLikeGenericToken(s){
  const value = String(s || '').trim();
  return looksLikeFacebookToken(value) || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?$/.test(value) || looksLikeOpaqueTokenBlob(value);
}

function looksLikeBackupCodes(s){
  const value = String(s || '').trim();
  if(!/[\s,;]+/.test(value)) return false;
  const codes = value.split(/[\s,;]+/).filter(Boolean);
  return codes.length >= 2 && codes.every(code => /^[A-Za-z0-9-]{4,16}$/.test(code));
}

function strongAutoType(value, platformId){
  if(!value) return 'empty';
  if(looksLikeProxyValue(value)) return 'proxy';
  if(looksLikeCookieHeader(value)) return 'cookie';
  if(looksLikeGenericToken(value)) return 'token';
  if(platformId === 'steam' && looksLikeSteamId(value)) return 'steamId';
  if(platformId === 'steam' && looksLikeSteamSecret(value)) return 'steamSecret';
  if(looksLike2FASecret(value)) return 'twoFA';
  if(looksLikeEmail(value)) return 'email';
  if(looksLikePhoneValue(value)) return 'phone';
  if(looksLikeBackupCodes(value)) return 'backupCodes';
  return 'unknown';
}

function parseSmartCredentialParts(parts, platformId){
  const fields = getPlatformInputFields(platformId);
  const obj = Object.fromEntries(fields.map(field => [field.key, '']));
  obj.proxy = '';
  const values = parts.map((value, index) => ({ value: String(value || '').trim(), index, used: false }));
  const assign = (item, key) => {
    if(!item || item.used || !item.value || obj[key]) return false;
    obj[key] = item.value;
    item.used = true;
    return true;
  };
  const firstOfType = type => values.find(item => !item.used && strongAutoType(item.value, platformId) === type);
  const allOfType = type => values.filter(item => !item.used && strongAutoType(item.value, platformId) === type);
  const hasExplicitGaps = parts.some(value => !String(value || '').trim());
  const isFullWidth = parts.length >= Math.max(2, fields.length - 1);

  // Establish the login identifier before classifying optional contact data.
  // Gmail/Hotmail always use an email; TikTok/Steam use the first ordinary
  // value, which may itself be an email address or phone number.
  if(platformId === 'gmail' || platformId === 'hotmail'){
    assign(firstOfType('email'), 'fbName');
  }else{
    const firstNonEmpty = values.find(item => item.value);
    const primaryType = firstNonEmpty ? strongAutoType(firstNonEmpty.value, platformId) : 'empty';
    if(['unknown', 'email', 'phone'].includes(primaryType)) assign(firstNonEmpty, 'fbName');
  }

  // Protect declared password columns before Base32 detection: a strong random
  // password (especially a 16-letter Google app password) may look exactly like
  // a TOTP secret. In compact rows, the second ordinary item is the login pass.
  if(hasExplicitGaps || isFullWidth){
    const passwordKeys = new Set(['password', 'emailPassword', 'secondaryEmailPassword', 'appPassword']);
    fields.forEach((field, index) => {
      const item = values[index];
      if(item && passwordKeys.has(field.key) && ['unknown', 'twoFA'].includes(strongAutoType(item.value, platformId))){
        assign(item, field.key);
      }
    });
  }else if(!obj.password){
    const primaryItem = values.find(item => item.used && item.value === obj.fbName);
    const candidate = values.find(item => !item.used && item.index > (primaryItem?.index ?? -1) && ['unknown', 'twoFA'].includes(strongAutoType(item.value, platformId)));
    assign(candidate, 'password');
  }

  // These shapes are reliable enough to classify independently of column order.
  assign(firstOfType('proxy'), 'proxy');
  assign(firstOfType('cookie'), 'cookie');
  assign(firstOfType('token'), 'token');
  assign(firstOfType('twoFA'), 'twoFA');
  assign(firstOfType('phone'), 'phone');
  assign(firstOfType('backupCodes'), 'backupCodes');
  if(platformId === 'steam'){
    assign(firstOfType('steamId'), 'steamId');
    const steamSecrets = allOfType('steamSecret');
    assign(steamSecrets[0], 'steamSharedSecret');
    assign(steamSecrets[1], 'steamIdentitySecret');
  }

  const emailItems = allOfType('email');
  if(platformId === 'gmail' || platformId === 'hotmail'){
    assign(emailItems[0], 'secondaryEmail');
  }else{
    assign(emailItems[0], 'email');
  }

  if(hasExplicitGaps || isFullWidth){
    // A full row (or a row with || placeholders) intentionally follows the
    // displayed format. Use those positions only for values not classified above.
    fields.forEach((field, index) => {
      const item = values[index];
      if(item && !item.used && strongAutoType(item.value, platformId) === 'unknown') assign(item, field.key);
    });
  }

  const remaining = () => values.filter(item => !item.used && item.value);
  // User and password have no universal signature. Their relative order is the
  // only safe convention after all recognisable values have been removed.
  if(!obj.fbName) assign(remaining()[0], 'fbName');
  if(!obj.password){
    const primaryIndex = values.find(item => item.used && item.value === obj.fbName)?.index ?? -1;
    assign(remaining().find(item => item.index > primaryIndex) || remaining()[0], 'password');
  }

  const linkedEmailKey = platformId === 'gmail' || platformId === 'hotmail' ? 'secondaryEmail' : 'email';
  const linkedPasswordKey = platformId === 'gmail' || platformId === 'hotmail' ? 'secondaryEmailPassword' : 'emailPassword';
  if(obj[linkedEmailKey] && !obj[linkedPasswordKey]){
    const emailIndex = values.find(item => item.used && item.value === obj[linkedEmailKey])?.index ?? -1;
    assign(remaining().find(item => item.index > emailIndex), linkedPasswordKey);
  }

  // Preserve every unrecognised value rather than silently discarding it.
  const leftovers = remaining().map(item => item.value);
  if(leftovers.length) obj.other = [obj.other, ...leftovers].filter(Boolean).join(' | ');
  return obj;
}

// Facebook's format has fields with very distinctive, checkable shapes
// (UID = digits only, 2FA = long base32 secret, Email = short and RFC-valid,
// Cookie = long "key=value;" dump, Token = Facebook access token "EAA..."
// prefix). Real-world pasted data doesn't always follow our exact column
// order — some sources list Cookie/Token before Email, for example — so
// instead of only checking one pair at a time, this classifies EVERY
// flexible field by its actual content shape and reassigns all of them
// together. Anything left over that doesn't fit a known slot is appended to
// "Khác" rather than silently dropped, so no data is ever lost.
function looksLikeFacebookToken(s){
  return /^EAA[A-Za-z0-9]{15,}$/.test((s || '').trim());
}
function classifyFacebookValue(v){
  if(!v) return 'empty';
  if(looksLikeFacebookToken(v)) return 'token';
  if(looksLikeCookieHeader(v)) return 'cookie';
  if(looksLike2FASecret(v)) return 'twofa';
  if(looksLikeEmail(v)) return 'email';
  if(looksLikeOpaqueTokenBlob(v)) return 'token';
  return 'unknown';
}
// Only values with an unmistakable shape are ever moved: a cookie header, a
// Facebook "EAA..." token, a long opaque token blob, a Base32 2FA secret or an
// email address sitting in a slot meant for something else. Everything else
// — passwords, phone numbers used as the login, short notes — stays exactly
// where the person typed it. (An earlier version pooled every "unknown" value
// and re-dealt them, which on each unlock moved a phone typed into Email to
// "Pass Email", pushed the real mail password into "Khác", and turned a
// 16-letter mail password into a 2FA secret.)
const FACEBOOK_SLOT_TYPE = { twoFA: 'twofa', email: 'email', secondaryEmail: 'email', cookie: 'cookie', token: 'token' };
function classifyFacebookSlotValue(slot, value){
  const type = classifyFacebookValue(value);
  // A password can legitimately look like a 2FA secret, an email or a long
  // random string; only a cookie header or an EAA token is clearly misplaced there.
  if(slot === 'emailPassword') return type === 'cookie' || looksLikeFacebookToken(value) ? type : 'unknown';
  return type;
}
function smartCorrectFacebookFields(fields){
  const f = { ...fields };

  // UID vs Email — kept separate since fbName has its own dedicated,
  // very reliable digits-only check.
  if(f.fbName && f.email && !looksLikeUid(f.fbName) && looksLikeEmail(f.fbName) && looksLikeUid(f.email) && !looksLikeEmail(f.email)){
    [f.fbName, f.email] = [f.email, f.fbName];
  }

  const slotOrder = ['twoFA', 'email', 'emailPassword', 'secondaryEmail', 'cookie', 'token'];
  const misplaced = [];
  slotOrder.forEach(slot => {
    const value = f[slot];
    if(!value) return;
    const type = classifyFacebookSlotValue(slot, value);
    if(type === 'unknown' || type === 'empty' || FACEBOOK_SLOT_TYPE[slot] === type) return;
    misplaced.push({ type, value });
    f[slot] = '';
  });
  if(!misplaced.length) return f;

  const targets = { twofa: ['twoFA'], email: ['email', 'secondaryEmail'], cookie: ['cookie'], token: ['token'] };
  const leftovers = [];
  misplaced.forEach(({ type, value }) => {
    const slot = (targets[type] || []).find(key => !f[key]);
    if(slot) f[slot] = value;
    else leftovers.push(value);
  });
  // Nothing is ever dropped: a value whose proper slot is taken goes to "Khác".
  if(leftovers.length) f.other = [f.other, ...leftovers].filter(Boolean).join(' | ');
  return f;
}

function parseAutoLine(line, platformId){
  const parts = (platformId === 'proxy' ? splitProxyLine(line) : line.split(platformDelimiter(platformId))).map(p => p.trim());
  if(platformId === 'link'){
    return { fbName: normalizeNewHttpLink(parts[0]), other: parts.slice(1).join(' | ').trim() };
  }
  const obj = {};
  getPlatformInputFields(platformId).forEach((f, i) => { obj[f.key] = parts[i] || ''; });
  if(platformId === 'facebook'){
    return smartCorrectFacebookFields(obj);
  }
  if(['ai', 'tiktok', 'gmail', 'hotmail', 'steam'].includes(platformId)){
    return parseSmartCredentialParts(parts, platformId);
  }
  return obj;
}

