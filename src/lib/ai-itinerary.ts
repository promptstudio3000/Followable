import type { HydratedPost } from "@/lib/types";
import { haversineKm, slugify } from "@/lib/utils";

type PlannerIntent =
  | "coffee"
  | "shopping"
  | "hike"
  | "viewpoint"
  | "water"
  | "overnight"
  | "city"
  | "lunch"
  | "remote";

type PlannerSlot = {
  intent: PlannerIntent;
  label: string;
  timeLabel: string;
  keywords: string[];
};

type DraftEntry = {
  postId: string;
  dayLabel: string;
  timeLabel: string;
  note: string;
  tags: string[];
};

export type AiItineraryDraft = {
  title: string;
  description: string;
  entries: DraftEntry[];
  warnings: string[];
};

const SLOT_LIBRARY: Record<PlannerIntent, PlannerSlot> = {
  coffee: {
    intent: "coffee",
    label: "coffee stop",
    timeLabel: "08:30",
    keywords: ["coffee", "cafe", "káva", "kava", "brunch", "breakfast"],
  },
  shopping: {
    intent: "shopping",
    label: "shopping stop",
    timeLabel: "09:30",
    keywords: ["lidl", "shop", "shopping", "market", "nakoup", "supermarket"],
  },
  hike: {
    intent: "hike",
    label: "short hike",
    timeLabel: "10:30",
    keywords: ["hike", "trail", "walk", "trek", "ferrata", "výlet", "vylet"],
  },
  viewpoint: {
    intent: "viewpoint",
    label: "scenic stop",
    timeLabel: "16:30",
    keywords: ["view", "viewpoint", "lookout", "sunset", "panorama", "vyhl", "scenic"],
  },
  water: {
    intent: "water",
    label: "water stop",
    timeLabel: "18:00",
    keywords: ["water", "river", "lake", "swim", "beach", "koup", "jezero", "riverbank"],
  },
  overnight: {
    intent: "overnight",
    label: "overnight stop",
    timeLabel: "20:30",
    keywords: ["overnight", "camp", "camping", "vanlife", "karavan", "caravan", "sleep"],
  },
  city: {
    intent: "city",
    label: "city stop",
    timeLabel: "12:00",
    keywords: ["city", "town", "historic", "old town", "center", "památ", "museum", "sight"],
  },
  lunch: {
    intent: "lunch",
    label: "lunch stop",
    timeLabel: "13:00",
    keywords: ["lunch", "food", "restaurant", "meal", "obed", "oběd"],
  },
  remote: {
    intent: "remote",
    label: "remote work stop",
    timeLabel: "11:00",
    keywords: ["remote", "work", "wifi", "cowork", "laptop"],
  },
};

const DAY_MARKERS = [
  { index: 1, patterns: ["first day", "day 1", "1. day", "prvni den", "první den", "den 1", "1. den"] },
  { index: 2, patterns: ["second day", "day 2", "2. day", "druhy den", "druhý den", "den 2", "2. den"] },
  { index: 3, patterns: ["third day", "day 3", "3. day", "treti den", "třetí den", "den 3", "3. den"] },
  { index: 4, patterns: ["fourth day", "day 4", "4. day", "ctvrty den", "čtvrtý den", "den 4", "4. den"] },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferDayCount(prompt: string) {
  const normalized = normalize(prompt);
  const explicit = normalized.match(/(\d+)\s*(day|days|dny|dni|den)/);
  if (explicit) {
    const parsed = Number.parseInt(explicit[1] ?? "", 10);
    if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, 5);
  }
  if (normalized.includes("weekend")) return 2;

  const markerCount = DAY_MARKERS.filter((entry) => entry.patterns.some((pattern) => normalized.includes(pattern))).length;
  if (markerCount > 0) return markerCount;

  return 2;
}

function extractDayBriefs(prompt: string, dayCount: number) {
  const normalized = normalize(prompt);
  const positions = DAY_MARKERS.map((entry) => {
    const found = entry.patterns
      .map((pattern) => normalized.indexOf(pattern))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0];
    return found == null ? null : { index: entry.index, position: found };
  }).filter(Boolean) as Array<{ index: number; position: number }>;

  if (positions.length === 0) {
    return Array.from({ length: dayCount }, () => prompt);
  }

  const sorted = positions.sort((a, b) => a.position - b.position);
  return Array.from({ length: dayCount }, (_, offset) => {
    const dayNumber = offset + 1;
    const current = sorted.find((entry) => entry.index === dayNumber);
    if (!current) return prompt;
    const next = sorted.find((entry) => entry.position > current.position);
    return prompt.slice(current.position, next?.position ?? prompt.length).trim();
  });
}

function inferDaySlots(dayPrompt: string, dayIndex: number) {
  const normalized = normalize(dayPrompt);
  const slots: PlannerSlot[] = [];

  const addIfMatched = (intent: PlannerIntent) => {
    const slot = SLOT_LIBRARY[intent];
    if (slot.keywords.some((keyword) => normalized.includes(keyword))) {
      slots.push(slot);
    }
  };

  addIfMatched("shopping");
  addIfMatched("coffee");
  addIfMatched("remote");
  addIfMatched("hike");
  addIfMatched("city");
  addIfMatched("lunch");
  addIfMatched("viewpoint");
  addIfMatched("water");
  addIfMatched("overnight");

  if (slots.length === 0) {
    if (dayIndex === 0) {
      slots.push(SLOT_LIBRARY.coffee, SLOT_LIBRARY.viewpoint, SLOT_LIBRARY.water);
    } else {
      slots.push(SLOT_LIBRARY.city, SLOT_LIBRARY.lunch, SLOT_LIBRARY.viewpoint);
    }
  }

  const unique = new Map<PlannerIntent, PlannerSlot>();
  slots.forEach((slot) => {
    if (!unique.has(slot.intent)) unique.set(slot.intent, slot);
  });

  return [...unique.values()].slice(0, 4);
}

function textForPost(post: HydratedPost) {
  return normalize(
    [
      post.post.title,
      post.post.body,
      post.locationSummary,
      post.topic?.name,
      post.topic?.slug,
      post.tags.join(" "),
      post.author.displayName,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function choosePostForSlot(input: {
  slot: PlannerSlot;
  candidates: HydratedPost[];
  usedPostIds: Set<string>;
  previousStop: HydratedPost | null;
}) {
  const { slot, candidates, usedPostIds, previousStop } = input;
  let best: { post: HydratedPost; score: number } | null = null;

  for (const post of candidates) {
    if (usedPostIds.has(post.id)) continue;
    const haystack = textForPost(post);
    let score = post.popularityScore / 8 + post.engagementCount / 6;

    for (const keyword of slot.keywords) {
      if (haystack.includes(keyword)) score += 16;
    }

    if (slot.intent === "viewpoint" && post.tags.some((tag) => normalize(tag).includes("sunset"))) score += 12;
    if (slot.intent === "overnight" && post.tags.some((tag) => ["vanlife", "overnight-spots"].includes(normalize(tag)))) score += 14;
    if (slot.intent === "water" && post.tags.some((tag) => ["river", "rivers"].includes(normalize(tag)))) score += 10;

    if (previousStop) {
      const distance = haversineKm(
        previousStop.location.latitude,
        previousStop.location.longitude,
        post.location.latitude,
        post.location.longitude,
      );
      score -= Math.min(36, distance);
    }

    if (!best || score > best.score) {
      best = { post, score };
    }
  }

  return best?.post ?? null;
}

function summarizeScope(input: {
  regionLabel?: string | null;
  selectedTag?: string | null;
  selectedTopicSlugs?: string[];
  focusedCreatorName?: string | null;
}) {
  const bits: string[] = [];
  if (input.regionLabel) bits.push(input.regionLabel);
  if (input.selectedTag) bits.push(`#${input.selectedTag}`);
  if (input.selectedTopicSlugs && input.selectedTopicSlugs.length > 0) bits.push(input.selectedTopicSlugs.join(", "));
  if (input.focusedCreatorName) bits.push(input.focusedCreatorName);
  return bits.join(" · ");
}

export function buildAiItineraryDraft(input: {
  prompt: string;
  posts: HydratedPost[];
  countryCode?: string | null;
  regionLabel?: string | null;
  selectedTag?: string | null;
  selectedTopicSlugs?: string[];
  focusedCreatorName?: string | null;
  title?: string | null;
}) {
  const prompt = input.prompt.trim();
  const posts = input.posts.filter((post) => post.canAccess && post.isActive);

  if (!prompt) {
    return {
      title: input.title?.trim() || "AI trip draft",
      description: "Planner needs a short travel brief before it can build a route.",
      entries: [],
      warnings: ["Add a short brief for the AI planner."],
    } satisfies AiItineraryDraft;
  }

  if (posts.length === 0) {
    return {
      title: input.title?.trim() || "AI trip draft",
      description: "No eligible places were found in the current Explore subset.",
      entries: [],
      warnings: ["The current Explore scope has no unlocked active places to plan from."],
    } satisfies AiItineraryDraft;
  }

  const dayCount = inferDayCount(prompt);
  const dayBriefs = extractDayBriefs(prompt, dayCount);
  const usedPostIds = new Set<string>();
  const warnings: string[] = [];
  const entries: DraftEntry[] = [];

  dayBriefs.forEach((brief, dayIndex) => {
    const slots = inferDaySlots(brief, dayIndex);
    let previousStop: HydratedPost | null = null;

    slots.forEach((slot) => {
      const chosen = choosePostForSlot({
        slot,
        candidates: posts,
        usedPostIds,
        previousStop,
      });

      if (!chosen) {
        warnings.push(`No strong match found for ${slot.label} on Day ${dayIndex + 1}.`);
        return;
      }

      usedPostIds.add(chosen.id);
      previousStop = chosen;

      entries.push({
        postId: chosen.id,
        dayLabel: `Day ${dayIndex + 1}`,
        timeLabel: slot.timeLabel,
        note: `AI picked this as a ${slot.label} based on your brief and the current Explore scope.`,
        tags: ["ai-plan", slugify(slot.label), ...(chosen.tags.slice(0, 2).map((tag) => slugify(tag)).filter(Boolean))].slice(0, 4),
      });
    });
  });

  const missingUtilityHints = ["lidl", "shopping", "nakoup", "supermarket"].filter((keyword) => normalize(prompt).includes(keyword));
  if (missingUtilityHints.length > 0) {
    warnings.push("Your brief mentions a utility stop like shopping, but Followable places in the current scope may not include that stop yet.");
  }

  const title =
    input.title?.trim() ||
    `AI ${dayCount}-day trip${input.regionLabel ? ` · ${input.regionLabel}` : input.countryCode ? ` · ${input.countryCode}` : ""}`;

  const scope = summarizeScope({
    regionLabel: input.regionLabel,
    selectedTag: input.selectedTag,
    selectedTopicSlugs: input.selectedTopicSlugs,
    focusedCreatorName: input.focusedCreatorName,
  });

  return {
    title,
    description: `Generated from the current Explore subset${scope ? ` (${scope})` : ""}. Review and edit every stop before relying on it on the road.`,
    entries,
    warnings,
  } satisfies AiItineraryDraft;
}
