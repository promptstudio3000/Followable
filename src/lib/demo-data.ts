import { coordsToGeokey, slugify } from "@/lib/utils";
import { withCanonicalPlaceLinkage } from "@/lib/place-linkage";
import { getAdminSearchPlaces, getDemoWholeCountryPlace } from "@/lib/admin-regions-by-country";
import { getCountryBounds } from "@/lib/country-bounds";
import { getCountryNameCs, isCountryDemoEnabled } from "@/lib/countries";
import { CZ_KRAJ_PLACE_SETS } from "@/lib/cz-kraj-places";
import type {
  BlockedUser,
  Collection,
  CollectionPost,
  CollectionUser,
  Comment,
  Entitlement,
  Follow,
  Location,
  Post,
  PostMedia,
  PostTag,
  ProfileSubscription,
  Reaction,
  Report,
  SavedPost,
  SearchPlace,
  SeedData,
  Topic,
  User,
  VisibilityType,
} from "@/lib/types";

const NOW = new Date("2026-03-14T10:00:00.000Z");
const COUNTRY = "CZ";
const REGION = "Plzensky kraj";
const DEMO_FEE_NOTE = "Followable MVP demo mode";

function isoFromNow(dayOffset: number, hourOffset = 0) {
  return new Date(
    NOW.getTime() + dayOffset * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000,
  ).toISOString();
}

function mediaUrl(seed: string, width = 1200, height = 900) {
  const s = encodeURIComponent(seed);
  return `https://picsum.photos/seed/${s}/${width}/${height}`;
}

function avatarUrl(seed: string) {
  const s = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/avataaars-neutral/png?seed=${s}&size=128`;
}

function id(prefix: string, index: number) {
  return `${prefix}_${String(index).padStart(3, "0")}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

const topicDefinitions = [
  {
    slug: "hidden-spots",
    name: "Hidden spots",
    description:
      "Quiet places with a strong point of view, usually shared by locals who know how timing changes the experience.",
    tags: ["quiet-corner", "hidden-gem", "sunset", "slow-travel"],
  },
  {
    slug: "vanlife",
    name: "Vanlife",
    description:
      "Practical overnighters, scenic pauses, water refills, and community-tested caravan tips.",
    tags: ["vanlife", "overnight", "water", "caravan"],
  },
  {
    slug: "crypto-friendly",
    name: "Crypto friendly",
    description:
      "Places where community builders, freelancers, and crypto-curious travelers can comfortably spend time.",
    tags: ["crypto", "cowork", "wifi", "community"],
  },
  {
    slug: "local-guides",
    name: "Local guides",
    description:
      "Insider notes from people who understand a region deeply and can help others skip tourist autopilot.",
    tags: ["local-expert", "field-note", "insider", "guide"],
  },
  {
    slug: "viewpoints",
    name: "Viewpoints",
    description:
      "Urban lookouts, river edges, towers, and ridgelines that are worth timing well.",
    tags: ["viewpoint", "photo-stop", "city-view", "golden-hour"],
  },
  {
    slug: "rivers",
    name: "Rivers",
    description:
      "Banks, inlets, and riverside access points that feel meaningful rather than crowded.",
    tags: ["river", "swim", "dock", "shade"],
  },
  {
    slug: "overnight-spots",
    name: "Overnight spots",
    description:
      "Discrete, practical, and community-reviewed sleep spots for mobile living.",
    tags: ["overnight", "late-arrival", "quiet-road", "sunrise"],
  },
  {
    slug: "remote-work",
    name: "Remote work",
    description:
      "Calm, creator-friendly places that support focused work and light community meetups.",
    tags: ["remote-work", "wifi", "calm", "coffee"],
  },
] as const;

const EUROPE_COUNTRY_CODES = [
  "AL",
  "AD",
  "AT",
  "AZ",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GE",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "SE",
  "SI",
  "SK",
  "SM",
  "TR",
  "UA",
  "VA",
] as const;

type EuropeCountryCode = (typeof EUROPE_COUNTRY_CODES)[number];

function hashToUint32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand01(seed: string, index = 0): number {
  // Mulberry32-ish PRNG, deterministic per (seed, index)
  let t = (hashToUint32(`${seed}:${index}`) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick<T>(values: readonly T[], seed: string, index = 0): T {
  const u = rand01(seed, index);
  return values[Math.floor(u * values.length)]!;
}

const NAME_POOLS = {
  slavicWest: {
    first: ["Marek", "Tereza", "Adam", "Lenka", "Pavel", "Klara", "Ondrej", "Jana", "Roman", "Sabina"],
    last: ["Novak", "Svoboda", "Dvorak", "Cerny", "Prochazka", "Kral", "Bartos", "Marek", "Simek", "Kucera"],
  },
  polish: {
    first: ["Jakub", "Zofia", "Mateusz", "Julia", "Kacper", "Maja", "Piotr", "Alicja", "Michal", "Natalia"],
    last: ["Nowak", "Kowalski", "Wisniewski", "Wojcik", "Kowalczyk", "Kaminska", "Lewandowski", "Zielinski", "Szymanski", "Dabrowski"],
  },
  german: {
    first: ["Lukas", "Hannah", "Jonas", "Lea", "Finn", "Mia", "Noah", "Laura", "Paul", "Sofia"],
    last: ["Muller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Hoffmann", "Schulz"],
  },
  french: {
    first: ["Lucas", "Emma", "Hugo", "Chloe", "Louis", "Camille", "Arthur", "Lea", "Jules", "Manon"],
    last: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau"],
  },
  dutch: {
    first: ["Daan", "Sophie", "Sem", "Emma", "Milan", "Tess", "Lucas", "Julia", "Finn", "Sara"],
    last: ["de Vries", "van Dijk", "Jansen", "Bakker", "Visser", "Smit", "Meijer", "de Boer", "Mulder", "de Groot"],
  },
  italian: {
    first: ["Lorenzo", "Giulia", "Matteo", "Sofia", "Alessandro", "Martina", "Gabriele", "Chiara", "Riccardo", "Francesca"],
    last: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Gallo", "Costa", "Fontana", "Moretti"],
  },
  iberian: {
    first: ["Daniel", "Sofia", "Hugo", "Lucia", "Alejandro", "Martina", "Mateo", "Carmen", "Goncalo", "Ines"],
    last: ["Garcia", "Fernandez", "Gonzalez", "Rodriguez", "Lopez", "Martinez", "Sanchez", "Perez", "Silva", "Santos"],
  },
  nordic: {
    first: ["Noah", "Ella", "William", "Emilia", "Elias", "Sofia", "Oscar", "Aino", "Maja", "Freja"],
    last: ["Hansen", "Johansson", "Virtanen", "Andersen", "Nielsen", "Larsen", "Olsen", "Berg", "Lindberg", "Svensson"],
  },
  balkan: {
    first: ["Ivan", "Ana", "Marko", "Jelena", "Nikola", "Milica", "Petar", "Marija", "Stefan", "Teodora"],
    last: ["Popovic", "Jovanovic", "Petrovic", "Ilic", "Markovic", "Stojanovic", "Kovacevic", "Nikolov", "Dimitrov", "Ionescu"],
  },
  baltic: {
    first: ["Martins", "Elina", "Tomas", "Greta", "Kristaps", "Laura", "Pauls", "Milda", "Rihards", "Egle"],
    last: ["Ozols", "Berzins", "Kalnins", "Petrauskas", "Kazlauskas", "Jankauskas", "Tamm", "Saar", "Sepp", "Vaitkus"],
  },
  hellenic: {
    first: ["Giorgos", "Eleni", "Nikos", "Maria", "Kostas", "Sofia", "Dimitris", "Katerina", "Yannis", "Anna"],
    last: ["Papadopoulos", "Nikolaou", "Georgiou", "Ioannou", "Christou", "Pappas", "Karakas", "Dimitriou", "Andreou", "Hadjis"],
  },
  turkic: {
    first: ["Mehmet", "Elif", "Ahmet", "Zeynep", "Mustafa", "Aylin", "Emre", "Ece", "Kerem", "Asli"],
    last: ["Yilmaz", "Kaya", "Demir", "Sahin", "Celik", "Yildiz", "Aydin", "Ozdemir", "Arslan", "Dogan"],
  },
  anglo: {
    first: ["Oliver", "Amelia", "Noah", "Isla", "George", "Emily", "Harry", "Sophie", "Jack", "Grace"],
    last: ["Smith", "Johnson", "Brown", "Taylor", "Jones", "Miller", "Wilson", "Moore", "Anderson", "Thomas"],
  },
  romanian: {
    first: ["Andrei", "Maria", "Stefan", "Ioana", "Mihai", "Elena", "Alexandru", "Ana", "Vlad", "Daria"],
    last: ["Popa", "Ionescu", "Popescu", "Stan", "Dumitru", "Gheorghe", "Matei", "Radu", "Marin", "Munteanu"],
  },
  ukrainian: {
    first: ["Oleksandr", "Olena", "Dmytro", "Iryna", "Andrii", "Kateryna", "Taras", "Sofiia", "Maksym", "Natalia"],
    last: ["Shevchenko", "Kovalenko", "Bondarenko", "Tkachenko", "Kravchenko", "Melnyk", "Moroz", "Oliinyk", "Petrenko", "Kovalchuk"],
  },
} as const;

const COUNTRY_NAME_POOL: Record<EuropeCountryCode, keyof typeof NAME_POOLS> = {
  AD: "iberian",
  AL: "balkan",
  AT: "german",
  AZ: "turkic",
  BA: "balkan",
  BE: "french",
  BG: "balkan",
  BY: "ukrainian",
  CH: "german",
  CY: "hellenic",
  CZ: "slavicWest",
  DE: "german",
  DK: "nordic",
  EE: "baltic",
  ES: "iberian",
  FI: "nordic",
  FR: "french",
  GB: "anglo",
  GE: "turkic",
  GR: "hellenic",
  HR: "balkan",
  HU: "balkan",
  IE: "anglo",
  IS: "nordic",
  IT: "italian",
  LI: "german",
  LT: "baltic",
  LU: "french",
  LV: "baltic",
  MC: "french",
  MD: "romanian",
  ME: "balkan",
  MK: "balkan",
  MT: "iberian",
  NL: "dutch",
  NO: "nordic",
  PL: "polish",
  PT: "iberian",
  RO: "romanian",
  RS: "balkan",
  SE: "nordic",
  SI: "balkan",
  SK: "slavicWest",
  SM: "italian",
  TR: "turkic",
  UA: "ukrainian",
  VA: "italian",
};

function displayNameForCountry(code: EuropeCountryCode, seed: string) {
  const pool = NAME_POOLS[COUNTRY_NAME_POOL[code]];
  const first = pick(pool.first, `${seed}:first`);
  const last = pick(pool.last, `${seed}:last`);
  return `${first} ${last}`;
}

const userDefinitions = [
  {
    username: "urban.scout.plzen",
    displayName: "Marek Skala",
    bio: "Quiet-city scout mapping overlooked river edges, underused lookouts, and good timing windows around Pilsen.",
    homeRegion: REGION,
    focusTopicSlugs: ["hidden-spots", "viewpoints", "rivers"],
    subscriptionPriceCzk: 149,
  },
  {
    username: "vanwest.bohemia",
    displayName: "Tereza Vanova",
    bio: "Vanlife route planner sharing practical overnight stops, refill points, and scenic pause spots in west Bohemia.",
    homeRegion: REGION,
    focusTopicSlugs: ["vanlife", "overnight-spots", "rivers"],
    subscriptionPriceCzk: 179,
  },
  {
    username: "btc.cafe.cz",
    displayName: "Adam Kral",
    bio: "Collecting crypto-friendly cafes, laptop corners, and meetup-adjacent places that actually feel usable.",
    homeRegion: "Prague",
    focusTopicSlugs: ["crypto-friendly", "remote-work", "local-guides"],
    subscriptionPriceCzk: 199,
  },
  {
    username: "wild.bohemia",
    displayName: "Lenka Horska",
    bio: "Forest lines, river cut-throughs, and hidden edges that make western Czechia feel bigger than it looks.",
    homeRegion: REGION,
    focusTopicSlugs: ["hidden-spots", "rivers", "local-guides"],
    subscriptionPriceCzk: 159,
  },
  {
    username: "plzen.insider",
    displayName: "Pavel Reznicek",
    bio: "Insider guide to Pilsen neighborhoods, late-afternoon city loops, and spots locals still use.",
    homeRegion: REGION,
    focusTopicSlugs: ["local-guides", "viewpoints", "remote-work"],
    subscriptionPriceCzk: 149,
  },
  {
    username: "silent.camps",
    displayName: "Klara Novotna",
    bio: "Low-noise overnight recommendations for caravans and vans, with realistic notes about arrival timing and etiquette.",
    homeRegion: REGION,
    focusTopicSlugs: ["overnight-spots", "vanlife", "hidden-spots"],
    subscriptionPriceCzk: 189,
  },
  {
    username: "brew.chain.route",
    displayName: "Ondrej Binar",
    bio: "Coffee, crypto, and creator meetups. I look for the places where laptop culture and human warmth still overlap.",
    homeRegion: "Prague",
    focusTopicSlugs: ["crypto-friendly", "remote-work", "local-guides"],
    subscriptionPriceCzk: 169,
  },
  {
    username: "city.after.rain",
    displayName: "Jana Palkova",
    bio: "Urban textures, wet-street viewpoints, and slow city routes that become interesting when the crowds leave.",
    homeRegion: REGION,
    focusTopicSlugs: ["viewpoints", "hidden-spots", "local-guides"],
    subscriptionPriceCzk: 139,
  },
  {
    username: "forest.signal",
    displayName: "Roman Vlk",
    bio: "Regional scout for quiet trailheads, signal-friendly pull-ins, and edge-of-forest work stops.",
    homeRegion: REGION,
    focusTopicSlugs: ["remote-work", "overnight-spots", "vanlife"],
    subscriptionPriceCzk: 169,
  },
  {
    username: "borderless.routes",
    displayName: "Sabina Novak",
    bio: "Cross-community curator connecting travelers, digital workers, and local experts through place-based recommendations.",
    homeRegion: "Central Europe",
    focusTopicSlugs: ["local-guides", "remote-work", "crypto-friendly"],
    subscriptionPriceCzk: 219,
  },
  {
    username: "brdy.trails",
    displayName: "Milan Vorel",
    bio: "Brdy edges, ridge access points, and the kind of outdoor places you only keep if people treat them well.",
    homeRegion: "Rokycany",
    focusTopicSlugs: ["hidden-spots", "viewpoints", "overnight-spots"],
    subscriptionPriceCzk: 149,
  },
  {
    username: "tram.cryptid",
    displayName: "Veronika Kralova",
    bio: "Urban explorer mixing social discovery with local knowledge. I chase places that still feel like a story.",
    homeRegion: REGION,
    focusTopicSlugs: ["hidden-spots", "crypto-friendly", "viewpoints"],
    subscriptionPriceCzk: 179,
  },
] as const;

const anchors = [
  {
    label: "Bolevecky rybnik north bank",
    placeName: "Bolevecky rybnik",
    address: "North bank trail, Plzen",
    city: "Plzen",
    district: "Plzen-mesto",
    region: REGION,
    country: COUNTRY,
    latitude: 49.7827,
    longitude: 13.3708,
    tags: ["lake", "sunrise", "vanlife", "quiet-corner"],
    pilsenArea: true,
  },
  {
    label: "Radbuza embankment pocket",
    placeName: "Radbuza embankment",
    address: "Radbuza riverside, Plzen",
    city: "Plzen",
    district: "Plzen-mesto",
    region: REGION,
    country: COUNTRY,
    latitude: 49.7388,
    longitude: 13.3711,
    tags: ["river", "city-view", "sunset", "walkable"],
    pilsenArea: true,
  },
  {
    label: "Litice quarry overlook",
    placeName: "Litice overlook",
    address: "Cliff path above Litice, Plzen",
    city: "Plzen",
    district: "Plzen-mesto",
    region: REGION,
    country: COUNTRY,
    latitude: 49.7029,
    longitude: 13.3287,
    tags: ["viewpoint", "hidden-gem", "golden-hour", "quiet-road"],
    pilsenArea: true,
  },
  {
    label: "TechTower side courtyard",
    placeName: "TechTower",
    address: "Koterovska 152, Plzen",
    city: "Plzen",
    district: "Plzen-mesto",
    region: REGION,
    country: COUNTRY,
    latitude: 49.7369,
    longitude: 13.4012,
    tags: ["community", "wifi", "remote-work", "coffee"],
    pilsenArea: true,
  },
  {
    label: "Depo 2015 corner patio",
    placeName: "DEPO2015",
    address: "Presslova 14, Plzen",
    city: "Plzen",
    district: "Plzen-mesto",
    region: REGION,
    country: COUNTRY,
    latitude: 49.7426,
    longitude: 13.3818,
    tags: ["community", "creator", "urban", "coffee"],
    pilsenArea: true,
  },
  {
    label: "Malesice orchard edge",
    placeName: "Malesice orchard",
    address: "Field road, Malesice",
    city: "Malesice",
    district: "Plzen-sever",
    region: REGION,
    country: COUNTRY,
    latitude: 49.7972,
    longitude: 13.3014,
    tags: ["overnight", "quiet-road", "sunrise", "field-note"],
    pilsenArea: true,
  },
  {
    label: "Stary Plzenec ridge stop",
    placeName: "Stary Plzenec ridge",
    address: "Ridge lane above Stary Plzenec",
    city: "Stary Plzenec",
    district: "Plzen-mesto",
    region: REGION,
    country: COUNTRY,
    latitude: 49.6998,
    longitude: 13.4736,
    tags: ["viewpoint", "trailhead", "late-arrival", "windy"],
    pilsenArea: true,
  },
  {
    label: "Hracholusky inlet bend",
    placeName: "Hracholusky inlet",
    address: "Forest pull-in by Hracholusky",
    city: "Pnovany",
    district: "Plzen-sever",
    region: REGION,
    country: COUNTRY,
    latitude: 49.8194,
    longitude: 13.1704,
    tags: ["water", "caravan", "quiet-corner", "shade"],
    pilsenArea: true,
  },
  {
    label: "Nebilovy meadow pull-in",
    placeName: "Nebilovy meadow",
    address: "Farm lane outside Nebilovy",
    city: "Nebilovy",
    district: "Plzen-jih",
    region: REGION,
    country: COUNTRY,
    latitude: 49.6273,
    longitude: 13.4237,
    tags: ["overnight", "sunrise", "open-sky", "caravan"],
    pilsenArea: true,
  },
  {
    label: "Rokycany forest signal stop",
    placeName: "Rokycany woods",
    address: "Pull-off near Rokycany ridge",
    city: "Rokycany",
    district: "Rokycany",
    region: REGION,
    country: COUNTRY,
    latitude: 49.7439,
    longitude: 13.6033,
    tags: ["signal", "forest-edge", "remote-work", "overnight"],
    pilsenArea: true,
  },
  {
    label: "Brdy west edge viewpoint",
    placeName: "Brdy west edge",
    address: "Old forestry road, Brdy",
    city: "Dobriv",
    district: "Rokycany",
    region: REGION,
    country: COUNTRY,
    latitude: 49.6943,
    longitude: 13.6836,
    tags: ["ridge", "viewpoint", "forest", "hidden-gem"],
    pilsenArea: true,
  },
  {
    label: "Kladruby cloister lane",
    placeName: "Kladruby lane",
    address: "Quiet lane behind the monastery, Kladruby",
    city: "Kladruby",
    district: "Tachov",
    region: REGION,
    country: COUNTRY,
    latitude: 49.7156,
    longitude: 12.9796,
    tags: ["late-arrival", "quiet-road", "history", "slow-travel"],
    pilsenArea: true,
  },
  {
    label: "Susice Otava bank",
    placeName: "Otava bank",
    address: "Stone steps by Otava, Susice",
    city: "Susice",
    district: "Klatovy",
    region: REGION,
    country: COUNTRY,
    latitude: 49.2338,
    longitude: 13.5216,
    tags: ["river", "swim", "shade", "summer"],
    pilsenArea: true,
  },
  {
    label: "Marianske Lazne spring edge",
    placeName: "Forest spring edge",
    address: "Woodland lane near Marianske Lazne",
    city: "Marianske Lazne",
    district: "Cheb",
    region: "Karlovarsky kraj",
    country: COUNTRY,
    latitude: 49.9647,
    longitude: 12.7023,
    tags: ["spring", "forest", "quiet-corner", "wellness"],
    pilsenArea: false,
  },
  {
    label: "Prague Karlin courtyard",
    placeName: "Karlin courtyard",
    address: "Sokolovska side lane, Prague",
    city: "Prague",
    district: "Praha 8",
    region: "Prague",
    country: COUNTRY,
    latitude: 50.0929,
    longitude: 14.4517,
    tags: ["crypto", "coffee", "cowork", "community"],
    pilsenArea: false,
  },
  {
    label: "Domažlice old road stop",
    placeName: "Domažlice old road",
    address: "Field shoulder outside Domažlice",
    city: "Domažlice",
    district: "Domazlice",
    region: REGION,
    country: COUNTRY,
    latitude: 49.4404,
    longitude: 12.9284,
    tags: ["overnight", "roadside", "low-traffic", "sunrise"],
    pilsenArea: false,
  },
] as const;

const collectionDefinitions = [
  {
    title: "Best vanlife spots in western Czechia",
    ownerUsername: "vanwest.bohemia",
    topicSlug: "vanlife",
    description:
      "A practical sweep of overnight pull-ins, refill places, and scenic pauses from Pilsen to the border hills.",
  },
  {
    title: "Crypto-friendly cafes in Prague and Plzen",
    ownerUsername: "btc.cafe.cz",
    topicSlug: "crypto-friendly",
    description:
      "Places where paying digitally is only half the story and staying productively is the real test.",
  },
  {
    title: "Hidden river spots",
    ownerUsername: "wild.bohemia",
    topicSlug: "rivers",
    description:
      "Water edges worth protecting, with notes on timing, access, and how not to ruin them.",
  },
  {
    title: "Local experts in western Bohemia",
    ownerUsername: "borderless.routes",
    topicSlug: "local-guides",
    description:
      "A starter pack of creator channels whose notes consistently improve a west Bohemia trip.",
  },
  {
    title: "Urban viewpoints after rain",
    ownerUsername: "city.after.rain",
    topicSlug: "viewpoints",
    description:
      "Reflective city views, wet-street silhouettes, and lookout stops that come alive in bad weather.",
  },
  {
    title: "Remote work stops with signal",
    ownerUsername: "forest.signal",
    topicSlug: "remote-work",
    description:
      "Signal-tested places for a call, a sprint, or a half-day of laptop work without losing the route.",
  },
] as const;

const noteFragments = [
  "Best used early or right before blue hour.",
  "Locals still treat this as a neighborhood place rather than a tourist stop.",
  "Worth arriving with a backup plan if the weather shifts.",
  "The feeling changes completely once the main road noise drops.",
  "Good with a slow detour, weak if you rush it.",
  "A creator who knows the timing can make this place feel twice as valuable.",
];

const bodyFragments = [
  "There is a precise line between accessible and overexposed, and this place still sits on the right side of it.",
  "What matters is not only the coordinates but the approach: where to stop, how to enter, and what time window actually works.",
  "The point here is trust. It is a useful location if people arrive lightly, stay briefly, and leave it cleaner than they found it.",
  "This is the kind of post that rewards community context more than raw ratings.",
  "The surface-level version is easy to find. The better version needs local timing, a correct entry point, and a realistic expectation of privacy.",
];

const teaserFragments = [
  "Strong local timing and a precise access point make this one worth saving.",
  "Useful when you want a real place, not another generic recommendation.",
  "Good as a standalone stop or as a bridge between two bigger plans.",
  "One of those spots that converts skeptics after ten quiet minutes.",
];

const EUROPE_THEMES = [
  { label: "Viewpoint", tags: ["viewpoint", "golden-hour", "photo-stop"] },
  { label: "Hidden courtyard", tags: ["hidden-gem", "quiet-corner", "slow-travel"] },
  { label: "Riverside access", tags: ["river", "shade", "swim"] },
  { label: "Local coffee stop", tags: ["coffee", "wifi", "remote-work"] },
  { label: "Overnight pull-in", tags: ["overnight", "late-arrival", "quiet-road"] },
  { label: "Forest edge reset", tags: ["forest", "trailhead", "calm"] },
  { label: "Old-town alley", tags: ["urban", "walkable", "textures"] },
  { label: "Market bite", tags: ["food", "local", "cheap"] },
  { label: "Museum micro-spot", tags: ["culture", "history", "indoor"] },
  { label: "Lake shore", tags: ["lake", "sunrise", "quiet"] },
  { label: "Bridge line", tags: ["bridge", "river", "city-view"] },
  { label: "Ridge trail", tags: ["ridge", "hike", "windy"] },
  { label: "Co-work corner", tags: ["cowork", "wifi", "creator"] },
  { label: "Rainy-day loop", tags: ["after-rain", "city-view", "slow"] },
  { label: "Sunset bench", tags: ["sunset", "quiet-corner", "golden-hour"] },
  { label: "Train-station walk", tags: ["transit", "walkable", "timing"] },
  { label: "Harbor edge", tags: ["water", "boats", "breeze"] },
  { label: "Cliff look-out", tags: ["cliff", "viewpoint", "respect"] },
  { label: "Thermal pause", tags: ["wellness", "spring", "slow"] },
  { label: "Community square", tags: ["community", "meetup", "laptop"] },
] as const;

const commentBodies = [
  "Confirmed this still works if you arrive after 19:30 and keep it low key.",
  "Signal was stronger than expected, enough for a call and a quick upload.",
  "The teaser undersells it. The approach details matter much more than the photos.",
  "Please keep it clean if you stop here. The spot survives because people behave well.",
  "Tried it in light rain and honestly liked it more than in full sun.",
  "Good recommendation, but I would avoid weekends unless you are there very early.",
];

const reactionCycle = ["fire", "insight", "want", "thanks"] as const;

function visibilityForIndex(index: number): VisibilityType {
  if (index % 9 === 0) return "special_hidden_place";
  if (index % 4 === 0) return "subscriber_only";
  return "public";
}

function titleFor(index: number, topic: Topic, anchor: (typeof anchors)[number]) {
  const openers = {
    "hidden-spots": ["Under-the-radar", "Quiet entry to", "Low-noise pocket by"],
    vanlife: ["Van-safe lane near", "Late-arrival option by", "Quiet reset outside"],
    "crypto-friendly": ["Crypto-friendly base at", "Laptop-friendly pocket in", "Community-ready stop by"],
    "local-guides": ["Local note for", "Insider route through", "Field note around"],
    viewpoints: ["Golden-hour line above", "Wide view from", "Low-effort skyline at"],
    rivers: ["River access by", "Slow-water pocket near", "Shade and current at"],
    "overnight-spots": ["Respectful overnight by", "Discrete sleep stop near", "Low-profile camp lane at"],
    "remote-work": ["Focused work window at", "Signal-strong pull-in near", "Laptop sprint by"],
  } as const;

  const pick = openers[topic.slug as keyof typeof openers] ?? ["Spot near"];
  return `${pick[index % pick.length]} ${anchor.placeName}`;
}

function bodyFor(index: number, topic: Topic, anchor: (typeof anchors)[number], author: User) {
  return [
    `${author.displayName} notes that ${anchor.label.toLowerCase()} works best as a ${topic.name.toLowerCase()} stop when you respect the rhythm of the place.`,
    bodyFragments[index % bodyFragments.length],
    noteFragments[(index + 2) % noteFragments.length],
    `${DEMO_FEE_NOTE}: premium flows in this MVP are mocked but entitlement rules are modeled cleanly for future payment providers.`,
  ].join(" ");
}

function teaserFor(index: number, anchor: (typeof anchors)[number]) {
  return `${teaserFragments[index % teaserFragments.length]} ${anchor.city} is the easiest public reference point.`;
}

function buildUsers(): User[] {
  const base = userDefinitions.map((entry, index) => ({
    id: id("user", index + 1),
    username: entry.username,
    displayName: entry.displayName,
    bio: entry.bio,
    avatarUrl: avatarUrl(entry.displayName.replace(/\s+/g, "-")),
    homeRegion: entry.homeRegion,
    focusTopicSlugs: [...entry.focusTopicSlugs],
    subscriptionPriceCzk: entry.subscriptionPriceCzk,
    walletAddress: null,
    createdAt: isoFromNow(-(220 - index * 6)),
    updatedAt: isoFromNow(-(index % 12)),
  }));

  const topicSlugs = topicDefinitions.map((t) => t.slug);
  const extras: User[] = EUROPE_COUNTRY_CODES
    .filter((code) => code !== "CZ")
    .map((code, extraIndex) => {
      const countryCode = code as EuropeCountryCode;
      const displayName = displayNameForCountry(countryCode, `user:${countryCode}`);
      const username = `europe.${countryCode.toLowerCase()}.curator`;
      const focus = unique([
        pick(topicSlugs, `focus:${countryCode}`, 0),
        pick(topicSlugs, `focus:${countryCode}`, 1),
        pick(topicSlugs, `focus:${countryCode}`, 2),
      ]).slice(0, 3);

      return {
        id: id("user", base.length + extraIndex + 1),
        username,
        displayName,
        bio: `Local curator for ${getCountryNameCs(countryCode)}. I collect timing-sensitive viewpoints, quiet corners, and practical stops worth pinning.`,
        avatarUrl: avatarUrl(`${countryCode}:${displayName}`),
        homeRegion: getCountryNameCs(countryCode),
        focusTopicSlugs: focus.length ? focus : [topicSlugs[0]!],
        subscriptionPriceCzk: 149 + (extraIndex % 5) * 20,
        walletAddress: null,
        createdAt: isoFromNow(-(200 - (extraIndex % 30) * 3)),
        updatedAt: isoFromNow(-(extraIndex % 20)),
      };
    });

  return [...base, ...extras];
}

function buildTopics(): Topic[] {
  return topicDefinitions.map((entry, index) => ({
    id: id("topic", index + 1),
    slug: entry.slug,
    name: entry.name,
    description: entry.description,
    createdAt: isoFromNow(-(200 - index * 3)),
    updatedAt: isoFromNow(-index),
  }));
}

function buildCollections(users: User[], topics: Topic[]): Collection[] {
  return collectionDefinitions.map((entry, index) => ({
    id: id("collection", index + 1),
    ownerId: users.find((user) => user.username === entry.ownerUsername)!.id,
    title: entry.title,
    slug: slugify(entry.title),
    description: entry.description,
    coverImageUrl: mediaUrl(`collection-${index + 1}`, 1600, 900),
    topicId: topics.find((topic) => topic.slug === entry.topicSlug)?.id ?? null,
    visibility: "public",
    createdAt: isoFromNow(-(60 - index * 3)),
    updatedAt: isoFromNow(-index),
  }));
}

function createSeedData(): SeedData {
  const users = buildUsers();
  const topics = buildTopics();
  const collections = buildCollections(users, topics);

  const follows: Follow[] = [];
  const subscriptions: ProfileSubscription[] = [];
  const entitlements: Entitlement[] = [];
  const blockedUsers: BlockedUser[] = [
    {
      id: id("blocked", 1),
      blockerId: users[0].id,
      blockedUserId: users[10].id,
      createdAt: isoFromNow(-4),
    },
  ];

  const coreUsers = users.slice(0, userDefinitions.length);
  coreUsers.forEach((user, index) => {
    const firstFollow = users[(index + 2) % users.length];
    const secondFollow = users[(index + 5) % users.length];
    [firstFollow, secondFollow].forEach((target, innerIndex) => {
      if (target.id === user.id) return;
      follows.push({
        id: id("follow", follows.length + 1),
        followerId: user.id,
        followedUserId: target.id,
        createdAt: isoFromNow(-(30 - index - innerIndex)),
      });
    });

    if (index % 3 === 0) {
      const creator = users[(index + 1) % users.length];
      subscriptions.push({
        id: id("subscription", subscriptions.length + 1),
        subscriberId: user.id,
        creatorId: creator.id,
        status: "active",
        startedAt: isoFromNow(-(18 - index)),
        expiresAt: isoFromNow(12 + index),
        paymentProvider: "mock-stripe-ready",
        createdAt: isoFromNow(-(18 - index)),
        updatedAt: isoFromNow(-(2 + (index % 3))),
      });
      entitlements.push({
        id: id("entitlement", entitlements.length + 1),
        userId: user.id,
        creatorId: creator.id,
        postId: null,
        type: "subscription",
        status: "active",
        createdAt: isoFromNow(-(18 - index)),
        updatedAt: isoFromNow(-(2 + (index % 3))),
      });
    }
  });

  const posts: Post[] = [];
  const locations: Location[] = [];
  const postTags: PostTag[] = [];
  const postMedia: PostMedia[] = [];
  const comments: Comment[] = [];
  const reactions: Reaction[] = [];
  const savedPosts: SavedPost[] = [];
  const reports: Report[] = [
    {
      id: id("report", 1),
      reporterId: users[3].id,
      targetType: "post",
      targetId: "post_009",
      reason: "Unclear arrival expectations for a sensitive spot.",
      status: "reviewing",
      createdAt: isoFromNow(-8),
      updatedAt: isoFromNow(-4),
    },
    {
      id: id("report", 2),
      reporterId: users[7].id,
      targetType: "user",
      targetId: users[10].id,
      reason: "Repeatedly reposting the same trail access note with weak context.",
      status: "open",
      createdAt: isoFromNow(-3),
      updatedAt: isoFromNow(-3),
    },
  ];

  const pilsenAnchors = anchors.filter((anchor) => anchor.pilsenArea);

  for (let index = 0; index < 120; index += 1) {
    const anchor = index < 104 ? pilsenAnchors[index % pilsenAnchors.length] : anchors[index % anchors.length];
    const author = users[(index * 7 + 3) % users.length];
    const topic = topics[(index * 5 + 2) % topics.length];
    const visibilityType = visibilityForIndex(index);
    const offsetLat = ((index % 5) - 2) * 0.004 + Math.sin(index * 1.7) * 0.0012;
    const offsetLng = ((index % 6) - 2.5) * 0.0035 + Math.cos(index * 1.2) * 0.0011;
    const latitude = Number((anchor.latitude + offsetLat).toFixed(6));
    const longitude = Number((anchor.longitude + offsetLng).toFixed(6));
    const locationId = id("location", index + 1);
    const postId = id("post", index + 1);
    const createdAt = isoFromNow(-((index % 42) + 1), -((index * 3) % 12));

    const visibilityStart = index % 17 === 0 ? isoFromNow(2 + (index % 3)) : isoFromNow(-((index % 32) + 1));
    const visibilityEnd =
      index % 19 === 0
        ? isoFromNow(-1 - (index % 3))
        : index % 11 === 0
          ? isoFromNow(4 + (index % 5))
          : null;

    locations.push(withCanonicalPlaceLinkage({
      id: locationId,
      latitude,
      longitude,
      address: anchor.address,
      placeName: anchor.placeName,
      city: anchor.city,
      district: anchor.district,
      region: anchor.region,
      country: anchor.country,
      geokey: coordsToGeokey(latitude, longitude),
      createdAt,
      updatedAt: createdAt,
    }));

    posts.push({
      id: postId,
      authorId: author.id,
      locationId,
      title: titleFor(index, topic, anchor),
      body: bodyFor(index, topic, anchor, author),
      visibilityType,
      teaser: teaserFor(index, anchor),
      topicId: topic.id,
      visibilityStart,
      visibilityEnd,
      specialPrice: visibilityType === "special_hidden_place" ? 149 + (index % 4) * 70 : null,
      currency: visibilityType === "special_hidden_place" ? "CZK" : null,
      createdAt,
      updatedAt: createdAt,
    });

    const topicTags = topicDefinitions.find((entry) => entry.slug === topic.slug)?.tags ?? [];
    unique([...anchor.tags, ...topicTags, author.focusTopicSlugs[index % author.focusTopicSlugs.length]])
      .slice(0, 4)
      .forEach((tag) => {
        postTags.push({
          id: id("tag", postTags.length + 1),
          postId,
          tag,
        });
      });

    /* ~1/7 posts have no media (text-only in feed) */
    if (index % 7 !== 0) {
      postMedia.push({
        id: id("media", postMedia.length + 1),
        postId,
        type: "image",
        url: mediaUrl(`post-${index + 1}`),
        alt: `${anchor.placeName} preview ${index + 1}`,
        order: 0,
      });

      if (index % 3 === 0) {
        postMedia.push({
          id: id("media", postMedia.length + 1),
          postId,
          type: "image",
          url: mediaUrl(`post-${index + 1}-detail`, 1200, 1000),
          alt: `${anchor.placeName} secondary angle ${index + 1}`,
          order: 1,
        });
      }
    }

    if (visibilityType === "special_hidden_place" && index % 2 === 0) {
      const unlockUser = users[(index + 4) % users.length];
      entitlements.push({
        id: id("entitlement", entitlements.length + 1),
        userId: unlockUser.id,
        creatorId: author.id,
        postId,
        type: "special_unlock",
        status: "active",
        createdAt: isoFromNow(-((index % 12) + 1)),
        updatedAt: isoFromNow(-((index % 8) + 1)),
      });
    }

    if (index % 5 !== 0) {
      const topLevelCommentCount = (index % 3) + 1;
      for (let commentIndex = 0; commentIndex < topLevelCommentCount; commentIndex += 1) {
        const commentId = id("comment", comments.length + 1);
        const commentAuthor = users[(index + commentIndex + 2) % users.length];
        comments.push({
          id: commentId,
          postId,
          authorId: commentAuthor.id,
          parentCommentId: null,
          body: commentBodies[(index + commentIndex) % commentBodies.length],
          createdAt: isoFromNow(-((index % 20) + 1), -(commentIndex + 1)),
          updatedAt: isoFromNow(-((index % 20) + 1), -(commentIndex + 1)),
        });

        if (commentIndex === 0 && index % 2 === 0) {
          comments.push({
            id: id("comment", comments.length + 1),
            postId,
            authorId: author.id,
            parentCommentId: commentId,
            body: "Thanks, this is exactly the kind of respectful feedback that keeps the spot usable.",
            createdAt: isoFromNow(-((index % 14) + 1), -1),
            updatedAt: isoFromNow(-((index % 14) + 1), -1),
          });
        }
      }
    }

    const reactionCount = 5 + (index % 6);
    for (let reactionIndex = 0; reactionIndex < reactionCount; reactionIndex += 1) {
      const reactingUser = users[(index + reactionIndex + 1) % users.length];
      reactions.push({
        id: id("reaction", reactions.length + 1),
        userId: reactingUser.id,
        postId,
        type: reactionCycle[(index + reactionIndex) % reactionCycle.length],
        createdAt: isoFromNow(-((index % 12) + 1), -(reactionIndex % 5)),
      });
    }

    if (index % 4 === 0) {
      savedPosts.push({
        id: id("saved", savedPosts.length + 1),
        userId: users[(index + 6) % users.length].id,
        postId,
        createdAt: isoFromNow(-((index % 10) + 1)),
      });
    }
  }

  function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
  }

  // Expand demo seed: >= 20 posts per European country (country stored as ISO alpha-2).
  const europeCreatorsByCountry = new Map<EuropeCountryCode, User>();
  for (const code of EUROPE_COUNTRY_CODES) {
    if (code === "CZ") continue;
    const c = code as EuropeCountryCode;
    const creator = users.find((u) => u.username === `europe.${c.toLowerCase()}.curator`);
    if (creator) europeCreatorsByCountry.set(c, creator);
  }

  const europeCountryCodes = EUROPE_COUNTRY_CODES.filter((c) => c !== "CZ");
  europeCountryCodes.forEach((code, countryIndex) => {
    const c = code as EuropeCountryCode;
    const creator = europeCreatorsByCountry.get(c);
    if (!creator) return;

    const bounds = getCountryBounds(c);
    const adminPlaces = getAdminSearchPlaces(c);
    const topicSlugs = topicDefinitions.map((t) => t.slug);

    for (let i = 0; i < 20; i += 1) {
      const globalIndex = posts.length;
      const theme = EUROPE_THEMES[i % EUROPE_THEMES.length]!;
      const topic = topics[(i + countryIndex) % topics.length]!;
      const admin = adminPlaces.length ? adminPlaces[i % adminPlaces.length]! : null;

      const baseLat = admin?.latitude ?? (bounds.south + (bounds.north - bounds.south) * rand01(`${c}:lat`, i));
      const baseLng = admin?.longitude ?? (bounds.west + (bounds.east - bounds.west) * rand01(`${c}:lng`, i));
      const jitterLat = (rand01(`${c}:jlat`, i) - 0.5) * 0.55;
      const jitterLng = (rand01(`${c}:jlng`, i) - 0.5) * 0.55;
      const latitude = Number(clamp(baseLat + jitterLat, bounds.south + 0.05, bounds.north - 0.05).toFixed(6));
      const longitude = Number(clamp(baseLng + jitterLng, bounds.west + 0.05, bounds.east - 0.05).toFixed(6));

      const locationId = id("location", locations.length + 1);
      const postId = id("post", posts.length + 1);
      const createdAt = isoFromNow(-((countryIndex * 3 + i) % 220) - 2, -((i * 2) % 12));
      const visibilityType = visibilityForIndex(globalIndex);

      const regionName = admin?.region ?? null;
      const placeName = `${theme.label} spot`;

      locations.push(withCanonicalPlaceLinkage({
        id: locationId,
        latitude,
        longitude,
        address: regionName ? `Near ${regionName}` : null,
        placeName,
        city: null,
        district: null,
        region: regionName,
        country: c,
        geokey: coordsToGeokey(latitude, longitude),
        createdAt,
        updatedAt: createdAt,
      }));

      const countryName = getCountryNameCs(c);
      const title = regionName ? `${theme.label} · ${regionName} (${countryName})` : `${theme.label} · ${countryName}`;
      const focusHint = pick(topicSlugs, `focusHint:${c}`, i);

      posts.push({
        id: postId,
        authorId: creator.id,
        locationId,
        title,
        body: [
          `${creator.displayName} shares a ${theme.label.toLowerCase()} in ${countryName} — pinned for travelers who value timing and low-noise access.`,
          bodyFragments[(countryIndex + i) % bodyFragments.length]!,
          noteFragments[(countryIndex + i + 2) % noteFragments.length]!,
          `Tagged for: ${topic.name}.`,
          `${DEMO_FEE_NOTE}: Europe-wide seed content is synthetic, but entitlement and visibility rules behave like production.`,
        ].join(" "),
        visibilityType,
        teaser: `${teaserFragments[(countryIndex + i) % teaserFragments.length]!} Filter: ${c}.`,
        topicId: topic.id,
        visibilityStart: isoFromNow(-((i % 25) + 1)),
        visibilityEnd: i % 17 === 0 ? isoFromNow(4 + (i % 5)) : null,
        specialPrice: visibilityType === "special_hidden_place" ? 149 + (i % 4) * 70 : null,
        currency: visibilityType === "special_hidden_place" ? "CZK" : null,
        createdAt,
        updatedAt: createdAt,
      });

      const topicTags = topicDefinitions.find((entry) => entry.slug === topic.slug)?.tags ?? [];
      unique([
        ...theme.tags,
        ...topicTags,
        focusHint,
        c.toLowerCase(),
        "europe",
      ])
        .slice(0, 5)
        .forEach((tag) => {
          postTags.push({
            id: id("tag", postTags.length + 1),
            postId,
            tag,
          });
        });

      postMedia.push({
        id: id("media", postMedia.length + 1),
        postId,
        type: "image",
        url: mediaUrl(`europe-${c}-${i}`),
        alt: `${theme.label} in ${countryName}`,
        order: 0,
      });

      if (i % 4 === 0) {
        const reactingUser = users[(i + countryIndex + 1) % users.length]!;
        reactions.push({
          id: id("reaction", reactions.length + 1),
          userId: reactingUser.id,
          postId,
          type: reactionCycle[(i + countryIndex) % reactionCycle.length]!,
          createdAt: isoFromNow(-((i % 12) + 1)),
        });
      }

      if (i % 6 === 0) {
        comments.push({
          id: id("comment", comments.length + 1),
          postId,
          authorId: creator.id,
          parentCommentId: null,
          body: `If you visit, keep it light — this is a demo pin for ${countryName}, but the etiquette is real.`,
          createdAt: isoFromNow(-((i % 18) + 1)),
          updatedAt: isoFromNow(-((i % 18) + 1)),
        });
      }
    }
  });

  // Expand Czechia seed: 50 POIs per kraj using real city coordinates (Wikidata-derived).
  // This supplements the original Plzeň-focused anchors to give a full-country exploration experience.
  const czCreators = users.slice(0, userDefinitions.length);
  CZ_KRAJ_PLACE_SETS.forEach((set, regionIndex) => {
    const region = set.region;
    for (let i = 0; i < set.places.length; i += 1) {
      const place = set.places[i]!;
      const theme = EUROPE_THEMES[(regionIndex * 3 + i) % EUROPE_THEMES.length]!;
      const topic = topics[(regionIndex + i) % topics.length]!;
      const author = czCreators[(regionIndex + i * 2) % czCreators.length]!;

      const locationId = id("location", locations.length + 1);
      const postId = id("post", posts.length + 1);
      const createdAt = isoFromNow(-((regionIndex * 5 + i) % 260) - 5, -((i * 2) % 12));
      const visibilityType = visibilityForIndex(posts.length);

      const latitude = Number(place.latitude.toFixed(6));
      const longitude = Number(place.longitude.toFixed(6));
      const city = place.city;

      locations.push(withCanonicalPlaceLinkage({
        id: locationId,
        latitude,
        longitude,
        address: `Near ${city}`,
        placeName: theme.label,
        city,
        district: null,
        region,
        country: "CZ",
        geokey: coordsToGeokey(latitude, longitude),
        createdAt,
        updatedAt: createdAt,
      }));

      posts.push({
        id: postId,
        authorId: author.id,
        locationId,
        title: `${theme.label} · ${city}`,
        body: [
          `${author.displayName} pinned a ${theme.label.toLowerCase()} near ${city} (${set.regionLabel} kraj).`,
          bodyFragments[(regionIndex + i) % bodyFragments.length]!,
          noteFragments[(regionIndex + i + 1) % noteFragments.length]!,
          `Topic: ${topic.name}.`,
          `${DEMO_FEE_NOTE}: Czech kraj seed uses real city coordinates; content is demo placeholder.`,
        ].join(" "),
        visibilityType,
        teaser: `${theme.label} · ${city} (${set.regionLabel}).`,
        topicId: topic.id,
        visibilityStart: isoFromNow(-((i % 30) + 1)),
        visibilityEnd: i % 23 === 0 ? isoFromNow(5 + (i % 5)) : null,
        specialPrice: visibilityType === "special_hidden_place" ? 149 + (i % 4) * 70 : null,
        currency: visibilityType === "special_hidden_place" ? "CZK" : null,
        createdAt,
        updatedAt: createdAt,
      });

      const topicTags = topicDefinitions.find((entry) => entry.slug === topic.slug)?.tags ?? [];
      unique([...theme.tags, ...topicTags, "cz", slugify(region)])
        .slice(0, 5)
        .forEach((tag) => {
          postTags.push({
            id: id("tag", postTags.length + 1),
            postId,
            tag,
          });
        });

      postMedia.push({
        id: id("media", postMedia.length + 1),
        postId,
        type: "image",
        url: mediaUrl(`cz-${slugify(region)}-${place.wikidataId}`),
        alt: `${theme.label} near ${city}`,
        order: 0,
      });
    }
  });

  const collectionPosts: CollectionPost[] = [];
  const collectionUsers: CollectionUser[] = [];

  collections.forEach((collection) => {
    const topic = topics.find((entry) => entry.id === collection.topicId) ?? topics[0];
    const matchingPosts = posts
      .filter((post) => post.topicId === topic.id)
      .slice(0, 12);

    matchingPosts.forEach((post, order) => {
      collectionPosts.push({
        id: id("collection_post", collectionPosts.length + 1),
        collectionId: collection.id,
        postId: post.id,
        order,
      });
    });

    const matchingUsers = users
      .filter((user) => user.focusTopicSlugs.includes(topic.slug))
      .slice(0, 5);

    matchingUsers.forEach((user, order) => {
      collectionUsers.push({
        id: id("collection_user", collectionUsers.length + 1),
        collectionId: collection.id,
        userId: user.id,
        order,
      });
    });
  });

  const searchPlaces: SearchPlace[] = [
    {
      id: "place-plzen-city",
      kind: "city",
      label: "Plzen",
      latitude: 49.7475,
      longitude: 13.3776,
      city: "Plzen",
      district: "Plzen-mesto",
      region: REGION,
      country: COUNTRY,
      radiusKm: 18,
    },
    {
      id: "place-plzen-region",
      kind: "region",
      label: "Plzeňský",
      latitude: 49.7384,
      longitude: 13.3637,
      region: REGION,
      country: COUNTRY,
      radiusKm: 110,
    },
    {
      id: "region-praha",
      kind: "region",
      label: "Praha",
      latitude: 50.0755,
      longitude: 14.4378,
      region: "Prague",
      country: COUNTRY,
      radiusKm: 40,
    },
    {
      id: "region-karlovarsky",
      kind: "region",
      label: "Karlovarský",
      latitude: 50.1435,
      longitude: 12.7502,
      region: "Karlovarsky kraj",
      country: COUNTRY,
      radiusKm: 80,
    },
    {
      id: "region-jihocesky",
      kind: "region",
      label: "Jihočeský",
      latitude: 49.0784,
      longitude: 14.4386,
      region: "Jihocesky kraj",
      country: COUNTRY,
      radiusKm: 120,
    },
    {
      id: "region-stredocesky",
      kind: "region",
      label: "Středočeský",
      latitude: 49.8782,
      longitude: 14.6594,
      region: "Stredocesky kraj",
      country: COUNTRY,
      radiusKm: 90,
    },
    {
      id: "region-ustecky",
      kind: "region",
      label: "Ústecký",
      latitude: 50.6595,
      longitude: 13.7872,
      region: "Ustecky kraj",
      country: COUNTRY,
      radiusKm: 85,
    },
    {
      id: "region-liberecky",
      kind: "region",
      label: "Liberecký",
      latitude: 50.7663,
      longitude: 15.0543,
      region: "Liberecky kraj",
      country: COUNTRY,
      radiusKm: 75,
    },
    {
      id: "region-jihomoravsky",
      kind: "region",
      label: "Jihomoravský",
      latitude: 49.1552,
      longitude: 16.8729,
      region: "Jihomoravsky kraj",
      country: COUNTRY,
      radiusKm: 95,
    },
    {
      id: "region-kralovehradecky",
      kind: "region",
      label: "Královéhradecký",
      latitude: 50.3458,
      longitude: 15.9074,
      region: "Kralovehradecky kraj",
      country: COUNTRY,
      radiusKm: 85,
    },
    {
      id: "region-pardubicky",
      kind: "region",
      label: "Pardubický",
      latitude: 49.9466,
      longitude: 16.0531,
      region: "Pardubicky kraj",
      country: COUNTRY,
      radiusKm: 80,
    },
    {
      id: "region-vysocina",
      kind: "region",
      label: "Vysočina",
      latitude: 49.403,
      longitude: 15.6768,
      region: "Vysocina",
      country: COUNTRY,
      radiusKm: 90,
    },
    {
      id: "region-olomoucky",
      kind: "region",
      label: "Olomoucký",
      latitude: 49.7394,
      longitude: 17.2291,
      region: "Olomoucky kraj",
      country: COUNTRY,
      radiusKm: 85,
    },
    {
      id: "region-moravskoslezsky",
      kind: "region",
      label: "Moravskoslezský",
      latitude: 49.8165,
      longitude: 18.2557,
      region: "Moravskoslezsky kraj",
      country: COUNTRY,
      radiusKm: 90,
    },
    {
      id: "region-zlinsky",
      kind: "region",
      label: "Zlínský",
      latitude: 49.2206,
      longitude: 17.6944,
      region: "Zlinsky kraj",
      country: COUNTRY,
      radiusKm: 80,
    },
    {
      id: "place-czech-republic",
      kind: "country",
      label: getCountryNameCs(COUNTRY),
      latitude: 49.8175,
      longitude: 15.473,
      country: COUNTRY,
      radiusKm: 300,
    },
    {
      id: "place-plzen-sever",
      kind: "district",
      label: "Plzen-sever",
      latitude: 49.8092,
      longitude: 13.2633,
      district: "Plzen-sever",
      region: REGION,
      country: COUNTRY,
      radiusKm: 40,
    },
    {
      id: "place-rokycany",
      kind: "district",
      label: "Rokycany",
      latitude: 49.7424,
      longitude: 13.5948,
      district: "Rokycany",
      region: REGION,
      country: COUNTRY,
      radiusKm: 32,
    },
    {
      id: "place-brdy",
      kind: "poi",
      label: "Brdy west edge",
      latitude: 49.6943,
      longitude: 13.6836,
      city: "Dobriv",
      district: "Rokycany",
      region: REGION,
      country: COUNTRY,
      radiusKm: 16,
    },
    {
      id: "place-hracholusky",
      kind: "poi",
      label: "Hracholusky inlet",
      latitude: 49.8194,
      longitude: 13.1704,
      city: "Pnovany",
      district: "Plzen-sever",
      region: REGION,
      country: COUNTRY,
      radiusKm: 18,
    },
    {
      id: "place-prague",
      kind: "city",
      label: "Prague",
      latitude: 50.0755,
      longitude: 14.4378,
      city: "Prague",
      district: "Praha 1",
      region: "Prague",
      country: COUNTRY,
      radiusKm: 25,
    },
    {
      id: "place-marianske-lazne",
      kind: "city",
      label: "Marianske Lazne",
      latitude: 49.9647,
      longitude: 12.7012,
      city: "Marianske Lazne",
      district: "Cheb",
      region: "Karlovarsky kraj",
      country: COUNTRY,
      radiusKm: 15,
    },
    {
      id: "place-susice",
      kind: "city",
      label: "Susice",
      latitude: 49.2311,
      longitude: 13.5202,
      city: "Susice",
      district: "Klatovy",
      region: REGION,
      country: COUNTRY,
      radiusKm: 18,
    },
  ];

  for (const code of EUROPE_COUNTRY_CODES) {
    if (code === "CZ") continue;
    if (!isCountryDemoEnabled(code)) continue;
    const whole = getDemoWholeCountryPlace(code);
    searchPlaces.push({
      ...whole,
      label: getCountryNameCs(code),
    });
    searchPlaces.push(...getAdminSearchPlaces(code));
  }

  return {
    users,
    follows,
    subscriptions,
    topics,
    collections,
    collectionPosts,
    collectionUsers,
    locations,
    posts,
    postTags,
    postMedia,
    reactions,
    comments,
    savedPosts,
    blockedUsers,
    reports,
    entitlements,
    payments: [],
    searchPlaces,
  };
}

export const seedData = createSeedData();
