const DAY = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Human, pt-BR relative label for an ISO date, e.g. "hoje", "há 3 dias". */
export function relativeDate(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / DAY);

  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  const years = Math.round(days / 365);
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`;
}

/** Full date for tooltips / <time> title, e.g. "28 de junho de 2026". */
export function fullDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}
