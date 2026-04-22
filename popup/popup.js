// DOM Elements
const addAccountForm = document.getElementById("addAccountForm");
const usernameInput = document.getElementById("usernameInput");
const accountsList = document.getElementById("accountsList");

const addWordForm = document.getElementById("addWordForm");
const wordInput = document.getElementById("wordInput");
const wordsList = document.getElementById("wordsList");

const likeEnabled = document.getElementById("likeEnabled");
const retweetEnabled = document.getElementById("retweetEnabled");
const autoMode = document.getElementById("autoMode");
const autoScroll = document.getElementById("autoScroll");
const autoScrollToggle = document.getElementById("autoScrollToggle");
const scrollSpeed = document.getElementById("scrollSpeed");
const scrollSpeedLabel = document.getElementById("scrollSpeedLabel");
const scrollSpeedRow = document.getElementById("scrollSpeedRow");
const scanButton = document.getElementById("scanButton");
const statusIndicator = document.getElementById("statusIndicator");
const statsText = document.getElementById("statsText");

// State
let accounts = [];
let words = [];
let settings = {
  likeEnabled: true,
  retweetEnabled: false,
  autoMode: true,
  autoScroll: false,
  scrollSpeed: 3,
};
let processedCount = 0;

// Initialize
document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadData();
  renderAccounts();
  renderWords();
  updateStatus();
  setupEventListeners();
}

// Load data from storage
async function loadData() {
  try {
    const result = await chrome.storage.sync.get([
      "accounts",
      "words",
      "settings",
      "processedCount",
    ]);
    accounts = result.accounts || [];
    words = (result.words || [])
      .map((w) => String(w).trim().toLowerCase())
      .filter(Boolean);
    settings = result.settings || settings;
    processedCount = result.processedCount || 0;

    // Update UI with loaded settings
    likeEnabled.checked = settings.likeEnabled;
    retweetEnabled.checked = settings.retweetEnabled;
    autoMode.checked = settings.autoMode;
    autoScroll.checked = settings.autoScroll ?? false;
    const speed = settings.scrollSpeed ?? 3;
    scrollSpeed.value = speed;
    scrollSpeedLabel.textContent = getSpeedLabel(speed);
    updateSpeedRowVisibility(settings.autoScroll ?? false);
    statsText.textContent = `${processedCount} tweet işlendi`;
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Save data to storage
async function saveData() {
  try {
    await chrome.storage.sync.set({ accounts, words, settings });
    // Notify content script about settings change
    notifyContentScript({
      type: "SETTINGS_UPDATED",
      accounts,
      words,
      settings,
    });
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

// Setup event listeners
function setupEventListeners() {
  addAccountForm.addEventListener("submit", handleAddAccount);
  addWordForm.addEventListener("submit", handleAddWord);
  likeEnabled.addEventListener("change", handleSettingChange);
  retweetEnabled.addEventListener("change", handleSettingChange);
  autoMode.addEventListener("change", handleSettingChange);
  autoScroll.addEventListener("change", handleSettingChange);
  scrollSpeed.addEventListener("input", handleSpeedChange);
  scanButton.addEventListener("click", handleScan);

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "STATS_UPDATE") {
      processedCount = message.count;
      statsText.textContent = `${processedCount} tweet işlendi`;
    }
  });

  // Listen for storage changes (when accounts added from page)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync" && changes.accounts) {
      accounts = changes.accounts.newValue || [];
      renderAccounts();
      updateStatus();
    }
    if (namespace === "sync" && changes.words) {
      words = (changes.words.newValue || [])
        .map((w) => String(w).trim().toLowerCase())
        .filter(Boolean);
      renderWords();
      updateStatus();
    }
  });
}

// Handle add account
function handleAddAccount(e) {
  e.preventDefault();

  let username = usernameInput.value.trim().toLowerCase();

  // Remove @ if present
  if (username.startsWith("@")) {
    username = username.substring(1);
  }

  // Validate username
  if (!username) {
    return;
  }

  // Check for valid username format
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
    alert("Geçersiz kullanıcı adı formatı");
    return;
  }

  // Check if already exists
  if (accounts.includes(username)) {
    alert("Bu hesap zaten ekli");
    return;
  }

  accounts.push(username);
  saveData();
  renderAccounts();
  updateStatus();

  usernameInput.value = "";
  usernameInput.focus();
}

// Handle add word
function handleAddWord(e) {
  e.preventDefault();

  let word = wordInput.value.trim().toLowerCase();
  if (!word) return;

  // If user types '@kelime', store without '@' so UI and matching are clean
  if (word.startsWith("@")) {
    word = word.substring(1);
  }

  // Prevent duplicates
  if (words.includes(word)) {
    alert("Bu kelime zaten ekli");
    return;
  }

  // Optional basic sanity: limit length to keep UI/processing stable
  if (word.length > 60) {
    alert("Kelime çok uzun (max 60 karakter)");
    return;
  }

  words.push(word);
  saveData();
  renderWords();
  updateStatus();

  wordInput.value = "";
  wordInput.focus();
}

// Handle remove account
function handleRemoveAccount(username) {
  accounts = accounts.filter((acc) => acc !== username);
  saveData();
  renderAccounts();
  updateStatus();
}

// Handle remove word
function handleRemoveWord(word) {
  words = words.filter((w) => w !== word);
  saveData();
  renderWords();
  updateStatus();
}

// Handle setting change
function handleSettingChange() {
  settings.likeEnabled = likeEnabled.checked;
  settings.retweetEnabled = retweetEnabled.checked;
  settings.autoMode = autoMode.checked;
  settings.autoScroll = autoScroll.checked;
  updateSpeedRowVisibility(settings.autoScroll);
  saveData();
  updateStatus();
}

function handleSpeedChange() {
  const speed = parseInt(scrollSpeed.value, 10);
  settings.scrollSpeed = speed;
  scrollSpeedLabel.textContent = getSpeedLabel(speed);
  saveData();
}

function getSpeedLabel(speed) {
  const labels = {
    1: "Çok Yavaş",
    2: "Yavaş",
    3: "Normal",
    4: "Hızlı",
    5: "Çok Hızlı",
  };
  return labels[speed] ?? "Normal";
}

function updateSpeedRowVisibility(isAutoScrollOn) {
  if (isAutoScrollOn) {
    scrollSpeedRow.classList.remove("hidden");
    autoScrollToggle.classList.add("toggle-attached");
  } else {
    scrollSpeedRow.classList.add("hidden");
    autoScrollToggle.classList.remove("toggle-attached");
  }
}

// Handle manual scan
async function handleScan() {
  scanButton.classList.add("scanning");
  scanButton.innerHTML = '<span class="btn-icon">⏳</span> Taranıyor...';

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (
      !tab ||
      !tab.url ||
      (!tab.url.includes("x.com") && !tab.url.includes("twitter.com"))
    ) {
      alert("Lütfen X (Twitter) sayfasında olduğunuzdan emin olun");
      return;
    }

    // Send scan message to content script
    await chrome.tabs.sendMessage(tab.id, { type: "MANUAL_SCAN" });
  } catch (error) {
    console.error("Scan error:", error);
    alert("Tarama başlatılamadı. Sayfayı yenileyin ve tekrar deneyin.");
  } finally {
    setTimeout(() => {
      scanButton.classList.remove("scanning");
      scanButton.innerHTML = '<span class="btn-icon">🔍</span> Şimdi Tara';
    }, 2000);
  }
}

// Render accounts list
function renderAccounts() {
  if (accounts.length === 0) {
    accountsList.innerHTML =
      '<p class="empty-message">Henüz hesap eklenmedi</p>';
    return;
  }

  accountsList.innerHTML = accounts
    .map(
      (username) => `
    <div class="account-item">
      <span class="account-name">${escapeHtml(username)}</span>
      <button class="btn-remove" data-username="${escapeHtml(username)}">Kaldır</button>
    </div>
  `,
    )
    .join("");

  // Add event listeners to remove buttons
  accountsList.querySelectorAll(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleRemoveAccount(btn.dataset.username);
    });
  });
}

// Render words list
function renderWords() {
  if (words.length === 0) {
    wordsList.innerHTML = '<p class="empty-message">Henüz kelime eklenmedi</p>';
    return;
  }

  wordsList.innerHTML = words
    .map(
      (word) => `
    <div class="account-item">
      <span class="word-name">${escapeHtml(word)}</span>
      <button class="btn-remove" data-word="${escapeHtml(word)}">Kaldır</button>
    </div>
  `,
    )
    .join("");

  wordsList.querySelectorAll(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleRemoveWord(btn.dataset.word);
    });
  });
}

// Update status indicator
function updateStatus() {
  const hasTargets = accounts.length > 0 || words.length > 0;
  const isActive =
    hasTargets && (settings.likeEnabled || settings.retweetEnabled);

  if (isActive) {
    statusIndicator.classList.add("active");
    statusIndicator.querySelector(".status-text").textContent = "Aktif";
  } else {
    statusIndicator.classList.remove("active");
    statusIndicator.querySelector(".status-text").textContent = "Pasif";
  }
}

// Notify content script
async function notifyContentScript(message) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && (tab.url.includes("x.com") || tab.url.includes("twitter.com"))) {
      await chrome.tabs.sendMessage(tab.id, message);
    }
  } catch (error) {
    // Content script might not be loaded yet, that's okay
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
