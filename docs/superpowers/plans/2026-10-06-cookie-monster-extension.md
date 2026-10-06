# Cookie Monster Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Chrome extension that detects cookie-consent banners, plays a Cookie Monster animation that eats the accept button, and clicks accept.

**Architecture:** Manifest V3 content scripts share one namespace object (`globalThis.CookieMonster`). Pure text matching lives in `content/matching.js` and is unit-tested in Node; DOM detection, animation, and orchestration are separate content scripts. Sound goes through the service worker: `chrome.tts` for the voice and an offscreen document for synthesized crunches.

**Tech Stack:** Plain JavaScript, CSS, SVG, Web Animations API, Web Audio API, Chrome extension APIs (`storage`, `tts`, `offscreen`), Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-06-cookie-monster-extension-design.md`

## Global Constraints

- Manifest V3, no build step, no runtime dependencies, no shipped audio files.
- Content scripts run in the top frame only, at `document_idle`, on `<all_urls>`.
- Permissions are exactly `storage`, `tts`, `offscreen`.
- Accept only. Never click anything matching a reject pattern.
- Act at most once per page load. If unsure, do nothing.
- Character art and name live only in `content/character.js`.
- Settings in `chrome.storage.sync`: `enabled` (default `true`), `sound` (default `true`).
- A failure in extension code must never break the host page.

## Review Focus

1. A label that merely contains "ok" (for example "More about cookies") must score 0; tier-1 words match the whole label only.
2. Negated labels ("Do not accept", "Don't allow", "Disagree") must score 0.
3. Labels with surrounding whitespace, punctuation, emoji, or upper case ("  OK!  ", "✓ ACCEPT ALL") must still score.
4. Text longer than 40 characters is not a button label and must score 0, even when it contains "accept".
5. A button that is removed mid-show must not be clicked, and the overlay must be removed.

Items 1 to 4 are pinned by unit tests in Task 1. Item 5 is pinned by the harness check in Task 6.

---

### Task 1: Text matching (TDD)

**Files:**
- Create: `content/matching.js`, `test/matching.test.js`, `package.json`

**Interfaces:**
- Produces `CookieMonster.matching` (also `module.exports`):
  - `normalize(text: string): string` — collapse whitespace, trim, lowercase, straighten curly apostrophes.
  - `isBannerText(text: string): boolean` — non-empty, at most 2,000 characters, contains a consent keyword.
  - `scoreLabel(text: string): 0|1|2|3`
  - `pickBest(labels: string[]): number` — index of the highest score, first wins ties, `-1` if none score.

- [ ] **Step 1: Write the failing tests** in `test/matching.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../content/matching.js');

test('isBannerText requires a consent keyword', () => {
  assert.equal(m.isBannerText('We use cookies to improve your experience.'), true);
  assert.equal(m.isBannerText('Manage your CONSENT choices'), true);
  assert.equal(m.isBannerText('Sign up. See our privacy policy.'), false);
  assert.equal(m.isBannerText(''), false);
});

test('isBannerText rejects long text', () => {
  assert.equal(m.isBannerText('cookie ' + 'x'.repeat(2000)), false);
});

test('scoreLabel tiers', () => {
  assert.equal(m.scoreLabel('Accept all'), 3);
  assert.equal(m.scoreLabel('Aceitar todos'), 3);
  assert.equal(m.scoreLabel('Accept'), 2);
  assert.equal(m.scoreLabel('I agree'), 2);
  assert.equal(m.scoreLabel('Got it'), 1);
  assert.equal(m.scoreLabel('OK'), 1);
  assert.equal(m.scoreLabel('Subscribe'), 0);
});

test('scoreLabel excludes reject and settings labels', () => {
  for (const label of ['Reject all', 'Accept only necessary', 'Cookie settings',
    'Manage preferences', 'Rejeitar', 'Privacy policy', 'Learn more']) {
    assert.equal(m.scoreLabel(label), 0, label);
  }
});

test('review focus 1: tier-1 words match the whole label only', () => {
  assert.equal(m.scoreLabel('More about cookies'), 0);
  assert.equal(m.scoreLabel('Continue reading'), 0);
  assert.equal(m.scoreLabel('Book now'), 0);
});

test('review focus 2: negated labels score 0', () => {
  for (const label of ['Do not accept', "Don't allow", 'Don’t allow', 'Disagree', 'Disallow all']) {
    assert.equal(m.scoreLabel(label), 0, label);
  }
});

test('review focus 3: messy labels still score', () => {
  assert.equal(m.scoreLabel('  OK!  '), 1);
  assert.equal(m.scoreLabel('✓ ACCEPT ALL'), 3);
  assert.equal(m.scoreLabel('Accept\n  all\tcookies'), 3);
});

test('review focus 4: long text is not a label', () => {
  assert.equal(m.scoreLabel('By clicking accept you agree to our use of tracking'), 0);
});

test('pickBest prefers the highest score, then the first', () => {
  assert.equal(m.pickBest(['Reject', 'Accept', 'Accept all']), 2);
  assert.equal(m.pickBest(['Agree', 'Accept']), 0);
  assert.equal(m.pickBest(['Reject', 'Settings']), -1);
  assert.equal(m.pickBest([]), -1);
});
```

- [ ] **Step 2: Run `node --test test/` and confirm it fails** (module not found).
- [ ] **Step 3: Implement `content/matching.js`** as an IIFE over `globalThis`:
  - Consent keywords: `cookie`, `consent`, `gdpr`, `consentimento`, `consentimiento`, `einwilligung`.
  - Reject patterns (substring): `reject`, `decline`, `deny`, `refuse`, `necessary`, `essential`, `settings`, `preferences`, `manage`, `customi`, `options`, `learn more`, `policy`, `rejeitar`, `recusar`, `rechazar`, `refuser`, `ablehnen`, `configur`, `einstellungen`, `paramètres`, `do not`, `don't`, `disallow`, `disagree`, `only`.
  - Tier 3 (substring): `accept all`, `allow all`, `agree to all`, `aceitar tudo`, `aceitar todos`, `aceptar todo`, `tout accepter`, `alle akzeptieren`.
  - Tier 2 (substring): `accept`, `agree`, `allow`, `aceitar`, `aceito`, `aceptar`, `acepto`, `accepter`, `j'accepte`, `akzeptieren`, `zustimmen`, `concordo`.
  - Tier 1 (whole label after stripping leading and trailing non-letters): `got it`, `ok`, `okay`, `i understand`, `entendi`, `continue`.
  - `scoreLabel` returns 0 for empty or longer-than-40 labels, then checks reject, tier 3, tier 2, tier 1 in that order.
- [ ] **Step 4: Add `package.json`** with `"private": true` and `"scripts": { "test": "node --test test/" }`.
- [ ] **Step 5: Run `npm test` and confirm all pass.**
- [ ] **Step 6: Commit.**

### Task 2: DOM detector

**Files:**
- Create: `content/detector.js`

**Interfaces:**
- Consumes: `CookieMonster.matching.isBannerText`, `scoreLabel`.
- Produces `CookieMonster.detector`:
  - `find(): { banner: Element, button: Element } | null`
  - `watch(onFound: (hit) => void, opts?: { timeoutMs = 15000, throttleMs = 300 }): void` — scans immediately, rescans on DOM mutations (throttled), calls `onFound` at most once, stops after `timeoutMs`.

- [ ] **Step 1: Implement `find`.**
  - Collect clickables (`button, a, [role="button"], input[type="button"], input[type="submit"]`) from the document and, recursively, every open shadow root.
  - Label is `innerText || value || aria-label`. Skip elements whose `scoreLabel` is 0 before any layout work.
  - Skip invisible elements: zero-size bounding box, or `checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })` false.
  - Walk up ancestors (crossing shadow boundaries through `getRootNode().host`), stopping before `body`/`html`. The first ancestor that is an overlay and whose `innerText || textContent` passes `isBannerText` is the banner.
  - Overlay means computed `position` is `fixed` or `sticky`, or numeric `z-index >= 100`, or `dialog[open]`, or `role="dialog"`, or `aria-modal="true"`.
  - Return the hit with the highest score; first found wins ties.
- [ ] **Step 2: Implement `watch`** with a `MutationObserver` on `document.documentElement` (`childList`, `subtree`, and attributes `class`, `style`, `hidden`, `open`), a throttle timer that is not reset by further mutations, and a stop timer.
- [ ] **Step 3: Commit.** (Exercised end to end in Task 6.)

### Task 3: Character and animation

**Files:**
- Create: `content/character.js`, `content/monster.js`

**Interfaces:**
- Produces `CookieMonster.character`: `{ name: string, speech: string, shouts: string[], svg: string }`. The SVG uses classes `cm-pupil-l`, `cm-pupil-r`, `cm-mouth`, `cm-arm-l`, `cm-arm-r` for animation hooks.
- Produces `CookieMonster.monster.play(button: Element, hooks: { onEatStart(): void, onFinish(): void }): Promise<boolean>` — resolves `true` if the show completed and `onFinish` ran, `false` if aborted.

- [ ] **Step 1: Write `character.js`**: a 200x220 SVG of a blue furry monster (dashed round stroke for fur), two googly eyes, a large mouth, two arms.
- [ ] **Step 2: Write `monster.js`.**
  - Host: `div` appended to `document.documentElement`, inline style `all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none`, closed shadow root holding a `<style>` and the stage.
  - Charge (800 ms): start off-screen at the viewport edge nearest the button, animate `transform` to place the mouth over the button's centre. Body shakes and pupils spin throughout via CSS keyframes.
  - Eat (1,600 ms, 8 chomps at 200 ms): call `hooks.onEatStart()` once. Each chomp adds a radial-gradient bite to the button's inline `mask-image` (`mask-composite: intersect`, plus the `-webkit-` forms), spawns crumbs coloured from the button's background, and pops a shout from `character.shouts`. The final chomp makes the mask fully transparent.
  - Before each chomp, if `!button.isConnected`, abort and resolve `false`.
  - Finish: call `hooks.onFinish()`, then exit (600 ms) toward the entry edge.
  - `finally`: remove the host and restore the button's original `style` attribute exactly (remove the attribute if there was none).
- [ ] **Step 3: Commit.**

### Task 4: Sound

**Files:**
- Create: `background.js`, `offscreen.html`, `offscreen.js`

**Interfaces:**
- Consumes: runtime message `{ type: "nom" }` from the content script.
- Produces: runtime message `{ type: "crunch" }` from the service worker to the offscreen document.

- [ ] **Step 1: `background.js`**: on `nom`, call `chrome.tts.speak("Om nom nom nom! Cookie!", { pitch: 0.1, rate: 0.9 })`; create the offscreen document (`reasons: ["AUDIO_PLAYBACK"]`) if `chrome.offscreen.hasDocument()` is false, swallowing the "already exists" race; then send `crunch`.
- [ ] **Step 2: `offscreen.js`**: on `crunch`, schedule 8 noise bursts 200 ms apart, each 90 ms of decaying white noise through a band-pass filter at a random 1,200 to 2,700 Hz.
- [ ] **Step 3: Commit.**

### Task 5: Orchestration, popup, manifest, icons

**Files:**
- Create: `content/main.js`, `popup.html`, `popup.js`, `manifest.json`, `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`

**Interfaces:**
- Consumes: `CookieMonster.detector.watch`, `CookieMonster.monster.play`, storage keys `enabled`, `sound`.

- [ ] **Step 1: `main.js`**: read settings with defaults; return if disabled; `watch` for a hit; with `prefers-reduced-motion: reduce` click immediately; otherwise `play` with `onEatStart` sending `nom` when sound is on (failures ignored) and `onFinish` clicking the button. Everything inside `try/catch`.
- [ ] **Step 2: Popup**: two checkboxes bound to `enabled` and `sound` in `chrome.storage.sync`.
- [ ] **Step 3: `manifest.json`**: content scripts in order `matching.js`, `detector.js`, `character.js`, `monster.js`, `main.js`.
- [ ] **Step 4: Icons**: generate three PNGs of the monster's face.
- [ ] **Step 5: Commit.**

### Task 6: Fixtures, verification, README

**Files:**
- Create: `test/fixtures/banner-basic.html`, `banner-late.html`, `banner-shadow.html`, `banner-pt.html`, `no-banner.html`, `cookie-recipe.html`, `README.md`

- [ ] **Step 1: Write the fixtures.** Each banner's accept button removes the banner and sets `document.title` to `accepted`; each reject button sets it to `rejected`.
- [ ] **Step 2: Verify in headless Chrome** using throwaway harness pages (outside the repo) that load each fixture's markup plus the content scripts with a stubbed `chrome` object. Expected titles: the four banner fixtures end as `accepted`; `no-banner` and `cookie-recipe` are unchanged. Add a harness variant that removes the button mid-show and expect no click and no leftover overlay (Review Focus 5).
- [ ] **Step 3: Write `README.md`**: how to load unpacked, how to run the tests, how to try the fixtures, how to swap the character.
- [ ] **Step 4: Commit.**
