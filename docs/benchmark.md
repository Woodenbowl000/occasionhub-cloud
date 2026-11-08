# Venue-list performance benchmark (before / after optimisation)

Endpoint: `GET /venues?limit=20&userLat=33.7&userLon=73.0` (the public venue search page).
Setup: API on Node.js 22, PostgreSQL 17 + PostGIS on the same laptop, seeded demo data (15 approved venues),
`scripts/bench.js`, 1 000 requests at concurrency 10 after a 20-request warm-up. Run on 2026-11-08.

| Variant | Throughput (req/s) | p50 latency (ms) | p95 latency (ms) | p99 latency (ms) |
| --- | --- | --- | --- | --- |
| Before (one coordinate query per venue: N+1) | 108 – 218 | 46 – 88 | 60 – 129 | 69 – 146 |
| After (one batched coordinate query, page + count in parallel) | 391 – 410 | 23 – 24 | 33 – 36 | 39 – 79 |

Database round trips per request for a 20-venue page: before 1 (venues) + 2 (relations) + 20 (coordinates) + 1 (count) = 24, sequential;
after 1 + 2 + 1 + 1 = 5, with the page and the count issued in parallel. The gap widens as the page size grows.

City search (`city ILIKE '%isl%'`) now uses the trigram index:
`Bitmap Index Scan on "Location_city_trgm_idx"` (from `EXPLAIN`).
