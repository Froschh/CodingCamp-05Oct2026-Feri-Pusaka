# To-Do List Dashboard — Project Rules & Constraints

## 1. Technology Stack (TC-1)

- **HTML5** for all page structure and semantics
- **CSS3** for all styling (no inline styles in HTML)
- **Vanilla JavaScript** (ES6+) — no frameworks, no libraries, no build tools
- No backend server; the app runs entirely in the browser

## 2. Folder Rules

| Location | Rule |
|---|---|
| `css/` | Exactly **1 file**: `style.css` |
| `js/` | Exactly **1 file**: `app.js` |
| `.kiro/` | Contains `steering.md` (this file) |
| Root | `index.html` |

No additional CSS or JS files may be added. No test files.

## 3. Data Storage (TC-2)

- **Browser LocalStorage API only** — all persistence is client-side
- Keys used:
  - `dashboard_name` — user's display name
  - `dashboard_theme` — `"light"` or `"dark"`
  - `dashboard_tasks` — JSON array of task objects
  - `dashboard_links` — JSON array of quick-link objects
  - `dashboard_pomodoro_minutes` — custom Pomodoro duration (number)
- No cookies, sessionStorage, or IndexedDB

## 4. Browser Compatibility (TC-3)

Must work without polyfills in:
- Google Chrome (latest)
- Mozilla Firefox (latest)
- Microsoft Edge (latest)
- Apple Safari (latest)

No Internet Explorer support required.

## 5. Non-Functional Requirements

### NFR-1: Simplicity
- Clean, minimal interface with no complex setup
- Single-page app — no routing, no install step
- No test framework or test files

### NFR-2: Performance
- Fast load: no heavy assets, fonts loaded from Google Fonts CDN
- Responsive UI — no noticeable lag when adding/editing data
- Timer uses `setInterval` with 1-second precision

### NFR-3: Visual Design
- Card-based layout, CSS Grid / Flexbox for responsiveness
- Google Font: **Inter** (linked via `<link>` in `<head>`)
- CSS custom properties (variables) for all colors and spacing
- Light mode: white/light-grey backgrounds, dark text, accent `#6C63FF`
- Dark mode: dark background `#1a1a2e`, light text, same accent
- Dark mode toggled via `dark` class on `<body>`
- Smooth CSS transitions when switching themes

## 6. Feature Requirements Summary

### 6.1 Greeting Section
- Live clock updating every second (HH:MM:SS)
- Current date formatted as "Weekday, Month Day, Year"
- Time-based greeting:
  - 05:00–11:59 → "Good Morning"
  - 12:00–17:59 → "Good Afternoon"
  - 18:00–20:59 → "Good Evening"
  - 21:00–04:59 → "Good Night"
- User's name displayed in greeting; click to edit inline; saved to LocalStorage

### 6.2 Appearance / Settings
- Light/Dark mode toggle button with sun ☀️ / moon 🌙 icon
- Theme preference persisted in LocalStorage
- Smooth CSS transition on theme switch

### 6.3 Focus Timer (Pomodoro)
- Default 25-minute countdown displayed as MM:SS
- Start, Stop (pause), Reset buttons
- Input field to change the Pomodoro duration in minutes
- Alert / browser Notification when timer hits 00:00
- Timer state is in-memory only (resets on page refresh)

### 6.4 To-Do List
- Add tasks via input + button
- Task card shows: checkbox, text, Edit button, Delete button
- Completed tasks: strike-through text, visually dimmed
- Inline edit: clicking Edit replaces text with an `<input>`, confirmed with Save
- Delete removes task from DOM and LocalStorage
- Duplicate prevention: case-insensitive check; shows error message on duplicate
- Tasks persisted in LocalStorage
- Sort options: Default (insertion order), A–Z, Completed Last

### 6.5 Quick Links
- Grid of link cards that open in a new tab
- "Add Link" opens a modal/form for Name + URL
- Each card shows: favicon (via Google favicon service), name, URL, Delete button
- Favicon URL pattern: `https://www.google.com/s2/favicons?domain=<domain>&sz=32`
- Links persisted in LocalStorage
- Pre-populated defaults if LocalStorage is empty: Google, GitHub, YouTube

## 7. Code Quality Standards
- Semantic HTML elements (`<header>`, `<main>`, `<section>`, `<footer>`)
- CSS variables for all colors/spacing — no magic numbers scattered in rules
- JS grouped into labelled sections with comments (Greeting, Timer, Tasks, Links, Theme)
- No `console.log` in production code
- No inline `style` attributes in HTML
