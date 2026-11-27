// Екран «Сьогодні»: план на день, введення результатів і підсумок для наступних тренувань.

const WEEKDAYS = ["понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота", "неділя"];
const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const STORAGE_KEY = "workout-app-v1";

const today = new Date();
const todayKey = toKey(today);
const todayIndex = weekdayIndex(todayKey);
let selectedIndex = todayIndex;
let weekOffset = 0;
// Наскільки тижнів уперед можна гортати календар, щоб подивитися план.
const MAX_WEEKS_AHEAD = 8;
let editingKey = null;
let editSnapshot = null;
let storageFailed = false;
const store = loadStore();

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.logs) return { ...saved, body: saved.body || {} };
  } catch (error) {
    storageFailed = true;
  }
  return { version: 1, startDate: null, logs: {}, body: {} };
}

function saveStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    storageFailed = false;
  } catch (error) {
    storageFailed = true;
  }
  document.getElementById("storage-warning").hidden = !storageFailed;
  if (typeof scheduleSync === "function") scheduleSync();
}

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children.filter((child) => child !== null && child !== undefined));
  return node;
}

function dateForIndex(index) {
  const date = new Date(today);
  date.setDate(today.getDate() + index - todayIndex + weekOffset * 7);
  return date;
}

function dateLabel(index) {
  const date = dateForIndex(index);
  const month = date.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
  const weekday = WEEKDAYS[index];
  return `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${month}`;
}

function dayOfYear(date) {
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
}

function valueText(exercise, value) {
  return `${value}${exercise.unit ? ` ${exercise.unit}` : ""}`;
}

function targetText(exercise, sets, circuit) {
  const value = valueText(exercise, exercise.target);
  return circuit ? value : `${sets} × ${value}`;
}

function sideText(side) {
  if (side === "рука") return "на кожну руку";
  if (side === "нога") return "на кожну ногу";
  return side ? "на кожен бік" : null;
}

function detailsText(exercise) {
  const parts = [];
  if (exercise.weight) parts.push(exercise.weight);
  const side = sideText(exercise.side);
  if (side) parts.push(side);
  if (exercise.max) parts.push(exercise.target >= exercise.max ? "верхня межа" : `поступово до ${valueText(exercise, exercise.max)}`);
  return parts.join(" · ");
}

// Тренування, яке виконується саме зараз: сьогоднішнє або пропущене, яке надолужують сьогодні.
function isLiveSession(key) {
  const log = store.logs[key];
  return key === todayKey || Boolean(log && log.doneOn === todayKey);
}

function openDay(key) {
  if (currentView !== "today") {
    history.pushState(null, "", location.pathname + location.search);
    currentView = "today";
  }
  weekOffset = Math.round(daysBetween(mondayKey(todayKey), mondayKey(key)) / 7);
  selectedIndex = weekdayIndex(key);
  render();
  window.scrollTo({ top: 0 });
}

// Надолужити пропущене: результати зберігаються за днем за планом, а doneOn — коли зроблено насправді.
function startMakeup(key) {
  if (!store.startDate) store.startDate = mondayKey(todayKey);
  const log = store.logs[key] || { finished: false, results: {} };
  store.logs[key] = { ...log, doneOn: todayKey, updatedAt: new Date().toISOString() };
  saveStore();
  openDay(key);
}

function cancelMakeup(key) {
  const { doneOn, ...log } = store.logs[key];
  store.logs[key] = { ...log, updatedAt: new Date().toISOString() };
  saveStore();
  render();
}

function renderMakeupNotice(key) {
  const log = store.logs[key];
  const weekday = WEEKDAYS_ACCUSATIVE[weekdayIndex(key)];
  if (log && log.doneOn && log.doneOn !== key) {
    if (log.doneOn !== todayKey) return el("p", "notice", `Це тренування надолужено ${formatDay(log.doneOn)}.`);
    const notice = el("div", "notice makeup-notice", el("p", null, `Надолужуєте сьогодні: тренування зарахується за ${weekday}, а відновлення м'язів рахуватиметься від сьогодні.`));
    if (!log.finished) {
      const cancel = el("button", "plain", "Скасувати");
      cancel.type = "button";
      cancel.addEventListener("click", () => cancelMakeup(key));
      notice.append(cancel);
    }
    return notice;
  }
  const missed = key < todayKey && key >= mondayKey(todayKey) && !(log && log.finished) && !hasAnyResult(key);
  if (!missed) return null;
  const start = el("button", "fill", "Зробити сьогодні");
  start.type = "button";
  start.addEventListener("click", () => startMakeup(key));
  return el(
    "div",
    "notice makeup-notice",
    el("p", null, `Пропустили це тренування? Його можна зробити сьогодні — воно зарахується за ${weekday}. Якщо ви тренувалися того дня й просто не записали, вводьте результати нижче.`),
    start,
  );
}

function setResult(key, id, index, raw) {
  if (!store.startDate) store.startDate = mondayKey(todayKey);
  if (!store.logs[key]) store.logs[key] = { finished: false, results: {} };
  const log = store.logs[key];
  if (!log.results[id]) log.results[id] = [];
  const parsed = parseInt(raw, 10);
  log.results[id][index] = Number.isNaN(parsed) ? null : Math.min(9999, Math.max(0, parsed));
  log.updatedAt = new Date().toISOString();
  saveStore();
  if (typeof setTrainingAwake === "function") setTrainingAwake(isLiveSession(key) && !log.finished);
  if (log.finished) {
    refreshSummary(key);
  }
  refreshClearDay(key);
}

function setInputs(exercise, sets, key, context) {
  const log = store.logs[key];
  const saved = (log && log.results[exercise.id]) || [];
  const locked = Boolean(log && log.finished) && editingKey !== key;
  const row = el("div", "sets");
  const inputs = [];
  for (let index = 0; index < sets; index += 1) {
    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.min = "0";
    input.placeholder = locked ? "—" : exercise.target === undefined ? "" : String(exercise.target);
    input.disabled = locked;
    const value = saved[index];
    input.value = value === null || value === undefined ? "" : String(value);
    const prefix = context.circuit ? "Коло" : "Підхід";
    input.setAttribute("aria-label", `${exercise.name}, ${prefix.toLowerCase()} ${index + 1}${exercise.unit ? ", секунд" : ""}`);
    input.addEventListener("input", () => {
      setResult(key, exercise.id, index, input.value);
      updateButtons();
      if (context.live && typeof onSetEntered === "function") onSetEntered(input, context, context.last);
    });
    inputs.push(input);
    row.append(el("label", "set", el("span", "set-label", sets === 1 ? "Результат" : `${index + 1}`), input));
  }
  if (locked) return row;

  const fill = exercise.target === undefined ? null : el("button", "fill", "За планом");
  if (fill) {
    fill.type = "button";
    fill.addEventListener("click", () => {
      let lastFilled = null;
      inputs.forEach((input, index) => {
        if (input.value === "") {
          input.value = String(exercise.target);
          setResult(key, exercise.id, index, input.value);
          lastFilled = input;
        }
      });
      updateButtons();
      // Як і при ручному введенні: після заповнення стартує відпочинок.
      if (lastFilled && context.live && typeof onSetEntered === "function") onSetEntered(lastFilled, context, context.last);
    });
  }

  const clear = el("button", "plain", "Очистити");
  clear.type = "button";
  clear.setAttribute("aria-label", `Очистити поля: ${exercise.name}`);
  clear.addEventListener("click", () => {
    inputs.forEach((input, index) => {
      if (input.value !== "") {
        input.value = "";
        setResult(key, exercise.id, index, "");
      }
    });
    updateButtons();
  });

  function updateButtons() {
    if (fill) fill.hidden = inputs.every((input) => input.value !== "");
    clear.hidden = inputs.every((input) => input.value === "");
  }
  updateButtons();
  const stopwatchButton =
    context.live && exercise.unit && typeof renderStopwatchButton === "function"
      ? renderStopwatchButton(
          exercise,
          (seconds) => {
            const input = inputs.find((item) => item.value === "") || inputs[inputs.length - 1];
            input.value = String(seconds);
            setResult(key, exercise.id, inputs.indexOf(input), input.value);
            updateButtons();
          },
          context,
          context.last,
        )
      : null;
  return el("div", "sets-wrap", row, stopwatchButton, fill, clear);
}

function renderExercise(exercise, sets, key, context) {
  const details = context.isTest ? testDetails(exercise, context.progress) : detailsText(exercise);
  const last = context.progress.lastResults[exercise.id];
  const lastText = last && !context.isTest ? `Минулого разу: ${last.map((value) => value ?? "—").join(", ")}` : null;
  const kcal = context.isTest ? 0 : exerciseKcal(exercise, sets, null, context.circuit, bodyWeightOn(key));
  const kcalLabel = context.circuit ? "за всі кола" : "разом із відпочинком";
  return el(
    "li",
    "exercise",
    el(
      "div",
      "exercise-head",
      el("h3", "exercise-name", exercise.name),
      el("p", "exercise-target", context.isTest ? "Макс." : targetText(exercise, sets, context.circuit)),
    ),
    details ? el("p", "exercise-details", details) : null,
    kcal ? el("p", "exercise-calories", `${kcalText(kcal)} ${kcalLabel}`) : null,
    el("p", "exercise-cue", exercise.cue),
    renderHowTo(exercise.guide, exercise.name, "Як виконувати"),
    lastText ? el("p", "exercise-last", lastText) : null,
    context.canLog ? setInputs(exercise, sets, key, context) : null,
  );
}

function testDetails(exercise, progress) {
  const last = progress.lastTests[exercise.id];
  const parts = [`ціль ${valueText(exercise, exercise.goal)}`];
  if (last !== undefined) parts.push(`минулий тест ${valueText(exercise, last)}`);
  return parts.join(" · ");
}

function renderSteps(title, steps) {
  const list = el(
    "ul",
    "steps",
    ...steps.map((step) => {
      const text = typeof step === "string" ? step : step.text;
      const guide = typeof step === "string" ? null : step.guide;
      return el("li", null, renderHowTo(guide, text, text, "step-howto") || text);
    }),
  );
  return el("details", "phase", el("summary", null, title), list);
}

// Розгортуваний блок із анімацією й поясненням техніки.
function renderHowTo(key, name, title, className = "howto") {
  const guide = typeof GUIDES !== "undefined" && key ? GUIDES[key] : null;
  if (!guide) return null;
  const figure = el("div", "howto-figure");
  const body = el("div", "howto-body", figure);
  const section = (heading, items, ordered) => {
    if (!items || !items.length) return;
    body.append(el("h4", "howto-heading", heading), el(ordered ? "ol" : "ul", ordered ? "howto-steps" : "howto-list", ...items.map((item) => el("li", null, item))));
  };
  section("Як виконувати", guide.steps, true);
  section("Часті помилки", guide.mistakes, false);
  if (guide.feel) body.append(el("p", "howto-note", el("strong", null, "Де відчувати: "), guide.feel));
  if (guide.breath) body.append(el("p", "howto-note", el("strong", null, "Дихання: "), guide.breath));
  if (guide.level) body.append(el("p", "howto-note", guide.level));
  const details = el("details", className, el("summary", null, title), body);
  mountFigure(figure, details, guide, `Схема виконання: ${name}`);
  return details;
}

function hasAnyResult(key) {
  const log = store.logs[key];
  return Boolean(log && Object.values(log.results).some((values) => values.some((value) => value !== null && value !== undefined)));
}

function outcomeText(status, next, sets, circuit) {
  const target = targetText(next, sets, circuit);
  switch (status) {
    case "up":
      return `наступного разу ${target}`;
    case "levelup":
      return `далі складніше: ${next.name}${next.weight ? `, ${next.weight}` : ""}, ${target}`;
    case "top":
      return `верхня межа, ціль ${target}`;
    case "down":
      return `ціль знижено до ${target}`;
    case "deload":
      return `легкий тиждень, ціль без змін`;
    case "skipped":
      return `не виконано, ціль без змін: ${target}`;
    default:
      return `закріплюємо ціль ${target}`;
  }
}

function buildSummary(key) {
  const plan = planFor(key, store.startDate);
  const progress = computeProgress(store, key);
  const log = store.logs[key];
  const rows = [];
  plan.day.blocks.forEach((block) => {
    block.exercises.forEach((exercise) => {
      const results = log.results[exercise.id];
      if (plan.isTest) {
        const value = results && results[0];
        const shown = value === null || value === undefined ? "не виконано" : `${valueText(exercise, value)} із ${valueText(exercise, exercise.goal)}`;
        rows.push(el("li", null, el("strong", null, exercise.name), `: ${shown}`));
        return;
      }
      const current = progress.states[exercise.id];
      const { state, status } = advance(exercise, current, results, plan.deload);
      const next = resolveExercise(exercise, state);
      rows.push(el("li", null, el("strong", null, resolveExercise(exercise, current).name), `: ${outcomeText(status, next, exercise.sets, block.circuit)}`));
    });
  });
  const summary = el(
    "section",
    "summary-card",
    el("h2", "summary-title", plan.isTest ? "Результати тесту збережено" : "Тренування збережено"),
    el("p", "summary-note", plan.isTest ? "Тест не змінює цілі тренувань." : "Цілі на наступні тренування:"),
    el("ul", "summary-list", ...rows),
    el("p", "summary-calories", `Орієнтовно витрачено: ${kcalText(dayKcal(plan, progress, log, bodyWeightOn(key)), 10)}`),
    typeof renderDayRewards === "function" ? renderDayRewards(key) : null,
  );
  summary.id = "summary-card";
  return summary;
}

function refreshSummary(key) {
  const current = document.getElementById("summary-card");
  if (current) current.replaceWith(buildSummary(key));
}

function clearLog(key) {
  // Порожній запис замість видалення: так очищення переноситься й на інший пристрій під час імпорту.
  store.logs[key] = { finished: false, results: {}, updatedAt: new Date().toISOString() };
  editingKey = null;
  editSnapshot = null;
  saveStore();
  render();
}

function refreshClearDay(key) {
  const button = document.getElementById("clear-day");
  if (button) button.hidden = !hasAnyResult(key) && !(store.logs[key] && store.logs[key].finished);
}

function renderClearDay(key) {
  const wrap = el("div", "clear-day-wrap");
  const button = el("button", "plain", "Очистити день");
  button.type = "button";
  button.id = "clear-day";
  button.addEventListener("click", () => {
    const confirm = el("button", "danger", "Так, очистити");
    confirm.type = "button";
    confirm.addEventListener("click", () => clearLog(key));
    const cancel = el("button", "plain", "Скасувати");
    cancel.type = "button";
    cancel.addEventListener("click", () => wrap.replaceWith(renderClearDay(key)));
    wrap.replaceChildren(
      el("p", "notice", "Видалити всі результати цього дня? Цілі наступних тренувань буде перераховано."),
      el("div", "data-actions", confirm, cancel),
    );
  });
  wrap.append(button);
  button.hidden = !hasAnyResult(key) && !(store.logs[key] && store.logs[key].finished);
  return wrap;
}

function renderSavedActions(key) {
  const edit = el("button", "fill", "Редагувати");
  edit.type = "button";
  edit.addEventListener("click", () => {
    editSnapshot = JSON.parse(JSON.stringify(store.logs[key]));
    editingKey = key;
    render();
    document.querySelector(".block").scrollIntoView({ block: "start" });
  });
  return el("div", "data-actions", edit, renderClearDay(key));
}

function renderEditActions(key) {
  const save = el("button", "finish-button", "Зберегти зміни");
  save.type = "button";
  save.addEventListener("click", () => {
    if (!hasAnyResult(key)) {
      clearLog(key);
      return;
    }
    editingKey = null;
    editSnapshot = null;
    saveStore();
    render();
    document.getElementById("summary-card").scrollIntoView({ block: "nearest" });
  });
  const cancel = el("button", "plain", "Скасувати зміни");
  cancel.type = "button";
  cancel.addEventListener("click", () => {
    store.logs[key] = { ...editSnapshot, updatedAt: new Date().toISOString() };
    editingKey = null;
    editSnapshot = null;
    saveStore();
    render();
  });
  return el("div", "finish", save, el("div", "data-actions", cancel, renderClearDay(key)));
}

function renderFinish(key) {
  const wrap = el("div", "finish");
  const hint = el("p", "finish-hint");
  hint.setAttribute("role", "status");
  const button = el("button", "finish-button", "Завершити тренування");
  button.type = "button";
  button.addEventListener("click", () => {
    if (!hasAnyResult(key)) {
      hint.textContent = "Введіть хоча б один результат.";
      return;
    }
    if (typeof stopRest === "function") stopRest();
    store.logs[key].finished = true;
    store.logs[key].updatedAt = new Date().toISOString();
    saveStore();
    render();
    document.getElementById("summary-card").scrollIntoView({ block: "nearest" });
  });
  wrap.append(button, hint, renderClearDay(key));
  return wrap;
}

function renderCalories(plan, progress, key) {
  const title = plan.isTest ? "Калорії: залежать від результату тесту" : `Калорії за план: ${kcalText(dayKcal(plan, progress, null, bodyWeightOn(key)), 10)}`;
  return el(
    "details",
    "phase",
    el("summary", null, title),
    el(
      "p",
      "calories-note",
      `Це груба оцінка для ваги ${formatDecimal(bodyWeightOn(key))} кг${hasBodyWeight() ? "" : " (додайте свій замір у розділі «Тіло» в меню)"}, а реальна витрата може відрізнятися на третину й більше. У неї входять розминка, розтяжка, відпочинок і базовий обмін, тому число завжди більше за «чисті» витрати на вправи. Не варто точно підганяти під нього харчування.`,
    ),
  );
}

function renderTraining(key, plan) {
  const progress = computeProgress(store, key);
  const canLog = key <= todayKey;
  const main = document.createDocumentFragment();

  const makeup = renderMakeupNotice(key);
  if (makeup) main.append(makeup);
  if (plan.deload) main.append(el("p", "notice", "Легкий тиждень: підходів на третину менше, а цілі не змінюються."));
  if (progress.breakApplied) main.append(el("p", "notice", "Після перерви понад 7 днів цілі знижено приблизно на 15%."));
  main.append(renderCalories(plan, progress, key));
  main.append(renderSteps("Розминка · 10 хв", plan.day.warmup));

  plan.day.blocks.forEach((block) => {
    const sets = block.circuit ? plannedSets(block.exercises[0], plan.deload) : null;
    const section = el("section", "block", el("h2", "block-title", block.circuit ? `${sets} кола` : block.title));
    section.append(el("p", "block-note", block.note || REST_NOTE));
    const context = { circuit: Boolean(block.circuit), isTest: plan.isTest, canLog, progress, live: isLiveSession(key) };
    const items = block.exercises.map((exercise, index) => {
      const resolved = plan.isTest ? { ...exercise } : resolveExercise(exercise, progress.states[exercise.id]);
      return renderExercise(resolved, plannedSets(exercise, plan.deload), key, { ...context, last: index === block.exercises.length - 1, rest: resolved.rest });
    });
    section.append(el("ul", "exercises", ...items));
    main.append(section);
  });

  main.append(renderSteps("Розтяжка · 10 хв", plan.day.cooldown));
  const log = store.logs[key];
  if (!canLog) {
    main.append(el("p", "block-note", "Запис результатів відкриється в день тренування."));
  } else if (log && log.finished && editingKey === key) {
    main.append(el("p", "notice", "Зміни зберігаються одразу й впливають на цілі наступних тренувань."));
    main.append(buildSummary(key));
    main.append(renderEditActions(key));
  } else if (log && log.finished) {
    main.append(buildSummary(key));
    main.append(renderSavedActions(key));
  } else {
    if (!plan.isTest) main.append(el("p", "block-note", "Для вправ на кожну руку чи ногу вводьте результат слабшої сторони. Порожнє поле в розпочатій вправі вважається невиконаним підходом."));
    main.append(renderFinish(key));
  }
  return main;
}

function renderRecovery(index) {
  return renderRecoveryDay(toKey(dateForIndex(index)), index);
}

function renderWeek() {
  const week = document.getElementById("week");
  week.replaceChildren();
  WEEKDAYS_SHORT.forEach((label, index) => {
    const key = toKey(dateForIndex(index));
    const plan = planFor(key, store.startDate);
    const finished = Boolean(store.logs[key] && store.logs[key].finished);
    const mark = finished ? " is-done" : plan.day ? " is-training" : "";
    const button = el(
      "button",
      `day${index === selectedIndex ? " is-selected" : ""}${key === todayKey ? " is-today" : ""}`,
      el("span", "day-name", label),
      el("span", "day-date", String(dateForIndex(index).getDate())),
      el("span", `day-mark${mark}`),
    );
    button.type = "button";
    button.setAttribute("aria-pressed", String(index === selectedIndex));
    const state = finished ? ", виконано" : "";
    button.setAttribute("aria-label", `${dateLabel(index)}: ${plan.day ? plan.day.title : RECOVERY.title}${state}`);
    button.addEventListener("click", () => {
      selectedIndex = index;
      render();
    });
    week.append(button);
  });
}

function weekRangeLabel() {
  const first = dateForIndex(0);
  const last = dateForIndex(6);
  const lastText = last.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
  if (first.getMonth() === last.getMonth()) return `${first.getDate()}–${lastText}`;
  return `${first.toLocaleDateString("uk-UA", { day: "numeric", month: "long" })} – ${lastText}`;
}

function renderWeekNav() {
  const previous = el("button", "week-arrow", "‹");
  previous.type = "button";
  previous.setAttribute("aria-label", "Попередній тиждень");
  previous.disabled = !store.startDate || toKey(dateForIndex(0)) <= mondayKey(store.startDate);
  previous.addEventListener("click", () => {
    weekOffset -= 1;
    render();
  });
  const next = el("button", "week-arrow", "›");
  next.type = "button";
  next.setAttribute("aria-label", "Наступний тиждень");
  next.disabled = weekOffset >= MAX_WEEKS_AHEAD;
  next.addEventListener("click", () => {
    weekOffset += 1;
    render();
  });
  document.getElementById("week-nav").replaceChildren(previous, el("p", "week-range", weekRangeLabel()), next);
}

function render() {
  if (currentView !== "today") {
    renderView();
    return;
  }
  renderWeekNav();
  renderWeek();
  const key = toKey(dateForIndex(selectedIndex));
  if (editingKey && editingKey !== key) {
    editingKey = null;
    editSnapshot = null;
  }
  const plan = planFor(key, store.startDate);
  const isToday = key === todayKey;

  const weekLabel = `Тиждень ${plan.week} із ${CYCLE_WEEKS}`;
  document.getElementById("eyebrow").textContent = `${isToday ? `Сьогодні · ${dateLabel(selectedIndex)}` : dateLabel(selectedIndex)} · ${weekLabel}`;
  document.getElementById("title").textContent = plan.day ? plan.day.title : RECOVERY.title;
  document.getElementById("summary").textContent = plan.day ? "Близько години: розминка, основна частина й розтяжка." : "Без вправ або з легкою зарядкою.";
  document.getElementById("back-today").hidden = isToday;
  document.getElementById("storage-warning").hidden = !storageFailed;

  if (typeof cancelStopwatch === "function") cancelStopwatch();
  const content = document.getElementById("content");
  content.replaceChildren(plan.day ? renderTraining(key, plan) : renderRecovery(selectedIndex));
  const log = store.logs[key];
  if (typeof setTrainingAwake === "function") setTrainingAwake(Boolean(plan.day) && isLiveSession(key) && hasAnyResult(key) && !(log && log.finished));
  renderView();
}

document.getElementById("back-today").addEventListener("click", () => {
  selectedIndex = todayIndex;
  weekOffset = 0;
  render();
});

render();
