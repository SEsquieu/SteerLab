# Persistence Notes

- `processedEvents` is an in-memory set in the API process
- webhook traffic is handled by 6 stateless pods
- there is no unique constraint on `shipments.order_id`
- payment events are written to an audit table after `createShipment()` succeeds
- the endpoint returns `500` if any downstream call throws

