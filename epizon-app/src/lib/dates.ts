import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

export const BUSINESS_TZ = "Africa/Addis_Ababa";

export function businessDateFromTimestamp(iso: string | Date, tz = BUSINESS_TZ): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}

export function formatDisplayDate(iso: string | Date, pattern = "dd/MM/yyyy"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(toZonedTime(d, BUSINESS_TZ), pattern);
}

export function formatDisplayDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return formatInTimeZone(d, BUSINESS_TZ, "dd/MM/yyyy HH:mm");
}
