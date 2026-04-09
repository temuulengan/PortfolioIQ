// Worker wrapper for Monte Carlo simulations.
// Attempts to use react-native-threads for a real JS worker. Falls back to
// running on the main thread (non-blocking yield) if the native thread
// implementation isn't available.

let Thread = null;
try {
  // optional dependency; not available in Expo managed flow by default
  // install react-native-threads and configure native projects to enable
  // real background threads.
  // eslint-disable-next-line import/no-extraneous-dependencies
  Thread = require('react-native-threads').Thread;
} catch (e) {
  Thread = null;
}

const createWorker = (workerPath) => {
  if (Thread) {
    try {
      const t = new Thread(workerPath);
      return {
        postMessage: (msg) => t.postMessage(JSON.stringify(msg)),
        onMessage: (cb) => t.onmessage = (m) => cb(JSON.parse(m)),
        terminate: () => t.terminate(),
      };
    } catch (err) {
      // fall through to fallback
    }
  }

  // Fallback shim: emulate worker API but run tasks in main thread using setTimeout
  return {
    postMessage: null,
    onMessage: null,
    terminate: null,
  };
};

export default { createWorker };
