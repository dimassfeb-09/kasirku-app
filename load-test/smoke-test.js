import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 1,
  iterations: 1,
};

const BASE = "http://localhost:3000";
const TOKEN = __ENV.TOKEN;
const STORE_ID = __ENV.STORE_ID;
const PRODUCT_ID = __ENV.PRODUCT_ID;

const headers = {
  Cookie: `kasirku-session=${TOKEN}`,
};

export default function () {
  let passed = 0;
  let failed = 0;

  const log = (name, ok) => {
    if (ok) passed++;
    else failed++;
    console.log(`  ${ok ? "✓" : "✗"} ${name}`);
  };

  // 1. Browse products
  console.log("\n--- Products ---");
  let r = http.get(`${BASE}/api/products?page=1&limit=5`, { headers });
  log("GET /api/products", r.status === 200);
  if (r.status !== 200) console.log("   Status:", r.status, r.body);

  // 2. POS products
  console.log("\n--- POS ---");
  r = http.get(`${BASE}/api/products?storeId=${STORE_ID}`, { headers });
  log(`GET /api/products?storeId=${STORE_ID}`, r.status === 200);
  if (r.status !== 200) console.log("   Status:", r.status, r.body);

  // 3. Checkout
  console.log("\n--- Checkout ---");
  r = http.post(
    `${BASE}/api/orders`,
    JSON.stringify({
      storeId: STORE_ID,
      items: [{ productId: PRODUCT_ID, name: "Test Produk", price: 10000, quantity: 1 }],
      paymentMethod: "CASH",
      paymentAmount: 10000,
    }),
    { headers: { ...headers, "Content-Type": "application/json" } },
  );
  log("POST /api/orders", r.status === 201);
  if (r.status !== 201) console.log("   Status:", r.status, r.body);

  // 4. View transactions
  console.log("\n--- Transactions ---");
  r = http.get(`${BASE}/api/orders?page=1&limit=5`, { headers });
  log("GET /api/orders?page=1&limit=5", r.status === 200);
  if (r.status !== 200) console.log("   Status:", r.status, r.body);

  // 5. Reports
  console.log("\n--- Reports ---");
  r = http.get(`${BASE}/api/reports?period=today`, { headers });
  log("GET /api/reports?period=today", r.status === 200);
  if (r.status !== 200) console.log("   Status:", r.status, r.body);

  // 6. User info
  console.log("\n--- Auth ---");
  r = http.get(`${BASE}/api/auth/me`, { headers });
  log("GET /api/auth/me", r.status === 200);
  if (r.status !== 200) console.log("   Status:", r.status, r.body);

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) throw new Error(`${failed} checks failed`);
}
