// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log('Custom CSS Per Domain extension installed/updated.');
  });
  
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const url = new URL(tab.url);
        // Convert to lowercase to match what we do in popup.js:
        const domain = url.host.toLowerCase(); 
        console.log(`[BG] Tab updated: domain = ${domain}`);
  
        chrome.storage.local.get(domain, (result) => {
          if (chrome.runtime.lastError) {
            console.error(`[BG] Storage error: ${chrome.runtime.lastError}`);
            return;
          }
  
          const storedValue = result[domain];
          if (!storedValue) {
            console.log(`[BG] No data for ${domain}`);
            return;
          }
  
          // We expect storedValue to be an array of { tag, css, enabled }
          if (!Array.isArray(storedValue)) {
            console.log(`[BG] Unexpected format for ${domain}. Skipping injection.`);
            return;
          }
  
          // Inject each script that is enabled
          storedValue.forEach((item) => {
            if (item.enabled) {
              const css = item.css || '';
              if (css.trim()) {
                console.log(`[BG] Injecting CSS for ${domain}, tag="${item.tag}"`);
                chrome.scripting.insertCSS({
                  target: { tabId: tabId },
                  css: css,
                });
              }
            }
          });
        });
      } catch (err) {
        console.error('[BG] Error parsing URL or injecting CSS:', err);
      }
    }
  });
  