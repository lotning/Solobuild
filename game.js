// Геймифікація: досвід, рівні, досягнення й особисті рекорди.
// Усе щоразу обчислюється заново із завершених тренувань, тому нічого додатково не зберігається:
// виправлення старого запису, імпорт і синхронізація автоматично оновлюють і нагороди.

const XP = {
  workout: 50,
  exerciseMet: 5,
  perfectDay: 25,
  levelUp: 30,
  record: 10,
  testGoal: 30,
  fullWeek: 40,
  achievement: 50,
};
const LEVEL_STEP_XP = 100;
const FULL_STREAK_WEEKS = CYCLE_WEEKS;
const TRAINING_INDEXES = Object.keys(TRAINING_DAYS).map(Number);

function countAchievement(id, title, text, key, count) {
  return { id, title, text, test: (c) => c[key] >= count };
}

const ACHIEVEMENTS = [
  countAchievement("first", "Перший крок", "Завершіть перше тренування.", "workouts", 1),
  countAchievement("workouts_10", "Розгін", "Завершіть 10 тренувань.", "workouts", 10),
  countAchievement("workouts_25", "Звичка", "Завершіть 25 тренувань.", "workouts", 25),
  countAchievement("workouts_50", "Півсотні", "Завершіть 50 тренувань.", "workouts", 50),
  countAchievement("workouts_100", "Сотня", "Завершіть 100 тренувань.", "workouts", 100),
  countAchievement("perfect", "Чисто за планом", "Виконайте всі цілі одного тренування.", "perfect", 1),
  countAchievement("perfect_10", "Точність", "10 тренувань, повністю виконаних за планом.", "perfect", 10),
  countAchievement("week", "Повний тиждень", `Виконайте всі ${TRAINING_INDEXES.length} тренування за тиждень.`, "fullWeeks", 1),
  countAchievement("cycle", "Цикл без пропусків", `${FULL_STREAK_WEEKS} повних тижнів поспіль.`, "bestStreak", FULL_STREAK_WEEKS),
  countAchievement("levelup", "Новий ступінь", "Перейдіть на складніший варіант вправи.", "levelups", 1),
  countAchievement("levelup_5", "Майстер варіацій", "5 переходів на складніші варіанти.", "levelups", 5),
  countAchievement("record", "Рекордсмен", "Поставте перший особистий рекорд.", "records", 1),
  countAchievement("record_50", "Серія рекордів", "Поставте 50 особистих рекордів.", "records", 50),
  countAchievement("test", "Перевірка сил", "Пройдіть тест на максимум.", "tests", 1),
  ...TEST_DAY.blocks
    .flatMap((block) => block.exercises)
    .map((exercise) => ({
      id: `goal_${exercise.id}`,
      title: `Ціль тесту: ${exercise.name.toLowerCase()}`,
      text: `${exercise.goal}${exercise.unit ? ` ${exercise.unit}` : ""} в одному підході під час тесту.`,
      test: (c) => Boolean(c.goals[exercise.id]),
    })),
  countAchievement("comeback", "Повернення", "Поверніться до тренувань після перерви понад 7 днів.", "comebacks", 1),
];

// Скільки досвіду потрібно для рівня: 1 — 0, 2 — 200, 3 — 600, 4 — 1200…
function levelThreshold(level) {
  return LEVEL_STEP_XP * level * (level - 1);
}

function levelFor(xp) {
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level += 1;
  return level;
}

function filledValues(results, count) {
  return Array.from({ length: count }, (_, index) => (results ? results[index] : null)).filter((value) => value !== null && value !== undefined);
}

function isCountedDay(store, key) {
  const log = store.logs[key];
  if (!log || !log.finished || !planFor(key, store.startDate).day) return false;
  return Object.values(log.results).some((values) => values.some((value) => value !== null && value !== undefined));
}

function isFullWeek(store, key) {
  const monday = mondayKey(key);
  return TRAINING_INDEXES.every((index) => {
    const date = parseKey(monday);
    date.setDate(date.getDate() + index);
    const dayKey = toKey(date);
    return dayKey <= key && isCountedDay(store, dayKey);
  });
}

function computeGame(store) {
  const states = initialState();
  const best = {};
  const recordNames = {};
  const days = {};
  const unlocked = {};
  const counters = { workouts: 0, perfect: 0, fullWeeks: 0, bestStreak: 0, levelups: 0, records: 0, tests: 0, comebacks: 0, goals: {} };
  let xp = 0;
  let streak = 0;
  let lastFullMonday = null;
  let previous = null;

  Object.keys(store.logs)
    .sort()
    .filter((key) => isCountedDay(store, key))
    .forEach((key) => {
      const plan = planFor(key, store.startDate);
      const log = store.logs[key];
      const day = { xpBefore: xp, xp: 0, items: [], records: [], achievements: [] };
      const award = (label, amount) => {
        day.xp += amount;
        day.items.push({ label, xp: amount });
      };

      if (previous && daysBetween(previous, key) > BREAK_DAYS) {
        applyBreak(states);
        counters.comebacks += 1;
      }
      counters.workouts += 1;
      award(plan.isTest ? "Тест пройдено" : "Тренування завершено", XP.workout);

      let met = 0;
      let allMet = true;
      let levelups = 0;
      let goals = 0;
      plan.day.blocks.forEach((block) => {
        block.exercises.forEach((exercise) => {
          const results = log.results[exercise.id];
          if (plan.isTest) {
            const [value] = filledValues(results, 1);
            if (value === undefined) return;
            if (value >= exercise.goal) {
              goals += 1;
              counters.goals[exercise.id] = true;
            }
            checkRecord(exercise.id, exercise, value);
            return;
          }
          const current = states[exercise.id];
          const sets = plannedSets(exercise, plan.deload);
          const values = filledValues(results, sets);
          if (values.length === sets && values.every((value) => value >= current.target)) met += 1;
          else allMet = false;
          if (values.length) checkRecord(`${exercise.id}:${current.level}`, resolveExercise(exercise, current), Math.max(...values));
          const { state, status } = advance(exercise, current, results, plan.deload);
          if (status === "levelup") levelups += 1;
          states[exercise.id] = state;
        });
      });

      function checkRecord(recordKey, exercise, value) {
        if (best[recordKey] !== undefined && value > best[recordKey]) {
          counters.records += 1;
          day.records.push({ name: exercise.name, value, unit: exercise.unit, previous: best[recordKey] });
          award(`Рекорд: ${exercise.name.toLowerCase()}`, XP.record);
        }
        if (best[recordKey] === undefined || value > best[recordKey]) {
          best[recordKey] = value;
          recordNames[recordKey] = { name: exercise.name, weight: exercise.weight, unit: exercise.unit };
        }
      }

      if (plan.isTest) {
        counters.tests += 1;
        if (goals) award(`Цілі тесту досягнуто: ${goals}`, goals * XP.testGoal);
      } else {
        if (met) award(`Цілі виконано у вправах: ${met}`, met * XP.exerciseMet);
        if (allMet) {
          counters.perfect += 1;
          award("Усе за планом", XP.perfectDay);
        }
        if (levelups) {
          counters.levelups += levelups;
          award(`Складніший варіант вправ: ${levelups}`, levelups * XP.levelUp);
        }
      }

      if (isFullWeek(store, key)) {
        const monday = mondayKey(key);
        streak = lastFullMonday && daysBetween(lastFullMonday, monday) === 7 ? streak + 1 : 1;
        lastFullMonday = monday;
        counters.fullWeeks += 1;
        counters.bestStreak = Math.max(counters.bestStreak, streak);
        award(streak > 1 ? `Повний тиждень, ${streak} поспіль` : "Повний тиждень", XP.fullWeek);
      }

      ACHIEVEMENTS.forEach((achievement) => {
        if (unlocked[achievement.id] || !achievement.test(counters)) return;
        unlocked[achievement.id] = key;
        day.achievements.push(achievement);
        award(`Досягнення «${achievement.title}»`, XP.achievement);
      });

      xp += day.xp;
      day.levelBefore = levelFor(day.xpBefore);
      day.levelAfter = levelFor(xp);
      days[key] = day;
      previous = key;
    });

  // Серія жива, поки поточний або минулий тиждень повний.
  const thisMonday = mondayKey(todayKey);
  const currentStreak = lastFullMonday && daysBetween(lastFullMonday, thisMonday) <= 7 ? streak : 0;
  const level = levelFor(xp);
  return {
    xp,
    level,
    levelStart: levelThreshold(level),
    levelEnd: levelThreshold(level + 1),
    streak: currentStreak,
    days,
    unlocked,
    counters,
    records: bestRecords(best, recordNames),
  };
}

// Для кожної вправи показуємо рекорд на найскладнішому досягнутому варіанті.
function bestRecords(best, names) {
  const byExercise = {};
  Object.keys(best).forEach((recordKey) => {
    const [id, level] = recordKey.split(":");
    const levelNumber = Number(level || 0);
    if (!byExercise[id] || levelNumber > byExercise[id].level) byExercise[id] = { level: levelNumber, value: best[recordKey], ...names[recordKey] };
  });
  return Object.values(byExercise);
}

function formatDay(key) {
  return parseKey(key).toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
}

function recordValue(record) {
  return `${record.value}${record.unit ? ` ${record.unit}` : ""}`;
}

function renderGamePanel() {
  const panel = document.getElementById("game-panel");
  if (!panel) return;
  const game = computeGame(store);
  const span = game.levelEnd - game.levelStart;
  const gained = game.xp - game.levelStart;
  const percent = Math.round((gained / span) * 100);

  const bar = el("span", "game-bar", el("span", "game-bar-fill"));
  bar.firstChild.style.width = `${percent}%`;
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", `Досвід до рівня ${game.level + 1}`);
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", String(span));
  bar.setAttribute("aria-valuenow", String(gained));

  const unlockedCount = Object.keys(game.unlocked).length;
  const summary = el(
    "summary",
    "game-summary",
    el(
      "span",
      "game-head",
      el("span", "game-level", `Рівень ${game.level}`),
      el("span", "game-xp", `${gained} / ${span} досвіду`),
    ),
    bar,
    el("span", "game-meta", `Повних тижнів поспіль: ${game.streak} · Досягнень: ${unlockedCount} із ${ACHIEVEMENTS.length}`),
  );

  const badges = el(
    "ul",
    "badges",
    ...ACHIEVEMENTS.map((achievement) => {
      const date = game.unlocked[achievement.id];
      return el(
        "li",
        `badge${date ? " is-unlocked" : ""}`,
        el("span", "badge-mark", date ? "★" : ""),
        el(
          "span",
          "badge-text",
          el("strong", "badge-title", achievement.title),
          el("span", "badge-note", date ? `Отримано ${formatDay(date)}` : achievement.text),
        ),
      );
    }),
  );

  const records = game.records.length
    ? el(
        "ul",
        "game-records",
        ...game.records.map((record) =>
          el("li", null, el("span", null, `${record.name}${record.weight ? `, ${record.weight}` : ""}`), el("strong", null, recordValue(record))),
        ),
      )
    : el("p", "block-note", "З'являться після перших тренувань.");

  const body = el(
    "div",
    "game-body",
    el("h3", "howto-heading", "Досягнення"),
    badges,
    el("h3", "howto-heading", "Особисті рекорди"),
    el("p", "block-note", "Найкращий підхід у кожній вправі на поточному варіанті складності."),
    records,
    el("h3", "howto-heading", "Як нараховується досвід"),
    el(
      "ul",
      "howto-list",
      el("li", null, `Завершене тренування — ${XP.workout}`),
      el("li", null, `Ціль вправи виконано в усіх підходах — ${XP.exerciseMet}, а всіх вправ дня — ще ${XP.perfectDay}`),
      el("li", null, `Перехід на складніший варіант — ${XP.levelUp}, особистий рекорд — ${XP.record}`),
      el("li", null, `Ціль тесту — ${XP.testGoal}, повний тиждень — ${XP.fullWeek}, досягнення — ${XP.achievement}`),
    ),
  );

  const details = el("details", "game", summary, body);
  details.id = "game-panel";
  details.open = Boolean(panel.open);
  details.setAttribute("aria-label", "Рівень і досягнення");
  panel.replaceWith(details);
}

// Що принесло конкретне тренування: показується в підсумку дня.
function renderDayRewards(key) {
  const day = computeGame(store).days[key];
  if (!day) return null;
  const lines = [];
  if (day.levelAfter > day.levelBefore) lines.push(el("p", "reward-level", `Новий рівень: ${day.levelAfter}`));
  if (day.records.length > 2) {
    const list = day.records.map((record) => `${record.name.toLowerCase()} ${recordValue(record)}`).join(", ");
    lines.push(el("p", "reward-line", `Нові рекорди (${day.records.length}): ${list}`));
  } else {
    day.records.forEach((record) => {
      const unit = record.unit ? ` ${record.unit}` : "";
      lines.push(el("p", "reward-line", `Новий рекорд: ${record.name.toLowerCase()} — ${record.value}${unit} (було ${record.previous}${unit})`));
    });
  }
  day.achievements.forEach((achievement) => lines.push(el("p", "reward-line", `★ Досягнення «${achievement.title}»`)));
  return el(
    "div",
    "rewards",
    el("p", "reward-xp", `+${day.xp} досвіду`),
    ...lines,
    el(
      "details",
      "reward-details",
      el("summary", null, "Звідки досвід"),
      el("ul", "reward-items", ...day.items.map((item) => el("li", null, el("span", null, item.label), el("span", null, `+${item.xp}`)))),
    ),
  );
}
