// Shim for InteractionManager to reduce deprecation warnings
// Provides minimal API used by libraries: runAfterInteractions, createInteractionHandle, clearInteractionHandle

const { runWhenIdle, cancelIdle } = require('./idleScheduler');

let nextHandle = 1;
const activeHandles = new Set();

const InteractionShim = {
  runAfterInteractions(cb) {
    if (typeof cb !== 'function') return null;
    const id = runWhenIdle(() => {
      try { cb(); } catch (e) { console.error('runAfterInteractions callback error', e); }
      activeHandles.delete(id);
    });
    activeHandles.add(id);
    return id;
  },

  createInteractionHandle() {
    const handle = nextHandle++;
    // track handle to satisfy libraries that clear it later
    activeHandles.add(handle);
    return handle;
  },

  clearInteractionHandle(handle) {
    // If handle corresponds to an idle callback id, cancel it
    try {
      cancelIdle(handle);
    } catch (e) {
      // ignore
    }
    activeHandles.delete(handle);
  },
};

global.InteractionManager = InteractionShim;

module.exports = InteractionShim;
