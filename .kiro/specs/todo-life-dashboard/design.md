# Design Document — To-Do List Dashboard

## Overview

The To-Do List Dashboard is a single-page, client-side personal productivity tool. It runs entirely in the browser with no backend, no build step, and no JavaScript frameworks. All persistent state lives in the Browser LocalStorage API.

### Goals

| Goal | Mechanism |
|---|---|
| Zero-dependency deployment | Pure HTML5 + CSS3 + Vanilla JS |
| Instant offline use after first load | LocalStorage-only persistence |
| Maintainability (one developer, one file per type) | Single-file rule enforced by folder structure |
| Broad browser support | No ES modules, no modern-only APIs beyond LocalStorage |
| Accessible by default | ARIA live regions, roles, labels, keyboard navigation |

---

## Architecture

### 2.1 File Structure

```
index.html              ← entry point; wires HTML skeleton and loads assets
css/
  style.css             ← all presentation (single-file rule)
js/
  app.js                ← all behaviour (single-file rule)
.kiro/
  specs/
    todo-life-dashboard/
      .config.kiro
      requirements.md
      design.md
      tasks.md
```

**Single-file rule:** exactly one stylesheet and one script file are loaded by `index.html` at runtime (excluding Google Fonts). This keeps the project navigable without a bundler or module graph.

### 2.2 Layering

```
┌──────────────────────────────────────────────┐
│  index.html  (structure + semantic markup)   │
├──────────────────────────────────────────────┤
│  css/style.css  (presentation + theming)     │
├──────────────────────────────────────────────┤
│  js/app.js  (behaviour, state, persistence)  │
│  ┌──────────┐ ┌────────┐ ┌───────────────┐   │
│  │ Greeting │ │ Theme  │ │ Focus Timer   │   │
│  ├──────────┤ ├────────┤ ├───────────────┤   │
│  │  To-Do   │           │  Quick Links  │   │
│  └──────────┘           └───────────────┘   │
├──────────────────────────────────────────────┤
│  Browser LocalStorage API  (persistence)     │
└──────────────────────────────────────────────┘
```

`app.js` is organised into six logical sections separated by block comments. There is no import/export — all identifiers live in the same strict-mode script scope.

---

## Components and Interfaces

All components are implemented in `app.js`. Each section follows the same pattern:

1. Query DOM elements once at module scope.
2. Define pure helper functions.
3. Define mutating functions that update state and call `render*()`.
4. Attach event listeners once at module scope.
5. Call the initialisation path (read LocalStorage → render).

### 3.1 LocalStorage Helpers

| Function | Signature | Purpose |
|---|---|---|
| `lsGet` | `(key, fallback) → any` | `JSON.parse` with try/catch; returns `fallback` on missing key or parse error |
| `lsSet` | `(key, value) → void` | `JSON.stringify` + `localStorage.setItem` |
| `uid` | `() → string` | `Date.now().toString(36)` + 5-char random suffix; used for task and link IDs |

`lsGet` is the single point of defence against corrupt LocalStorage. No other part of the app calls `localStorage.getItem` directly.

### 3.2 Greeting Section

Responsible for the live clock, the date display, the time-based greeting phrase, and the editable display name.

| Function | Purpose |
|---|---|
| `updateClock()` | Reads `new Date()`, formats, and writes to `#clock`, `#dateDisplay`, `#greetingMessage` |
| `getGreetingPhrase(hour)` | Pure mapping of `[0–23]` → one of four phrases |
| `pad(n)` | Zero-pads a number to 2 digits |
| `renderName()` | Reads `dashboard_name` from LocalStorage and writes to `#greetingName` |
| `showNameEdit()` | Swaps `#greetingName` for `#nameEditWrapper` |
| `saveName()` | Trims input, falls back to `"Friend"` if blank, writes to LocalStorage, swaps back |

`updateClock()` is called immediately on load and then every 1 000 ms via `setInterval`. The greeting phrase is re-evaluated on every tick, so it updates automatically when the hour boundary is crossed.

The name editor is inline (no modal): the `#greetingName` button is hidden and `#nameEditWrapper` is revealed in the same DOM node. Pressing Escape or blurring without saving restores the previous value without touching LocalStorage.

### 3.3 Theme

| Function | Signature | Purpose |
|---|---|
| `applyTheme(theme)` | `('light' \| 'dark') → void` | Adds/removes `body.dark` / `body.light`, updates icon text and `aria-label`, calls `lsSet` |

Theme state is not kept in a JS variable — the current theme is always derived from `document.body.classList`. This avoids any state/DOM divergence.

Initialisation: `applyTheme(lsGet(LS_THEME, 'light'))` on page load.

### 3.4 Focus Timer

Implements a Pomodoro-style countdown with start, pause, and reset controls plus a configurable duration.

| Function | Purpose |
|---|---|
| `renderTimer()` | Writes `formatTime(timerRemaining)` to `#timerDisplay` |
| `formatTime(totalSeconds)` | Pure: `Math.floor(s/60)` + `pad` for both parts |
| `timerTick()` | Decrements `timerRemaining`; stops and calls `notifyTimerDone()` at 0 |
| `notifyTimerDone()` | Browser Notification with `alert()` fallback |

Timer state (`timerDurationSecs`, `timerRemaining`, `timerInterval`, `timerRunning`) lives only in memory. The only value persisted to LocalStorage is the configured duration (`dashboard_pomodoro_minutes`), never the countdown's remaining time or running state.

The timer state machine is described in [Section 5.2](#52-timer-state-machine).

### 3.5 To-Do List

The largest section. Manages a `tasks` array that is the single source of truth for the task list.

| Function | Purpose |
|---|---|
| `addTask()` | Validates input (empty, duplicate), appends to `tasks`, calls `saveTasks()` + `renderTasks()` |
| `renderTasks()` | Clears `taskList.innerHTML`; calls `getSortedTasks()`, then `buildTaskItem()` for each |
| `buildTaskItem(task)` | Returns a `<li>` with checkbox, text span, edit button, delete button |
| `startEditTask(li, task)` | Replaces text span with inline `<input>`, replaces Edit button with Cancel |
| `toggleTask(id)` | Flips `done`, calls `saveTasks()` + `renderTasks()` |
| `deleteTask(id)` | Filters out the task, calls `saveTasks()` + `renderTasks()` |
| `saveTasks()` | `lsSet(LS_TASKS, tasks)` |
| `getSortedTasks()` | Returns a sorted copy of `tasks` without mutating the original |
| `showTaskError(msg)` | Sets `#taskError` text, removes `hidden`, auto-hides after 3 s |

Duplicate detection is case-insensitive (`toLowerCase()` comparison) and applies both on add and on edit.

### 3.6 Quick Links

Manages a `links` array and a modal for adding new links.

| Function | Purpose |
|---|---|
| `renderLinks()` | Clears `linksGrid.innerHTML`; calls `buildLinkCard()` for each link |
| `buildLinkCard(link)` | Returns a `.link-card` div with favicon `<img>`, name, hostname, delete button |
| `getDomain(url)` | Wraps `new URL(url).hostname` in try/catch; returns raw string on failure |
| `deleteLink(id)` | Filters out the link, calls `saveLinks()` + `renderLinks()` |
| `openLinkModal()` | Clears inputs, removes `hidden` from `#linkModal`, focuses name input |
| `closeLinkModal()` | Adds `hidden` to `#linkModal` |
| `saveLink()` | Validates name + URL, prepends `https://` if scheme absent, calls `lsSet` + render + close |
| `saveLinks()` | `lsSet(LS_LINKS, links)` |

Default links (Google, GitHub, YouTube) are seeded exactly once: when `lsGet(LS_LINKS, null)` returns `null` (key absent or invalid JSON). A stored empty array (`[]`) is never re-seeded.

The modal is closed by: Cancel button, Escape key (global `keydown` listener on `document`), or clicking the overlay backdrop (`e.target === linkModal`).

---

## Data Models

### 4.1 Task Object

```js
{
  id:   string,   // uid() — unique, never reused
  text: string,   // trimmed, 1–200 chars, case-insensitively unique within TaskStore
  done: boolean   // false on creation; toggled by checkbox
}
```

### 4.2 Link Object

```js
{
  id:   string,  // uid() — unique
  name: string,  // display label, 1–50 chars
  url:  string   // always a valid URL beginning with http:// or https://
}
```

### 4.3 LocalStorage Schema

| Key | Type | Fallback | Notes |
|---|---|---|---|
| `dashboard_name` | `string` | `"Friend"` | Trimmed; `""` stored as `"Friend"` |
| `dashboard_theme` | `"light" \| "dark"` | `"light"` | Set synchronously on every toggle |
| `dashboard_pomodoro_minutes` | `number` (integer) | `25` | Range [1, 120]; set on Apply only |
| `dashboard_tasks` | `Task[]` | `[]` | Re-serialised on every mutation |
| `dashboard_links` | `Link[] \| null` | `null` → seed | `null` triggers default-seed logic |

All values are stored as JSON strings. Reading uses `lsGet` which handles `null` (absent key) and malformed JSON transparently.

---

## State Management

### 5.1 In-Memory State (module-level variables in `app.js`)

| Variable | Type | Description |
|---|---|---|
| `tasks` | `Task[]` | Live task list; source of truth for task section |
| `currentSort` | `"default" \| "alpha" \| "completed"` | Current sort mode for task list |
| `links` | `Link[]` | Live link list; source of truth for quick-links section |
| `timerDurationSecs` | `number` | Full countdown duration in seconds |
| `timerRemaining` | `number` | Seconds remaining in current countdown |
| `timerInterval` | `number \| null` | `setInterval` handle; `null` when not running |
| `timerRunning` | `boolean` | `true` only while the interval is active |

Theme and name are not held in JS variables — they are derived on demand from `document.body.classList` and `lsGet` respectively.

### 5.2 Timer State Machine

```
                ┌────────────────────────────────────────┐
                │              STOPPED                   │
                │  (timerRunning = false, interval = null)│
                └────────┬───────────────────────────────┘
                         │ Start pressed (remaining > 0)
                         ▼
                ┌────────────────────────────────────────┐
                │              RUNNING                   │◄──────────────┐
                │  (timerRunning = true, interval = id)  │               │
                └──────┬───────────────┬─────────────────┘               │
                       │ Pause         │ remaining reaches 0             │
                       ▼               ▼                                 │
          ┌────────────────┐  ┌────────────────────────────┐             │
          │    PAUSED      │  │         FINISHED            │             │
          │ (interval=null)│  │  (.finished class applied) │             │
          └────────┬───────┘  └────────────┬───────────────┘             │
                   │ Reset                  │ Start pressed               │
                   │                        └─────────────────────────────┘
                   │                          (resets remaining first)
                   ▼
          ┌────────────────┐
          │    STOPPED     │◄── Reset from RUNNING or PAUSED
          └────────────────┘
```

**CSS class mapping:**

| State | `.running` | `.finished` |
|---|---|---|
| STOPPED | absent | absent |
| RUNNING | present | absent |
| PAUSED | absent | absent |
| FINISHED | absent | present |

`Start` from FINISHED resets `timerRemaining` to `timerDurationSecs` before starting the interval — this ensures the display never shows 00:00 momentarily on restart.

---

## Rendering Strategy

The app uses **full re-render on every mutation** — no virtual DOM diffing, no reconciliation, no incremental updates.

```
User action
    │
    ▼
Mutate in-memory state (tasks / links array)
    │
    ▼
Persist to LocalStorage (lsSet)
    │
    ▼
Clear container innerHTML
    │
    ▼
Rebuild all child elements from current state
    │
    ▼
Attach per-element event listeners
```

**Task list** (`renderTasks`):
1. Calls `getSortedTasks()` to get a display copy (never mutates `tasks`).
2. If the copy is empty, injects a single `<li>` with the empty-state message.
3. Otherwise, calls `buildTaskItem(task)` for each and appends to `#taskList`.

**Links grid** (`renderLinks`):
1. If `links` is empty, injects a `<p>` with the empty-state message.
2. Otherwise, calls `buildLinkCard(link)` for each and appends to `#linksGrid`.

**Rationale:** At this scale (≤ 100 tasks, ≤ 50 links) the cost of full re-render is imperceptible. It eliminates all incremental-update bugs (stale references, missed updates) and keeps each render function as a total, side-effect-free rebuild.

**Inline edit exception:** `startEditTask` directly mutates the `<li>` it receives rather than re-rendering, to preserve focus and avoid flicker. It calls `renderTasks()` only on save or cancel.

---

## Theme System

### 7.1 CSS Architecture

All colour and surface tokens are defined as CSS custom properties on `:root` (light defaults):

```css
:root {
  --bg-primary:   #f8f9fa;
  --bg-card:      #ffffff;
  --text-primary: #1a1a2e;
  --text-muted:   #6c757d;
  --accent:       #6c63ff;
  /* … more tokens … */
}
```

Dark mode overrides all tokens via `body.dark`:

```css
body.dark {
  --bg-primary:   #0f0f1a;
  --bg-card:      #1a1a2e;
  --text-primary: #e8e8f0;
  /* … */
}
```

No component ever hardcodes a colour value — all colours reference a CSS variable. This means the entire colour scheme flips in a single class toggle.

### 7.2 Transition

```css
body,
.card {
  transition: background-color 0.25s ease, color 0.25s ease;
}
```

The transition is on `body` and `.card` so the page-level background and all card surfaces animate smoothly on toggle.

### 7.3 JavaScript Side

`applyTheme(theme)` is the single point of control:

```
applyTheme('dark')
  → body.classList: remove 'light', add 'dark'
  → themeIconEl.textContent = '☀️'
  → themeToggleBtn.setAttribute('aria-label', 'Switch to light mode')
  → lsSet(LS_THEME, 'dark')
```

The current theme is derived from `document.body.classList.contains('dark')` rather than a JS variable, keeping DOM and state in sync by construction.

---

## Persistence Layer

### 8.1 lsGet / lsSet Design

```js
function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (_) {
    return fallback;   // handles SyntaxError from malformed JSON
  }
}

function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
```

`lsGet` handles two failure modes silently:
- **Missing key**: `localStorage.getItem` returns `null` → returns `fallback`.
- **Corrupt JSON**: `JSON.parse` throws `SyntaxError` → returns `fallback`.

`lsSet` does not catch write failures (e.g. `QuotaExceededError`). The requirements specify that the app should show a `StorageError` in this case; the current implementation does not yet surface write errors to the user — this is noted as a known gap.

### 8.2 Write Discipline

Every mutation calls the relevant `save*()` helper **synchronously before** (or as part of) re-rendering:

```
addTask()
  → tasks.push(newTask)
  → saveTasks()       ← synchronous lsSet
  → renderTasks()
```

This means LocalStorage is always at least as fresh as the rendered UI — there is no window where the UI shows data that has not been persisted.

### 8.3 Fallback Matrix

| Key | Absent | Invalid JSON |
|---|---|---|
| `dashboard_name` | `"Friend"` | `"Friend"` |
| `dashboard_theme` | `"light"` | `"light"` |
| `dashboard_pomodoro_minutes` | `25` | `25` |
| `dashboard_tasks` | `[]` | `[]` |
| `dashboard_links` | `null` (→ seed) | `null` (→ seed) |

### 8.4 Seed Logic for Links

```js
let links = lsGet(LS_LINKS, null);
if (links === null) {
  links = DEFAULT_LINKS;
  lsSet(LS_LINKS, links);
}
```

The seed runs once at startup when `lsGet` returns `null`. A stored empty array (`[]`) evaluates as truthy and skips the seed. This ensures default links appear on a fresh install but are not re-injected after the user deletes all links.

---

## Event Architecture

### 9.1 Listener Attachment Pattern

All event listeners are attached once at module scope (not inside render functions), except for per-item listeners in `buildTaskItem` and `buildLinkCard` which are attached during each full re-render.

```
Module scope (attached once)
├── greetingNameEl    click, keydown
├── saveNameBtn       click
├── nameInputEl       keydown
├── themeToggleBtn    click
├── timerStartBtn     click
├── timerStopBtn      click
├── timerResetBtn     click
├── applyTimerBtn     click
├── addTaskBtn        click
├── taskInputEl       keydown (Enter → addTask)
├── sortBtns (×3)     click
├── openAddLinkBtn    click
├── cancelLinkBtn     click
├── saveLinkBtn       click
├── linkModal         click (overlay delegation)
├── linkUrlInput      keydown (Enter → saveLink)
├── linkNameInput     keydown (Enter → focus URL)
└── document          keydown (Escape → closeLinkModal)

Per-render (re-attached on every renderTasks / renderLinks call)
├── checkbox          change → toggleTask
├── editBtn           click → startEditTask
├── delBtn (task)     click → deleteTask
├── linkCard          click → navigate, keydown → Enter/Space navigate
└── delBtn (link)     click (stopPropagation) → deleteLink
```

### 9.2 Modal Dismissal

The `linkModal` overlay uses a single `click` listener on the overlay element:

```js
linkModal.addEventListener('click', (e) => {
  if (e.target === linkModal) closeLinkModal();
});
```

`e.target === linkModal` ensures clicks on the inner `.modal` box do not dismiss — only clicks on the translucent backdrop do.

The `document` keydown listener for Escape guards with `!linkModal.classList.contains('hidden')` to avoid closing a non-open modal.

---

## Accessibility Design

### 10.1 ARIA Live Regions

| Element | Attribute | Reason |
|---|---|---|
| `#clock` | `aria-live="polite"` | Clock updates every second; polite avoids interrupting speech |
| `#timerDisplay` | `aria-live="polite" aria-atomic="true"` | MM:SS display; `atomic` ensures the whole value is read, not just the changed digit |
| `#taskList` | `aria-live="polite"` | Announces task list changes after adds/edits/deletes |
| `#taskError` | `role="alert" aria-live="assertive"` | Error messages need immediate announcement |
| `#linkError` | `role="alert" aria-live="assertive"` | Same rationale |
| `#linksGrid` | `aria-live="polite"` | Announces link additions/removals |

### 10.2 ARIA Roles and Labels

| Element | Role / Attribute | Value |
|---|---|---|
| `#linkModal` | `role="dialog" aria-modal="true" aria-labelledby="modalTitle"` | Identifies the modal and its title |
| `.link-card` | `role="button" tabindex="0"` | Makes non-button divs keyboard-focusable |
| Sort buttons | `aria-pressed` | `"true"` on active button, `"false"` on others |
| `#themeToggle` | `aria-label` | Describes the *next* action ("Switch to dark mode" / "Switch to light mode") |
| Checkboxes | `aria-label` | `"Mark "task text" as complete/incomplete"` |
| Edit/Delete/Save buttons | `aria-label` | Include task text for context |

### 10.3 Keyboard Navigation

| Interaction | Key |
|---|---|
| Open name editor | Enter or Space on `#greetingName` |
| Save name | Enter in `#nameInput` |
| Cancel name edit | Escape in `#nameInput` |
| Add task | Enter in `#taskInput` |
| Save task edit | Enter in `.task-edit-input` |
| Cancel task edit | Escape in `.task-edit-input` |
| Activate link card | Enter or Space on `.link-card` |
| Advance to URL field | Enter in `#linkNameInput` |
| Submit link form | Enter in `#linkUrlInput` |
| Close link modal | Escape (anywhere) |

---

## Responsive Design

### 11.1 Layout Breakpoints

**≥ 769 px (desktop default)**

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1.8fr;   /* timer | todo-list */
  gap: var(--gap);
}
```

The Quick Links panel sits below the grid at full width.

**≤ 768 px (tablet / large phone)**

```css
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;        /* single column */
  }
}
```

Focus Timer and To-Do List stack vertically.

**≤ 480 px (small phone)**

```css
@media (max-width: 480px) {
  .todo-add-row {
    flex-direction: column;            /* input and button stack */
  }
  /* padding reductions on cards */
}
```

### 11.2 Sticky Header

```css
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
}
```

The theme toggle remains visible at all scroll positions.

### 11.3 Supported Viewport Range

320 px minimum → 1 440 px maximum with no horizontal scroll or control overlap.

---

## External Dependencies

### 12.1 Google Fonts — Inter

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
      rel="stylesheet">
```

**Fallback:** The CSS font stack is `'Inter', sans-serif`. If the font fails to load (offline, blocked), the browser's default sans-serif is used. The layout does not depend on Inter's metrics — no fixed-height containers rely on the font.

### 12.2 Google Favicon Service

```js
favicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
```

**Fallback:** An `onerror` handler replaces the broken image with an inline SVG data URI containing a 🔗 emoji:

```js
favicon.onerror = () => {
  favicon.src = 'data:image/svg+xml,...';
};
```

This means every link card always shows a visible icon — either the real favicon or the generic fallback. No broken-image placeholder is ever shown.

### 12.3 Browser Notification API

Used to notify the user when the Focus Timer reaches zero.

**Degradation chain:**
1. Permission `"granted"` → `new Notification(...)`.
2. Permission `"default"` → `Notification.requestPermission()` → if granted, show notification; else `alert()`.
3. Permission `"denied"` or API absent → `alert()`.

`alert()` is always available, so the timer completion notice is delivered regardless of browser capabilities.

### 12.4 Offline Behaviour

After the initial page load, the app works fully offline:
- All logic runs from the cached JS/CSS/HTML.
- LocalStorage reads and writes are local.
- Font and favicon fetches fail silently (fallbacks kick in).
- No feature throws an unhandled error when the network is unavailable.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Clock Format Invariant

*For any* valid `Date` object, `updateClock()` produces a Clock string that matches the pattern `HH:MM:SS` (two-digit zero-padded hours, minutes, and seconds).

**Validates: Requirements 1.1**

---

### Property 2: Date Display Format Invariant

*For any* valid `Date` object, `updateClock()` produces a DateDisplay string that matches the pattern `DayName, MonthName D, YYYY` where the day number carries no leading zero.

**Validates: Requirements 1.2**

---

### Property 3: Greeting Phrase Exhaustive Coverage

*For any* integer hour in [0, 23], `getGreetingPhrase(hour)` returns exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"`, with each hour mapping to the correct phrase per the specification boundaries (5–11 Morning, 12–17 Afternoon, 18–20 Evening, 21–23/0–4 Night).

**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

---

### Property 4: Display Name Whitespace Fallback

*For any* string composed entirely of whitespace characters (including the empty string), `saveName()` stores and displays exactly `"Friend"` rather than the whitespace string.

**Validates: Requirements 3.5**

---

### Property 5: Display Name Persistence Round-Trip

*For any* non-empty, non-whitespace-only string of at most 40 characters, `lsSet(LS_NAME, name)` followed by `lsGet(LS_NAME, 'Friend')` returns the identical string.

**Validates: Requirements 3.6, 11.2**

---

### Property 6: Theme Toggle Involution

*For any* starting theme applied via `applyTheme(theme)`, calling the toggle handler twice in succession returns `document.body`'s class list, the icon text, and the `aria-label` attribute to the state before the first activation.

**Validates: Requirements 4.5, 4.6**

---

### Property 7: Theme Mutual Exclusivity

*For any* call to `applyTheme(theme)`, `document.body` carries exactly one of the classes `"light"` or `"dark"` — never both, never neither.

**Validates: Requirements 4.3, 4.4**

---

### Property 8: Timer Display Format

*For any* integer `totalSeconds` in [0, 7200] (the maximum 120-minute duration), `formatTime(totalSeconds)` returns a string matching `MM:SS` with both components zero-padded to two digits.

**Validates: Requirements 5.2**

---

### Property 9: Timer Countdown Monotonicity

*For any* `timerRemaining > 0`, after one call to `timerTick()`, the new value of `timerRemaining` equals the prior value minus exactly 1, and the timer display reflects this updated value.

**Validates: Requirements 5.3**

---

### Property 10: Timer No Over-Decrement

*For any* sequence of `timerTick()` calls starting from any valid `timerRemaining`, the value of `timerRemaining` never falls below 0.

**Validates: Requirements 5.9**

---

### Property 11: Task Whitespace Rejection

*For any* string composed entirely of whitespace characters (including the empty string), `addTask()` with that string as input does not append any item to `tasks`, and the length of `tasks` is unchanged.

**Validates: Requirements 6.2**

---

### Property 12: Task Uniqueness Invariant

*For any* two tasks present in the TaskStore, their `text` fields differ when compared case-insensitively. This invariant is preserved by both `addTask()` and successful `startEditTask()` saves.

**Validates: Requirements 6.3, 7.4**

---

### Property 13: Task Add Append-Only

*For any* valid task text (non-empty, non-whitespace, non-duplicate), `addTask()` increases `tasks.length` by exactly 1, and the new task appears as the last element with `done === false` and a `text` equal to the trimmed input.

**Validates: Requirements 6.4**

---

### Property 14: Task Toggle Idempotence

*For any* task, calling `toggleTask(id)` twice in succession returns `task.done` to its original value and the `completed` CSS class on its `<li>` to its original state.

**Validates: Requirements 7.1**

---

### Property 15: Task Delete Size Invariant

*For any* task `id` present in the TaskStore, after `deleteTask(id)`, `tasks.length` equals its prior value minus 1, and no task with that `id` remains in the array.

**Validates: Requirements 7.7**

---

### Property 16: Sort Non-Mutation

*For any* state of the `tasks` array, calling `getSortedTasks()` leaves the `tasks` array byte-for-byte identical to its state before the call.

**Validates: Requirements 8.6**

---

### Property 17: Sort Correctness

*For any* `tasks` array, `getSortedTasks()` under sort mode `"alpha"` produces a result where every adjacent pair of tasks satisfies `a.text.toLowerCase() <= b.text.toLowerCase()`; under mode `"completed"`, every incomplete task (`done === false`) appears before every complete task (`done === true`).

**Validates: Requirements 8.3, 8.4, 8.5**

---

### Property 18: Safe Link Navigation

*For any* rendered `LinkCard`, the `click` / Enter / Space event handler calls `window.open` with exactly three arguments where the third argument includes the string `'noopener,noreferrer'`.

**Validates: Requirements 9.6**

---

### Property 19: URL Scheme Normalisation

*For any* URL string that does not begin with `http://` or `https://` and is accepted as valid by `saveLink()`, the `url` field stored in the LinkStore begins with `https://`.

**Validates: Requirements 10.7**

---

### Property 20: LocalStorage Invalid JSON Recovery

*For any* LocalStorage key used by the app, if that key contains a value that is not valid JSON, `lsGet(key, fallback)` returns the specified `fallback` value without throwing any exception.

**Validates: Requirements 11.3**

---

*Property Reflection notes: Properties 4 (whitespace fallback) and 11 (whitespace rejection) both test whitespace-only inputs but in different contexts (name editor vs. task input) — kept separate as they test distinct code paths. Properties 12 and 13 both concern addTask but test different facets (uniqueness invariant vs. structural append) — no redundancy. Properties 9 and 10 are complementary (exact decrement amount vs. lower bound) — both retained.*

## Error Handling

All error handling follows a defensive pattern:

- **LocalStorage read failures**: `lsGet(key, fallback)` wraps `localStorage.getItem` and `JSON.parse` in a `try/catch`. Any `SyntaxError` (corrupt JSON) or other exception returns the configured `fallback` value silently, without propagating to the console.
- **LocalStorage write failures**: `lsSet(key, value)` currently does not catch write exceptions (e.g. `QuotaExceededError`). Task 17 (optional) adds try/catch wrappers that show a `StorageError` banner and revert in-memory state for task/link mutations.
- **Favicon load failures**: The `<img>` element's `onerror` handler replaces the `src` with a fallback SVG data URI. No exception propagates.
- **Notification API absence**: `notifyTimerDone()` checks `'Notification' in window` before using the API. A missing or denied API falls back to `alert()`.
- **Invalid URL input**: `saveLink()` wraps `new URL(url)` in a try/catch. A thrown `TypeError` is caught, an inline error is shown, and the modal stays open.
- **Inline edit empty/duplicate**: `startEditTask` checks trimmed length and case-insensitive duplicates before saving. Failures show an inline error without closing the editor.

## Testing Strategy

The application is tested through manual browser testing and the correctness properties defined in the Correctness Properties section. Each property is independently verifiable:

- **Unit-testable pure functions**: `getGreetingPhrase(hour)`, `formatTime(totalSeconds)`, `pad(n)`, `lsGet(key, fallback)`, `getDomain(url)` — each is a pure function with no side effects and can be tested in isolation.
- **Property-based testing targets**: Properties 1–20 (Correctness Properties section) define generator-based test cases:
  - Property 1: clock format — generate random `Date` objects, assert output matches `/^\d{2}:\d{2}:\d{2}$/`.
  - Property 3: greeting phrase exhaustiveness — generate all 24 hour values, assert all return a non-empty string.
  - Property 8: timer format — generate integers `[0, 7200]`, assert output matches `/^\d{2}:\d{2}$/`.
  - Property 12: task uniqueness — generate task arrays, add duplicates, assert rejection.
  - Property 16: sort non-mutation — generate task arrays, call `getSortedTasks()`, assert original array unchanged.
- **Integration testing**: Open `index.html` in each target browser (Chrome 120+, Firefox 120+, Edge 120+, Safari 17+) and exercise all user flows per the acceptance criteria in `tasks.md`.
- **Accessibility testing**: Use a screen reader (NVDA on Windows, VoiceOver on macOS) to verify ARIA live region announcements and keyboard navigation.
- **Responsive testing**: Use DevTools device emulation at 320 px, 768 px, and 1440 px widths to verify layout breakpoints.
