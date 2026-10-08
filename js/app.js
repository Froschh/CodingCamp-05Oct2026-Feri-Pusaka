/* ============================================================
   To-Do List Dashboard — app.js
   THE ONLY JS FILE in this project.
   Vanilla JavaScript only — no frameworks, no external libraries.
   All persistence via localStorage.
   ============================================================ */


/* ── CONSTANTS / CONFIG ──────────────────────────────────────────────────── */

// LocalStorage keys
const TODO_KEY  = 'todo-dashboard-tasks';
const LINKS_KEY = 'todo-dashboard-links';
const USER_KEY  = 'todo-dashboard-user';
const THEME_KEY = 'todo-dashboard-theme';

// Default Pomodoro duration
const DEFAULT_POMODORO_MINUTES = 25;

// Default quick links seeded on first load
const DEFAULT_LINKS = [
  { id: 1, name: 'Google',       url: 'https://www.google.com' },
  { id: 2, name: 'GitHub',       url: 'https://github.com' },
  { id: 3, name: 'YouTube',      url: 'https://www.youtube.com' },
  { id: 4, name: 'Gmail',        url: 'https://mail.google.com' },
  { id: 5, name: 'Stack Overflow', url: 'https://stackoverflow.com' },
];


/* ── STORAGE HELPERS ─────────────────────────────────────────────────────── */

/**
 * Reads a value from localStorage and JSON-parses it.
 * Returns `fallback` if the key is missing or JSON is invalid.
 */
function loadFromLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/**
 * JSON-stringifies `value` and writes it to localStorage.
 */
function saveToLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

/**
 * Reads a plain string from localStorage (no JSON parsing).
 * Returns `fallback` if absent.
 */
function loadStringFromLS(key, fallback) {
  return localStorage.getItem(key) || fallback;
}

/**
 * Writes a plain string value to localStorage.
 */
function saveStringToLS(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}


/* ── TOAST UTILITY ───────────────────────────────────────────────────────── */

let toastTimeout = null;

/**
 * Briefly shows a toast notification at the bottom of the screen.
 * @param {string} message
 * @param {number} duration  — milliseconds to show (default 2500)
 */
function showToast(message, duration = 2500) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}


/* ── GREETING & CLOCK ────────────────────────────────────────────────────── */

/**
 * Returns a greeting string based on the hour (0–23).
 */
function getGreetingByHour(hour) {
  if (hour >= 5  && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

/**
 * Formats a Date object to a long date string.
 * e.g. "Friday, 5 October 2026"
 */
function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
}

/**
 * Formats a Date object to a HH:MM:SS time string.
 */
function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Updates the greeting text, clock, and date in the header.
 * Called every second by setInterval.
 */
function updateClock() {
  const now     = new Date();
  const hour    = now.getHours();
  const greeting = getGreetingByHour(hour);
  const name    = loadStringFromLS(USER_KEY, 'Friend');

  const greetingEl = document.getElementById('greeting-text');
  const timeEl     = document.getElementById('current-time');
  const dateEl     = document.getElementById('current-date');

  if (greetingEl) greetingEl.textContent = `${greeting}, ${name}!`;
  if (timeEl)     timeEl.textContent     = formatTime(now);
  if (dateEl)     dateEl.textContent     = formatDate(now);
}

/**
 * Saves the name from the input field to LocalStorage and refreshes the greeting.
 */
function saveName() {
  const input = document.getElementById('username-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    showToast('Please enter a name.');
    return;
  }
  saveStringToLS(USER_KEY, name);
  updateClock();
  showToast(`Hello, ${name}! 👋`);
}

/**
 * Seeds the name input from LocalStorage, then starts the clock interval.
 */
function initGreeting() {
  const input = document.getElementById('username-input');
  if (input) {
    input.value = loadStringFromLS(USER_KEY, '');
  }
  updateClock();
  setInterval(updateClock, 1000);
}


/* ── THEME ───────────────────────────────────────────────────────────────── */

/**
 * Applies 'light' or 'dark' theme by toggling the body class and updating the toggle icon.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    if (btn) btn.textContent = '☀️';
    if (btn) btn.setAttribute('title', 'Switch to light mode');
  } else {
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
    if (btn) btn.textContent = '🌙';
    if (btn) btn.setAttribute('title', 'Switch to dark mode');
  }
}

/**
 * Flips the current theme, saves it to LocalStorage, and applies it.
 */
function toggleTheme() {
  const current = loadStringFromLS(THEME_KEY, 'light');
  const next    = current === 'dark' ? 'light' : 'dark';
  saveStringToLS(THEME_KEY, next);
  applyTheme(next);
}

/**
 * Loads saved theme from LocalStorage (defaults to 'light') and applies it.
 * Should be called before anything else renders, to prevent a flash.
 */
function initTheme() {
  const theme = loadStringFromLS(THEME_KEY, 'light');
  applyTheme(theme);
}


/* ── FOCUS TIMER ─────────────────────────────────────────────────────────── */

// Module-level timer state
let timerInterval   = null;        // setInterval handle
let timerDuration   = DEFAULT_POMODORO_MINUTES * 60;   // total seconds
let timerRemaining  = timerDuration;                   // seconds left
let timerRunning    = false;

/**
 * Formats seconds into a "MM:SS" string.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTimerTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Writes the current timerRemaining value to #timer-display.
 */
function renderTimerDisplay() {
  const display = document.getElementById('timer-display');
  if (display) display.textContent = formatTimerTime(timerRemaining);
}

/**
 * Called every second by setInterval while the timer is running.
 * Decrements timerRemaining; calls timerFinished when it hits zero.
 */
function tickTimer() {
  timerRemaining -= 1;
  renderTimerDisplay();
  if (timerRemaining <= 0) {
    timerFinished();
  }
}

/**
 * Starts the countdown. Guards against double-starting.
 */
function startTimer() {
  if (timerRunning) return;
  if (timerRemaining <= 0) resetTimer();
  timerRunning = true;
  const display = document.getElementById('timer-display');
  if (display) display.classList.add('running');
  timerInterval = setInterval(tickTimer, 1000);
}

/**
 * Pauses the countdown without resetting.
 */
function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning  = false;
  const display = document.getElementById('timer-display');
  if (display) display.classList.remove('running');
}

/**
 * Stops and resets the timer back to the current duration.
 */
function resetTimer() {
  stopTimer();
  timerRemaining = timerDuration;
  renderTimerDisplay();
  const display = document.getElementById('timer-display');
  if (display) display.classList.remove('finished', 'running');
}

/**
 * Called when the timer reaches 00:00.
 * Shows an alert / notification and flashes the display.
 */
function timerFinished() {
  stopTimer();
  timerRemaining = 0;
  renderTimerDisplay();

  const display = document.getElementById('timer-display');
  if (display) {
    display.classList.add('finished');
    setTimeout(() => display.classList.remove('finished'), 2500);
  }

  // Try the Notifications API; fall back to alert
  const msg = "⏰ Time's up! Take a well-earned break.";
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Focus Timer', { body: msg });
  } else {
    showToast(msg, 4000);
  }

  // Auto-reset after the animation
  setTimeout(() => {
    timerRemaining = timerDuration;
    renderTimerDisplay();
  }, 2600);
}

/**
 * Reads the custom duration from #timer-duration-input, validates it (1–120),
 * updates timerDuration, and resets the timer.
 */
function setTimerDuration() {
  const input = document.getElementById('timer-duration-input');
  if (!input) return;
  let minutes = parseInt(input.value, 10);
  if (isNaN(minutes) || minutes < 1)   minutes = 1;
  if (minutes > 120)                    minutes = 120;
  input.value    = minutes;
  timerDuration  = minutes * 60;
  resetTimer();
  showToast(`Timer set to ${minutes} minute${minutes === 1 ? '' : 's'}.`);
}

/**
 * Wires up timer button event listeners and renders the initial display.
 */
function initTimer() {
  renderTimerDisplay();
  document.getElementById('timer-start-btn').addEventListener('click', startTimer);
  document.getElementById('timer-stop-btn').addEventListener('click',  stopTimer);
  document.getElementById('timer-reset-btn').addEventListener('click', resetTimer);
  document.getElementById('timer-set-btn').addEventListener('click',   setTimerDuration);

  // Allow pressing Enter in the duration input to set it
  document.getElementById('timer-duration-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') setTimerDuration();
  });

  // Request notification permission (non-blocking)
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}


/* ── TO-DO LIST ──────────────────────────────────────────────────────────── */

// In-memory tasks array; source of truth for rendering.
// Shape: { id: number, text: string, done: boolean, createdAt: number }
let tasks = [];

/**
 * Reads the tasks array from LocalStorage into `tasks`.
 */
function loadTasks() {
  tasks = loadFromLS(TODO_KEY, []);
}

/**
 * Persists the current `tasks` array to LocalStorage.
 */
function saveTasks() {
  saveToLS(TODO_KEY, tasks);
}

/**
 * Returns true if `text` (trimmed, lowercased) already exists in `tasks`,
 * optionally excluding the task with `excludeId`.
 * @param {string} text
 * @param {number|null} excludeId
 * @returns {boolean}
 */
function isDuplicate(text, excludeId = null) {
  const normalised = text.trim().toLowerCase();
  return tasks.some(
    (t) => t.id !== excludeId && t.text.trim().toLowerCase() === normalised
  );
}

/**
 * Adds a new task.
 * Guards against empty input and case-insensitive duplicates.
 * @param {string} text
 */
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    showToast('Task cannot be empty.');
    return;
  }
  if (isDuplicate(trimmed)) {
    showToast('That task already exists!');
    return;
  }
  const task = {
    id:        Date.now(),
    text:      trimmed,
    done:      false,
    createdAt: Date.now(),
  };
  tasks.push(task);
  saveTasks();
  renderTasks();
  updateTaskCount();
}

/**
 * Removes the task with the given id.
 * @param {number} id
 */
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
  updateTaskCount();
}

/**
 * Flips the `done` boolean of the task with the given id.
 * @param {number} id
 */
function toggleTask(id) {
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, done: !t.done } : t
  );
  saveTasks();
  renderTasks();
  updateTaskCount();
}

/**
 * Updates the text of a task after validating for emptiness and duplicates.
 * @param {number} id
 * @param {string} newText
 */
function editTask(id, newText) {
  const trimmed = newText.trim();
  if (!trimmed) {
    showToast('Task text cannot be empty.');
    return false;
  }
  if (isDuplicate(trimmed, id)) {
    showToast('Another task with that name already exists!');
    return false;
  }
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, text: trimmed } : t
  );
  saveTasks();
  renderTasks();
  updateTaskCount();
  return true;
}

/**
 * Pure function: returns a new sorted+filtered array based on `sort` and `filter` values.
 * @param {Array} taskArray
 * @param {string} sort    — 'newest'|'oldest'|'az'|'za'|'active'|'done'
 * @param {string} filter  — 'all'|'active'|'done'
 * @returns {Array}
 */
function getSortedFilteredTasks(taskArray, sort, filter) {
  // 1. Filter
  let result = taskArray.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'done')   return  t.done;
    return true;
  });

  // 2. Sort
  result = result.slice().sort((a, b) => {
    switch (sort) {
      case 'oldest': return a.createdAt - b.createdAt;
      case 'az':     return a.text.toLowerCase().localeCompare(b.text.toLowerCase());
      case 'za':     return b.text.toLowerCase().localeCompare(a.text.toLowerCase());
      case 'active': return (a.done ? 1 : 0) - (b.done ? 1 : 0);
      case 'done':   return (b.done ? 1 : 0) - (a.done ? 1 : 0);
      default:       return b.createdAt - a.createdAt; // newest
    }
  });

  return result;
}

/**
 * Builds a single <li> element for a task.
 * @param {{ id: number, text: string, done: boolean }} task
 * @returns {HTMLLIElement}
 */
function createTaskEl(task) {
  const li = document.createElement('li');
  li.id        = `task-${task.id}`;
  li.className = `task-item${task.done ? ' task-done' : ''}`;

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.done ? 'incomplete' : 'complete'}`);
  checkbox.addEventListener('change', () => toggleTask(task.id));

  // Text span (double-click triggers inline edit)
  const span = document.createElement('span');
  span.className   = 'task-text';
  span.textContent = task.text;
  span.title       = 'Double-click to edit';
  span.addEventListener('dblclick', () => startInlineEdit(task, li, span));

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className   = 'btn-edit';
  editBtn.textContent = '✏️';
  editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
  editBtn.addEventListener('click', () => startInlineEdit(task, li, span));

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className   = 'btn-delete';
  deleteBtn.textContent = '🗑️';
  deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);

  return li;
}

/**
 * Replaces the task's text span with an inline <input> for editing.
 * Commits on Enter or blur; cancels on Escape.
 * @param {{ id: number, text: string }} task
 * @param {HTMLLIElement} li
 * @param {HTMLSpanElement} span
 */
function startInlineEdit(task, li, span) {
  // Prevent double-triggering if already editing
  if (li.querySelector('.task-edit-input')) return;

  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'task-edit-input';
  input.value     = task.text;
  input.maxLength = 200;
  input.setAttribute('aria-label', 'Edit task text');

  li.replaceChild(input, span);
  input.focus();
  input.select();

  const commit = () => {
    const success = editTask(task.id, input.value);
    if (!success) {
      // Restore original span without saving
      if (li.contains(input)) li.replaceChild(span, input);
    }
  };

  const cancel = () => {
    if (li.contains(input)) li.replaceChild(span, input);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });

  // Blur commits (but only if input is still in DOM — not already cancelled)
  input.addEventListener('blur', () => {
    if (li.contains(input)) commit();
  });
}

/**
 * Updates the "N tasks remaining" counter.
 */
function updateTaskCount() {
  const count = tasks.filter((t) => !t.done).length;
  const el    = document.getElementById('todo-count');
  if (el) el.textContent = `${count} task${count !== 1 ? 's' : ''} remaining`;
}

/**
 * Reads the current sort/filter selects, clears #todo-list,
 * and re-renders all matching tasks.
 */
function renderTasks() {
  const sort   = document.getElementById('todo-sort-select')?.value   || 'newest';
  const filter = document.getElementById('todo-filter-select')?.value || 'all';
  const list   = document.getElementById('todo-list');
  if (!list) return;

  list.innerHTML = '';

  const visible = getSortedFilteredTasks(tasks, sort, filter);

  if (visible.length === 0) {
    const empty = document.createElement('li');
    empty.className   = 'empty-state';
    empty.textContent = filter === 'all'
      ? 'No tasks yet. Add one above!'
      : `No ${filter} tasks.`;
    list.appendChild(empty);
    return;
  }

  visible.forEach((task) => list.appendChild(createTaskEl(task)));
}

/**
 * Wires up the to-do list controls and does the initial render.
 */
function initTodo() {
  loadTasks();
  renderTasks();
  updateTaskCount();

  const addBtn    = document.getElementById('todo-add-btn');
  const addInput  = document.getElementById('todo-input');
  const sortSel   = document.getElementById('todo-sort-select');
  const filterSel = document.getElementById('todo-filter-select');

  addBtn.addEventListener('click', () => {
    addTask(addInput.value);
    addInput.value = '';
    addInput.focus();
  });

  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTask(addInput.value);
      addInput.value = '';
    }
  });

  sortSel.addEventListener('change',   renderTasks);
  filterSel.addEventListener('change', renderTasks);
}


/* ── QUICK LINKS ─────────────────────────────────────────────────────────── */

// In-memory links array; source of truth for rendering.
// Shape: { id: number, name: string, url: string }
let links = [];

/**
 * Reads links from LocalStorage.
 * If no links have ever been saved (null), seeds with DEFAULT_LINKS.
 */
function loadLinks() {
  const stored = loadFromLS(LINKS_KEY, null);
  if (stored === null) {
    links = DEFAULT_LINKS.map((l) => ({ ...l }));
    saveLinks();
  } else {
    links = stored;
  }
}

/**
 * Persists the current `links` array to LocalStorage.
 */
function saveLinks() {
  saveToLS(LINKS_KEY, links);
}

/**
 * Validates that a string starts with http:// or https://.
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
  return /^https?:\/\/.+/.test(url.trim());
}

/**
 * Adds a new quick link.
 * Validates that name and URL are non-empty and that the URL starts with http/https.
 * @param {string} name
 * @param {string} url
 */
function addLink(name, url) {
  const trimName = name.trim();
  const trimUrl  = url.trim();

  if (!trimName) {
    showToast('Please enter a label for the link.');
    return;
  }
  if (!trimUrl) {
    showToast('Please enter a URL.');
    return;
  }
  if (!isValidUrl(trimUrl)) {
    showToast('URL must start with http:// or https://');
    return;
  }

  const link = {
    id:   Date.now(),
    name: trimName,
    url:  trimUrl,
  };
  links.push(link);
  saveLinks();
  renderLinks();
}

/**
 * Removes the link with the given id.
 * @param {number} id
 */
function deleteLink(id) {
  links = links.filter((l) => l.id !== id);
  saveLinks();
  renderLinks();
}

/**
 * Builds a single .link-item element for a quick link.
 * @param {{ id: number, name: string, url: string }} link
 * @returns {HTMLDivElement}
 */
function createLinkEl(link) {
  const item = document.createElement('div');
  item.className = 'link-item';
  item.setAttribute('role', 'listitem');

  // The anchor opens the link in a new tab
  const anchor = document.createElement('a');
  anchor.href   = link.url;
  anchor.target = '_blank';
  anchor.rel    = 'noopener noreferrer';
  anchor.textContent = link.name;
  anchor.setAttribute('aria-label', `Open ${link.name} in new tab`);

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className   = 'btn-delete-link';
  delBtn.textContent = '✕';
  delBtn.setAttribute('aria-label', `Remove ${link.name} from quick links`);
  delBtn.addEventListener('click', (e) => {
    e.preventDefault();
    deleteLink(link.id);
  });

  item.appendChild(anchor);
  item.appendChild(delBtn);
  return item;
}

/**
 * Clears #links-grid and re-renders all current links.
 */
function renderLinks() {
  const grid = document.getElementById('links-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (links.length === 0) {
    const empty = document.createElement('p');
    empty.className   = 'empty-state';
    empty.textContent = 'No links yet. Add one above!';
    grid.appendChild(empty);
    return;
  }

  links.forEach((link) => grid.appendChild(createLinkEl(link)));
}

/**
 * Wires up the quick links controls and does the initial render.
 */
function initLinks() {
  loadLinks();
  renderLinks();

  const addBtn   = document.getElementById('link-add-btn');
  const nameInput = document.getElementById('link-name-input');
  const urlInput  = document.getElementById('link-url-input');

  const doAdd = () => {
    addLink(nameInput.value, urlInput.value);
    nameInput.value = '';
    urlInput.value  = '';
    nameInput.focus();
  };

  addBtn.addEventListener('click', doAdd);

  // Allow pressing Enter in either input to trigger add
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doAdd();
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') urlInput.focus();
  });
}


/* ── INIT — DOMContentLoaded ─────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Apply theme first (prevents flash of wrong colour scheme)
  initTheme();

  // 2. Start the greeting clock
  initGreeting();

  // 3. Wire the focus timer
  initTimer();

  // 4. Load and wire the to-do list
  initTodo();

  // 5. Load and wire the quick links
  initLinks();

  // 6. Theme toggle button
  document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

  // 7. Save-name button + Enter key on the name input
  document.getElementById('save-name-btn').addEventListener('click', saveName);
  document.getElementById('username-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveName();
  });
});
