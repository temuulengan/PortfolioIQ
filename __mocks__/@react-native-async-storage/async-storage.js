// In-memory AsyncStorage stand-in so storage-backed services can be unit tested
// under the plain node test environment.
let store = {};

const AsyncStorage = {
  getItem: jest.fn(async (key) => (key in store ? store[key] : null)),
  setItem: jest.fn(async (key, value) => { store[key] = String(value); }),
  removeItem: jest.fn(async (key) => { delete store[key]; }),
  clear: jest.fn(async () => { store = {}; }),
  __reset: () => { store = {}; },
  __dump: () => ({ ...store }),
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
