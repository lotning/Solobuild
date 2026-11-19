// Панель «Прогрес і тіло»: графіки вправ, тестів і замірів тіла.
// Графіки — прості SVG-лінії без бібліотек, малюються під ширину екрана.

const SVG_NS = "http://www.w3.org/2000/svg";
const CHART_HEIGHT = 190;
const CHART_MARGIN = { top: 16, right: 16, bottom: 26, left: 40 };
const DOTS_LIMIT = 40;

const progressView = { open: false, tab: "exercises", exercise: null, metric: "weight", message: null };

function svgEl(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, String(value)));
  node.append(...children.filter(Boolean));
  return node;
}

function shortDate(key) {
  return parseKey(key).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

function niceStep(range, count) {
  const raw = range / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
}

function chartValue(value, unit, digits) {
  const number = digits ? formatDecimal(value, digits) : String(Math.round(value));
  return unit ? `${number} ${unit}` : number;
}

// points: [{ key, value, note }]; zero — шкала від нуля (для повторень), інакше підлаштовується під дані.
function lineChart({ points, unit = "", digits = 0, zero = true, goal = null, markers = [], label, valueLabel = "Значення" }) {
  const wrap = el("div", "chart");
  const tooltip = el("div", "chart-tooltip");
  tooltip.hidden = true;
  const canvas = el("div", "chart-canvas");
  wrap.append(canvas, tooltip);

  const values = points.map((point) => point.value).concat(goal === null ? [] : [goal]);
  let min = zero ? 0 : Math.min(...values);
  let max = Math.max(...values);
  if (!zero) {
    const pad = Math.max((max - min) * 0.15, digits ? 0.5 : 1);
    min -= pad;
    max += pad;
  } else {
    max = max * 1.1 || 1;
  }
  const step = niceStep(max - min || 1, 4);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  const span = Math.max(1, daysBetween(points[0].key, points[points.length - 1].key));

  wrap.draw = () => {
    const width = Math.max(260, canvas.clientWidth || 320);
    const plotWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
    const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
    const x = (key) => CHART_MARGIN.left + (points.length === 1 ? plotWidth / 2 : (daysBetween(points[0].key, key) / span) * plotWidth);
    const y = (value) => CHART_MARGIN.top + (1 - (value - min) / (max - min || 1)) * plotHeight;

    const svg = svgEl("svg", { width, height: CHART_HEIGHT, viewBox: `0 0 ${width} ${CHART_HEIGHT}`, role: "img", "aria-label": label });
    for (let tick = min; tick <= max + step / 2; tick += step) {
      svg.append(
        svgEl("line", { x1: CHART_MARGIN.left, x2: width - CHART_MARGIN.right, y1: y(tick), y2: y(tick), class: "chart-grid" }),
        svgEl("text", { x: CHART_MARGIN.left - 6, y: y(tick) + 4, class: "chart-axis", "text-anchor": "end" }, document.createTextNode(digits && step < 1 ? formatDecimal(tick, digits) : String(Math.round(tick)))),
      );
    }
    const first = points[0];
    const last = points[points.length - 1];
    svg.append(svgEl("text", { x: x(first.key), y: CHART_HEIGHT - 6, class: "chart-axis", "text-anchor": points.length === 1 ? "middle" : "start" }, document.createTextNode(shortDate(first.key))));
    if (points.length > 1) svg.append(svgEl("text", { x: x(last.key), y: CHART_HEIGHT - 6, class: "chart-axis", "text-anchor": "end" }, document.createTextNode(shortDate(last.key))));

    markers.forEach((key) => svg.append(svgEl("line", { x1: x(key), x2: x(key), y1: CHART_MARGIN.top, y2: CHART_MARGIN.top + plotHeight, class: "chart-marker" })));
    if (goal !== null) {
      svg.append(
        svgEl("line", { x1: CHART_MARGIN.left, x2: width - CHART_MARGIN.right, y1: y(goal), y2: y(goal), class: "chart-goal" }),
        svgEl("text", { x: width - CHART_MARGIN.right, y: y(goal) - 5, class: "chart-axis", "text-anchor": "end" }, document.createTextNode(`ціль ${chartValue(goal, unit, digits)}`)),
      );
    }

    if (points.length > 1) {
      const path = points.map((point, index) => `${index ? "L" : "M"}${x(point.key).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
      svg.append(svgEl("path", { d: path, class: "chart-line" }));
    }
    const dots = points.length > DOTS_LIMIT ? [last] : points;
    dots.forEach((point) => svg.append(svgEl("circle", { cx: x(point.key), cy: y(point.value), r: 4, class: "chart-dot" })));
    const lastX = x(last.key);
    const labelAnchor = lastX > width - 60 ? "end" : "start";
    svg.append(svgEl("text", { x: labelAnchor === "end" ? lastX - 8 : lastX + 8, y: y(last.value) - 8, class: "chart-label", "text-anchor": labelAnchor }, document.createTextNode(chartValue(last.value, unit, digits))));

    const crosshair = svgEl("line", { y1: CHART_MARGIN.top, y2: CHART_MARGIN.top + plotHeight, class: "chart-crosshair", visibility: "hidden" });
    const focus = svgEl("circle", { r: 5, class: "chart-focus", visibility: "hidden" });
    const hit = svgEl("rect", { x: CHART_MARGIN.left - 10, y: 0, width: plotWidth + 20, height: CHART_HEIGHT, class: "chart-hit" });
    svg.append(crosshair, focus, hit);

    const show = (event) => {
      const box = svg.getBoundingClientRect();
      const pointerX = event.clientX - box.left;
      const nearest = points.reduce((best, point) => (Math.abs(x(point.key) - pointerX) < Math.abs(x(best.key) - pointerX) ? point : best), points[0]);
      const px = x(nearest.key);
      const py = y(nearest.value);
      crosshair.setAttribute("x1", px);
      crosshair.setAttribute("x2", px);
      crosshair.setAttribute("visibility", "visible");
      focus.setAttribute("cx", px);
      focus.setAttribute("cy", py);
      focus.setAttribute("visibility", "visible");
      tooltip.replaceChildren(el("strong", null, chartValue(nearest.value, unit, digits)), el("span", null, formatDay(nearest.key)), nearest.note ? el("span", null, nearest.note) : null);
      tooltip.hidden = false;
      const left = Math.min(Math.max(px - tooltip.offsetWidth / 2, 0), width - tooltip.offsetWidth);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(0, py - tooltip.offsetHeight - 12)}px`;
    };
    const hide = () => {
      crosshair.setAttribute("visibility", "hidden");
      focus.setAttribute("visibility", "hidden");
      tooltip.hidden = true;
    };
    hit.addEventListener("pointermove", show);
    hit.addEventListener("pointerdown", show);
    hit.addEventListener("pointerleave", hide);
    canvas.replaceChildren(svg);
  };

  const table = el(
    "details",
    "reward-details",
    el("summary", null, "Таблиця"),
    el(
      "table",
      "chart-table",
      el("thead", null, el("tr", null, el("th", null, "Дата"), el("th", null, valueLabel), el("th", null, ""))),
      el("tbody", null, ...points.slice().reverse().map((point) => el("tr", null, el("td", null, formatDay(point.key)), el("td", null, chartValue(point.value, unit, digits)), el("td", null, point.note || "")))),
    ),
  );
  return el("div", "chart-block", wrap, table);
}

function drawCharts(root) {
  root.querySelectorAll(".chart").forEach((chart) => chart.draw && chart.draw());
}

let chartResizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(chartResizeTimer);
  chartResizeTimer = setTimeout(() => {
    const panel = document.getElementById("progress-panel");
    if (panel) drawCharts(panel);
  }, 150);
});

function exerciseOptions(history) {
  const groups = [];
  const listed = new Set();
  Object.entries(TRAINING_DAYS).forEach(([index, day]) => {
    const options = day.blocks.flatMap((block) => block.exercises).filter((exercise) => history[exercise.id] && !listed.has(exercise.id) && listed.add(exercise.id));
    if (options.length) groups.push({ label: `${WEEKDAYS_SHORT[index]} · ${day.title}`, ids: options.map((exercise) => exercise.id) });
  });
  const older = Object.keys(history).filter((id) => !listed.has(id) && !id.startsWith("test_"));
  if (older.length) groups.push({ label: "Вправи з минулих розкладів", ids: older });
  return groups;
}

function renderExerciseTab(game) {
  const groups = exerciseOptions(game.history);
  if (!groups.length) return el("p", "block-note", "Графіки з'являться після першого завершеного тренування.");
  const ids = groups.flatMap((group) => group.ids);
  if (!ids.includes(progressView.exercise)) progressView.exercise = ids[0];
  const history = game.history[progressView.exercise];
  const latest = history[history.length - 1];

  const select = document.createElement("select");
  select.className = "token-input";
  groups.forEach((group) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;
    group.ids.forEach((id) => {
      const entries = game.history[id];
      const option = document.createElement("option");
      option.value = id;
      option.textContent = entries[entries.length - 1].name;
      option.selected = id === progressView.exercise;
      optgroup.append(option);
    });
    select.append(optgroup);
  });
  select.addEventListener("change", () => {
    progressView.exercise = select.value;
    renderProgressPanel();
  });

  const markers = history.filter((point, index) => index > 0 && point.level !== history[index - 1].level).map((point) => point.key);
  const unit = latest.unit || "";
  const best = Math.max(...history.filter((point) => point.level === latest.level).map((point) => point.value));
  const facts = [`Найкращий підхід на поточному варіанті: ${chartValue(best, unit, 0)}`, `тренувань із цією вправою: ${history.length}`];
  return el(
    "div",
    "progress-tab",
    el("label", "token-label", el("span", "set-label", "Вправа"), select),
    el("p", "block-note", `${facts.join(" · ")}. Значення — найкращий підхід за тренування.`),
    lineChart({
      points: history.map((point) => ({ key: point.key, value: point.value, note: `${point.name}${point.weight ? `, ${point.weight}` : ""}` })),
      unit,
      label: `Найкращий підхід: ${latest.name}`,
      valueLabel: unit ? "Секунди" : "Повторення",
    }),
    markers.length ? el("p", "block-note", "Пунктир — перехід на складніший варіант: значення до й після не варто порівнювати напряму.") : null,
  );
}

function renderTestsTab(game) {
  const tests = TEST_DAY.blocks.flatMap((block) => block.exercises);
  if (!tests.some((exercise) => game.history[exercise.id])) {
    return el("p", "block-note", "Тест на максимум — у четвер 4-го тижня кожного циклу. Після першого тесту тут з'являться графіки.");
  }
  return el(
    "div",
    "progress-tab",
    ...tests.map((exercise) => {
      const history = game.history[exercise.id];
      const title = el("h3", "howto-heading", exercise.name);
      if (!history) return el("div", null, title, el("p", "block-note", "Ще немає результатів."));
      return el(
        "div",
        null,
        title,
        lineChart({ points: history.map((point) => ({ key: point.key, value: point.value })), unit: exercise.unit || "", goal: exercise.goal, label: `Тест: ${exercise.name}`, valueLabel: "Результат" }),
      );
    }),
  );
}

function renderBodyTab() {
  const entries = bodyEntries();
  // Заміри впливають і на калорії та білок на головному екрані, тому перемальовуємо все.
  const rerender = (message) => {
    progressView.message = message;
    render();
  };
  const parts = [];
  if (entries.length) {
    parts.push(renderBodyStats(entries));
    const metrics = [
      { id: "weight", name: "Вага", unit: "кг", value: (entry) => entry.weight },
      { id: "fat", name: "Жир", unit: "%", value: (entry) => entry.fat },
      { id: "water", name: "Вода", unit: "%", value: (entry) => entry.water },
      { id: "lean", name: "Без жиру", unit: "кг", value: leanMass },
    ].filter((metric) => entries.some((entry) => typeof metric.value(entry) === "number"));
    if (!metrics.some((metric) => metric.id === progressView.metric)) progressView.metric = metrics[0].id;
    const metric = metrics.find((item) => item.id === progressView.metric);
    const switcher = el(
      "div",
      "segmented",
      ...metrics.map((item) => {
        const button = el("button", `segment${item.id === metric.id ? " is-active" : ""}`, item.name);
        button.type = "button";
        button.setAttribute("aria-pressed", String(item.id === metric.id));
        button.addEventListener("click", () => {
          progressView.metric = item.id;
          renderProgressPanel();
        });
        return button;
      }),
    );
    const points = entries.filter((entry) => typeof metric.value(entry) === "number").map((entry) => ({ key: entry.key, value: metric.value(entry) }));
    parts.push(switcher, lineChart({ points, unit: metric.unit, digits: 1, zero: false, label: `${metric.name} за датами`, valueLabel: metric.name }));
    parts.push(el("p", "block-note", "Маса без жиру — вага мінус жир. Якщо вага падає, а вона тримається, ви втрачаєте саме жир, а не м'язи."));
  } else {
    parts.push(el("p", "block-note", "Вписуйте показники з розумних ваг — вага піде в розрахунок калорій і норми білка, а тут з'являться графіки. Зважуйтеся зранку до їжі й води, щоразу в однакових умовах."));
  }
  parts.push(el("h3", "howto-heading", "Новий замір"), renderBodyForm(rerender));
  if (entries.length) parts.push(renderBodyList(entries, rerender));
  if (progressView.message) {
    const status = el("p", "data-status", progressView.message);
    status.setAttribute("role", "status");
    parts.push(status);
    progressView.message = null;
  }
  return el("div", "progress-tab", ...parts);
}

const PROGRESS_TABS = [
  { id: "exercises", name: "Вправи" },
  { id: "tests", name: "Тести" },
  { id: "body", name: "Тіло" },
];

function renderProgressPanel() {
  const panel = document.getElementById("progress-panel");
  if (!panel) return;
  // Не перемальовуємо, поки людина вписує замір.
  if (document.activeElement && panel.contains(document.activeElement) && document.activeElement.matches("input")) return;

  const body = el("div", "data-body");
  if (progressView.open) {
    const tabs = el(
      "div",
      "segmented",
      ...PROGRESS_TABS.map((tab) => {
        const button = el("button", `segment${tab.id === progressView.tab ? " is-active" : ""}`, tab.name);
        button.type = "button";
        button.setAttribute("aria-pressed", String(tab.id === progressView.tab));
        button.addEventListener("click", () => {
          progressView.tab = tab.id;
          renderProgressPanel();
        });
        return button;
      }),
    );
    const game = progressView.tab === "body" ? null : computeGame(store);
    const content = progressView.tab === "exercises" ? renderExerciseTab(game) : progressView.tab === "tests" ? renderTestsTab(game) : renderBodyTab();
    body.append(tabs, content);
  }
  const details = el("details", "phase", el("summary", null, "Прогрес і тіло"), body);
  details.open = progressView.open;
  details.addEventListener("toggle", () => {
    if (details.open === progressView.open) return;
    progressView.open = details.open;
    renderProgressPanel();
  });
  panel.replaceChildren(details);
  if (progressView.open) requestAnimationFrame(() => drawCharts(panel));
}
