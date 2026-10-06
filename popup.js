const DEFAULTS = { enabled: true, sound: true };

chrome.storage.sync.get(DEFAULTS).then((settings) => {
  for (const key of Object.keys(DEFAULTS)) {
    const checkbox = document.getElementById(key);
    checkbox.checked = settings[key];
    checkbox.addEventListener('change', () => {
      chrome.storage.sync.set({ [key]: checkbox.checked });
    });
  }
});
