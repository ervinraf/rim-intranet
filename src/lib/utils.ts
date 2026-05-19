import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parse a date-only string (YYYY-MM-DD or ISO) without timezone shift.
// Adding T12:00:00 prevents midnight UTC from becoming "previous day" at UTC-6.
export function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null
  return new Date(val.slice(0, 10) + "T12:00:00")
}

// Format a date-only value safely for display (avoids -1 day at UTC-6).
export function fmtDate(
  val: string | null | undefined,
  pattern = "d 'de' MMMM yyyy"
): string {
  const d = parseDate(val)
  if (!d) return "—"
  return format(d, pattern, { locale: es })
}
