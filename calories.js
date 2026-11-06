// Приблизна оцінка калорій за формулою MET: ккал/хв = MET × 3,5 × вага / 200.
// Значення MET орієнтуються на Compendium of Physical Activities і спрощені для цієї програми.
// Оцінка включає базовий обмін, але не враховує техніку, темп і вагу гантелі точно.

const BODY_WEIGHT_KG = 90;
const REST_MET = 1.5;
const WARMUP_KCAL_MINUTES = 10;
const WARMUP_MET = 3.5;
const COOLDOWN_KCAL_MINUTES = 10;
const COOLDOWN_MET = 2.3;
const SET_REST_SECONDS = 90;
const ROUND_REST_SECONDS = 150;
const TEST_REST_SECONDS = 240;

// met — інтенсивність під час роботи; rep — приблизна тривалість одного повторення в секундах.
const CALORIE_RATES = {
  mon_pushup: { met: 8, rep: 2.5 },
  mon_decline: { met: 8, rep: 2.5 },
  mon_narrow: { met: 8, rep: 2.5 },
  mon_press: { met: 4, rep: 3 },
  mon_plank: { met: 4 },
  tue_goblet: { met: 6, rep: 3 },
  tue_split: { met: 6, rep: 3 },
  tue_rdl: { met: 5, rep: 3 },
  tue_bridge: { met: 3.5, rep: 2.5 },
  tue_calves: { met: 3, rep: 2 },
  tue_side_plank: { met: 3.5 },
  thu_row: { met: 5, rep: 2.5 },
  thu_pullover: { met: 3.5, rep: 3 },
  thu_y_raise: { met: 2.8, rep: 2.5 },
  thu_curl: { met: 3.5, rep: 2.5 },
  thu_carry: { met: 5 },
  thu_grip: { met: 2, rep: 1.5 },
  fri_pushup: { met: 8, rep: 2.5 },
  fri_squat: { met: 5, rep: 2 },
  fri_plank: { met: 4 },
  fri_lunge: { met: 6, rep: 2.5 },
  fri_row: { met: 5, rep: 2.5 },
  test_pushup: { met: 8, rep: 2 },
  test_squat: { met: 5, rep: 2 },
  test_plank: { met: 4 },
};

function kcalPerMinute(met) {
  return (met * 3.5 * BODY_WEIGHT_KG) / 200;
}

function performedValues(results, sets) {
  return (results || []).slice(0, sets).filter((value) => value !== null && value !== undefined && value > 0);
}

// Калорії однієї вправи. Без results рахується план, а з results — лише виконані підходи.
function exerciseKcal(exercise, sets, results, circuit) {
  const rate = CALORIE_RATES[exercise.id];
  if (!rate) return 0;
  const values = results ? performedValues(results, sets) : Array(sets).fill(exercise.target);
  if (!values.length || values.some((value) => value === undefined)) return 0;
  const secondsPerUnit = exercise.unit ? 1 : rate.rep + (exercise.repExtra || 0);
  const sides = exercise.side ? 2 : 1;
  const workSeconds = values.reduce((sum, value) => sum + value, 0) * secondsPerUnit * sides;
  const restSeconds = circuit ? 0 : (values.length - 1) * SET_REST_SECONDS;
  return (workSeconds / 60) * kcalPerMinute(rate.met) + (restSeconds / 60) * kcalPerMinute(REST_MET);
}

// Калорії всього дня разом із розминкою й розтяжкою. Якщо передано log, рахуються фактичні результати.
function dayKcal(plan, progress, log) {
  let total = WARMUP_KCAL_MINUTES * kcalPerMinute(WARMUP_MET) + COOLDOWN_KCAL_MINUTES * kcalPerMinute(COOLDOWN_MET);
  plan.day.blocks.forEach((block) => {
    let doneExercises = 0;
    let rounds = 0;
    block.exercises.forEach((exercise) => {
      const sets = plannedSets(exercise, plan.deload);
      const resolved = plan.isTest ? exercise : resolveExercise(exercise, progress.states[exercise.id]);
      const results = log ? log.results[exercise.id] || [] : null;
      const kcal = exerciseKcal(resolved, sets, results, Boolean(block.circuit));
      total += kcal;
      if (kcal > 0) doneExercises += 1;
      rounds = Math.max(rounds, results ? performedValues(results, sets).length : sets);
    });
    if (block.circuit) total += (Math.max(rounds - 1, 0) * ROUND_REST_SECONDS * kcalPerMinute(REST_MET)) / 60;
    if (plan.isTest) total += (Math.max(doneExercises - 1, 0) * TEST_REST_SECONDS * kcalPerMinute(REST_MET)) / 60;
  });
  return total;
}

function kcalText(kcal, step = 5) {
  return `≈ ${Math.max(step, Math.round(kcal / step) * step)} ккал`;
}
