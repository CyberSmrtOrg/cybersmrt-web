/**
 * CyberSmrt Password Guardian - Popup Script
 * Handles popup UI interactions and statistics
 */

document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enableToggle');
  const fieldsMonitored = document.getElementById('fieldsMonitored');
  const breachesFound = document.getElementById('breachesFound');

  // Load saved settings
  chrome.storage.local.get(['enabled', 'stats'], (result) => {
    if (result.enabled !== undefined) {
      enableToggle.checked = result.enabled;
    }

    if (result.stats) {
      fieldsMonitored.textContent = result.stats.fieldsMonitored || 0;
      breachesFound.textContent = result.stats.breachesFound || 0;
    }
  });

  // Handle toggle changes
  enableToggle.addEventListener('change', () => {
    const enabled = enableToggle.checked;
    chrome.storage.local.set({ enabled });

    // Reload all tabs to apply changes
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && !tab.url.startsWith('chrome://')) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  });

  // Update stats periodically
  setInterval(() => {
    chrome.storage.local.get(['stats'], (result) => {
      if (result.stats) {
        fieldsMonitored.textContent = result.stats.fieldsMonitored || 0;
        breachesFound.textContent = result.stats.breachesFound || 0;
      }
    });
  }, 1000);
});
