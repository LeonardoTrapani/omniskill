const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDisplayDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return DISPLAY_DATE_FORMATTER.format(date);
}
