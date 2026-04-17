# F2 Place Overlay Read Notes

## What F2 adds

MAP-FOLLOW now exposes a dedicated external place-overlay read contract that is separate from feed and post UI payloads.

New endpoints:

- `GET /api/places/:placeId/overlay`
- `GET /api/places/by-key/overlay/:placeKey` (`placeKey` may span multiple path segments)

The `by-key` route is implemented as a catch-all path and expects the canonical place key path segments after `/by-key/`.

## Payload shape

The external payload is represented by `PlaceOverlay` in `src/lib/types.ts`.

Returned fields:

- `placeId`
- `placeKey`
- `followable.enabled`
- `followable.slug`
- `followerCount`
- `recentActivityAt`
- `postCount`
- `collectionCount`
- `latestMediaPreview`
- `curatorRefs`
- `hasExternalFeed`
- `externalSurfaceHints`
- `source`
- `updatedAt`

This payload is intentionally backend-oriented. It does not reuse MAP-FOLLOW feed cards, hydrated post DTOs, or screen-specific UI contract shapes.

## How overlay fields are computed

Overlay shaping is centralized in:

- `src/server/data/place-overlay.ts`

The service uses the current snapshot data model and canonical place linkage to aggregate a place-level overlay from:

- `locations`
- `posts`
- `collections`
- `collection_posts`
- `post_media`
- `post_tags`
- `follows`
- `users`

Computation rules:

- `placeId` / `placeKey`
  Resolved from the canonical place linkage on matching locations.

- `followable.enabled`
  `true` when the place exists in MAP-FOLLOW and can produce an overlay.

- `followable.slug`
  A stable external slug derived from the place label plus the canonical `placeId`.

- `postCount`
  Count of posts whose `locationId` maps to locations sharing the requested canonical place.

- `collectionCount`
  Count of distinct collections containing at least one post from the place.

- `followerCount`
  Count of distinct followers across the curators who currently have posts attached to the place.

- `recentActivityAt`
  Latest timestamp across matched locations, matched posts, and matched collections.

- `latestMediaPreview`
  The newest available media item attached to a post from the place, or `null` when unavailable.

- `curatorRefs`
  Up to 6 creator references derived from authors with posts at the place, sorted by contribution and social reach.

- `hasExternalFeed`
  `true` when at least one post exists for the place.

- `externalSurfaceHints`
  Lightweight capability hints for external consumers, including available surfaces, topic slugs, and sample tags.

- `source`
  Mirrors the active app bootstrap source:
  `demo` or `database`

- `updatedAt`
  Currently aligned with `recentActivityAt`

## Runtime behavior

Both endpoints load their data through the existing bootstrap path:

- demo mode returns overlays from seeded/demo snapshot data
- database mode returns overlays from the database snapshot
- if database bootstrap fails, existing fallback-to-demo behavior remains intact

This keeps the external overlay seam additive and does not affect discovery/feed UI behavior.

## What remains for later phases

F2 does not yet implement:

- cross-app write sync
- canonical place ownership outside MAP-FOLLOW
- a dedicated place-follow graph
- external pagination or per-place activity feeds
- quest/gameplay runtime projections
- cross-product moderation or entitlement overlays

Later phases can consume this contract as a read-only place layer without depending on MAP-FOLLOW UI DTOs.
