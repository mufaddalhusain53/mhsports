export type CashfreeLink = {
  link_id: string;
  link_status: string;
  link_amount: number;
  link_currency: string;
  link_url: string;
  link_partial_payments: boolean;
};

export type CashfreeOrder = {
  order_id: string;
  order_status: string;
  order_amount: number;
  order_currency: string;
};

export function validCashfreeLink(link: CashfreeLink, id: string, amount: number): boolean {
  return link.link_id === id && Number(link.link_amount) === amount &&
    link.link_currency === "INR" && link.link_partial_payments === false;
}

export function hasPaidCashfreeOrder(orders: CashfreeOrder[], amount: number): boolean {
  return orders.some((order) => order.order_status === "PAID" &&
    Number(order.order_amount) === amount && order.order_currency === "INR");
}
