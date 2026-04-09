import { runMonteCarlo } from '../services/simulations/monteCarlo.js';

(() => {
  const assets = [
    { S0: 100, quantity: 1, muAnnual: 0, sigmaAnnual: 20 },
    { S0: 50, quantity: 2, muAnnual: 0, sigmaAnnual: 30 },
  ];

  console.log('Running student-t (df=5) seeded run...');
  const res = runMonteCarlo({ assets, N: 2000, steps: 12, seed: 9999, correlated: true, shrinkageAlpha: 0.05, dist: 'student', studentDf: 5 });
  console.log('P10:', res.p10, 'P50:', res.p50, 'P90:', res.p90, 'CVaR95:', res.cvar95, 'ProbLoss%:', res.probLoss);
})();
