import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agentPosition, areaFor, areas, unknownArea, MAP_WIDTH, MAP_HEIGHT } from '../src/world/worldLayout.ts';

test('real location IDs map to separate bounded areas, not display names', () => {
  for (const id of ['home', 'cafe', 'work']) {
    const area = areaFor(id);
    assert.equal(area.id, id);
    for (const agent of ['agent-ana', 'agent-sofia']) {
      const position = agentPosition(agent, id);
      assert(position.x > area.x && position.x < area.x + area.width);
      assert(position.y > area.y && position.y < area.y + area.height);
    }
    assert(area.x >= 0 && area.x + area.width <= MAP_WIDTH);
    assert(area.y >= 0 && area.y + area.height <= MAP_HEIGHT);
  }
  assert.equal(new Set(areas.map(area => `${area.x}:${area.y}`)).size, 3);
  assert.equal(areaFor('Casa'), unknownArea);
});

test('co-located agents retain distinct slots independent of order or their neighbor', () => {
  for (const location of ['home', 'cafe', 'work', 'unknown']) {
    const both = ['agent-ana', 'agent-sofia'].map(id => [id, agentPosition(id, location)]);
    const reversed = ['agent-sofia', 'agent-ana'].map(id => [id, agentPosition(id, location)]);
    assert.deepEqual(Object.fromEntries(both), Object.fromEntries(reversed));
    assert(Math.abs(both[0][1].x - both[1][1].x) >= 90, 'Room for both 84px marker/name frames');
    const sofiaAlone = agentPosition('agent-sofia', location);
    agentPosition('agent-ana', 'work');
    assert.deepEqual(sofiaAlone, agentPosition('agent-sofia', location));
  }
});

test('unknown locations go to the labelled fallback, including prototype-like keys', () => {
  for (const location of ['', 'park', 'toString', '__proto__']) {
    assert.equal(areaFor(location), unknownArea);
    for (const id of ['agent-ana', 'agent-sofia']) {
      const point = agentPosition(id, location);
      assert(point.x > unknownArea.x && point.x < unknownArea.x + unknownArea.width);
      assert(point.y > unknownArea.y && point.y < unknownArea.y + unknownArea.height);
    }
  }
});
