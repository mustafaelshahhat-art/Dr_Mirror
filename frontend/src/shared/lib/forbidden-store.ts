type Listener = () => void;

let message: string | null = null;
const listeners = new Set<Listener>();

export function getForbiddenMessage(): string | null {
  return message;
}

export function setForbiddenMessage(msg: string | null) {
  message = msg;
  listeners.forEach((l) => l());
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
