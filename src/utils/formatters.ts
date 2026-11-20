/**
 * ============================================================================
 * SRC/UTILS/FORMATTERS.TS — Thai Date, Time & Duration Formatting Utilities
 * ============================================================================
 */

const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function formatTimeThai(isoStr?: string | null): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} น.`;
}

export function formatDateTimeThai(isoStr?: string | null): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr);
  const day = d.getDate();
  const month = THAI_SHORT_MONTHS[d.getMonth()] || '';
  const year = d.getFullYear() + 543;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hh}:${mm} น.`;
}

export function formatDurationHoursMinutes(seconds?: number | null): string {
  const sec = Math.max(0, Math.round(Number(seconds) || 0));
  if (sec <= 0) return '0 นาที';
  if (sec < 60) return `${sec} วินาที`;
  const totalMinutes = Math.floor(sec / 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins} นาที`;
  if (mins === 0) return `${hrs} ชม.`;
  return `${hrs} ชม. ${mins} นาที`;
}
