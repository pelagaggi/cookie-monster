// Entry point: wait for a cookie banner, run the show, accept.
(async function (root) {
  'use strict';

  const { detector, monster } = root.CookieMonster;

  try {
    const { enabled } = await chrome.storage.sync.get({ enabled: true });
    if (!enabled) return;

    detector.watch(async (hit) => {
      const { button } = hit;
      try {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
          button.click();
          return;
        }
        await monster.play(hit, { onFinish: () => button.click() });
      } catch (error) {
        console.warn('Cookie Monster: show failed', error);
      }
    });
  } catch (error) {
    console.warn('Cookie Monster: could not start', error);
  }
})(globalThis);
