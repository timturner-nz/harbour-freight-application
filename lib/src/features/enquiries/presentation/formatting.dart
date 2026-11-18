const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/// "14 Nov", in the PC's local time. Used for the list's Received column.
String formatDayMonth(DateTime utc) {
  final d = utc.toLocal();
  return '${d.day} ${_months[d.month - 1]}';
}

/// "14 Nov 2026". [date] is a date only, with no time zone.
String formatDate(DateTime date) =>
    '${date.day} ${_months[date.month - 1]} ${date.year}';

/// "14 Nov 2026, 09:05", in the PC's local time.
String formatDateTime(DateTime utc) {
  final d = utc.toLocal();
  final hh = d.hour.toString().padLeft(2, '0');
  final mm = d.minute.toString().padLeft(2, '0');
  return '${formatDate(d)}, $hh:$mm';
}

/// Shown for an optional value nobody gave (REQ-7).
const notGiven = 'Not given';
