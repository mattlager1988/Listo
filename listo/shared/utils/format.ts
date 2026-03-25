import dayjs from 'dayjs';

/** Parse date-only values without timezone conversion.
 *  The backend UTC value converter adds a "Z" suffix to all DateTimes,
 *  but date-only fields are calendar dates — interpreting as UTC shifts
 *  by the local timezone offset. */
export const parseDate = (date: string) => dayjs(date.substring(0, 10));

export function formatCurrency(amount: number, decimals = 2): string {
  return `$${amount.toFixed(decimals)}`;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
