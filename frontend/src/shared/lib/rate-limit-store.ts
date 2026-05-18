export interface RateLimitState {
  retryAfterSeconds: number;
}

type Listener = () => void;

let state: RateLimitState | null = null;
const listeners = new Set<Listener>();

export function getRateLimitState(): RateLimitState | null {
  return state;
}

export function setRateLimitState(newState: RateLimitState | null) {
  state = newState;
  listeners.forEach((l) => l());
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
