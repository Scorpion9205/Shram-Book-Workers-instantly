// Helpers for showing when a job / booking is scheduled. A missing time means the provider
// chose "as soon as possible".

export function formatScheduledAt(iso?: string | null): string {
  if (!iso) return "As soon as possible";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "As soon as possible";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Shorter version for small tiles and list rows (no year): "20 Oct, 10:00 am" or "ASAP".
export function formatScheduledShort(iso?: string | null): string {
  if (!iso) return "ASAP";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "ASAP";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
