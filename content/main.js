// Entry point: wait for a cookie banner, run the show, accept.
(async function (root) {
  'use strict';

  const { detector, monster } = root.CookieMonster;

  function requestSound() {
    try {
      chrome.runtime.sendMessage({ type: 'nom' }).catch(() => {});
    } catch {
      // The extension was reloaded under this page; sound is optional.
    }
  }

  try {
    const { enabled, sound } = await chrome.storage.sync.get({ enabled: true, sound: true });
    if (!enabled) return;

    detector.watch(async ({ button }) => {
      try {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
          button.click();
          return;
        }
        await monster.play(button, {
          onEatStart: () => sound && requestSound(),
          onFinish: () => button.click(),
        });
      } catch (error) {
        console.warn('Cookie Monster: show failed', error);
      }
    });
  } catch (error) {
    console.warn('Cookie Monster: could not start', error);
  }
})(globalThis);
