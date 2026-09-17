import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { extname, join } from 'node:path';
import { World } from '../world/World';
import { EventManager } from '../events/EventManager';
import { SimulationClock } from '../simulation/SimulationClock';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { ActivitySummaryItem } from './ActivitySummaryItem';
import { ActivitySummaryMoment, ActivitySummaryPresenter } from './ActivitySummaryPresenter';
import { ActivitySummaryService } from './ActivitySummaryService';
import { activityCategory, ActivitySummarySelection, ActivitySummarySelector } from './ActivitySummarySelector';
import { runActivitySummaryDemo } from './demoActivitySummary';

export function runActivitySummaryScenarioTests(): void {
  const minutes = (m: ActivitySummaryMoment) => m.day * 1440 + m.hour * 60 + m.minute;
  const start = (item: ActivitySummaryItem) =>
    minutes({ day: item.startDay, hour: item.startHour, minute: item.startMinute });
  const cases = [
    { name: 'diurno', from: { day: 1, hour: 10, minute: 0 }, to: { day: 1, hour: 18, minute: 0 }, ticks: 120, nights: 0 },
    { name: 'nocturno', from: { day: 1, hour: 22, minute: 0 }, to: { day: 2, hour: 8, minute: 0 }, ticks: 288, nights: 1 },
    { name: 'varios-dias', from: { day: 1, hour: 10, minute: 0 }, to: { day: 3, hour: 18, minute: 0 }, ticks: 696, nights: 2 },
  ];

  // Observe public methods without altering any decision, event or tick result.
  const capture = (scenario: typeof cases[number], full: boolean, debug: boolean,
    selection: ActivitySummarySelection = 'important') => {
    const originalTick = SimulationEngine.prototype.tick;
    const originalClockTick = SimulationClock.prototype.tick;
    const originalGetAgent = World.prototype.getAgentById;
    const originalPresent = ActivitySummaryPresenter.prototype.present;
    const originalSelect = ActivitySummarySelector.prototype.select;
    const originalLog = console.log;
    const engines = new Set<SimulationEngine>();
    const output: string[] = [];
    let world: World | undefined;
    let clock: SimulationClock | undefined;
    let ticks = 0;
    let selections = 0;
    let worldAfterSimulation = '';
    let shown: readonly ActivitySummaryItem[] = [];
    let from: ActivitySummaryMoment | undefined;
    let to: ActivitySummaryMoment | undefined;
    try {
      ActivitySummarySelector.prototype.select = function (...args) {
        selections++;
        return originalSelect.apply(this, args);
      };
      World.prototype.getAgentById = function (id) {
        world = this;
        return originalGetAgent.call(this, id);
      };
      SimulationClock.prototype.tick = function () {
        clock = this;
        originalClockTick.call(this);
      };
      SimulationEngine.prototype.tick = function () {
        engines.add(this);
        const result = originalTick.call(this);
        if (++ticks === scenario.ticks) worldAfterSimulation = JSON.stringify(world);
        return result;
      };
      ActivitySummaryPresenter.prototype.present = function (items, total, last, query) {
        shown = items;
        from = last;
        to = query;
        const before = JSON.stringify(items);
        const result = originalPresent.call(this, items, total, last, query);
        assert.equal(JSON.stringify(items), before, 'Presentation does not mutate items or eventIds');
        return result;
      };
      console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
      const summary = runActivitySummaryDemo({ scenario: scenario.name, full, debug, selection });
      assert(world && clock);
      assert.equal(ticks, scenario.ticks);
      assert.equal(engines.size, 1);
      assert.equal(selections, full ? 0 : 1);
      assert.deepEqual(from, scenario.from);
      assert.deepEqual(to, scenario.to);
      assert.deepEqual({ day: clock.getDay(), hour: clock.getHour(), minute: clock.getMinute() }, scenario.to);
      assert.equal(JSON.stringify(world), worldAfterSimulation,
        'Queries, presentation and diagnostics leave the entire final world unchanged');
      return { summary, world, clock, shown, output };
    } finally {
      SimulationEngine.prototype.tick = originalTick;
      SimulationClock.prototype.tick = originalClockTick;
      World.prototype.getAgentById = originalGetAgent;
      ActivitySummaryPresenter.prototype.present = originalPresent;
      ActivitySummarySelector.prototype.select = originalSelect;
      console.log = originalLog;
    }
  };

  const presentations = new Map<string, string>();
  for (const scenario of cases) {
    for (const full of [false, true]) {
      for (const debug of [false, true]) {
        const run = capture(scenario, full, debug);
        const { summary, world, shown } = run;
        const beforeQueries = JSON.stringify(world);
        const service = new ActivitySummaryService(new EventManager(world, run.clock));
        const args: [string, number, number, number] =
          ['agent-ana', scenario.from.day, scenario.from.hour, scenario.from.minute];
        assert.deepEqual(summary, service.getSummaryForAgent(...args));
        const complete = service.getFormattedSummaryForAgent(...args);
        const brief = service.getBriefSummaryForAgent(...args);
        assert.deepEqual(shown, full ? complete : brief);
        assert.equal(JSON.stringify(world), beforeQueries);
        assert.deepEqual(summary.events, world.events.filter(event =>
          event.agentIds.includes('agent-ana') && minutes(event) > minutes(scenario.from)));
        for (const event of summary.events) {
          assert(event.agentIds.includes('agent-ana'));
          assert(minutes(event) > minutes(scenario.from));
          assert(minutes(event) <= minutes(scenario.to));
          assert.deepEqual(event, world.events.find(original => original.id === event.id));
        }
        assert.equal(summary.totalEvents, summary.events.length);
        assert(brief.length <= 8);
        const key = (item: ActivitySummaryItem) => item.eventIds.join(',');
        const selectedKeys = new Set(brief.map(key));
        for (const selected of brief) {
          assert.deepEqual(selected, complete.find(item => key(item) === key(selected)));
          for (const omitted of complete.filter(item => !selectedKeys.has(key(item)))) {
            assert(selected.importance >= omitted.importance, 'Coverage never displaces higher importance');
            if (selected.importance === omitted.importance && selected.type === 'AGENT_MOVED') {
              assert.equal(omitted.type, 'AGENT_MOVED', 'Activities precede MOVE at equal importance');
            }
          }
        }
        const eventOrder = new Map(summary.events.map((event, index) => [event.id, index]));
        for (const ordered of [complete, brief]) {
          for (let i = 1; i < ordered.length; i++) {
            assert(start(ordered[i - 1]) <= start(ordered[i]));
            if (start(ordered[i - 1]) === start(ordered[i])) {
              assert(eventOrder.get(ordered[i - 1].eventIds[0])! < eventOrder.get(ordered[i].eventIds[0])!);
            }
          }
        }

        const sleeps = summary.events.filter(event => event.type === 'AGENT_WENT_TO_SLEEP');
        const wakes = summary.events.filter(event => event.type === 'AGENT_WOKE_UP');
        const cycles = complete.filter(item => item.type === 'AGENT_WENT_TO_SLEEP');
        assert.equal(sleeps.length, scenario.nights);
        assert.equal(wakes.length, scenario.nights);
        assert.equal(cycles.length, scenario.nights);
        for (let i = 0; i < cycles.length; i++) {
          assert.deepEqual(cycles[i].eventIds, [sleeps[i].id, wakes[i].id]);
          assert.equal(cycles[i].startDay, sleeps[i].day);
          assert.equal(cycles[i].endDay, wakes[i].day);
          assert.equal(wakes[i].day, sleeps[i].day + 1);
          if (i > 0) assert(minutes(sleeps[i]) > minutes(wakes[i - 1]));
        }
        assert.equal(new Set(cycles.flatMap(item => item.eventIds)).size, scenario.nights * 2);

        assert.equal(run.output.length, debug ? 2 : 1);
        const presentation = run.output[0];
        const modeKey = `${scenario.name}:${full}`;
        if (debug) {
          assert.equal(presentation, presentations.get(modeKey));
          assert.match(run.output[1], /^\nDiagnóstico\n/);
          assert(run.output[1].includes(`Escenario: ${scenario.name}`));
          assert(run.output[1].includes(`Ticks ejecutados: ${scenario.ticks}`));
          assert(run.output[1].includes(`Presentación actual: ${shown.length} mostrados | ${complete.length - shown.length} omitidos`));
        } else presentations.set(modeKey, presentation);
        const lines = presentation.split('\n');
        assert.equal(lines.slice(3, -2).length, shown.length);
        assert.equal(lines.at(-1), `Mostrando ${shown.length} de ${complete.length} actividades.`);
        if (scenario.name === 'diurno') {
          assert.equal(summary.totalEvents, 26);
          assert.equal(complete.length, 22);
          assert.equal(brief.length, 8);
          assert.equal(lines[1], 'Día 1 · 10:00–18:00');
        } else {
          assert.equal(lines[1], scenario.name === 'nocturno'
            ? 'Día 1 · 22:00 → Día 2 · 08:00' : 'Día 1 · 10:00 → Día 3 · 18:00');
          assert(lines.slice(3, -2).every(line => /^Día \d+ · /.test(line)));
          if (full) {
            for (const cycle of cycles) {
              const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              assert(lines.includes(`Día ${cycle.startDay} · ${hhmm(cycle.startHour, cycle.startMinute)} → Día ${cycle.endDay} · ${hhmm(cycle.endHour, cycle.endMinute)} | Dormiste en Casa.`));
            }
          }
        }
        if (!full && !debug) console.log(`Scenario ${scenario.name}: ${scenario.ticks} ticks, ${summary.totalEvents} events, ${complete.length} full, ${brief.length} brief, ${cycles.length} sleep cycles passed.`);
      }
    }
  }

  for (const scenario of cases) {
    const important = capture(scenario, false, true);
    const balanced = capture(scenario, false, true, 'balanced');
    const fullItems = (run: typeof balanced) => new ActivitySummaryService(new EventManager(run.world, run.clock))
      .getFormattedSummaryForAgent('agent-ana', scenario.from.day, scenario.from.hour, scenario.from.minute);
    const complete = fullItems(balanced);
    // IDs are random per simulation; compare all event contents and item membership by event position.
    assert.deepEqual(balanced.summary.events.map(({ id, ...event }) => event),
      important.summary.events.map(({ id, ...event }) => event));
    const normalizedItems = (run: typeof balanced) => fullItems(run).map(item => ({ ...item,
      eventIds: item.eventIds.map(id => run.summary.events.findIndex(event => event.id === id)) }));
    assert.deepEqual(normalizedItems(balanced), normalizedItems(important));
    assert.equal(balanced.shown.length, Math.min(8, complete.length));
    assert.deepEqual(balanced.shown, new ActivitySummarySelector().select(complete, 8, 'balanced'));
    assert.equal(new Set(balanced.shown.flatMap(item => item.eventIds)).size,
      balanced.shown.flatMap(item => item.eventIds).length);
    const available = new Set(complete.map(activityCategory));
    const represented = new Set(balanced.shown.map(activityCategory));
    for (const category of available) if (category !== 'MOVE') assert(represented.has(category));
    if (scenario.name === 'varios-dias') {
      assert(represented.has('SLEEP'));
      assert(represented.has('WORK'));
    }
    assert.equal(capture(scenario, false, false, 'balanced').output[0], balanced.output[0]);
    const full = capture(scenario, true, true, 'balanced');
    assert.equal(full.output[0], presentations.get(`${scenario.name}:true`));
    assert(full.output[1].includes('no se aplica al modo completo'));
    assert(balanced.output[1].includes('Política aplicada: balanced'));
    for (const category of ['SOCIAL', 'SLEEP', 'WORK', 'EAT', 'REST', 'MOVE']) {
      assert(balanced.output[1].includes(`${category}: ${complete.filter(item => activityCategory(item) === category).length} disponibles | ${balanced.shown.filter(item => activityCategory(item) === category).length} seleccionados`));
    }
  }

  // Exercise the actual entry point in both source (tsx) and compiled test runs.
  const extension = extname(__filename);
  const demoPath = join(__dirname, `demoActivitySummary${extension}`);
  const enginePath = join(__dirname, '..', 'simulation', `SimulationEngine${extension}`);
  for (const args of [['--scenario', 'inexistente'], ['--scenario'], ['--scenario', '--full'],
    ['--selection'], ['--selection', '--debug'], ['--full', '--selection', 'invalid'],
    ['--selection', 'invalid', '--selection', 'balanced']]) {
    const script = `
      require(${JSON.stringify(enginePath)}).SimulationEngine.prototype.tick = function () {
        process.stderr.write('UNEXPECTED_TICK'); process.exit(99);
      };
      process.argv = [process.execPath, ${JSON.stringify(demoPath)}, ...${JSON.stringify(args)}];
      require('node:module').runMain(${JSON.stringify(demoPath)});
    `;
    const result = spawnSync(process.execPath, [...process.execArgv, '-e', script], { encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Escenario desconocido|Falta el valor de --scenario|Selección desconocida|Falta el valor de --selection/);
    assert(!result.stderr.includes('UNEXPECTED_TICK'));
    assert.equal(result.stdout, '');
  }
  for (const args of [
    ['--scenario', 'nocturno', '--full', '--debug'],
    ['--debug', '--full', '--scenario', 'nocturno'],
    ['--full', '--scenario', 'nocturno', '--debug'],
    ['--selection', 'balanced', '--scenario', 'nocturno', '--full', '--debug'],
    ['--debug', '--selection', 'balanced', '--full', '--scenario', 'nocturno'],
    ['--full', '--scenario', 'nocturno', '--selection', 'important', '--debug'],
  ]) {
    const result = spawnSync(process.execPath, [...process.execArgv, demoPath, ...args], { encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trimEnd().split('\n\nDiagnóstico\n')[0], presentations.get('nocturno:true'));
  }
  for (const selection of ['important', 'balanced'] as const) {
    const result = spawnSync(process.execPath, [...process.execArgv, demoPath,
      '--debug', '--scenario', 'varios-dias', '--selection', selection], { encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trimEnd().split('\n\nDiagnóstico\n')[0],
      capture(cases[2], false, false, selection).output[0]);
    assert(result.stdout.includes(`Política aplicada: ${selection}`));
  }
  console.log('Scenario CLI: flag order and invalid arguments rejected before any tick passed.');
}
