// X Auto Like & Retweet - Background Service Worker

// Default settings
const DEFAULT_SETTINGS = {
  likeEnabled: true,
  retweetEnabled: false,
  autoMode: true
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default values
    await chrome.storage.sync.set({
      accounts: [],
      settings: DEFAULT_SETTINGS,
      processedCount: 0
    });
    console.log('X Auto Like & Retweet extension installed');
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_DATA':
      handleGetData(sendResponse);
      return true; // Keep channel open for async response
      
    case 'UPDATE_PROCESSED_COUNT':
      handleUpdateProcessedCount(message.count);
      break;
      
    case 'LOG':
      console.log('[Content Script]', message.data);
      break;
  }
});

// Handle get data request
async function handleGetData(sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['accounts', 'settings']);
    sendResponse({
      success: true,
      accounts: result.accounts || [],
      settings: result.settings || DEFAULT_SETTINGS
    });
  } catch (error) {
    console.error('Error getting data:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle processed count update
async function handleUpdateProcessedCount(count) {
  try {
    await chrome.storage.sync.set({ processedCount: count });
  } catch (error) {
    console.error('Error updating processed count:', error);
  }
}

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('x.com') || tab.url.includes('twitter.com')) {
      // Content script should already be injected via manifest
      // But we can send a ping to ensure it's ready
      chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => {
        // Content script not ready yet, that's okay
      });
    }
  }
});

// Handle storage changes and notify tabs
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    // Notify all X/Twitter tabs about the change
    chrome.tabs.query({ url: ['*://x.com/*', '*://twitter.com/*'] }, (tabs) => {
      const updateMessage = {
        type: 'STORAGE_CHANGED',
        changes: {}
      };
      
      if (changes.accounts) {
        updateMessage.changes.accounts = changes.accounts.newValue;
      }
      if (changes.settings) {
        updateMessage.changes.settings = changes.settings.newValue;
      }
      
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, updateMessage).catch(() => {
          // Tab might not have content script loaded
        });
      });
    });
  }
});
