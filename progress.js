// Правила прогресії. Поточні цілі щоразу обчислюються заново зі збережених результатів,
// тому виправлення старого запису автоматично оновлює всі наступні цілі.

const CYCLE_WEEKS = 5;
const TEST_WEEK = 4;
const DELOAD_WEEK = 5;
const TEST_WEEKDAY = 4;
const BREAK_DAYS = 7;
const FAILS_BEFORE_DROP = 2;

function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysBetween(fromKey, toKeyValue) {
  const from = parseKey(fromKey);
  const to = parseKey(toKeyValue);
  return Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000);
}

function weekdayIndex(key) {
  return (parseKey(key).getDay() + 6) % 7;
}

function mondayKey(key) {
  const date = parseKey(key);
  date.setDate(date.getDate() - weekdayIndex(key));
  return toKey(date);
}

function cycleWeek(key, startDate) {
  if (!startDate) return 1;
  const weeks = Math.floor(daysBetween(mondayKey(startDate), mondayKey(key)) / 7);
  if (weeks < 0) return 1;
  return (weeks % CYCLE_WEEKS) + 1;
}

// Що заплановано на дату: тип дня, номер тижня в циклі та чи це легкий тиждень.
function planFor(key, startDate) {
  const index = weekdayIndex(key);
  const week = cycleWeek(key, startDate);
  const deload = week === DELOAD_WEEK;
  let day = TRAINING_DAYS[index] || null;
  if (day && index === TEST_WEEKDAY && week === TEST_WEEK) day = TEST_DAY;
  return { day, week, deload, isTest: Boolean(day && day.test) };
}

function plannedSets(exercise, deload) {
  return deload ? Math.max(1, Math.round((exercise.sets * 2) / 3)) : exercise.sets;
}

function allExercises() {
  return Object.values(TRAINING_DAYS).flatMap((day) => day.blocks.flatMap((block) => block.exercises));
}

function initialState() {
  const state = {};
  allExercises().forEach((exercise) => {
    state[exercise.id] = { target: exercise.target, level: 0, fails: 0 };
  });
  return state;
}

function reducedTarget(exercise, target, share) {
  if (exercise.unit) return Math.max(5, Math.min(target - 5, Math.round((target * (1 - share)) / 5) * 5));
  return Math.max(1, Math.min(target - 1, Math.round(target * (1 - share))));
}

// Один запис результатів: повертає новий стан вправи й тип зміни.
function advance(exercise, state, results, deload) {
  const sets = plannedSets(exercise, deload);
  const planned = Array.from({ length: sets }, (_, index) => (results ? results[index] : null));
  if (planned.every((value) => value === null || value === undefined)) return { state, status: "skipped" };
  if (deload) return { state, status: "deload" };

  const done = planned.every((value) => value !== null && value !== undefined && value >= state.target);
  if (!done) {
    if (state.fails + 1 >= FAILS_BEFORE_DROP) {
      return { state: { ...state, target: reducedTarget(exercise, state.target, 0.1), fails: 0 }, status: "down" };
    }
    return { state: { ...state, fails: state.fails + 1 }, status: "same" };
  }

  if (exercise.max && state.target >= exercise.max) {
    const levels = exercise.levels || [{}];
    if (state.level + 1 < levels.length) {
      return { state: { target: exercise.target, level: state.level + 1, fails: 0 }, status: "levelup" };
    }
    return { state: { ...state, fails: 0 }, status: "top" };
  }

  const step = exercise.step || (exercise.unit ? 5 : 1);
  const next = exercise.max ? Math.min(exercise.max, state.target + step) : state.target + step;
  return { state: { ...state, target: next, fails: 0 }, status: "up" };
}

function applyBreak(states) {
  allExercises().forEach((exercise) => {
    const state = states[exercise.id];
    states[exercise.id] = { ...state, target: reducedTarget(exercise, state.target, 0.15), fails: 0 };
  });
}

// Цілі на дату beforeKey: враховує лише завершені тренування до цієї дати.
function computeProgress(store, beforeKey) {
  const states = initialState();
  const lastResults = {};
  const lastTests = {};
  let previous = null;
  let breakApplied = false;

  Object.keys(store.logs)
    .sort()
    .filter((key) => key < beforeKey && store.logs[key].finished)
    .forEach((key) => {
      const plan = planFor(key, store.startDate);
      if (!plan.day) return;
      if (previous && daysBetween(previous, key) > BREAK_DAYS) applyBreak(states);
      plan.day.blocks.forEach((block) => {
        block.exercises.forEach((exercise) => {
          const results = store.logs[key].results[exercise.id];
          if (plan.isTest) {
            if (results && results[0] !== null && results[0] !== undefined) lastTests[exercise.id] = results[0];
            return;
          }
          states[exercise.id] = advance(exercise, states[exercise.id], results, plan.deload).state;
          if (results && results.some((value) => value !== null && value !== undefined)) lastResults[exercise.id] = results;
        });
      });
      previous = key;
    });

  if (previous && daysBetween(previous, beforeKey) > BREAK_DAYS) {
    applyBreak(states);
    breakApplied = true;
  }
  return { states, lastResults, lastTests, breakApplied };
}

// Вправа з урахуванням поточного рівня складності й цілі.
function resolveExercise(exercise, state) {
  const level = (exercise.levels && exercise.levels[state.level]) || {};
  return { ...exercise, ...level, target: state.target, baseTarget: exercise.target };
}
