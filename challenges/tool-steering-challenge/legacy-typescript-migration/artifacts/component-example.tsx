type Props = any;

export function CheckoutSidebar(props: Props) {
  const coupon = props.coupon || {};
  const lineItems = props.items || [];
  const subtotal = lineItems.reduce((sum: number, item: any) => sum + item.price, 0);
  const discount = coupon.percent ? subtotal * coupon.percent : coupon.amount || 0;
  const total = subtotal - discount;

  return (
    <aside>
      <h2>{props.title || "Summary"}</h2>
      <p>Total: {total}</p>
    </aside>
  );
}

