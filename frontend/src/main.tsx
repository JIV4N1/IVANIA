import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { request, type Moment, type Policy, type ReadySummary, type ReturnResponse, type VisibleState } from './api';
import './styles.css';
import { WorldMap } from './world/WorldMap';

const time = (m: Moment) => `${String(m.hour).padStart(2, '0')}:${String(m.minute).padStart(2, '0')}`;
const moment = (m: Moment) => `Día ${m.day} · ${time(m)}`;
const policyLabel = (p: Policy) => p === 'important' ? 'Más importantes' : 'Equilibrado';

function Presentation({ text }: { text: string }) {
  const [title, interval, ...lines] = text.split('\n');
  return <><h2>{title}</h2><p className="interval">{interval}</p>
    <div className="activity-lines">{lines.filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}</div></>;
}

function App() {
  const [state, setState] = useState<VisibleState | null>(null);
  const [agentId, setAgentId] = useState('agent-ana');
  const [policy, setPolicy] = useState<Policy>('important');
  const [summary, setSummary] = useState<ReadySummary | null>(null);
  const [full, setFull] = useState(false);
  const [confirmed, setConfirmed] = useState<Moment | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const busyRef = useRef(true);
  const selectionVersion = useRef(0);
  const agent = state?.agents.find(item => item.id === agentId);

  useEffect(() => {
    let active = true;
    request<VisibleState>('state').then(value => { if (active) setState(value); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) { setBusy(false); busyRef.current = false; } });
    return () => { active = false; };
  }, []);

  async function perform(action: 'refresh' | 'advance' | 'departure' | 'return' | 'confirm', minutes?: number) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(''); setNotice('');
    const version = selectionVersion.current;
    const stillSelected = () => selectionVersion.current === version;
    try {
      if (action === 'refresh' || action === 'advance' || action === 'departure') {
        const data = await request<VisibleState>(action === 'refresh' ? 'state' : action,
          action === 'refresh' ? undefined : action === 'advance' ? { minutes } : { agentId });
        setState(data);
        if (stillSelected() && action === 'departure') {
          setSummary(null); setConfirmed(null); setFull(false);
          setNotice(`Salida registrada: ${moment(data.agents.find(item => item.id === agentId)!.lastConnection!)}.`);
        }
        if (stillSelected() && action === 'advance') setNotice('Reloj actualizado. El resultado mostrado conserva su intervalo original.');
      } else if (action === 'return') {
        const data = await request<ReturnResponse>('return', { agentId, selectionPolicy: policy });
        setState(data.state);
        if (stillSelected()) {
          setConfirmed(null); setFull(false);
          setSummary(data.status === 'ready' ? data : null);
          setNotice(data.status === 'no-connection' ? 'Sin salida registrada. Registra una salida para consultar tu próxima ausencia.' : 'Resumen consultado. La última conexión aún no se ha actualizado.');
        }
      } else if (summary && !confirmed && summary.result.agentId === agentId) {
        const data = await request<{ confirmedAt: Moment; state: VisibleState }>('confirm', {
          agentId: summary.result.agentId, to: summary.result.to,
        });
        setState(data.state);
        if (stillSelected()) { setConfirmed(data.confirmedAt); setNotice(`Regreso confirmado hasta ${moment(data.confirmedAt)}.`); }
      }
    } catch (e) {
      if (stillSelected()) setError(e instanceof Error ? e.message : 'No se pudo completar la operación.');
    } finally { busyRef.current = false; setBusy(false); }
  }

  function changeAgent(value: string) {
    selectionVersion.current++;
    setAgentId(value); setSummary(null); setConfirmed(null); setFull(false); setNotice(''); setError('');
  }

  return <div className="app-shell">
    <header className="topbar"><a href="/" className="brand" aria-label="IVANIA inicio"><span className="brand-mark">IV</span>IVANIA</a>
      <span className="environment">SIMULACIÓN LOCAL <span>·</span> EN MEMORIA</span></header>
    <main>
      <div className="intro"><div><p className="eyebrow">UN MUNDO, DOS HISTORIAS</p><h1>Cada regreso<br />tiene una historia.</h1>
        <p className="intro-copy">Consulta lo que ocurrió durante tu ausencia.<br className="desktop-break" /> Tú decides cuándo cerrar ese capítulo.</p></div>
        <section className="clock" aria-label="Reloj simulado"><span className="eyebrow">TIEMPO DEL MUNDO</span>
          <strong>{state ? time(state.moment) : '––:––'}</strong><span>{state ? `Día ${state.moment.day}` : 'Conectando…'} <i>·</i> avance manual</span></section>
      </div>
      <div className="workspace">
        <aside className="controls"><section className="card agent-card"><p className="eyebrow">TU PERSPECTIVA</p>
          <label htmlFor="agent">Agente</label><select id="agent" value={agentId} onChange={e => changeAgent(e.target.value)} disabled={!state}>
            {(state?.agents ?? [{ id: 'agent-ana', name: 'Ana' }, { id: 'agent-sofia', name: 'Sofía' }]).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <dl><div><dt>Ubicación actual</dt><dd>{agent?.location ?? '—'}</dd></div>
            <div><dt>Última conexión</dt><dd>{agent?.lastConnection ? moment(agent.lastConnection) : 'Sin salida registrada'}</dd></div></dl>
          <button className="secondary wide" disabled={busy || !agent} onClick={() => perform('departure')}>Registrar salida</button>
          <p className="hint">Guarda el momento actual como inicio de tu próxima ausencia.</p>
        </section>
        <section className="card time-controls"><p className="eyebrow">CONTROLES DE DESARROLLO</p><h3>Avanzar el mundo</h3>
          <div className="tick-buttons">{[[5, '5 min'], [60, '1 hora'], [480, '8 horas']].map(([n, label]) =>
            <button key={n} disabled={busy || !state} onClick={() => perform('advance', Number(n))}>+ {label}</button>)}</div>
          <p className="hint">El tiempo solo avanza al usar estos controles.</p>
        </section></aside>
        <section className="summary-area" aria-label="Regreso del agente">
          <WorldMap state={state} selectedId={agentId} />
          <div className="query-toolbar"><div><label htmlFor="policy">Próximo resumen</label>
            <select id="policy" value={policy} disabled={busy} onChange={e => setPolicy(e.target.value as Policy)}>
              <option value="important">Más importantes</option><option value="balanced">Equilibrado</option>
            </select></div><button className="primary" disabled={busy || !agent} onClick={() => perform('return')}>Consultar regreso <span aria-hidden="true">↗</span></button></div>
          {error && <div role="alert" className="message error">{error}<button disabled={busy} onClick={() => perform('refresh')}>Actualizar estado</button></div>}
          <div role="status" aria-live="polite" className={`message status ${busy || notice ? '' : 'quiet'}`}>{busy ? 'Procesando…' : notice || ' '}</div>
          <article className="card summary-card" aria-busy={busy}>
            {summary ? <>
              <div className="result-top"><span className="eyebrow">{agent?.name} · {policyLabel(summary.result.selectionPolicy)}</span>
                <div className="segmented" aria-label="Vista del resumen">
                  <button aria-pressed={!full} onClick={() => setFull(false)}>Breve</button><button aria-pressed={full} onClick={() => setFull(true)}>Completo</button>
                </div></div>
              <Presentation text={full ? summary.presentation.complete : summary.presentation.brief} />
              <div className="result-footer"><span>{summary.result.totalEvents} eventos · {summary.result.totalItems} actividades</span>
                <button className="primary" disabled={busy || !!confirmed || summary.result.agentId !== agentId} onClick={() => perform('confirm')}>{confirmed ? 'Regreso confirmado' : 'Confirmar regreso'}</button></div>
              <p className="hint">{confirmed ? `Confirmado hasta ${moment(confirmed)}. La actividad posterior sigue disponible.` : `Confirmar actualizará tu última conexión a ${moment(summary.result.to)}, aunque el reloj haya avanzado.`}</p>
            </> : <div className="empty-state"><span className="empty-symbol" aria-hidden="true">↗</span><p className="eyebrow">UN MOMENTO PARA PONERTE AL DÍA</p>
              <h2>Mientras estabas fuera...</h2><p>{agent?.lastConnection ? 'Tu salida está registrada. Consulta el regreso para descubrir qué ha ocurrido desde entonces.' : 'Registra tu salida, avanza el mundo y vuelve para descubrir lo que ocurrió.'}</p>
              <div className="steps"><span>01 · Salir</span><span>02 · Avanzar</span><span>03 · Regresar</span></div></div>}
          </article>
          <p className="below-note">Consultar no confirma tu regreso. Cambiar de vista conserva el mismo resultado.</p>
        </section>
      </div>
    </main>
    <footer className="page-footer"><span>IVANIA <i> / </i> Prototipo de actividad</span><span>Estado temporal · Se reinicia al cerrar el servidor</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
