export const EVENT_FILTERS = ["all", "local", "week", "month"] as const;

export type EventFilterCategory = (typeof EVENT_FILTERS)[number];

export const DEFAULT_EVENT_FILTER: EventFilterCategory = "all";
export const DEFAULT_RADIUS_KM = 25;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 250;

export type ParsedEventFilter = {
  category: EventFilterCategory;
  zip: string;
  radiusKm: number;
  lat: number | null;
  lng: number | null;
};

export type EventQuery = {
  category: EventFilterCategory;
  zip: string;
  radiusKm: number;
  lat: number | null;
  lng: number | null;
  rangeStart?: string;
  rangeEnd?: string;
};

const TIME_ZONE = "Europe/Copenhagen";

const WEEKDAY_TO_MONDAY_OFFSET: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function firstParam(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (typeof value === "string") return value;
  return "";
}

function isFilterCategory(value: string): value is EventFilterCategory {
  return EVENT_FILTERS.includes(value as EventFilterCategory);
}

function getTimeZoneOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(value.hour),
    Number(value.minute),
    Number(value.second),
  );

  return asUtc - date.getTime();
}

function zonedCivilToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  );
  const offset = getTimeZoneOffsetMs(utcGuess);
  const adjusted = new Date(utcGuess.getTime() - offset);
  const offsetAtAdjusted = getTimeZoneOffsetMs(adjusted);

  if (offsetAtAdjusted !== offset) {
    return new Date(utcGuess.getTime() - offsetAtAdjusted);
  }

  return adjusted;
}

function getZonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
    weekday: value.weekday,
  };
}

export function getThisWeekRange(now = new Date()): { start: Date; end: Date } {
  const parts = getZonedParts(now);
  const monday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  monday.setUTCDate(
    monday.getUTCDate() - (WEEKDAY_TO_MONDAY_OFFSET[parts.weekday] ?? 0),
  );

  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

  return {
    start: zonedCivilToUtc(
      monday.getUTCFullYear(),
      monday.getUTCMonth() + 1,
      monday.getUTCDate(),
    ),
    end: zonedCivilToUtc(
      nextMonday.getUTCFullYear(),
      nextMonday.getUTCMonth() + 1,
      nextMonday.getUTCDate(),
    ),
  };
}

export function getThisMonthRange(now = new Date()): {
  start: Date;
  end: Date;
} {
  const parts = getZonedParts(now);
  const endMonth = parts.month === 12 ? 1 : parts.month + 1;
  const endYear = parts.month === 12 ? parts.year + 1 : parts.year;

  return {
    start: zonedCivilToUtc(parts.year, parts.month, 1),
    end: zonedCivilToUtc(endYear, endMonth, 1),
  };
}

export function parseOptionalNumber(value: unknown): number | null {
  const raw = firstParam(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRadiusKm(value: unknown): number {
  const radius = Number(firstParam(value));
  if (!Number.isFinite(radius) || firstParam(value).trim() === "") {
    return DEFAULT_RADIUS_KM;
  }
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, radius));
}

export function isCompletePostcode(zip: string): boolean {
  const trimmed = zip.trim();
  if (/^\d{4,6}$/.test(trimmed)) return true;
  if (/^\d+$/.test(trimmed)) return false;
  return trimmed.length >= 4;
}

export function isAutoApplyPostcode(zip: string): boolean {
  return /^\d{4,6}$/.test(zip.trim());
}

export function hasLocalOrigin(filter: {
  zip: string;
  lat: number | null;
  lng: number | null;
}): boolean {
  return (
    (filter.lat != null && filter.lng != null) || isCompletePostcode(filter.zip)
  );
}

export function parseEventFilter(params: {
  filter?: string | string[] | null;
  zip?: string | string[] | null;
  radius?: string | string[] | null;
  lat?: string | string[] | null;
  lng?: string | string[] | null;
}): ParsedEventFilter {
  const rawCategory = firstParam(params.filter);

  return {
    category: isFilterCategory(rawCategory)
      ? rawCategory
      : DEFAULT_EVENT_FILTER,
    zip: firstParam(params.zip).trim(),
    radiusKm: parseRadiusKm(params.radius),
    lat: parseOptionalNumber(params.lat),
    lng: parseOptionalNumber(params.lng),
  };
}

export function eventFilterHref(category: EventFilterCategory): string {
  return category === DEFAULT_EVENT_FILTER
    ? "/events"
    : `/events?filter=${category}`;
}

export function toEventQuery(
  filter: ParsedEventFilter,
  now = new Date(),
): EventQuery {
  const query: EventQuery = {
    category: filter.category,
    zip: filter.zip,
    radiusKm: filter.radiusKm,
    lat: filter.lat,
    lng: filter.lng,
  };

  if (filter.category === "week") {
    const range = getThisWeekRange(now);
    query.rangeStart = range.start.toISOString();
    query.rangeEnd = range.end.toISOString();
  }

  if (filter.category === "month") {
    const range = getThisMonthRange(now);
    query.rangeStart = range.start.toISOString();
    query.rangeEnd = range.end.toISOString();
  }

  return query;
}

export function emptyEventsMessage(query: EventQuery): string {
  if (query.category === "week") {
    return "No events this week. Try All or This month.";
  }

  if (query.category === "month") {
    return "No events this month. Please check later for updates.";
  }

  if (query.category === "local") {
    const place = query.zip || "your location";
    return `No events found within ${query.radiusKm} km of ${place}. Try a wider radius.`;
  }

  return "Unfortunately, no events to join at the moment. Please, check later for updates. Remember you can always create your own event here.";
}
