const CACHE_KEY = "ftc_city_coords";

export interface Coords {
  latitude: number;
  longitude: number;
}

type CacheShape = Record<string, Coords | null>;

const readCache = (): CacheShape => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeCache = (cache: CacheShape) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota errors */
  }
};

export const cityKey = (cidade: string, uf: string) =>
  `${(cidade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()}|${(uf || "").toLowerCase().trim()}`;

/** Distância em km entre dois pontos (fórmula de Haversine). */
export const haversineKm = (a: Coords, b: Coords): number => {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Geocodifica cidade/UF (Brasil) com cache em localStorage. */
export const geocodeCity = async (cidade: string, uf: string): Promise<Coords | null> => {
  if (!cidade) return null;
  const key = cityKey(cidade, uf);
  const cache = readCache();
  if (key in cache) return cache[key];

  try {
    const query = encodeURIComponent([cidade, uf, "Brasil"].filter(Boolean).join(", "));
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`,
      { headers: { Accept: "application/json" } }
    );
    if (resp.ok) {
      const data = await resp.json();
      const first = Array.isArray(data) ? data[0] : null;
      const coords: Coords | null = first
        ? { latitude: parseFloat(first.lat), longitude: parseFloat(first.lon) }
        : null;
      cache[key] = coords;
      writeCache(cache);
      return coords;
    }
  } catch {
    /* falha de rede: não cacheia para tentar de novo depois */
  }
  return null;
};

/** Geocodifica várias cidades em sequência (respeita o rate limit do Nominatim). */
export const geocodeCities = async (
  cities: Array<{ cidade: string; uf: string }>
): Promise<Record<string, Coords>> => {
  const result: Record<string, Coords> = {};
  for (const c of cities) {
    const coords = await geocodeCity(c.cidade, c.uf);
    if (coords) result[cityKey(c.cidade, c.uf)] = coords;
  }
  return result;
};
