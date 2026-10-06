// Service worker: plays the monster's sounds when a content script asks.
const SPEECH = 'Om nom nom nom! Cookie!';

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play cookie crunching sounds.',
    });
  } catch (error) {
    // Two tabs can race to create it; the loser finds it already there.
    if (!(await chrome.offscreen.hasDocument())) throw error;
  }
}

async function crunch() {
  await ensureOffscreenDocument();
  await chrome.runtime.sendMessage({ type: 'crunch' });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'nom') return;
  chrome.tts.speak(SPEECH, { pitch: 0.1, rate: 0.9 });
  crunch().catch((error) => console.warn('Cookie Monster: crunch failed', error));
});
