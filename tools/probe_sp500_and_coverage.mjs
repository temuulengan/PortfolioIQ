import axios from 'axios';
import fs from 'fs';

const WIKI_URL = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
const SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search?q=';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fetchSp500 = async () => {
  const res = await axios.get(WIKI_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioIQBot/1.0)' } });
  const html = res.data;
  // find the first wikitable sortable which contains the table
  const tableMatch = html.match(/<table[^>]*class="wikitable[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];
  const table = tableMatch[0];
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/g)];
  const tickers = [];
  for (const r of rows) {
    const row = r[0];
    // find first <td> which contains the ticker (usually first column)
    const tdMatch = row.match(/<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<\/td>/);
    if (tdMatch) {
      const t = tdMatch[1].trim();
      // sanitize (Wikipedia uses BRK.B etc; map to Yahoo conventions)
      const sym = t.replace('.', '-').replace('\u00A0','').trim();
      if (sym && !tickers.includes(sym)) tickers.push(sym);
    }
  }
  return tickers;
};

const probeCoverage = async (symbols) => {
  const results = [];
  for (let i = 0; i < symbols.length; i++) {
    const s = symbols[i];
    try {
      const url = `${SEARCH_URL}${encodeURIComponent(s)}&quotesCount=1&newsCount=0`;
      const r = await axios.get(url);
      const found = r.data && (r.data.quotes || []).length > 0;
      results.push({ symbol: s, found });
    } catch (e) {
      results.push({ symbol: s, found: false, error: String(e) });
    }
    // be gentle
    if ((i+1) % 20 === 0) await sleep(300);
  }
  const foundCount = results.filter(r=>r.found).length;
  return { total: symbols.length, foundCount, results };
};

const main = async () => {
  try {
    console.log('Fetching S&P 500 list from Wikipedia...');
    const tickers = await fetchSp500();
    if (!tickers || !tickers.length) {
      console.error('Could not parse S&P 500 tickers');
      process.exit(2);
    }
    console.log('Probing coverage for', tickers.length, 'tickers');
    const report = await probeCoverage(tickers);
    fs.writeFileSync('docs/coverage_sp500.json', JSON.stringify({ timestamp: new Date().toISOString(), report }, null, 2));
    console.log('Wrote docs/coverage_sp500.json');
    console.log('Found', report.foundCount, '/', report.total);
  } catch (e) {
    console.error('Error:', e);
    process.exit(2);
  }
};

main();
