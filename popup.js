// popup.js

let activeTabDomain = '';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[POPUP] DOMContentLoaded');

  // 1) Get the active tab's domain to highlight it first
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      if (activeTab.url) {
        try {
          const url = new URL(activeTab.url);
          activeTabDomain = url.host;  // Store globally
          console.log(`[POPUP] Active Tab Domain: ${activeTabDomain}`);

          // Also set the placeholder to the domain
          const domainInput = document.getElementById('domainInput');
          domainInput.placeholder = activeTabDomain;
          domainInput.value = activeTabDomain;
        } catch (err) {
          console.error('[POPUP] Error parsing active tab URL:', err);
        }
      }
    }
    // After we (possibly) capture the active tab domain, load the domain list
    loadAndDisplayDomains();
  });

  // 2) Listen for user typing in the search box
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    loadAndDisplayDomains(e.target.value);
  });
});

// A function to load items from storage, filter & sort them, then display
function loadAndDisplayDomains(searchTerm = '') {
  chrome.storage.local.get(null, (items) => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Storage error:', chrome.runtime.lastError);
      return;
    }

    console.log('[POPUP] Loaded items:', items);

    const domainListDiv = document.getElementById('domainList');
    domainListDiv.innerHTML = ''; // Clear current list

    // Convert object to an array of [domain, css] pairs
    let entries = Object.entries(items);

    // 1) Filter entries based on searchTerm (case-insensitive)
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      entries = entries.filter(([domain]) => 
        domain.toLowerCase().includes(lowerSearch)
      );
    }

    // 2) Sort so the active tab's domain is at the top if it exists in entries
    entries.sort((a, b) => {
      // If a[0] is the active domain, put it first
      if (a[0] === activeTabDomain) return -1;
      // If b[0] is the active domain, put it first
      if (b[0] === activeTabDomain) return 1;
      // Otherwise, normal alphabetical sort
      return a[0].localeCompare(b[0]);
    });

    // If no domains after filtering
    if (entries.length === 0) {
      domainListDiv.innerText = 'No domains saved yet.';
      return;
    }

    // 3) Build and display the domain list
    for (const [domain, css] of entries) {
      // Outer container
      const domainItem = document.createElement('div');
      domainItem.className = 'domain-item';

      // Header row
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

      // The CSS
      const cssContent = document.createElement('div');
      cssContent.className = 'css-content';
      cssContent.textContent = css;

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
    // Reload the list (this will also sort and possibly put it on top if it's the active domain)
    loadAndDisplayDomains(document.getElementById('searchInput').value);
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
    loadAndDisplayDomains(document.getElementById('searchInput').value);
  });
}
