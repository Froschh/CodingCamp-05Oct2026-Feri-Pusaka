# Implementation Plan: To-Do List Dashboard

## Overview

This document records the implementation tasks for the **To-Do List Dashboard** — a single-page, client-side personal productivity tool built with pure HTML5, CSS3, and Vanilla JavaScript. All state is persisted via the Browser LocalStorage API; there is no backend, no framework, and no build step.

Tasks are numbered sequentially and grouped by feature area. Each task is labelled **required** (core functionality) or **optional** (enhancement). Acceptance criteria describe what "done" looks like for each task.

---

## Tasks

### Project Setup

- [ ] 1. Project scaffold
  - **Priority:** required
  - **Description:**
    - Create `index.html` with semantic HTML5 structure, `<head>` meta tags, Google Fonts (`Inter` at weights 300/400/500/600/700 with `display=swap`), and correct relative paths to `css/style.css` and `js/app.js`.
    - Create `css/style.css` as the single stylesheet file (single-file rule: no additional stylesheets loaded at runtime).
    - Create `js/app.js` with `'use strict'` as the first statement (single-file rule: no additional scripts loaded at runtime).
    - _Requirements: 12.1, 12.2 (single-file constraint and no-framework constraint)_
  - **Acceptance Criteria:**
    - Opening `index.html` in any modern browser (Chrome, Firefox, Safari, Edge) renders a page structure with no console errors.
    - The Inter font loads from Google Fonts and is applied to page text.
    - Exactly one stylesheet (`css/style.css`) and one script (`js/app.js`) are referenced by `index.html` (excluding the Google Fonts `<link>` tags).
    - `js/app.js` begins with `'use strict'`.

---

### LocalStorage Helpers

- [ ] 2. LocalStorage helpers and UID generator
  - **Priority:** required
  - **Description:**
    - Implement `lsGet(key, fallback)`: calls `localStorage.getItem(key)`; if the result is `null`, returns `fallback`; otherwise attempts `JSON.parse` and returns the result, returning `fallback` on any `SyntaxError` or other exception.
    - Implement `lsSet(key, value)`: calls `localStorage.setItem(key, JSON.stringify(value))`.
    - Implement `uid()`: returns a unique string composed of `Date.now().toString(36)` concatenated with a 5-character random alphanumeric suffix (e.g. `Math.random().toString(36).slice(2, 7)`).
    - Define `LS_*` constants for all LocalStorage keys: `dashboard_name`, `dashboard_theme`, `dashboard_pomodoro_minutes`, `dashboard_tasks`, `dashboard_links`.
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - **Acceptance Criteria:**
    - `lsGet` with an absent key returns the specified fallback without throwing.
    - `lsGet` with a key whose value is corrupted JSON (e.g. `"{{broken"`) returns the specified fallback without throwing or logging an uncaught exception.
    - `lsSet` round-trips correctly: `lsGet(key, null)` after `lsSet(key, value)` returns a deeply equal value.
    - `uid()` returns a non-empty string; two consecutive calls return different strings.
    - No other part of `app.js` calls `localStorage.getItem` or `localStorage.setItem` directly — all access flows through `lsGet` / `lsSet`.

---

### Greeting Section

- [ ] 3. Live clock and date display
  - **Priority:** required
  - **Description:**
    - Implement `pad(n)`: returns a string of at least 2 characters by left-padding `n` with `"0"` if needed.
    - Implement `updateClock()`: reads `new Date()`, formats the time as `HH:MM:SS` using `pad`, formats the date as `DayName, MonthName DayNumber, FullYear` (day number not zero-padded), determines the greeting phrase via `getGreetingPhrase`, and writes each value to `#clock`, `#dateDisplay`, and `#greetingMessage` respectively.
    - Call `updateClock()` immediately on page load (before the first interval tick) and schedule it to run every 1 000 ms via `setInterval`.
    - The `#clock` element in `index.html` must carry `aria-live="polite"`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - **Acceptance Criteria:**
    - On page load, the clock shows the correct `HH:MM:SS` immediately (no blank frame before the first tick).
    - The date shows in the format `DayName, MonthName D, YYYY` — single-digit day numbers have no leading zero.
    - The clock visibly ticks every second.
    - At midnight (or simulated by advancing the system clock), the date updates to the new day without a page reload.
    - `#clock` has `aria-live="polite"` in the DOM.

- [ ] 4. Greeting phrase
  - **Priority:** required
  - **Description:**
    - Implement `getGreetingPhrase(hour)`: pure function that maps an integer `hour` in `[0, 23]` to exactly one phrase:
      - 5–11 → `"Good Morning"`
      - 12–17 → `"Good Afternoon"`
      - 18–20 → `"Good Evening"`
      - 21–23 and 0–4 → `"Good Night"`
    - `updateClock()` must call `getGreetingPhrase` on every tick so the phrase changes automatically at each hour boundary.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - **Acceptance Criteria:**
    - All 24 values 0–23 are handled — no hour falls through to `undefined` or an empty string.
    - Each phrase corresponds to the correct hour range per the specification.
    - The phrase updates automatically when the system clock crosses an hour boundary (no reload required).

- [ ] 5. Editable display name
  - **Priority:** required
  - **Description:**
    - Implement `renderName()`: reads `dashboard_name` via `lsGet` (fallback `"Friend"`) and writes the value to `#greetingName`.
    - Implement `showNameEdit()`: hides `#greetingName`, reveals `#nameEditWrapper`, pre-fills the input with the current name, and moves keyboard focus to the input.
    - Implement `saveName()`: trims the input value; if the trimmed value is empty or whitespace-only, stores `"Friend"`; otherwise stores the trimmed value; writes to `dashboard_name` via `lsSet` synchronously; hides `#nameEditWrapper` and restores `#greetingName`.
    - Pressing Escape or blurring the input (without clicking Save) must discard changes and restore the previous display without writing to LocalStorage.
    - The name input must have `maxlength="40"` in `index.html`.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
  - **Acceptance Criteria:**
    - On a fresh install (no `dashboard_name` key), the greeting shows `"Friend"`.
    - After saving a name and reloading, the saved name is displayed.
    - Saving an empty or whitespace-only string displays and stores `"Friend"`.
    - Pressing Escape while editing restores the previous name with no LocalStorage write.
    - The name input rejects characters beyond 40 (enforced by `maxlength`).

---

### Theme

- [ ] 6. Light / dark theme toggle
  - **Priority:** required
  - **Description:**
    - Implement `applyTheme(theme)`:
      - `'light'`: adds `light`, removes `dark` from `document.body`; sets the toggle icon to `🌙`; sets `aria-label` to `"Switch to dark mode"`; calls `lsSet(LS_THEME, 'light')`.
      - `'dark'`: adds `dark`, removes `light` from `document.body`; sets the toggle icon to `☀️`; sets `aria-label` to `"Switch to light mode"`; calls `lsSet(LS_THEME, 'dark')`.
    - On page load, call `applyTheme(lsGet(LS_THEME, 'light'))`.
    - The ThemeToggle button must be placed inside the sticky `<header>` in `index.html`.
    - The current theme is always derived from `document.body.classList` (not a JS variable) so DOM and state cannot diverge.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - **Acceptance Criteria:**
    - Clicking the toggle flips the theme visually and updates the icon and `aria-label`.
    - The selected theme persists across a page reload.
    - `document.body` always carries exactly one of `light` or `dark` — never both, never neither after initialisation.
    - The `aria-label` always describes the *next* action (opposite of current theme).
    - Theme transitions are smooth (CSS transition present; no abrupt colour flash).

---

### CSS Design Tokens and Layout

- [ ] 7. CSS design tokens and light / dark mode
  - **Priority:** required
  - **Description:**
    - Define all colour tokens as CSS custom properties on `:root` (light mode defaults): `--bg-primary`, `--bg-card`, `--text-primary`, `--text-muted`, `--accent`, and any additional surface/border/shadow tokens.
    - Define `body.dark { … }` that overrides every colour token for dark mode.
    - Define spacing variables: `--space-xs` through `--space-xl`.
    - Define `--transition: 0.25s ease`.
    - Apply `transition: background-color var(--transition), color var(--transition)` to `body` and `.card`.
    - No component anywhere in `style.css` may hardcode a colour value — all colours must reference a CSS variable.
    - _Requirements: 4.7, 12.3 (CSS variables / theming)_
  - **Acceptance Criteria:**
    - Adding `dark` to `<body>` (and removing `light`) via DevTools completely changes the colour scheme.
    - A search for hardcoded hex (`#`) or `rgb(` colours in component rules finds zero matches outside of `:root` and `body.dark` token definitions.
    - Theme transitions animate smoothly at ≈ 0.25 s.

- [ ] 8. Responsive page layout
  - **Priority:** required
  - **Description:**
    - Implement a sticky `<header>` (CSS `position: sticky; top: 0; z-index: 100`) containing the app title and ThemeToggle button.
    - Implement `<main>` with `max-width: 1100px`, centred via `margin: auto`.
    - Greeting card: full width at the top of `<main>`.
    - `.dashboard-grid`: `display: grid; grid-template-columns: 1fr 1.8fr` (Focus Timer column | To-Do List column).
    - Quick Links card: full width below `.dashboard-grid`.
    - `<footer>` with attribution text.
    - `@media (max-width: 768px)`: `.dashboard-grid` collapses to `grid-template-columns: 1fr`.
    - `@media (max-width: 480px)`: `.todo-add-row` switches to `flex-direction: column`; card padding reduced.
    - _Requirements: 12.4, 12.5 (responsive layout, 320 px – 1440 px support)_
  - **Acceptance Criteria:**
    - At 1440 px: two-column grid with timer left and tasks right; no horizontal scroll.
    - At 768 px: grid collapses to a single column; timer and tasks stack vertically.
    - At 320 px: task add row stacks vertically; all content visible without horizontal scroll.
    - The sticky header remains visible when scrolling a long task list.

---

### Focus Timer

- [ ] 9. Pomodoro countdown timer
  - **Priority:** required
  - **Description:**
    - Implement `formatTime(totalSeconds)`: pure function returning `MM:SS` with both parts zero-padded to 2 digits.
    - Implement `renderTimer()`: writes `formatTime(timerRemaining)` to `#timerDisplay`.
    - Implement `timerTick()`: decrements `timerRemaining` by 1; calls `renderTimer()`; if `timerRemaining` reaches 0, clears the interval, adds `.finished` to the timer widget, and calls `notifyTimerDone()`.
    - **Start button**: if not running, starts `setInterval(timerTick, 1000)`, sets `timerRunning = true`, adds `.running`; if already running, no-op; if `.finished`, resets `timerRemaining` to `timerDurationSecs` first.
    - **Pause button**: clears interval, sets `timerRunning = false`, removes `.running`; retains `timerRemaining`.
    - **Reset button**: clears interval, restores `timerRemaining = timerDurationSecs`, sets `timerRunning = false`, removes `.running` and `.finished`, calls `renderTimer()`.
    - **Apply button**: validates input as an integer in `[1, 120]`; if valid — stops timer, updates `timerDurationSecs` (and `timerRemaining`), persists to `dashboard_pomodoro_minutes` via `lsSet`, calls `renderTimer()`; if invalid — restores input field to the persisted value without other changes.
    - On load: `timerDurationSecs = lsGet(LS_POMODORO, 25) * 60`; `timerRemaining = timerDurationSecs`.
    - Timer state (`timerRemaining`, `timerRunning`, `timerInterval`) is **never** written to LocalStorage.
    - `#timerDisplay` in `index.html` must have `aria-live="polite" aria-atomic="true"`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.13, 5.14_
  - **Acceptance Criteria:**
    - Timer counts down accurately: each second decrements the display by exactly 1 second.
    - Start/Pause/Reset behave as specified in the state machine (design doc Section 5.2).
    - Applying a valid duration persists it and resets the display; applying an invalid value restores the input field.
    - At 00:00, `.finished` is applied to the timer widget (red pulse animation visible).
    - Page reload shows the saved duration in the stopped state with no `.running` or `.finished` class.
    - `#timerDisplay` has `aria-live="polite"` and `aria-atomic="true"`.

- [ ] 10. Timer completion notification
  - **Priority:** required
  - **Description:**
    - Implement `notifyTimerDone()` with the full degradation chain:
      1. `Notification.permission === 'granted'` → `new Notification('Focus session complete!', { … })`.
      2. `Notification.permission === 'default'` → `Notification.requestPermission().then(p => p === 'granted' ? new Notification(…) : alert(…))`.
      3. `Notification.permission === 'denied'` or `typeof Notification === 'undefined'` → `alert('Focus session complete!')`.
    - The promise returned by `requestPermission` must be handled — no floating promise / unhandled rejection.
    - _Requirements: 5.10, 5.11, 5.12_
  - **Acceptance Criteria:**
    - When the timer reaches 0: if notifications are granted, a browser notification fires; otherwise an `alert` fires.
    - No unhandled promise rejection appears in the console under any permission state.
    - Works when the `Notification` API is absent (older browsers / certain mobile browsers).

---

### To-Do List

- [ ] 11. Task addition and display
  - **Priority:** required
  - **Description:**
    - Initialise `tasks` from `lsGet(LS_TASKS, [])` on page load.
    - Implement `saveTasks()`: calls `lsSet(LS_TASKS, tasks)`.
    - Implement `addTask()`:
      - Trims `#taskInput` value.
      - If empty/whitespace → shows `ErrorBanner` ("Task cannot be empty.") auto-dismissed after 3 s; returns.
      - If a case-insensitive duplicate exists → shows `ErrorBanner` ("A task with that name already exists."); returns.
      - Else → pushes `{id: uid(), text: trimmed, done: false}` to `tasks`, clears the input, calls `saveTasks()`, calls `renderTasks()`.
    - Implement `showTaskError(msg)`: sets `#taskError` text, removes `hidden`, sets a 3 s timeout to add `hidden` back.
    - Implement `renderTasks()`: clears `#taskList`; if empty, renders empty-state `<li>`; otherwise calls `buildTaskItem(task)` for each item returned by `getSortedTasks()`.
    - `#taskInput` must have `maxlength="200"` in `index.html`.
    - `#taskList` must have `aria-live="polite"`; `#taskError` must have `role="alert"`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - **Acceptance Criteria:**
    - Submitting a valid task adds it to the list, clears the input, and persists to LocalStorage.
    - Submitting an empty or whitespace-only value shows the error banner; no task is added.
    - Submitting a case-insensitive duplicate shows the duplicate error; no task is added.
    - After a page reload, previously added tasks are restored from LocalStorage.
    - When no tasks exist, the empty-state message "No tasks yet — add one above!" is shown.
    - `#taskInput` blocks input beyond 200 characters.
    - `#taskList` has `aria-live="polite"`; `#taskError` has `role="alert"`.

- [ ] 12. Task completion, edit, and delete
  - **Priority:** required
  - **Description:**
    - Implement `buildTaskItem(task)`: returns a `<li>` containing a checkbox (with `aria-label`), a text `<span>`, an Edit button, and a Delete button; attaches per-element event listeners.
    - Implement `toggleTask(id)`: flips `task.done`, calls `saveTasks()`, calls `renderTasks()`.
    - The `.completed` CSS class (strikethrough + `opacity: 0.5`) is applied to a `<li>` when `task.done === true`.
    - Implement `startEditTask(li, task)`: replaces the text `<span>` with an inline `<input>` (max 200, focused) and swaps the Edit button for Save + Cancel buttons.
      - **Save / Enter**: trim value → empty error (keep open); duplicate of another task → "A task with that name already exists." (keep open); else update `task.text`, call `saveTasks()`, call `renderTasks()`.
      - **Cancel / Escape**: discard changes, call `renderTasks()` without writing.
    - Implement `deleteTask(id)`: filters `tasks`, calls `saveTasks()`, calls `renderTasks()`.
    - All ARIA labels on checkbox, Edit, Delete, Save, Cancel buttons must include the task text for context.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - **Acceptance Criteria:**
    - Clicking the checkbox toggles the `completed` class and persists the new `done` state; toggling twice returns to the original state.
    - The Edit flow opens an inline editor pre-filled with the task text; empty and duplicate saves are rejected with inline errors; a valid save updates the task and persists.
    - Pressing Escape or clicking Cancel discards edits and leaves the TaskStore unchanged.
    - Clicking Delete removes the task, persists, and re-renders; the deleted task does not reappear on reload.
    - All action buttons have `aria-label` attributes that include the relevant task text.

- [ ] 13. Task sorting
  - **Priority:** required
  - **Description:**
    - Declare `currentSort = 'default'` as a module-level variable.
    - Implement `getSortedTasks()`: returns a copy of `tasks` (never mutates the original):
      - `'default'` → insertion order (no change).
      - `'alpha'` → `localeCompare` case-insensitive; equal texts retain insertion order (stable sort).
      - `'completed'` → incomplete tasks first, then complete tasks; insertion order preserved within each group.
    - Attach `click` listeners to the three sort buttons (`#sortDefault`, `#sortAlpha`, `#sortCompleted`).
    - On click: update `currentSort`, set `active` class and `aria-pressed="true"` on the clicked button, remove both from the other two, call `renderTasks()`.
    - On load: `#sortDefault` has `active` class and `aria-pressed="true"`; others have `aria-pressed="false"`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - **Acceptance Criteria:**
    - Default sort renders tasks in insertion order.
    - A–Z sort renders tasks alphabetically (case-insensitive); equal names preserve relative order.
    - Completed Last sort renders all incomplete tasks before all complete tasks.
    - The `tasks` array is not mutated by any sort operation.
    - Exactly one sort button has `active` class and `aria-pressed="true"` at all times.

---

### Quick Links

- [ ] 14. Quick links display and navigation
  - **Priority:** required
  - **Description:**
    - Initialise `links`: `let links = lsGet(LS_LINKS, null); if (links === null) { links = DEFAULT_LINKS; lsSet(LS_LINKS, links); }`.
    - `DEFAULT_LINKS`: array of three link objects for Google, GitHub, and YouTube (seeded once; never re-seeded for a stored empty array).
    - Implement `renderLinks()`: clears `#linksGrid`; if `links` is empty, injects empty-state `<p>`; otherwise calls `buildLinkCard(link)` for each.
    - Implement `buildLinkCard(link)`: returns a `<div class="link-card">` with a favicon `<img>` (source: `https://www.google.com/s2/favicons?domain=<hostname>&sz=32`), name `<p>`, hostname `<p>`, and a Delete button; `onerror` on `<img>` replaces `src` with the fallback SVG data URI; `role="button" tabindex="0"` on the card; click / keydown (Enter or Space) → `window.open(url, '_blank', 'noopener,noreferrer')`.
    - Implement `getDomain(url)`: wraps `new URL(url).hostname` in try/catch; returns the raw URL string on failure.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - **Acceptance Criteria:**
    - On a fresh install (no `dashboard_links`), the three default links (Google, GitHub, YouTube) are shown and persisted.
    - On subsequent loads with stored links, no re-seeding occurs.
    - Clicking a link card opens the URL in a new tab with `noopener,noreferrer`.
    - Pressing Enter or Space on a focused link card also opens the URL.
    - When a favicon fails to load, the fallback SVG (🔗) is shown — no broken-image placeholder.
    - When `links` is empty, the empty-state message is displayed.

- [ ] 15. Add link modal
  - **Priority:** required
  - **Description:**
    - Implement `openLinkModal()`: clears Name and URL inputs, clears any `#linkError`, removes `hidden` from `#linkModal`, moves focus to the Name input.
    - Implement `closeLinkModal()`: adds `hidden` to `#linkModal`.
    - Implement `saveLink()`:
      - Trim Name and URL values.
      - Empty name → display error; keep modal open.
      - Empty URL → display error; keep modal open.
      - URL lacks scheme → prepend `https://`.
      - `new URL(resolvedUrl)` throws → display "Please enter a valid URL."; keep modal open.
      - `links.length >= 50` → display CapacityError; keep modal open.
      - Valid → push `{id: uid(), name: trimmedName, url: resolvedUrl}`, call `saveLinks()`, call `closeLinkModal()`, call `renderLinks()`.
    - Implement `saveLinks()`: calls `lsSet(LS_LINKS, links)`.
    - Implement `deleteLink(id)`: `e.stopPropagation()`, filters `links`, calls `saveLinks()`, calls `renderLinks()`.
    - Modal dismissal: Cancel button, Escape key (global `document` keydown guard with `!linkModal.classList.contains('hidden')`), or clicking the overlay (`e.target === linkModal`).
    - Name input `maxlength="50"`; URL input `maxlength="2048"`.
    - `#linkModal` has `role="dialog" aria-modal="true" aria-labelledby="modalTitle"`.
    - `#linkError` has `role="alert"`.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12_
  - **Acceptance Criteria:**
    - "+ Add Link" opens the modal with blank fields and focus on the Name input.
    - Each validation path (empty name, empty URL, invalid URL) shows the correct error and keeps the modal open.
    - URLs without a scheme have `https://` prepended before validation and storage.
    - A valid link is saved, the modal closes, and the link appears in the grid; it persists after reload.
    - Attempting to save a 51st link shows the CapacityError; the LinkStore remains at 50.
    - Cancel, Escape, and overlay click all close the modal without modifying the LinkStore.
    - The Delete button on a link card removes it without triggering navigation.
    - `#linkModal` has `role="dialog"` and `aria-modal="true"`; `#linkError` has `role="alert"`.

---

### Accessibility

- [ ] 16. ARIA and keyboard accessibility polish
  - **Priority:** required
  - **Description:**
    - Verify and enforce all ARIA attributes specified in design doc Section 10:
      - `#clock`: `aria-live="polite"`
      - `#timerDisplay`: `aria-live="polite" aria-atomic="true"`
      - `#taskList`: `aria-live="polite"`
      - `#taskError`: `role="alert" aria-live="assertive"`
      - `#linkError`: `role="alert" aria-live="assertive"`
      - `#linksGrid`: `aria-live="polite"`
      - `#linkModal`: `role="dialog" aria-modal="true" aria-labelledby="modalTitle"`
      - `.link-card`: `role="button" tabindex="0"`
      - Sort buttons: `aria-pressed` toggled correctly on each activation
      - `#themeToggle`: `aria-label` reflects the *next* action at all times
      - Checkboxes, Edit, Delete, Save buttons: `aria-label` includes task text
    - Verify keyboard navigation covers all interactive controls (Tab / Shift-Tab traversal, Enter / Space activation for custom controls).
    - _Requirements: 1.5, 10.2 (ARIA live regions, roles, labels), 12.6 (keyboard nav)_
  - **Acceptance Criteria:**
    - Tab / Shift-Tab cycles through all interactive elements in a logical DOM order.
    - Enter and Space activate all custom `role="button"` elements (link cards, name edit button).
    - `aria-pressed` is `"true"` on the active sort button and `"false"` on the others.
    - `aria-label` on ThemeToggle describes the next action (not the current theme).
    - Screen-reader-relevant attributes (`aria-live`, `role="alert"`, `aria-atomic`, `aria-modal`) are present in the DOM as specified.

---

### Optional Enhancements

- [ ] 17. LocalStorage write-error handling *(optional)*
  - **Priority:** optional
  - **Description:**
    - Wrap `lsSet` in a try/catch that catches `QuotaExceededError` and any other write failure.
    - On write failure in task or link mutations (`addTask`, `deleteTask`, `saveLink`, `deleteLink`): revert the in-memory `tasks` / `links` array to its state before the mutation, then show a `StorageError` banner to the user.
    - On write failure for theme or name writes: still apply the change to the DOM (do not revert); show a transient `StorageError` banner.
    - _Requirements: 4.8 (theme), 6.8 (tasks), 10.13 (links), 11.3_
  - **Acceptance Criteria:**
    - When a write fails (simulatable by filling LocalStorage to capacity in DevTools), the `StorageError` banner is shown to the user.
    - For task/link mutations, the in-memory array is reverted and the UI reflects the pre-mutation state after the error.
    - For theme/name writes, the DOM change persists but the error banner is still shown.
    - No unhandled exception propagates to the console on write failure.

- [ ] 18. Midnight date rollover *(optional)*
  - **Priority:** optional
  - **Description:**
    - Document and verify that the existing `setInterval` calling `updateClock()` every second with `new Date()` causes the date display to update automatically at midnight.
    - No code change is required if the implementation already calls `new Date()` on every tick; this task is a verification and documentation task only.
    - _Requirements: 1.4_
  - **Acceptance Criteria:**
    - The date display shows the new date at midnight without a page reload (verifiable by advancing the system clock to 23:59:58 and observing the rollover).
    - No reload or manual intervention is required for the date to update.

---

## Notes

- Tasks marked with *(optional)* can be skipped for a faster MVP without breaking core functionality.
- Each task references specific requirements clauses from `requirements.md` for full traceability.
- All tasks involve only writing, modifying, or testing code in `index.html`, `css/style.css`, and `js/app.js`.
- The single-file rule is a hard constraint: exactly one stylesheet and one script at runtime.
- Property-based test properties are defined in design doc Section 13 (Properties 1–20); they are referenced by tasks 3–15 where relevant.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "7", "8"] },
    { "id": 2, "tasks": ["3", "4", "5", "6", "9", "11", "14"] },
    { "id": 3, "tasks": ["10", "12", "13", "15"] },
    { "id": 4, "tasks": ["16"] },
    { "id": 5, "tasks": ["17", "18"] }
  ]
}
```
