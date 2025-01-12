// popup.js

let activeTabDomain = '';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[POPUP] DOMContentLoaded');

  // 1) Get the active tab's domain
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      if (activeTab.url) {
        try {
          const url = new URL(activeTab.url);
          activeTabDomain = url.host; // store globally
          console.log(`[POPUP] Active Tab Domain: ${activeTabDomain}`);

          // also set the placeholder to the domain
          const domainInput = document.getElementById('domainInput');
          domainInput.placeholder = activeTabDomain;
          domainInput.value = activeTabDomain;
        } catch (err) {
          console.error('[POPUP] Error parsing active tab URL:', err);
        }
      }
    }
    // After capturing the active tab domain, load the domain list
    loadAndDisplayDomains();
  });

  // 2) Search input
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    loadAndDisplayDomains(e.target.value);
  });
});

function loadAndDisplayDomains(searchTerm = '') {
  chrome.storage.local.get(null, (items) => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Storage error:', chrome.runtime.lastError);
      return;
    }

    console.log('[POPUP] Loaded items:', items);

    const domainListDiv = document.getElementById('domainList');
    domainListDiv.innerHTML = ''; // Clear current list

    let entries = Object.entries(items);

    // Filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      entries = entries.filter(([domain]) =>
        domain.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort - active domain first
    entries.sort((a, b) => {
      if (a[0] === activeTabDomain) return -1;
      if (b[0] === activeTabDomain) return 1;
      return a[0].localeCompare(b[0]);
    });

    if (entries.length === 0) {
      domainListDiv.innerText = 'No domains saved yet.';
      return;
    }

    for (const [domain, data] of entries) {
      // data might be string (old format) or { css, enabled }
      let css = '';
      let enabled = true;

      if (typeof data === 'string') {
        css = data;
      } else if (typeof data === 'object') {
        css = data.css || '';
        enabled = data.enabled !== false;
      }

      // Domain item container
      const domainItem = document.createElement('div');
      domainItem.className = 'domain-item';

      // If domain matches the active tab, highlight it; otherwise, gray it out
      if (domain === activeTabDomain) {
        domainItem.classList.add('active-domain');
      } else {
        domainItem.classList.add('inactive-domain');
      }

      // Header row
      const header = document.createElement('div');
      header.className = 'domain-header';

      // Checkbox + domain name
      const checkboxAndName = document.createElement('div');
      checkboxAndName.className = 'checkbox-and-name';

      // The enable/disable checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = enabled;
      checkbox.addEventListener('change', () => {
        const newData = { css, enabled: checkbox.checked };
        chrome.storage.local.set({ [domain]: newData }, () => {
          if (chrome.runtime.lastError) {
            console.error('[POPUP] Error toggling enabled:', chrome.runtime.lastError);
          } else {
            console.log(`[POPUP] Toggled ${domain} to enabled=${checkbox.checked}`);
          }
        });
      });

      const domainName = document.createElement('span');
      domainName.className = 'domain-name';
      domainName.textContent = domain;

      checkboxAndName.appendChild(checkbox);
      checkboxAndName.appendChild(domainName);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => handleDeleteDomain(domain));

      header.appendChild(checkboxAndName);
      header.appendChild(deleteBtn);

      // CSS content
      const cssContent = document.createElement('div');
      cssContent.className = 'css-content';
      cssContent.textContent = css;

      // Build final structure
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

  // Always store in the new format
  const data = { css, enabled: true };

  console.log(`[POPUP] Saving CSS for domain "${domain}":`, css);

  chrome.storage.local.set({ [domain]: data }, () => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Storage set error:', chrome.runtime.lastError);
      return;
    }

    alert(`Saved CSS for "${domain}"`);
    loadAndDisplayDomains(document.getElementById('searchInput').value);
  });
});

function handleDeleteDomain(domain) {
  if (!confirm(`Delete CSS for "${domain}"?`)) return;

  console.log(`[POPUP] Deleting domain: ${domain}`);
  chrome.storage.local.remove(domain, () => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Storage remove error:', chrome.runtime.lastError);
      return;
    }
    loadAndDisplayDomains(document.getElementById('searchInput').value);
  });
}
