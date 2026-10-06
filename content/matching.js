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
    if (includesAny(label, ACCEPT_ALL_PATTERNS)) return 3;
    if (includesAny(label, ACCEPT_PATTERNS)) return 2;
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

  const api = { normalize, isBannerText, scoreLabel, pickBest };
  root.CookieMonster = root.CookieMonster || {};
  root.CookieMonster.matching = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
