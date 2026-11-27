// Програма тренувань: усі вправи, цілі й поради зберігаються тут.
// Дні тижня: 0 — понеділок ... 6 — неділя.
// Старі розклади лежать у SCHEDULE_HISTORY, щоб записи минулих тижнів рахувалися за тим розкладом, що діяв тоді.
// id вправи не можна змінювати: за ним зберігаються ваші результати.
// levels — наступні ступені складності після досягнення верхньої межі (max).
// guide — ключ пояснення техніки з guides.js (анімація, кроки, помилки).
// muscles — які групи м'язів навантажує день і наскільки (1 — повністю), для порад у дні відновлення (recovery.js).

function harderLevels(name, firstLevels = []) {
  return [
    {},
    ...firstLevels,
    { name: `${name}, опускання 3 с`, repExtra: 2 },
    { name: `${name}, пауза 1–2 с`, repExtra: 1.5 },
  ];
}

const WARMUPS = {
  upper: [
    { text: "Кругові рухи плечима й руками — 1 хв", guide: "circles" },
    { text: "Обертання тазом і нахили корпусу — 1 хв", guide: "trunk" },
    { text: "Стрибки без скакалки або ходьба на місці — 3 хв", guide: "jumps" },
    { text: "Перехід із планки в позу «собака мордою вниз» — 10 разів", guide: "down_dog" },
    { text: "Віджимання від стіни або столу — 2 × 10", guide: "wall_pushup" },
  ],
  lower: [
    { text: "Обертання в гомілкостопах, колінах і тазі — 2 хв", guide: "knees" },
    { text: "Ходьба на місці з високим підніманням колін — 3 хв", guide: "march" },
    { text: "Махи ногами вперед і вбік — по 10 на кожну", guide: "swings" },
    { text: "Присідання без ваги в повільному темпі — 2 × 10", guide: "squat" },
    { text: "Сідничний місток на двох ногах — 10 разів", guide: "bridge" },
  ],
  pull: [
    { text: "Кругові рухи плечима й руками — 1 хв", guide: "circles" },
    { text: "Нахили й повороти корпусу — 2 хв", guide: "trunk" },
    { text: "Ходьба на місці або стрибки без скакалки — 3 хв", guide: "jumps" },
    { text: "Зведення лопаток стоячи — 15 разів", guide: "scapula" },
    { text: "Тяга в нахилі без ваги — 2 × 10", guide: "row_bodyweight" },
  ],
  full: [
    { text: "Суглобова розминка від шиї до гомілкостопів — 3 хв", guide: "joints" },
    { text: "Стрибки без скакалки або ходьба на місці — 3 хв", guide: "jumps" },
    { text: "Присідання без ваги — 15 разів", guide: "squat" },
    { text: "Віджимання від стіни або столу — 15 разів", guide: "wall_pushup" },
    { text: "Коротка планка — 20 с", guide: "plank" },
  ],
};

const COOLDOWNS = {
  upper: [
    { text: "Розтяжка грудей у дверному отворі — по 30 с на бік", guide: "door_chest" },
    { text: "Розтяжка трицепса за головою — по 30 с на руку", guide: "triceps" },
    { text: "Поза дитини — 1 хв", guide: "child" },
    { text: "Спокійне дихання лежачи — 2 хв", guide: "breathing" },
  ],
  lower: [
    { text: "Розтяжка передньої поверхні стегна — по 45 с на ногу", guide: "quad" },
    { text: "Нахил до прямої ноги — по 45 с на ногу", guide: "hamstring_one" },
    { text: "Розтяжка литок біля стіни — по 30 с на ногу", guide: "calf_wall" },
    { text: "Поза голуба або розтяжка сідниць лежачи — по 45 с на бік", guide: "glute" },
  ],
  pull: [
    { text: "Розтяжка широких м'язів спини біля опори — по 45 с на бік", guide: "lats" },
    { text: "Розтяжка біцепса біля стіни — по 30 с на руку", guide: "biceps_wall" },
    { text: "Розтяжка передпліч і кистей — по 30 с на руку", guide: "forearm" },
    { text: "Поза дитини — 1 хв", guide: "child" },
  ],
  full: [
    { text: "Розтяжка грудей у дверному отворі — по 30 с на бік", guide: "door_chest" },
    { text: "Розтяжка передньої поверхні стегна — по 30 с на ногу", guide: "quad" },
    { text: "Нахил до прямих ніг — 1 хв", guide: "hamstring_both" },
    { text: "Спокійне дихання лежачи — 2 хв", guide: "breathing" },
  ],
};

const TRAINING_DAYS = {
  0: {
    title: "Груди, плечі, трицепс",
    muscles: { chest: 1, shoulders: 1, triceps: 1, core: 0.5 },
    warmup: WARMUPS.upper,
    cooldown: COOLDOWNS.upper,
    blocks: [
      {
        title: "Основна частина",
        exercises: [
          { id: "mon_pushup", guide: "pushup", name: "Віджимання", sets: 4, target: 10, max: 15, levels: harderLevels("Віджимання"), cue: "Тіло рівне від голови до п'ят, груди майже торкаються підлоги." },
          { id: "mon_decline", guide: "decline_pushup", name: "Віджимання з ногами на опорі", sets: 3, target: 6, max: 10, levels: [{}, { name: "Віджимання з перенесенням ваги на одну руку", cue: "По черзі переносьте вагу на одну руку, тіло залишається рівним." }], cue: "Опора на рівні колін або стільця, поперек не прогинайте." },
          { id: "mon_narrow", guide: "narrow_pushup", name: "Вузькі віджимання", sets: 3, target: 6, max: 10, levels: [{}, { name: "«Алмазні» віджимання", cue: "Великі й вказівні пальці утворюють ромб під грудьми." }], cue: "Долоні трохи вужче за плечі, лікті йдуть уздовж тіла." },
          { id: "mon_press", guide: "press", name: "Жим гантелі над головою однією рукою", weight: "10 кг", side: "рука", sets: 3, target: 8, max: 12, levels: harderLevels("Жим гантелі над головою", [{ weight: "15 кг" }]).map((level, index) => (index > 1 ? { ...level, weight: "15 кг" } : level)), cue: "Напружте прес і сідниці, не відхиляйтеся назад." },
          { id: "mon_plank", guide: "plank", name: "Планка", sets: 3, target: 40, max: 75, unit: "с", levels: [{}, { name: "Планка з почерговим підніманням ніг", guide: "plank_leg", cue: "Піднімайте ногу невисоко, таз не розвертайте." }], cue: "Лікті під плечима, сідниці напружені, дихайте рівно." },
        ],
      },
    ],
  },
  1: {
    title: "Ноги й прес",
    muscles: { legs: 1, core: 1 },
    warmup: WARMUPS.lower,
    cooldown: COOLDOWNS.lower,
    blocks: [
      {
        title: "Основна частина",
        exercises: [
          { id: "tue_goblet", guide: "goblet", name: "Присідання з гантеллю біля грудей", weight: "15 кг", sets: 4, target: 15, max: 25, levels: harderLevels("Присідання з гантеллю"), cue: "Спина рівна, п'яти на підлозі, коліна йдуть у напрямку носків." },
          { id: "tue_split", guide: "split_squat", name: "Болгарські випади", weight: "без ваги", side: "нога", sets: 3, target: 8, max: 12, levels: [{}, { weight: "10 кг" }, { weight: "15 кг" }, { name: "Болгарські випади, опускання 3 с", weight: "15 кг", repExtra: 2 }], cue: "Задня нога на опорі, опускайтеся вниз, а не вперед." },
          { id: "tue_rdl", guide: "rdl", name: "Румунська тяга", weight: "15 кг", sets: 3, target: 12, max: 20, levels: harderLevels("Румунська тяга"), cue: "Відводьте таз назад, спина рівна, коліна злегка зігнуті." },
          { id: "tue_bridge", guide: "bridge_single", name: "Сідничний місток на одній нозі", side: "нога", sets: 3, target: 10, max: 15, levels: [{}, { name: "Сідничний місток на одній нозі, пауза 2 с", repExtra: 2 }], cue: "Підіймайте таз сідницею, а не прогином у попереку." },
          { id: "tue_calves", guide: "calf", name: "Підйоми на носки", sets: 3, target: 15, max: 25, levels: [{}, { name: "Підйоми на носок на одній нозі", side: "нога" }], cue: "Повна амплітуда й коротка пауза вгорі." },
          { id: "tue_hollow", guide: "hollow", name: "«Човник»", sets: 3, target: 20, max: 45, unit: "с", levels: [{}, { name: "«Човник» з руками за головою", guide: "hollow_arms", cue: "Руки витягнуті за голову біля вух, поперек так само притиснутий." }], cue: "Поперек притиснутий до підлоги, плечі й ноги трохи підняті." },
          { id: "tue_vacuum", guide: "vacuum", name: "Вакуум", sets: 3, target: 15, max: 30, unit: "с", cue: "Повний видих, затягніть живіт під ребра й тримайте без вдиху. Краще натщесерце." },
        ],
      },
    ],
  },
  2: {
    title: "Спина, біцепс, хват",
    muscles: { back: 1, biceps: 1, shoulders: 0.5 },
    warmup: WARMUPS.pull,
    cooldown: COOLDOWNS.pull,
    blocks: [
      {
        title: "Основна частина",
        exercises: [
          { id: "thu_row", guide: "row", name: "Тяга гантелі в нахилі", weight: "15 кг", side: "рука", sets: 4, target: 10, max: 15, levels: harderLevels("Тяга гантелі в нахилі"), cue: "Спина рівна, тягніть ліктем до стегна й зводьте лопатку." },
          { id: "thu_pullover", guide: "pullover", name: "Пуловер лежачи", weight: "15 кг", sets: 3, target: 10, max: 15, levels: harderLevels("Пуловер лежачи"), cue: "Лікті злегка зігнуті, опускайте гантель за голову без болю в плечах." },
          { id: "thu_y_raise", guide: "y_raise", name: "Y-підйоми лежачи на животі", weight: "без ваги", sets: 3, target: 10, max: 15, levels: harderLevels("Y-підйоми лежачи"), cue: "Руки літерою Y, піднімайте їх лопатками, шию не напружуйте." },
          { id: "thu_curl", guide: "curl", name: "Згинання на біцепс", weight: "10 кг", side: "рука", sets: 3, target: 8, max: 12, levels: harderLevels("Згинання на біцепс", [{ weight: "15 кг" }]).map((level, index) => (index > 1 ? { ...level, weight: "15 кг" } : level)), cue: "Лікоть біля тіла, не допомагайте корпусом." },
          { id: "thu_carry", guide: "carry", name: "Ходьба з гантеллю в одній руці", weight: "15 кг", side: "рука", sets: 3, target: 40, max: 60, unit: "с", cue: "Плечі на одному рівні, корпус не нахиляйте вбік." },
          { id: "thu_grip", guide: "grip", name: "Кистьовий еспандер", side: "рука", sets: 3, target: 15, max: 25, cue: "Стискайте повністю й повільно розтискайте." },
        ],
      },
    ],
  },
  3: {
    title: "Витривалість",
    muscles: { legs: 0.6, chest: 0.6, shoulders: 0.6, triceps: 0.5, core: 0.6 },
    warmup: WARMUPS.full,
    cooldown: COOLDOWNS.full,
    blocks: [
      {
        title: "Кола",
        note: "Виконуйте вправи одну за одною. Між колами відпочинок 2–3 хв.",
        circuit: true,
        exercises: [
          { id: "fri_pushup", guide: "pushup", name: "Віджимання", sets: 4, target: 12, cue: "Зберігайте техніку навіть наприкінці кола." },
          { id: "fri_squat", guide: "squat", name: "Присідання без ваги", sets: 4, target: 25, step: 2, cue: "Рівний темп, повна амплітуда." },
          { id: "fri_plank", guide: "plank", name: "Планка", sets: 4, target: 40, unit: "с", cue: "Якщо таз опускається, зупиніться." },
        ],
      },
      {
        title: "Після кіл",
        exercises: [
          { id: "fri_lunge", guide: "lunge", name: "Випади назад", weight: "без ваги", side: "нога", sets: 3, target: 10, max: 15, cue: "Крок назад, корпус прямий, переднє коліно стабільне." },
          { id: "fri_pike", guide: "pike_pushup", name: "Пайк-віджимання", sets: 3, target: 6, max: 12, levels: [{}, { name: "Пайк-віджимання з ногами на опорі", guide: "pike_pushup_elevated", cue: "Стопи на стільці чи дивані, таз високо над плечима. Ваги на руках більше." }], cue: "Таз високо, тіло як перевернута V. Голова опускається між руками, лікті йдуть назад, а не в боки." },
        ],
      },
    ],
  },
};

// Четвер 4-го тижня кожного циклу: замість кіл перевіряємо максимум.
const TEST_DAY = {
  title: "Тест на максимум",
  muscles: { chest: 1, triceps: 0.7, legs: 0.8, core: 1 },
  warmup: WARMUPS.full,
  cooldown: COOLDOWNS.full,
  test: true,
  blocks: [
    {
      title: "Один підхід на максимум",
      note: "Відпочинок між вправами 3–5 хв. Зупиняйтеся, коли техніка погіршується.",
      exercises: [
        { id: "test_pushup", guide: "pushup", name: "Віджимання", sets: 1, goal: 40, cue: "Рахуйте лише повторення з рівним тілом і повною амплітудою." },
        { id: "test_squat", guide: "squat", name: "Присідання без ваги", sets: 1, goal: 80, cue: "Рівний темп, п'яти не відриваються від підлоги." },
        { id: "test_plank", guide: "plank", name: "Планка", sets: 1, goal: 140, unit: "с", cue: "Зупиняйте час, коли таз починає опускатися." },
      ],
    },
  ],
};

// Загальні поради для днів відновлення; контекстні (стан м'язів, рух, наступне тренування) — у recovery.js.
// Текст про білок підставляється з останньої ваги (body.js), тут — запасний варіант.
const RECOVERY = {
  title: "День відновлення",
  intro: "Сьогодні без тренування. М'язи ростуть і відновлюються саме між навантаженнями.",
  items: [
    { name: "Сон", text: "7–9 годин. Намагайтеся лягати приблизно в той самий час." },
    { name: "Білок", text: "Приблизно 145–200 г на день. Це 1,6–2,2 г на кг при вазі 90 кг." },
    { name: "Вода", text: "Орієнтовно близько 3 л на день, у спеку більше." },
    { name: "Душ", text: "Теплий або контрастний, якщо вам так приємно. Це радше для самопочуття, ніж для помітного прискорення відновлення." },
  ],
  tips: [
    "Розподіліть білок на 3–4 прийоми їжі, приблизно по 35–50 г.",
    "Зручні джерела білка: курка, риба, яйця, сир, йогурт, бобові.",
    "Додавайте овочі або фрукти до кожного основного прийому їжі.",
    "Не прибирайте вуглеводи повністю: каша, картопля, рис і хліб допомагають відновити запаси енергії.",
    "Плануйте вечерю за 2–3 години до сну, щоб легше засинати.",
    "Приготуйте їжу наперед на кілька днів, тоді простіше дотримуватися норми білка.",
    "Алкоголь погіршує сон, а отже й відновлення. Якщо вживаєте, то помірно.",
  ],
};

// Розклад до 16.11.2026: спина в четвер, витривалість у п'ятницю (з тягою замість пайк-віджимань).
const SCHEDULE_HISTORY = [
  {
    until: "2026-11-16",
    testWeekday: 4,
    days: {
      0: TRAINING_DAYS[0],
      1: TRAINING_DAYS[1],
      3: TRAINING_DAYS[2],
      4: {
        ...TRAINING_DAYS[3],
        muscles: { legs: 0.6, chest: 0.6, back: 0.5, triceps: 0.5, core: 0.6 },
        blocks: TRAINING_DAYS[3].blocks.map((block) => ({
          ...block,
          exercises: block.exercises.map((exercise) =>
            exercise.id === "fri_pike"
              ? { id: "fri_row", guide: "row", name: "Тяга гантелі в нахилі", weight: "15 кг", side: "рука", sets: 3, target: 10, max: 15, cue: "Спина рівна, тягніть ліктем до стегна." }
              : exercise,
          ),
        })),
      },
    },
  },
];
const CURRENT_TEST_WEEKDAY = 3;

// З 23.11.2026: вакуум переходить з вівторка в кінець кожного тренування разом із «мертвим жуком».
// Тиждень 16–22.11 лишається в історії зі старим вівторком.
SCHEDULE_HISTORY.push({ until: "2026-11-23", testWeekday: 3, days: { ...TRAINING_DAYS } });
const CORE_BLOCK = {
  title: "Кор наприкінці",
  exercises: [
    { id: "core_bug", guide: "dead_bug", name: "«Мертвий жук»", side: "бік", sets: 2, target: 8, max: 12, levels: harderLevels("«Мертвий жук»"), cue: "Поперек увесь час притиснутий до підлоги. Опускайте руку й протилежну ногу повільно." },
    { id: "tue_vacuum", guide: "vacuum", name: "Вакуум на колінах", sets: 3, target: 15, max: 30, unit: "с", cue: "Повний видих, затягніть живіт під ребра й тримайте без вдиху." },
  ],
};
Object.keys(TRAINING_DAYS).forEach((index) => {
  const day = TRAINING_DAYS[index];
  TRAINING_DAYS[index] = {
    ...day,
    blocks: [...day.blocks.map((block) => ({ ...block, exercises: block.exercises.filter((exercise) => exercise.id !== "tue_vacuum") })), CORE_BLOCK],
  };
});

// З 30.11.2026: у понеділок найважчі віджимання першими, жим між віджиманнями, звичайних віджимань 3 підходи
// і довший відпочинок, щоб трицепс не «здувався» до кінця вправ.
SCHEDULE_HISTORY.push({ until: "2026-11-30", testWeekday: 3, days: { ...TRAINING_DAYS } });
{
  const monday = TRAINING_DAYS[0];
  const main = monday.blocks[0].exercises;
  const byId = (id) => main.find((exercise) => exercise.id === id);
  const PUSH_REST = 150;
  TRAINING_DAYS[0] = {
    ...monday,
    blocks: [
      {
        ...monday.blocks[0],
        note: "Відпочинок між підходами віджимань: 2–3 хв, щоб трицепс встигав відновитися.",
        exercises: [
          { ...byId("mon_decline"), rest: PUSH_REST },
          byId("mon_press"),
          { ...byId("mon_pushup"), sets: 3, rest: PUSH_REST },
          { ...byId("mon_narrow"), rest: PUSH_REST },
          byId("mon_plank"),
        ],
      },
      ...monday.blocks.slice(1),
    ],
  };
}

// З 30.11.2026: тяга й пуловер з 15 кг стали легкими (вдвічі більше за ціль два тижні поспіль),
// а важчої гантелі нема — тож повільний темп. Нові id, щоб ціль почалася з 10, а не зі старих 13.
{
  const pull = TRAINING_DAYS[2];
  const tempo = {
    thu_row: { id: "wed_row_tempo", guide: "row", name: "Тяга гантелі в нахилі, повільно", weight: "15 кг", side: "рука", sets: 4, target: 10, max: 15, repExtra: 4, levels: [{}, { name: "Тяга гантелі в нахилі, пауза 2 с угорі", repExtra: 5 }], cue: "Вгору за 1 с, пауза 1 с з ліктем біля стегна, опускання за 3 с." },
    thu_pullover: { id: "wed_pullover_tempo", guide: "pullover", name: "Пуловер лежачи, повільно", weight: "15 кг", sets: 3, target: 10, max: 15, repExtra: 4, levels: [{}, { name: "Пуловер лежачи, пауза 2 с за головою", repExtra: 5 }], cue: "Опускання за 3–4 с, пауза 1 с у розтягнутому положенні за головою, вгору спокійно." },
  };
  TRAINING_DAYS[2] = {
    ...pull,
    blocks: pull.blocks.map((block) => ({ ...block, exercises: block.exercises.map((exercise) => tempo[exercise.id] || exercise) })),
  };
}

// Розклад, що діяв на дату key (рядок РРРР-ММ-ДД).
// З 7.12.2026: функціональна сила замість росту м'язів. Навички на початку пн і чт, у основних вправах
// 3–8 якісних повторень з запасом і довгим відпочинком, руки окремо — на ріст. Паралетки 43 см.
SCHEDULE_HISTORY.push({ until: "2026-12-07", testWeekday: 3, days: { ...TRAINING_DAYS } });
{
  const STRENGTH_REST = 150;
  const STRENGTH_NOTE = "Зупиняйтеся за 1–2 повторення до межі: рух має лишатися чистим. Відпочинок 2–3 хв.";
  const SKILL_NOTE = "10–15 хв, поки ви свіжі. Без поспіху й без відмови: якість кожної спроби важливіша за кількість.";
  const ARMS_NOTE = "Руки — на ріст: тут можна дотискати до межі. Відпочинок 1–1,5 хв.";
  const old = { ...TRAINING_DAYS };
  const pick = (dayIndex, id) => old[dayIndex].blocks.flatMap((block) => block.exercises).find((exercise) => exercise.id === id);

  TRAINING_DAYS[0] = {
    ...old[0],
    title: "Жим, стійка, руки",
    blocks: [
      {
        title: "Навички",
        note: SKILL_NOTE,
        exercises: [
          { id: "skill_frog", guide: "frog_stand", name: "«Жабка»", sets: 3, target: 15, max: 30, unit: "с", levels: [{}, { name: "«Ворона»", guide: "crow", cue: "Коліна вище, під пахвами, руки майже прямі." }], cue: "Коліна на ліктях, вага вперед на пальці, погляд трохи вперед." },
          { id: "skill_wall_hspu", guide: "wall_hspu", name: "Віджимання в стійці біля стіни", sets: 4, target: 3, max: 6, rest: STRENGTH_REST, levels: [{}, { name: "Віджимання в стійці, голова до підлоги", cue: "Повна амплітуда: голова легко торкається рушника чи підлоги." }, { name: "Віджимання в стійці на паралетках", cue: "Руки на паралетках, голова опускається нижче рук." }], cue: "Опускайтеся лише настільки, наскільки контролюєте рух. Глибину додавайте поступово." },
        ],
      },
      {
        title: "Основна частина",
        note: STRENGTH_NOTE,
        exercises: [
          { id: "mon_archer", guide: "archer_pushup", name: "Archer-віджимання", side: "рука", sets: 4, target: 3, max: 6, rest: STRENGTH_REST, levels: [{}, { name: "Archer-віджимання на паралетках", cue: "Глибше: груди нижче рівня рук." }], cue: "Опускайтеся до робочої руки, друга лишається прямою. Важко — тільки повільне опускання." },
          { id: "mon_deep", guide: "deep_pushup", name: "Глибокі віджимання на паралетках", sets: 3, target: 6, max: 10, rest: STRENGTH_REST, levels: [{}, { name: "Глибокі віджимання на паралетках, ноги на опорі", cue: "Стопи на стільці, тіло рівне." }], cue: "Груди трохи нижче рук, пауза внизу без провалювання в плечах." },
          { id: "mon_tuck", guide: "tuck_sit", name: "Утримання з підтягнутими колінами на паралетках", sets: 3, target: 10, max: 20, unit: "с", levels: [{}, { name: "Утримання з однією прямою ногою", cue: "Одна нога пряма вперед, друга підтягнута. Міняйте ноги між підходами." }, { name: "Утримання кута", cue: "Обидві ноги прямі перед собою." }], cue: "Плечі вниз, від вух. Руки прямі." },
        ],
      },
      {
        title: "Руки",
        note: ARMS_NOTE,
        exercises: [
          { id: "mon_tri_ext", guide: "triceps_ext", name: "Розгинання гантелі з-за голови", weight: "15 кг", sets: 3, target: 10, max: 15, levels: harderLevels("Розгинання гантелі з-за голови"), cue: "Лікті дивляться вперед і не розходяться." },
        ],
      },
      CORE_BLOCK,
    ],
  };

  TRAINING_DAYS[1] = {
    ...old[1],
    title: "Ноги й баланс",
    blocks: [
      {
        title: "Основна частина",
        note: STRENGTH_NOTE,
        exercises: [
          { id: "tue_pistol", guide: "pistol_box", name: "Присідання на одній нозі до стільця", side: "нога", sets: 4, target: 4, max: 8, rest: STRENGTH_REST, levels: [{}, { name: "Присідання на одній нозі до низької опори", cue: "Опора на рівні дивана чи нижче." }, { name: "Присідання на одній нозі", cue: "Без опори, повна амплітуда. Вільна нога пряма вперед." }], cue: "Опускайтеся за 2–3 с, ледь торкніться опори й вставайте." },
          { id: "tue_split_power", guide: "split_squat", name: "Болгарські випади", weight: "15 кг", side: "нога", sets: 3, target: 6, max: 10, rest: STRENGTH_REST, levels: [{}, { name: "Болгарські випади, пауза 2 с унизу", repExtra: 2 }], cue: "Вниз контрольовано, вгору — потужно." },
          { id: "tue_sl_rdl", guide: "sl_rdl", name: "Румунська тяга на одній нозі", weight: "15 кг", side: "нога", sets: 3, target: 6, max: 10, rest: STRENGTH_REST, cue: "Таз рівно, вільна нога назад на одній лінії з корпусом." },
          pick(1, "tue_calves"),
          pick(1, "tue_hollow"),
        ],
      },
      CORE_BLOCK,
    ],
  };

  TRAINING_DAYS[2] = {
    ...old[2],
    title: "Тяга, руки, хват",
    blocks: [
      {
        title: "Основна частина",
        note: STRENGTH_NOTE,
        exercises: [
          { id: "wed_row_power", guide: "row", name: "Тяга гантелі однією рукою, вибухово", weight: "15 кг", side: "рука", sets: 4, target: 6, max: 10, rest: STRENGTH_REST, levels: [{}, { name: "Тяга гантелі однією рукою, пауза 2 с угорі", repExtra: 2 }], cue: "Вгору — різко, ніби заводите мотор. Вниз — повільно, за 2 с." },
          { id: "wed_table_row", guide: "table_row", name: "Тяга під столом", sets: 3, target: 6, max: 12, rest: STRENGTH_REST, levels: [{}, { name: "Тяга під столом, ноги на опорі", cue: "Стопи на стільці — тіло горизонтальніше й важче." }], cue: "Груди до краю стола, лопатки зводяться. Стіл має бути міцним." },
          pick(2, "thu_y_raise"),
          pick(2, "thu_carry"),
          { ...pick(2, "thu_grip"), guide: "finger_ext", name: "Розгинання пальців з еспандером", cue: "Розводьте пальці повністю, пауза 1 с, повертайте повільно." },
        ],
      },
      {
        title: "Руки",
        note: ARMS_NOTE,
        exercises: [
          pick(2, "thu_curl"),
          { id: "wed_hammer", guide: "hammer", name: "«Молотки»", weight: "15 кг", side: "рука", sets: 3, target: 10, max: 15, levels: harderLevels("«Молотки»"), cue: "Долоня дивиться на стегно, лікоть біля корпусу." },
        ],
      },
      CORE_BLOCK,
    ],
  };

  const endurance = old[3];
  TRAINING_DAYS[3] = {
    ...endurance,
    title: "Баланс і витривалість",
    blocks: [
      {
        title: "Навички",
        note: SKILL_NOTE,
        exercises: [
          { id: "skill_chest_wall", guide: "chest_wall_hs", name: "Стійка на руках грудьми до стіни", sets: 3, target: 20, max: 45, unit: "с", levels: [{}, { name: "Стійка грудьми до стіни, відриваючи п'яти", cue: "По черзі відривайте п'яти від стіни на 1–3 с, баланс тримайте пальцями." }], cue: "Тіло рівне, плечі до вух, погляд між руками." },
          { id: "skill_tripod_press", guide: "tripod_press", name: "Підйом з трикутника одним поштовхом", sets: 3, target: 2, max: 5, rest: STRENGTH_REST, levels: [{}, { name: "Підйом з трикутника одним поштовхом без стіни", cue: "На м'якому килимку, з вільним простором навколо." }], cue: "Руки й ноги разом, одним рухом. Стіна — тільки страховка." },
          { id: "skill_free_hs", guide: "free_hs", name: "Вільна стійка на руках — спроби", sets: 5, target: 3, max: 20, unit: "с", cue: "Відштовхніться від стіни й рахуйте секунди без опори. Найкращу спробу записуйте." },
        ],
      },
      ...endurance.blocks
        .filter((block) => block !== CORE_BLOCK)
        .map((block) => ({ ...block, exercises: block.exercises.filter((exercise) => exercise.id !== "fri_pike") }))
        .filter((block) => block.exercises.length),
      CORE_BLOCK,
    ],
  };
}

function scheduleFor(key) {
  const old = SCHEDULE_HISTORY.find((entry) => key < entry.until);
  return old ? { days: old.days, testWeekday: old.testWeekday } : { days: TRAINING_DAYS, testWeekday: CURRENT_TEST_WEEKDAY };
}

const REST_NOTE = "Відпочинок між підходами: 1–2 хв.";
