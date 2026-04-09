import { runMonteCarlo } from '../services/simulations/monteCarlo.js';

(async () => {
  const assets = [
    { S0: 100, quantity: 1, muAnnual: 0, sigmaAnnual: 20 },
  ];

  const res = runMonteCarlo({ assets, N: 2000, steps: 12, seed: 123456, correlated: false, shrinkageAlpha: 0.05 });
  console.log('Monte Carlo seeded run (single asset):');
  console.log('P10:', res.p10);
  console.log('P50:', res.p50);
  console.log('P90:', res.p90);
  console.log('CVaR95:', res.cvar95);
  console.log('ProbLoss %:', res.probLoss);
})();
