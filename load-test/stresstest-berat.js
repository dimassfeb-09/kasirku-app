import http from "k6/http";
import { check } from "k6";
import { randomItem, randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const PRODUCT_IDS = __ENV.PRODUCT_IDS
  ? __ENV.PRODUCT_IDS.split(",")
  : [__ENV.PRODUCT_ID];

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 500 },
        { duration: "30s", target: 1000 },
        { duration: "2m", target: 1000 },
        { duration: "30s", target: 2000 },
        { duration: "2m", target: 2000 },
        { duration: "1m", target: 500 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
    chaos: {
      executor: "ramping-arrival-rate",
      startRate: 50,
      timeUnit: "1s",
      preAllocatedVUs: 500,
      maxVUs: 2000,
      stages: [
        { duration: "30s", target: 200 },
        { duration: "1m", target: 500 },
        { duration: "1m", target: 100 },
        { duration: "30s", target: 800 },
        { duration: "1m", target: 1500 },
        { duration: "1m", target: 200 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE = "http://localhost:3000";
const TOKEN = __ENV.TOKEN;
const STORE_ID = __ENV.STORE_ID;

const headers = {
  Cookie: `kasirku-session=${TOKEN}`,
  "Content-Type": "application/json",
};

function randItems(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const pid = randomItem(PRODUCT_IDS);
    const qty = randomIntBetween(1, 3);
    const price = randomIntBetween(5000, 100000);
    items.push({
      productId: pid,
      name: `Produk ${pid.slice(-4)}`,
      price,
      quantity: qty,
    });
  }
  return items;
}

export default function () {
  // 1. Browse products (list + search)
  const searches = ["", "Kaos", "Makanan", "Minuman", "Elektronik", "Aksesoris"];
  for (const q of searches) {
    http.get(`${BASE}/api/products?search=${q}&limit=20`, { headers });
  }

  // 2. POS products by store
  http.get(`${BASE}/api/products?storeId=${STORE_ID}`, { headers });

  // 3. Checkout — 3 concurrent writes per iteration
  for (let i = 0; i < 3; i++) {
    const total = randomIntBetween(20000, 500000);
    http.post(
      `${BASE}/api/orders`,
      JSON.stringify({
        storeId: STORE_ID,
        items: randItems(randomIntBetween(1, 4)),
        paymentMethod: randomItem(["CASH", "DEBIT", "QRIS"]),
        paymentAmount: total,
      }),
      { headers },
    );
  }

  // 4. View transactions (page 1 & 2)
  http.get(`${BASE}/api/orders?page=1&limit=20`, { headers });
  http.get(`${BASE}/api/orders?page=2&limit=20`, { headers });

  // 5. Reports — all periods
  for (const period of ["today", "week", "month", "custom"]) {
    let url = `${BASE}/api/reports?period=${period}`;
    if (period === "custom") {
      url += "&startDate=2026-01-01&endDate=2026-12-31";
    }
    http.get(url, { headers });
  }

  // 6. Auth me
  http.get(`${BASE}/api/auth/me`, { headers });
}
