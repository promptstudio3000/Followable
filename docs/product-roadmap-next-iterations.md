# Followable: product roadmap for next iterations

## Purpose

This document is a working product plan for the next Followable iterations.

Scope of this plan:
- keep the current backend and demo/database testing setup usable
- focus mainly on product shape, UX, information architecture, and feature sequencing
- avoid deep backend refactors for now, but choose directions that will not block them later

This is not a deployment checklist. It is a guide for what we should build next and in what order.

## Product thesis

Followable is strongest when it helps a person do one thing very well:

- arrive in a new place
- quickly understand what is interesting nearby
- decide which places are worth visiting now
- save, organize, and share those places with other people

The current product already has a strong domain base:
- exact location as the core entity
- map-first browsing
- public vs. premium access layers
- creator-driven content
- seed/demo mode that makes iteration easy

The next product phase should make the app feel less like an MVP with multiple parallel surfaces and more like one coherent travel tool.

## Strategic goals

### Goal 1: one clear entry path

A new user should immediately understand:
- which country they are exploring
- which region they are in
- what themes exist there
- what is new and worth opening first

### Goal 2: stronger traveler utility

A post should not only be "content". It should help a traveler answer:
- why should I go there
- when should I go there
- what kind of place is it
- is it good for vanlife, hiking, work, sunset, quiet time, family trip, or a short stop

### Goal 3: transition from solo exploration to social utility

The app should evolve from:
- discovering places from creators

to:
- organizing your own places
- sharing places in trusted groups
- paying for premium access where it makes sense

### Goal 4: preserve momentum

We should prefer iterations that:
- improve the visible product quickly
- reuse current architecture and components where possible
- keep demo and local testing fast

## Current state summary

### What already works well

- country-aware browsing and seeded data
- map + feed discovery foundations
- rich post detail with map, comments, media, and premium gating
- premium content model split into subscription and post unlock
- create-post flow with exact coordinates and media
- working database mode for bootstrap, posts, comments, and payments scaffolding

## Current delivery snapshot (April 2026)

This section reflects the current implementation direction already visible in the repo and active work across parallel threads.

### Completed or effectively shipped

- `/` already renders `Explore` as the current homepage entry surface
- country context and picker are already integrated into the main shell
- `Explore` already has a stronger country / region / feed structure than the original MVP
- manual itinerary foundation already exists:
  - dedicated `/itinerary` route
  - create trip flow
  - add a place to trip from place detail
  - day / time / note / tags on itinerary entries
  - trip preview surface already appears inside `Explore`
- canonical Place and place-overlay work is already underway and gives us a clean seam for future external layers

### In progress or partially solved

- `Discover` still exists as a separate route, so the discovery model is clearer than before but not fully consolidated
- `Explore` redesign is meaningfully advanced, but still needs final information hierarchy decisions
- `Following` now has an initial dedicated surface in progress, but still needs deeper integration and refinement
- itinerary exists as a manual planning layer, but not yet as an intelligent route builder

### What is currently fragmented

- there are two similar discovery surfaces: `Discover` and `Explore`
- the tourist journey is not yet unified into one obvious starting point
- country switching exists, but is still more "global app control" than "primary exploration flow"
- there is no clearly defined dedicated feed for posts from followed creators
- tags exist in data and filtering logic, but hashtag search is not yet a first-class user experience
- private groups do not exist yet as a real concept
- the mobile location detail is powerful but still visually dense

## Recommended product direction

## Primary navigation

Recommended shape:
- `Explore` becomes the main homepage
- current `Discover` becomes a secondary map mode, or is gradually merged into Explore
- `Following` becomes the primary returning-user social surface
- country selection becomes part of the main exploration hero, not only a header utility

Reason:
- a tourist thinks in terms of place and region first, not in terms of product surface names
- Explore already has the right mental model for country -> region -> topic -> posts
- returning users also need a fast social loop that starts from trusted creators, not only from geography

## Core product surfaces

Recommended medium-term surface model:
- `Explore`: public discovery by country, region, topic, tags
- `Following feed`: posts from followed creators with fast place-detail expansion
- `Place detail`: dense but mobile-friendly decision surface
- `Creator`: premium and public content from a person
- `Trip planner`: saved places, itinerary lists, personal organization
- `Group`: private/shared exploration space for invited members

## Iteration roadmap

Below is the recommended order of work if we want strong visible progress without backend-heavy detours.

## Iteration 1: unify discovery entry

### Goal

Make the first experience clearer for travelers and reduce overlap between `Discover` and `Explore`.

### Status

Partially completed / actively being landed.

### Main outputs

- make `Explore` the conceptual homepage
- redesign the hero so the country name is clickable and opens the country picker dialog
- make the hero selection feel primary, with region and topic context visible immediately
- clarify the role of current `Discover`

### UX direction

- hero title contains the selected country
- clicking the country opens a country chooser
- after selecting a country, user sees:
  - key regions
  - major topics
  - latest posts
  - map context

### Suggested implementation scope

- no major data model changes required
- primarily routing, layout, and content hierarchy changes

### What already appears to be done

- homepage now points to `Explore`
- country context is already elevated in the shell

### What remains

- decide whether `Discover` survives as a route or becomes a mode inside Explore
- finish the final narrative hierarchy of the main entry experience

### Priority

Must

### Effort

Medium

## Iteration 2: redesign Explore layout

### Goal

Make Explore easier to scan and more useful as the primary browsing surface.

### Status

In progress.

### Main outputs

- move stats above the map
- use the right-side column purely for latest posts
- keep region and topic chips highly visible
- improve mobile layout so the most relevant content appears first

### Recommended layout

1. hero
2. stats ribbon
3. region/topic controls
4. main content split:
   - left: map
   - right: latest posts
5. lower sections:
   - themes
   - collections
   - top creators

### What already appears to be done

- Explore already behaves like a structured country / region discovery surface
- trip preview and lower supporting sections are already being folded into the page

### What remains

- finalize the feed rail behavior and hierarchy
- decide how much recommendation logic lives directly in Explore versus in Following

### Priority

Must

### Effort

Medium

## Iteration 3: following feed and split-view social browsing

### Goal

Give returning users a strong social home for trusted discovery, without losing the map and place context that makes Followable useful.

### Status

Started.

### Product definition

This surface should answer:
- what did people I trust post recently
- which of those places are worth opening now
- how can I inspect a place without leaving the feed

### Main outputs

- create a dedicated `Following` feed surface or clearly primary tab state
- add feed tabs such as `Following`, `For you`, and `Trending`
- support desktop split-view browsing where the feed stays visible while place detail opens alongside it
- keep mobile behavior simple by opening the detail as a full page

### Recommended UX

Desktop:
- the main column shows post cards from followed creators
- selecting a card opens the place detail from the side on the same screen
- the card list shrinks to make room for the detail panel
- the selected post stays visible and the feed does not reset on open/close
- the selected state should be deep-linkable

Mobile:
- the feed remains a normal card list
- tapping a card opens the standard full place detail page
- back navigation returns the user to the same scroll position in the feed

### Recommended interaction model

This should not become a disconnected social timeline.

The open detail should still feel like a place decision surface:
- map preview stays available
- practical info stays visible
- premium state remains understandable
- related places and creator context remain one tap away

### Suggested implementation scope

- reuse existing follow relationships and feed filtering primitives
- reuse current post cards and place detail payloads
- introduce URL-driven selected post state for desktop split view
- avoid inventing a second place-detail system

### First implemented slice

- dedicated `/following` route
- feed tabs for `Following`, `For you`, and `Trending`
- desktop side panel that opens place detail without leaving the feed
- mobile open-to-page behavior for simpler navigation
- navigation entry in the main shell

### What remains

- better empty-state onboarding into following creators
- tighter continuity with trip planning and saved places
- richer `For you` ranking and possibly creator-level reasons for recommendation
- optional split-view map context if the side panel needs more geographic awareness

### Why this matters

Explore is the best surface for new-place discovery.
Following should become the best surface for retained usage and habit formation.

### Priority

Must

### Effort

Medium

## Iteration 4: hashtag and topic-first discovery

### Goal

Turn tags into a real browsing primitive, not just metadata.

### Main outputs

- allow explicit hashtag search such as `#vanlife`
- show tag suggestions in search
- allow Explore filtering by tags
- make tag states URL-driven and shareable

### UX examples

- searching `#vanlife` shows all related posts
- clicking a tag chip on a place detail opens the filtered Explore view
- the search box should understand three intents:
  - hashtag
  - place
  - free text

### Product value

This unlocks thematic travel behavior:
- vanlife
- hidden spots
- family trip
- remote work
- hikes
- sunset spots

### Priority

Must

### Effort

Small to medium

## Iteration 5: location detail redesign for mobile

### Goal

Keep all current value on the location detail, but make it much easier to consume on mobile.

### Main outputs

- compress the detail structure
- introduce tabs for major content areas
- collapse secondary or empty sections
- strengthen practical travel utility

### Recommended tab structure

- `Overview`
- `Map`
- `Media`
- `Discussion`
- `Practical info`

### Recommended expandable sections

- author context
- related places
- moderation/report
- additional media
- community notes

### Useful new detail fields

- best time to visit
- parking / van suitability
- access difficulty
- safety / etiquette
- crowd expectation
- duration of stop
- last verified by community
- nearby alternatives

### Priority

Must

### Effort

Medium to large

## Iteration 6: trip planner and personal itineraries

### Goal

Give users a way to organize discovered places into actual travel plans.

### Status

In progress with a real v0 already shipped.

### Main outputs

- saved places evolve into user-managed lists
- introduce itinerary objects
- allow tagging saved places with custom trip metadata

### Example user stories

- "Day 1: 08:00 breakfast stop"
- "Day 1: 18:30 sunset"
- "Weekend trip"
- "Portugal vanlife north route"
- "Prague with friends"

### Recommended feature set for v1

- create a trip / list
- add any place or post into the trip
- reorder items
- attach user-defined labels
- attach time markers
- attach day grouping
- attach personal notes

### Example tag model

User-facing labels can look like:
- `day 1`
- `08:00`
- `sunset`
- `backup option`
- `must visit`

Internally we should conceptually distinguish:
- structural trip fields: day index, order, planned time
- flexible personal labels: custom tags

### What is already in the product

- `/itinerary` route and itinerary page
- manual trip creation
- add-to-itinerary from place detail
- day label, time label, note, and tag fields
- itinerary preview cards inside Explore

### Next expansion: AI itinerary planning

The next itinerary step should not be a generic chatbot.
It should be a constrained planning system that turns Followable place data into an editable day-by-day draft.

### Product definition

The user should be able to create an itinerary in three ways:

1. manual, place by place
2. AI from current Explore context
3. AI from a natural-language brief

### Recommended AI entry points

- `Create AI itinerary` button inside Explore
- `Plan with AI` action inside `/itinerary`
- optional `Remix day` or `Improve route` actions inside an existing itinerary

### Explore-triggered AI flow

When the user is already browsing a region, country, topic, tag, or filtered subset, the AI planner should inherit that context automatically.

Example:
- current country or region
- current map bounds or selected region
- active hashtags
- selected topic filters
- selected source layers

Then the user adds a short prompt such as:
- "2 days by van, swim spots and one sunset stop"
- "family-friendly day around Plzen"
- "coffee, short hike, scenic lunch, overnight by water"

### Natural-language itinerary flow

The user can also describe intent more freely:

- "První den chci nakoupit v Lidlu a pak cestou na nějakou zajímavou vyhlídku a večer zastavit u vody, kde můžu přespat v karavanu. Druhý den chci hezké město poblíž na oběd a místní památky."

The planner should translate that into structured constraints such as:
- trip length
- day count
- required stop types
- ordering constraints
- travel style
- vehicle assumptions
- overnight suitability
- optional meal / city / scenic / utility requirements

### Subset-constrained AI planning

AI itinerary generation should be able to use only a subset of the available place graph.

Recommended constraints:
- only saved places
- only followed creators
- only current Explore result set
- only selected hashtags
- only selected topics
- only selected layers or POI types
- only unlocked / accessible places

This is critical because "best itinerary from everything" is often less useful than "best itinerary from this trusted slice".

### Recommended planning engine behavior

The planner should work as an orchestration flow, not a single free-form generation step:

1. collect context from Explore, saved places, and optional prompt inputs
2. retrieve candidate places and POIs within the chosen area or route envelope
3. score candidates by fit:
   - intent match
   - route efficiency
   - source trust
   - freshness / availability
   - vehicle and overnight fit
   - diversity across the day
4. build a day-by-day draft with ordered stops
5. explain why each stop was selected
6. allow the user to accept, remove, replace, or regenerate per day or per stop

### Required output shape

The AI output should never be a dead text blob.

It should produce editable itinerary objects made of linked stops:
- each stop linked to an existing Followable post or canonical Place
- day grouping
- rough time slot
- stop rationale
- practical warnings or unknowns
- optional fallback alternatives

### UI behavior recommendation

- generated itinerary opens as a draft, not as a published result
- each day should show confidence and missing-information warnings
- the user should be able to:
  - lock a stop
  - ask AI to replace one stop
  - ask AI to shorten or extend a day
  - switch the plan to "more scenic", "more practical", or "more relaxed"

### Important guardrails

- AI should only compose from places and layers we can actually point to
- every stop should be traceable to a source object
- the planner should explicitly mark assumptions such as overnight suitability or opening hours when they are uncertain
- utility and partner layers should enrich itinerary quality, but should not silently outrank trusted human place content

### Inspiration from existing products

Useful patterns already visible in the market:
- Roadtrippers Autopilot asks a few structured questions, lets users include known stops, then suggests route waypoints and can enhance an existing trip later
- Wanderlog combines AI day auto-fill with route optimization and lets users keep the final itinerary editable
- Tripadvisor Trips lets users build from saves or ask AI for custom recommendations
- Mindtrip allows prompt-first planning, importing saved collections, and remixing plans based on a user’s vibe

The best takeaway for Followable:
- start from constrained place data
- generate a draft
- keep every stop editable
- preserve map context
- treat AI as a planner assistant, not as the final authority

### Why this matters

This feature bridges discovery and utility.
It moves Followable from "interesting feed of places" to "travel planning companion".

### Priority

Must

### Effort

Medium to large

## Iteration 7: private groups v1

### Goal

Enable trusted sharing of places inside a private community.

### Product definition

A group is a private exploration space where invited members can:
- share places
- browse places on a map
- discuss them
- organize them similarly to Explore

### Main outputs

- group creation flow
- invite flow
- member roles
- group detail screen with Explore-like structure

### Recommended first version

- roles: owner, admin, member
- access types: invite-only, paid, free private
- group detail mirrors Explore
- hero title uses the group name instead of country
- shared map, latest posts, themes, members

### Important scope note

For v1, do not start with true end-to-end encryption.

Recommended v1:
- server-side private access control
- invite links or invite tokens
- auditability and clear membership rules

True encrypted groups should be treated as a future advanced iteration, not a requirement for the first version.

### Priority

Must

### Effort

Large

## Iteration 8: paid access flows

### Goal

Turn premium access from a technical capability into a usable user journey.

### Main outputs

- clear purchase flow for creator subscriptions
- clear purchase flow for premium location unlocks
- new purchase flow for paid group access
- visible post-purchase state and success feedback

### Recommended user journeys

#### Creator subscription

1. user sees value on creator or post surface
2. user sees what subscription unlocks
3. user pays
4. user lands back into unlocked content

#### Premium post unlock

1. user opens locked place
2. sees teaser, map preview, and exact unlock value
3. pays
4. sees full content in place, without losing context

#### Paid group join

1. user opens group preview
2. sees what the group contains
3. pays for access
4. becomes member and enters group detail

### Important product requirement

The purchase step should never feel like a dead-end modal.
It should feel like a continuation of discovery.

### Priority

Must

### Effort

Medium to large

## Iteration 9: collections and groups alignment

### Goal

Clarify the roles of collections, groups, and itineraries so they do not overlap confusingly.

### Recommended separation

- `Collection`: editorial or creator-curated public grouping
- `Trip`: personal planning and organization
- `Group`: shared private collaboration space

### Why this matters

Without this distinction, users will not know where to:
- save a place for later
- publish a themed set of places
- share private spots with trusted people

### Priority

Should

### Effort

Medium

## Iteration 10: quality, trust, and travel utility features

### Goal

Increase usefulness and credibility of place data.

### Candidate features

- "last confirmed" indicator
- "visited by X users"
- community verification of still-valid access
- etiquette notes
- seasonal availability
- weather-sensitive notes
- nearby alternatives
- route-aware suggestions
- "good now" or "best at sunset" recommendation logic

### Priority

Should

### Effort

Medium

## Iteration 11: project growth features

### Goal

Build features that improve retention, habit formation, and social depth.

### Candidate features

- collaborative itineraries
- shared trip planning with friends
- follow a trip or public route
- multilingual notes and translation
- offline save mode for trips
- creator reputation and trust signals
- notifications for new places in followed topics or regions
- event-based maps and temporary community layers

### Priority

Later

### Effort

Variable

## Platform extension track: place intelligence, external layers, and AI

The roadmap above brings Followable to a coherent travel product.

The next strategic layer should not be "more content surfaces".
It should be a place-intelligence expansion that makes each place detail more useful, more trustworthy, and more difficult to replace.

This should build on the current architecture direction that already exists:
- canonical `placeId` / `placeKey` linkage
- dedicated place overlay read contracts
- additive external-consumer-friendly payloads

That means external and AI expansion should attach to the canonical Place seam, not to post DTOs and not directly into the existing user-generated post model.

## Iteration 12: place intelligence layer foundation

### Goal

Create a durable internal model for third-party and system-generated place layers without polluting the current user post model.

### Product definition

Followable should treat a Place as the stable center of multiple source types:
- user posts
- creator/editorial overlays
- partner/community layers
- utility layers
- AI-generated synthesis

### Main outputs

- define a layer registry concept attached to canonical Places
- separate user-generated posts from external layer items
- store per-layer provenance and refresh metadata
- prepare detail UI blocks that can render different source types consistently

### Required metadata per layer item

- source id and source type
- attribution / provider label
- license or usage constraint
- refreshed at
- confidence / verification state
- visibility rules
- optional region / country availability

### Architecture direction

Do not treat third-party layers as tags.

Recommended model:
- posts remain first-party social content
- layer items become separate records joined by `placeId`
- external apps can read and refresh layer data through place-level contracts
- future write sync should target layer ingestion paths, not the post creation flow

### Why this matters

Without this foundation, every new integration will become a one-off exception.
With it, Followable can evolve into a stable place-intelligence platform.

### Priority

Must

### Effort

Medium

## Iteration 13: traveler utility layers v1

### Goal

Increase day-one practical value for travelers by adding a small set of highly useful POI and meta-layer overlays.

### Product thesis

These layers should help a traveler answer:
- can I stop here
- can I sleep here
- can I refill water here
- what essentials are nearby
- is this area safe and practical right now

### Recommended first utility layers

- camps / stellplatz / overnight-friendly places
- water points, toilets, showers
- parking and trailheads
- hospitals, pharmacies, emergency-relevant medical access
- fuel stations
- EV charging
- viewpoints, swimming spots, shelters, lookout towers

### UX direction

Do not dump all utility POI into the main feed.

Recommended surfaces:
- map layer toggles
- grouped "Practical nearby" modules on place detail
- contextual chips such as "Sleep", "Water", "Emergency", "Scenic"

### Data-source direction

Prefer legally safer and operationally realistic sources first:
- OSM-derived or commercialized OSM providers for broad utility data
- specialized open datasets where the license is clear
- country-specific layers only when they materially improve usefulness

### Guardrail

The first version should ship with a deliberately small set of layers.
The goal is decision utility, not visual density.

### Priority

Must

### Effort

Medium

## Iteration 14: partner and community layers

### Goal

Add one or two emotionally strong third-party layers that make Followable feel alive and differentiated.

### Recommended layer categories

- QuestLayer tasks or missions on a place
- event or seasonal activity layers
- carefully selected enthusiast/community overlays

### Geocaching-specific recommendation

Geocaching is strategically attractive, but should be treated as a partnership-track integration, not as an early default ingestion source.

Recommended path:
- explore official partner/API access
- start with nearby availability signals or deep-link-like integrations
- avoid building product assumptions that require unrestricted cache replication

### Product rule

Each partner/community layer should appear as its own module:
- "Quest here"
- "Community challenge nearby"
- "Seasonal event nearby"

It should not masquerade as native Followable user content.

### Priority

Should

### Effort

Medium to large

## Iteration 15: AI guide layer and source controls

### Goal

Use AI to synthesize helpful context without overwhelming or devaluing human contributions.

### Product principle

AI should synthesize, summarize, and contextualize.
AI should not become the default dominant source of place discovery.
Trip-planning AI should be treated as a separate orchestration capability inside the itinerary track, not as the same thing as AI-authored place content.

### Recommended AI use cases

- place quick brief
- best time to visit summary
- parking / access / etiquette summary
- "good for" synthesis such as vanlife, family stop, sunset, short hike
- gap-filling summaries where structured signals exist but human narrative is missing

### Recommended source model

Expose source controls explicitly:
- `People`
- `Partners`
- `Utility`
- `AI guide`

Recommended defaults:
- people on
- partners on
- utility on
- AI guide visible mainly on place detail, not as a dominant map/feed layer

### UI and trust rules

- every AI block must be visibly labeled as AI
- AI content must show source basis or at least source class
- AI content must be reportable
- AI pins should not visually match human-authored place posts
- ranking should prefer human and verified partner signals over synthetic content

### Priority

Should

### Effort

Medium

## Iteration 16: monetization alignment for the platform phase

### Goal

Turn the broader place-intelligence model into a revenue system that fits the product instead of fighting it.

### Recommended monetization model

- B2C premium utility features
- creator monetization
- partner placement / verified partner modules
- API or white-label place overlay access for external apps

### Promising paid features

- advanced layer filters
- offline trip and layer packs
- AI trip assistant
- premium trip planning tools
- paid creator maps, guides, or region packs

### B2B direction

The existing place overlay direction suggests a meaningful future B2B product:
- place overlay export
- place intelligence modules for partner apps
- canonical place matching for external surfaces

### Important monetization rule

Do not lead with ad-like clutter.

Monetization should feel like:
- unlocking better travel decisions
- supporting trusted curators
- paying for useful partner services

### Priority

Later

### Effort

Variable

## Suggested release order

If we want a practical order with visible product progress:

### Already materially underway

1. Explore as homepage and navigation cleanup
2. Explore layout redesign
3. itinerary foundation and trip previews

### Recommended next build sequence from the current state

4. following feed and split-view social browsing
5. hashtag and tag-first search
6. mobile-first place detail redesign
7. AI itinerary planning on top of the existing trip foundation
8. place intelligence layer foundation
9. traveler utility layers v1
10. private groups v1
11. paid access flows for groups and premium content
12. collections/groups/trips taxonomy cleanup
13. trust and travel-utility features
14. partner and community layers
15. AI guide layer and source controls
16. growth features and longer-term collaboration loops
17. monetization alignment for the broader platform phase

## Feature backlog to keep in view

These are good candidates to fold into the iterations above.

### Discovery and search

- dedicated `Following` feed with deep-linkable selected post state
- feed tabs such as `Following`, `For you`, `Trending`
- hashtag search
- tag landing pages
- trending topics in country
- nearby "good right now" mode
- discover by mood or activity

### Place detail

- best time to visit
- practical notes
- last verified
- crowd expectation
- parking / camper suitability
- nearby alternatives
- practical nearby modules
- source-aware layer sections
- quest or task module
- utility toggle memory
- AI summary panel with explicit labeling
- desktop split-view detail panel attached to a feed list
- persistent selected-post state when navigating within following feed

### Trip planning

- itinerary list
- day-by-day planning
- time labels
- private notes
- reorder and drag
- map route preview
- `Create AI itinerary` entry from Explore
- `Plan with AI` entry from the itinerary page
- prompt-first itinerary generation
- itinerary generation from current Explore filters
- itinerary generation from selected hashtags / topics / layers
- remix one day without regenerating the whole plan
- replace one stop while keeping the rest locked
- explain why each stop was chosen
- mark assumptions and uncertain constraints
- keep generated stops linked to posts or canonical places

### Social and groups

- followed-creators feed as a first-class surface
- feed ranking for trusted creators vs discovery candidates
- side-by-side desktop browsing for feed and place detail
- invite-only groups
- paid groups
- group roles
- member moderation
- shared map space
- shared itinerary for a group trip

### Monetization

- creator subscriptions
- premium location unlocks
- group access purchase
- subscription bundles
- "support this curator" lightweight payments
- offline trip packs
- advanced layer filtering
- premium AI trip assistant
- verified partner modules
- API / overlay access for external products

## Guardrails for the next phase

While building the next iterations, we should protect these product rules:

- exact location remains the central entity
- canonical Place becomes the stable join seam for external layers
- maps remain first-class, not decorative
- premium and private content must stay understandable
- new features should reduce fragmentation, not create more parallel surfaces
- personal planning and private sharing should complement public exploration
- third-party data should not be silently mixed into user-generated posts
- every external layer needs provenance, refresh timing, and attribution
- AI should remain a labeled synthesis layer, not the default voice of the product

## What we are explicitly not optimizing for right now

- deep backend refactor
- production infrastructure hardening
- full deployment readiness
- advanced encryption model for private groups

These matter later, but they should not block the next visible product steps.

## Open product questions

These are the main decisions to resolve before or during implementation:

1. Should `Discover` remain as a separate route after Explore becomes the main entry point, or should it become a mode inside Explore?
2. Should `Following` be a dedicated top-level route, or a primary tab inside the main feed shell?
3. Should `For you` and `Trending` ship together with `Following`, or should `Following` launch first as the clearest retained-usage mode?
4. Should group posts be a distinct content type, or should regular posts simply gain a visibility target that can reference a group?
5. Should itineraries be private by default with optional sharing, or should we also allow public "travel guides" built from the same model?
6. Should premium creator access and paid group access feel like the same purchase system in the UI, or remain visibly separate?
7. What should be the first trust signal on place detail: last verified, etiquette, or best-time guidance?
8. Which utility layers are important enough to become part of the default traveler experience in v1?
9. Which external sources are legally and operationally safe enough for persistent integration, and which should stay in partnership exploration only?
10. Should AI exist only on place detail first, or also as an optional discovery mode on the map?
11. What is the first B2B-facing product we believe in: overlay export, partner modules, or canonical place matching?
12. Should AI itinerary planning ship first using only Followable posts, or should it wait for utility layers so it can plan against richer POI types from day one?
13. Should the first AI planner be route-first for roadtrips, day-plan-first for nearby exploration, or support both from the start?
14. Which Explore filters are allowed to constrain AI itinerary generation in v1: topic, hashtag, saved places, followed creators, and source layers?

## Recommended next action

Before code changes, align on:

- whether Explore should fully replace the current homepage
- whether Following is a dedicated route or a top-level tab inside the same feed shell
- whether `Following` launches before `For you` / `Trending`, or together with them
- whether AI itinerary planning launches before utility layers, or together with the first utility-layer release
- whether the first AI itinerary button lives only in Explore, or also in `/itinerary` on day one
- whether the first AI itinerary scope is "current Explore subset" only, or also free-form natural language planning
- whether groups should start as private collaborative spaces only, or also support paid public discovery communities from day one
- what the first three utility layers are
- whether QuestLayer becomes the first partner/community integration target
- whether AI is introduced first as a detail-only assistant or as a broader source toggle

Once those decisions are settled, we can turn this document into a concrete implementation checklist that extends the current place-overlay architecture instead of creating parallel product seams.
