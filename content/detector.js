// Finds a cookie banner and its accept button in the live DOM.
(function (root) {
  'use strict';

  const { isBannerText, mentionsCookies, scoreLabel } = root.CookieMonster.matching;

  const CLICKABLE = 'button, a, [role="button"], input[type="button"], input[type="submit"]';
  // A container with somewhere to type is a login, sign-up or checkout form,
  // not a cookie banner.
  const TEXT_ENTRY =
    'input:not([type]), input[type="text"], input[type="email"], input[type="password"], ' +
    'input[type="tel"], input[type="number"], input[type="search"], textarea, select';
  const MIN_OVERLAY_Z_INDEX = 100;
  const ACKNOWLEDGE_SCORE = 1;

  function collectClickables(scope, out) {
    out.push(...scope.querySelectorAll(CLICKABLE));
    for (const el of scope.querySelectorAll('*')) {
      if (el.shadowRoot) collectClickables(el.shadowRoot, out);
    }
    return out;
  }

  function labelOf(el) {
    return (el.innerText || '').trim() || el.value || el.getAttribute('aria-label') || el.title || '';
  }

  // Same as labelOf but without forcing layout, to rule most elements out cheaply.
  function roughLabelOf(el) {
    return (el.textContent || '').trim() || el.value || el.getAttribute('aria-label') || el.title || '';
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    if (typeof el.checkVisibility !== 'function') return true;
    return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  }

  function isOverlay(el) {
    if (el.matches('dialog[open], [role="dialog"], [aria-modal="true"]')) return true;
    const style = getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'sticky') return true;
    return Number.parseInt(style.zIndex, 10) >= MIN_OVERLAY_Z_INDEX;
  }

  // Parent element, stepping out of a shadow root to its host.
  function parentOf(el) {
    if (el.parentElement) return el.parentElement;
    const rootNode = el.getRootNode();
    return rootNode instanceof ShadowRoot ? rootNode.host : null;
  }

  // A bare "OK" or "Continue" is only trusted when the banner talks about
  // cookies specifically, not just consent in general.
  function findBanner(button, score) {
    for (let el = button; el; el = parentOf(el)) {
      if (el === document.body || el === document.documentElement) return null;
      if (el === button || !isOverlay(el)) continue;
      const text = el.innerText || el.textContent;
      if (!isBannerText(text)) continue;
      if (score === ACKNOWLEDGE_SCORE && !mentionsCookies(text)) return null;
      return el.querySelector(TEXT_ENTRY) ? null : el;
    }
    return null;
  }

  function find() {
    let best = null;
    for (const button of collectClickables(document, [])) {
      if (scoreLabel(roughLabelOf(button)) === 0) continue;
      const score = scoreLabel(labelOf(button));
      if (score === 0 || (best && score <= best.score)) continue;
      if (!isVisible(button)) continue;
      const banner = findBanner(button, score);
      if (banner) best = { banner, button, score };
    }
    return best && { banner: best.banner, button: best.button };
  }

  function watch(onFound, { timeoutMs = 15000, throttleMs = 300 } = {}) {
    let finished = false;
    let scanTimer = null;

    const finish = () => {
      finished = true;
      observer.disconnect();
      clearTimeout(scanTimer);
      clearTimeout(stopTimer);
    };

    const scan = () => {
      scanTimer = null;
      if (finished) return;
      const hit = find();
      if (!hit) return;
      finish();
      onFound(hit);
    };

    const observer = new MutationObserver(() => {
      if (scanTimer === null) scanTimer = setTimeout(scan, throttleMs);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'open'],
    });
    const stopTimer = setTimeout(finish, timeoutMs);

    scan();
  }

  root.CookieMonster.detector = { find, watch, isVisible };
})(globalThis);
