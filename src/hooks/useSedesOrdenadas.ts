import { useEffect, useMemo, useState } from "react";
import { listarSedesPorEvento, EVENTO_ATUAL, type Sede } from "@/services/api";
import { cityKey, geocodeCities, haversineKm, type Coords } from "@/lib/geo";
import { useUserLocation } from "@/hooks/useUserLocation";

export interface SedeComDistancia extends Sede {
  distanciaKm: number | null;
  perto: boolean;
}

export const RAIO_PROXIMO_KM = 200;

const normalize = (v: string) =>
  (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Carrega as sedes do evento e ordena: primeiro as que estão a até 200 km da
 * localização (GPS ou cidade escolhida manualmente), da mais perto para a mais
 * longe; depois as demais em ordem alfabética.
 */
export function useSedesOrdenadas(evento: number = EVENTO_ATUAL) {
  const { location, loading: locating, denied, request, selectCity, resetCity, isManual } =
    useUserLocation(true);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<Record<string, Coords>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listarSedesPorEvento(evento)
      .then((data) => alive && setSedes(data))
      .catch(() => alive && setSedes([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [evento]);

  useEffect(() => {
    if (!sedes.length) return;
    let alive = true;
    const cidades = Array.from(
      new Map(sedes.map((s) => [cityKey(s.cidade, s.uf), { cidade: s.cidade, uf: s.uf }])).values()
    );
    geocodeCities(cidades).then((r) => alive && setCoords(r));
    return () => {
      alive = false;
    };
  }, [sedes]);

  const origem: Coords | null = useMemo(() => {
    if (!location) return null;
    if (location.latitude || location.longitude)
      return { latitude: location.latitude, longitude: location.longitude };
    return coords[cityKey(location.cidade, location.uf)] ?? null;
  }, [location, coords]);

  const sedesOrdenadas: SedeComDistancia[] = useMemo(() => {
    const withDistance = sedes.map((s) => {
      const c = coords[cityKey(s.cidade, s.uf)];
      const distanciaKm = origem && c ? haversineKm(origem, c) : null;
      return { ...s, distanciaKm, perto: distanciaKm !== null && distanciaKm <= RAIO_PROXIMO_KM };
    });

    const perto = withDistance
      .filter((s) => s.perto)
      .sort((a, b) => (a.distanciaKm! - b.distanciaKm!) || a.nome_campus.localeCompare(b.nome_campus));

    const longe = withDistance
      .filter((s) => !s.perto)
      .sort(
        (a, b) =>
          normalize(a.cidade).localeCompare(normalize(b.cidade)) ||
          a.nome_campus.localeCompare(b.nome_campus)
      );

    return [...perto, ...longe];
  }, [sedes, coords, origem]);

  const cidades = useMemo(() => {
    const map = new Map<string, { cidade: string; uf: string; total: number }>();
    for (const s of sedesOrdenadas) {
      const k = cityKey(s.cidade, s.uf);
      const found = map.get(k);
      if (found) found.total += 1;
      else map.set(k, { cidade: s.cidade, uf: s.uf, total: 1 });
    }
    return Array.from(map.values());
  }, [sedesOrdenadas]);

  const sedeSugerida = useMemo(() => {
    if (!location) return null;
    return (
      sedesOrdenadas.find(
        (s) => normalize(s.cidade) === normalize(location.cidade) && normalize(s.uf) === normalize(location.uf)
      ) ||
      sedesOrdenadas.find((s) => normalize(s.cidade) === normalize(location.cidade)) ||
      sedesOrdenadas.find((s) => s.perto) ||
      sedesOrdenadas.find((s) => normalize(s.uf) === normalize(location.uf)) ||
      null
    );
  }, [sedesOrdenadas, location]);

  return {
    sedes: sedesOrdenadas,
    cidades,
    sedeSugerida,
    loading,
    location,
    locating,
    denied,
    request,
    selectCity,
    resetCity,
    isManual,
  };
}
