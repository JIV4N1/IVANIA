import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { VisibleState } from '../api';
import type { createWorldGame, WorldView } from './createWorldGame';
import { areaFor, unknownArea } from './worldLayout';
import './worldMap.css';

export function WorldMap({ state, selectedId }: { state: VisibleState | null; selectedId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bridge = useRef<ReturnType<typeof createWorldGame> | null>(null);
  const latest = useRef<WorldView>({ agents: state?.agents ?? [], selectedId });
  const [error, setError] = useState(false);
  useLayoutEffect(() => {
    latest.current = { agents: state?.agents ?? [], selectedId };
    bridge.current?.update(latest.current);
  }, [state, selectedId]);

  useEffect(() => {
    let disposed = false;
    let instance: ReturnType<typeof createWorldGame> | undefined;
    let observer: ResizeObserver | undefined;
    // Each mount owns a distinct parent, including StrictMode's setup-cleanup-setup.
    const parent = document.createElement('div');
    parent.className = 'world-canvas-parent';
    hostRef.current!.appendChild(parent);
    void import('./createWorldGame').then(({ createWorldGame }) => {
      if (disposed) return;
      instance = createWorldGame(parent, latest.current);
      bridge.current = instance;
      observer = new ResizeObserver(() => instance?.resize());
      observer.observe(parent);
    }).catch(() => { if (!disposed) setError(true); });
    return () => {
      disposed = true;
      observer?.disconnect();
      if (bridge.current === instance) bridge.current = null;
      instance?.destroy();
      parent.remove(); // No stale canvas stays visible while Phaser finishes destruction.
    };
  }, []);

  return <section className="card world-map" aria-label="Ubicaciones actuales del mundo">
    <div className="world-heading"><h2>El mundo ahora</h2><span className="eyebrow">ESTADO ACTUAL</span></div>
    <p className="hint">Vista esquemática: las posiciones representan ubicaciones del mundo.</p>
    <div ref={hostRef} className="world-canvas" aria-hidden="true" />
    {error && <p role="status">No se pudo iniciar el mapa. Las ubicaciones actuales siguen disponibles abajo.</p>}
    <ul className="world-agents" aria-label="Agentes y ubicaciones actuales">
      {(state?.agents ?? []).map(agent => <li key={agent.id} className={agent.id === selectedId ? 'is-selected' : ''}>
        <strong>{agent.name}</strong><span>{agent.location}</span>
        {areaFor(agent.locationId) === unknownArea && <span>Ubicación no representada</span>}
        {agent.id === selectedId && <small>Seleccionado</small>}
      </li>)}
    </ul>
    {!state && <p className="hint">Esperando el estado del servidor…</p>}
  </section>;
}
