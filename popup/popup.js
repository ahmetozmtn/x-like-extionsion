// DOM Elements
const addAccountForm = document.getElementById('addAccountForm');
const usernameInput = document.getElementById('usernameInput');
const accountsList = document.getElementById('accountsList');
const likeEnabled = document.getElementById('likeEnabled');
const retweetEnabled = document.getElementById('retweetEnabled');
const autoMode = document.getElementById('autoMode');
const scanButton = document.getElementById('scanButton');
const statusIndicator = document.getElementById('statusIndicator');
const statsText = document.getElementById('statsText');

// State
let accounts = [];
let settings = {
  likeEnabled: true,
  retweetEnabled: false,
  autoMode: true
};
let processedCount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadData();
  renderAccounts();
  updateStatus();
  setupEventListeners();
}

// Load data from storage
async function loadData() {
  try {
    const result = await chrome.storage.sync.get(['accounts', 'settings', 'processedCount']);
    accounts = result.accounts || [];
    settings = result.settings || settings;
    processedCount = result.processedCount || 0;
    
    // Update UI with loaded settings
    likeEnabled.checked = settings.likeEnabled;
    retweetEnabled.checked = settings.retweetEnabled;
    autoMode.checked = settings.autoMode;
    statsText.textContent = `${processedCount} tweet işlendi`;
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to storage
async function saveData() {
  try {
    await chrome.storage.sync.set({ accounts, settings });
    // Notify content script about settings change
    notifyContentScript({ type: 'SETTINGS_UPDATED', accounts, settings });
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  addAccountForm.addEventListener('submit', handleAddAccount);
  likeEnabled.addEventListener('change', handleSettingChange);
  retweetEnabled.addEventListener('change', handleSettingChange);
  autoMode.addEventListener('change', handleSettingChange);
  scanButton.addEventListener('click', handleScan);
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STATS_UPDATE') {
      processedCount = message.count;
      statsText.textContent = `${processedCount} tweet işlendi`;
    }
  });
  
  // Listen for storage changes (when accounts added from page)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.accounts) {
      accounts = changes.accounts.newValue || [];
      renderAccounts();
      updateStatus();
    }
  });
}

// Handle add account
function handleAddAccount(e) {
  e.preventDefault();
  
  let username = usernameInput.value.trim().toLowerCase();
  
  // Remove @ if present
  if (username.startsWith('@')) {
    username = username.substring(1);
  }
  
  // Validate username
  if (!username) {
    return;
  }
  
  // Check for valid username format
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
    alert('Geçersiz kullanıcı adı formatı');
    return;
  }
  
  // Check if already exists
  if (accounts.includes(username)) {
    alert('Bu hesap zaten ekli');
    return;
  }
  
  accounts.push(username);
  saveData();
  renderAccounts();
  updateStatus();
  
  usernameInput.value = '';
  usernameInput.focus();
}

// Handle remove account
function handleRemoveAccount(username) {
  accounts = accounts.filter(acc => acc !== username);
  saveData();
  renderAccounts();
  updateStatus();
}

// Handle setting change
function handleSettingChange() {
  settings.likeEnabled = likeEnabled.checked;
  settings.retweetEnabled = retweetEnabled.checked;
  settings.autoMode = autoMode.checked;
  saveData();
  updateStatus();
}

// Handle manual scan
async function handleScan() {
  scanButton.classList.add('scanning');
  scanButton.innerHTML = '<span class="btn-icon">⏳</span> Taranıyor...';
  
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || (!tab.url.includes('x.com') && !tab.url.includes('twitter.com'))) {
      alert('Lütfen X (Twitter) sayfasında olduğunuzdan emin olun');
      return;
    }
    
    // Send scan message to content script
    await chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_SCAN' });
    
  } catch (error) {
    console.error('Scan error:', error);
    alert('Tarama başlatılamadı. Sayfayı yenileyin ve tekrar deneyin.');
  } finally {
    setTimeout(() => {
      scanButton.classList.remove('scanning');
      scanButton.innerHTML = '<span class="btn-icon">🔍</span> Şimdi Tara';
    }, 2000);
  }
}

// Render accounts list
function renderAccounts() {
  if (accounts.length === 0) {
    accountsList.innerHTML = '<p class="empty-message">Henüz hesap eklenmedi</p>';
    return;
  }
  
  accountsList.innerHTML = accounts.map(username => `
    <div class="account-item">
      <span class="account-name">${escapeHtml(username)}</span>
      <button class="btn-remove" data-username="${escapeHtml(username)}">Kaldır</button>
    </div>
  `).join('');
  
  // Add event listeners to remove buttons
  accountsList.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      handleRemoveAccount(btn.dataset.username);
    });
  });
}

// Update status indicator
function updateStatus() {
  const isActive = accounts.length > 0 && (settings.likeEnabled || settings.retweetEnabled);
  
  if (isActive) {
    statusIndicator.classList.add('active');
    statusIndicator.querySelector('.status-text').textContent = 'Aktif';
  } else {
    statusIndicator.classList.remove('active');
    statusIndicator.querySelector('.status-text').textContent = 'Pasif';
  }
}

// Notify content script
async function notifyContentScript(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && (tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
      await chrome.tabs.sendMessage(tab.id, message);
    }
  } catch (error) {
    // Content script might not be loaded yet, that's okay
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
