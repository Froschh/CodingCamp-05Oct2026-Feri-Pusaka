# Requirements Document

## Introduction

The **To-Do List Dashboard** is a single-page, client-side web application built with HTML5, CSS3, and Vanilla JavaScript. It provides a personal productivity dashboard combining a live clock, time-based greeting, customisable display name, a Pomodoro-style focus timer, a task list with sorting, and a quick-links panel. All state is persisted exclusively through the Browser LocalStorage API. The application has no backend, no frameworks, and no build tools. It must work fully offline after the initial page load (except for external favicon fetches, which degrade gracefully).

---

## Glossary

- **App**: The single-page To-Do List Dashboard application running in the browser.
- **Clock**: The UI element that displays the current local time in HH:MM:SS format and updates every second.
- **DateDisplay**: The UI element that shows the current local date in the long-weekday format (e.g., "Monday, January 1, 2025").
- **GreetingPhrase**: The contextual salutation ("Good Morning", "Good Afternoon", "Good Evening", "Good Night") shown alongside the user's display name.
- **DisplayName**: The user-configurable name rendered in the greeting area; stored under `dashboard_name`.
- **NameEditor**: The inline text input that replaces the DisplayName button when the user initiates an edit.
- **ThemeToggle**: The button in the sticky header that switches between the light and dark colour themes.
- **FocusTimer**: The countdown timer widget (Pomodoro-style) with configurable duration, start/pause/reset controls, and a finish notification.
- **TimerDisplay**: The MM:SS readout within the FocusTimer widget.
- **TaskStore**: The in-memory array of task objects (`{id, text, done}`) synchronised with `dashboard_tasks` in LocalStorage.
- **TaskInput**: The text input used to enter a new task.
- **TaskItem**: A single rendered task row containing a checkbox, text span, edit button, and delete button.
- **TaskEditor**: The inline input that replaces the text span of a TaskItem during an edit operation.
- **SortControl**: The group of three buttons ("Default", "A–Z", "Completed Last") that control task display order.
- **LinkStore**: The in-memory array of link objects (`{id, name, url}`) synchronised with `dashboard_links` in LocalStorage.
- **LinkCard**: A rendered quick-link tile showing a favicon, display name, and hostname.
- **LinkModal**: The modal dialog used to add a new quick link.
- **LocalStorage**: The Browser LocalStorage API; the sole persistence mechanism.
- **uid()**: The unique-ID generator: `Date.now().toString(36)` concatenated with a random alphanumeric suffix.
- **ErrorBanner**: A transient inline error message shown beneath an input; auto-dismissed after 3 seconds.
- **CapacityError**: A non-dismissing error shown when a storage-bound limit is reached.
- **StorageError**: A non-dismissing error shown when a LocalStorage write operation throws an exception.

---

## Requirements

### Requirement 1: Live Clock and Date Display

**User Story:** As a user, I want a live clock and date displayed on the dashboard so that I always know the current time and date without leaving the page.

#### Acceptance Criteria

1. THE App SHALL render the Clock showing the current local time in HH:MM:SS format immediately on page load, before any `setInterval` tick fires.
2. THE App SHALL render the DateDisplay showing the current local date in the format `DayName, MonthName DayNumber, FullYear` (day number not zero-padded) immediately on page load.
3. WHEN the App initialises, THE App SHALL start a `setInterval` callback that fires every 1 000 milliseconds and updates both the Clock and the DateDisplay.
4. WHEN the local device clock crosses midnight, THE App SHALL update the DateDisplay to reflect the new date without requiring a page reload.
5. THE Clock element SHALL carry the attribute `aria-live="polite"` so that assistive technologies announce time changes.

#### Correctness Properties

- **Idempotence**: Calling the clock-render function multiple times with the same `Date` object produces the same output each time.
- **Format invariant**: For any valid `Date`, the rendered string matches `/^\d{2}:\d{2}:\d{2}$/` for the Clock and matches `/^[A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4}$/` for the DateDisplay.
- **No zero-padding on day**: For any date where `getDate()` returns a single-digit value (1–9), the rendered day number is that single digit with no leading zero.
- **Interval liveness**: After `n` seconds of uninterrupted page session, the Clock has been updated at least `n - 1` times (accounting for one-tick startup tolerance).

---

### Requirement 2: Time-Based Greeting Phrase

**User Story:** As a user, I want the dashboard to greet me with a phrase appropriate to the time of day so that the app feels contextually aware.

#### Acceptance Criteria

1. THE App SHALL display the GreetingPhrase immediately on page load before the first `setInterval` tick.
2. WHEN the local device hour is in the range 5–11 (inclusive), THE App SHALL display the GreetingPhrase "Good Morning".
3. WHEN the local device hour is in the range 12–17 (inclusive), THE App SHALL display the GreetingPhrase "Good Afternoon".
4. WHEN the local device hour is in the range 18–20 (inclusive), THE App SHALL display the GreetingPhrase "Good Evening".
5. WHEN the local device hour is in the range 21–23 or 0–4 (inclusive), THE App SHALL display the GreetingPhrase "Good Night".
6. WHEN the clock tick fires and the local device hour differs from the hour recorded at the previous tick, THE App SHALL re-evaluate and update the GreetingPhrase.

#### Correctness Properties

- **Exhaustive coverage**: The mapping from `getHours()` (0–23) to a GreetingPhrase is total — every integer in [0, 23] maps to exactly one of the four phrases.
- **Stability**: If two consecutive clock ticks fall within the same hour, the GreetingPhrase is unchanged between those ticks.
- **Transition correctness**: For each of the four boundary hours (5, 12, 18, 21), the GreetingPhrase changes to the expected new phrase on the first tick after the boundary is crossed.

---

### Requirement 3: User Display Name

**User Story:** As a user, I want to set a personal display name that persists across page reloads so that the greeting feels personalised.

#### Acceptance Criteria

1. WHEN the App loads and `dashboard_name` is absent from LocalStorage, THE App SHALL display the DisplayName "Friend".
2. WHEN the App loads and `dashboard_name` is present in LocalStorage, THE App SHALL display the stored DisplayName value.
3. WHEN the user activates the DisplayName button, THE App SHALL replace the button with the NameEditor pre-filled with the current DisplayName and move keyboard focus to the NameEditor.
4. THE NameEditor SHALL accept a maximum of 40 characters, blocking any further entry beyond that limit.
5. WHEN the user confirms the NameEditor via the Enter key or the Save button, THE App SHALL trim the entered value; if the trimmed value is empty or contains only whitespace, THE App SHALL store "Friend"; otherwise THE App SHALL store the trimmed value.
6. WHEN the user confirms the NameEditor, THE App SHALL write the resolved DisplayName to `dashboard_name` in LocalStorage synchronously within the same event handler.
7. WHEN the user confirms the NameEditor, THE App SHALL hide the NameEditor and render the updated DisplayName.
8. WHEN the user presses Escape while the NameEditor is open, THE App SHALL discard the entered value, hide the NameEditor, and restore the previous DisplayName without writing to LocalStorage.
9. WHEN focus moves away from both the NameEditor and the Save button (blur event), THE App SHALL discard the entered value, hide the NameEditor, and restore the previous DisplayName without writing to LocalStorage.

#### Correctness Properties

- **Round-trip persistence**: A DisplayName saved in one session is retrieved as the same string in the next session (after a page reload) provided LocalStorage has not been cleared.
- **Normalisation idempotence**: Saving a DisplayName that is already trimmed and non-empty produces the same stored value as re-saving it.
- **Empty-input fallback invariant**: For any input consisting solely of whitespace characters (including the empty string), the stored and displayed value is exactly "Friend".
- **Length bound**: The stored `dashboard_name` value never exceeds 40 characters.

---

### Requirement 4: Light / Dark Theme Toggle

**User Story:** As a user, I want to toggle between light and dark themes so that I can choose a comfortable visual style that persists across sessions.

#### Acceptance Criteria

1. THE App SHALL render the ThemeToggle button in the sticky header so that it remains visible regardless of scroll position.
2. WHEN the App loads, THE App SHALL read `dashboard_theme` from LocalStorage; if the value is absent, THE App SHALL treat the theme as "light".
3. WHEN the App loads with theme "light", THE App SHALL add the class `light` and remove the class `dark` from `<body>`, render the ThemeToggle icon as 🌙, and set its `aria-label` to "Switch to dark mode".
4. WHEN the App loads with theme "dark", THE App SHALL add the class `dark` and remove the class `light` from `<body>`, render the ThemeToggle icon as ☀️, and set its `aria-label` to "Switch to light mode".
5. WHEN the user activates the ThemeToggle while the current theme is "light", THE App SHALL add `dark`, remove `light` from `<body>`, change the icon to ☀️, set `aria-label` to "Switch to light mode", and write "dark" to `dashboard_theme` in LocalStorage synchronously.
6. WHEN the user activates the ThemeToggle while the current theme is "dark", THE App SHALL add `light`, remove `dark` from `<body>`, change the icon to 🌙, set `aria-label` to "Switch to dark mode", and write "light" to `dashboard_theme` in LocalStorage synchronously.
7. THE App SHALL apply CSS transitions of 150 ms to 300 ms duration on `background-color` and `color` properties during theme changes.
8. IF a LocalStorage write fails during a theme toggle, THEN THE App SHALL still apply the theme change to the DOM and SHALL display a StorageError indication.

#### Correctness Properties

- **Toggle involution**: Activating the ThemeToggle twice in succession returns the `<body>` class list, icon, and `aria-label` to the state before the first activation.
- **Persistence round-trip**: The theme written to LocalStorage on toggle matches the class applied to `<body>`, and the same theme is restored correctly on the next page load.
- **Mutually exclusive classes**: At all times, `<body>` carries exactly one of `light` or `dark` (never both, never neither after initialisation).
- **ARIA consistency**: The `aria-label` of the ThemeToggle always describes the action that the *next* activation will perform (i.e., it reflects the opposite of the current theme).

---

### Requirement 5: Focus Timer (Pomodoro)

**User Story:** As a user, I want a configurable countdown timer with start, pause, and reset controls so that I can manage focused work sessions.

#### Acceptance Criteria

1. WHEN the App loads, THE FocusTimer SHALL read the duration from `dashboard_pomodoro_minutes`; if absent, THE FocusTimer SHALL use 25 minutes.
2. THE TimerDisplay SHALL show the remaining time in MM:SS format (zero-padded) immediately on page load.
3. WHEN the user activates the Start control while the FocusTimer is not running, THE FocusTimer SHALL start a `setInterval` countdown that decrements the remaining time by one second per tick and apply the CSS class `running` to the timer widget.
4. WHEN the user activates the Start control while the FocusTimer is already running, THE FocusTimer SHALL take no action.
5. WHEN the user activates the Pause control, THE FocusTimer SHALL clear the countdown interval, remove the `running` class, and retain the current remaining time.
6. WHEN the user activates the Reset control, THE FocusTimer SHALL clear the countdown interval, restore the remaining time to the full configured duration, and remove both the `running` and `finished` classes.
7. WHEN the user activates the Apply button and the duration input contains a valid integer in the range 1–120, THE FocusTimer SHALL stop any running countdown, reset to the new duration, persist the new duration to `dashboard_pomodoro_minutes` in LocalStorage synchronously, and apply the new value to the display.
8. WHEN the user activates the Apply button and the duration input does not contain a valid integer in the range 1–120, THE FocusTimer SHALL restore the input field to the value stored in `dashboard_pomodoro_minutes` and make no other change.
9. WHEN the countdown reaches zero seconds remaining, THE FocusTimer SHALL stop the interval, apply the CSS class `finished` to the timer widget, and trigger the finish notification.
10. WHEN the finish notification is triggered and the browser Notification permission is "granted", THE FocusTimer SHALL display a browser Notification.
11. WHEN the finish notification is triggered and the browser Notification permission is "default", THE FocusTimer SHALL request permission; if permission is subsequently granted, THE FocusTimer SHALL display a browser Notification; otherwise THE FocusTimer SHALL call `alert()`.
12. WHEN the finish notification is triggered and the browser Notification permission is "denied" or the Notification API is absent, THE FocusTimer SHALL call `alert()`.
13. WHEN the user activates the Start control while the `finished` class is applied, THE FocusTimer SHALL first reset to the full configured duration and then start the countdown.
14. THE FocusTimer SHALL NOT persist the running state or remaining time to LocalStorage; a page refresh SHALL display the saved duration in the stopped state with no `running` or `finished` class.

#### Correctness Properties

- **Countdown monotonicity**: While the FocusTimer is running, the remaining time strictly decreases by exactly 1 second per interval tick until it reaches 0.
- **Duration bound**: The value stored in `dashboard_pomodoro_minutes` is always an integer in [1, 120].
- **Reset idempotence**: Activating Reset multiple times in succession yields the same TimerDisplay value as a single Reset.
- **Finished class exclusivity**: The `finished` class is present on the timer widget if and only if the countdown reached zero and neither Reset nor a new Start (which resets first) has occurred since.
- **No over-decrement**: The remaining time never goes below zero.
- **Persistence isolation**: The in-memory remaining time after a Pause is never written to LocalStorage.

---

### Requirement 6: Task Management: Adding

**User Story:** As a user, I want to add tasks to my list so that I can track what I need to do.

#### Acceptance Criteria

1. THE TaskInput SHALL accept a maximum of 200 characters, blocking further entry beyond that limit.
2. WHEN the user submits the TaskInput via the Add button or the Enter key and the trimmed value is empty or whitespace-only, THE App SHALL display an ErrorBanner below the TaskInput and auto-dismiss it after 3 seconds; no task SHALL be added to the TaskStore.
3. WHEN the user submits the TaskInput via the Add button or the Enter key and the trimmed value matches the `text` field of any existing task in the TaskStore (case-insensitive), THE App SHALL display an ErrorBanner below the TaskInput and auto-dismiss it after 3 seconds; no task SHALL be added to the TaskStore.
4. WHEN the user submits the TaskInput via the Add button or the Enter key and the trimmed value is non-empty and not a case-insensitive duplicate, THE App SHALL append a new task object `{id: uid(), text: trimmedValue, done: false}` to the TaskStore.
5. WHEN a task is successfully added, THE App SHALL clear the TaskInput, persist the updated TaskStore to `dashboard_tasks` in LocalStorage synchronously, and re-render the task list.
6. WHEN the TaskStore is empty, THE App SHALL display the message "No tasks yet — add one above!" in the task list area.
7. WHEN the App loads, THE App SHALL read `dashboard_tasks` from LocalStorage; if the value is absent or contains invalid JSON, THE App SHALL initialise the TaskStore as an empty array.
8. IF a LocalStorage write fails during a task add, THEN THE App SHALL display a StorageError and retain the updated in-memory TaskStore without reverting.

#### Correctness Properties

- **Uniqueness invariant**: At all times, no two tasks in the TaskStore share the same `text` value when compared case-insensitively.
- **ID uniqueness**: Each task object in the TaskStore has a unique `id` value.
- **Append-only on add**: A successful add increases the TaskStore length by exactly 1 and appends the new task at the end.
- **Trim consistency**: The `text` field stored in the TaskStore equals the trimmed version of the text entered by the user.
- **Empty-state accuracy**: The empty-state message is visible if and only if the TaskStore contains zero tasks.
- **Invalid JSON recovery**: After a corrupt `dashboard_tasks` value is encountered on load, the TaskStore has length 0 and no exception propagates to the console.

---

### Requirement 7: Task Management: Completion, Edit, and Delete

**User Story:** As a user, I want to mark tasks complete, edit their text, and delete them so that I can keep my task list accurate.

#### Acceptance Criteria

1. WHEN the user activates the checkbox of a TaskItem, THE App SHALL flip the `done` property of that task, apply or remove the `completed` CSS class (which renders strikethrough text and opacity 0.5) accordingly, persist the TaskStore to LocalStorage synchronously, and re-render the task list.
2. WHEN the user activates the Edit button of a TaskItem, THE App SHALL replace the task's text span with a TaskEditor pre-filled with the current task text (max 200 chars, blocks further entry) and move keyboard focus to the TaskEditor.
3. WHEN the user confirms the TaskEditor via the Enter key or the Save button and the trimmed value is empty, THE App SHALL display an error within the TaskEditor context and keep the TaskEditor open without saving.
4. WHEN the user confirms the TaskEditor via the Enter key or the Save button and the trimmed value matches the `text` field of a different task in the TaskStore (case-insensitive), THE App SHALL display the message "A task with that name already exists." within the TaskEditor context and keep the TaskEditor open without saving.
5. WHEN the user confirms the TaskEditor via the Enter key or the Save button and the trimmed value is non-empty and not a duplicate of another task, THE App SHALL update the task's `text` field to the trimmed value, persist the TaskStore to LocalStorage synchronously, and re-render the task list.
6. WHEN the user presses Escape or activates the Cancel button while the TaskEditor is open, THE App SHALL discard the entered value and re-render the task list without making any changes.
7. WHEN the user activates the Delete button (✕) of a TaskItem, THE App SHALL remove that task from the TaskStore, persist the TaskStore to LocalStorage synchronously, and re-render the task list.

#### Correctness Properties

- **Toggle idempotence**: Activating the checkbox of a task twice in succession returns `done` to its original value and the CSS class state to its original state.
- **Edit non-duplication**: After a successful edit, no two tasks in the TaskStore share the same `text` value case-insensitively.
- **Delete size invariant**: After deleting a task, the TaskStore length equals the prior length minus 1 and the deleted task's `id` is absent from the TaskStore.
- **Cancel non-mutation**: Cancelling an edit (Escape or Cancel button) leaves the TaskStore identical to its state before the Edit button was activated.
- **Completion class consistency**: For any task, the `completed` CSS class is present on its TaskItem if and only if `done === true`.

---

### Requirement 8: Task Sorting

**User Story:** As a user, I want to sort my task list by different criteria so that I can prioritise my work effectively.

#### Acceptance Criteria

1. WHEN the App loads, THE SortControl SHALL display the "Default" button with the `active` CSS class and `aria-pressed="true"`; "A–Z" and "Completed Last" buttons SHALL have `aria-pressed="false"` and no `active` class.
2. WHEN the user activates a SortControl button, THE App SHALL add the `active` class and set `aria-pressed="true"` on the activated button and remove both from all other SortControl buttons, then re-render the task list.
3. WHILE the active sort is "Default", THE App SHALL render tasks in TaskStore insertion order.
4. WHILE the active sort is "A–Z", THE App SHALL render tasks sorted by `text` using a case-insensitive `localeCompare`; where `text` values compare as equal, tasks SHALL retain their relative insertion order.
5. WHILE the active sort is "Completed Last", THE App SHALL render incomplete tasks first followed by complete tasks; within each group tasks SHALL retain their relative insertion order.
6. THE SortControl SHALL operate on a copy of the TaskStore array and SHALL NOT mutate the TaskStore array.

#### Correctness Properties

- **Sort stability**: The "A–Z" and "Completed Last" sorts are stable with respect to insertion order (equal-key items appear in their original relative order).
- **Non-mutation invariant**: After any sort operation, the TaskStore array is byte-for-byte identical to its state before the sort.
- **Active exclusivity**: At all times, exactly one SortControl button carries the `active` class and `aria-pressed="true"`.
- **Default round-trip**: The task render order under the "Default" sort matches the TaskStore array index order exactly.
- **Completed-last partition**: Under "Completed Last", every incomplete task (index `i`) appears before every complete task (index `j`) in the rendered list (`i < j`).

---

### Requirement 9: Quick Links: Display and Navigation

**User Story:** As a user, I want a panel of quick-access links so that I can navigate to frequently used websites with a single click.

#### Acceptance Criteria

1. WHEN the App loads and `dashboard_links` is absent from LocalStorage, THE App SHALL seed the LinkStore with three default entries (Google, GitHub, YouTube), persist the seeded LinkStore to `dashboard_links` in LocalStorage synchronously, and render the link panel.
2. WHEN the App loads and `dashboard_links` is present in LocalStorage (including an empty array), THE App SHALL use the stored value without re-seeding.
3. WHEN the App loads and `dashboard_links` contains invalid JSON, THE App SHALL discard the stored value, re-seed with the three defaults, persist to LocalStorage synchronously, and render the link panel.
4. WHEN rendering a LinkCard, THE App SHALL display a favicon fetched from `https://www.google.com/s2/favicons?domain=<hostname>&sz=32`, the link's display name, and the link's hostname.
5. WHEN a favicon image fails to load, THE App SHALL replace the image with a fallback SVG containing a 🔗 emoji; no unhandled exception SHALL propagate to the console.
6. WHEN the user clicks a LinkCard or presses Enter or Space while a LinkCard has focus, THE App SHALL open the link's URL in a new tab using `window.open(url, '_blank', 'noopener,noreferrer')`.
7. WHEN the LinkStore is empty, THE App SHALL display the message "No links yet — add your first one!" in the link panel area.

#### Correctness Properties

- **Seed-on-absent only**: The default seed is applied if and only if `dashboard_links` is absent or contains invalid JSON on load; a stored empty array is never re-seeded.
- **Favicon fallback completeness**: For every rendered LinkCard, either a valid favicon `<img>` or the fallback SVG is visible; no broken-image icon appears.
- **Safe navigation**: The `window.open` call always includes `'noopener,noreferrer'` in the features string, regardless of which link is activated.
- **Empty-state accuracy**: The empty-state message is visible if and only if the LinkStore contains zero entries.

---

### Requirement 10: Quick Links: Adding and Deleting

**User Story:** As a user, I want to add and delete quick links so that I can keep my link panel relevant.

#### Acceptance Criteria

1. WHEN the user activates the "+ Add Link" button, THE App SHALL open the LinkModal with empty Name and URL input fields.
2. THE Name input SHALL accept a maximum of 50 characters; THE URL input SHALL accept a maximum of 2 048 characters.
3. WHEN the user presses Enter while the Name input has focus, THE App SHALL move keyboard focus to the URL input.
4. WHEN the user presses Enter while the URL input has focus, THE App SHALL attempt to save the link.
5. WHEN the user attempts to save and the Name input is empty, THE App SHALL display an error for the Name field and keep the LinkModal open.
6. WHEN the user attempts to save and the URL input is empty, THE App SHALL display an error for the URL field and keep the LinkModal open.
7. WHEN the user attempts to save and the URL value has no scheme (does not begin with a recognised protocol), THE App SHALL prepend `https://` to the value before validation.
8. WHEN the user attempts to save and `new URL()` throws for the (possibly scheme-prepended) URL value, THE App SHALL display the error "Please enter a valid URL." and keep the LinkModal open.
9. WHEN the user attempts to save and all inputs are valid and the LinkStore contains fewer than 50 entries, THE App SHALL append `{id: uid(), name: trimmedName, url: resolvedUrl}` to the LinkStore, persist to `dashboard_links` in LocalStorage synchronously, close the LinkModal, and re-render the link panel.
10. WHEN the user attempts to save and the LinkStore already contains 50 entries, THE App SHALL display a CapacityError and make no change to the LinkStore.
11. WHEN the user activates the Cancel button, presses Escape, or clicks the modal overlay, THE App SHALL close the LinkModal without modifying the LinkStore.
12. WHEN the user activates the Delete button on a LinkCard, THE App SHALL stop event propagation (preventing navigation), remove that link from the LinkStore, persist to `dashboard_links` in LocalStorage synchronously, and re-render the link panel.
13. IF a LocalStorage write fails during a link add or delete, THEN THE App SHALL display a StorageError and revert the in-memory LinkStore to its state before the failed mutation.

#### Correctness Properties

- **Capacity bound**: The LinkStore never contains more than 50 entries.
- **Add atomicity**: A successful add increases the LinkStore length by exactly 1; an unsuccessful add (validation failure, capacity limit, or StorageError) leaves the LinkStore length unchanged.
- **Delete non-navigation**: Activating the Delete button on a LinkCard does not open or navigate to any URL.
- **URL normalisation**: For any URL that lacks a scheme and is accepted as valid, the stored `url` value begins with `https://`.
- **Modal cancel non-mutation**: Closing the LinkModal via Cancel, Escape, or overlay click leaves the LinkStore identical to its state before the modal was opened.
- **StorageError revert**: After a LocalStorage write failure on delete, the previously deleted link is present in the in-memory LinkStore and rendered in the link panel.

---

### Requirement 11: Data Persistence

**User Story:** As a user, I want my data to survive page reloads so that I do not lose my settings, tasks, or links between sessions.

#### Acceptance Criteria

1. THE App SHALL use the Browser LocalStorage API as the sole persistence mechanism; no server-side storage, cookies, or IndexedDB SHALL be used.
2. WHEN any mutation occurs (theme toggle, name save, timer duration apply, task add/toggle/edit/delete, link add/delete), THE App SHALL write the affected LocalStorage key synchronously within the same event handler in which the mutation occurred.
3. WHEN the App reads any LocalStorage key that contains invalid JSON, THE App SHALL use the defined fallback value and SHALL NOT throw an unhandled exception.
4. THE App SHALL apply the following fallback values on read: `dashboard_name` → "Friend"; `dashboard_theme` → "light"; `dashboard_pomodoro_minutes` → 25; `dashboard_tasks` → `[]`; `dashboard_links` → null (triggering seed logic).
5. THE FocusTimer SHALL NOT persist the countdown remaining time or running state; a page refresh SHALL always present the timer in the stopped state showing the full saved duration.
6. THE App SHALL enforce storage-layer bounds before writing: display name ≤ 40 characters (trimmed); timer duration integer in [1, 120]; TaskStore ≤ 100 tasks; LinkStore ≤ 50 links; inputs that violate these bounds SHALL be rejected with an error before any LocalStorage write is attempted.

#### Correctness Properties

- **Write-before-render**: The LocalStorage value for a mutated key is updated before (or atomically with) the re-render that reflects that mutation.
- **Fallback completeness**: For every LocalStorage key the App reads, a fallback is defined and applied when the key is absent or contains invalid JSON.
- **Bound enforcement**: No LocalStorage value ever encodes a TaskStore array of more than 100 items or a LinkStore array of more than 50 items.
- **Timer persistence isolation**: The value of `dashboard_pomodoro_minutes` in LocalStorage equals the last Apply-confirmed duration and is never modified by Start, Pause, Reset, or the countdown tick.
- **Cross-session round-trip**: For each persisted key, a value written in session N is read back as an equivalent value in session N+1 (after a page reload, assuming LocalStorage has not been cleared externally).

---

### Requirement 12: Technical Constraints and Non-Functional Requirements

**User Story:** As a developer and user, I want the application to meet specific quality standards so that it is reliable, accessible, and maintainable across target browsers and device sizes.

#### Acceptance Criteria

1. THE App SHALL be implemented using HTML5, CSS3, and Vanilla JavaScript only; no frameworks, libraries, or build tools SHALL be introduced.
2. THE App SHALL load all styles from the single file `css/style.css` and all application logic from the single file `js/app.js`.
3. THE App SHALL function correctly in Chrome 120+, Firefox 120+, Edge 120+, and Safari 17+.
4. THE App SHALL be fully functional after the initial page load without any network connection, except for favicon fetches in the quick-links panel which SHALL degrade gracefully via the fallback SVG.
5. THE App SHALL render without horizontal scroll and without overlapping or unreachable controls at viewport widths from 320 px to 1 440 px.
6. WHILE the viewport width is 768 px or less, THE App SHALL display the FocusTimer and task list in a single-column stacked layout.
7. THE App SHALL use the Inter typeface (loaded from Google Fonts) with `sans-serif` as the fallback font stack.
8. THE App SHALL produce zero console errors and zero unhandled promise rejections during normal user operation.
9. THE App SHALL support full keyboard navigation via Tab, Shift-Tab, Enter, and Space for all interactive controls.
10. THE App SHALL apply `aria-live` regions to the TimerDisplay and the task list container so that assistive technologies announce changes.

#### Correctness Properties

- **No-framework invariant**: The production HTML, CSS, and JS files contain no `import` statements referencing npm packages, no CDN-loaded framework scripts, and no bundler artefacts.
- **Single-file invariant**: At runtime, exactly one external stylesheet (`css/style.css`) and exactly one external script (`js/app.js`) are loaded by `index.html` (excluding Google Fonts).
- **Offline resilience**: After the initial page load, disabling the network connection does not cause any unhandled exception or broken layout; all features except favicon loading remain fully operational.
- **Responsive non-overlap**: For any viewport width in [320, 1440] pixels, no two interactive controls share the same bounding-box area on screen.
- **Keyboard reachability**: Every interactive control is reachable via Tab/Shift-Tab traversal without the use of a mouse.
- **ARIA live coverage**: The `aria-live` attribute is present on the Clock element, the TimerDisplay element, and the task list container.
