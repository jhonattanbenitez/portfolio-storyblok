"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useTheme() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return { mounted };
}
