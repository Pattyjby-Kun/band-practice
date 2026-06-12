"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Band } from "@/types/band";

interface BandContextValue {
  bands: Band[];
  loading: boolean;
  error: string | null;
  activeBandId: string | null;
  activeBand: Band | undefined;
  activeBandVersion: number;
  setActiveBandId: (bandId: string | null) => void;
  selectActiveBand: (bandId: string) => void;
  refreshBands: () => Promise<Band[]>;
}

const BandContext = createContext<BandContextValue | null>(null);

function getAuthHeaders(accessToken: string | undefined): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export function BandProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [bands, setBands] = useState<Band[]>([]);
  const [activeBandId, setActiveBandId] = useState<string | null>(null);
  const [activeBandVersion, setActiveBandVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeBand = useMemo(
    () => bands.find((band) => band.id === activeBandId),
    [bands, activeBandId]
  );

  const selectActiveBand = useCallback((bandId: string) => {
    setActiveBandId(bandId);
    setActiveBandVersion((version) => version + 1);
  }, []);

  const refreshBands = useCallback(async (): Promise<Band[]> => {
    if (!session?.access_token) {
      setBands([]);
      setActiveBandId(null);
      setError(null);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bands", {
        headers: getAuthHeaders(session.access_token),
      });

      if (res.status === 401) {
        setBands([]);
        setActiveBandId(null);
        return [];
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load bands");
      }

      const data = await res.json();
      const nextBands: Band[] = data.bands ?? [];
      setBands(nextBands);

      setActiveBandId((current) => {
        if (current && nextBands.some((band) => band.id === current)) {
          return current;
        }
        return nextBands[0]?.id ?? null;
      });

      return nextBands;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bands");
      setBands([]);
      setActiveBandId(null);
      return [];
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (authLoading) return;
    void refreshBands();
  }, [authLoading, refreshBands]);

  const value = useMemo<BandContextValue>(
    () => ({
      bands,
      loading: loading || authLoading,
      error,
      activeBandId,
      activeBand,
      activeBandVersion,
      setActiveBandId,
      selectActiveBand,
      refreshBands,
    }),
    [
      bands,
      loading,
      authLoading,
      error,
      activeBandId,
      activeBand,
      activeBandVersion,
      selectActiveBand,
      refreshBands,
    ]
  );

  return <BandContext.Provider value={value}>{children}</BandContext.Provider>;
}

export function useBandContext() {
  const context = useContext(BandContext);
  if (!context) {
    throw new Error("useBandContext must be used within BandProvider");
  }
  return context;
}

export async function createBandRequest(
  accessToken: string,
  name: string
): Promise<Band> {
  const res = await fetch("/api/bands", {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ name }),
  });

  if (res.status === 401) {
    throw new Error("Sign in required");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create band");
  }

  return res.json();
}
