import { useCallback, useEffect, useState } from "react";

export interface UserLocation {
  latitude: number;
  longitude: number;
  cidade: string;
  uf: string;
  savedAt: number;
}

const STORAGE_KEY = "ftc_user_location";

export const getSavedLocation = (): UserLocation | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserLocation) : null;
  } catch {
    return null;
  }
};

const saveLocation = (loc: UserLocation) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
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
 * load and persisted so the team registration flow can reuse it.
 */
export function useUserLocation(autoRequest = true) {
  const [location, setLocation] = useState<UserLocation | null>(() => getSavedLocation());
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  const request = useCallback(async () => {
    setLoading(true);
    const loc = await requestUserLocation();
    setLoading(false);
    if (loc) {
      setLocation(loc);
      setDenied(false);
    } else {
      setDenied(true);
    }
    return loc;
  }, []);

  useEffect(() => {
    if (!autoRequest || location) return;
    void request();
  }, [autoRequest, location, request]);

  return { location, loading, denied, request };
}
