// Lightweight scheduler utilities using requestIdleCallback with safe fallbacks
// Use these to break up long work and avoid InteractionManager warnings.

const hasRIC = typeof global.requestIdleCallback === 'function';

function requestIdle(cb, options) {
  if (hasRIC) return global.requestIdleCallback(cb, options);
  // fallback: schedule a short timeout and provide a timeRemaining shim
  const start = Date.now();
  const id = setTimeout(() => cb({
    didTimeout: false,
    timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
  }), 0);
  return id;
}

function cancelIdle(id) {
  if (hasRIC) return global.cancelIdleCallback(id);
  clearTimeout(id);
}

function runWhenIdle(fn, opts) {
  return requestIdle((deadline) => {
    try {
      fn(deadline);
    } catch (e) {
      // swallow — caller should handle if needed
      // but surface in console for visibility
      // eslint-disable-next-line no-console
      console.error('runWhenIdle error', e);
    }
  }, opts);
}

// Process an array in chunked idle callbacks to avoid blocking the JS thread.
async function processInChunks(items, processor, { chunkSize = 50, timeout = 30 } = {}) {
  let i = 0;
  return new Promise((resolve, reject) => {
    const work = (deadline) => {
      try {
        const start = Date.now();
        while (i < items.length) {
          processor(items[i], i);
          i += 1;
          if ((Date.now() - start) > timeout) break; // yield back to event loop
        }
        if (i >= items.length) return resolve();
        requestIdle(work);
      } catch (err) {
        reject(err);
      }
    };
    requestIdle(work);
  });
}

export { runWhenIdle, cancelIdle, processInChunks };
