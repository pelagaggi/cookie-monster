# Cookie Monster

A Chrome extension. When a cookie banner shows up, a hungry blue monster
charges onto the screen, eats the accept button, and accepts for you.

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.

The toolbar popup has two toggles: one turns the monster off, the other mutes
his sounds. Changes apply to pages you load next.

## How it works

- `content/matching.js` decides whether text looks like a cookie banner and
  which button label means "accept". It never picks reject or settings buttons.
- `content/detector.js` looks for a visible accept button inside an overlay
  (fixed, sticky, high z-index, or a dialog) that mentions cookies or consent.
  It watches the page for 15 seconds and acts at most once per page load.
- `content/monster.js` plays the show and `content/main.js` clicks the button.
- `background.js` speaks through Chrome's text-to-speech and `offscreen.js`
  synthesizes the crunches.

With "reduce motion" turned on in your system settings, the button is clicked
without the show.

## Limits

- Banners inside iframes or closed shadow roots are not detected.
- Banners that contain a text field or dropdown (for example a language
  picker) are skipped, because that is how login and checkout forms are told
  apart from banners.
- If you click inside the banner during the show, the monster backs off and
  nothing is accepted.
- When a banner has no accept button, the monster eats its close (✕) button
  instead. On most such banners closing means accepting the defaults.
- It only ever accepts. It does not reject cookies or choose options.
- In a background tab the show waits until you look at the tab.

## Tests

```
npm test
```

Runs the unit tests for the text matching (Node 18 or newer, no dependencies).

To try the monster on sample pages:

```
cd test/fixtures && python3 -m http.server 8765
```

Then open `http://localhost:8765/` and pick a page. The six `banner-*` pages
should get eaten; the other pages (no banner, a cookie recipe, a login dialog,
a newsletter modal) should be left alone.

## Changing the character

The monster's art, name, and voice line live in `content/character.js`. To
publish this extension, replace them with an original character and change the
`name` in `manifest.json`: Cookie Monster belongs to Sesame Workshop.
