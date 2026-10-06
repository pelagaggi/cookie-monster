# Cookie Monster Chrome Extension — Design

> Update: sound was removed at the user's request after the first build. The
> extension is silent; there is no service worker, offscreen document, or
> sound setting, and the only permission is `storage`. Sections below that
> describe sound are historical.

Date: 2026-10-06

## Purpose

A Chrome extension for personal use (loaded unpacked) that makes cookie-consent
banners fun: when a banner appears, a Cookie Monster character charges onto the
screen, goes wild, eats the accept button, and the extension clicks accept.

Success: it is funny to watch, and the banner is really gone afterwards.

The extension may be published to the Chrome Web Store later, so the character
art and name must be swappable for an original, store-safe monster.

## Decisions

- Manifest V3, plain JavaScript and CSS, no build step, no runtime dependencies.
- Accepts all cookies only. It never rejects or picks options.
- Detection uses heuristics only (no consent-platform selector lists, no
  community rule lists).
- Sound is on by default, with a mute toggle in the popup.
- The monster is SVG/CSS drawn in the project, not downloaded artwork.

## Files

| File | Job |
|---|---|
| `manifest.json` | MV3 manifest. Content scripts on `<all_urls>`, top frame only, `document_idle`. Permissions: `storage`, `tts`, `offscreen`. |
| `content/matching.js` | Pure text-matching functions: keyword tests and button scoring. No DOM layout access. |
| `content/detector.js` | Finds the banner element and its accept button in the live DOM. |
| `content/character.js` | The monster's SVG markup and display name. The only file to change for a store-safe character. |
| `content/monster.js` | Builds the overlay, runs the animation and the eating effect. |
| `content/main.js` | Orchestrates: read settings, detect, animate, click. |
| `background.js` | Service worker. Receives a "play sound" message, speaks via `chrome.tts`, and ensures the offscreen document exists for crunches. |
| `offscreen.html`, `offscreen.js` | Synthesizes crunch sounds with Web Audio. |
| `popup.html`, `popup.js` | Two toggles: enabled, sound. |
| `icons/` | Extension icons (16, 48, 128). |
| `test/` | Unit tests and fixture pages. |

Content scripts are listed in the manifest in dependency order and share one
namespace object (`globalThis.CookieMonster`) because manifest content scripts
cannot use ES module imports. `matching.js` also exports through
`module.exports` when it exists, so Node can test it.

## Settings

Stored in `chrome.storage.sync`:

- `enabled` (boolean, default `true`)
- `sound` (boolean, default `true`)

## Detection

### Banner candidate

An element qualifies as a banner when all of these hold:

1. It is visible: non-zero box, not `display: none`, not `visibility: hidden`,
   opacity above 0.
2. It is positioned as an overlay: computed `position` is `fixed` or `sticky`,
   or it has a `z-index` of 100 or more, or it is a `<dialog open>` or has
   `role="dialog"` / `aria-modal="true"`.
3. Its text contains a consent keyword: `cookie`, `consent`, `gdpr`,
   `consentimento`, `consentimiento`, `einwilligung`. Privacy wording alone
   does not qualify, so sign-up and login dialogs that mention a privacy
   policy are not treated as banners.
4. Its text is at most 2,000 characters. This keeps articles and whole pages
   from qualifying.

### Accept button

Inside a candidate, consider visible `button`, `a`, `[role="button"]`, and
`input[type="button"|"submit"]` elements. Text is taken from `innerText`,
`value`, or `aria-label`, trimmed, lowercased, and limited to 40 characters
(longer text is not a button label).

- Reject patterns exclude an element: `reject`, `decline`, `deny`, `refuse`,
  `necessary`, `essential`, `settings`, `preferences`, `manage`, `customi`,
  `options`, `learn more`, `policy`, `rejeitar`, `recusar`, `rechazar`,
  `refuser`, `ablehnen`, `configur`, `einstellungen`, `paramètres`, `do not`,
  `don't`, `disallow`, `disagree`, `only`.
- Accept patterns, scored:
  - 3: `accept all`, `allow all`, `agree to all`, `aceitar tudo`,
    `aceitar todos`, `aceptar todo`, `tout accepter`, `alle akzeptieren`
  - 2: `accept`, `agree`, `allow`, `aceitar`, `aceito`, `aceptar`, `acepto`,
    `accepter`, `j'accepte`, `akzeptieren`, `zustimmen`, `concordo`
  - 1: `got it`, `ok`, `okay`, `i understand`, `entendi`, `continue`. These
    must be the whole label, so "More about cookies" does not match `ok`.

Rules added after code review, to stop misfires on ordinary pages:

- Accept patterns in tiers 3 and 2 match whole words only, so "allow" does not
  match "Halloween" and "agree" does not match "Agreement".
- Further reject patterns cover negations and partial accepts (`without`,
  `not `, `later`, `selected`, `sans`, `não`, `no `, `sin `, `nicht`, `ohne`,
  `nur`, `notwendig`, `auswahl`) and anything transactional (`pay`, `buy`,
  `order`, `purchase`, `checkout`, `subscribe`, `sign`, `log in`, `login`).
- Close buttons (`close`, `dismiss`, `x`, `×`, `fechar`, `cerrar`, `fermer`,
  `schließen`, read from text, `aria-label` or `title`) count as tier 1, for
  banners that have no accept button and treat closing as acceptance.
- A tier-1 label is only trusted when the banner text contains `cookie`.
- A container holding a text-entry field (text, email, password, tel, number,
  search, textarea, select) is a form, not a banner.
- During the show, the click is cancelled if the button is no longer visible
  or the user presses anywhere inside the banner.

The highest-scoring element wins; ties go to the first in document order. If
nothing scores, there is no detection.

### Scanning

- Scan once at `document_idle`, then on DOM mutations (debounced 300 ms) for
  15 seconds, then stop observing.
- The scan walks the document and open shadow roots.
- The extension acts at most once per page load.
- If nothing is found, nothing happens. There is no fallback guess.

## The show

Total length about 3 seconds. The overlay is a fixed, full-viewport host element
with a closed shadow root and `pointer-events: none`, so page styles cannot
affect the monster and the monster cannot block the page.

1. **Charge (about 0.8 s).** The monster enters from the screen edge nearest the
   button and runs to it, shaking, with googly eyes spinning.
2. **Eat (about 1.6 s).** The monster chomps repeatedly. Each chomp adds a
   bite to the real button using a CSS `mask-image` of radial gradients set as
   an inline style, so chunks visibly disappear. Crumbs fly from the button and
   "OM NOM NOM" comic text pops up. Sound plays here.
3. **Click and exit (about 0.6 s).** The real button is clicked with
   `element.click()` while still masked, and the monster leaves the screen.
   The overlay is then removed and the button's original style restored.

Rules:

- If `prefers-reduced-motion: reduce` is set, skip the show and click
  immediately.
- If the button disappears or is detached during the show, stop the show,
  remove the overlay, and do not click.
- Any exception in the show still results in overlay removal and restoring the
  button's inline style.

## Sound

- The content script sends `{ type: "nom" }` to the service worker when the Eat
  phase starts, only if `sound` is on.
- The service worker calls `chrome.tts.speak("Om nom nom nom! Cookie!")` with
  low pitch and slightly slow rate.
- The service worker creates the offscreen document (reason `AUDIO_PLAYBACK`)
  if it does not exist, then forwards a message to it. The offscreen document
  plays a sequence of short filtered-noise bursts as crunches.
- No audio files are shipped.

## Error handling

- Detection and show code is wrapped so a failure never breaks the host page.
- Messages to the service worker ignore failures; sound is optional.
- With `enabled` off, the content script does nothing.

## Testing

- `test/matching.test.js` uses Node's built-in test runner (`node --test`) to
  cover keyword detection, reject exclusion, scoring, and tie-breaking in
  `content/matching.js`. No dependencies.
- `test/fixtures/` holds manual test pages opened in Chrome with the extension
  loaded:
  - `banner-basic.html`: fixed bottom banner with Accept all / Reject.
  - `banner-late.html`: banner injected after 3 seconds.
  - `banner-shadow.html`: banner inside an open shadow root.
  - `banner-pt.html`: Portuguese banner.
  - `no-banner.html`: ordinary page; nothing must happen.
  - `cookie-recipe.html`: article about baking cookies with a sticky header;
    nothing must happen.
  - `login-dialog.html`: sign-in dialog mentioning a cookie policy; nothing
    must happen.
  - `newsletter-modal.html`: marketing-consent modal with an OK button;
    nothing must happen.

## Out of scope

- Banners inside iframes.
- Closed shadow roots.
- Rejecting cookies or choosing options.
- Chrome Web Store packaging, store assets, and privacy policy.
