// Same call shape as `sonner` (toast.success / error / info / message) so web hooks and
// screens port unchanged. Rendered natively by <ToastHost />.
export type ToastKind = 'success' | 'error' | 'info';
export type ToastItem = { id: number; kind: ToastKind; title: string; description?: string };
type Opts = { description?: string };

let id = 0;
const listeners = new Set<(t: ToastItem) => void>();
const emit = (kind: ToastKind, title: string | undefined, opts?: Opts) => {
  const t = { id: ++id, kind, title: title ?? '', description: opts?.description };
  listeners.forEach((l) => l(t));
  return t.id;
};
export const subscribeToasts = (fn: (t: ToastItem) => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const toast = Object.assign((title: string | undefined, opts?: Opts) => emit('info', title, opts), {
  success: (title: string | undefined, opts?: Opts) => emit('success', title, opts),
  error: (title: string | undefined, opts?: Opts) => emit('error', title, opts),
  info: (title: string | undefined, opts?: Opts) => emit('info', title, opts),
  message: (title: string | undefined, opts?: Opts) => emit('info', title, opts),
});
