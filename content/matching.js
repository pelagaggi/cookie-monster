// Pure text matching for cookie banners and their buttons. No DOM access,
// so this file is also loaded by the Node unit tests.
(function (root) {
  'use strict';

  const MAX_BANNER_TEXT = 2000;
  const MAX_LABEL = 40;

  const CONSENT_KEYWORDS = [
    'cookie', 'consent', 'gdpr', 'consentimento', 'consentimiento', 'einwilligung',
  ];

  const REJECT_PATTERNS = [
    'reject', 'decline', 'deny', 'refuse', 'necessary', 'essential', 'settings',
    'preferences', 'manage', 'customi', 'options', 'learn more', 'policy',
    'rejeitar', 'recusar', 'rechazar', 'refuser', 'ablehnen', 'configur',
    'einstellungen', 'paramètres', 'do not', "don't", 'disallow', 'disagree', 'only',
    'without', 'not ', 'later', 'selected', 'selection', 'sans', 'não', 'no ', 'sin ',
    'nicht', 'ohne', 'nur', 'notwendig', 'auswahl',
    // Never click anything that buys, subscribes or signs in.
    'pay', 'buy', 'order', 'purchase', 'checkout', 'subscribe', 'sign', 'log in', 'login',
  ];

  const ACCEPT_ALL_PATTERNS = [
    'accept all', 'allow all', 'agree to all', 'aceitar tudo', 'aceitar todos',
    'aceptar todo', 'tout accepter', 'alle akzeptieren',
  ];

  const ACCEPT_PATTERNS = [
    'accept', 'agree', 'allow', 'aceitar', 'aceito', 'aceptar', 'acepto',
    'accepter', "j'accepte", 'akzeptieren', 'zustimmen', 'concordo',
  ];

  // Short acknowledgements are too common inside other words ("ok" in
  // "cookies"), so they must be the whole label.
  const ACKNOWLEDGE_LABELS = ['got it', 'ok', 'okay', 'i understand', 'entendi', 'continue'];

  function normalize(text) {
    return String(text || '')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function includesAny(text, patterns) {
    return patterns.some((pattern) => text.includes(pattern));
  }

  // Matches the patterns only as whole words, so "allow" does not match
  // "Halloween" and "agree" does not match "Agreement".
  function wholeWordMatcher(patterns) {
    const escaped = patterns.map((pattern) => pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`(?<!\\p{L})(?:${escaped.join('|')})(?!\\p{L})`, 'u');
  }

  const ACCEPT_ALL = wholeWordMatcher(ACCEPT_ALL_PATTERNS);
  const ACCEPT = wholeWordMatcher(ACCEPT_PATTERNS);

  function mentionsCookies(text) {
    return normalize(text).includes('cookie');
  }

  function isBannerText(text) {
    const normalized = normalize(text);
    return (
      normalized.length > 0 &&
      normalized.length <= MAX_BANNER_TEXT &&
      includesAny(normalized, CONSENT_KEYWORDS)
    );
  }

  function scoreLabel(text) {
    const label = normalize(text);
    if (!label || label.length > MAX_LABEL) return 0;
    if (includesAny(label, REJECT_PATTERNS)) return 0;
    if (ACCEPT_ALL.test(label)) return 3;
    if (ACCEPT.test(label)) return 2;
    const bare = label.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    return ACKNOWLEDGE_LABELS.includes(bare) ? 1 : 0;
  }

  function pickBest(labels) {
    let best = -1;
    let bestScore = 0;
    labels.forEach((label, index) => {
      const score = scoreLabel(label);
      if (score > bestScore) {
        best = index;
        bestScore = score;
      }
    });
    return best;
  }

  const api = { normalize, isBannerText, mentionsCookies, scoreLabel, pickBest };
  root.CookieMonster = root.CookieMonster || {};
  root.CookieMonster.matching = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
