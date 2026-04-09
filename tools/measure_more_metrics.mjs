import axios from 'axios';
import fs from 'fs';

const YAHOO_BASE = 'https://query1.finance.yahoo.com';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const measureLatency = async (url, samples = 30, delayMs = 50) => {
  const times = [];
  for (let i = 0; i < samples; i++) {
    const t0 = Date.now();
    try { await axios.get(url); } catch (e) { /* ignore individual errors */ }
    const t1 = Date.now();
    times.push(t1 - t0);
    await sleep(delayMs);
  }
  times.sort((a,b)=>a-b);
  const p = (n) => times.length ? times[Math.floor((n/100)*(times.length-1))] : 0;
  const sum = times.reduce((s,v)=>s+v,0);
  const mean = times.length ? sum / times.length : 0;
  return { count: times.length, min: times[0]||0, median: p(50), p95: p(95), p99: p(99), max: times[times.length-1]||0, mean };
};

const probeDataFreshness = async (symbol='AAPL') => {
  try {
    const url = `${YAHOO_BASE}/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await axios.get(url);
    const meta = res.data && res.data.chart && res.data.chart.result && res.data.chart.result[0] && res.data.chart.result[0].meta;
    if (!meta) return { ok: false };
    const t = meta.regularMarketTime || meta.chartPreviousCloseTime || null;
    const serverTs = t ? (t * 1000) : null;
    const now = Date.now();
    return { ok: true, serverTs, ageMs: serverTs ? now - serverTs : null };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
};

const probeRateLimits = async (url, attempts = 60, delayMs = 20) => {
  let count429 = 0, errors = 0;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await axios.get(url);
      if (r.status === 429) count429++;
    } catch (e) {
      const code = e?.response?.status;
      if (code === 429) count429++; else errors++;
    }
    await sleep(delayMs);
  }
  return { attempts, count429, errors };
};

const probeThroughput = async (symbols, concurrency = 8) => {
  // measure how many requests/sec we can complete with given concurrency for short runs
  const start = Date.now();
  const chunks = [];
  for (let i = 0; i < symbols.length; i += concurrency) chunks.push(symbols.slice(i, i+concurrency));
  let completed = 0;
  for (const c of chunks) {
    await Promise.all(c.map(s => axios.get(`${YAHOO_BASE}/v8/finance/chart/${s}?interval=1d&range=1d`).catch(()=>null)));
    completed += c.length;
  }
  const dur = (Date.now() - start)/1000;
  return { symbolsTried: symbols.length, completed, durationSec: dur, rps: completed / Math.max(1,dur) };
};

const probeCoverage = async (symbols) => {
  const results = [];
  for (const s of symbols) {
    try {
      const r = await axios.get(`${YAHOO_BASE}/v1/finance/search?q=${encodeURIComponent(s)}&quotesCount=1&newsCount=0`);
      const found = r.data && (r.data.quotes || []).length > 0;
      results.push({ symbol: s, found });
    } catch (e) {
      results.push({ symbol: s, found: false, error: String(e) });
    }
    await sleep(30);
  }
  const foundCount = results.filter(r=>r.found).length;
  return { total: symbols.length, foundCount, results };
};

const main = async () => {
  const report = { timestamp: new Date().toISOString(), probes: {} };

  // latency small sample
  report.probes.searchLatency = await measureLatency(`${YAHOO_BASE}/v1/finance/search?q=AAPL&quotesCount=10&newsCount=0`, 40);
  report.probes.chartLatency = await measureLatency(`${YAHOO_BASE}/v8/finance/chart/AAPL?interval=1d&range=1d`, 40);

  // data freshness
  report.probes.dataFreshness = await probeDataFreshness('AAPL');

  // rate limits quick probe
  report.probes.rateLimit = await probeRateLimits(`${YAHOO_BASE}/v1/finance/search?q=AAPL&quotesCount=1&newsCount=0`, 80, 25);

  // throughput: try 40 symbols concurrency 8
  const sampleSymbols = ['AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','BRK-A','BABA','BTC-USD','ETH-USD','MSFT','INTC','JPM','V','WMT','DIS','NFLX','ADBE','PYPL','ORCL','CSCO','NKE','TM','SHOP','UBER','LYFT','SQ','CRM','QCOM','BMY','PFE','XOM','CVX','BP','TOT','RIO','BHP','HSBA.L','0700.HK'];
  report.probes.throughput = await probeThroughput(sampleSymbols.slice(0,40), 8);

  // coverage: test for presence of a mixed symbol list
  const coverageSymbols = ['AAPL','MSFT','GOOGL','0005.HK','0700.HK','TSLA','BTC-USD','ETH-USD','GOOG','BABA','RYCEY','RDS-A','VOD.L','HSBA.L','BHP'];
  report.probes.coverage = await probeCoverage(coverageSymbols);

  fs.writeFileSync('docs/metrics_report_more.json', JSON.stringify(report, null, 2));
  console.log('Wrote docs/metrics_report_more.json');
  console.log(JSON.stringify(report, null, 2));
};

main().catch(e=>{ console.error('ERR', e); process.exit(2); });
