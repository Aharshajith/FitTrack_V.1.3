const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function mount(file, name, props, db, returned) {
  const screensDirectory = path.join(
    __dirname,
    '..',
    'src',
    'screens'
    );

    const baseName = file.replace(/\.(js|jsx)$/i, '');

    const candidates = [
    path.join(screensDirectory, `${baseName}.js`),
    path.join(screensDirectory, `${baseName}.jsx`),
    ];

    const screenPath = candidates.find((candidate) =>
    fs.existsSync(candidate)
    );

    if (!screenPath) {
    throw new Error(
        `Screen file not found. Checked:\n${candidates.join('\n')}`
    );
    }

    let source = fs.readFileSync(screenPath, 'utf8');

  source = source
    .replace(/^import\s[\s\S]*?;\s*/gm, '')
    .replace('export default function ', 'function ');

  // Supports both:
  // return <ScreenLayout ...>
  // return ( <ScreenLayout ...> )
  const render =
    /^  return\s*(?:\(\s*)?<ScreenLayout\b/m.exec(source);

  if (!render) {
    throw new Error(
      `Cannot locate ${file} render boundary; update this test harness.`
    );
  }

  source =
    source.slice(0, render.index) +
    `\n return {${returned}};\n}\nthis.Component = ${name};`;

  const slots = [];
  const effects = [];
  const alerts = [];

  let cursor = 0;
  let focus;

  const context = {
    createStyles: () => ({}),

    useThemeStyles: () => ({
      colors: {},
      styles: {},
      shared: {},
    }),
    
    console,
    Number,
    String,
    Promise,

    getDatabase: async () => db,

    withDatabaseTransaction: async (task) => task(db),

    useState(value) {
      const index = cursor++;

      if (!(index in slots)) slots[index] = value;

      return [
        slots[index],
        (next) => {
          slots[index] =
            typeof next === 'function'
              ? next(slots[index])
              : next;
        },
      ];
    },

    useRef(value) {
      const index = cursor++;

      if (!(index in slots)) {
        slots[index] = { current: value };
      }

      return slots[index];
    },

    useCallback(fn, deps) {
      const index = cursor++;
      const previous = slots[index];

      if (
        !previous ||
        deps.some(
          (dep, position) =>
            !Object.is(dep, previous.deps[position])
        )
      ) {
        slots[index] = { fn, deps };
      }

      return slots[index].fn;
    },

    useFocusEffect(fn) {
      focus = fn;
    },

    useEffect(fn, deps) {
      const index = cursor++;
      const previous = slots[index];

      if (
        !previous ||
        deps.some((dep, position) => dep !== previous[position])
      ) {
        effects.push(fn);
      }

      slots[index] = deps;
    },

    Alert: {
      alert: (...args) => alerts.push(args),
    },
  };

  vm.runInNewContext(source, context);

  return {
    render() {
      cursor = 0;
      return context.Component(props);
    },

    focus: () => focus(),

    effects: () =>
      effects.splice(0).forEach((fn) => fn()),

    alerts,
  };
}

const tick = () =>
  new Promise((resolve) => setImmediate(resolve));

const timeout = setTimeout(() => {
  console.error('FAIL: draft test timed out');
  process.exit(1);
}, 5000);

(async () => {
  const plans = [
    { id: 1, name: 'A' },
    { id: 2, name: 'B' },
  ];

  const db = {
    getFirstAsync: async (_sql, id) =>
      plans.find((plan) => plan.id === id),

    getAllAsync: async () => [
      {
        id: 1,
        name: 'Squats',
        sets: 3,
        reps: 12,
      },
    ],
  };

  const ui = mount(
    'WorkoutSessionScreen.js',
    'WorkoutSessionScreen',
    {
      navigation: { setParams() {} },
      route: {},
    },
    db,
    'choosePlan, selectedPlan, items, duration, setDuration, update'
  );

  let screen = ui.render();

  await screen.choosePlan(plans[0]);

  screen = ui.render();
  screen.setDuration('45');
  screen.update(1, 'weight', '25');

  screen = ui.render();

  // Cancel switching: the original draft must remain.
  let pending = screen.choosePlan(plans[1]);
  ui.alerts.at(-1)[2][0].onPress();

  await pending;

  screen = ui.render();

  assert.equal(screen.selectedPlan.id, 1);
  assert.equal(screen.duration, '45');
  assert.equal(screen.items[0].weight, '25');

  // Confirm switching: the next plan should open.
  pending = screen.choosePlan(plans[1]);
  ui.alerts.at(-1)[2][1].onPress();

  await pending;

  screen = ui.render();

  assert.equal(screen.selectedPlan.id, 2);
  assert.equal(screen.duration, '30');

  // Missing plans must not destroy the current draft.
  pending = screen.choosePlan({ id: 999 });
  ui.alerts.at(-1)[2][1].onPress();

  await pending;

  assert.equal(
    ui.render().selectedPlan.id,
    2,
    'Missing plan must preserve the previous draft'
  );

  const profileDb = {
    getFirstAsync: async () => ({
      id: 1,
      name: 'Saved name',
      age: 24,
      height: 150,
    }),
  };

  const profile = mount(
    'ProfileScreen.js',
    'ProfileScreen',
    {},
    profileDb,
    'name, setName, dirty, load'
  );

  let form = profile.render();
  await form.load();

  form = profile.render();

  assert.equal(form.name, 'Saved name');

  form.dirty.current = true;
  form.setName('Unsaved draft');

  profile.render();
  profile.focus();

  await tick();

  assert.equal(
    profile.render().name,
    'Unsaved draft'
  );

  console.log(
    'PASS: workout replacement/cancel, missing-plan preservation, profile drafts.'
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    clearTimeout(timeout);
  });