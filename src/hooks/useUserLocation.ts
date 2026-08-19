import { useCallback, useEffect, useState } from "react";
import { geocodeCity } from "@/lib/geo";

export interface UserLocation {
  latitude: number;
  longitude: number;
  cidade: string;
  uf: string;
  savedAt: number;
  /** true quando o usuário escolheu a cidade manualmente (sobrepõe o GPS) */
  manual?: boolean;
}

const STORAGE_KEY = "ftc_user_location";
const MANUAL_KEY = "ftc_manual_location";
const CHANGE_EVENT = "ftc:location-change";

const read = (key: string): UserLocation | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as UserLocation) : null;
  } catch {
    return null;
  }
};

const emitChange = () => window.dispatchEvent(new Event(CHANGE_EVENT));

/** Localização detectada por GPS (sem considerar a escolha manual). */
export const getGpsLocation = (): UserLocation | null => read(STORAGE_KEY);

/** Cidade escolhida manualmente pelo usuário, se houver. */
export const getManualLocation = (): UserLocation | null => read(MANUAL_KEY);

/** Localização efetiva: a escolha manual tem prioridade sobre o GPS. */
export const getSavedLocation = (): UserLocation | null =>
  getManualLocation() || getGpsLocation();

/** Define manualmente a cidade usada em todo o app (compartilhada entre as telas). */
export const setManualLocation = async (cidade: string, uf: string): Promise<UserLocation> => {
  const coords = await geocodeCity(cidade, uf);
  const loc: UserLocation = {
    cidade,
    uf,
    latitude: coords?.latitude ?? 0,
    longitude: coords?.longitude ?? 0,
    savedAt: Date.now(),
    manual: true,
  };
  localStorage.setItem(MANUAL_KEY, JSON.stringify(loc));
  emitChange();
  return loc;
};

/** Remove a escolha manual e volta a usar o GPS. */
export const clearManualLocation = () => {
  localStorage.removeItem(MANUAL_KEY);
  emitChange();
};

const saveLocation = (loc: UserLocation) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  emitChange();
};

export const requestUserLocation = async (): Promise<UserLocation | null> => {
  if (!("geolocation" in navigator)) return null;

  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });

  if (!position) return null;

  const { latitude, longitude } = position.coords;
  let cidade = "";
  let uf = "";

  try {
    const resp = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
    );
    if (resp.ok) {
      const data = await resp.json();
      cidade = data.city || data.locality || data.principalSubdivision || "";
      uf = data.principalSubdivisionCode?.split("-")?.[1] || "";
    }
  } catch {
    // ignore reverse geocode failures, coordinates are still useful
  }

  const loc: UserLocation = { latitude, longitude, cidade, uf, savedAt: Date.now() };
  saveLocation(loc);
  return loc;
};

/**
 * Location permission is required for the Copa 2026: it is requested on first
 * load and persisted so the team registration flow can reuse it. A escolha
 * manual de cidade sobrepõe o GPS e é compartilhada por todas as telas.
 */
export function useUserLocation(autoRequest = true) {
  const [location, setLocation] = useState<UserLocation | null>(() => getSavedLocation());
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const sync = () => setLocation(getSavedLocation());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const request = useCallback(async () => {
    setLoading(true);
    const loc = await requestUserLocation();
    setLoading(false);
    if (loc) {
      setDenied(false);
      setLocation(getSavedLocation());
    } else {
      setDenied(true);
    }
    return loc;
  }, []);

  const selectCity = useCallback(async (cidade: string, uf: string) => {
    const loc = await setManualLocation(cidade, uf);
    setLocation(loc);
    return loc;
  }, []);

  const resetCity = useCallback(() => {
    clearManualLocation();
    setLocation(getSavedLocation());
  }, []);

  useEffect(() => {
    if (!autoRequest || location) return;
    void request();
  }, [autoRequest, location, request]);

  return { location, loading, denied, request, selectCity, resetCity, isManual: !!location?.manual };
}
