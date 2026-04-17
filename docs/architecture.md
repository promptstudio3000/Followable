# Architecture Notes

## Product shape

Followable is intentionally built around one core rule: every post is tied to a precise real-world point.

The app therefore keeps these concerns close together:
- structured location metadata
- entitlement-aware visibility
- map-first and feed-first discovery surfaces
- creator follows and community collections

## Why the MVP uses demo mode first

The repository is designed to be testable immediately.

Instead of blocking the whole product on external services, the app currently uses:
- deterministic seed data from `src/lib/demo-data.ts`
- signed session cookies for demo auth
- browser-local per-user interactive state for follows, mock subscriptions, unlocks, comments, saves, and created posts

This keeps the experience coherent while the database and payment scaffolding stay clean and realistic.

## Domain logic locations

### `src/lib/demo-data.ts`
Single source for seeded users, topics, collections, posts, locations, comments, reactions, follows, subscriptions, and entitlements.

### `src/lib/discovery.ts`
Contains the core product rules:
- active visibility windows
- subscription and unlock entitlement checks
- blocked-user hiding
- hydrated post construction
- regional filtering
- popularity sorting
- free-text search across discovery entities

### `src/lib/validation.ts`
Defines structured create-post validation so the exact-location rule stays enforced in one place.

## Persistence plan

### Today
- Demo mode powers the UI directly.
- Local interactive state is merged over deterministic seeded base data.
- When `DATABASE_URL` exists, the server boots from Postgres instead of seeded arrays.
- Posts and comments already have server/database write paths.
- This lets the product feel alive without a required backend while still moving persistence over in slices.

### Next step
Replace local store mutations with server/database writes while preserving the selectors from `src/lib/discovery.ts`.

Recommended path:
1. Add server-side repository functions for posts, follows, comments, subscriptions, entitlements, blocks, and reports.
2. Keep the existing hydrated selectors and use database result sets instead of demo arrays.
3. Move creation and social actions to server actions.
4. Keep client components thin and state-light.

## Mobile UX direction

The refreshed UI follows a few practical mobile-first rules:
- large touch targets for primary controls
- sticky actions only when they do not conflict with navigation
- search and map context kept close together
- safe-area-aware bottom spacing
- fewer stacked modals and fewer hidden secondary actions

That is why the create flow now owns the mobile bottom action rail and hides the global mobile nav while publishing.

## Payment architecture

The MVP already separates:
- creator-level subscription entitlement
- post-level special unlock entitlement

That separation is important because it allows:
- Stripe subscriptions
- one-off checkout sessions
- future crypto rails
- platform fee accounting
without mixing discovery logic with payment-provider specifics.

## Map and search

Map rendering currently uses MapLibre with GeoJSON clustering.

Regional search is normalized through seeded `searchPlaces`, while geocoding is abstracted behind `/api/geocode`.

That currently supports:
- Mapbox forward/reverse geocoding
- Nominatim forward/reverse geocoding
- seeded fallback for fully offline/demo usage

This proves the UX and the query model for:
- city browse
- district browse
- region browse
- country browse
- point-of-interest jump

The next production step is caching and normalizing provider responses into the first-party location model.

## Media storage

The create flow uploads through `/api/uploads`.

Storage abstraction:
- Vercel Blob when configured
- inline demo data URLs otherwise

This makes Vercel deployment straightforward without breaking instant local evaluation.

## Wallet-ready unlocks

We are not wiring live payments yet, but the MVP now includes:
- injected wallet connection state
- unlock transaction draft generation
- env-configurable recipient / chain / amount derivation

The missing production piece is receipt verification that converts a successful wallet payment into a durable entitlement row.

## Moderation baseline

The MVP includes:
- report records
- blocked users
- hidden blocked-author content in feed construction

This is intentionally small but realistic enough that the social product does not ignore safety from the start.
