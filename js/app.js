/* ==========================================================
   To-Do List Dashboard — app.js
   Single JS file (Folder Rule: only 1 JS file in js/)
   Vanilla JavaScript — no frameworks, no libraries
   All data persisted via Browser LocalStorage API
   ========================================================== */

'use strict';

/* ----------------------------------------------------------
   LOCALSTORAGE KEYS
   ---------------------------------------------------------- */
const LS_NAME      = 'dashboard_name';
const LS_THEME     = 'dashboard_theme';
const LS_TASKS     = 'dashboard_tasks';
const LS_LINKS     = 'dashboard_links';
const LS_POMODORO  = 'dashboard_pomodoro_minutes';

/* ----------------------------------------------------------
   HELPERS
   ---------------------------------------------------------- */

/**
 * Read and parse a JSON value from LocalStorage.
 * Returns `fallback` if the key is missing or JSON is invalid.
 */
function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

/** Stringify and write a value to LocalStorage. */
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Generate a short unique ID. */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ----------------------------------------------------------
   1. GREETING SECTION
   ---------------------------------------------------------- */

const clockEl         = document.getElementById('clock');
const dateEl          = document.getElementById('dateDisplay');
const greetingMsgEl   = document.getElementById('greetingMessage');
const greetingNameEl  = document.getElementById('greetingName');
const nameEditWrapper = document.getElementById('nameEditWrapper');
const nameInputEl     = document.getElementById('nameInput');
const saveNameBtn     = document.getElementById('saveNameBtn');

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

/** Return the time-of-day greeting string based on the current hour. */
function getGreetingPhrase(hour) {
  if (hour >= 5  && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

/** Pad a number to 2 digits. */
function pad(n) {
  return String(n).padStart(2, '0');
}

/** Update the clock, date, and greeting text every second. */
function updateClock() {
  const now  = new Date();
  const h    = now.getHours();
  const m    = now.getMinutes();
  const s    = now.getSeconds();

  clockEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  dateEl.textContent  = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  greetingMsgEl.textContent = `${getGreetingPhrase(h)},`;
}

/** Render the user's name in the greeting. */
function renderName() {
  const name = lsGet(LS_NAME, 'Friend');
  greetingNameEl.textContent = name;
}

/** Show the inline name-edit input. */
function showNameEdit() {
  const current = lsGet(LS_NAME, 'Friend');
  nameInputEl.value = current;
  greetingNameEl.classList.add('hidden');
  nameEditWrapper.classList.remove('hidden');
  nameInputEl.focus();
  nameInputEl.select();
}

/** Save the new name and hide the edit input. */
function saveName() {
  const trimmed = nameInputEl.value.trim();
  const name = trimmed.length > 0 ? trimmed : 'Friend';
  lsSet(LS_NAME, name);
  greetingNameEl.textContent = name;
  greetingNameEl.classList.remove('hidden');
  nameEditWrapper.classList.add('hidden');
}

// Click/keyboard on the displayed name → open edit
greetingNameEl.addEventListener('click', showNameEdit);
greetingNameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    showNameEdit();
  }
});

saveNameBtn.addEventListener('click', saveName);

nameInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveName();
  if (e.key === 'Escape') {
    greetingNameEl.classList.remove('hidden');
    nameEditWrapper.classList.add('hidden');
  }
});

// Initialise greeting
renderName();
updateClock();
setInterval(updateClock, 1000);

/* ----------------------------------------------------------
   2. THEME (LIGHT / DARK MODE)
   ---------------------------------------------------------- */

const themeToggleBtn = document.getElementById('themeToggle');
const themeIconEl    = document.getElementById('themeIcon');

/** Apply the given theme ('light' or 'dark') to <body>. */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
    themeIconEl.textContent = '☀️';
    themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
  } else {
    document.body.classList.add('light');
    document.body.classList.remove('dark');
    themeIconEl.textContent = '🌙';
    themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
  }
  lsSet(LS_THEME, theme);
}

themeToggleBtn.addEventListener('click', () => {
  const current = document.body.classList.contains('dark') ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// Initialise theme from LocalStorage (default: light)
applyTheme(lsGet(LS_THEME, 'light'));

/* ----------------------------------------------------------
   3. FOCUS TIMER (POMODORO)
   ---------------------------------------------------------- */

const timerDisplayEl  = document.getElementById('timerDisplay');
const timerStartBtn   = document.getElementById('timerStartBtn');
const timerStopBtn    = document.getElementById('timerStopBtn');
const timerResetBtn   = document.getElementById('timerResetBtn');
const pomodoroInput   = document.getElementById('pomodoroMinutes');
const applyTimerBtn   = document.getElementById('applyTimerBtn');

// Timer state (in-memory only — does not persist across refreshes)
let timerDurationSecs = lsGet(LS_POMODORO, 25) * 60;
let timerRemaining    = timerDurationSecs;
let timerInterval     = null;
let timerRunning      = false;

// Initialise the minutes input from stored preference
pomodoroInput.value = lsGet(LS_POMODORO, 25);

/** Format seconds as MM:SS. */
function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${pad(mins)}:${pad(secs)}`;
}

/** Refresh the timer display element. */
function renderTimer() {
  timerDisplayEl.textContent = formatTime(timerRemaining);
}

/** Tick the timer down by one second. */
function timerTick() {
  if (timerRemaining <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning  = false;
    timerDisplayEl.classList.remove('running');
    timerDisplayEl.classList.add('finished');
    timerRemaining = 0;
    renderTimer();
    notifyTimerDone();
    return;
  }
  timerRemaining -= 1;
  renderTimer();
}

/** Show a browser Notification or fall back to alert. */
function notifyTimerDone() {
  const msg = "⏰ Time's up! Take a break.";
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Focus Timer', { body: msg, icon: '' });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification('Focus Timer', { body: msg });
      } else {
        alert(msg);
      }
    });
  } else {
    alert(msg);
  }
}

timerStartBtn.addEventListener('click', () => {
  if (timerRunning) return;
  if (timerRemaining <= 0) {
    // If already finished, reset first
    timerRemaining = timerDurationSecs;
    timerDisplayEl.classList.remove('finished');
  }
  timerRunning = true;
  timerDisplayEl.classList.add('running');
  timerDisplayEl.classList.remove('finished');
  timerInterval = setInterval(timerTick, 1000);
});

timerStopBtn.addEventListener('click', () => {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning  = false;
  timerDisplayEl.classList.remove('running');
});

timerResetBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval  = null;
  timerRunning   = false;
  timerRemaining = timerDurationSecs;
  timerDisplayEl.classList.remove('running', 'finished');
  renderTimer();
});

applyTimerBtn.addEventListener('click', () => {
  const mins = parseInt(pomodoroInput.value, 10);
  if (isNaN(mins) || mins < 1 || mins > 120) {
    pomodoroInput.value = lsGet(LS_POMODORO, 25);
    return;
  }
  // Stop any running timer first
  clearInterval(timerInterval);
  timerInterval    = null;
  timerRunning     = false;
  timerDurationSecs = mins * 60;
  timerRemaining   = timerDurationSecs;
  timerDisplayEl.classList.remove('running', 'finished');
  lsSet(LS_POMODORO, mins);
  renderTimer();
});

// Initialise display
renderTimer();

/* ----------------------------------------------------------
   4. TO-DO LIST
   ---------------------------------------------------------- */

const taskInputEl  = document.getElementById('taskInput');
const addTaskBtn   = document.getElementById('addTaskBtn');
const taskListEl   = document.getElementById('taskList');
const taskErrorEl  = document.getElementById('taskError');
const sortBtns     = document.querySelectorAll('.sort-btn');

let tasks       = lsGet(LS_TASKS, []);
let currentSort = 'default';

/** Persist tasks array to LocalStorage. */
function saveTasks() {
  lsSet(LS_TASKS, tasks);
}

/** Show or hide the task error message. */
function showTaskError(msg) {
  taskErrorEl.textContent = msg;
  taskErrorEl.classList.remove('hidden');
  setTimeout(() => taskErrorEl.classList.add('hidden'), 3000);
}

/**
 * Return the sorted tasks array without mutating the original.
 * sort = 'default' | 'alpha' | 'completed'
 */
function getSortedTasks() {
  const copy = [...tasks];
  if (currentSort === 'alpha') {
    copy.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()));
  } else if (currentSort === 'completed') {
    copy.sort((a, b) => {
      if (a.done === b.done) return 0;
      return a.done ? 1 : -1;   // incomplete first
    });
  }
  // 'default' keeps insertion order (original array order)
  return copy;
}

/** Build and inject the task list DOM. */
function renderTasks() {
  taskListEl.innerHTML = '';
  const sorted = getSortedTasks();

  if (sorted.length === 0) {
    const empty = document.createElement('li');
    empty.style.cssText = 'text-align:center;color:var(--text-muted);font-size:0.875rem;padding:24px 0;';
    empty.textContent = 'No tasks yet — add one above!';
    taskListEl.appendChild(empty);
    return;
  }

  sorted.forEach((task) => {
    const li = buildTaskItem(task);
    taskListEl.appendChild(li);
  });
}

/**
 * Create the <li> element for a single task.
 * @param {{ id: string, text: string, done: boolean }} task
 */
function buildTaskItem(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.done ? ' completed' : ''}`;
  li.dataset.id = task.id;

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.done ? 'incomplete' : 'complete'}`);
  checkbox.addEventListener('change', () => toggleTask(task.id));

  // Task text span
  const textSpan = document.createElement('span');
  textSpan.className = 'task-text';
  textSpan.textContent = task.text;

  // Action buttons wrapper
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'btn-edit';
  editBtn.textContent = 'Edit';
  editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
  editBtn.addEventListener('click', () => startEditTask(li, task));

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-danger';
  delBtn.textContent = '✕';
  delBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
  delBtn.addEventListener('click', () => deleteTask(task.id));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  li.appendChild(checkbox);
  li.appendChild(textSpan);
  li.appendChild(actions);

  return li;
}

/**
 * Replace the task text span with an inline edit input + Save button.
 */
function startEditTask(li, task) {
  // Prevent double-edit
  if (li.querySelector('.task-edit-input')) return;

  const textSpan = li.querySelector('.task-text');
  const actions  = li.querySelector('.task-actions');

  // Hide static text
  textSpan.classList.add('hidden');

  // Build inline input
  const editInput = document.createElement('input');
  editInput.type      = 'text';
  editInput.className = 'task-edit-input';
  editInput.value     = task.text;
  editInput.maxLength = 200;
  editInput.setAttribute('aria-label', 'Edit task text');

  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.className   = 'btn btn-accent btn-sm';
  saveBtn.textContent = 'Save';
  saveBtn.setAttribute('aria-label', 'Save edited task');

  const confirmEdit = () => {
    const newText = editInput.value.trim();
    if (newText.length === 0) return;

    // Duplicate check (excluding the task being edited)
    const isDupe = tasks.some(
      (t) => t.id !== task.id && t.text.toLowerCase() === newText.toLowerCase()
    );
    if (isDupe) {
      showTaskError('A task with that name already exists.');
      return;
    }

    // Update in array
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx !== -1) {
      tasks[idx].text = newText;
      saveTasks();
    }
    renderTasks();
  };

  saveBtn.addEventListener('click', confirmEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  confirmEdit();
    if (e.key === 'Escape') renderTasks(); // cancel
  });

  // Insert before the actions div
  li.insertBefore(editInput, actions);
  li.insertBefore(saveBtn, actions);
  editInput.focus();
  editInput.select();

  // Replace existing edit button with a Cancel button
  const oldEditBtn = actions.querySelector('.btn-edit');
  const cancelBtn  = document.createElement('button');
  cancelBtn.className   = 'btn-ghost btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.fontSize = '0.75rem';
  cancelBtn.setAttribute('aria-label', 'Cancel edit');
  cancelBtn.addEventListener('click', renderTasks);
  if (oldEditBtn) actions.replaceChild(cancelBtn, oldEditBtn);
}

/** Toggle a task's done state. */
function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks();
    renderTasks();
  }
}

/** Delete a task by id. */
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

/** Add a new task from the input field. */
function addTask() {
  const text = taskInputEl.value.trim();

  if (text.length === 0) {
    showTaskError('Please enter a task.');
    return;
  }

  // Duplicate check (case-insensitive)
  const isDupe = tasks.some((t) => t.text.toLowerCase() === text.toLowerCase());
  if (isDupe) {
    showTaskError('That task already exists.');
    return;
  }

  tasks.push({ id: uid(), text, done: false });
  saveTasks();
  taskInputEl.value = '';
  taskErrorEl.classList.add('hidden');
  renderTasks();
}

addTaskBtn.addEventListener('click', addTask);
taskInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

// Sort buttons
sortBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    sortBtns.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    currentSort = btn.dataset.sort;
    renderTasks();
  });
});

// Initial render
renderTasks();

/* ----------------------------------------------------------
   5. QUICK LINKS
   ---------------------------------------------------------- */

const linksGridEl    = document.getElementById('linksGrid');
const openAddLinkBtn = document.getElementById('openAddLinkBtn');
const linkModal      = document.getElementById('linkModal');
const cancelLinkBtn  = document.getElementById('cancelLinkBtn');
const saveLinkBtn    = document.getElementById('saveLinkBtn');
const linkNameInput  = document.getElementById('linkNameInput');
const linkUrlInput   = document.getElementById('linkUrlInput');
const linkErrorEl    = document.getElementById('linkError');

/** Default links shown when LocalStorage has no links. */
const DEFAULT_LINKS = [
  { id: 'default-google',  name: 'Google',  url: 'https://www.google.com' },
  { id: 'default-github',  name: 'GitHub',  url: 'https://github.com' },
  { id: 'default-youtube', name: 'YouTube', url: 'https://www.youtube.com' },
];

let links = lsGet(LS_LINKS, null);
// If LocalStorage has never been set, seed with defaults
if (links === null) {
  links = DEFAULT_LINKS;
  lsSet(LS_LINKS, links);
}

/** Persist links to LocalStorage. */
function saveLinks() {
  lsSet(LS_LINKS, links);
}

/** Extract domain from a URL string (used for favicon). */
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (_) {
    return url;
  }
}

/** Build and inject the links grid. */
function renderLinks() {
  linksGridEl.innerHTML = '';

  if (links.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-muted);font-size:0.875rem;';
    empty.textContent = 'No links yet — add your first one!';
    linksGridEl.appendChild(empty);
    return;
  }

  links.forEach((link) => {
    const card = buildLinkCard(link);
    linksGridEl.appendChild(card);
  });
}

/**
 * Build a single link card element.
 * @param {{ id: string, name: string, url: string }} link
 */
function buildLinkCard(link) {
  const card = document.createElement('div');
  card.className = 'link-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Open ${link.name}`);
  card.dataset.id = link.id;

  // Favicon
  const favicon = document.createElement('img');
  favicon.className = 'link-favicon';
  favicon.alt = '';
  favicon.loading = 'lazy';
  const domain = getDomain(link.url);
  favicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  // Fall back to a generic icon if the favicon fails
  favicon.onerror = () => {
    favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%236C63FF"/><text x="16" y="22" text-anchor="middle" font-size="18" font-family="sans-serif" fill="white">🔗</text></svg>';
  };

  // Name
  const nameEl = document.createElement('span');
  nameEl.className = 'link-name';
  nameEl.textContent = link.name;
  nameEl.title = link.name;

  // URL display
  const urlEl = document.createElement('span');
  urlEl.className = 'link-url-text';
  urlEl.textContent = domain;
  urlEl.title = link.url;

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'link-delete-btn';
  delBtn.textContent = '✕';
  delBtn.setAttribute('aria-label', `Remove link: ${link.name}`);
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteLink(link.id);
  });

  card.appendChild(favicon);
  card.appendChild(nameEl);
  card.appendChild(urlEl);
  card.appendChild(delBtn);

  // Navigate on click / Enter
  const navigate = () => window.open(link.url, '_blank', 'noopener,noreferrer');
  card.addEventListener('click', navigate);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate();
    }
  });

  return card;
}

/** Delete a link by id. */
function deleteLink(id) {
  links = links.filter((l) => l.id !== id);
  saveLinks();
  renderLinks();
}

/** Open the Add Link modal. */
function openLinkModal() {
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkErrorEl.classList.add('hidden');
  linkModal.classList.remove('hidden');
  linkNameInput.focus();
}

/** Close the Add Link modal. */
function closeLinkModal() {
  linkModal.classList.add('hidden');
}

/** Validate and save a new link. */
function saveLink() {
  const name = linkNameInput.value.trim();
  const rawUrl = linkUrlInput.value.trim();

  if (name.length === 0) {
    linkErrorEl.textContent = 'Please enter a name.';
    linkErrorEl.classList.remove('hidden');
    return;
  }

  if (rawUrl.length === 0) {
    linkErrorEl.textContent = 'Please enter a URL.';
    linkErrorEl.classList.remove('hidden');
    return;
  }

  // Prepend https:// if the user forgot the scheme
  let url = rawUrl;
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch (_) {
    linkErrorEl.textContent = 'Please enter a valid URL.';
    linkErrorEl.classList.remove('hidden');
    return;
  }

  links.push({ id: uid(), name, url });
  saveLinks();
  renderLinks();
  closeLinkModal();
}

openAddLinkBtn.addEventListener('click', openLinkModal);
cancelLinkBtn.addEventListener('click', closeLinkModal);
saveLinkBtn.addEventListener('click', saveLink);

// Close modal on overlay click (outside the modal box)
linkModal.addEventListener('click', (e) => {
  if (e.target === linkModal) closeLinkModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !linkModal.classList.contains('hidden')) {
    closeLinkModal();
  }
});

// Allow Enter key in the URL input to submit
linkUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveLink();
});
linkNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') linkUrlInput.focus();
});

// Initial render
renderLinks();
