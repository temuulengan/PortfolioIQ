import https from 'https';
import { performance } from 'perf_hooks';

const get = (url) =>
  new Promise((res, rej) => {
    try {
      https
        .get(url, (r) => {
          let data = '';
          r.on('data', (c) => (data += c));
          r.on('end', () => res({ status: r.statusCode, len: data.length, headers: r.headers }));
          r.on('error', rej);
        })
        .on('error', rej);
    } catch (e) {
      rej(e);
    }
  });

const stats = (arr) => {
  arr.sort((a, b) => a - b);
  const p = (n) => {
    if (arr.length === 0) return 0;
    const idx = Math.floor((n / 100) * arr.length);
    return arr[Math.min(idx, arr.length - 1)];
  };
  const sum = arr.reduce((s, x) => s + x, 0);
  const mean = sum / arr.length || 0;
  const sq = arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0);
  const std = Math.sqrt(sq / (arr.length || 1));
  return {
    count: arr.length,
    min: arr[0] || 0,
    median: p(50),
    p95: p(95),
    p99: p(99),
    max: arr[arr.length - 1] || 0,
    mean,
    std,
  };
};

(async () => {
  try {
    const targets = [
      'https://query1.finance.yahoo.com/v1/finance/search?q=AAPL&quotesCount=10&newsCount=0',
      'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
    ];

    const samples = 60;
    const results = { apiLatency: {} };

    for (const url of targets) {
      const times = [];
      for (let i = 0; i < samples; i++) {
        const t0 = performance.now();
        try {
          await get(url);
        } catch (e) {
          // record as high latency indicator
        }
        const t1 = performance.now();
        times.push(t1 - t0);
        await new Promise((r) => setTimeout(r, 30));
      }
      results.apiLatency[url] = stats(times);
    }

    // portfolio calculation timings
    const calc = await import('../shared/calculations.js');
    const sizes = [10, 100, 500];
    results.calcLatency = {};

    for (const n of sizes) {
      const holdings = Array.from({ length: n }, () => ({
        quantity: Math.random() * 100 + 1,
        currentPrice: Math.random() * 200 + 1,
        purchasePrice: Math.random() * 100 + 1,
      }));

      const reps = 200;
      const timesValue = [];
      const timesAlloc = [];

      for (let i = 0; i < reps; i++) {
        const s1 = performance.now();
        calc.calculatePortfolioValue(holdings);
        const e1 = performance.now();
        timesValue.push(e1 - s1);

        const s2 = performance.now();
        calc.calculateAllocation(holdings);
        const e2 = performance.now();
        timesAlloc.push(e2 - s2);
      }

      results.calcLatency[n] = { value: stats(timesValue), allocation: stats(timesAlloc) };
    }

    console.log(JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  } catch (err) {
    console.error('ERROR', err);
    process.exit(2);
  }
})();
