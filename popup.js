// popup.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('[POPUP] DOMContentLoaded');
  
    // 1) Fetch the active tab's domain and set it as the placeholder
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];
        if (activeTab.url) {
          try {
            const url = new URL(activeTab.url);
            const domain = url.host;
  
            // Set the placeholder to the domain
            const domainInput = document.getElementById('domainInput');
            domainInput.placeholder = domain;
            domainInput.value = domain;
            
            console.log(`[POPUP] Set domain placeholder to: ${domain}`);
          } catch (err) {
            console.error('[POPUP] Error parsing active tab URL:', err);
          }
        }
      }
    });
  
    // 2) Then load and display all saved domains
    loadAndDisplayDomains();
  });
  
  function loadAndDisplayDomains() {
    chrome.storage.local.get(null, (items) => {
      if (chrome.runtime.lastError) {
        console.error('[POPUP] Storage error:', chrome.runtime.lastError);
        return;
      }
  
      console.log('[POPUP] Loaded items:', items);
  
      const domainListDiv = document.getElementById('domainList');
      domainListDiv.innerHTML = ''; // Clear current list
  
      const entries = Object.entries(items);
  
      if (entries.length === 0) {
        domainListDiv.innerText = 'No domains saved yet.';
        return;
      }
  
      for (const [domain, css] of entries) {
        // Create a container for the domain
        const domainItem = document.createElement('div');
        domainItem.className = 'domain-item';
  
        // A header row with domain name and delete button
        const header = document.createElement('div');
        header.className = 'domain-header';
  
        const domainName = document.createElement('span');
        domainName.className = 'domain-name';
        domainName.textContent = domain;
  
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => handleDeleteDomain(domain));
  
        header.appendChild(domainName);
        header.appendChild(deleteBtn);
  
        // Display the saved CSS
        const cssContent = document.createElement('div');
        cssContent.className = 'css-content';
        cssContent.textContent = css;
  
        // Append elements
        domainItem.appendChild(header);
        domainItem.appendChild(cssContent);
        domainListDiv.appendChild(domainItem);
      }
    });
  }
  
  // SAVE/UPDATE
  document.getElementById('saveBtn').addEventListener('click', () => {
    const domainInput = document.getElementById('domainInput');
    const cssInput = document.getElementById('cssInput');
  
    const domain = domainInput.value.trim();
    const css = cssInput.value;
  
    if (!domain) {
      alert('Please enter a domain.');
      return;
    }
    if (!css) {
      alert('Please enter some CSS.');
      return;
    }
  
    const data = {};
    data[domain] = css;
  
    console.log(`[POPUP] Saving CSS for domain "${domain}":`, css);
  
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        console.error('[POPUP] Storage set error:', chrome.runtime.lastError);
        return;
      }
  
      alert(`Saved CSS for "${domain}"`);
      loadAndDisplayDomains();
      // Optionally clear inputs
      // domainInput.value = '';
      // cssInput.value = '';
    });
  });
  
  // DELETE
  function handleDeleteDomain(domain) {
    if (!confirm(`Delete CSS for "${domain}"?`)) return;
  
    console.log(`[POPUP] Deleting domain: ${domain}`);
    chrome.storage.local.remove(domain, () => {
      if (chrome.runtime.lastError) {
        console.error('[POPUP] Storage remove error:', chrome.runtime.lastError);
        return;
      }
      loadAndDisplayDomains();
    });
  }
  