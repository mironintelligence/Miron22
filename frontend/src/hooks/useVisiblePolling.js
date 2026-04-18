import { useEffect } from "react";

/**
 * Run `tick` on an interval but only while the tab is visible, and never
 * concurrently with itself. Also refetches immediately when the tab becomes
 * visible again and whenever any name in `refetchOnEvents` fires on window.
 *
 * Previously duplicated almost byte-for-byte across Navbar and
 * NotificationToasts (visibilitychange gate + in-flight guard + interval).
 *
 * @param {(signal: { cancelled: boolean }) => Promise<void>|void} tick
 * @param {Object}    options
 * @param {boolean}   options.enabled         - skip everything when false
 * @param {number}    options.intervalMs      - polling cadence in ms
 * @param {string[]} [options.refetchOnEvents] - window-level event names that
 *                                              should also trigger a refetch
 * @param {any[]}     deps                    - re-run effect when any change
 */
export function useVisiblePolling(tick, options, deps = []) {
  const {
    enabled = true,
    intervalMs = 60000,
    refetchOnEvents = [],
  } = options || {};

  useEffect(() => {
    if (!enabled) return;

    const signal = { cancelled: false };
    let inFlight = false;

    const run = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (inFlight) return;
      inFlight = true;
      try {
        await tick(signal);
      } finally {
        inFlight = false;
      }
    };

    run();
    const iv = setInterval(run, intervalMs);

    const onVisibility = () => {
      if (!document.hidden) run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onRefetch = () => run();
    for (const name of refetchOnEvents) {
      window.addEventListener(name, onRefetch);
    }

    return () => {
      signal.cancelled = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const name of refetchOnEvents) {
        window.removeEventListener(name, onRefetch);
      }
    };
  }, deps);
}
