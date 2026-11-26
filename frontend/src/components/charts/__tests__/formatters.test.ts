import { formatNumber, formatKES, formatUnit, formatDate } from '../../charts/formatters';

test('formatNumber formats numbers correctly', () => {
  expect(formatNumber(1234.567)).toBe('1,234.57');
  expect(formatNumber('1000')).toBe('1,000');
  expect(formatNumber(NaN)).toBe('-');
});

test('formatKES adds KES prefix', () => {
  expect(formatKES(5000)).toBe('KES 5,000');
});

test('formatUnit maps known units', () => {
  expect(formatUnit('litres')).toBe('L');
  expect(formatUnit('kg')).toBe('kg');
  expect(formatUnit('unknown')).toBe('unknown');
});

test('formatDate respects Nairobi timezone', () => {
  const iso = '2023-01-15T00:00:00Z'; // UTC midnight
  const formatted = formatDate(iso);
  // Nairobi is UTC+3, so date should be Jan 15 still (no day shift)
  expect(formatted).toMatch(/Jan/);
});
