export interface PersianDate {
  year: number;
  month: number;
  day: number;
}

const div = (a: number, b: number) => Math.trunc(a / b);

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gDaysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  const gy2 = gm > 2 ? gy + 1 : gy;

  let days =
    355666 +
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) +
    gd +
    gDaysInMonth[gm - 1];

  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;

  jy += 4 * div(days, 1461);
  days %= 1461;

  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }

  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + div(days, 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + div(days - 186, 30);
    jd = 1 + ((days - 186) % 30);
  }

  return [jy, jm, jd];
}

export function getCurrentPersianDate(): PersianDate {
  const now = new Date();
  const [year, month, day] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { year, month, day };
}

export function getCurrentAcademicYear(): string {
  const pd = getCurrentPersianDate();
  // From month 7 (Mehr) onwards a new academic year has started
  const [start, end] = pd.month >= 7 ? [pd.year, pd.year + 1] : [pd.year - 1, pd.year];
  return `${start}-${end}`;
}

const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export function getPersianMonthName(month: number): string {
  return month < 1 || month > 12 ? "" : MONTHS[month - 1];
}

const DAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

/** @param weekday 0 = Sunday (same as JS Date#getDay and Go's time.Weekday) */
export function getPersianDayName(weekday: number): string {
  return DAYS[(weekday + 1) % 7];
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatPersianDate(pd: PersianDate): string {
  return `${pd.year}/${pad2(pd.month)}/${pad2(pd.day)}`;
}

export function formatPersianDateLong(pd: PersianDate): string {
  return `${pd.day} ${getPersianMonthName(pd.month)} ${pd.year}`;
}
