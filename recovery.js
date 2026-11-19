// День відновлення з урахуванням того, які м'язи й коли навантажувалися.
// Рахуємо від завершених тренувань, а для майбутніх дат — ще й від запланованих (якщо пройдуть за планом).
// Тривалість відновлення орієнтовна: 48–72 год для великих груп після важкої роботи, менше для пресу.

const MUSCLE_GROUPS = {
  legs: { name: "Ноги й сідниці", hours: 72, stretch: "lower" },
  back: { name: "Спина", hours: 72, stretch: "pull" },
  chest: { name: "Груди", hours: 60, stretch: "upper" },
  shoulders: { name: "Плечі", hours: 48, stretch: "upper" },
  triceps: { name: "Трицепс", hours: 48, stretch: "upper" },
  biceps: { name: "Біцепс і передпліччя", hours: 48, stretch: "pull" },
  core: { name: "Прес і корпус", hours: 36, stretch: null },
};
const RECOVERY_LOOKBACK_DAYS = 14;
const DELOAD_INTENSITY = 0.7;
const BREAK_WARNING_DAYS = 4;

function shiftKey(key, days) {
  const date = parseKey(key);
  date.setDate(date.getDate() + days);
  return toKey(date);
}

function isFinishedDay(store, key) {
  const log = store.logs[key];
  return Boolean(log && log.finished && Object.values(log.results).some((values) => values.some((value) => value !== null && value !== undefined)));
}

// Останнє навантаження кожної групи до дати key (не включно).
function muscleLoads(store, key) {
  const loads = {};
  for (let offset = RECOVERY_LOOKBACK_DAYS; offset >= 1; offset -= 1) {
    const dayKey = shiftKey(key, -offset);
    const plan = planFor(dayKey, store.startDate);
    if (!plan.day || !plan.day.muscles) continue;
    const finished = isFinishedDay(store, dayKey);
    const planned = !finished && dayKey >= todayKey;
    if (!finished && !planned) continue;
    Object.entries(plan.day.muscles).forEach(([group, share]) => {
      const intensity = share * (plan.deload ? DELOAD_INTENSITY : 1);
      const window = Math.max(24, MUSCLE_GROUPS[group].hours * intensity);
      const end = window - offset * 24;
      // Легке навантаження не «скасовує» важче, якщо після важкого відновлення триває довше.
      if (!loads[group] || end >= loads[group].end) loads[group] = { key: dayKey, title: plan.day.title, intensity, window, end, planned };
    });
  }
  return loads;
}

function muscleStatus(group, load, atKey) {
  if (!load) return { group, ratio: 1, left: 0, load: null };
  const { window } = load;
  const hours = daysBetween(load.key, atKey) * 24;
  return { group, load, ratio: Math.min(1, hours / window), left: Math.max(0, Math.ceil((window - hours) / 24)) };
}

function lastTrainingBefore(store, key) {
  return Object.keys(store.logs)
    .filter((dayKey) => dayKey < key && isFinishedDay(store, dayKey))
    .sort()
    .pop();
}

function nextTrainingAfter(store, key) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const dayKey = shiftKey(key, offset);
    const plan = planFor(dayKey, store.startDate);
    if (plan.day) return { key: dayKey, plan };
  }
  return null;
}

function dayWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дні";
  return "днів";
}

function groupNames(statuses) {
  return statuses.map((status) => MUSCLE_GROUPS[status.group].name.toLowerCase()).join(", ");
}

const WEEKDAYS_ACCUSATIVE = ["понеділок", "вівторок", "середу", "четвер", "п'ятницю", "суботу", "неділю"];

function weekdayName(key) {
  const name = WEEKDAYS[weekdayIndex(key)];
  return `${name[0].toUpperCase()}${name.slice(1)}`;
}

function loadText(status, atKey) {
  if (!status.load) return "за останні 2 тижні не навантажувалися";
  const days = daysBetween(status.load.key, atKey);
  const when = `${days} ${dayWord(days)} тому`;
  const planned = status.load.planned ? ", якщо пройде за планом" : "";
  return `${weekdayName(status.load.key)}, ${when} — «${status.load.title}»${planned}`;
}

function renderMuscleStatus(statuses, key) {
  const items = statuses.map((status) => {
    const bar = el("span", "game-bar", el("span", "game-bar-fill"));
    bar.firstChild.style.width = `${Math.round(status.ratio * 100)}%`;
    bar.setAttribute("aria-hidden", "true");
    const state = status.ratio >= 1 ? "відновлені" : `відновлюються, ще ≈ ${status.left} ${dayWord(status.left)}`;
    return el(
      "li",
      `muscle${status.ratio >= 1 ? " is-ready" : ""}`,
      el("span", "muscle-head", el("strong", null, MUSCLE_GROUPS[status.group].name), el("span", "muscle-state", state)),
      bar,
      el("span", "muscle-note", loadText(status, key)),
    );
  });
  return el("section", "recovery-status", el("h2", "recovery-name", "Стан м'язів"), el("ul", "muscles", ...items));
}

// Контекстні поради: що болить, що далі, як рухатися й їсти саме сьогодні.
function recoveryAdvice(store, key, statuses) {
  const advice = [];
  const recovering = statuses.filter((status) => status.ratio < 1);
  const fresh = recovering.filter((status) => daysBetween(status.load.key, key) <= 2 && status.load.intensity >= 0.8);
  const next = nextTrainingAfter(store, key);

  if (next) {
    const nextGroups = Object.keys(next.plan.day.muscles || {});
    const days = daysBetween(key, next.key);
    const tired = nextGroups.map((group) => statuses.find((status) => status.group === group)).filter((status) => status && status.left > days);
    const when = days === 1 ? "завтра" : `у ${WEEKDAYS_ACCUSATIVE[weekdayIndex(next.key)]}`;
    let text = tired.length
      ? `Ще не встигнуть повністю відновитися: ${groupNames(tired)}. Якщо м'язи болітимуть, розімніться довше й зробіть на один підхід менше.`
      : "М'язи для нього встигнуть відновитися, тож можна працювати на повну.";
    if (days === 1) text += " Лягайте вчасно, а за 1–2 години до тренування з'їжте щось із вуглеводами.";
    advice.push({ name: `Наступне тренування ${when}: ${next.plan.day.title.toLowerCase()}`, text });
  }

  if (fresh.length) {
    advice.push({
      name: "Якщо болять м'язи",
      text: `Крепатура в м'язах (${groupNames(fresh)}) найсильніша через 1–3 дні після навантаження — це нормально й минає саме. Легкий рух і тепло допомагають. Гострий біль у суглобі чи біль, що не минає, — привід пропустити вправу й порадитися з лікарем.`,
    });
  }

  const legsTired = recovering.some((status) => status.group === "legs" || status.group === "back");
  if (legsTired) {
    advice.push({ name: "Рух", text: "Прогулянка 30–40 хв у спокійному темпі розганяє кров у ногах і спині й зменшує скутість. Важкі пробіжки й стрибки краще відкласти." });
  } else if (recovering.length) {
    advice.push({ name: "Рух", text: "Ноги вже відпочили, тож можна довше погуляти, покататися на велосипеді чи поплавати. Верх тіла не навантажуйте — легкі кругові рухи руками на 5 хв достатньо." });
  } else {
    advice.push({ name: "Рух", text: "Усі м'язи відновлені. Гарний день для довгої прогулянки, велосипеда чи активної гри — тільки без важких вправ, щоб не з'їсти відпочинок." });
  }

  // Для майбутніх дат враховуємо й заплановані тренування між сьогодні й цією датою.
  const planned = statuses.filter((status) => status.load && status.load.planned).map((status) => status.load.key);
  const last = [lastTrainingBefore(store, key), ...planned].filter(Boolean).sort().pop();
  const idle = last ? daysBetween(last, key) : null;
  if (idle !== null && idle >= BREAK_DAYS) {
    advice.push({ name: "Перерва", text: `Без тренувань уже ${idle} ${dayWord(idle)}. Цілі знижено приблизно на 15%, тож повернутися буде легше — головне почати.` });
  } else if (idle !== null && idle >= BREAK_WARNING_DAYS) {
    advice.push({ name: "Перерва", text: `Без тренувань уже ${idle} ${dayWord(idle)}. Якщо перерва перевищить ${BREAK_DAYS} днів, цілі знизяться приблизно на 15%.` });
  }

  const hardYesterday = statuses.some((status) => status.load && daysBetween(status.load.key, key) === 1 && /Витривалість|Тест/.test(status.load.title));
  if (hardYesterday) {
    advice.push({ name: "Вода й вуглеводи", text: "Після кіл чи тесту випийте сьогодні трохи більше води, а до білка додайте кашу, рис або картоплю — так швидше відновлюються запаси енергії в м'язах." });
  }
  return advice;
}

function recoveryStretches(statuses) {
  const seen = new Set();
  return statuses
    .filter((status) => status.ratio < 1 && MUSCLE_GROUPS[status.group].stretch)
    .flatMap((status) => COOLDOWNS[MUSCLE_GROUPS[status.group].stretch])
    .filter((step) => !seen.has(step.guide) && seen.add(step.guide));
}

function renderRecoveryDay(key, index) {
  const loads = muscleLoads(store, key);
  const statuses = Object.keys(MUSCLE_GROUPS)
    .map((group) => muscleStatus(group, loads[group], key))
    .sort((a, b) => a.ratio - b.ratio);
  const recovering = statuses.filter((status) => status.ratio < 1);
  const main = document.createDocumentFragment();
  // Без жодного завершеного тренування стан м'язів був би лише здогадкою з плану.
  const hasHistory = Object.values(loads).some((load) => !load.planned);

  const intro = !hasHistory
    ? RECOVERY.intro
    : recovering.length
      ? `Сьогодні без тренування. Найбільше зараз відновлюються: ${groupNames(recovering.slice(0, 3))}.`
      : "Сьогодні без тренування. Усі м'язи вже відновлені — день для спокійного руху й сил на наступний тиждень.";
  main.append(el("p", "intro", intro));
  if (hasHistory) main.append(renderMuscleStatus(statuses, key));

  const advice = recoveryAdvice(store, key, hasHistory ? statuses : statuses.map((status) => muscleStatus(status.group, null, key)));
  main.append(el("ul", "recovery", ...[...advice, ...RECOVERY.items].map((item) => el("li", "recovery-item", el("h2", "recovery-name", item.name), el("p", null, item.text)))));

  const stretches = hasHistory ? recoveryStretches(statuses) : [];
  if (stretches.length) main.append(renderSteps("Легка розтяжка для м'язів, що відновлюються · 10 хв", stretches));

  const tip = RECOVERY.tips[dayOfYear(dateForIndex(index)) % RECOVERY.tips.length];
  main.append(el("aside", "tip", el("h2", "tip-title", "Порада дня"), el("p", null, tip)));
  return main;
}
