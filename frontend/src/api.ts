/** JSON transport shapes only. No simulation code is imported into the browser. */
export interface Moment { day: number; hour: number; minute: number }
export type Policy = 'important' | 'balanced';
export interface VisibleState {
  moment: Moment;
  agents: { id: string; name: string; location: string; lastConnection: Moment | null }[];
}
export interface SummaryItem {
  type: string; title: string; description: string; importance: number; eventIds: string[];
  startDay: number; startHour: number; startMinute: number;
  endDay: number; endHour: number; endMinute: number;
}
export interface SummaryResult {
  agentId: string; from: Moment; to: Moment; completeItems: SummaryItem[]; selectedItems: SummaryItem[];
  totalEvents: number; totalItems: number; selectedCount: number; omittedCount: number;
  maxItems: number; selectionPolicy: Policy;
}
export type ReturnResponse =
  | { status: 'no-connection'; agentId: string; state: VisibleState }
  | { status: 'ready'; result: SummaryResult; presentation: { brief: string; complete: string }; state: VisibleState };
export type ReadySummary = Extract<ReturnResponse, { status: 'ready' }>;

export async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, body === undefined ? { cache: 'no-store' } : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch { throw new Error('No se pudo conectar con el servidor local. Comprueba que esté iniciado.'); }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('El servidor local no respondió correctamente. Comprueba que esté iniciado.'); }
  if (!response.ok) throw new Error(payload.error ?? 'No se pudo completar la operación.');
  return payload as T;
}
