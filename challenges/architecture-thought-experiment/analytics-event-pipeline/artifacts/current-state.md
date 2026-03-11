# Current State

Current path:

1. Application services insert analytics events into a shared `event_log` table in the primary Postgres database.
2. An hourly job exports rows to object storage.
3. A second job transforms rows and loads them into the warehouse.

Pain points:

- API latency regresses during traffic spikes because event inserts compete with user-facing queries.
- Teams emit different payload shapes under the same event name.
- Reprocessing is manual and error-prone.
- Analysts do not trust freshness or completeness.
- Some product teams want near-real-time dashboards; others only need daily reporting.

Constraints:

- The data platform team has 3 engineers.
- Finance expects infrastructure cost discipline.
- Compliance requires retention controls for selected event classes.

