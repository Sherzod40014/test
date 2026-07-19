# 0003. Carton event sourcing

## Status

Accepted

## Context

A hard product requirement is that for every carton, we must always know both:

1. Its current location and status (fast, simple read -- e.g. "where is this carton right now?").
2. Its complete movement history, rendered to warehouse staff and customers as a human-readable
   timeline (e.g. "received at Guangzhou -> photographed -> measured -> labeled -> shelved ->
   transferred to Yiwu -> loaded -> border crossed -> ..."), not as raw database diffs.

A single mutable `Carton` row that is repeatedly `UPDATE`d in place can answer (1) cheaply, but
cannot answer (2) at all once history is overwritten -- reconstructing history from a mutable
table means either bolting on a separate audit log after the fact (usually as a lower-fidelity,
generic diff log not designed for timeline UI) or reconstructing it from external systems, both of
which are exactly the kind of rework we want to avoid designing into the schema from the start.

We also know a second, related requirement is coming: RFID reading of cartons is a planned future
capability, alongside the QR-camera scanning that ships first. Whatever ingestion path we design
for carton state changes needs to treat "how the state change was observed" (QR scan today, RFID
scan later, manual entry, or a system-triggered transition) as a first-class, extensible detail --
not something hardcoded to the initial QR-only implementation.

## Decision

The `Carton` table (landing in M3) holds only a **current-state projection**: status, and current
warehouse/shelf/truck. This is what fast reads (listings, current-location lookups) query against.

A separate, insert-only, immutable `CartonEvent` table records every state transition. Rows are
never updated or deleted. Each event records:

- The transition type, one of: `RECEIVED`, `PHOTOGRAPHED`, `MEASURED`, `LABELED`, `SHELVED`,
  `TRANSFERRED`, `LOADED`, `BORDER_CROSSED`, `ARRIVED`, `CUSTOMS_CLEARED`, `DELIVERED`, `DAMAGED`,
  `LOST`, `RETURNED`.
- The actor (who/what triggered it) and a timestamp.
- A `source` field, one of `QR_SCAN`, `RFID_SCAN`, `MANUAL`, `SYSTEM`.
- The device id that produced the event.
- The from/to location.

**All writes to carton state must go through a single entry point: `CartonTrackingService.appendEvent()`.**
No other module may perform a direct Prisma update to `Carton` status fields. `appendEvent()` is
responsible for both inserting the new `CartonEvent` row and updating the `Carton` projection
row's current-state fields, atomically, as the only writer.

This single-writer discipline is what makes two things fall out for free, instead of requiring a
redesign later:

- The human-readable timeline UI is a straightforward, complete read of `CartonEvent` rows for a
  given carton, ordered by timestamp -- there is no risk of a transition having been applied to
  `Carton` without a corresponding event being recorded, because there is exactly one code path
  that can do either.
- RFID-readiness: adding a physical RFID reader later is just a new producer that calls
  `appendEvent()` with `source: 'RFID_SCAN'`, hitting the exact same ingestion path as today's QR
  camera scans. It is not a redesign of the tracking model, just a new caller.

This pattern generalizes to truck-loading scan events in M4: `LoadingScanEvent` follows the same
insert-only, single-writer-entry-point shape for tracking cartons being scanned on/off trucks.

## Consequences

- Every module that needs to change a carton's state depends on `CartonTrackingService` rather
  than on the `Carton` Prisma model directly for writes -- this must be enforced by code review
  (and, once available, by Nx module boundary constraints per ADR 0001) since Prisma itself does
  not prevent other modules from importing `Carton` and updating it directly.
  `CartonEvent` is append-only, so the `CartonEvent` table will grow indefinitely; read paths
  (e.g. "current status") must always query the `Carton` projection, not aggregate `CartonEvent`
  on every read.
- Reads for "current state" stay cheap (single-row lookup on `Carton`), while history reads are a
  simple indexed query on `CartonEvent` by carton id, ordered by timestamp.
