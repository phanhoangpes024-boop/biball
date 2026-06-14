"use client";

import { useEffect } from "react";
import { SWRConfig, preload } from "swr";
import { fetcher, localStorageProvider } from "@/lib/swr";

// Các key cần dùng nhiều -> prefetch khi rảnh (Phase 5).
const PREFETCH = [
  "/api/tasks?view=today",
  "/api/reminders",
  "/api/tasks?view=history",
];

export default function Providers({ children }) {
  useEffect(() => {
    const run = () => PREFETCH.forEach((k) => preload(k, fetcher));
    const ric = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
    const id = ric(run);
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, []);

  return (
    <SWRConfig
      value={{
        fetcher,
        provider: localStorageProvider,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        keepPreviousData: true,
        dedupingInterval: 3000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
