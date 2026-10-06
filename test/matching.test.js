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

test('accept words must be whole words', () => {
  for (const label of ['Halloween Cookies', 'User Agreement', 'Accepted cards', 'Allowance']) {
    assert.equal(m.scoreLabel(label), 0, label);
  }
  assert.equal(m.scoreLabel('Accept & close'), 2);
  assert.equal(m.scoreLabel('Accept cookies'), 2);
});

test('negated and partial accepts in other phrasings score 0', () => {
  for (const label of ['Continuer sans accepter', 'Continue without accepting', 'Não aceito',
    'No acepto', 'Nicht akzeptieren', 'Nur notwendige akzeptieren', 'Accept selected', 'Not now']) {
    assert.equal(m.scoreLabel(label), 0, label);
  }
});

test('labels that buy, pay, subscribe or sign in score 0', () => {
  for (const label of ['Agree & pay', 'Agree and subscribe', 'Accept and sign up', 'Agree & place order', 'Accept and log in']) {
    assert.equal(m.scoreLabel(label), 0, label);
  }
});

test('mentionsCookies is true only for cookie wording', () => {
  assert.equal(m.mentionsCookies('We use COOKIES on this site'), true);
  assert.equal(m.mentionsCookies('I consent to receive marketing emails'), false);
});
