import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { createSimulationServer } from './server';
import { createActivityDemoSimulation } from '../activity/createActivityDemoSimulation';
import { LastConnectionRegistry } from '../activity/LastConnectionRegistry';
import { ActivitySummaryQueryResult } from '../activity/ActivitySummaryQueryResult';

export async function runServerTests(): Promise<void> {
  const simulation = createActivityDemoSimulation();
  const registry = new LastConnectionRegistry();
  const server = createSimulationServer(simulation, registry);
  let ticks = 0;
  const tick = simulation.engine.tick.bind(simulation.engine);
  simulation.engine.tick = () => { ticks++; return tick(); };
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/`;
  const snapshot = () => JSON.stringify({ world: simulation.world, clock: simulation.clock, ticks,
    ana: registry.get('agent-ana'), sofia: registry.get('agent-sofia') });
  const post = async (path: string, data: unknown) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  };
  const get = async () => {
    const response = await fetch(base + 'state');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response.json();
  };
  try {
    const initialSnapshot = snapshot();
    const initial = await get();
    assert.deepEqual(initial.moment, { day: 1, hour: 8, minute: 0 });
    assert.deepEqual(Object.keys(initial).sort(), ['agents', 'moment']);
    assert.equal(initial.agents.length, 2);
    assert.deepEqual(Object.keys(initial.agents[0]).sort(), ['id', 'lastConnection', 'location', 'name']);
    assert.deepEqual(await get(), initial);
    assert.equal(snapshot(), initialSnapshot);
    assert.equal((await post('return', { agentId: 'agent-ana', selectionPolicy: 'important' })).status, 'no-connection');
    assert.equal(snapshot(), initialSnapshot);

    await post('advance', { minutes: 5 });
    assert.equal(ticks, 1);
    assert.deepEqual((await get()).moment, { day: 1, hour: 8, minute: 5 });
    await post('advance', { minutes: 60 });
    assert.equal(ticks, 13);
    await post('departure', { agentId: 'agent-sofia' });
    const sofiaDeparture = registry.get('agent-sofia');
    await post('advance', { minutes: 480 });
    assert.equal(ticks, 109);
    assert.deepEqual((await get()).moment, { day: 1, hour: 17, minute: 5 });
    await post('departure', { agentId: 'agent-ana' });
    assert.deepEqual(registry.get('agent-sofia'), sofiaDeparture);
    const empty = await post('return', { agentId: 'agent-ana', selectionPolicy: 'balanced' });
    assert.equal(empty.status, 'ready');
    assert.equal(empty.result.totalEvents, 0);
    assert.equal(empty.result.totalItems, 0);
    assert.match(empty.presentation.brief, /No hay actividades/);
    await post('advance', { minutes: 60 });
    const beforeQuery = snapshot();
    const first = await post('return', { agentId: 'agent-ana', selectionPolicy: 'balanced' });
    assert.equal(snapshot(), beforeQuery);
    assert.deepEqual(await post('return', { agentId: 'agent-ana', selectionPolicy: 'balanced' }), first);
    assert.equal(snapshot(), beforeQuery);
    assert.deepEqual(first.result.to, { day: 1, hour: 18, minute: 5 });
    assert.equal(first.result.maxItems, 8);
    assert.equal(first.result.totalEvents, 2);
    assert.equal(first.result.selectedCount, 2);
    assert.match(first.presentation.brief, /17:45/);
    const saved = JSON.stringify(first);
    await post('advance', { minutes: 60 });
    await post('advance', { minutes: 60 });
    assert.equal(JSON.stringify(first), saved);
    const sofiaBefore = await post('return', { agentId: 'agent-sofia', selectionPolicy: 'important' });
    const eventsBefore = JSON.stringify(simulation.world);
    const confirmation = await post('confirm', { agentId: first.result.agentId, to: first.result.to });
    assert.deepEqual(confirmation.confirmedAt, first.result.to);
    assert.equal(JSON.stringify(simulation.world), eventsBefore);
    assert.deepEqual(await post('return', { agentId: 'agent-sofia', selectionPolicy: 'important' }), sofiaBefore);
    const later = await post('return', { agentId: 'agent-ana', selectionPolicy: 'important' });
    assert.equal(later.result.totalEvents, 2);
    assert.match(later.presentation.complete, /19:40/);
    assert.match(later.presentation.complete, /19:45/);
    const ids = new Set((first.result as ActivitySummaryQueryResult).completeItems.flatMap(item => item.eventIds));
    assert((later.result as ActivitySummaryQueryResult).completeItems.every(item => item.eventIds.every(id => !ids.has(id))));
    assert.deepEqual(await get(), confirmation.state, 'Another state request (browser reload) preserves the shared runtime');

    const invalid: [string, unknown][] = [
      ['advance', { minutes: 10 }], ['advance', { minutes: '60' }], ['advance', {}],
      ['departure', { agentId: 'missing' }], ['departure', { agentId: null }],
      ['return', { agentId: 'missing', selectionPolicy: 'important' }],
      ['return', { agentId: 'agent-ana', selectionPolicy: 'other' }], ['return', { agentId: 'agent-ana' }],
      ['confirm', { agentId: 'missing', to: first.result.to }],
      ...[null, [], {}, { day: 0, hour: 1, minute: 0 }, { day: 1, hour: 24, minute: 0 },
        { day: 1, hour: 20, minute: 1 }, { day: '1', hour: 20, minute: 0 },
        { day: 2, hour: 0, minute: 0 }, { day: 1, hour: 17, minute: 5 }].map(to =>
        ['confirm', { agentId: 'agent-ana', to }] as [string, unknown]),
    ];
    for (const [route, body] of invalid) {
      const before = snapshot();
      const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      assert([400, 409].includes(response.status));
      const error = await response.json();
      assert.equal(typeof error.error, 'string');
      assert.deepEqual(Object.keys(error), ['error']);
      assert.equal(snapshot(), before, `Invalid ${route} must not partially mutate state`);
    }
    for (const [body, contentType, expected] of [
      ['{broken', 'application/json', 400], ['null', 'application/json', 400], ['[]', 'application/json', 400],
      ['x'.repeat(9000), 'application/json', 413], ['{}', 'text/plain', 415],
    ] as const) {
      const before = snapshot();
      const response = await fetch(base + 'advance', { method: 'POST', headers: { 'Content-Type': contentType }, body });
      assert.equal(response.status, expected);
      assert.equal(typeof (await response.json()).error, 'string');
      assert.equal(snapshot(), before);
    }
    const beforeOrigin = snapshot();
    const rejected = await fetch(base + 'advance', { method: 'POST', headers: {
      'Content-Type': 'application/json', Origin: 'https://example.org',
    }, body: '{"minutes":5}' });
    assert.equal(rejected.status, 403);
    assert.equal(snapshot(), beforeOrigin);
    assert.equal((await fetch(base + 'missing')).status, 404);
    console.log('HTTP A-H passed: shared runtime, read-only state, exact ticks, independent agents, bounded confirmation, validation and no-connection vs empty.');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

if (require.main === module) runServerTests().catch(error => { console.error(error); process.exitCode = 1; });
