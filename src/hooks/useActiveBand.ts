"use client";

import { useBandContext } from "@/components/bands/BandProvider";

export function useActiveBand() {
  const {
    activeBand,
    activeBandId,
    activeBandVersion,
    setActiveBandId,
    selectActiveBand,
  } = useBandContext();

  return {
    activeBand,
    activeBandId,
    activeBandVersion,
    setActiveBandId,
    selectActiveBand,
  };
}
