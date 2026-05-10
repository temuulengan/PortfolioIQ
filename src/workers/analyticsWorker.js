// Lightweight analytics worker wrapper.
// Attempts to offload heavy calculations using a worker when available,
// falls back to setTimeout-based async execution to yield the main thread.

import runBridgewaterAnalysisImpl from '../../shared/bridgewaterAnalysis';
import { runMonteCarloAsync as runMonteCarloImpl } from '../../services/simulations/monteCarlo';

async function runInBackground(fn, ...args) {
  // If a dedicated worker library is added, plug it here.
  // For now use setTimeout to schedule off the immediate call stack.
  return new Promise((resolve, reject) => {
    try {
      setTimeout(async () => {
        try {
          const res = await fn(...args);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      }, 0);
    } catch (err) {
      reject(err);
    }
  });
}

export const runBridgewaterAnalysis = async (holdings, options = {}) => {
  return runInBackground(runBridgewaterAnalysisImpl, holdings, options);
};

export const runMonteCarlo = async (opts = {}) => {
  return runInBackground(runMonteCarloImpl, opts);
};

export default {
  runBridgewaterAnalysis,
  runMonteCarlo,
};
