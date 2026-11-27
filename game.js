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

// lore — коротка «ігрова» репліка, яку видно після отримання досягнення.
function countAchievement(id, title, text, key, count, lore) {
  return { id, title, text, lore, test: (c) => c[key] >= count, progress: (c) => [c[key], count] };
}

// Найкращий підхід у вправі на будь-якому варіанті складності. exerciseId може бути списком — береться найкраще з них.
function bestAchievement(id, exerciseId, value, title, text, lore) {
  const best = (c) => Math.max(0, ...[].concat(exerciseId).map((key) => c.best[key] || 0));
  return { id, title, text, lore, test: (c) => best(c) >= value, progress: (c) => [best(c), value] };
}

// Досягнуто певного рівня складності у вправі (0 — базовий варіант).
function levelAchievement(id, exerciseId, level, title, text, lore) {
  const reached = (c) => c.levels[exerciseId] || 0;
  return { id, title, text, lore, test: (c) => reached(c) >= level, progress: (c) => [reached(c), level] };
}

function kcalAchievement(id, kcal, title, lore) {
  return countAchievement(id, title, `Спаліть орієнтовно ${kcal.toLocaleString("uk-UA")} ккал за всі тренування.`, "kcal", kcal, lore);
}

const TEST_GOAL_LORE = {
  test_pushup: "Сорок віджимань поспіль. Тепер можна віджиматися на спір — і вигравати.",
  test_squat: "Вісімдесят присідань. Ноги, які витримають і весілля до ранку, і переїзд на дев'ятий поверх без ліфта.",
  test_plank: "Дві хвилини двадцять секунд у планці. Прес готовий тримати удар — і незручну паузу в розмові.",
};

const ACHIEVEMENTS = [
  countAchievement("first", "Перший крок", "Завершіть перше тренування.", "workouts", 1, "Найважче позаду: «почну з понеділка» вже не про тебе."),
  countAchievement("workouts_10", "Розгін", "Завершіть 10 тренувань.", "workouts", 10, "Сходи на п'ятий поверх більше не здаються Еверестом."),
  countAchievement("workouts_25", "Звичка", "Завершіть 25 тренувань.", "workouts", 25, "Тепер пропустити тренування дивніше, ніж прийти на нього."),
  countAchievement("workouts_50", "Півсотні", "Завершіть 50 тренувань.", "workouts", 50, "Усі пакети із супермаркету — за один захід. Завжди."),
  countAchievement("workouts_100", "Сотня", "Завершіть 100 тренувань.", "workouts", 100, "Сто перемог над диваном. Диван ображений, але змирився."),
  countAchievement("perfect", "Чисто за планом", "Виконайте всі цілі одного тренування.", "perfect", 1, "Усе до останнього повторення. Внутрішній тренер задоволено киває."),
  countAchievement("perfect_10", "Точність", "10 тренувань, повністю виконаних за планом.", "perfect", 10, "Десять тренувань без жодного «ну, майже». Дисципліна +10."),
  countAchievement("week", "Повний тиждень", `Виконайте всі ${TRAINING_INDEXES.length} тренування за тиждень.`, "fullWeeks", 1, "Тиждень закрито повністю. Понеділок тебе більше не лякає."),
  countAchievement("cycle", "Цикл без пропусків", `${FULL_STREAK_WEEKS} повних тижнів поспіль.`, "bestStreak", FULL_STREAK_WEEKS, "П'ять тижнів без пропусків. Друзі вже питають, що це за програма."),
  countAchievement("levelup", "Новий ступінь", "Перейдіть на складніший варіант вправи.", "levelups", 1, "Стара вправа стала замалою, як дитячий светр."),
  countAchievement("levelup_5", "Майстер варіацій", "5 переходів на складніші варіанти.", "levelups", 5, "Тіло вчиться швидше, ніж встигаєш придумати виправдання."),
  countAchievement("record", "Рекордсмен", "Поставте перший особистий рекорд.", "records", 1, "Вчорашній ти щойно програв сьогоднішньому."),
  countAchievement("record_50", "Серія рекордів", "Поставте 50 особистих рекордів.", "records", 50, "Рекорди падають так часто, що вже не встигаєш святкувати."),
  bestAchievement("carry", "thu_carry", 60, "Носій", "Пройдіть 60 с із гантеллю в одній руці.", "Тепер можна носити кохану людину на руках — і не лише через поріг."),
  bestAchievement("grip", "thu_grip", 25, "Залізна хватка", "25 розведень пальців з еспандером в одному підході.", "Банки з огірками більше не мають шансів. Тепер тебе кличуть відкривати все в домі."),
  bestAchievement("pushups_15", ["mon_pushup", "fri_pushup"], 15, "Опора сім'ї", "15 віджимань в одному підході.", "Якщо доведеться штовхати машину, що заглохла, — ти перший у черзі."),
  // Навички з функціональної програми (з 7.12.2026).
  bestAchievement("frog_30", "skill_frog", 30, "Жаба-воїн", "Утримайте «жабку» 30 с.", "Тридцять секунд на руках, коліна на ліктях. Земля вже не тягне так сильно."),
  levelAchievement("crow", "skill_frog", 1, "Ворона", "Перейдіть з «жабки» на «ворону».", "Таз над плечима, руки майже прямі. Ще трохи — і злетиш."),
  bestAchievement("hspu_6", "skill_wall_hspu", 6, "Догори дриґом", "6 віджимань у стійці біля стіни за один підхід.", "Шість разів підняти себе головою вниз. Гравітація подала скаргу."),
  levelAchievement("hspu_full", "skill_wall_hspu", 1, "Повна амплітуда", "Віджимання в стійці до підлоги.", "Голова торкається підлоги — і повертається назад. Чесно, до кінця."),
  levelAchievement("hspu_bars", "skill_wall_hspu", 2, "Глибше за підлогу", "Перейдіть на віджимання в стійці на паралетках.", "Голова опускається нижче рук. Колишній рівень — позаду."),
  bestAchievement("free_hs_5", "skill_free_hs", 5, "П'ять секунд невагомості", "Протримайте вільну стійку на руках 5 с.", "Без стіни, без страховки. П'ять секунд, які тягнулися вічність."),
  bestAchievement("free_hs_15", "skill_free_hs", 15, "Сам собі опора", "Протримайте вільну стійку на руках 15 с.", "Стіна більше не потрібна. Вона трохи сумує."),
  levelAchievement("tripod_free", "skill_tripod_press", 1, "Без стіни", "Перейдіть на підйом з трикутника одним поштовхом без стіни.", "Ціль, до якої колись не дотягнувся. Тепер — дотягнувся."),
  bestAchievement("archer_6", "mon_archer", 6, "Лучник", "6 archer-віджимань на кожну руку за підхід.", "Одна рука працює, друга лише підтримує. Половина шляху до віджимань на одній руці."),
  levelAchievement("pistol", "tue_pistol", 2, "Пістолет", "Перейдіть на присідання на одній нозі без опори.", "Одна нога, повна амплітуда, без стільця. Ноги тепер не лише сильні, а й розумні."),
  levelAchievement("lsit", "mon_tuck", 2, "Кут", "Перейдіть на повне утримання кута.", "Ноги прямі, тіло в повітрі. Прес, плечі й характер — в одній позі."),
  countAchievement("test", "Перевірка сил", "Пройдіть тест на максимум.", "tests", 1, "Чесний замір сил. Тепер є з чим порівнювати."),
  ...TEST_DAY.blocks
    .flatMap((block) => block.exercises)
    .map((exercise) => ({
      id: `goal_${exercise.id}`,
      title: `Ціль тесту: ${exercise.name.toLowerCase()}`,
      text: `${exercise.goal}${exercise.unit ? ` ${exercise.unit}` : ""} в одному підході під час тесту.`,
      lore: TEST_GOAL_LORE[exercise.id],
      test: (c) => Boolean(c.goals[exercise.id]),
      progress: (c) => [c.best[exercise.id] || 0, exercise.goal],
    })),
  kcalAchievement("kcal_1000", 1000, "Піца, якої не було", "Ціла піца перетворилася на рух. Вона прожила недарма."),
  kcalAchievement("kcal_7700", 7700, "Мінус кілограм", "Приблизно стільки енергії в кілограмі жиру. Принаймні на папері."),
  kcalAchievement("kcal_20000", 20000, "Святковий стіл", "Спалено цілий новорічний стіл. Олів'є теж."),
  kcalAchievement("kcal_50000", 50000, "Доменна піч", "Від тебе можна грітися взимку. Сусіди вже питають тариф."),
  countAchievement("comeback", "Повернення", "Поверніться до тренувань після перерви понад 7 днів.", "comebacks", 1, "Повернутися важче, ніж почати. І все ж ти тут."),
];

// Шкала прогресу для ще не отриманого досягнення. Для одноразових цілей («зробіть один раз») її не показуємо.
function badgeProgress(achievement, counters) {
  if (!achievement.progress) return null;
  const [rawValue, goal] = achievement.progress(counters);
  if (!(goal > 1)) return null;
  const value = Math.min(Math.round(rawValue || 0), goal);
  const bar = el("span", "game-bar badge-bar", el("span", "game-bar-fill"));
  bar.firstChild.style.width = `${Math.round((value / goal) * 100)}%`;
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", `Прогрес: ${achievement.title}`);
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", String(goal));
  bar.setAttribute("aria-valuenow", String(value));
  const format = (number) => number.toLocaleString("uk-UA");
  return el("span", "badge-progress", bar, el("span", "badge-count", `${format(value)} / ${format(goal)}`));
}

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
  const indexes = Object.keys(scheduleFor(monday).days).map(Number);
  return indexes.every((index) => {
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
  const history = {};
  const addHistory = (id, key, value, exercise, level) => {
    if (!history[id]) history[id] = [];
    history[id].push({ key, value, name: exercise.name, weight: exercise.weight, unit: exercise.unit, level });
  };
  const counters = { workouts: 0, perfect: 0, fullWeeks: 0, bestStreak: 0, levelups: 0, records: 0, tests: 0, comebacks: 0, kcal: 0, goals: {}, best: {}, levels: {} };
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
      counters.kcal += dayKcal(plan, { states }, log, bodyWeightOn(key));
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
            counters.best[exercise.id] = Math.max(counters.best[exercise.id] || 0, value);
            addHistory(exercise.id, key, value, exercise, 0);
            return;
          }
          const current = states[exercise.id];
          const sets = plannedSets(exercise, plan.deload);
          const values = filledValues(results, sets);
          if (values.length === sets && values.every((value) => value >= current.target)) met += 1;
          else allMet = false;
          if (values.length) {
            const top = Math.max(...values);
            checkRecord(`${exercise.id}:${current.level}`, resolveExercise(exercise, current), top);
            counters.best[exercise.id] = Math.max(counters.best[exercise.id] || 0, top);
            addHistory(exercise.id, key, top, resolveExercise(exercise, current), current.level);
          }
          const { state, status } = advance(exercise, current, results, plan.deload);
          if (status === "levelup") levelups += 1;
          states[exercise.id] = state;
          counters.levels[exercise.id] = Math.max(counters.levels[exercise.id] || 0, state.level || 0);
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
    kcal: counters.kcal,
    history,
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
    "div",
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
          el("span", "badge-note", achievement.text),
          date && achievement.lore ? el("span", "badge-lore", achievement.lore) : null,
          date ? el("span", "badge-date", `Отримано ${formatDay(date)}`) : badgeProgress(achievement, game.counters),
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
    el("h2", "card-title", "Досягнення"),
    badges,
    el("p", "game-total", `Усього спалено за тренування: ${kcalText(game.kcal, 10)}`),
    el("h2", "card-title", "Особисті рекорди"),
    el("p", "block-note", "Найкращий підхід у кожній вправі на поточному варіанті складності."),
    records,
    el("h2", "card-title", "Як нараховується досвід"),
    el(
      "ul",
      "howto-list",
      el("li", null, `Завершене тренування — ${XP.workout}`),
      el("li", null, `Ціль вправи виконано в усіх підходах — ${XP.exerciseMet}, а всіх вправ дня — ще ${XP.perfectDay}`),
      el("li", null, `Перехід на складніший варіант — ${XP.levelUp}, особистий рекорд — ${XP.record}`),
      el("li", null, `Ціль тесту — ${XP.testGoal}, повний тиждень — ${XP.fullWeek}, досягнення — ${XP.achievement}`),
    ),
  );

  panel.replaceChildren(el("div", "game", summary), el("div", "card", body));
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
  day.achievements.forEach((achievement) => {
    lines.push(el("p", "reward-line", `★ Досягнення «${achievement.title}»`));
    if (achievement.lore) lines.push(el("p", "reward-lore", achievement.lore));
  });
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
