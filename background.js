// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log('Custom CSS Per Domain extension installed/updated.');
  });
  
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const url = new URL(tab.url);
        const domain = url.host;
        console.log(`[BG] Tab updated: domain = ${domain}`);
  
        // Retrieve data for this domain
        chrome.storage.local.get(domain, (results) => {
          if (chrome.runtime.lastError) {
            console.error(`[BG] Storage error: ${chrome.runtime.lastError}`);
            return;
          }
  
          const data = results[domain];
          if (!data) {
            console.log(`[BG] No data found for ${domain}`);
            return;
          }
  
          // 'data' might be just a string (old format) or an object { css, enabled }
          let css = '';
          let enabled = true; // default to true if old format
  
          if (typeof data === 'string') {
            // Old format: just the CSS text
            css = data;
          } else if (typeof data === 'object') {
            // New format
            css = data.css || '';
            enabled = data.enabled !== false; // interpret missing or anything else as true
          }
  
          if (!enabled) {
            console.log(`[BG] CSS for ${domain} is disabled, skipping injection.`);
            return;
          }
  
          if (css) {
            console.log(`[BG] Found CSS for ${domain} (enabled), injecting...`);
            chrome.scripting.insertCSS({
              target: { tabId: tabId },
              css: css,
            });
          } else {
            console.log(`[BG] No CSS found for ${domain} or it's empty.`);
          }
        });
      } catch (err) {
        console.error('[BG] Error parsing URL or injecting CSS:', err);
      }
    }
  });
  