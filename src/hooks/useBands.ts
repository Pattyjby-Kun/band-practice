"use client";

import { useBandContext } from "@/components/bands/BandProvider";

export function useBands() {
  const { bands, loading, error, refreshBands } = useBandContext();
  return { bands, loading, error, refreshBands };
}
