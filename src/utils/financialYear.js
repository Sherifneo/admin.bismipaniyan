// Indian financial year: 1 Apr -> 31 Mar. If the date's month is April
// (0-indexed 3) or later, FY starts that calendar year; otherwise it
// started the previous calendar year. Single shared implementation —
// nothing else in the app should reimplement this.
export function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? year : year - 1; // getMonth() 0=Jan..11=Dec, 3=Apr
  return {
    startYear,
    endYear: startYear + 1,
    label: `FY ${startYear}–${String(startYear + 1).slice(2)}`, // "FY 2026-27"
    startDate: new Date(startYear, 3, 1), // 1 Apr startYear
    endDate: new Date(startYear + 1, 2, 31), // 31 Mar startYear+1
  };
}

// A window of financial years centered on "today" — e.g. yearsBack=3,
// yearsForward=2 gives 6 total, for the Calendar page's simple list.
export function listFinancialYears(centerDate = new Date(), yearsBack = 3, yearsForward = 2) {
  const { startYear: currentStart } = getFinancialYear(centerDate);
  const years = [];
  for (let offset = -yearsBack; offset <= yearsForward; offset++) {
    years.push(getFinancialYear(new Date(currentStart + offset, 3, 15))); // any date safely inside that FY
  }
  return years;
}
