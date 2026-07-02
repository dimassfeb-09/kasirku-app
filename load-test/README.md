# Load Testing — Kasirku POS

## Prerequisites

```bash
brew install k6
```

## Get Session Token

1. Login to Kasirku app in browser
2. Open DevTools → Application → Cookies
3. Copy the value of `kasirku-session` cookie

## Get IDs

Run these commands with your token to get required IDs:

```bash
# Get store ID
curl -H "Cookie: kasirku-session=TOKEN" http://localhost:3000/api/user-stores

# Get product ID (first product)
curl -H "Cookie: kasirku-session=TOKEN" http://localhost:3000/api/products?limit=1
```

## Quick Smoke Test

Verifies all endpoints work with a single user:

```bash
k6 run smoke-test.js \
  -e TOKEN=your_token \
  -e STORE_ID=store_id \
  -e PRODUCT_ID=product_id
```

## Run Stress Test

Default: ramp 20 → sustain 100 → ramp down:

```bash
k6 run kasirku-stress.js \
  -e TOKEN=your_token \
  -e STORE_ID=store_id \
  -e PRODUCT_ID=product_id
```

## Run Heavy Spike Test (2000 VUs max)

Two concurrent scenarios: ramp-up spike (500→1000→2000 VUs) + chaos pattern (arrival-rate). No think time — pure pressure:

```bash
k6 run stresstest-berat.js \
  -e TOKEN=your_token \
  -e STORE_ID=store_id \
  -e PRODUCT_IDS=id1,id2,id3,id4,id5
```

⚠️ **Warning**: This will generate ~15,000+ requests and may overwhelm your dev server. Monitor CPU/memory.

## Custom Load Profile

```bash
# Sustained 50 users, 5 minutes
k6 run kasirku-stress.js \
  --vus 50 --duration 5m \
  -e TOKEN=... -e STORE_ID=... -e PRODUCT_ID=...
```

## Output Reference

```
     http_req_duration.....: p(95)=452ms   → 95% of requests finished in 452ms
     http_req_failed.......: 0.23%         → error rate (target <1%)
     http_reqs.............: 2500           → total requests sent
     iterations............: 500            → complete user flows
     vus...................: 100            → concurrent users at peak
     vus_max...............: 100
```

### Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| p(95) duration | <300ms | 300-500ms | >500ms |
| Error rate | <0.5% | 0.5-1% | >1% |
| Throughput | Stable growth | Plateau | Decline |

## Troubleshooting

| Error | Cause |
|-------|-------|
| `401 Unauthorized` | Token expired or invalid — login again |
| `400 Stok ... tidak cukup` | Product out of stock — use different product |
| `ECONNREFUSED` | Server not running — start dev server |

## Files

| File | Purpose |
|------|---------|
| `smoke-test.js` | Quick validation of all endpoints (CI-ready) |
| `kasirku-stress.js` | Moderate stress test, ramp 20 → 100 concurrent users |
| `stresstest-berat.js` | Heavy spike test: 500 → 1000 → **2000 VUs** + chaos pattern. **Run with caution.** |
