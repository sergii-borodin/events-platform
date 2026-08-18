export type Coordinates = {
  lat: number;
  lng: number;
};

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "PadelEventsPlatform/1.0",
};

const geocodeCache = new Map<string, Coordinates | null>();

async function cachedGeocode(
  key: string,
  loader: () => Promise<Coordinates | null>,
): Promise<Coordinates | null> {
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) ?? null;
  }

  const value = await loader();
  geocodeCache.set(key, value);
  return value;
}

async function geocodeDanishPostcode(zip: string): Promise<Coordinates | null> {
  const response = await fetch(
    `https://api.dataforsyningen.dk/postnumre/${encodeURIComponent(zip)}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) return null;

  const data: { visueltcenter?: [number, number] } = await response.json();
  const center = data.visueltcenter;

  if (!Array.isArray(center) || center.length < 2) return null;

  return { lng: center[0], lat: center[1] };
}

async function geocodePlace(query: string): Promise<Coordinates | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;

  const data: {
    results?: { latitude?: number; longitude?: number }[];
  } = await response.json();
  const hit = data.results?.[0];

  if (typeof hit?.latitude !== "number" || typeof hit?.longitude !== "number") {
    return null;
  }

  return { lat: hit.latitude, lng: hit.longitude };
}

async function geocodeNominatim(query: string): Promise<Coordinates | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!response.ok) return null;

  const data: { lat?: string; lon?: string }[] = await response.json();
  const hit = data[0];
  const lat = Number(hit?.lat);
  const lng = Number(hit?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

export async function geocodePostcode(zip: string): Promise<Coordinates | null> {
  const normalized = zip.trim();
  if (!normalized) return null;

  return cachedGeocode(`postcode:${normalized.toLowerCase()}`, async () => {
    if (/^\d{4}$/.test(normalized)) {
      const danish = await geocodeDanishPostcode(normalized);
      if (danish) return danish;
    }

    return (await geocodePlace(normalized)) ?? geocodeNominatim(normalized);
  });
}

export async function geocodeLocation(
  location: string,
): Promise<Coordinates | null> {
  const normalized = location.trim();
  if (!normalized) return null;

  return cachedGeocode(`place:${normalized.toLowerCase()}`, async () => {
    return (await geocodePlace(normalized)) ?? geocodeNominatim(normalized);
  });
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ postcode: string } | null> {
  const dawa = await fetch(
    `https://api.dataforsyningen.dk/adgangsadresser/reverse?x=${lng}&y=${lat}&struktur=mini`,
    { headers: { Accept: "application/json" } },
  );

  if (dawa.ok) {
    const data: { postnr?: string } = await dawa.json();
    if (data.postnr) return { postcode: data.postnr };
  }

  const nominatim = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    { headers: NOMINATIM_HEADERS },
  );

  if (!nominatim.ok) return null;

  const data: { address?: { postcode?: string } } = await nominatim.json();
  const postcode = data.address?.postcode?.trim();

  return postcode ? { postcode } : null;
}

export function distanceKm(from: Coordinates, to: Coordinates): number {
  const earthRadiusKm = 6371;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(haversine)));
}
