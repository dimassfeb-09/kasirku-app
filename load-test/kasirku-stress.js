import http from "k6/http";
import { check, sleep, group } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "2m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
    "http_req_duration{group:!checkout}": ["p(95)<300"],
    "http_reqs{group:browse}": ["rate>10"],
    "http_reqs{group:checkout}": ["count>50"],
  },
};

const BASE = "http://localhost:3000";
const TOKEN = __ENV.TOKEN;
const STORE_ID = __ENV.STORE_ID;
const PRODUCT_ID = __ENV.PRODUCT_ID;

const headers = {
  Cookie: `kasirku-session=${TOKEN}`,
  "Content-Type": "application/json",
};

export default function () {
  group("browse", function () {
    const r = http.get(`${BASE}/api/products?page=1&limit=20`, { headers });
    check(r, {
      "products loaded": (res) => res.status === 200,
      "products fast": (res) => res.timings.duration < 300,
    });
    sleep(Math.random() * 2 + 1);
  });

  group("pos", function () {
    const r = http.get(`${BASE}/api/products?storeId=${STORE_ID}`, { headers });
    check(r, {
      "pos products loaded": (res) => res.status === 200,
    });
    sleep(Math.random() * 2 + 1);
  });

  group("checkout", function () {
    const r = http.post(
      `${BASE}/api/orders`,
      JSON.stringify({
        storeId: STORE_ID,
        items: [
          { productId: PRODUCT_ID, name: "Test Produk", price: 10000, quantity: 1 },
        ],
        paymentMethod: "CASH",
        paymentAmount: 10000,
      }),
      { headers },
    );
    check(r, {
      "checkout success": (res) => res.status === 201,
    });
    sleep(Math.random() * 3 + 2);
  });

  group("transactions", function () {
    const r = http.get(`${BASE}/api/orders?page=1&limit=20`, { headers });
    check(r, {
      "orders loaded": (res) => res.status === 200,
    });
    sleep(Math.random() * 2 + 1);
  });

  group("reports", function () {
    const r = http.get(`${BASE}/api/reports?period=today`, { headers });
    check(r, {
      "reports loaded": (res) => res.status === 200,
    });
    sleep(Math.random() * 3 + 2);
  });
}
