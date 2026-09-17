// Display coordinates only: these never enter the simulation or HTTP requests.
export const MAP_WIDTH = 720;
export const MAP_HEIGHT = 420;
export const areas = [
  { id: 'home', label: 'Casa', x: 20, y: 20, width: 216, height: 252, color: 0x244843 },
  { id: 'cafe', label: 'Cafetería', x: 252, y: 20, width: 216, height: 252, color: 0x40364d },
  { id: 'work', label: 'Trabajo', x: 484, y: 20, width: 216, height: 252, color: 0x283f59 },
] as const;
export const unknownArea = { id: 'unrepresented', label: 'Ubicación no representada',
  x: 20, y: 292, width: 680, height: 108, color: 0x28303c };

export function areaFor(locationId: string) {
  return areas.find(area => area.id === locationId) ?? unknownArea;
}

/** Fixed slots by ID prevent reordering or a departing neighbor from moving a marker. */
export function agentPosition(agentId: string, locationId: string) {
  const area = areaFor(locationId);
  const slot = agentId === 'agent-sofia' ? 1 : 0;
  return area === unknownArea
    ? { x: area.x + 405 + slot * 140, y: area.y + 38 }
    : { x: area.x + 62 + slot * 92, y: area.y + 158 };
}
