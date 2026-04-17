# Seed Data Collection Brief

## Purpose
This document is a technical assignment for another AI that will prepare seed content for the app in a way that is easy to import into the existing `SeedData` model.

It covers:
- task structure for collecting and generating data
- authoritative schema references in this repo
- technical content constraints
- import-ready output format
- one large copy-paste prompt for the next AI

## Authoritative Sources In This Repo
- `/Users/lubos.kral/Desktop/_VIBECODE/MAP-FOLLOW/src/lib/types.ts`
- `/Users/lubos.kral/Desktop/_VIBECODE/MAP-FOLLOW/src/server/db/schema.ts`
- `/Users/lubos.kral/Desktop/_VIBECODE/MAP-FOLLOW/src/lib/demo-data.ts`
- `/Users/lubos.kral/Desktop/_VIBECODE/MAP-FOLLOW/scripts/seed-db.ts`
- `/Users/lubos.kral/Desktop/_VIBECODE/MAP-FOLLOW/src/lib/validation.ts`
- `/Users/lubos.kral/Desktop/_VIBECODE/MAP-FOLLOW/src/lib/countries.ts`
- `/Users/lubos.kral/Desktop/_VIBECODE/MAP-FOLLOW/src/lib/demo-pois-by-country.ts`

## Canonical Import Target
The final import target is `SeedData`:

```ts
type SeedData = {
  users: User[];
  follows: Follow[];
  subscriptions: ProfileSubscription[];
  topics: Topic[];
  collections: Collection[];
  collectionPosts: CollectionPost[];
  collectionUsers: CollectionUser[];
  locations: Location[];
  posts: Post[];
  postTags: PostTag[];
  postMedia: PostMedia[];
  reactions: Reaction[];
  comments: Comment[];
  savedPosts: SavedPost[];
  blockedUsers: BlockedUser[];
  reports: Report[];
  entitlements: Entitlement[];
  payments: PaymentRecord[];
  searchPlaces: SearchPlace[];
};
```

## Task Structure For The Data AI

### 1. Lock the data contract
The AI must first fix canonical conventions before generating any content.

Rules:
- Use a single country representation throughout the dataset.
- Recommended: `country` in `Location` and `SearchPlace` should use a single stable format per dataset. Prefer ISO-2 only if used everywhere.
- Use stable deterministic IDs and slugs.
- Use ISO timestamps.
- Do not mix placeholder content with production-style seed content.

### 2. Build the place backbone
For each selected country, the AI must prepare:
- 1 country-level `SearchPlace`
- 3-12 region-level `SearchPlace` items
- optional city-level and POI-level `SearchPlace` items
- representative coordinates per region
- realistic `Location` records used by posts

Required location fields:
- `id`
- `latitude`
- `longitude`
- `placeName`
- `city`
- `region`
- `country`
- `geokey`
- `createdAt`
- `updatedAt`

Preferred location fields:
- `address`
- `district`

### 3. Build topic and tag taxonomy
The AI must define:
- 4-12 core topics per country cluster or language group
- reusable tags grouped into:
  - discovery/use-case
  - terrain/nature
  - seasonality/access
  - mood/experience
  - logistics/safety

Each post should ideally have:
- 1 topic
- 2-5 tags

Hard constraints:
- tags must be strings, length 1-40
- 1-8 tags per post

### 4. Build creator profiles
Each creator must include:
- `id`
- `username`
- `displayName`
- `bio`
- `avatarUrl`
- `homeRegion`
- `focusTopicSlugs`
- optional `subscriptionPriceCzk`
- optional `walletAddress`
- `createdAt`
- `updatedAt`

Profile quality rules:
- `homeRegion` must match most of the creator's posts
- `focusTopicSlugs` must match actual content
- bios must describe a real style of exploration/content creation

### 5. Build posts
Each post must include:
- `title`
- `body`
- `teaser`
- `visibilityType`
- `topicId`
- `locationId`
- `authorId`
- `visibilityStart`
- `visibilityEnd`
- optional `specialPrice`
- optional `currency`
- `createdAt`
- `updatedAt`

Validation constraints from app logic:
- `title`: 3-120 chars
- `body`: 20-5000 chars
- `teaser`: max 220 chars
- `visibilityType`: `public | subscriber_only | special_hidden_place`
- `special_hidden_place` requires `specialPrice`
- if both `visibilityStart` and `visibilityEnd` exist, end must be after start

Coverage rules:
- include all 3 visibility types
- include active, scheduled, and archived posts
- include:
  - text-only posts
  - single-image posts
  - multi-image posts
  - optional video posts

### 6. Build media payloads
Each `PostMedia` item must include:
- `id`
- `postId`
- `type`: `image | video`
- `url`
- `alt`
- `order`
- optional `blurDataUrl`

Media rules:
- max 6 media per post
- first media must be the best cover candidate
- all media must have meaningful `alt`
- avoid generic stock-photo mismatch with post text

### 7. Build collections
Each collection must include:
- `id`
- `ownerId`
- `title`
- `slug`
- `description`
- `coverImageUrl`
- optional `topicId`
- `visibility`
- `createdAt`
- `updatedAt`

Each collection must also have:
- `collectionPosts[]` with `order`
- `collectionUsers[]` with `order`

Collection rules:
- not random buckets
- must have a curation logic
- cover image must represent the whole collection

### 8. Build engagement and access states
Prepare:
- follows
- subscriptions
- entitlements
- reactions
- comments
- saved posts
- optional reports
- optional payments

Minimum quality:
- some posts with 0 comments
- some with 1-3 comments
- some with reply trees
- some monetized creators
- some unlocked content

### 9. Build search metadata
Prepare `SearchPlace[]` so it supports:
- country selection
- regional browsing
- city selection
- map-centric discovery

Search labels must be:
- consistent in language
- concise
- human-readable
- non-duplicated within a country scope

### 10. Export for easy import
The preferred output from the data AI should be a single JSON-compatible object shaped exactly like `SeedData`.

Recommended deliverables:
- `seedData.json`
- `media_briefs.json`
- `qa_report.json`
- optional `README.md`

## Recommended Output Package

```text
seed-package/
  seedData.json
  media_briefs.json
  qa_report.json
  provenance.json
  README.md
```

### `seedData.json`
Must match the `SeedData` shape exactly.

### `media_briefs.json`
One entry per media asset or per post media plan:
- `postId`
- `mediaId`
- `type`
- `brief`
- `sourcePreference`
- `licensingNotes`

### `qa_report.json`
Must contain:
- counts by entity
- counts by country
- counts by region
- counts by visibility
- counts by topic
- counts by post media type
- counts by text-only/image/gallery/video
- duplicate warnings
- invalid relation warnings
- missing field warnings
- normalization warnings

### `provenance.json`
Optional but recommended:
- input sources used
- generation date
- language per country
- normalization policy
- geodata method
- media source policy

## Data Source Guidance For The Next AI

### Best data sources to use
- official geographic datasets for country/region/city names
- OpenStreetMap-derived POI or public geodata references
- Wikidata / Wikimedia / official tourism portals for place naming
- public or licensed image sources for references only
- controlled internal writing guidelines for generated copy

### What to collect
- country names, region names, city names
- representative places and POIs
- coordinates
- place categories and characteristics
- seasonal/access notes
- creator archetypes per region
- topic vocabulary
- tag vocabulary
- visual briefs for photos and collection covers

### What not to do
- do not use placeholder text like "sample point" or "demo location"
- do not mix ISO country codes with full country names in the same target field
- do not generate generic repeated bios/captions
- do not generate random coordinates without geographic plausibility
- do not create collections without a real curation theme

## Import Mapping Notes
The app's DB seed path is:
- read `seedData`
- write entities in dependency order
- convert `specialPrice` to string for DB numeric storage

Import order:
1. `users`
2. `follows`
3. `topics`
4. `collections`
5. `locations`
6. `posts`
7. `collectionUsers`
8. `collectionPosts`
9. `subscriptions`
10. `entitlements`
11. `payments`
12. `postTags`
13. `postMedia`
14. `reactions`
15. `comments`
16. `savedPosts`
17. `blockedUsers`
18. `reports`

## Acceptance Criteria
The result is acceptable only if:
- all entities resolve correctly by ID
- no invalid references exist
- every post has a valid author and location
- all `special_hidden_place` posts have price and currency
- tags and topics are non-empty and meaningful
- country/region naming is normalized
- media plan matches post content
- collections are coherent
- the result can be transformed into `seedData` with minimal glue code

## Large Prompt For The Next AI

Copy-paste this entire prompt into the next AI:

```text
You are preparing a high-quality content seed package for an application with a map-first discovery experience, creator profiles, post collections, tags, comments, media galleries, gated content, and search places.

Your job is NOT to write app code first. Your primary job is to produce a technically consistent, import-ready data package that another engineer or AI can convert into the app's `SeedData` object with minimal transformation.

You must follow this specification exactly.

CONTEXT
- The target app uses these core entities: User, Topic, Collection, CollectionPost, CollectionUser, Location, Post, PostTag, PostMedia, Comment, Follow, ProfileSubscription, Entitlement, Reaction, SavedPost, BlockedUser, Report, PaymentRecord, SearchPlace.
- The final target shape is a single `SeedData` object with arrays for all of those entity groups.
- Seed data must support homepage feed, map pins, viewport topic filtering, creator pages, collection pages, topic pages, post detail pages, comments, search, and monetization UI.

AUTHORITATIVE MODEL
Use this data contract:

VisibilityType = public | subscriber_only | special_hidden_place
SearchPlaceKind = poi | city | district | region | country
PostMedia.type = image | video

User:
- id
- username
- displayName
- bio
- avatarUrl
- homeRegion
- focusTopicSlugs[]
- subscriptionPriceCzk?
- walletAddress?
- createdAt
- updatedAt

Topic:
- id
- slug
- name
- description
- createdAt
- updatedAt

Collection:
- id
- ownerId
- title
- slug
- description
- coverImageUrl?
- topicId?
- visibility
- createdAt
- updatedAt

CollectionPost:
- id
- collectionId
- postId
- order

CollectionUser:
- id
- collectionId
- userId
- order

Location:
- id
- latitude
- longitude
- address?
- placeName?
- city?
- district?
- region?
- country?
- geokey?
- createdAt
- updatedAt

Post:
- id
- authorId
- locationId
- title
- body
- visibilityType
- teaser?
- topicId?
- visibilityStart?
- visibilityEnd?
- specialPrice?
- currency?
- createdAt
- updatedAt

PostTag:
- id
- postId
- tag

PostMedia:
- id
- postId
- type
- url
- alt?
- order
- blurDataUrl?

Comment:
- id
- postId
- authorId
- parentCommentId?
- body
- createdAt
- updatedAt

SearchPlace:
- id
- kind
- label
- latitude
- longitude
- city?
- district?
- region?
- country?
- radiusKm?

MANDATORY CONTENT RULES
1. Use one normalized representation for country names in target fields. Do not mix ISO codes and full names in the same field semantics.
2. All IDs and slugs must be deterministic and stable.
3. No placeholder copy such as "demo point", "sample location", or equivalent.
4. `special_hidden_place` posts must always include `specialPrice` and `currency`.
5. If a post has both `visibilityStart` and `visibilityEnd`, end must be after start.
6. Most posts should have a topic.
7. Every collection must have a clear curation theme and ordered post membership.
8. Text-only posts, single-image posts, multi-image posts, and optionally video posts must all exist in the package.
9. Search places must support actual browsing, not just satisfy schema.

VALIDATION LIMITS
- title: 3-120 chars
- body: 20-5000 chars
- teaser: max 220 chars
- tags per post: 1-8
- tag length: 1-40 chars
- media per post: max 6

TASKS

TASK 1: DEFINE DATA NORMALIZATION POLICY
Before generating any content, explicitly define:
- canonical country format
- canonical region naming format
- language policy per country
- geokey generation rule
- ID generation rule
- slug generation rule

TASK 2: SELECT COUNTRIES
Work only with countries that should have actual map-ready content.
For each selected country, create:
- 1 country-level search place
- 3-12 region-level search places
- optional city and POI search places

TASK 3: BUILD TOPIC TAXONOMY
Produce a controlled vocabulary of topics.
Each topic must include:
- id
- slug
- name
- description

Topics must be reused across multiple authors and posts.

TASK 4: BUILD TAG TAXONOMY
Create a controlled vocabulary of reusable tags, grouped into:
- discovery/use-case
- terrain/nature
- access/logistics
- seasonality/timing
- mood/experience

TASK 5: BUILD CREATOR PERSONAS
For each country or region cluster, define creators with:
- realistic display name
- username
- short but specific bio
- home region
- focus topics
- optional monetization status

Each creator must have at least 3 posts.

TASK 6: BUILD MAP-READY LOCATIONS
For each post location:
- choose a realistic placeName
- assign valid latitude/longitude
- assign city/region/country consistently
- keep spatial distribution believable
- avoid duplicated coordinates unless justified

TASK 7: AUTHOR POSTS
For each post create:
- title
- teaser
- body
- visibilityType
- topic
- visibility schedule
- optional price/currency

You must cover:
- public posts
- subscriber-only posts
- special hidden place posts
- active posts
- scheduled posts
- archived posts

TASK 8: DESIGN MEDIA PLAN
For each post, create a media plan:
- text-only
- 1 image
- 2-3 image gallery
- optional video

For each media item provide:
- stable media ID
- type
- URL placeholder or source field
- alt text
- order
- optional blurDataUrl placeholder

Additionally create `media_briefs.json` describing:
- subject
- framing/composition
- time of day
- season/weather
- realism constraints
- source preference

TASK 9: BUILD COLLECTIONS
Each collection must include:
- title
- slug
- description
- owner
- topic
- cover image reference
- 3-12 ordered posts
- 1-4 related users

Collections must reflect a strong curation logic.

TASK 10: BUILD ENGAGEMENT
Create realistic:
- follows
- subscriptions
- entitlements
- reactions
- comments
- replies
- saves
- optional reports
- optional payment records

Distribution must include low, medium, and high engagement content.

TASK 11: BUILD SEARCH METADATA
Create `SearchPlace[]` that supports:
- country browsing
- region browsing
- city lookup
- POI lookup

Labels must be concise, human-readable, and localized consistently.

TASK 12: EXPORT PACKAGE
Return these files:

1. `seedData.json`
- exact final import object matching the target entity arrays

2. `media_briefs.json`
- one record per media item or post media plan

3. `qa_report.json`
- counts by entity
- counts by country
- counts by region
- counts by topic
- counts by visibility type
- counts by post media type
- warnings
- invalid relation report
- normalization report

4. `README.md`
- explain assumptions
- explain country/language scope
- explain normalization policy
- explain any placeholders still intentionally present

QUALITY BAR
- content must feel publishable, not synthetic filler
- place names must be believable
- teaser text must not reveal full gated content
- collection descriptions must explain why posts belong together
- tags must be useful for search and browse
- comments must relate to place/topic context
- no mixed country representation in equivalent fields

OUTPUT FORMAT
Return your answer in 4 sections:

SECTION A - Normalization policy
SECTION B - Seed package design summary
SECTION C - Proposed file tree
SECTION D - Full JSON-ready content package or a chunked package plan if too large

If the package is too large to emit in one response, emit:
- first the normalization policy
- then the file tree
- then chunked JSON sections in this order:
  1. users + follows + subscriptions
  2. topics + collections + collection relations
  3. locations + searchPlaces
  4. posts + tags + media
  5. reactions + comments + saves + access states + payments
  6. qa_report + README

Do not write application code. Focus on data package quality, consistency, and import-readiness.
```

