const listeners = new Set();

export function subscribeToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitToast(message, variant = "error") {
  listeners.forEach((fn) => {
    try {
      fn({ message, variant, at: Date.now() });
    } catch {
      /* ignore */
    }
  });
}
