// InteractionManager shim (patch source) — same content used to override RN implementation
const hasRIC = typeof global.requestIdleCallback === 'function';

function requestIdle(cb) {
  if (hasRIC) return global.requestIdleCallback(cb);
  const start = Date.now();
  const id = setTimeout(() => cb({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (Date.now() - start)) }), 0);
  return id;
}

function cancelIdle(id) {
  if (hasRIC) return global.cancelIdleCallback(id);
  clearTimeout(id);
}

let nextHandle = 1;
const handles = new Set();

const InteractionManager = {
  runAfterInteractions(cb) {
    if (typeof cb !== 'function') return null;
    const id = requestIdle(() => {
      try { cb(); } catch (e) { /* swallow */ }
      handles.delete(id);
    });
    handles.add(id);
    return id;
  },

  createInteractionHandle() {
    const handle = nextHandle++;
    handles.add(handle);
    return handle;
  },

  clearInteractionHandle(handle) {
    try { cancelIdle(handle); } catch (e) { /* ignore */ }
    handles.delete(handle);
  },

  addListener() { return { remove() {} }; },
  removeListener() {},
  _activeHandlesCount() { return handles.size; },
};

module.exports = InteractionManager;
module.exports.default = InteractionManager;
module.exports.InteractionManager = InteractionManager;
try { global.InteractionManager = InteractionManager; } catch (e) {}
