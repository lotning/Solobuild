// Розділи застосунку й бічне меню. Поточний розділ — у адресі (#profile тощо),
// тож кнопка «Назад» на телефоні повертає до попереднього розділу.
// На широкому екрані меню видно постійно, на телефоні воно висувається кнопкою ☰.

const ICON_PATHS = {
  today: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12",
  profile: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z",
  progress: "M4 19h16M6 15l4-4 3 3 5-6",
  body: "M5 5h14v14H5zM9 10a3 3 0 0 1 6 0M12 10l1.5-2",
  data: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
};

const VIEWS = [
  { id: "today", name: "Тренування" },
  { id: "profile", name: "Профіль" },
  { id: "progress", name: "Прогрес" },
  { id: "body", name: "Тіло" },
  { id: "data", name: "Дані" },
];

const WIDE_SCREEN = window.matchMedia("(min-width: 1000px)");
let currentView = viewFromHash();

function viewFromHash() {
  const id = location.hash.slice(1);
  return VIEWS.some((view) => view.id === id) ? id : "today";
}

function goToView(id) {
  if (id === currentView) {
    closeDrawer();
    return;
  }
  // Тренування — головний екран без позначки в адресі.
  if (id === "today") history.pushState(null, "", location.pathname + location.search);
  else history.pushState(null, "", `#${id}`);
  showView(id);
}

function showView(id) {
  currentView = id;
  closeDrawer();
  render();
  window.scrollTo({ top: 0 });
}

window.addEventListener("popstate", () => showView(viewFromHash()));
window.addEventListener("hashchange", () => {
  if (viewFromHash() !== currentView) showView(viewFromHash());
});

function viewSubtitle(id) {
  if (id === "today") {
    const plan = planFor(todayKey, store.startDate);
    return `Сьогодні: ${(plan.day ? plan.day.title : RECOVERY.title).toLowerCase()}`;
  }
  if (id === "profile") {
    const game = computeGame(store);
    return `Рівень ${game.level} · досягнень ${Object.keys(game.unlocked).length} із ${ACHIEVEMENTS.length}`;
  }
  if (id === "progress") return "Графіки вправ і тестів";
  if (id === "body") {
    const entries = bodyEntries();
    const latest = entries[entries.length - 1];
    if (!latest) return "Заміри з розумних ваг";
    return `${typeof latest.weight === "number" ? `${formatDecimal(latest.weight)} кг · ` : ""}${formatDay(latest.key)}`;
  }
  return typeof syncConfig !== "undefined" && syncConfig ? "Синхронізація увімкнена" : "Синхронізація й резервні копії";
}

function icon(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ICON_PATHS[id]);
  svg.append(path);
  return svg;
}

function renderDrawer() {
  const list = document.getElementById("drawer-list");
  list.replaceChildren(
    ...VIEWS.map((view) => {
      const link = el("a", `drawer-link${view.id === currentView ? " is-active" : ""}`, icon(view.id), el("span", "drawer-text", el("span", "drawer-name", view.name), el("span", "drawer-note", viewSubtitle(view.id))));
      link.href = view.id === "today" ? "./" : `#${view.id}`;
      if (view.id === currentView) link.setAttribute("aria-current", "page");
      link.addEventListener("click", (event) => {
        event.preventDefault();
        goToView(view.id);
      });
      return el("li", null, link);
    }),
  );
}

function drawerIsOpen() {
  return document.getElementById("drawer").classList.contains("is-open");
}

function setDrawerInert() {
  // На телефоні закрите меню не повинно потрапляти у фокус.
  document.getElementById("drawer").inert = !WIDE_SCREEN.matches && !drawerIsOpen();
}

function openDrawer() {
  renderDrawer();
  document.getElementById("drawer").classList.add("is-open");
  document.getElementById("drawer-overlay").hidden = false;
  document.getElementById("menu-button").setAttribute("aria-expanded", "true");
  setDrawerInert();
  const active = document.querySelector(".drawer-link.is-active") || document.querySelector(".drawer-link");
  if (active) active.focus();
}

function closeDrawer() {
  if (!drawerIsOpen()) return;
  document.getElementById("drawer").classList.remove("is-open");
  document.getElementById("drawer-overlay").hidden = true;
  const button = document.getElementById("menu-button");
  button.setAttribute("aria-expanded", "false");
  setDrawerInert();
  if (!WIDE_SCREEN.matches) button.focus();
}

document.getElementById("menu-button").addEventListener("click", () => (drawerIsOpen() ? closeDrawer() : openDrawer()));
document.getElementById("drawer-overlay").addEventListener("click", closeDrawer);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawerIsOpen()) closeDrawer();
});
WIDE_SCREEN.addEventListener("change", () => {
  closeDrawer();
  setDrawerInert();
});
setDrawerInert();

// Показує активний розділ і малює лише його.
function renderView() {
  VIEWS.forEach((view) => {
    document.getElementById(`view-${view.id}`).hidden = view.id !== currentView;
  });
  if (WIDE_SCREEN.matches || drawerIsOpen()) renderDrawer();
  if (currentView === "profile") renderGamePanel();
  if (currentView === "progress") renderProgressPanel();
  if (currentView === "body") renderBodyPanel();
  if (currentView === "data") {
    if (typeof renderSyncPanel === "function") renderSyncPanel();
    if (typeof renderDataPanel === "function") renderDataPanel();
  }
}
