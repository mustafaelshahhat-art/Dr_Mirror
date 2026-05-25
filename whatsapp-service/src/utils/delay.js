export function randomDelay(minMs, maxMs) {
  const min = Math.max(0, minMs);
  const max = Math.max(min, maxMs);
  return new Promise((resolve) => {
    setTimeout(resolve, min + Math.floor(Math.random() * (max - min + 1)));
  });
}
