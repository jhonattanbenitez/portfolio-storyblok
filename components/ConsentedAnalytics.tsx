"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  isAnalyticsPage,
  readAnalyticsConsent,
  startAnalytics,
  stopAnalytics,
  subscribeAnalyticsConsent,
} from "../utils/analytics-consent";

export default function ConsentedAnalytics({ enabled }: { enabled: boolean }) {
  const choice = useSyncExternalStore(subscribeAnalyticsConsent, readAnalyticsConsent, () => "unset");
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    // Read the current browser choice rather than the SSR "unset" snapshot;
    // hydration must not delete cookies belonging to an accepted session.
    if (!enabled || readAnalyticsConsent() !== "granted" || !isAnalyticsPage(pathname, search)) {
      stopAnalytics();
      return;
    }
    startAnalytics(pathname);
  }, [enabled, choice, pathname, search]);
  return null;
}
