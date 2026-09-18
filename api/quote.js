// Reads the stocks on Bud's list from Yahoo Finance's public chart endpoint (last price, previous close, today's 15-minute closes).
// If Yahoo refuses the server, the response says so and carries the last snapshot Bud saw, stamped with its date — never a made-up number.
const LIST = ['NVDA','AAPL','TSLA','META','COIN','AMD','MSFT','AMZN'];
const NAMES = { NVDA:'NVIDIA', AAPL:'Apple', TSLA:'Tesla', META:'Meta', COIN:'Coinbase', AMD:'AMD', MSFT:'Microsoft', AMZN:'Amazon' };
// snapshot read 2026-09-18 after the close (regularMarketPrice, chartPreviousClose, 15m closes)
const SNAP = {
  NVDA:[219.61,219.34,[219.7,219.2,220.6,219.5,219.1,219,219.5,219.8,219.6,219.6,219.6]],
  TSLA:[362.67,366.2,[369.2,365.6,361.2,365.1,366.5,367.7,365.3,363.2,362.2,362.7,362.7]],
  AAPL:[334.855,337,[335.8,335,333.5,333.5,332.7,333.9,334.9,335,334.7,334.9,334.9]],
  AMZN:[253.21,251.19,[252.7,252.4,251.9,252.6,253,254,253.4,253.1,253,253.3,253.2]],
  META:[672.13,682.31,[672.9,674.7,670.8,673.6,675.7,679.8,675.6,673.7,672.8,672.2,672.1]],
  MSFT:[493.767,497.75,[493.6,493.7,492.3,492.4,491.8,493.3,493.3,494,494.2,493.8,493.8]],
  COIN:[192.57,173.97,[182.1,185.8,187.1,189.6,191.4,192.7,192.7,192.7,192.1,192.6,192.6]],
  AMD:[543.65,545.09,[548.1,551.3,549.1,548.3,543.9,542.6,542.5,543.6,543.7,543.9,543.7]],
};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function yahoo(tk) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${tk}?range=1d&interval=15m`, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!r.ok) throw new Error('yahoo ' + r.status);
  const j = await r.json(); const res = j.chart && j.chart.result && j.chart.result[0];
  if (!res || !res.meta) throw new Error('no result');
  const closes = ((res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || []).filter(x => x != null).map(x => +x.toFixed(2));
  return { price: res.meta.regularMarketPrice, prev: res.meta.chartPreviousClose, closes, t: res.meta.regularMarketTime };
}

export default async function handler(req, res) {
  const want = String((req.query && req.query.t) || '').toUpperCase().split(',').filter(t => LIST.includes(t));
  const tks = want.length ? want : LIST;
  const quotes = {}; let live = 0; let latest = 0;
  await Promise.all(tks.map(async tk => {
    try { const q = await yahoo(tk); quotes[tk] = { ...q, name: NAMES[tk], live: true }; live++; latest = Math.max(latest, q.t || 0); }
    catch (e) { const s = SNAP[tk]; quotes[tk] = { price: s[0], prev: s[1], closes: s[2], name: NAMES[tk], live: false, asof: '2026-09-18' }; }
  }));
  res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ ok: true, list: LIST, quotes, live, of: tks.length, via: live ? 'Yahoo Finance chart API' : 'snapshot 2026-09-18 (Yahoo refused the server read)', t: latest || null });
}
