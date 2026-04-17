# F1 Place Linkage Notes

## What F1 adds

MAP-FOLLOW now carries an additive canonical Place seam on top of its existing location model.

New persistence on `locations`:

- `place_id`: nullable stored canonical Place identifier
- `place_key`: nullable stored canonical Place reference key

The current ownership model is unchanged:

- posts still belong to `locations`
- collections still aggregate posts and users exactly as before
- feed and discovery behavior still resolve through the existing location-centric model

## Runtime shaping

Canonical place shaping is centralized in `src/lib/place-linkage.ts`.

That helper is responsible for:

- deriving a stable `placeKey` from a MAP-FOLLOW location
- deriving a deterministic `placeId` from that key
- backfilling place linkage for legacy rows that still have null stored values
- exposing place-linked metadata for hydrated posts and collection reads

Derivation rules:

1. Use stored `placeKey` / `placeId` when present.
2. If `placeName` exists, derive a named canonical key from:
   `country -> region -> district -> city -> placeName`
3. Otherwise, if `address` exists, derive a named canonical key from:
   `country -> region -> district -> city -> address`
4. Otherwise, fall back to a geo anchor using:
   `country -> region -> district -> city -> geokey`
5. If `geokey` is missing, a rounded lat/lng fallback is used.

This keeps current MAP-FOLLOW location UX intact while introducing a stable shared identity seam for later QuestLayer alignment.

## Backfill and migration

Database migration:

- `drizzle/0002_place_linkage.sql`

The migration:

- adds nullable `place_id` and `place_key`
- adds indexes for both columns
- backfills existing rows safely when either field is null or blank

Backfill behavior is intentionally additive:

- existing `place_id` / `place_key` values are preserved
- missing values are filled deterministically from the current location record
- read paths still derive linkage when a row temporarily remains unfilled

This means demo mode, seeded data, and partially migrated database rows remain usable during rollout.

## Demo and seed behavior

Demo/seed locations are now generated with canonical place linkage at creation time.

That means:

- `seedData.locations` already include `placeId` and `placeKey`
- local demo-created posts receive canonical linkage immediately
- database-created posts persist canonical linkage on insert
- database snapshot reads normalize older rows that still have null stored values

## Read-contract exposure

Low-risk additive exposure now exists in the main read paths:

- `HydratedPost.location.placeId`
- `HydratedPost.location.placeKey`
- `HydratedPost.place`
- `getCollectionItems(...).placeIds`
- `getCollectionItems(...).placeKeys`
- `getCollectionItems(...).places`

This keeps current clients working while making place linkage available to newer consumers.

## What remains for later Followable phases

F1 does not yet implement:

- cross-app sync with QuestLayer
- canonical Place write ownership outside MAP-FOLLOW
- post ownership moving from `location_id` to a broader followable/social object model
- canonical Place deduplication across external providers
- cross-product place subscriptions, follows, or entitlements

Later phases can build on this seam without rewriting the current feed/discovery UI or removing the existing location/post flow.
