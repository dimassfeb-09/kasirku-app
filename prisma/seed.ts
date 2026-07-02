import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const org = await prisma.organization.upsert({
    where: { slug: "kasirku-demo" },
    update: {},
    create: {
      name: "Kasirku Demo Store",
      slug: "kasirku-demo",
    },
  });

  // Create multiple stores
  const mainStore = await prisma.store.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Main Store" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Main Store",
      address: "Jl. Jendral Sudirman No. 1, Jakarta",
      phone: "021-12345678",
      currency: "IDR",
      taxRate: 11,
      receiptHeader: "Kasirku POS - Thank you!",
      receiptFooter: "Barang yang sudah dibeli tidak dapat dikembalikan.",
    },
  });

  const branchStore = await prisma.store.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Branch Store" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Branch Store",
      address: "Jl. Gatot Subroto No. 45, Jakarta",
      phone: "021-87654321",
      currency: "IDR",
      taxRate: 11,
      receiptHeader: "Kasirku Branch - Thank you!",
      receiptFooter: "Barang yang sudah dibeli tidak dapat dikembalikan.",
    },
  });

  const warehouse = await prisma.store.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Warehouse" },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Warehouse",
      address: "Jl. Industri Raya No. 99, Tangerang",
      phone: "021-55556666",
      currency: "IDR",
      taxRate: 11,
      receiptHeader: "Kasirku Warehouse",
      receiptFooter: "Gudang Utama",
    },
  });

  const stores = [mainStore, branchStore, warehouse];

  const user = await prisma.user.upsert({
    where: { email: "admin@kasirku.app" },
    update: { password: passwordHash },
    create: {
      organizationId: org.id,
      email: "admin@kasirku.app",
      password: passwordHash,
      fullName: "Admin Kasirku",
      role: "OWNER",
    },
  });

  // Assign owner to all stores
  for (const store of stores) {
    await prisma.userStore.upsert({
      where: { userId_storeId: { userId: user.id, storeId: store.id } },
      update: {},
      create: { userId: user.id, storeId: store.id },
    });
  }

  const cashier = await prisma.user.upsert({
    where: { email: "cashier@kasirku.app" },
    update: { password: passwordHash },
    create: {
      organizationId: org.id,
      email: "cashier@kasirku.app",
      password: passwordHash,
      fullName: "Kasir Satu",
      role: "CASHIER",
    },
  });

  await prisma.userStore.upsert({
    where: { userId_storeId: { userId: cashier.id, storeId: mainStore.id } },
    update: {},
    create: { userId: cashier.id, storeId: mainStore.id },
  });

  // Create categories
  const categoryMakanan = await prisma.category.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Makanan" },
    },
    update: {},
    create: { organizationId: org.id, name: "Makanan" },
  });

  const categoryMinuman = await prisma.category.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Minuman" },
    },
    update: {},
    create: { organizationId: org.id, name: "Minuman" },
  });

  const categorySnack = await prisma.category.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Snack" },
    },
    update: {},
    create: { organizationId: org.id, name: "Snack" },
  });

  const categoryElektronik = await prisma.category.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Elektronik" },
    },
    update: {},
    create: { organizationId: org.id, name: "Elektronik" },
  });

  const categoryPakaian = await prisma.category.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Pakaian" },
    },
    update: {},
    create: { organizationId: org.id, name: "Pakaian" },
  });

  const categories = [categoryMakanan, categoryMinuman, categorySnack, categoryElektronik, categoryPakaian];

  // Generate 50 diverse products
  const productData = [
    // Makanan (15 items)
    { name: "Nasi Goreng", price: 25000, cost: 12000, category: categoryMakanan },
    { name: "Mie Ayam", price: 22000, cost: 10000, category: categoryMakanan },
    { name: "Soto Ayam", price: 20000, cost: 9000, category: categoryMakanan },
    { name: "Ayam Goreng", price: 28000, cost: 14000, category: categoryMakanan },
    { name: "Nasi Uduk", price: 18000, cost: 8000, category: categoryMakanan },
    { name: "Bakso", price: 20000, cost: 9000, category: categoryMakanan },
    { name: "Gado-Gado", price: 22000, cost: 10000, category: categoryMakanan },
    { name: "Nasi Kuning", price: 19000, cost: 8500, category: categoryMakanan },
    { name: "Rendang", price: 35000, cost: 18000, category: categoryMakanan },
    { name: "Sate Ayam", price: 30000, cost: 15000, category: categoryMakanan },
    { name: "Pecel Lele", price: 24000, cost: 12000, category: categoryMakanan },
    { name: "Nasi Padang", price: 32000, cost: 16000, category: categoryMakanan },
    { name: "Ayam Geprek", price: 26000, cost: 13000, category: categoryMakanan },
    { name: "Burger", price: 28000, cost: 14000, category: categoryMakanan },
    { name: "Pizza Slice", price: 35000, cost: 18000, category: categoryMakanan },

    // Minuman (15 items)
    { name: "Es Teh Manis", price: 8000, cost: 3000, category: categoryMinuman },
    { name: "Es Jeruk", price: 10000, cost: 4000, category: categoryMinuman },
    { name: "Kopi Hitam", price: 12000, cost: 5000, category: categoryMinuman },
    { name: "Air Mineral", price: 5000, cost: 2000, category: categoryMinuman },
    { name: "Cappuccino", price: 22000, cost: 10000, category: categoryMinuman },
    { name: "Latte", price: 24000, cost: 11000, category: categoryMinuman },
    { name: "Jus Alpukat", price: 18000, cost: 8000, category: categoryMinuman },
    { name: "Jus Mangga", price: 16000, cost: 7000, category: categoryMinuman },
    { name: "Es Kelapa", price: 12000, cost: 5000, category: categoryMinuman },
    { name: "Teh Tarik", price: 10000, cost: 4000, category: categoryMinuman },
    { name: "Kopi Susu", price: 15000, cost: 6500, category: categoryMinuman },
    { name: "Milkshake", price: 25000, cost: 12000, category: categoryMinuman },
    { name: "Smoothie Bowl", price: 35000, cost: 18000, category: categoryMinuman },
    { name: "Es Campur", price: 18000, cost: 8000, category: categoryMinuman },
    { name: "Soda Gembira", price: 12000, cost: 5000, category: categoryMinuman },

    // Snack (10 items)
    { name: "Keripik Singkong", price: 10000, cost: 5000, category: categorySnack },
    { name: "Popcorn", price: 15000, cost: 7000, category: categorySnack },
    { name: "Kacang Goreng", price: 12000, cost: 6000, category: categorySnack },
    { name: "Kerupuk", price: 8000, cost: 4000, category: categorySnack },
    { name: "Brownies", price: 20000, cost: 10000, category: categorySnack },
    { name: "Donat", price: 15000, cost: 7000, category: categorySnack },
    { name: "Croissant", price: 18000, cost: 9000, category: categorySnack },
    { name: "Cookies", price: 25000, cost: 12000, category: categorySnack },
    { name: "Pisang Goreng", price: 10000, cost: 5000, category: categorySnack },
    { name: "Risoles", price: 12000, cost: 6000, category: categorySnack },

    // Elektronik (5 items)
    { name: "Charger USB-C", price: 75000, cost: 40000, category: categoryElektronik },
    { name: "Kabel Data", price: 35000, cost: 18000, category: categoryElektronik },
    { name: "Earphone", price: 120000, cost: 60000, category: categoryElektronik },
    { name: "Power Bank 10000mAh", price: 150000, cost: 75000, category: categoryElektronik },
    { name: "USB Flash Drive 32GB", price: 80000, cost: 40000, category: categoryElektronik },

    // Pakaian (5 items)
    { name: "Kaos Polos", price: 50000, cost: 25000, category: categoryPakaian },
    { name: "Celana Jeans", price: 180000, cost: 90000, category: categoryPakaian },
    { name: "Jaket Hoodie", price: 200000, cost: 100000, category: categoryPakaian },
    { name: "Topi Baseball", price: 60000, cost: 30000, category: categoryPakaian },
    { name: "Kaos Kaki", price: 25000, cost: 12000, category: categoryPakaian },
  ];

  console.log(`Creating ${productData.length} products...`);

  for (let i = 0; i < productData.length; i++) {
    const p = productData[i];
    const sku = `PRD-${String(i + 1).padStart(3, "0")}`;
    const barcode = `899123456${String(7000 + i).padStart(4, "0")}`;

    const existing = await prisma.product.findFirst({
      where: { organizationId: org.id, sku },
    });

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: { price: p.price, cost: p.cost },
        })
      : await prisma.product.create({
          data: {
            organizationId: org.id,
            categoryId: p.category.id,
            name: p.name,
            sku,
            barcode,
            price: p.price,
            cost: p.cost,
          },
        });

    // Assign to stores based on category (realistic distribution)
    // Main Store: all products | Branch Store: food & drinks only | Warehouse: all products (bulk)
    const categoryNames = [p.category.name];
    const isFnb = categoryNames.some((n) => ["Makanan", "Minuman", "Snack"].includes(n));

    const storeAssignments = [
      { store: mainStore, assign: true, minStock: 100, maxStock: 300 },
      { store: branchStore, assign: isFnb, minStock: 50, maxStock: 200 },
      { store: warehouse, assign: true, minStock: 200, maxStock: 500 },
    ];

    for (const { store, assign, minStock, maxStock } of storeAssignments) {
      if (!assign) continue;

      const existingInv = await prisma.inventory.findFirst({
        where: {
          storeId: store.id,
          productId: product.id,
          productVariantId: null,
        },
      });

      const quantity = randomInt(minStock, maxStock);

      if (existingInv) {
        await prisma.inventory.update({
          where: { id: existingInv.id },
          data: { quantity },
        });
      } else {
        await prisma.inventory.create({
          data: {
            storeId: store.id,
            productId: product.id,
            quantity,
            lowStockThreshold: 10,
          },
        });
      }
    }
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: { organizationId: org.id, email: "budi@example.com" },
  });

  if (!existingCustomer) {
    await prisma.customer.create({
      data: {
        organizationId: org.id,
        name: "Budi Santoso",
        phone: "0812-3456-7890",
        email: "budi@example.com",
      },
    });
  }

  console.log("Seed completed!");
  console.log(`  Organization : ${org.name} (${org.id})`);
  console.log(`  Stores       : ${stores.length} (Main Store, Branch Store, Warehouse)`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Owner        : admin@kasirku.app / password123`);
  console.log(`  Cashier      : cashier@kasirku.app / password123`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Products     : ${productData.length} items`);
  console.log(`  Categories   : ${categories.length} categories`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
