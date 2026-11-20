/* =========================================================
   Dashboard app — single JS file
   Modules: clock/greeting, theme, timer, todos, quick links.
   All persistent data lives in localStorage.
   ========================================================= */

(function () {
  "use strict";

  /* ---------- Small helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage may be unavailable; ignore */
      }
    },
  };

  /* =========================================================
     1. Clock + greeting (Challenge: custom name in greeting)
     ========================================================= */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const clockEl = $("clock");
  const dateEl = $("date");
  const greetingTextEl = $("greetingText");
  const nameSuffixEl = $("nameSuffix");
  const nameInput = $("nameInput");
  const saveNameBtn = $("saveNameBtn");

  const NAME_KEY = "dash.userName";

  function greetingFor(hour) {
    if (hour < 5) return "Good night";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  }

  function renderName() {
    const name = store.get(NAME_KEY, "");
    nameSuffixEl.textContent = name ? `, ${name}` : "";
    nameInput.value = name;
  }

  function tick() {
    const now = new Date();
    clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    dateEl.textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    greetingTextEl.textContent = greetingFor(now.getHours());
  }

  saveNameBtn.addEventListener("click", () => {
    store.set(NAME_KEY, nameInput.value.trim());
    renderName();
    nameInput.value = store.get(NAME_KEY, "");
  });
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveNameBtn.click();
  });

  tick();
  setInterval(tick, 1000);

  /* =========================================================
     2. Theme toggle (Challenge: light / dark mode)
     ========================================================= */
  const THEME_KEY = "dash.theme";
  const themeToggle = $("themeToggle");
  const themeIcon = themeToggle.querySelector(".theme-icon");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  // Default to the OS preference on first visit.
  const initialTheme = store.get(THEME_KEY, null) ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initialTheme);

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    store.set(THEME_KEY, next);
  });

  /* =========================================================
     3. Focus timer (Challenge: change Pomodoro time)
     ========================================================= */
  const TIMER_KEY = "dash.durationMin";
  const displayEl = $("timerDisplay");
  const startBtn = $("startBtn");
  const stopBtn = $("stopBtn");
  const resetBtn = $("resetBtn");
  const durationInput = $("durationInput");
  const setDurationBtn = $("setDurationBtn");

  let durationMin = store.get(TIMER_KEY, 25);
  let remainingSec = durationMin * 60;
  let intervalId = null;

  function fmtDisplay(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${pad(m)}:${pad(s)}`;
  }

  function renderTimer() {
    displayEl.textContent = fmtDisplay(remainingSec);
    durationInput.value = durationMin;
  }

  function setRunning(running) {
    startBtn.disabled = running;
    stopBtn.disabled = !running;
    setDurationBtn.disabled = running;
    durationInput.disabled = running;
  }

  function startTimer() {
    if (intervalId) return;
    setRunning(true);
    intervalId = setInterval(() => {
      remainingSec -= 1;
      if (remainingSec <= 0) {
        remainingSec = 0;
        clearInterval(intervalId);
        intervalId = null;
        setRunning(false);
        renderTimer();
        displayEl.textContent = "Done! 🎉";
        setTimeout(() => { if (!intervalId) renderTimer(); }, 2500);
        return;
      }
      renderTimer();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(intervalId);
    intervalId = null;
    setRunning(false);
  }

  function resetTimer() {
    stopTimer();
    remainingSec = durationMin * 60;
    renderTimer();
  }

  function setDuration() {
    const val = parseInt(durationInput.value, 10);
    if (Number.isNaN(val) || val < 1 || val > 90) return;
    durationMin = val;
    store.set(TIMER_KEY, durationMin);
    resetTimer();
  }

  startBtn.addEventListener("click", startTimer);
  stopBtn.addEventListener("click", stopTimer);
  resetBtn.addEventListener("click", resetTimer);
  setDurationBtn.addEventListener("click", setDuration);
  durationInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") setDuration();
  });

  renderTimer();

  /* =========================================================
     4. To-do list (Challenges: sort tasks, prevent duplicates)
     ========================================================= */
  const TODO_KEY = "dash.todos";
  const SORT_KEY = "dash.todoSort";

  const todoForm = $("todoForm");
  const todoInput = $("todoInput");
  const todoListEl = $("todoList");
  const todoMsgEl = $("todoMsg");
  const sortSelect = $("sortSelect");
  const clearDoneBtn = $("clearDoneBtn");
  const emptyHint = $("emptyHint");

  let todos = store.get(TODO_KEY, []);
  let sortMode = store.get(SORT_KEY, "added");

  sortSelect.value = sortMode;

  function saveTodos() { store.set(TODO_KEY, todos); }

  function sortedTodos() {
    const copy = todos.slice();
    switch (sortMode) {
      case "alpha":
        copy.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case "status":
        copy.sort((a, b) => Number(a.done) - Number(b.done));
        break;
      case "done":
        copy.sort((a, b) => Number(b.done) - Number(a.done));
        break;
      default: // "added" — keep insertion order
    }
    return copy;
  }

  function renderTodos() {
    todoListEl.innerHTML = "";
    const list = sortedTodos();

    emptyHint.style.display = list.length ? "none" : "block";

    list.forEach((todo) => {
      const li = document.createElement("li");
      li.className = "todo-item" + (todo.done ? " done" : "");
      li.dataset.id = todo.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "todo-check";
      checkbox.checked = todo.done;
      checkbox.addEventListener("change", () => toggleDone(todo.id));

      const text = document.createElement("span");
      text.className = "todo-text";
      text.textContent = todo.text;

      const actions = document.createElement("div");
      actions.className = "todo-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.title = "Edit";
      editBtn.textContent = "✏️";
      editBtn.addEventListener("click", () => startEdit(todo.id, li));
      actions.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.title = "Delete";
      delBtn.className = "del-btn";
      delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", () => deleteTodo(todo.id));
      actions.appendChild(delBtn);

      li.append(checkbox, text, actions);
      todoListEl.appendChild(li);
    });
  }

  function flashMsg(msg) {
    todoMsgEl.textContent = msg;
    if (msg) setTimeout(() => { if (todoMsgEl.textContent === msg) todoMsgEl.textContent = ""; }, 2500);
  }

  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Challenge: prevent duplicate tasks (case-insensitive)
    const exists = todos.some((t) => t.text.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      flashMsg("That task is already on your list.");
      return;
    }

    todos.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: trimmed, done: false });
    saveTodos();
    renderTodos();
  }

  function toggleDone(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.done = !todo.done;
    saveTodos();
    renderTodos();
  }

  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    renderTodos();
  }

  function startEdit(id, li) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-edit";
    input.value = todo.text;
    input.maxLength = 120;

    const finish = (commit) => {
      if (commit) {
        const val = input.value.trim();
        if (val && val.toLowerCase() !== todo.text.toLowerCase()) {
          const dup = todos.some((t) => t.id !== id && t.text.toLowerCase() === val.toLowerCase());
          if (dup) { flashMsg("Another task already has that text."); renderTodos(); return; }
          todo.text = val;
          saveTodos();
        }
      }
      renderTodos();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(true);
      else if (e.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));

    li.innerHTML = "";
    li.appendChild(input);
    input.focus();
    input.select();
  }

  todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(todoInput.value);
    todoInput.value = "";
    todoInput.focus();
  });

  sortSelect.addEventListener("change", () => {
    sortMode = sortSelect.value;
    store.set(SORT_KEY, sortMode);
    renderTodos();
  });

  clearDoneBtn.addEventListener("click", () => {
    const before = todos.length;
    todos = todos.filter((t) => !t.done);
    if (todos.length !== before) { saveTodos(); renderTodos(); }
  });

  renderTodos();

  /* =========================================================
     5. Quick links
     ========================================================= */
  const LINKS_KEY = "dash.links";
  const linkForm = $("linkForm");
  const linkName = $("linkName");
  const linkUrl = $("linkUrl");
  const linksListEl = $("linksList");
  const linksEmpty = $("linksEmpty");

  let links = store.get(LINKS_KEY, []);

  function saveLinks() { store.set(LINKS_KEY, links); }

  function normalizeUrl(url) {
    let u = url.trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return u;
  }

  function renderLinks() {
    linksListEl.innerHTML = "";
    linksEmpty.style.display = links.length ? "none" : "block";

    links.forEach((link) => {
      const card = document.createElement("div");
      card.className = "link-card";

      const a = document.createElement("a");
      a.href = link.url;
      a.textContent = link.name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "link-del";
      del.title = "Remove";
      del.textContent = "×";
      del.addEventListener("click", () => {
        links = links.filter((l) => l.id !== link.id);
        saveLinks();
        renderLinks();
      });

      card.append(a, del);
      linksListEl.appendChild(card);
    });
  }

  linkForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = linkName.value.trim();
    const url = normalizeUrl(linkUrl.value);
    if (!name || !url) return;
    try {
      // Validate URL.
      new URL(url);
    } catch {
      return;
    }
    links.push({ id: Date.now().toString(36), name, url });
    saveLinks();
    renderLinks();
    linkForm.reset();
    linkName.focus();
  });

  renderLinks();

  /* ---------- Re-render greeting name once storage is loaded ---------- */
  renderName();
})();
