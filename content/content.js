// X Auto Like & Retweet - Content Script

(function() {
  'use strict';

  // State
  let accounts = [];
  let settings = {
    likeEnabled: true,
    retweetEnabled: false,
    autoMode: true
  };
  let processedTweets = new Set();
  let processedCount = 0;
  let isProcessing = false;
  let observer = null;
  let buttonObserver = null;

  // Initialize
  init();

  async function init() {
    console.log('[X Auto Engagement] Content script loaded');
    
    // Load initial data
    await loadData();
    
    // Setup message listener
    setupMessageListener();
    
    // Start observing if auto mode is enabled
    if (settings.autoMode) {
      startObserving();
    }
    
    // Start adding buttons to tweets
    startButtonObserver();
    
    // Initial scan
    setTimeout(() => {
      scanTimeline();
      injectAddButtons();
    }, 2000);
  }

  // Load data from storage
  async function loadData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_DATA' });
      if (response && response.success) {
        accounts = response.accounts || [];
        settings = response.settings || settings;
        console.log('[X Auto Engagement] Loaded accounts:', accounts);
        console.log('[X Auto Engagement] Settings:', settings);
      }
    } catch (error) {
      console.error('[X Auto Engagement] Error loading data:', error);
    }
  }

  // Setup message listener
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'MANUAL_SCAN':
          scanTimeline();
          sendResponse({ success: true });
          break;
          
        case 'SETTINGS_UPDATED':
          accounts = message.accounts || [];
          settings = message.settings || settings;
          console.log('[X Auto Engagement] Settings updated:', { accounts, settings });
          
          // Toggle observer based on auto mode
          if (settings.autoMode) {
            startObserving();
          } else {
            stopObserving();
          }
          sendResponse({ success: true });
          break;
          
        case 'STORAGE_CHANGED':
          if (message.changes.accounts !== undefined) {
            accounts = message.changes.accounts;
            updateAllAddButtons();
          }
          if (message.changes.settings !== undefined) {
            settings = message.changes.settings;
            if (settings.autoMode) {
              startObserving();
            } else {
              stopObserving();
            }
          }
          break;
          
        case 'PING':
          sendResponse({ success: true, ready: true });
          break;
      }
      return true;
    });
  }

  // Start observing for new tweets to add buttons
  function startButtonObserver() {
    if (buttonObserver) return;
    
    buttonObserver = new MutationObserver((mutations) => {
      // Debounce button injection
      setTimeout(() => injectAddButtons(), 300);
    });
    
    buttonObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Inject "Add" buttons to all tweets
  function injectAddButtons() {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    
    tweets.forEach(tweet => {
      // Skip if button already exists
      if (tweet.querySelector('.x-auto-add-btn')) return;
      
      const username = getTweetUsername(tweet);
      if (!username) return;
      
      // Find the User-Name container
      const userNameContainer = tweet.querySelector('[data-testid="User-Name"]');
      if (!userNameContainer) return;
      
      // Find the @username span directly
      const spans = userNameContainer.querySelectorAll('span');
      let targetSpan = null;
      
      for (const span of spans) {
        if (span.textContent === `@${username}`) {
          targetSpan = span;
          break;
        }
      }
      
      if (!targetSpan) return;
      
      // Check if already added
      const isAdded = accounts.includes(username.toLowerCase());
      
      // Create add button
      const btn = document.createElement('button');
      btn.className = `x-auto-add-btn ${isAdded ? 'added' : ''}`;
      btn.dataset.username = username.toLowerCase();
      btn.title = isAdded ? 'Listede mevcut' : 'Listeye ekle';
      btn.innerHTML = isAdded ? '✓' : '+';
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAddButtonClick(btn, username.toLowerCase());
      });
      
      // Insert button right after the @username span
      targetSpan.insertAdjacentElement('afterend', btn);
    });
  }

  // Handle add button click
  async function handleAddButtonClick(btn, username) {
    if (accounts.includes(username)) {
      // Remove from list
      accounts = accounts.filter(acc => acc !== username);
      btn.classList.remove('added');
      btn.innerHTML = '+';
      btn.title = 'Listeye ekle';
      showToast(`@${username} listeden kaldırıldı`);
    } else {
      // Add to list
      accounts.push(username);
      btn.classList.add('added');
      btn.innerHTML = '✓';
      btn.title = 'Listede mevcut';
      showToast(`@${username} listeye eklendi`);
    }
    
    // Save to storage
    await chrome.storage.sync.set({ accounts });
    
    // Update all buttons for this user
    updateAllAddButtons();
  }

  // Update all add buttons state
  function updateAllAddButtons() {
    const buttons = document.querySelectorAll('.x-auto-add-btn');
    buttons.forEach(btn => {
      const username = btn.dataset.username;
      const isAdded = accounts.includes(username);
      
      btn.classList.toggle('added', isAdded);
      btn.innerHTML = isAdded ? '✓' : '+';
      btn.title = isAdded ? 'Listede mevcut' : 'Listeye ekle';
    });
  }

  // Show toast notification
  function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.x-auto-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'x-auto-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Start observing DOM for new tweets
  function startObserving() {
    if (observer) return;
    
    console.log('[X Auto Engagement] Starting observer');
    
    observer = new MutationObserver((mutations) => {
      // Debounce scanning
      if (!isProcessing) {
        setTimeout(() => scanTimeline(), 500);
      }
    });
    
    // Observe the main content area
    const targetNode = document.body;
    observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
    
    // Also listen for scroll events
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  // Stop observing
  function stopObserving() {
    if (observer) {
      observer.disconnect();
      observer = null;
      console.log('[X Auto Engagement] Observer stopped');
    }
    window.removeEventListener('scroll', handleScroll);
  }

  // Handle scroll event
  let scrollTimeout = null;
  function handleScroll() {
    if (scrollTimeout) return;
    
    scrollTimeout = setTimeout(() => {
      scrollTimeout = null;
      if (settings.autoMode && !isProcessing) {
        scanTimeline();
      }
    }, 1000);
  }

  // Scan timeline for tweets from target accounts
  async function scanTimeline() {
    if (isProcessing || accounts.length === 0) return;
    if (!settings.likeEnabled && !settings.retweetEnabled) return;
    
    isProcessing = true;
    console.log('[X Auto Engagement] Scanning timeline...');
    
    try {
      // Find all tweets on the page
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      
      for (const tweet of tweets) {
        // Skip if already processed
        const tweetId = getTweetId(tweet);
        if (!tweetId || processedTweets.has(tweetId)) continue;
        
        // Get username from tweet
        const username = getTweetUsername(tweet);
        if (!username) continue;
        
        // Check if this is from a target account
        const normalizedUsername = username.toLowerCase();
        if (!accounts.includes(normalizedUsername)) continue;
        
        console.log(`[X Auto Engagement] Found tweet from @${username}`);
        
        // Process the tweet
        await processTweet(tweet, tweetId);
        
        // Mark as processed
        processedTweets.add(tweetId);
        processedCount++;
        
        // Update stats
        updateStats();
        
        // Add random delay between actions (2-5 seconds)
        await randomDelay(2000, 5000);
      }
    } catch (error) {
      console.error('[X Auto Engagement] Error scanning timeline:', error);
    } finally {
      isProcessing = false;
    }
  }

  // Get tweet ID from article element
  function getTweetId(tweet) {
    try {
      // Try to get tweet ID from the timestamp link
      const timeLink = tweet.querySelector('a[href*="/status/"]');
      if (timeLink) {
        const match = timeLink.href.match(/\/status\/(\d+)/);
        if (match) return match[1];
      }
      
      // Fallback: use a hash of the tweet content
      const tweetText = tweet.textContent;
      return hashString(tweetText);
    } catch (error) {
      return null;
    }
  }

  // Get username from tweet
  function getTweetUsername(tweet) {
    try {
      // Method 1: Look for the username link
      const userLinks = tweet.querySelectorAll('a[href^="/"]');
      
      for (const link of userLinks) {
        const href = link.getAttribute('href');
        // Skip non-user links
        if (href.includes('/status/') || 
            href.includes('/hashtag/') ||
            href.includes('/search') ||
            href.includes('/i/') ||
            href.includes('/settings') ||
            href === '/') continue;
        
        // Check if this looks like a username link
        const match = href.match(/^\/([a-zA-Z0-9_]{1,15})$/);
        if (match) {
          return match[1];
        }
      }
      
      // Method 2: Look for the @ mention in the tweet header
      const spans = tweet.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent;
        if (text && text.startsWith('@')) {
          const username = text.substring(1).trim();
          if (/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
            return username;
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Process a tweet (like and/or retweet)
  async function processTweet(tweet, tweetId) {
    try {
      // Like the tweet
      if (settings.likeEnabled) {
        const liked = await likeTweet(tweet);
        if (liked) {
          console.log(`[X Auto Engagement] Liked tweet ${tweetId}`);
          await randomDelay(500, 1500);
        }
      }
      
      // Retweet the tweet
      if (settings.retweetEnabled) {
        const retweeted = await retweetTweet(tweet);
        if (retweeted) {
          console.log(`[X Auto Engagement] Retweeted tweet ${tweetId}`);
        }
      }
    } catch (error) {
      console.error(`[X Auto Engagement] Error processing tweet ${tweetId}:`, error);
    }
  }

  // Like a tweet
  async function likeTweet(tweet) {
    try {
      const likeButton = tweet.querySelector('[data-testid="like"]');
      if (!likeButton) {
        console.log('[X Auto Engagement] Like button not found');
        return false;
      }
      
      // Check if already liked (button changes to "unlike" when liked)
      const isAlreadyLiked = tweet.querySelector('[data-testid="unlike"]');
      if (isAlreadyLiked) {
        console.log('[X Auto Engagement] Tweet already liked');
        return false;
      }
      
      // Simulate natural click
      simulateClick(likeButton);
      return true;
    } catch (error) {
      console.error('[X Auto Engagement] Error liking tweet:', error);
      return false;
    }
  }

  // Retweet a tweet
  async function retweetTweet(tweet) {
    try {
      const retweetButton = tweet.querySelector('[data-testid="retweet"]');
      if (!retweetButton) {
        console.log('[X Auto Engagement] Retweet button not found');
        return false;
      }
      
      // Check if already retweeted (button changes to "unretweet" when retweeted)
      const isAlreadyRetweeted = tweet.querySelector('[data-testid="unretweet"]');
      if (isAlreadyRetweeted) {
        console.log('[X Auto Engagement] Tweet already retweeted');
        return false;
      }
      
      // Click retweet button to open menu
      simulateClick(retweetButton);
      
      // Wait for menu to appear
      await sleep(500);
      
      // Find and click the "Retweet" option in the menu
      const menuItem = document.querySelector('[data-testid="retweetConfirm"]');
      if (menuItem) {
        simulateClick(menuItem);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[X Auto Engagement] Error retweeting:', error);
      return false;
    }
  }

  // Simulate a natural click
  function simulateClick(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Create and dispatch mouse events
    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    });
    
    const mouseUp = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    });
    
    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    });
    
    element.dispatchEvent(mouseDown);
    element.dispatchEvent(mouseUp);
    element.dispatchEvent(click);
  }

  // Update stats
  function updateStats() {
    chrome.runtime.sendMessage({
      type: 'UPDATE_PROCESSED_COUNT',
      count: processedCount
    }).catch(() => {});
  }

  // Utility: Sleep
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility: Random delay
  function randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return sleep(delay);
  }

  // Utility: Simple string hash
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

})();
