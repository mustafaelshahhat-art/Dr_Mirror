export class CircuitBreaker {
  #threshold;
  #cooldownMs;
  #consecutiveFailures = 0;
  #openUntil = null;

  constructor(threshold = 3, cooldownMs = 60_000) {
    this.#threshold = threshold;
    this.#cooldownMs = cooldownMs;
  }

  isOpen() {
    if (this.#openUntil === null) return false;
    if (Date.now() >= this.#openUntil) {
      this.#openUntil = null;
      this.#consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  recordSuccess() {
    this.#consecutiveFailures = 0;
    this.#openUntil = null;
  }

  // Only call for non-rate-limit, non-validation failures
  recordFailure() {
    this.#consecutiveFailures++;
    if (this.#consecutiveFailures >= this.#threshold) {
      this.#openUntil = Date.now() + this.#cooldownMs;
    }
  }
}
