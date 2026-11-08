const url = process.argv[2], total = Number(process.argv[3] || 400), conc = Number(process.argv[4] || 10);
(async () => {
  for (let i = 0; i < 20; i++) await fetch(url).then(r => r.text()); // warm-up
  const lat = []; let next = 0; const t0 = performance.now();
  await Promise.all(Array.from({ length: conc }, async () => {
    while (next < total) { next++; const s = performance.now(); await fetch(url).then(r => r.text()); lat.push(performance.now() - s); }
  }));
  const wall = (performance.now() - t0) / 1000; lat.sort((a, b) => a - b);
  const p = q => lat[Math.min(lat.length - 1, Math.floor(q * lat.length))].toFixed(1);
  console.log(JSON.stringify({ requests: lat.length, concurrency: conc, rps: (lat.length / wall).toFixed(0), p50_ms: p(0.5), p95_ms: p(0.95), p99_ms: p(0.99) }));
})();
