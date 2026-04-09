// Thread entrypoint for react-native-threads.
// Listens for a single message containing { id, args } and responds with { id, result }.
// This file is intentionally minimal to run inside a separate JS thread.

try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const { runMonteCarlo } = require('./monteCarlo');

  self.onmessage = async (msg) => {
    try {
      const payload = typeof msg === 'string' ? JSON.parse(msg) : msg;
      const { id, args } = payload;
      const res = runMonteCarlo(args);
      // post result back
      (self.postMessage || self.postMessage) && self.postMessage(JSON.stringify({ id, result: res }));
    } catch (err) {
      (self.postMessage || self.postMessage) && self.postMessage(JSON.stringify({ id: payload && payload.id, error: String(err) }));
    }
  };
} catch (e) {
  // If anything goes wrong, fall back silently — host will use main-thread fallback.
}
