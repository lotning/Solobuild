// Таймер відпочинку між підходами, секундомір для вправ на час і утримання екрана ввімкненим.
// Таймер стартує сам, коли під час тренування вписано результат підходу.

const REST_START_DELAY_MS = 1500;
const STOPWATCH_LEAD_IN_SECONDS = 5;
const REST_DONE_VISIBLE_MS = 6000;

let restTimer = null;
let restTick = null;
let restHideTimer = null;
let stopwatch = null;
let audioContext = null;
let wakeLock = null;
let trainingAwake = false;

function formatClock(seconds) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

// Звук можна ввімкнути лише після дії користувача, тому готуємо його заздалегідь.
function prepareAudio() {
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
  } catch (error) {
    audioContext = null;
  }
}

function beep(times = 1, frequency = 880) {
  if (audioContext) {
    try {
      for (let index = 0; index < times; index += 1) {
        const start = audioContext.currentTime + index * 0.25;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.2);
      }
    } catch (error) {
      // Без звуку лишається вібрація й текст.
    }
  }
  if (navigator.vibrate) navigator.vibrate(times > 1 ? [200, 100, 200] : 150);
}

// Екран не гасне, поки йде тренування або працює таймер.
async function updateWakeLock() {
  const want = trainingAwake || Boolean(restTimer) || Boolean(stopwatch);
  if (want && !wakeLock && "wakeLock" in navigator && document.visibilityState === "visible") {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    } catch (error) {
      wakeLock = null;
    }
  } else if (!want && wakeLock) {
    const lock = wakeLock;
    wakeLock = null;
    lock.release().catch(() => {});
  }
}

function setTrainingAwake(active) {
  trainingAwake = active;
  updateWakeLock();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    updateWakeLock();
    renderRestBar();
  }
});

function restBar() {
  let bar = document.getElementById("rest-timer");
  if (!bar) {
    bar = el("div", "rest-timer");
    bar.id = "rest-timer";
    bar.hidden = true;
    document.body.append(bar);
  }
  return bar;
}

function startRest(seconds, label) {
  clearTimeout(restHideTimer);
  restTimer = { end: Date.now() + seconds * 1000, total: seconds, label, done: false };
  clearInterval(restTick);
  restTick = setInterval(renderRestBar, 250);
  renderRestBar();
  updateWakeLock();
}

function stopRest() {
  clearInterval(restTick);
  clearTimeout(restHideTimer);
  restTick = null;
  restTimer = null;
  restBar().hidden = true;
  document.body.classList.remove("has-rest-timer");
  updateWakeLock();
}

function renderRestBar() {
  const bar = restBar();
  if (!restTimer) return;
  const left = (restTimer.end - Date.now()) / 1000;
  if (left <= 0 && !restTimer.done) {
    restTimer.done = true;
    clearInterval(restTick);
    restTick = null;
    beep(2);
    restHideTimer = setTimeout(stopRest, REST_DONE_VISIBLE_MS);
  }

  const add = el("button", "rest-button", "+30 с");
  add.type = "button";
  add.addEventListener("click", () => {
    const base = restTimer.done ? Date.now() : restTimer.end;
    startRest(Math.ceil((base - Date.now()) / 1000) + 30, restTimer.label);
  });
  const close = el("button", "rest-button", restTimer.done ? "Закрити" : "Пропустити");
  close.type = "button";
  close.addEventListener("click", stopRest);

  const progress = el("span", "rest-progress", el("span", "rest-progress-fill"));
  progress.firstChild.style.width = `${Math.min(100, Math.max(0, (1 - left / restTimer.total) * 100))}%`;
  const text = restTimer.done
    ? el("span", "rest-text", el("strong", "rest-clock", "Час!"), el("span", "rest-label", "Можна починати наступний підхід"))
    : el("span", "rest-text", el("strong", "rest-clock", formatClock(left)), el("span", "rest-label", restTimer.label));
  bar.classList.toggle("is-done", restTimer.done);
  bar.setAttribute("role", restTimer.done ? "alert" : "timer");
  bar.setAttribute("aria-label", "Таймер відпочинку");
  bar.replaceChildren(el("div", "rest-row", text, add, close), progress);
  bar.hidden = false;
  document.body.classList.add("has-rest-timer");
}

// Скільки відпочивати після внесеного підходу, або null, якщо таймер тут не потрібен.
function restAfter(context, exerciseIsLast) {
  if (context.isTest) return { seconds: TEST_REST_SECONDS, label: "Відпочинок перед наступною вправою" };
  if (context.circuit) return exerciseIsLast ? { seconds: ROUND_REST_SECONDS, label: "Відпочинок між колами" } : null;
  return { seconds: context.rest || SET_REST_SECONDS, label: "Відпочинок між підходами" };
}

const pendingRest = new WeakMap();

// Викликається з поля підходу: після короткої паузи у введенні стартує відпочинок.
function onSetEntered(input, context, exerciseIsLast) {
  prepareAudio();
  clearTimeout(pendingRest.get(input));
  if (input.value === "" || stopwatch) return;
  const rest = restAfter(context, exerciseIsLast);
  if (!rest) return;
  pendingRest.set(
    input,
    setTimeout(() => startRest(rest.seconds, rest.label), REST_START_DELAY_MS),
  );
}

function cancelStopwatch() {
  if (!stopwatch) return;
  clearInterval(stopwatch.tick);
  const { wrap, restore } = stopwatch;
  stopwatch = null;
  wrap.replaceWith(restore());
  updateWakeLock();
}

// Кнопка секундоміра для вправ на час: 5 с на підготовку, потім відлік, «Стоп» вписує результат.
function renderStopwatchButton(exercise, onDone, context, exerciseIsLast) {
  const button = el("button", "plain", "Секундомір");
  button.type = "button";
  button.setAttribute("aria-label", `Секундомір: ${exercise.name}`);
  button.addEventListener("click", () => {
    prepareAudio();
    cancelStopwatch();
    stopRest();
    const clock = el("strong", "stopwatch-clock", formatClock(STOPWATCH_LEAD_IN_SECONDS));
    const note = el("span", "stopwatch-note", "Займіть положення");
    const stop = el("button", "fill", "Стоп");
    stop.type = "button";
    const cancel = el("button", "plain", "Скасувати");
    cancel.type = "button";
    const wrap = el("div", "stopwatch", el("div", "stopwatch-time", clock, note), el("div", "data-actions", stop, cancel));
    wrap.setAttribute("role", "timer");
    const startedAt = Date.now() + STOPWATCH_LEAD_IN_SECONDS * 1000;
    let lastLead = STOPWATCH_LEAD_IN_SECONDS;
    let targetReached = false;

    const update = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed < 0) {
        const lead = Math.ceil(-elapsed);
        clock.textContent = formatClock(lead);
        if (lead !== lastLead) {
          lastLead = lead;
          if (lead <= 3) beep(1, 660);
        }
        return;
      }
      if (lastLead > 0) {
        lastLead = 0;
        beep(1, 990);
      }
      clock.textContent = formatClock(elapsed);
      const target = exercise.target;
      note.textContent = target ? `ціль ${formatClock(target)}` : "";
      if (target && !targetReached && elapsed >= target) {
        targetReached = true;
        note.textContent = "ціль досягнуто — тримайте, скільки можете";
        beep(2);
      }
    };

    stop.addEventListener("click", () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      cancelStopwatch();
      if (elapsed > 0) {
        onDone(elapsed);
        const rest = restAfter(context, exerciseIsLast);
        if (rest) startRest(rest.seconds, rest.label);
      }
    });
    cancel.addEventListener("click", cancelStopwatch);

    stopwatch = {
      wrap,
      tick: setInterval(update, 200),
      restore: () => renderStopwatchButton(exercise, onDone, context, exerciseIsLast),
    };
    button.replaceWith(wrap);
    update();
    updateWakeLock();
  });
  return button;
}
