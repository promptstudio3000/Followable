import type {
  AppSnapshot,
  DemoLocalState,
  HydratedPost,
  SearchGroupHit,
  Topic,
  TravelGroupAccessType,
  TravelGroupJoinMode,
  TravelGroupQuestionnaire,
  User,
} from "@/lib/types";

type TravelGroupDefinition = {
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  heroNote: string;
  joinMode: TravelGroupJoinMode;
  inviteCode?: string | null;
  password?: string | null;
  passwordHint?: string | null;
  questionnaire?: TravelGroupQuestionnaire | null;
  perks: string[];
  ownerUsername: string;
  accessType: TravelGroupAccessType;
  priceCzk?: number | null;
  countryCodes: string[];
  topicSlugs: string[];
  searchTags: string[];
  memberUsernames: string[];
  featuredPostIds?: string[];
};

export type TravelGroupSummary = {
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  heroNote: string;
  joinMode: TravelGroupJoinMode;
  inviteCode?: string | null;
  password?: string | null;
  passwordHint?: string | null;
  questionnaire?: TravelGroupQuestionnaire | null;
  perks: string[];
  owner: User;
  accessType: TravelGroupAccessType;
  priceCzk?: number | null;
  countryCodes: string[];
  topics: Topic[];
  members: User[];
  posts: HydratedPost[];
  featuredPosts: HydratedPost[];
  postCount: number;
  memberCount: number;
  searchTags: string[];
  isUserCreated?: boolean;
};

const GROUP_DEFINITIONS: TravelGroupDefinition[] = [
  {
    slug: "european-van-club",
    name: "European Van Club",
    description:
      "Paid community for overnights, calm pull-ins, refill points, and road-tested day planning across Europe.",
    shortDescription: "Paid vanlife community for practical stops and quiet overnight routes.",
    heroNote: "Built for travelers crossing borders who need places that work in real life, not just on postcards.",
    joinMode: "paid_subscription",
    perks: ["Quiet overnight pins", "Road-tested refill spots", "Cross-border route notes"],
    ownerUsername: "vanwest.bohemia",
    accessType: "paid",
    priceCzk: 249,
    countryCodes: ["CZ", "DE", "AT", "PL", "SI", "HR", "IT", "FR", "ES", "PT"],
    topicSlugs: ["vanlife", "overnight-spots", "rivers"],
    searchTags: ["vanlife", "overnight", "quiet-road", "water", "caravan", "sunrise"],
    memberUsernames: ["silent.camps", "forest.signal", "borderless.routes"],
  },
  {
    slug: "quiet-city-locals",
    name: "Quiet City Locals",
    description:
      "Public city-minded circle for overlooked neighborhoods, rainy-day walks, river edges, and slow urban discoveries.",
    shortDescription: "Public group for hidden city corners and low-noise local discoveries.",
    heroNote: "For the traveler who wants a city to feel lived in, not consumed in checklist mode.",
    joinMode: "open",
    perks: ["Local walkable corners", "Rainy-day routes", "Urban river edges"],
    ownerUsername: "urban.scout.plzen",
    accessType: "public",
    countryCodes: ["CZ", "DE", "PL", "AT", "FR", "IT", "ES"],
    topicSlugs: ["hidden-spots", "local-guides", "viewpoints"],
    searchTags: ["hidden-gem", "city-view", "walkable", "after-rain", "slow-travel", "insider"],
    memberUsernames: ["city.after.rain", "plzen.insider", "tram.cryptid"],
  },
  {
    slug: "crypto-nomads-europe",
    name: "Crypto Nomads Europe",
    description:
      "Paid knowledge layer for laptop-friendly cities, crypto-friendly spots, and creator meetups across Europe.",
    shortDescription: "Paid community for remote work, wallet-native travel, and meetup-friendly stops.",
    heroNote: "Useful when the route depends on signal quality, good coffee, and places where a wallet-native traveler feels at home.",
    joinMode: "paid_subscription",
    perks: ["Laptop-friendly stops", "Meetup layer", "Crypto-friendly practical notes"],
    ownerUsername: "btc.cafe.cz",
    accessType: "paid",
    priceCzk: 299,
    countryCodes: ["CZ", "DE", "NL", "PT", "ES", "FR", "IT", "PL", "AT"],
    topicSlugs: ["crypto-friendly", "remote-work", "local-guides"],
    searchTags: ["crypto", "cowork", "wifi", "community", "coffee", "creator"],
    memberUsernames: ["brew.chain.route", "borderless.routes"],
  },
  {
    slug: "forest-reset-circle",
    name: "Forest Reset Circle",
    description:
      "Private sharing space for trailheads, forest edges, calm pull-ins, and respectful outdoor stopovers.",
    shortDescription: "Private group for quiet forest edges and slow outdoor resets.",
    heroNote: "A smaller trust-based space for spots that stay good only when members arrive lightly and leave cleanly.",
    joinMode: "invite_code",
    inviteCode: "FOREST-CIRCLE-27",
    perks: ["Trust-based forest spots", "Quiet pull-ins", "Sensitive locations kept small"],
    ownerUsername: "wild.bohemia",
    accessType: "private",
    countryCodes: ["CZ", "DE", "AT", "SI", "HR", "SK"],
    topicSlugs: ["hidden-spots", "overnight-spots", "viewpoints"],
    searchTags: ["forest", "trailhead", "calm", "ridge", "quiet-corner", "respect"],
    memberUsernames: ["brdy.trails", "silent.camps", "forest.signal"],
  },
  {
    slug: "sunrise-collective",
    name: "Sunrise Collective",
    description:
      "Shared map for people planning mornings well: ridge lines, waterfronts, benches, and first-light stops.",
    shortDescription: "Public sunrise-first exploration group.",
    heroNote: "Made for the traveler who likes to anchor a day around one early viewpoint and build the route around it.",
    joinMode: "open",
    perks: ["Morning-first route ideas", "Sunrise benches", "Fast viewpoint planning"],
    ownerUsername: "city.after.rain",
    accessType: "public",
    countryCodes: ["CZ", "SK", "PL", "AT", "IT", "GR", "PT", "ES", "HR"],
    topicSlugs: ["viewpoints", "rivers", "hidden-spots"],
    searchTags: ["sunrise", "golden-hour", "viewpoint", "lake", "river", "bench"],
    memberUsernames: ["urban.scout.plzen", "wild.bohemia", "borderless.routes"],
  },
  {
    slug: "family-route-atlas",
    name: "Family Route Atlas",
    description:
      "Private planning group for calmer family-friendly stops, practical pauses, short walks, and reliable day structure.",
    shortDescription: "Password-protected family travel planning group.",
    heroNote: "Useful when the route depends on nap windows, clean pauses, and low-friction stops that work with kids.",
    joinMode: "password",
    password: "sunnymornings",
    passwordHint: "Think of an easy family-travel mood, lowercase, no spaces.",
    perks: ["Kid-friendly stopovers", "Short-walk detours", "Low-friction family pacing"],
    ownerUsername: "tram.cryptid",
    accessType: "private",
    countryCodes: ["CZ", "AT", "DE", "IT", "HR", "SI"],
    topicSlugs: ["local-guides", "rivers", "viewpoints"],
    searchTags: ["family", "stroller", "break", "easy-stop", "quiet-park", "short-walk"],
    memberUsernames: ["city.after.rain", "plzen.insider"],
  },
  {
    slug: "respectful-water-keepers",
    name: "Respectful Water Keepers",
    description:
      "Application-based circle for cleaner swim spots, small riverside entries, and places that only stay good when members share the same etiquette.",
    shortDescription: "Questionnaire-based group for sensitive water and swim spots.",
    heroNote: "Access is shaped by fit, not speed — good places stay good when everyone enters with the same expectations.",
    joinMode: "questionnaire",
    questionnaire: {
      prompt: "Tell the group how you travel and how you protect sensitive places.",
      questions: [
        "What kind of spots are you looking for, and why?",
        "How do you behave when a shared place is sensitive or overused?",
      ],
    },
    perks: ["Sensitive swim spots", "Etiquette-first notes", "Shared trust expectations"],
    ownerUsername: "silent.camps",
    accessType: "private",
    countryCodes: ["CZ", "HR", "SI", "AT", "IT", "GR"],
    topicSlugs: ["rivers", "hidden-spots", "local-guides"],
    searchTags: ["swim", "water", "respect", "river-entry", "clean-spot", "quiet-shore"],
    memberUsernames: ["wild.bohemia", "forest.signal"],
  },
];

function uniqueUsers(values: User[]) {
  return Array.from(new Map(values.map((user) => [user.id, user])).values());
}

function normalizeQuery(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getTravelGroupSummaries(
  snapshot: AppSnapshot,
  hydratedPosts: HydratedPost[],
  localState?: Pick<DemoLocalState, "createdTravelGroups"> | null,
) {
  const usersByUsername = new Map(snapshot.users.map((user) => [user.username, user]));
  const usersById = new Map(snapshot.users.map((user) => [user.id, user]));
  const topicsBySlug = new Map(snapshot.topics.map((topic) => [topic.slug, topic]));

  const builtInGroups = GROUP_DEFINITIONS.flatMap<TravelGroupSummary>((definition) => {
    const owner = usersByUsername.get(definition.ownerUsername);
    if (!owner) return [];

    const members = uniqueUsers(
      definition.memberUsernames
        .map((username) => usersByUsername.get(username))
        .filter((user): user is User => Boolean(user))
        .concat(owner),
    );

    const memberIds = new Set(members.map((user) => user.id));
    const countryCodes = new Set(definition.countryCodes.map((code) => code.toUpperCase()));
    const topicSlugs = new Set(definition.topicSlugs);
    const searchTags = new Set(definition.searchTags.map((tag) => tag.toLowerCase()));
    const featuredPostIds = new Set(definition.featuredPostIds ?? []);

    const posts = [...hydratedPosts]
      .filter((post) => {
        const country = (post.location.country ?? "").toUpperCase();
        const matchesCountry = countryCodes.size === 0 || countryCodes.has(country);
        const matchesTopic = post.topic?.slug ? topicSlugs.has(post.topic.slug) : false;
        const matchesAuthor = memberIds.has(post.author.id);
        const matchesTag = post.tags.some((tag) => searchTags.has(tag.toLowerCase()));
        return matchesCountry && (matchesTopic || matchesAuthor || matchesTag || featuredPostIds.has(post.id));
      })
      .sort((left, right) => {
        const leftFeatured = featuredPostIds.has(left.id) ? 1 : 0;
        const rightFeatured = featuredPostIds.has(right.id) ? 1 : 0;
        if (leftFeatured !== rightFeatured) return rightFeatured - leftFeatured;
        return new Date(right.post.createdAt).getTime() - new Date(left.post.createdAt).getTime();
      });

    return [{
      slug: definition.slug,
      name: definition.name,
      description: definition.description,
      shortDescription: definition.shortDescription,
      heroNote: definition.heroNote,
      joinMode: definition.joinMode,
      inviteCode: definition.inviteCode ?? null,
      password: definition.password ?? null,
      passwordHint: definition.passwordHint ?? null,
      questionnaire: definition.questionnaire ?? null,
      perks: definition.perks,
      owner,
      accessType: definition.accessType,
      priceCzk: definition.priceCzk ?? null,
      countryCodes: definition.countryCodes,
      topics: definition.topicSlugs
        .map((slug) => topicsBySlug.get(slug))
        .filter((topic): topic is Topic => Boolean(topic)),
      members,
      posts,
      featuredPosts: posts.slice(0, 4),
      postCount: posts.length,
      memberCount: members.length,
      searchTags: definition.searchTags,
    }];
  });

  const createdGroups = (localState?.createdTravelGroups ?? []).flatMap<TravelGroupSummary>((group) => {
    const owner = usersById.get(group.ownerUserId);
    if (!owner) return [];

    const members = uniqueUsers(
      group.memberUserIds
        .map((userId) => usersById.get(userId))
        .filter((user): user is User => Boolean(user))
        .concat(owner),
    );
    const featuredPostIds = new Set(group.featuredPostIds ?? []);
    const posts = [...hydratedPosts]
      .filter((post) => featuredPostIds.has(post.id))
      .sort(
        (left, right) => new Date(right.post.createdAt).getTime() - new Date(left.post.createdAt).getTime(),
      );

    return [{
      slug: group.slug,
      name: group.name,
      description: group.description,
      shortDescription: group.shortDescription,
      heroNote: group.heroNote,
      joinMode: group.joinMode,
      inviteCode: group.inviteCode ?? null,
      password: group.password ?? null,
      passwordHint: group.passwordHint ?? null,
      questionnaire: group.questionnaire ?? null,
      perks: group.perks,
      owner,
      accessType: group.accessType,
      priceCzk: group.priceCzk ?? null,
      countryCodes: group.countryCodes,
      topics: group.topicSlugs
        .map((slug) => topicsBySlug.get(slug))
        .filter((topic): topic is Topic => Boolean(topic)),
      members,
      posts,
      featuredPosts: posts.slice(0, 4),
      postCount: posts.length,
      memberCount: members.length,
      searchTags: group.searchTags,
      isUserCreated: true,
    }];
  });

  return [...createdGroups, ...builtInGroups];
}

export function normalizeTravelGroupInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-");
}

export function findTravelGroupByInviteCode(
  snapshot: AppSnapshot,
  hydratedPosts: HydratedPost[],
  inviteCode: string,
  localState?: Pick<DemoLocalState, "createdTravelGroups"> | null,
) {
  const normalized = normalizeTravelGroupInviteCode(inviteCode);
  if (!normalized) return null;
  return (
    getTravelGroupSummaries(snapshot, hydratedPosts, localState).find(
      (group) => group.inviteCode && normalizeTravelGroupInviteCode(group.inviteCode) === normalized,
    ) ?? null
  );
}

export function getTravelGroupBySlug(
  snapshot: AppSnapshot,
  hydratedPosts: HydratedPost[],
  slug: string,
  localState?: Pick<DemoLocalState, "createdTravelGroups"> | null,
) {
  return getTravelGroupSummaries(snapshot, hydratedPosts, localState).find((group) => group.slug === slug) ?? null;
}

export function searchTravelGroups(
  snapshot: AppSnapshot,
  hydratedPosts: HydratedPost[],
  query: string,
  localState?: Pick<DemoLocalState, "createdTravelGroups"> | null,
): SearchGroupHit[] {
  const needle = normalizeQuery(query.startsWith("#") ? query.slice(1) : query);
  const groups = getTravelGroupSummaries(snapshot, hydratedPosts, localState);

  const filtered = needle
    ? groups.filter((group) => {
        const haystack = normalizeQuery(
          [
            group.name,
            group.description,
            group.owner.displayName,
            group.countryCodes.join(" "),
            group.topics.map((topic) => topic.slug).join(" "),
            group.searchTags.join(" "),
          ].join(" "),
        );
        return haystack.includes(needle);
      })
    : groups;

  return filtered.map((group) => ({
    slug: group.slug,
    name: group.name,
    description: group.shortDescription,
    accessType: group.accessType,
    joinMode: group.joinMode,
    priceCzk: group.priceCzk ?? null,
    memberCount: group.memberCount,
    postCount: group.postCount,
    countryCodes: group.countryCodes,
    topicSlugs: group.topics.map((topic) => topic.slug),
  }));
}
