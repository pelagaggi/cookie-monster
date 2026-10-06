// Synthesizes crunch sounds. Lives in an offscreen document because service
// workers have no Web Audio and pages block audio before a user gesture.
const CRUNCHES = 8;
const CRUNCH_GAP_S = 0.2;
const CRUNCH_LENGTH_S = 0.09;

let audio;

function scheduleCrunch(startTime) {
  const length = Math.floor(audio.sampleRate * CRUNCH_LENGTH_S);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  }

  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200 + Math.random() * 1500;
  filter.Q.value = 0.8;
  const gain = audio.createGain();
  gain.gain.value = 0.6;

  source.connect(filter).connect(gain).connect(audio.destination);
  source.start(startTime);
}

async function playCrunches() {
  audio ??= new AudioContext();
  await audio.resume();
  for (let i = 0; i < CRUNCHES; i++) {
    scheduleCrunch(audio.currentTime + i * CRUNCH_GAP_S + Math.random() * 0.04);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'crunch') playCrunches();
});
