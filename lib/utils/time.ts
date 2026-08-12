/** Normalize time to HH:MM (24h). Accepts HH:MM or HH:MM AM/PM. */
export function normalizeTime(value: string): string {
  const v = value.trim();

  const match24 = v.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (match24) {
    return `${match24[1].padStart(2, "0")}:${match24[2]}`;
  }

  const match12 = v.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*([AaPp][Mm])$/);
  if (!match12) {
    throw new Error("Invalid time format. Use HH:MM or HH:MM AM/PM.");
  }

  let hours = parseInt(match12[1], 10);
  const minutes = match12[2];
  const period = match12[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}
