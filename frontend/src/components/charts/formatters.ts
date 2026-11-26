/* Utility formatters used by chart components */

export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '-';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatKES(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '-';
  // Use Kenyan shilling formatting – simple KES prefix
  return `KES ${formatNumber(num)}`;
}

export function formatUnit(unit: string): string {
  // Common units used in the app
  const map: Record<string, string> = {
    litres: 'L',
    kg: 'kg',
    bags: 'bags',
    trays: 'trays',
    pieces: 'pcs',
  };
  return map[unit] ?? unit;
}

export function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  // Africa/Nairobi timezone – use Intl with timeZone option
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Africa/Nairobi',
  };
  return new Intl.DateTimeFormat('en-KE', options).format(d);
}
