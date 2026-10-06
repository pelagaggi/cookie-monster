// Draws the monster in an isolated overlay and plays the eating show.
(function (root) {
  'use strict';

  const { character } = root.CookieMonster;

  const WIDTH = 180;
  const HEIGHT = 198;
  // Where the mouth sits inside the monster box, as a fraction of its size.
  const MOUTH = { x: 0.5, y: 0.7 };
  const CHARGE_MS = 800;
  const CHOMP_MS = 200;
  const CHOMPS = 8;
  const EXIT_MS = 600;
  const COOKIE_BROWN = '#b5651d';
  // Horizontal position of each bite, as a fraction of the button's width.
  const BITE_SPOTS = [0.9, 0.1, 0.7, 0.3, 0.5, 0.8, 0.2];
  const MASK_PROPS = ['-webkit-mask-image', '-webkit-mask-composite', 'mask-image', 'mask-composite'];

  const CSS = `
.stage { position: fixed; inset: 0; overflow: hidden; }
.monster { position: absolute; left: 0; top: 0; width: ${WIDTH}px; height: ${HEIGHT}px; will-change: transform; }
.wobble { width: 100%; height: 100%; animation: cm-shake .12s linear infinite alternate; }
.eating .wobble { animation-duration: .07s; }
@keyframes cm-shake {
  from { transform: rotate(-7deg) translateY(-3px); }
  to { transform: rotate(7deg) translateY(3px); }
}
.cm-pupil-l { transform-origin: 72px 48px; animation: cm-spin .35s linear infinite; }
.cm-pupil-r { transform-origin: 128px 48px; animation: cm-spin .28s linear infinite reverse; }
@keyframes cm-spin { to { transform: rotate(360deg); } }
.cm-mouth { transform-origin: 100px 120px; transform: scaleY(.35); }
.eating .cm-mouth { animation: cm-chomp ${CHOMP_MS}ms ease-in-out infinite; }
@keyframes cm-chomp {
  0%, 100% { transform: scaleY(.2); }
  50% { transform: scaleY(1.1); }
}
.cm-arm-l { transform-origin: 40px 120px; animation: cm-flail .15s ease-in-out infinite alternate; }
.cm-arm-r { transform-origin: 160px 120px; animation: cm-flail .15s ease-in-out infinite alternate-reverse; }
@keyframes cm-flail {
  from { transform: rotate(-35deg); }
  to { transform: rotate(35deg); }
}
.crumb { position: absolute; width: 8px; height: 8px; border-radius: 40%; }
.shout {
  position: absolute;
  font: 900 34px Impact, 'Arial Black', sans-serif;
  color: #ffd60a;
  -webkit-text-stroke: 2px #111;
  white-space: nowrap;
}`;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const at = (point, extra = '') => `translate(${point.x}px, ${point.y}px) ${extra}`;

  function div(className) {
    const el = document.createElement('div');
    el.className = className;
    return el;
  }

  function buildOverlay() {
    const host = document.createElement('div');
    host.setAttribute(
      'style',
      'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;'
    );
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    const stage = div('stage');
    const monster = div('monster');
    const wobble = div('wobble');
    const art = new DOMParser().parseFromString(character.svg, 'image/svg+xml').documentElement;
    wobble.append(document.importNode(art, true));
    monster.append(wobble);
    stage.append(monster);
    shadow.append(style, stage);
    document.documentElement.append(host);
    return { host, stage, monster };
  }

  // Off-screen starting point at the viewport edge nearest the button.
  function startPoint(center, target) {
    const distances = {
      left: center.x,
      right: innerWidth - center.x,
      top: center.y,
      bottom: innerHeight - center.y,
    };
    const edge = Object.keys(distances).reduce((a, b) => (distances[a] <= distances[b] ? a : b));
    const margin = 40;
    switch (edge) {
      case 'left': return { x: -WIDTH - margin, y: target.y };
      case 'right': return { x: innerWidth + margin, y: target.y };
      case 'top': return { x: target.x, y: -HEIGHT - margin };
      default: return { x: target.x, y: innerHeight + margin };
    }
  }

  function saveMask(button) {
    return MASK_PROPS.map((prop) => [
      prop,
      button.style.getPropertyValue(prop),
      button.style.getPropertyPriority(prop),
    ]);
  }

  function restoreMask(button, saved) {
    for (const [prop, value, priority] of saved) {
      if (value) button.style.setProperty(prop, value, priority);
      else button.style.removeProperty(prop);
    }
  }

  function applyBites(button, bites, eatenWhole) {
    const image = eatenWhole
      ? 'linear-gradient(transparent, transparent)'
      : bites
          .map((b) => `radial-gradient(circle at ${b.x}px ${b.y}px, transparent ${b.r}px, #000 ${b.r + 1}px)`)
          .join(', ');
    button.style.setProperty('-webkit-mask-image', image, 'important');
    button.style.setProperty('-webkit-mask-composite', 'source-in', 'important');
    button.style.setProperty('mask-image', image, 'important');
    button.style.setProperty('mask-composite', 'intersect', 'important');
  }

  function nextBite(rect, index) {
    return {
      x: Math.round(rect.width * BITE_SPOTS[index % BITE_SPOTS.length]),
      y: Math.round(rect.height * (index % 2 ? 0.85 : 0.15)),
      r: Math.round(clamp(Math.min(rect.width, rect.height) * 0.5, 8, 40)),
    };
  }

  function spawnCrumbs(stage, center, buttonColor) {
    for (let i = 0; i < 6; i++) {
      const crumb = div('crumb');
      crumb.style.left = `${center.x}px`;
      crumb.style.top = `${center.y}px`;
      crumb.style.background = i % 2 ? buttonColor : COOKIE_BROWN;
      stage.append(crumb);
      const dx = random(-110, 110);
      const dy = random(-100, -20);
      crumb.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx * 0.6}px, ${dy}px) rotate(180deg)`, opacity: 1 },
          { transform: `translate(${dx}px, 90px) rotate(360deg)`, opacity: 0 },
        ],
        { duration: 600, easing: 'ease-out' }
      ).onfinish = () => crumb.remove();
    }
  }

  function spawnShout(stage, center, text) {
    const shout = div('shout');
    shout.textContent = text;
    shout.style.left = `${clamp(center.x + random(-140, 60), 10, innerWidth - 170)}px`;
    shout.style.top = `${clamp(center.y - HEIGHT + random(-40, 30), 10, innerHeight - 50)}px`;
    stage.append(shout);
    const tilt = random(-20, 20);
    shout.animate(
      [
        { transform: `scale(.3) rotate(${tilt}deg)`, opacity: 0 },
        { transform: `scale(1.3) rotate(${tilt}deg)`, opacity: 1, offset: 0.3 },
        { transform: `scale(1) rotate(${tilt}deg)`, opacity: 1, offset: 0.7 },
        { transform: `scale(1.1) rotate(${tilt}deg)`, opacity: 0 },
      ],
      { duration: 550 }
    ).onfinish = () => shout.remove();
  }

  // Resolves true when the show completed and hooks.onFinish ran, false when
  // the button vanished part-way and nothing was clicked.
  async function play(button, hooks) {
    const savedMask = saveMask(button);
    const { host, stage, monster } = buildOverlay();
    try {
      const rect = button.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const target = { x: center.x - WIDTH * MOUTH.x, y: center.y - HEIGHT * MOUTH.y };
      const start = startPoint(center, target);

      await monster.animate([{ transform: at(start) }, { transform: at(target) }], {
        duration: CHARGE_MS,
        easing: 'cubic-bezier(.3, 1.5, .6, 1)',
        fill: 'forwards',
      }).finished;
      if (!button.isConnected) return false;

      monster.classList.add('eating');
      hooks.onEatStart();
      const background = getComputedStyle(button).backgroundColor;
      const buttonColor = /^(transparent|rgba\(0, 0, 0, 0\))$/.test(background) ? COOKIE_BROWN : background;
      const bites = [];
      for (let i = 0; i < CHOMPS; i++) {
        if (!button.isConnected) return false;
        bites.push(nextBite(rect, i));
        applyBites(button, bites, i === CHOMPS - 1);
        spawnCrumbs(stage, center, buttonColor);
        if (i % 2 === 0) spawnShout(stage, center, character.shouts[(i / 2) % character.shouts.length]);
        await sleep(CHOMP_MS);
      }
      if (!button.isConnected) return false;

      hooks.onFinish();
      monster.classList.remove('eating');
      await monster.animate(
        [{ transform: at(target, 'rotate(0deg)') }, { transform: at(start, 'rotate(360deg)') }],
        { duration: EXIT_MS, easing: 'ease-in', fill: 'forwards' }
      ).finished;
      return true;
    } finally {
      host.remove();
      restoreMask(button, savedMask);
    }
  }

  root.CookieMonster.monster = { play };
})(globalThis);
