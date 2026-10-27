export function current_school_year() {
  return new Date().getMonth() < 6
    ? new Date().getFullYear() - 1
    : new Date().getFullYear();
}
