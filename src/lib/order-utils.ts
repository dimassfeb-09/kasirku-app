export function serializeOrder(order: any) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    discountAmount: Number(order.discountAmount),
    total: Number(order.total),
    items: order.items.map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      discountAmount: Number(item.discountAmount),
      total: Number(item.total),
    })),
    payments: order.payments.map((p: any) => ({
      ...p,
      amount: Number(p.amount),
    })),
  };
}
