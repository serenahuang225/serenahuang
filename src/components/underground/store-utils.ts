/**
 * The little pieces every store in the game shares: telling React when
 * something changed, and remembering things in this browser.
 */

/** Listeners for a store: React subscribes (useSyncExternalStore); call emit() after each change. */
export function listenerSet() {
  const listeners = new Set<() => void>();
  return {
    emit() {
      for (const l of listeners) l();
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

/** A value saved in this browser, or null if there isn't one (or storage is blocked or the data is broken). */
export function readSaved(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Save a value in this browser. Fails quietly if storage is blocked or full: it just won't survive a reload. */
export function writeSaved(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // nothing to do: saving is a convenience
  }
}

/** A plain object from saved data (so fields can be checked one by one), or {} if it isn't one. */
export function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
