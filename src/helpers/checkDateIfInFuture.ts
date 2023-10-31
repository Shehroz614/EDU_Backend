/**
 * Check if date is in future with N no months in buffer
 * @param date
 * @param numberOfMonths
 */
const isDateNotMoreThanNMonthsInFuture = (date: string, numberOfMonths: number): boolean => {
  const oldDate: Date = new Date(date);
  const currentDate = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(currentDate.getMonth() + numberOfMonths);
  return oldDate <= sixMonthsFromNow;
};
export default isDateNotMoreThanNMonthsInFuture;
