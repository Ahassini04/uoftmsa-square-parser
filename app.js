document.addEventListener('DOMContentLoaded', () => {
  // ── State ──
  let allIftarEntries = [];
  let allProgrammingEntries = [];

  // ── DOM Refs ──
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadCard = document.getElementById('upload-card');
  const fileBar = document.getElementById('file-bar');
  const fileNameEl = document.getElementById('file-name');
  const clearBtn = document.getElementById('clear-btn');
  const results = document.getElementById('results');
  const iftarFilter = document.getElementById('iftar-filter');
  const programmingFilter = document.getElementById('programming-filter');
  const iftarTableBody = document.querySelector('#iftar-table tbody');
  const programmingTableBody = document.querySelector('#programming-table tbody');

  // ── Drag & Drop ──
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      handleFile(file);
    }
  });

  // Click on drop zone triggers file input
  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('.browse-btn')) return; // let label handle it
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleFile(file);
  });

  // ── Clear / Upload New ──
  clearBtn.addEventListener('click', () => {
    uploadCard.classList.remove('hidden');
    fileBar.classList.add('hidden');
    results.classList.add('hidden');
    fileInput.value = '';
    allIftarEntries = [];
    allProgrammingEntries = [];
  });

  // ── Filters ──
  iftarFilter.addEventListener('change', () => renderIftarTable());
  programmingFilter.addEventListener('change', () => renderProgrammingTable());

  // ── Copy Buttons ──
  document.getElementById('copy-iftar').addEventListener('click', (e) => {
    copyTable('iftar', e.currentTarget);
  });

  document.getElementById('copy-programming').addEventListener('click', (e) => {
    copyTable('programming', e.currentTarget);
  });

  // ── File Processing ──
  function handleFile(file) {
    fileNameEl.textContent = file.name;
    uploadCard.classList.add('hidden');
    fileBar.classList.remove('hidden');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (parsed) => {
        processData(parsed.data);
      },
      error: (err) => {
        alert('Error parsing CSV file: ' + err.message);
      }
    });
  }

  // ── Data Processing ──
  function processData(rows) {
    allIftarEntries = [];
    allProgrammingEntries = [];

    if (!rows.length) return;

    // Detect CSV format: new "orders" export vs old "items" export
    const isOrdersFormat = 'Item Name' in rows[0];

    const iftarEvents = new Set();
    const programmingEvents = new Set();

    for (const row of rows) {
      let item, modifiers, email, recipientName;
      let isIftar, isProgramming;

      if (isOrdersFormat) {
        // New orders export: no Category, use Item Name to classify
        item = (row['Item Name'] || '').trim();
        modifiers = (row['Item Modifiers'] || '').trim();
        email = (row['Recipient Email'] || '').trim();
        recipientName = (row['Recipient Name'] || '').trim();
        isIftar = /iftar/i.test(item);
        isProgramming = !isIftar && !!item;
      } else {
        // Old items export: use Category column
        const category = (row['Category'] || '').trim();
        item = (row['Item'] || '').trim();
        modifiers = (row['Modifiers Applied'] || '').trim();
        email = '';
        recipientName = '';
        isIftar = category === 'Ramadan Iftars 2026';
        isProgramming = category === 'Ramadan Programming 2026';
      }

      if (!modifiers) continue;

      const parts = splitModifiers(modifiers);

      if (isIftar) {
        const entry = parseIftarModifiers(parts);
        if (!entry.fullName) entry.fullName = recipientName;
        if (!entry.email) entry.email = email;
        entry.event = item;
        allIftarEntries.push(entry);
        if (item) iftarEvents.add(item);
      } else if (isProgramming) {
        const entry = parseProgrammingModifiers(parts);
        if (!entry.fullName) entry.fullName = recipientName;
        if (!entry.email) entry.email = email;
        entry.event = item;
        allProgrammingEntries.push(entry);
        if (item) programmingEvents.add(item);
      }
    }

    // Populate filters
    populateFilter(iftarFilter, Array.from(iftarEvents), 'All Dates');
    populateFilter(programmingFilter, Array.from(programmingEvents), 'All Events');

    // Update summary
    document.getElementById('iftar-total').textContent = allIftarEntries.length;
    document.getElementById('programming-total').textContent = allProgrammingEntries.length;

    // Render tables
    renderIftarTable();
    renderProgrammingTable();

    // Show results
    results.classList.remove('hidden');
  }

  // ── Modifier Splitting ──

  /**
   * Splits a modifiers string into individual parts.
   *
   * New orders format:  "1 x Full Name: X, 1 x Male, 1 x Yes"
   * Old items format:   "Full Name: X, Male, Yes"
   */
  function splitModifiers(str) {
    if (/^1\s*x\s/i.test(str)) {
      // New format: strip leading "1 x " then split on ", 1 x "
      return str.replace(/^1\s*x\s/i, '').split(/,\s*1\s*x\s/i);
    }
    // Old format: simple comma split
    return str.split(/,\s*/);
  }

  // ── Modifier Parsers ──

  /**
   * Iftar modifiers (already split into parts).
   *
   * New format parts:
   *   "Full Name: X", "Phone Number: Y",
   *   "Do you have any food allergies or dietary restrictions?....: Halal",
   *   "Yes"
   *
   * Old format parts:
   *   "Full Name: X", "Phone Number: Y", "Yes"
   */
  function parseIftarModifiers(parts) {
    const result = { fullName: '', email: '', dietaryRestrictions: '' };

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (/^Full Name:/i.test(trimmed)) {
        result.fullName = trimmed.replace(/^Full Name:\s*/i, '').trim();
      } else if (/^Email:/i.test(trimmed) || trimmed.includes('@')) {
        result.email = trimmed.replace(/^Confirm Email:\s*/i, '').replace(/^Email:\s*/i, '').trim();
      } else if (/dietary|food allerg/i.test(trimmed)) {
        // New format: long question ending with ": answer"
        const lastColon = trimmed.lastIndexOf(': ');
        if (lastColon !== -1) {
          result.dietaryRestrictions = trimmed.substring(lastColon + 2).trim();
        }
      }
      // Skip: Phone Number, standalone "Yes" acknowledgment
    }

    return result;
  }

  /**
   * Programming modifiers (already split into parts).
   *
   * Parts after extracting labeled fields (Full Name, Accessibility Needs):
   *   [Gender], Status, [Year], Photo Consent
   *
   * Gender may be absent for gendered events (brothers/sisters only).
   * Year may be absent for graduates or "Other" status.
   */
  function parseProgrammingModifiers(parts) {
    const result = {
      fullName: '', email: '', gender: '',
      status: '', year: '', photoConsent: '', accessibility: ''
    };

    const unlabeled = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (/^Full Name:/i.test(trimmed)) {
        result.fullName = trimmed.replace(/^Full Name:\s*/i, '').trim();
      } else if (/^Accessibility Needs?:/i.test(trimmed)) {
        result.accessibility = trimmed.replace(/^Accessibility Needs?:\s*/i, '').trim();
      } else if (/^Email:/i.test(trimmed) || trimmed.includes('@')) {
        result.email = trimmed.replace(/^Confirm Email:\s*/i, '').replace(/^Email:\s*/i, '').trim();
      } else if (/^Phone Number:/i.test(trimmed) || /^\d[\d\s-]{6,}$/.test(trimmed)) {
        // Skip phone numbers
      } else {
        unlabeled.push(trimmed);
      }
    }

    // Positional parsing — the order is always:
    //   [Gender], Status, [Year], Photo Consent
    let idx = 0;

    const genderValues = ['male', 'female', 'non-binary', 'nonbinary', 'prefer not to say'];
    if (idx < unlabeled.length && genderValues.includes(unlabeled[idx].toLowerCase())) {
      result.gender = unlabeled[idx];
      idx++;
    }

    // Status: anything that isn't a year or yes/no
    if (idx < unlabeled.length && !/^\d\+?$/.test(unlabeled[idx]) && !/^(yes|no)$/i.test(unlabeled[idx])) {
      result.status = unlabeled[idx];
      idx++;
    }

    // Year (optional): digit with optional +
    if (idx < unlabeled.length && /^\d\+?$/.test(unlabeled[idx])) {
      result.year = unlabeled[idx];
      idx++;
    }

    // Photo consent: Yes/No
    if (idx < unlabeled.length && /^(yes|no)$/i.test(unlabeled[idx])) {
      result.photoConsent = unlabeled[idx];
      idx++;
    }

    return result;
  }

  // ── Filter ──
  function populateFilter(selectEl, items, allLabel) {
    selectEl.innerHTML = `<option value="all">${allLabel}</option>`;
    for (const item of items) {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      selectEl.appendChild(option);
    }
  }

  // ── Table Rendering ──
  function renderIftarTable() {
    const filter = iftarFilter.value;
    const data = filter === 'all'
      ? allIftarEntries
      : allIftarEntries.filter(e => e.event === filter);

    iftarTableBody.innerHTML = '';

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td>${i + 1}</td>` +
        `<td>${esc(row.fullName)}</td>` +
        `<td>${esc(row.email)}</td>` +
        `<td>${esc(row.dietaryRestrictions)}</td>`;
      iftarTableBody.appendChild(tr);
    }

    // Update badge
    const count = data.length;
    document.getElementById('iftar-badge').textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;

    // Toggle empty state
    document.getElementById('iftar-empty').classList.toggle('hidden', count > 0);
    document.getElementById('iftar-table-wrap').classList.toggle('hidden', count === 0);
  }

  function renderProgrammingTable() {
    const filter = programmingFilter.value;
    const data = filter === 'all'
      ? allProgrammingEntries
      : allProgrammingEntries.filter(e => e.event === filter);

    programmingTableBody.innerHTML = '';

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td>${esc(row.fullName)}</td>` +
        `<td>${esc(row.email)}</td>` +
        `<td>${esc(row.gender)}</td>` +
        `<td>${esc(row.status)}</td>` +
        `<td>${esc(row.year)}</td>` +
        `<td>${esc(row.photoConsent)}</td>` +
        `<td>${esc(row.accessibility)}</td>`;
      programmingTableBody.appendChild(tr);
    }

    const count = data.length;
    document.getElementById('programming-badge').textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
    document.getElementById('programming-empty').classList.toggle('hidden', count > 0);
    document.getElementById('programming-table-wrap').classList.toggle('hidden', count === 0);
  }

  // ── Copy to Clipboard (TSV for Google Sheets) ──
  function copyTable(type, btn) {
    let headers, rows;

    if (type === 'iftar') {
      const filter = iftarFilter.value;
      const data = filter === 'all'
        ? allIftarEntries
        : allIftarEntries.filter(e => e.event === filter);

      headers = ['#', 'Full Name', 'Email', 'Dietary Restrictions'];
      rows = data.map((r, i) => [
        i + 1,
        clean(r.fullName),
        clean(r.email),
        clean(r.dietaryRestrictions)
      ]);
    } else {
      const filter = programmingFilter.value;
      const data = filter === 'all'
        ? allProgrammingEntries
        : allProgrammingEntries.filter(e => e.event === filter);

      headers = ['Full Name', 'Email', 'Gender', 'Status', 'Year', 'Photo Consent', 'Accessibility'];
      rows = data.map(r => [
        clean(r.fullName),
        clean(r.email),
        clean(r.gender),
        clean(r.status),
        clean(r.year),
        clean(r.photoConsent),
        clean(r.accessibility)
      ]);
    }

    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');

    navigator.clipboard.writeText(tsv).then(() => {
      showCopied(btn);
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = tsv;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showCopied(btn);
    });
  }

  function showCopied(btn) {
    btn.classList.add('copied');
    btn.querySelector('.icon-copy').classList.add('hidden');
    btn.querySelector('.icon-check').classList.remove('hidden');
    btn.querySelector('.copy-label').textContent = 'Copied!';

    setTimeout(() => {
      btn.classList.remove('copied');
      btn.querySelector('.icon-copy').classList.remove('hidden');
      btn.querySelector('.icon-check').classList.add('hidden');
      btn.querySelector('.copy-label').textContent = 'Copy Table';
    }, 2000);
  }

  // ── Helpers ──
  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function clean(str) {
    return (str || '').replace(/[\t\n\r]/g, ' ').trim();
  }
});
