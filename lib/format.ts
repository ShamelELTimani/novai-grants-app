// money() formats numbers as dollars for display.
// formatDate() formats date strings for display.
export function money(value: number) {
  return new Intl.NumberFormat("en-US", {       // US english format
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string | null) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en-GB", {       // british date style
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(`${value}T00:00:00`));
}
