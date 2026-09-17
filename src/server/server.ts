import { createServer, IncomingMessage } from 'node:http';
import { createActivityDemoSimulation } from '../activity/createActivityDemoSimulation';
import { LastConnectionRegistry } from '../activity/LastConnectionRegistry';
import { ActivitySummaryService } from '../activity/ActivitySummaryService';
import { ActivitySummaryFromConnectionService } from '../activity/ActivitySummaryFromConnectionService';
import { ActivitySummaryMoment, ActivitySummaryPresenter } from '../activity/ActivitySummaryPresenter';
import { compareActivitySummaryMoments, validateActivitySummaryMoment } from '../activity/activitySummaryMoment';
import { MINUTES_PER_TICK } from '../simulation/SimulationClock';

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const MAX_BODY_BYTES = 8192;
function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    request.resume();
    return Promise.reject(new HttpError(415, 'Envía el cuerpo como application/json.'));
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        chunks.length = 0;
        reject(new HttpError(413, 'La solicitud supera el límite de 8 KiB.'));
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      if (size > MAX_BODY_BYTES) return;
      try {
        const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
        resolve(value as Record<string, unknown>);
      } catch { reject(new HttpError(400, 'JSON inválido: se esperaba un objeto.')); }
    });
    request.on('error', () => reject(new HttpError(400, 'No se pudo leer la solicitud.')));
    request.on('aborted', () => reject(new HttpError(400, 'Solicitud interrumpida.')));
  });
}

/** One runtime per server, shared across all HTTP requests and browser tabs. */
export function createSimulationServer(
  simulation = createActivityDemoSimulation(), connections = new LastConnectionRegistry(),
) {
  const { world, clock, engine, events } = simulation;
  const summaries = new ActivitySummaryFromConnectionService(connections, new ActivitySummaryService(events));
  const presenter = new ActivitySummaryPresenter();
  const now = (): ActivitySummaryMoment =>
    ({ day: clock.getDay(), hour: clock.getHour(), minute: clock.getMinute() });
  const state = () => ({
    moment: now(),
    agents: world.agents.map(agent => ({ id: agent.id, name: agent.name, locationId: agent.locationId,
      location: world.getLocationById(agent.locationId)?.name ?? agent.locationId,
      lastConnection: connections.get(agent.id) ?? null })),
  });
  return createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const origin = request.headers.origin;
      if (origin && !['http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin)) {
        throw new HttpError(403, 'Origen no permitido para este prototipo local.');
      }
      if (request.method === 'GET' && request.url === '/api/state') {
        response.end(JSON.stringify(state()));
        return;
      }
      const routes = ['/api/advance', '/api/departure', '/api/return', '/api/confirm'];
      if (request.method !== 'POST' || !routes.includes(request.url ?? '')) {
        throw new HttpError(404, 'Ruta o método no disponible.');
      }
      const body = await readBody(request);
      let payload: unknown;
      if (request.url === '/api/advance') {
        if (typeof body.minutes !== 'number' || ![5, 60, 480].includes(body.minutes)) {
          throw new HttpError(400, 'Incremento inválido. Usa 5, 60 o 480 minutos.');
        }
        for (let i = 0; i < body.minutes / MINUTES_PER_TICK; i++) engine.tick();
        payload = state();
      } else {
        const agentId = body.agentId;
        if (typeof agentId !== 'string' || !world.getAgentById(agentId)) {
          throw new HttpError(400, 'Agente inexistente. Selecciona Ana o Sofía.');
        }
        if (request.url === '/api/departure') {
          connections.register(agentId, now());
          payload = state();
        } else if (request.url === '/api/return') {
          if (body.selectionPolicy !== 'important' && body.selectionPolicy !== 'balanced') {
            throw new HttpError(400, 'Política inválida. Usa important o balanced.');
          }
          const cutoff = now();
          const result = summaries.getSummaryAt(agentId, cutoff, 8, body.selectionPolicy);
          payload = result ? { status: 'ready', result,
            presentation: {
              brief: presenter.present(result.selectedItems, result.totalItems, result.from, result.to),
              complete: presenter.present(result.completeItems, result.totalItems, result.from, result.to),
            }, state: state() } : { status: 'no-connection', agentId, state: state() };
        } else {
          if (!body.to || typeof body.to !== 'object' || Array.isArray(body.to)) {
            throw new HttpError(400, 'Momento inválido. Envía day, hour y minute.');
          }
          const to = body.to as ActivitySummaryMoment;
          try { validateActivitySummaryMoment(to); }
          catch { throw new HttpError(400, 'Momento inválido: día entero desde 1, hora 0–23 y minutos 0–55 en múltiplos de 5.'); }
          if (compareActivitySummaryMoments(to, now()) > 0) {
            throw new HttpError(400, 'El corte no puede ser posterior al reloj actual.');
          }
          const previous = connections.get(agentId);
          if (!previous) throw new HttpError(409, 'No hay una salida registrada para este agente.');
          if (compareActivitySummaryMoments(to, previous) < 0) {
            throw new HttpError(409, 'El corte es anterior a la última conexión registrada. Consulta de nuevo.');
          }
          connections.register(agentId, to);
          payload = { confirmedAt: connections.get(agentId), state: state() };
        }
      }
      response.end(JSON.stringify(payload));
    } catch (error) {
      response.statusCode = error instanceof HttpError ? error.status : 500;
      response.end(JSON.stringify({ error: error instanceof HttpError ? error.message : 'No se pudo completar la operación.' }));
    }
  });
}

if (require.main === module) {
  const server = createSimulationServer();
  server.on('error', error => { console.error(`No se pudo iniciar el servidor: ${error.message}`); process.exitCode = 1; });
  server.listen(3001, '127.0.0.1', () => console.log('IVANIA HTTP: http://127.0.0.1:3001 (estado en memoria, avance manual)'));
}
