type Event = {
  id: string;
  orderId: string;
  type: "payment.succeeded";
};

const processedEvents = new Set<string>();

export async function handleWebhook(event: Event) {
  if (processedEvents.has(event.id)) {
    return { status: 200 };
  }

  await markOrderPaid(event.orderId);
  await createShipment(event.orderId);

  processedEvents.add(event.id);

  return { status: 200 };
}

async function markOrderPaid(orderId: string) {
  return orderId;
}

async function createShipment(orderId: string) {
  return orderId;
}

