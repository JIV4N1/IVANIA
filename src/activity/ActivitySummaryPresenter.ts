import { ActivitySummaryItem } from './ActivitySummaryItem';

export interface ActivitySummaryMoment {
  day: number;
  hour: number;
  minute: number;
}

/** Turn already selected items into user-facing text without changing their order. */
export class ActivitySummaryPresenter {
  present(
    items: readonly ActivitySummaryItem[], totalItems: number,
    lastConnection: ActivitySummaryMoment, consultation: ActivitySummaryMoment,
  ): string {
    const time = (hour: number, minute: number) =>
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const dayTime = (moment: ActivitySummaryMoment) =>
      `Día ${moment.day} · ${time(moment.hour, moment.minute)}`;
    const spansDays = lastConnection.day !== consultation.day;
    const header = spansDays
      ? `${dayTime(lastConnection)} → ${dayTime(consultation)}`
      : `Día ${lastConnection.day} · ${time(lastConnection.hour, lastConnection.minute)}–${time(consultation.hour, consultation.minute)}`;
    const lines = ['Mientras estabas fuera...', header, ''];
    if (totalItems === 0) {
      lines.push('No hay actividades para mostrar durante tu ausencia.');
    } else if (items.length === 0) {
      lines.push('No se seleccionaron actividades para mostrar.',
        `Mostrando 0 de ${totalItems} ${totalItems === 1 ? 'actividad' : 'actividades'}.`);
    } else {
      for (const item of items) {
        const start = time(item.startHour, item.startMinute);
        const end = time(item.endHour, item.endMinute);
        const interval = item.startDay !== item.endDay
          ? `Día ${item.startDay} · ${start} → Día ${item.endDay} · ${end}`
          : item.startHour === item.endHour && item.startMinute === item.endMinute
            ? start : `${start}–${end}`;
        const prefix = spansDays && item.startDay === item.endDay
          ? `Día ${item.startDay} · ` : '';
        lines.push(`${prefix}${interval} | ${item.description}`);
      }
      lines.push('', `Mostrando ${items.length} de ${totalItems} ${totalItems === 1 ? 'actividad' : 'actividades'}.`);
    }
    return lines.join('\n');
  }
}
