// Вимірювання тіла з розумних ваг: вага, відсоток жиру й води.
// Зберігаються в store.body за датою. Видалений замір лишається позначкою deleted,
// щоб видалення переносилося на інші пристрої під час синхронізації.

const DEFAULT_BODY_WEIGHT_KG = 90;
const WEIGH_IN_REMINDER_DAYS = 7;
const BODY_METRICS = {
  weight: { name: "Вага", unit: "кг", min: 30, max: 300 },
  fat: { name: "Жир", unit: "%", min: 3, max: 70 },
  water: { name: "Вода", unit: "%", min: 30, max: 80 },
};

function bodyEntries() {
  return Object.keys(store.body || {})
    .sort()
    .filter((key) => !store.body[key].deleted)
    .map((key) => ({ key, ...store.body[key] }));
}

// Вага, що діяла на дату: останній замір до неї, а якщо таких немає — найперший.
function bodyWeightOn(key) {
  const entries = bodyEntries().filter((entry) => typeof entry.weight === "number");
  if (!entries.length) return DEFAULT_BODY_WEIGHT_KG;
  const before = entries.filter((entry) => entry.key <= key);
  return (before.length ? before[before.length - 1] : entries[0]).weight;
}

function hasBodyWeight() {
  return bodyEntries().some((entry) => typeof entry.weight === "number");
}

function formatDecimal(value, digits = 1) {
  return value.toLocaleString("uk-UA", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function parseDecimal(raw) {
  const value = parseFloat(String(raw).replace(",", ".").trim());
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function leanMass(entry) {
  return typeof entry.weight === "number" && typeof entry.fat === "number" ? entry.weight * (1 - entry.fat / 100) : null;
}

function saveMeasurement(key, values) {
  if (!store.body) store.body = {};
  store.body[key] = { ...values, updatedAt: new Date().toISOString() };
  saveStore();
}

function deleteMeasurement(key) {
  store.body[key] = { deleted: true, updatedAt: new Date().toISOString() };
  saveStore();
}

function daysSinceWeighIn(key) {
  const entries = bodyEntries().filter((entry) => entry.key <= key);
  return entries.length ? daysBetween(entries[entries.length - 1].key, key) : null;
}

// Порада для дня відновлення, якщо давно не зважувалися.
function weighInAdvice(key) {
  const days = daysSinceWeighIn(key);
  const how = "Найточніше зранку після туалету, до їжі й води, щоразу в однакових умовах: відсоток жиру й води на розумних вагах помітно залежить від того, скільки ви випили.";
  if (days === null) return { name: "Зважування", text: `Додайте вагу, жир і воду в розділі «Прогрес і тіло» внизу сторінки — тоді калорії й норма білка рахуватимуться саме під вас. ${how}` };
  if (days >= WEIGH_IN_REMINDER_DAYS) return { name: "Зважування", text: `Останній замір був ${days} ${dayWord(days)} тому. ${how}` };
  return null;
}

function proteinText(key) {
  const weight = bodyWeightOn(key);
  const round5 = (value) => Math.round(value / 5) * 5;
  const source = hasBodyWeight() ? "за останнім зважуванням" : "орієнтовна вага, поки немає замірів";
  return `Приблизно ${round5(weight * 1.6)}–${round5(weight * 2.2)} г на день: 1,6–2,2 г на кг при вазі ${formatDecimal(weight)} кг (${source}).`;
}

function changeText(entries, metric, digits) {
  const latest = entries[entries.length - 1];
  const value = metric === "lean" ? leanMass(latest) : latest[metric];
  if (value === null || value === undefined) return null;
  const monthAgo = shiftKey(latest.key, -30);
  const base = entries.filter((entry) => entry.key <= monthAgo).pop() || entries[0];
  if (base === latest) return null;
  const baseValue = metric === "lean" ? leanMass(base) : base[metric];
  if (baseValue === null || baseValue === undefined) return null;
  const diff = Math.round((value - baseValue) * 10) / 10;
  if (diff === 0) return `без змін від ${formatDay(base.key)}`;
  const sign = diff > 0 ? "+" : "−";
  return `${sign}${formatDecimal(Math.abs(diff), digits)} від ${formatDay(base.key)}`;
}

function renderBodyStats(entries) {
  const latest = entries[entries.length - 1];
  const tile = (label, value, unit, metric, extra) =>
    value === null || value === undefined
      ? null
      : el(
          "div",
          "stat",
          el("span", "stat-label", label),
          el("span", "stat-value", `${formatDecimal(value)} ${unit}`),
          extra ? el("span", "stat-note", extra) : null,
          el("span", "stat-note", changeText(entries, metric, 1) || " "),
        );
  const lean = leanMass(latest);
  return el(
    "div",
    "stats",
    tile("Вага", latest.weight, "кг", "weight"),
    tile("Жир", latest.fat, "%", "fat", lean !== null ? `${formatDecimal(latest.weight - lean)} кг жиру` : null),
    tile("Вода", latest.water, "%", "water"),
    tile("Без жиру", lean, "кг", "lean", "м'язи, кістки, вода"),
  );
}

function renderBodyForm(onSaved) {
  const form = el("form", "body-form");
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.className = "token-input";
  dateInput.value = todayKey;
  dateInput.max = todayKey;
  dateInput.required = true;
  const inputs = {};
  const fields = Object.entries(BODY_METRICS).map(([metric, info]) => {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.className = "token-input";
    input.placeholder = info.unit;
    inputs[metric] = input;
    return el("label", "token-label", el("span", "set-label", `${info.name}, ${info.unit}`), input);
  });
  const status = el("p", "data-status");
  status.setAttribute("role", "status");
  const save = el("button", "fill", "Зберегти замір");
  save.type = "submit";

  const fillFromDate = () => {
    const saved = store.body && store.body[dateInput.value];
    const existing = saved && !saved.deleted ? saved : null;
    Object.keys(BODY_METRICS).forEach((metric) => {
      inputs[metric].value = existing && typeof existing[metric] === "number" ? formatDecimal(existing[metric]) : "";
    });
    save.textContent = existing ? "Оновити замір" : "Зберегти замір";
  };
  dateInput.addEventListener("change", fillFromDate);
  fillFromDate();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const key = dateInput.value;
    if (!DATE_PATTERN.test(key) || key > todayKey) {
      status.textContent = "Виберіть дату не пізніше за сьогодні.";
      return;
    }
    const values = {};
    for (const [metric, info] of Object.entries(BODY_METRICS)) {
      const raw = inputs[metric].value;
      if (raw.trim() === "") continue;
      const value = parseDecimal(raw);
      if (value === null || value < info.min || value > info.max) {
        status.textContent = `${info.name}: введіть число від ${info.min} до ${info.max} ${info.unit}.`;
        return;
      }
      values[metric] = value;
    }
    if (!Object.keys(values).length) {
      status.textContent = "Введіть хоча б одне значення.";
      return;
    }
    saveMeasurement(key, values);
    onSaved(`Замір за ${formatDay(key)} збережено.`);
  });

  form.append(el("label", "token-label", el("span", "set-label", "Дата"), dateInput), el("div", "body-fields", ...fields), el("div", "data-actions", save), status);
  return form;
}

function renderBodyList(entries, onChanged) {
  const recent = entries.slice(-8).reverse();
  return el(
    "details",
    "reward-details",
    el("summary", null, `Усі заміри (${entries.length})`),
    el(
      "ul",
      "body-list",
      ...recent.map((entry) => {
        const parts = Object.entries(BODY_METRICS)
          .filter(([metric]) => typeof entry[metric] === "number")
          .map(([metric, info]) => `${formatDecimal(entry[metric])} ${info.unit}`);
        const remove = el("button", "plain", "Видалити");
        remove.type = "button";
        remove.setAttribute("aria-label", `Видалити замір за ${formatDay(entry.key)}`);
        remove.addEventListener("click", () => {
          deleteMeasurement(entry.key);
          onChanged(`Замір за ${formatDay(entry.key)} видалено.`);
        });
        return el("li", null, el("span", null, el("strong", null, formatDay(entry.key)), ` · ${parts.join(" · ")}`), remove);
      }),
      entries.length > recent.length ? el("li", "block-note", `Показано останні ${recent.length}. Усі заміри є на графіку.`) : null,
    ),
  );
}
