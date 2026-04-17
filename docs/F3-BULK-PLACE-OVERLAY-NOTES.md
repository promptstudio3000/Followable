# F3 Bulk Place Overlay Notes

## What F3 adds

MAP-FOLLOW now exposes a bulk-safe place overlay export endpoint for external consumers that need to refresh many place snapshots efficiently.

New endpoint:

- `GET /api/place-overlays`

This endpoint reuses the same `PlaceOverlay` item contract as the single-place read endpoints and wraps it in a lightweight export envelope.

## Supported query params

The first version is intentionally pragmatic and additive.

Supported query params:

- `placeId`
  Repeatable or comma-separated. Filters the export to matching canonical place ids.

- `placeKey`
  Repeatable or comma-separated. Filters the export to matching canonical place keys.

- `updatedAfter`
  ISO timestamp. Returns only overlays whose computed `updatedAt` is after the supplied timestamp.

- `limit`
  Positive integer. Bounded internally to avoid unreasonably large responses.

Examples:

- `/api/place-overlays?placeId=place_abc123,place_def456`
- `/api/place-overlays?placeKey=place/czech-republic/...`
- `/api/place-overlays?updatedAfter=2026-03-01T00:00:00.000Z&limit=50`

## Response envelope

The bulk endpoint returns:

- `items`
- `count`
- `source`
- `generatedAt`

Type:

- `PlaceOverlayBulkEnvelope` in `src/lib/types.ts`

Each `items[]` entry is exactly the same `PlaceOverlay` payload used by:

- `GET /api/places/:placeId/overlay`
- `GET /api/places/by-key/overlay/:placeKey` (`placeKey` may span multiple path segments)

No second overlay DTO was introduced.

## Consistency rules

Bulk overlays are generated from the same centralized service as single-place overlays:

- `src/server/data/place-overlay.ts`

That means:

- single-place and bulk reads share the same overlay item shape
- filters operate on the same canonical `placeId` / `placeKey` seam
- demo mode and database mode use the same bootstrap path and fallback behavior

## Activity summary improvements

F3 also slightly strengthens the low-risk activity summary projection.

`recentActivityAt` now considers:

- matching locations
- matching posts
- matching collections
- matching comments
- matching reactions
- matching saved-post activity

This keeps the projection backend-focused while giving external consumers a more useful refresh signal.

## What remains for later phases

F3 does not yet implement:

- cursor-based bulk pagination
- delta tokens or checkpoint watermarks
- materialized export tables
- cross-app write sync
- direct place-follow relationships
- external moderation or entitlement rollups

Later phases can build more efficient refresh and sync patterns on top of this export seam without coupling to MAP-FOLLOW feed UI payloads.
