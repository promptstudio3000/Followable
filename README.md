# Followable Hidden-Location Platform

Production-minded MVP of a mobile-first hidden-location platform for communities, travelers, and local experts.

## What ships in this MVP

- Next.js App Router + React + TypeScript + Tailwind CSS
- Mobile-first map/feed discovery UX
- Signed demo authentication flow with seeded creator accounts
- Exact-location posts with normalized regional metadata
- Public, subscriber-only, and special hidden place visibility models
- Creator profiles, follows, comments, reactions, collections, topics, blocked users, reports
- At least 100 seeded posts around Plzen / Pilsen plus nearby regional clusters
- Database-ready Postgres schema, SQL migration, and seed script
- Geocoding abstraction with Mapbox, Nominatim, and seeded fallback modes
- Media upload abstraction with Vercel Blob or inline demo storage fallback
- Wallet-ready unlock draft scaffolding for future onchain payment flows
- Demo mode that runs immediately without external services

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- MapLibre via `react-map-gl`
- Zod validation
- Drizzle ORM schema + Postgres migration scaffolding
- Vitest for domain tests

## Local run

### Když `npm run dev` visí na „Starting…“ / server nenaběhne

1. Zastav všechny běžící Next procesy (jiný terminál, IDE).
2. Smaž cache a znovu spusť:
   ```bash
   npm run dev:clean
   ```
   *(Smaže adresář `.next` — první kompilace pak může trvat ~1 minutu, to je normální.)*
3. Pokud běží zároveň `next build` / jiný `next dev`, Next si může blokovat soubor `.next/lock` — skript `npm run dev` před startem maže jen **lock**; úplné čištění je `npm run clean:next`.

### Bez databáze (demo režim)

Aplikace nabídne celé UI a načte demo data (120+ postů, Plzeň a okolí, témata, kolekce, tvůrci). Nepotřebuješ Postgres ani Docker.

1. Nainstaluj závislosti: `npm install`
2. Zkopíruj env: `cp .env.example .env.local`
3. Spusť v **demo režimu** (ignoruje se `DATABASE_URL`, vše běží z paměti):
   ```bash
   npm run dev:demo
   ```
   Nebo bez `dev:demo`: v `.env.local` nezadávej `DATABASE_URL` (nebo ji zakomentuj) a spusť `npm run dev`.  
   *(Na Windows můžeš místo `dev:demo` do `.env.local` přidat řádek `USE_DEMO_MODE=true` a spustit `npm run dev`.)*
4. Otevři [http://localhost:3007](http://localhost:3007) (příkaz `npm run dev` naslouchá na `0.0.0.0:3007` včetně IPv4; Turbopack je `npm run dev:turbo`).

### S databází (Docker + Postgres)

Postgres v `docker-compose.yml` poslouchá na hostu **portu 5433** (ne 5432), aby nekolidoval s případným lokálním Postgresem na `127.0.0.1:5432`.

1. Nainstaluj závislosti: `npm install`
2. Zkopíruj env: `cp .env.example .env.local` (už obsahuje správný `DATABASE_URL` pro Docker z bodu 4)
3. Ujisti se, že běží Docker Desktop (nebo jiný Docker daemon).
4. Jedním příkazem: kontejner, čekání na DB, SQL migrace z `drizzle/*.sql`, seed:
   ```bash
   npm run docker:setup
   ```
   *(První seed může trvat několik minut kvůli velkému souboru administračních členění.)*
5. Spusť aplikaci: `npm run dev`
6. Otevři [http://localhost:3007](http://localhost:3007)

**Čistý reset databáze** (smaže Docker volume s daty a znovu provede migrace + seed):

```bash
npm run docker:setup:fresh
```

**Alternativa:** synchronizovat schéma přes Drizzle místo SQL souborů: `npm run db:push` (nepotvrzuje prompty díky `--force`), pak `npm run db:seed`.

Pokud je `DATABASE_URL` nastavená, ale Postgres neběží, aplikace po krátkém timeoutu přepne do demo režimu (bez bílé obrazovky).

### Demo auth

Use any seeded username from `/sign-in` with password:

```txt
followable123
```

## Demo mode vs database mode

### Demo mode

The app runs immediately using deterministic seeded data and browser-local interactive state.

This is intentional for MVP evaluation:
- no external database required to inspect the product
- all major discovery surfaces work out of the box
- follows, saves, mock subscriptions, unlocks, comments, and created posts persist locally per browser session/user
- **Explore → kolekce:** demo hodnocení; **zdarma / skrytých** = veřejné vs. neveřejné příspěvky v kolekci (`subscriber_only`, `special_hidden_place` + budoucí NFT / heslo apod.).
- **Výběr země (hlavička):** ukládá se do `localStorage`; mimo **Česko** ukazuje Discover/Explore na mapě **demo POI** v dané zemi a na About uvítání podle země (prototyp).

### Database-ready mode

The repo also includes a production-ready Postgres schema and seed script:
- Drizzle schema: `src/server/db/schema.ts`
- SQL migration: `drizzle/0000_followable_init.sql`
- Seed script: `scripts/seed-db.ts`

When `DATABASE_URL` is present, the app now boots from Postgres automatically.

Current staged persistence split:
- database-backed snapshot bootstrap
- database-backed post creation
- database-backed comment creation
- demo/local overlay fallback for follows, saves, blocks, reports, subscriptions, and unlock toggles

This keeps the app runnable in demo mode while letting us move critical write paths onto the server in safe slices.

## Database setup

**Lokálně s Dockerem:** viz sekce „S databází“ — doporučeno `npm run docker:setup` (spustí kontejner, počká na Postgres, aplikuje `drizzle/*.sql`, seed).

**Cloud (Neon, Supabase, atd.):** nastav `DATABASE_URL` a spusť:

```bash
npm run db:migrate:sql
npm run db:seed
```

Nebo `npm run db:push` (Drizzle, `--force`) a `npm run db:seed`. V adresáři `drizzle/` jsou SQL migrace používané skriptem `db:migrate:sql`.

## Testing

Run domain tests:

```bash
npm run test:run
```

Run lint:

```bash
npm run lint
```

## Deploy to Vercel

1. Create a Vercel project from this repo.
2. Set environment variables:
   - `SESSION_SECRET`
   - `DATABASE_URL` if you are wiring production persistence
   - `NEXT_PUBLIC_APP_URL`
3. Deploy.

The current MVP works on Vercel in demo mode immediately. For production persistence, connect Postgres and replace demo-state mutations with server/database mutations.

## Geocoding and uploads

### Geocoding

The create flow and discovery search now use `/api/geocode`.

Priority order:
- Mapbox when `MAPBOX_ACCESS_TOKEN` is set
- Nominatim when `NOMINATIM_BASE_URL` is set or in local development
- seeded place fallback otherwise

### Uploads

The create flow now uploads media through `/api/uploads`.

Storage modes:
- `BLOB_READ_WRITE_TOKEN` set: uploads go to Vercel Blob
- no blob token: small files are stored inline as demo-safe data URLs

Demo inline storage is intentionally capped for safety; use Blob for realistic media handling.

## Wallet-ready unlock direction

Live payments are still intentionally deferred.

What exists now:
- injected wallet connection scaffolding for MetaMask / Rabby
- unlock draft generation for hidden places
- env-based recipient and amount configuration for future wallet requests

Optional envs:
- `NEXT_PUBLIC_UNLOCK_RECEIVER`
- `NEXT_PUBLIC_UNLOCK_CHAIN_ID`
- `NEXT_PUBLIC_UNLOCK_WEI_PER_CZK`

This is a preparation layer only. It does not yet verify transactions or grant entitlements from onchain receipts.

## Product model

### Exact-location post model

Every post requires precise coordinates:
- `latitude`
- `longitude`
- optional place and address metadata
- normalized `city`, `district`, `region`, `country`
- `geokey` for lightweight spatial indexing / lookup support

### Visibility modes

- `public`: available to everyone
- `subscriber_only`: unlocked through creator subscription entitlement
- `special_hidden_place`: unlocked through one-off post entitlement

### Discovery model

The MVP supports:
- map pins with clustering
- nearby discovery
- popular/newest sorting
- region-first browse
- search across places, creators, posts, topics, collections, tags
- creator profiles and topic/collection routes

## Seed data

Seed data includes:
- 120 posts total
- 100+ posts around Plzen / Pilsen area
- multiple creators
- vanlife, crypto-friendly, hidden spot, local-guide, viewpoint, river, overnight, and remote-work content
- comments and replies
- premium/subscriber/special post mix
- collections and regional browse targets

## Project structure

- `src/app`: routes and pages
- `src/components`: UX surfaces and interactive views
- `src/lib/demo-data.ts`: deterministic demo dataset
- `src/lib/discovery.ts`: feed, entitlement, region, and search logic
- `src/lib/validation.ts`: zod validation for structured create-post input
- `src/server/db/schema.ts`: Postgres schema
- `scripts/seed-db.ts`: Postgres seed script
- `docs/architecture.md`: architecture notes and extension guidance

## Important current tradeoff

This repo optimizes for a serious MVP foundation and instant evaluability.

That means:
- the UI and domain logic are fully implemented now
- payment flows are mocked but entitlement logic is real
- persistence is immediate in demo mode and Postgres-ready for the next wiring step

## Next implementation step after this MVP

1. Move demo mutations to server actions + Postgres
2. Persist follows, saves, blocks, and reports server-side
3. Plug in real auth provider or credentials-backed DB auth
4. Add quote + receipt verification to wallet-based hidden-place unlocks
5. Support Blob/S3 image transforms and moderation scanning
