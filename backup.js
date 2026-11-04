// Резервні копії та перенесення результатів між пристроями, а також підключення роботи без інтернету.

const LAST_EXPORT_KEY = "workout-app-last-export";
const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EXERCISE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

function readLastExport() {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY);
  } catch (error) {
    return null;
  }
}

function isValidLog(log) {
  if (!log || typeof log !== "object" || typeof log.finished !== "boolean") return false;
  if (!log.results || typeof log.results !== "object" || Array.isArray(log.results)) return false;
  return Object.entries(log.results).every(
    ([id, values]) =>
      EXERCISE_ID_PATTERN.test(id) &&
      Array.isArray(values) &&
      values.every((value) => value === null || (Number.isInteger(value) && value >= 0)),
  );
}

function isValidBackup(data) {
  if (!data || typeof data !== "object" || data.version !== 1) return false;
  if (data.startDate !== null && !(typeof data.startDate === "string" && DATE_PATTERN.test(data.startDate))) return false;
  if (!data.logs || typeof data.logs !== "object" || Array.isArray(data.logs)) return false;
  return Object.entries(data.logs).every(([key, log]) => DATE_PATTERN.test(key) && isValidLog(log));
}

function compareBackup(data) {
  let added = 0;
  let changed = 0;
  Object.entries(data.logs).forEach(([key, log]) => {
    if (!store.logs[key]) added += 1;
    else if (JSON.stringify(store.logs[key]) !== JSON.stringify(log)) changed += 1;
  });
  return { added, changed };
}

function applyBackup(data) {
  Object.assign(store.logs, data.logs);
  if (data.startDate && (!store.startDate || data.startDate < store.startDate)) store.startDate = data.startDate;
  saveStore();
  render();
}

function exportBackup() {
  const payload = JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `trenuvannia-${toKey(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  try {
    localStorage.setItem(LAST_EXPORT_KEY, toKey(new Date()));
  } catch (error) {
    storageFailed = true;
  }
  renderDataPanel("Файл створено. Збережіть його в надійному місці або надішліть на інший пристрій.");
}

async function importBackup(file) {
  if (file.size > MAX_BACKUP_BYTES) {
    renderDataPanel("Файл завеликий для резервної копії.");
    return;
  }
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (error) {
    data = null;
  }
  if (!isValidBackup(data)) {
    renderDataPanel("Це не схоже на резервну копію застосунку. Дані не змінено.");
    return;
  }
  const { added, changed } = compareBackup(data);
  if (added === 0 && changed === 0) {
    renderDataPanel("У файлі немає нових даних.");
    return;
  }
  renderDataPanel(null, { data, added, changed });
}

function renderDataPanel(message, pending) {
  const panel = document.getElementById("data-panel");
  const finishedCount = Object.values(store.logs).filter((log) => log.finished).length;
  const lastExport = readLastExport();
  const body = el(
    "div",
    "data-body",
    el("p", null, `Завершених тренувань на цьому пристрої: ${finishedCount}. Остання копія: ${lastExport || "ще не створювалася"}.`),
    el("p", "block-note", "Результати зберігаються лише на цьому пристрої. Щоб перенести їх або не втратити, створюйте копію щонайменше раз на тиждень."),
  );

  if (pending) {
    const confirm = el("button", "fill", "Імпортувати");
    confirm.type = "button";
    confirm.addEventListener("click", () => {
      applyBackup(pending.data);
      renderDataPanel(storageFailed ? "Не вдалося зберегти дані на цьому пристрої." : "Дані імпортовано.");
    });
    const cancel = el("button", "plain", "Скасувати");
    cancel.type = "button";
    cancel.addEventListener("click", () => renderDataPanel("Імпорт скасовано. Дані не змінено."));
    body.append(
      el("p", "notice", `Нових днів: ${pending.added}. Днів, які буде замінено даними з файлу: ${pending.changed}.`),
      el("div", "data-actions", confirm, cancel),
    );
  } else {
    const exportButton = el("button", "fill", "Створити копію");
    exportButton.type = "button";
    exportButton.addEventListener("click", exportBackup);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";
    fileInput.hidden = true;
    fileInput.id = "import-file";
    fileInput.addEventListener("change", () => {
      if (fileInput.files[0]) importBackup(fileInput.files[0]);
    });
    const importButton = el("button", "plain", "Імпортувати з файлу");
    importButton.type = "button";
    importButton.addEventListener("click", () => fileInput.click());
    body.append(el("div", "data-actions", exportButton, importButton, fileInput));
  }

  if (message) {
    const status = el("p", "data-status", message);
    status.setAttribute("role", "status");
    body.append(status);
  }

  const details = el("details", "phase", el("summary", null, "Дані й резервні копії"), body);
  details.open = panel.dataset.opened === "true" || Boolean(message || pending);
  details.addEventListener("toggle", () => {
    panel.dataset.opened = String(details.open);
  });
  panel.dataset.opened = String(details.open);
  panel.replaceChildren(details);
}

renderDataPanel();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js");
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
}
