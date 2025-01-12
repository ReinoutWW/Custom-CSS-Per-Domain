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
          // Force lowercase to match background.js
          activeTabDomain = url.host.toLowerCase();
          console.log(`[POPUP] Active Tab Domain: ${activeTabDomain}`);

          const domainInput = document.getElementById('domainInput');
          domainInput.placeholder = activeTabDomain;
          domainInput.value = activeTabDomain;
        } catch (err) {
          console.error('[POPUP] Error parsing active tab URL:', err);
        }
      }
    }
    loadAndDisplayDomains();
  });

  // 2) Search input
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    loadAndDisplayDomains(e.target.value);
  });
});

// -------------------------------------------------------------
// LOAD & DISPLAY
// -------------------------------------------------------------
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
    // e.g. [ [domain, [ { tag, css, enabled }, ... ] ], ...]

    // 1) Filter by domain or tag if needed
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      entries = entries
        .map(([domain, scripts]) => {
          const domainMatches = domain.toLowerCase().includes(lowerSearch);
          // Keep scripts if domain matches or tag matches
          const filteredScripts = scripts.filter((item) =>
            domainMatches ||
            (item.tag && item.tag.toLowerCase().includes(lowerSearch))
          );
          return [domain, filteredScripts];
        })
        .filter(([_, filteredScripts]) => filteredScripts.length > 0);
    }

    // 2) Sort so the active domain is first
    entries.sort(([domainA], [domainB]) => {
      if (domainA === activeTabDomain) return -1;
      if (domainB === activeTabDomain) return 1;
      return domainA.localeCompare(domainB);
    });

    if (entries.length === 0) {
      domainListDiv.innerText = 'No domains (or tags) found.';
      return;
    }

    // 3) Build UI
    for (const [domain, scripts] of entries) {
      if (!Array.isArray(scripts) || scripts.length === 0) continue;
      scripts.forEach((item) => {
        const { tag, css, enabled } = item;
        const domainItem = document.createElement('div');
        domainItem.className = 'domain-item';

        // Highlight if matches active tab domain
        if (domain === activeTabDomain) {
          domainItem.classList.add('active-domain');
        } else {
          domainItem.classList.add('inactive-domain');
        }

        // Header
        const header = document.createElement('div');
        header.className = 'domain-header';

        const checkboxAndName = document.createElement('div');
        checkboxAndName.className = 'checkbox-and-name';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = enabled !== false;

        checkbox.addEventListener('change', () => {
          toggleEnabled(domain, tag, checkbox.checked);
        });

        // Display "domain | tag"
        const domainName = document.createElement('span');
        domainName.className = 'domain-name';
        domainName.textContent = tag
          ? `${domain} | ${tag}`
          : domain;

        checkboxAndName.appendChild(checkbox);
        checkboxAndName.appendChild(domainName);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
          handleDelete(domain, tag);
        });

        header.appendChild(checkboxAndName);
        header.appendChild(deleteBtn);

        // CSS content
        const cssContent = document.createElement('div');
        cssContent.className = 'css-content';
        cssContent.textContent = css;

        domainItem.appendChild(header);
        domainItem.appendChild(cssContent);
        domainListDiv.appendChild(domainItem);
      });
    }
  });
}

// -------------------------------------------------------------
// SAVE / UPDATE (BUG #1 FIX: Overwrite if same domain+tag)
// -------------------------------------------------------------
document.getElementById('saveBtn').addEventListener('click', () => {
  const domainInput = document.getElementById('domainInput');
  const tagInput = document.getElementById('tagInput');
  const cssInput = document.getElementById('cssInput');

  // Lowercase domain to avoid mismatches
  const domain = domainInput.value.trim().toLowerCase();
  const tag = tagInput.value.trim().toLowerCase(); // Optionally lower as well
  const css = cssInput.value;

  if (!domain) {
    alert('Please enter a domain.');
    return;
  }
  if (!css) {
    alert('Please enter some CSS.');
    return;
  }

  // Get existing array for this domain
  chrome.storage.local.get(domain, (result) => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Storage get error:', chrome.runtime.lastError);
      return;
    }

    let existingArray = result[domain];
    if (!Array.isArray(existingArray)) {
      existingArray = [];
    }

    // Check if there's already an item with the same tag
    const existingItem = existingArray.find((item) => item.tag === tag);
    if (existingItem) {
      // Overwrite that item’s CSS & re-enable it
      existingItem.css = css;
      existingItem.enabled = true;
      console.log(`[POPUP] Overwriting existing domain="${domain}" tag="${tag}"`);
    } else {
      // Otherwise, push a new item
      existingArray.push({
        tag: tag,
        css: css,
        enabled: true,
      });
    }

    // Save back
    chrome.storage.local.set({ [domain]: existingArray }, () => {
      if (chrome.runtime.lastError) {
        console.error('[POPUP] Storage set error:', chrome.runtime.lastError);
        return;
      }
      alert(`Saved CSS for "${domain}" with tag "${tag}"!`);
      loadAndDisplayDomains(document.getElementById('searchInput').value);

      // Optionally clear inputs
      // domainInput.value = '';
      // tagInput.value = '';
      // cssInput.value = '';
    });
  });
});

// -------------------------------------------------------------
// TOGGLE ENABLED
// -------------------------------------------------------------
function toggleEnabled(domain, tag, isEnabled) {
  domain = domain.toLowerCase(); // ensure consistency
  tag = tag.toLowerCase();

  chrome.storage.local.get(domain, (result) => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Storage get error:', chrome.runtime.lastError);
      return;
    }
    let scripts = result[domain];
    if (!Array.isArray(scripts)) return;

    const scriptObj = scripts.find((item) => item.tag === tag);
    if (scriptObj) {
      scriptObj.enabled = isEnabled;
    }

    chrome.storage.local.set({ [domain]: scripts }, () => {
      if (chrome.runtime.lastError) {
        console.error('[POPUP] Error toggling enabled:', chrome.runtime.lastError);
      } else {
        console.log(`[POPUP] Toggled ${domain}|${tag} to enabled=${isEnabled}`);
      }
    });
  });
}

// -------------------------------------------------------------
// DELETE (Removes only the specific tag)
// -------------------------------------------------------------
function handleDelete(domain, tag) {
  domain = domain.toLowerCase();
  tag = tag.toLowerCase();

  if (!confirm(`Delete CSS for "${domain}" (tag="${tag}")?`)) return;

  chrome.storage.local.get(domain, (result) => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Storage get error:', chrome.runtime.lastError);
      return;
    }

    let scripts = result[domain];
    if (!Array.isArray(scripts)) return;

    // Remove only the item with that tag
    scripts = scripts.filter((item) => item.tag !== tag);

    // If no scripts remain, remove the domain entirely
    if (scripts.length === 0) {
      chrome.storage.local.remove(domain, () => {
        if (chrome.runtime.lastError) {
          console.error('[POPUP] Error removing domain:', chrome.runtime.lastError);
        }
        loadAndDisplayDomains(document.getElementById('searchInput').value);
      });
    } else {
      chrome.storage.local.set({ [domain]: scripts }, () => {
        if (chrome.runtime.lastError) {
          console.error('[POPUP] Error saving domain array:', chrome.runtime.lastError);
        }
        loadAndDisplayDomains(document.getElementById('searchInput').value);
      });
    }
  });
}
