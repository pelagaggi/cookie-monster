// The monster's look and voice. To ship a different character (for example
// an original one for the Chrome Web Store), change only this file. Keep the
// cm-* classes and the 200x220 viewBox: monster.js animates them.
(function (root) {
  'use strict';

  const FUR = '#2f6fe0';
  const FUR_DARK = '#1f4fa8';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="100%" height="100%">
  <ellipse class="cm-arm-l" cx="24" cy="138" rx="15" ry="36" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="2"/>
  <ellipse class="cm-arm-r" cx="176" cy="138" rx="15" ry="36" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="2"/>
  <circle cx="100" cy="128" r="76" fill="${FUR}" stroke="${FUR}" stroke-width="14" stroke-dasharray="3 9" stroke-linecap="round"/>
  <circle cx="72" cy="48" r="27" fill="#fff" stroke="${FUR_DARK}" stroke-width="2"/>
  <circle cx="128" cy="48" r="27" fill="#fff" stroke="${FUR_DARK}" stroke-width="2"/>
  <circle class="cm-pupil-l" cx="82" cy="56" r="10" fill="#111"/>
  <circle class="cm-pupil-r" cx="120" cy="38" r="10" fill="#111"/>
  <path class="cm-mouth" d="M42 122 Q100 104 158 122 Q154 198 100 198 Q46 198 42 122 Z" fill="#161616"/>
</svg>`;

  root.CookieMonster.character = {
    name: 'Cookie Monster',
    speech: 'Om nom nom nom! Cookie!',
    shouts: ['OM', 'NOM', 'NOM!', 'COOKIE!'],
    svg,
  };
})(globalThis);
