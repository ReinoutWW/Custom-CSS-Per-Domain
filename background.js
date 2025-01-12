// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log('Custom CSS Per Domain extension installed/updated.');
  });
  
  // Listen for tab updates to inject CSS
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const url = new URL(tab.url);
        const domain = url.host;
        console.log(`[BG] Tab updated: domain = ${domain}`);
  
        // Retrieve CSS for this domain from local storage
        chrome.storage.local.get(domain, (results) => {
          if (chrome.runtime.lastError) {
            console.error(`[BG] Storage error: ${chrome.runtime.lastError}`);
            return;
          }
  
          // If we have stored CSS, inject it
          const css = results[domain];
          if (css) {
            console.log(`[BG] Found CSS for ${domain}, injecting...`);
            chrome.scripting.insertCSS({
              target: { tabId: tabId },
              css: css,
            });
          } else {
            console.log(`[BG] No CSS found for ${domain}`);
          }
        });
      } catch (err) {
        console.error('[BG] Error parsing URL or injecting CSS:', err);
      }
    }
  });
  