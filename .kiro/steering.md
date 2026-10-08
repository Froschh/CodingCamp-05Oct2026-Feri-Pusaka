# Project Rules & Constraints — To-Do List Dashboard

## Folder Rules
- Only 1 CSS file: `css/style.css`
- Only 1 JS file: `js/app.js`

## Tech Stack
- HTML5 (structure)
- CSS3 with custom properties (styling)
- Vanilla JavaScript (no frameworks, no build step)
- No backend server
- Browser LocalStorage API for all persistence

## Browser Compatibility
- Chrome, Firefox, Edge, Safari (modern versions)
- Must work as standalone web app (open `index.html` directly)

## Features
1. **Greeting**: custom name, live clock (updates every second), current date, time-based greeting text
2. **Dark/Light mode toggle** (preference saved to LocalStorage)
3. **Focus Timer**: 25-minute Pomodoro countdown, Start/Stop/Reset buttons, adjustable duration
4. **To-Do List**: add/edit/delete/complete tasks, no case-insensitive duplicates, filter & sort, persisted in LocalStorage
5. **Quick Links**: add/delete links that open in new tab, default links seeded on first load, persisted in LocalStorage

## LocalStorage Keys
| Key | Type | Description |
|-----|------|-------------|
| `todo-dashboard-tasks` | JSON string | Array of task objects `{ id, text, done, createdAt }` |
| `todo-dashboard-links` | JSON string | Array of link objects `{ id, name, url }` |
| `todo-dashboard-user`  | plain string | Username (e.g. `"Feri"`) |
| `todo-dashboard-theme` | plain string | `"light"` or `"dark"` |

## Design Guidelines
- CSS custom properties (`--var`) for all colours and spacing — never hard-coded hex values in component rules
- `body.dark-mode` class overrides all colour variables for dark theme
- Mobile-first responsive layout; dashboard grid reflows at 768 px and 1200 px
- Smooth 0.3 s transitions on theme switch for background and colour
- Cards with subtle box-shadow per section
- Google Fonts: Inter (imported via `@import` in CSS)

## Code Standards
- Keep code clean and readable with comments separating each logical section
- No inline HTML event attributes — all listeners attached via JavaScript
- No external libraries or CDN scripts other than Google Fonts
- No test framework required
