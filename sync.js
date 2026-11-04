// Автоматична синхронізація між пристроями через секретний GitHub Gist.
// Ключ зберігається лише на цьому пристрої й ніколи не потрапляє до резервних копій.

const SYNC_KEY = "workout-app-sync";
const GIST_FILE = "trenuvannia-sync.json";
const GITHUB_API = "https://api.github.com";
const TOKEN_URL = "https://github.com/settings/tokens/new?scopes=gist&description=Trenuvannia%20sync";
const SYNC_DELAY_MS = 5000;
const RESUME_INTERVAL_MS = 60000;

let syncConfig = loadSyncConfig();
let syncRunning = false;
let syncAgain = false;
let syncTimer = null;
let syncApplying = false;
let syncMessage = null;
let syncLastRun = 0;

function loadSyncConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(SYNC_KEY));
    if (saved && saved.token) return saved;
  } catch (error) {
    // Без збережених налаштувань застосунок просто працює без синхронізації.
  }
  return null;
}

function saveSyncConfig() {
  try {
    if (syncConfig) localStorage.setItem(SYNC_KEY, JSON.stringify(syncConfig));
    else localStorage.removeItem(SYNC_KEY);
  } catch (error) {
    storageFailed = true;
  }
}

function syncContent(startDate, logs) {
  const sorted = {};
  Object.keys(logs)
    .sort()
    .forEach((key) => {
      sorted[key] = logs[key];
    });
  return JSON.stringify({ version: 1, startDate, logs: sorted });
}

// Для кожного дня залишається новіша версія. За однакового часу перемагає версія з Gist,
// щоб обидва пристрої зійшлися на одних даних.
function mergeLogs(local, remote) {
  const merged = { ...local };
  Object.entries(remote).forEach(([key, log]) => {
    const current = local[key];
    if (!current || (log.updatedAt || "") >= (current.updatedAt || "")) merged[key] = log;
  });
  return merged;
}

function earliestDate(first, second) {
  if (!first) return second || null;
  if (!second) return first;
  return first < second ? first : second;
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${syncConfig.token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!response.ok) {
    const error = new Error("github");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function findGistId() {
  for (let page = 1; page <= 5; page += 1) {
    const gists = await githubRequest(`/gists?per_page=100&page=${page}`);
    const found = gists.find((gist) => gist.files && gist.files[GIST_FILE]);
    if (found) return found.id;
    if (gists.length < 100) break;
  }
  return null;
}

async function createGist() {
  const gist = await githubRequest("/gists", {
    method: "POST",
    body: JSON.stringify({
      description: "Тренування: синхронізація результатів",
      public: false,
      files: { [GIST_FILE]: { content: syncContent(store.startDate, store.logs) } },
    }),
  });
  return gist.id;
}

async function readRemote(gistId) {
  const gist = await githubRequest(`/gists/${gistId}`);
  const file = gist.files && gist.files[GIST_FILE];
  if (!file) {
    const error = new Error("missing");
    error.status = 404;
    throw error;
  }
  let content = file.content;
  if (file.truncated) {
    const response = await fetch(file.raw_url, { cache: "no-store" });
    content = await response.text();
  }
  let data = null;
  try {
    data = JSON.parse(content);
  } catch (error) {
    data = null;
  }
  if (!isValidBackup(data)) {
    const error = new Error("corrupt");
    error.corrupt = true;
    throw error;
  }
  return data;
}

function applyRemote(remote) {
  const merged = mergeLogs(store.logs, remote.logs);
  const startDate = earliestDate(store.startDate, remote.startDate);
  if (syncContent(startDate, merged) === syncContent(store.startDate, store.logs)) return;
  store.logs = merged;
  store.startDate = startDate;
  syncApplying = true;
  saveStore();
  syncApplying = false;
  const active = document.activeElement;
  if (!(active && active.closest && active.closest(".set"))) render();
}

function syncErrorMessage(error) {
  if (error.status === 401) return "GitHub не прийняв ключ. Перевірте його або створіть новий.";
  if (error.status === 403 || error.status === 429) return "GitHub тимчасово обмежив запити або ключ не має дозволу gist. Спробую пізніше.";
  if (error.corrupt) return "Файл у Gist пошкоджено. Нічого не змінено.";
  if (error.status) return `GitHub відповів помилкою ${error.status}. Спробую пізніше.`;
  return "Немає зв'язку з GitHub. Дані збережено тут, надішлю їх пізніше.";
}

async function runSync() {
  if (!syncConfig) return false;
  if (syncRunning) {
    syncAgain = true;
    return false;
  }
  clearTimeout(syncTimer);
  syncTimer = null;
  syncRunning = true;
  syncLastRun = Date.now();
  syncMessage = null;
  renderSyncPanel();
  let succeeded = false;
  try {
    if (!syncConfig.gistId) {
      syncConfig.gistId = (await findGistId()) || (await createGist());
    }
    const remote = await readRemote(syncConfig.gistId);
    applyRemote(remote);
    const content = syncContent(store.startDate, store.logs);
    if (content !== syncContent(remote.startDate, remote.logs)) {
      await githubRequest(`/gists/${syncConfig.gistId}`, {
        method: "PATCH",
        body: JSON.stringify({ files: { [GIST_FILE]: { content } } }),
      });
    }
    syncConfig.lastSyncAt = new Date().toISOString();
    saveSyncConfig();
    succeeded = true;
  } catch (error) {
    if (error.status === 404) syncConfig.gistId = null;
    syncMessage = syncErrorMessage(error);
  } finally {
    syncRunning = false;
  }
  if (syncAgain) {
    syncAgain = false;
    scheduleSync();
  }
  renderSyncPanel();
  return succeeded;
}

function scheduleSync() {
  if (!syncConfig || syncApplying) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(runSync, SYNC_DELAY_MS);
}

async function connectSync(token) {
  syncConfig = { token, gistId: null, lastSyncAt: null };
  const connected = await runSync();
  if (connected) {
    syncMessage = "Синхронізацію підключено.";
  } else {
    const message = syncMessage;
    syncConfig = null;
    saveSyncConfig();
    syncMessage = message;
  }
  renderSyncPanel();
}

function disconnectSync() {
  clearTimeout(syncTimer);
  syncTimer = null;
  syncConfig = null;
  saveSyncConfig();
  syncMessage = "Синхронізацію вимкнено на цьому пристрої. Дані тут і в Gist залишилися.";
  renderSyncPanel();
}

function syncStatusText() {
  if (syncRunning) return "Синхронізація…";
  if (!syncConfig || !syncConfig.lastSyncAt) return "Ще не виконувалася.";
  const time = new Date(syncConfig.lastSyncAt);
  const sameDay = toKey(time) === toKey(new Date());
  const clock = time.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  return `Остання синхронізація: ${sameDay ? "сьогодні" : toKey(time)} о ${clock}.`;
}

function renderConnectForm(body) {
  const link = el("a", "text-link", "Створити ключ на GitHub");
  link.href = TOKEN_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const input = document.createElement("input");
  input.type = "password";
  input.className = "token-input";
  input.id = "sync-token";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = "Вставте ключ";

  const connect = el("button", "fill", "Підключити");
  connect.type = "button";
  connect.disabled = syncRunning;
  connect.addEventListener("click", () => {
    const token = input.value.trim();
    if (!token) {
      syncMessage = "Спочатку вставте ключ.";
      renderSyncPanel();
      return;
    }
    connectSync(token);
  });

  body.append(
    el("p", "block-note", "Результати автоматично зберігатимуться в секретному Gist у вашому обліковому записі. Його можна відкрити лише за посиланням."),
    el(
      "ol",
      "sync-steps",
      el("li", null, link),
      el("li", null, "Виберіть термін дії No expiration, залиште позначку gist і натисніть Generate token."),
      el("li", null, "Скопіюйте ключ і вставте його нижче. На другому пристрої можна вставити той самий ключ."),
    ),
    el("label", "token-label", el("span", "set-label", "Ключ GitHub"), input),
    el("div", "data-actions", connect),
  );
}

function renderConnectedActions(body) {
  const now = el("button", "fill", "Синхронізувати зараз");
  now.type = "button";
  now.disabled = syncRunning;
  now.addEventListener("click", runSync);
  const off = el("button", "plain", "Вимкнути на цьому пристрої");
  off.type = "button";
  off.addEventListener("click", disconnectSync);
  body.append(el("p", null, syncStatusText()), el("div", "data-actions", now, off));
}

function renderSyncPanel() {
  const panel = document.getElementById("sync-panel");
  if (!panel) return;
  // Форму не перемальовуємо без потреби, щоб не стерти вставлений ключ.
  const typedToken = document.getElementById("sync-token");
  const keptToken = typedToken ? typedToken.value : "";

  const body = el("div", "data-body");
  if (syncConfig) renderConnectedActions(body);
  else renderConnectForm(body);
  if (syncMessage) {
    const status = el("p", "data-status", syncMessage);
    status.setAttribute("role", "status");
    body.append(status);
  }

  const title = syncConfig ? "Синхронізація увімкнена" : "Синхронізація між пристроями";
  const details = el("details", "phase", el("summary", null, title), body);
  details.open = panel.dataset.opened === "true" || Boolean(syncMessage);
  details.addEventListener("toggle", () => {
    panel.dataset.opened = String(details.open);
  });
  panel.dataset.opened = String(details.open);
  panel.replaceChildren(details);

  const newInput = document.getElementById("sync-token");
  if (newInput && keptToken) newInput.value = keptToken;
}

renderSyncPanel();

document.addEventListener("visibilitychange", () => {
  if (!syncConfig) return;
  if (document.visibilityState === "hidden" && syncTimer) runSync();
  if (document.visibilityState === "visible" && Date.now() - syncLastRun > RESUME_INTERVAL_MS) runSync();
});
window.addEventListener("online", runSync);
if (syncConfig) runSync();
