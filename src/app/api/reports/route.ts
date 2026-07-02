import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "reports" });

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");
  const period = searchParams.get("period") || "today";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (dateFrom && dateTo) {
    startDate = new Date(dateFrom);
    endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate = now;
    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week": {
        const day = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        break;
      }
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  const where: any = {
    store: { organizationId: auth.ctx.session.organizationId },
    createdAt: { gte: startDate, lte: endDate },
    status: "COMPLETED",
  };

  // CASHIER can only see their own orders
  if (auth.ctx.userRole === "CASHIER") {
    where.userId = auth.ctx.session.userId;
  }

  if (storeId) {
    where.storeId = storeId;
  }

  // Total orders & revenue
  const [orders, totalOrders] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        items: true,
        payments: true,
        customer: true,
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.order.count({ where }),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalTax = orders.reduce((sum, o) => sum + Number(o.taxAmount), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Top products
  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const order of orders) {
    for (const item of order.items) {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].revenue += Number(item.total);
    }
  }
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Sales by payment method
  const paymentMethods: Record<string, number> = {};
  for (const order of orders) {
    for (const payment of order.payments) {
      paymentMethods[payment.method] = (paymentMethods[payment.method] || 0) + Number(payment.amount);
    }
  }

  // Sales by hour (for today)
  const salesByHour: Record<number, number> = {};
  if (period === "today") {
    for (const order of orders) {
      const hour = order.createdAt.getHours();
      salesByHour[hour] = (salesByHour[hour] || 0) + Number(order.total);
    }
  }

  // Daily sales (for week/month)
  const dailySales: Record<string, { date: string; revenue: number; orders: number }> = {};
  if (period === "week" || period === "month") {
    for (const order of orders) {
      const dateStr = order.createdAt.toISOString().slice(0, 10);
      if (!dailySales[dateStr]) {
        dailySales[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
      }
      dailySales[dateStr].revenue += Number(order.total);
      dailySales[dateStr].orders += 1;
    }
  }

  // Top customers
  const customerSales: Record<string, { name: string; orders: number; total: number }> = {};
  for (const order of orders) {
    const name = order.customer?.name || "Guest";
    const key = order.customerId || "guest";
    if (!customerSales[key]) {
      customerSales[key] = { name, orders: 0, total: 0 };
    }
    customerSales[key].orders += 1;
    customerSales[key].total += Number(order.total);
  }
  const topCustomers = Object.values(customerSales)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Cashier performance (only for OWNER/MANAGER)
  let cashierPerformance: { userId: string; userName: string; orderCount: number; totalRevenue: number; avgOrderValue: number }[] = [];
  if (auth.ctx.userRole !== "CASHIER") {
    const cashierSales: Record<string, { userName: string; orderCount: number; totalRevenue: number }> = {};
    for (const order of orders) {
      const key = order.userId;
      if (!cashierSales[key]) {
        cashierSales[key] = { userName: order.user.fullName, orderCount: 0, totalRevenue: 0 };
      }
      cashierSales[key].orderCount += 1;
      cashierSales[key].totalRevenue += Number(order.total);
    }
    cashierPerformance = Object.entries(cashierSales)
      .map(([userId, data]) => ({
        userId,
        userName: data.userName,
        orderCount: data.orderCount,
        totalRevenue: data.totalRevenue,
        avgOrderValue: data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  return NextResponse.json({
    summary: {
      totalOrders,
      totalRevenue,
      totalTax,
      avgOrderValue,
    },
    topProducts,
    paymentMethods,
    salesByHour: Object.entries(salesByHour).map(([hour, revenue]) => ({
      hour: Number(hour),
      revenue,
    })),
    dailySales: Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date)),
    topCustomers,
    cashierPerformance,
    recentOrders: orders.slice(0, 10).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt,
      staff: o.user.fullName,
      paymentMethod: o.payments[0]?.method || "N/A",
    })),
  });
}
