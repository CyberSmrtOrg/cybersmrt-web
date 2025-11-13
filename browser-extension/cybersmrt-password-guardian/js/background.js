/**
 * CyberSmrt Password Guardian - Background Service Worker
 * Handles extension lifecycle and messaging
 */

// Extension installed/updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[CyberSmrt] Extension installed');

    // Open welcome page
    chrome.tabs.create({
      url: 'https://cybersmrt.org/tools/password-checker.html'
    });
  } else if (details.reason === 'update') {
    console.log('[CyberSmrt] Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkBreach') {
    // Content script can handle this directly with fetch
    // This is here for future enhancements
    return false;
  }
});

// Icon badge to show active monitoring
chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
chrome.action.setBadgeText({ text: '🛡️' });

console.log('[CyberSmrt] Background service worker initialized');
