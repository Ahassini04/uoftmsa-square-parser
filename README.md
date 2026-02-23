# MSA Square Parser

A browser-based tool for parsing Square CSV exports into organized, filterable tables — built for the University of Toronto Muslim Students' Association.

## What It Does

MSA Square Parser takes CSV transaction exports from Square and splits them into two categorized tables:

- **Ramadan Iftars** — Extracts full name, email, and dietary restrictions for each signup.
- **Ramadan Programming** — Extracts full name, email, gender, status, year, photo consent, and accessibility needs.

Both tables support filtering by event/date and one-click copy to clipboard (TSV format) for pasting directly into Google Sheets.

## Features

- Drag-and-drop or file browser CSV upload
- Automatic detection of Square's "orders" export vs. "items" export format
- Per-event filtering for both Iftar and Programming tables
- Copy-to-clipboard in TSV format (paste-ready for Google Sheets)
- Responsive design for desktop and mobile
- Runs entirely in the browser — no server, no data leaves your machine

## Usage

1. Open `index.html` in a browser.
2. Drag and drop a Square CSV export onto the upload area (or click to browse).
3. View parsed results in the Iftar and Programming tables.
4. Use the dropdown filters to narrow by specific event or date.
5. Click **Copy Table** to copy the current view as TSV for Google Sheets.

## Project Structure

```
├── index.html   # Main page markup
├── style.css    # Styling (CSS custom properties, responsive layout)
└── app.js       # CSV parsing logic, table rendering, clipboard copy
```

## Dependencies

- [Papa Parse](https://www.papaparse.com/) (loaded via CDN) — CSV parsing
- [Inter](https://fonts.google.com/specimen/Inter) (loaded via Google Fonts) — typography

No build step or package manager required.
