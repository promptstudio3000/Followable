"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createInitialLocalState,
  emptyLocalState,
  getViewer,
  hydratePosts,
  makeCreatedPostBundle,
  mergeSnapshot,
  searchSnapshot,
} from "@/lib/discovery";
import { sortItineraryEntries } from "@/lib/itinerary";
import { createItineraryShareSlug } from "@/lib/public-itinerary-share";
import { requestWalletConnection } from "@/lib/wallet-client";
import type {
  AppFeatureModes,
  AppSnapshot,
  DemoLocalState,
  GeocodeCandidate,
  HydratedPost,
  ItineraryShareMode,
  ReactionType,
  SearchResults,
  SeedData,
  UploadedMediaInput,
  User,
  UserCreatedTravelGroup,
  UserItinerary,
  VisibilityType,
  WalletConnection,
} from "@/lib/types";

const STORAGE_PREFIX = "followable-demo-state";

type DemoStoreContextValue = {
  viewerId: string | null;
  viewer: User | null;
  snapshot: AppSnapshot;
  hydratedPosts: HydratedPost[];
  localState: DemoLocalState;
  featureModes: AppFeatureModes;
  walletConnection: WalletConnection | null;
  search: (query: string) => SearchResults;
  geocode: (query: string) => Promise<GeocodeCandidate[]>;
  reverseGeocode: (latitude: number, longitude: number) => Promise<GeocodeCandidate | null>;
  uploadMedia: (files: FileList | File[]) => Promise<UploadedMediaInput[]>;
  refreshSnapshot: () => Promise<void>;
  toggleFollow: (userId: string) => Promise<void>;
  toggleSubscription: (creatorId: string) => void;
  toggleGroupMembership: (groupSlug: string) => void;
  createTravelGroup: (input: {
    name: string;
    description: string;
    shortDescription?: string;
    heroNote?: string;
    accessType: UserCreatedTravelGroup["accessType"];
    joinMode: UserCreatedTravelGroup["joinMode"];
    inviteCode?: string | null;
    password?: string | null;
    passwordHint?: string | null;
    questionnaire?: UserCreatedTravelGroup["questionnaire"];
    priceCzk?: number | null;
    perks?: string[];
    countryCodes: string[];
    topicSlugs: string[];
    searchTags?: string[];
    featuredPostIds?: string[];
  }) => string | null;
  createItinerary: (input: {
    title: string;
    description?: string;
    countryCode?: string | null;
    shareMode?: ItineraryShareMode;
  }) => string | null;
  addToItinerary: (input: {
    postId: string;
    itineraryId?: string | null;
    createTitle?: string | null;
    description?: string | null;
    countryCode?: string | null;
    dayLabel: string;
    timeLabel?: string | null;
    note?: string | null;
    tags?: string[];
  }) => string | null;
  updateItineraryEntry: (input: {
    itineraryId: string;
    entryId: string;
    dayLabel: string;
    timeLabel?: string | null;
    note?: string | null;
  }) => void;
  moveItineraryEntry: (itineraryId: string, entryId: string, direction: "up" | "down") => void;
  moveItineraryEntryToDayEdge: (itineraryId: string, entryId: string, dayLabel: string, edge: "start" | "end") => void;
  reorderItineraryEntry: (itineraryId: string, entryId: string, targetEntryId: string) => void;
  removeItineraryEntry: (itineraryId: string, entryId: string) => void;
  updateItinerarySharing: (itineraryId: string, shareMode: ItineraryShareMode) => void;
  toggleUnlock: (postId: string) => void;
  toggleReaction: (postId: string, type: ReactionType) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  addComment: (input: { postId: string; body: string; parentCommentId?: string | null }) => Promise<void>;
  createPost: (input: {
    title: string;
    body: string;
    teaser: string;
    topicId: string | null;
    visibilityType: VisibilityType;
    latitude: number;
    longitude: number;
    address: string;
    placeName: string;
    city: string;
    district: string;
    region: string;
    country: string;
    specialPrice?: number | null;
    tags: string[];
    visibilityStart?: string | null;
    visibilityEnd?: string | null;
    media?: UploadedMediaInput[];
  }) => Promise<string | null>;
  updateCreatedPost: (input: {
    postId: string;
    title: string;
    body: string;
    teaser: string;
    topicId: string | null;
    visibilityType: VisibilityType;
    latitude: number;
    longitude: number;
    address: string;
    placeName: string;
    city: string;
    district: string;
    region: string;
    country: string;
    specialPrice?: number | null;
    tags: string[];
    visibilityStart?: string | null;
    visibilityEnd?: string | null;
  }) => Promise<boolean>;
  sharePostToTravelGroup: (groupSlug: string, postId: string) => boolean;
  blockUser: (userId: string) => Promise<void>;
  reportTarget: (targetType: "post" | "user", targetId: string, reason: string) => Promise<void>;
  connectWallet: () => Promise<WalletConnection | null>;
  disconnectWallet: () => void;
  appendMediaToPost: (postId: string, files: FileList | File[]) => Promise<void>;
};

const DemoStoreContext = createContext<DemoStoreContextValue | null>(null);

function detectWalletProvider() {
  if (typeof window === "undefined") return null;

  const ethereum = window.ethereum;
  if (!ethereum) return null;

  if (ethereum.isMetaMask) return "metamask" as const;
  if (ethereum.isRabby) return "rabby" as const;
  return "injected" as const;
}

function rehydrateLocalState(
  snapshot: SeedData,
  viewerId: string | null,
  current: DemoLocalState,
  appMode: AppFeatureModes["appMode"],
) {
  const normalizeItineraryEntries = (entries: UserItinerary["entries"] | undefined | null) =>
    (entries ?? []).map((entry, index) => ({
      ...entry,
      sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : index,
    }));
  const base = viewerId ? createInitialLocalState(snapshot, viewerId) : emptyLocalState();
  const normalizeItineraries = (itineraries: UserItinerary[] | undefined | null) =>
    (itineraries ?? []).map((itinerary) => ({
      ...itinerary,
      shareMode: itinerary.shareMode ?? "private",
      shareSlug: itinerary.shareSlug || createItineraryShareSlug(itinerary.title, itinerary.id),
      entries: normalizeItineraryEntries(itinerary.entries),
    }));

    return {
      ...base,
      joinedGroupSlugs: current.joinedGroupSlugs ?? [],
      itineraries: normalizeItineraries(current.itineraries),
      createdTravelGroups: current.createdTravelGroups ?? [],
      createdComments: appMode === "demo" ? current.createdComments : [],
      createdPosts: appMode === "demo" ? current.createdPosts : [],
      appendedPostMedia: appMode === "demo" ? (current.appendedPostMedia ?? []) : [],
      reports: appMode === "demo" ? current.reports : [],
      walletConnection: current.walletConnection ?? null,
    };
}

export function DemoStoreProvider({
  viewerId,
  initialSnapshot,
  featureModes,
  children,
}: {
  viewerId: string | null;
  initialSnapshot: SeedData;
  featureModes: AppFeatureModes;
  children: ReactNode;
}) {
  const readStateForViewer = useCallback(
    (nextViewerId: string | null) => {
      if (!nextViewerId) {
        return emptyLocalState();
      }

      const fallback = createInitialLocalState(initialSnapshot, nextViewerId);

      if (typeof window === "undefined") {
        return fallback;
      }

      try {
        const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${nextViewerId}`);
        if (!raw) return fallback;

        const parsed = JSON.parse(raw) as DemoLocalState;
        const normalizeItineraryEntries = (entries: UserItinerary["entries"] | undefined | null) =>
          (entries ?? []).map((entry, index) => ({
            ...entry,
            sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : index,
          }));
        const normalizeItineraries = (itineraries: UserItinerary[] | undefined | null) =>
          (itineraries ?? []).map((itinerary) => ({
            ...itinerary,
            shareMode: itinerary.shareMode ?? "private",
            shareSlug: itinerary.shareSlug || createItineraryShareSlug(itinerary.title, itinerary.id),
            entries: normalizeItineraryEntries(itinerary.entries),
          }));
        if (featureModes.appMode === "database") {
          return {
            ...fallback,
            joinedGroupSlugs: parsed.joinedGroupSlugs ?? [],
            itineraries: normalizeItineraries(parsed.itineraries),
            createdTravelGroups: parsed.createdTravelGroups ?? [],
            walletConnection: parsed.walletConnection ?? null,
          };
        }

        return {
          ...fallback,
          ...parsed,
          joinedGroupSlugs: parsed.joinedGroupSlugs ?? [],
          itineraries: normalizeItineraries(parsed.itineraries),
          createdTravelGroups: parsed.createdTravelGroups ?? [],
          reactionByPostId: {
            ...fallback.reactionByPostId,
            ...(parsed.reactionByPostId ?? {}),
          },
          createdComments: parsed.createdComments ?? [],
          createdPosts: parsed.createdPosts ?? [],
          appendedPostMedia: parsed.appendedPostMedia ?? [],
          reports: parsed.reports ?? [],
          walletConnection: parsed.walletConnection ?? null,
        };
      } catch {
        return fallback;
      }
    },
    [featureModes.appMode, initialSnapshot],
  );

  const [baseSnapshot, setBaseSnapshot] = useState<SeedData>(initialSnapshot);
  const [localState, setLocalState] = useState<DemoLocalState>(() =>
    viewerId ? createInitialLocalState(initialSnapshot, viewerId) : emptyLocalState(),
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setBaseSnapshot(initialSnapshot);
    setLocalState((current) =>
      rehydrateLocalState(initialSnapshot, viewerId, current, featureModes.appMode),
    );
  }, [featureModes.appMode, initialSnapshot, viewerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLocalState(readStateForViewer(viewerId));
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [readStateForViewer, viewerId]);

  useEffect(() => {
    if (!viewerId || !isReady) return;
    window.localStorage.setItem(`${STORAGE_PREFIX}:${viewerId}`, JSON.stringify(localState));
  }, [isReady, localState, viewerId]);

  const snapshot = useMemo(
    () => mergeSnapshot(baseSnapshot, localState, viewerId),
    [baseSnapshot, localState, viewerId],
  );

  const hydratedPosts = useMemo(() => hydratePosts(snapshot, viewerId), [snapshot, viewerId]);
  const viewer = useMemo(() => getViewer(snapshot, viewerId), [snapshot, viewerId]);

  const updateState = useCallback((updater: (current: DemoLocalState) => DemoLocalState) => {
    setLocalState((current) => updater(current));
  }, []);

  const refreshSnapshot = useCallback(async () => {
    const response = await fetch("/api/bootstrap", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to refresh snapshot.");
    }

    const payload = (await response.json()) as {
      snapshot: SeedData;
    };

    setBaseSnapshot(payload.snapshot);
    setLocalState((current) =>
      rehydrateLocalState(payload.snapshot, viewerId, current, featureModes.appMode),
    );
  }, [featureModes.appMode, viewerId]);

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (!viewerId || viewerId === userId) return;

      if (featureModes.appMode === "database") {
        try {
          const response = await fetch("/api/follows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: userId }),
          });
          if (!response.ok) {
            throw new Error("Follow persistence failed.");
          }
          await refreshSnapshot();
          return;
        } catch (error) {
          console.warn("Falling back to local follow state.", error);
        }
      }

      updateState((current) => {
        const exists = current.followingIds.includes(userId);
        return {
          ...current,
          followingIds: exists
            ? current.followingIds.filter((entry) => entry !== userId)
            : [...current.followingIds, userId],
        };
      });
    },
    [featureModes.appMode, refreshSnapshot, updateState, viewerId],
  );

  const toggleSubscription = useCallback(
    (creatorId: string) => {
      if (!viewerId || viewerId === creatorId) return;
      updateState((current) => {
        const exists = current.subscriptionCreatorIds.includes(creatorId);
        return {
          ...current,
          subscriptionCreatorIds: exists
            ? current.subscriptionCreatorIds.filter((entry) => entry !== creatorId)
            : [...current.subscriptionCreatorIds, creatorId],
        };
      });
    },
    [updateState, viewerId],
  );

  const toggleGroupMembership = useCallback(
    (groupSlug: string) => {
      if (!viewerId || !groupSlug.trim()) return;
      updateState((current) => {
        const exists = current.joinedGroupSlugs.includes(groupSlug);
        return {
          ...current,
          joinedGroupSlugs: exists
            ? current.joinedGroupSlugs.filter((entry) => entry !== groupSlug)
            : [...current.joinedGroupSlugs, groupSlug],
        };
      });
    },
    [updateState, viewerId],
  );

  const createTravelGroup = useCallback(
    (input: {
      name: string;
      description: string;
      shortDescription?: string;
      heroNote?: string;
      accessType: UserCreatedTravelGroup["accessType"];
      joinMode: UserCreatedTravelGroup["joinMode"];
      inviteCode?: string | null;
      password?: string | null;
      passwordHint?: string | null;
      questionnaire?: UserCreatedTravelGroup["questionnaire"];
      priceCzk?: number | null;
      perks?: string[];
      countryCodes: string[];
      topicSlugs: string[];
      searchTags?: string[];
      featuredPostIds?: string[];
    }) => {
      if (!viewerId || !input.name.trim() || !input.description.trim()) return null;
      const slugBase = input.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const id = `local_group_${Date.now()}`;
      const slug = `${slugBase || "travel-group"}-${Date.now().toString().slice(-4)}`;
      const timestamp = new Date().toISOString();
      const nextGroup: UserCreatedTravelGroup = {
        id,
        slug,
        name: input.name.trim(),
        description: input.description.trim(),
        shortDescription: input.shortDescription?.trim() || input.description.trim().slice(0, 120),
        heroNote: input.heroNote?.trim() || "Created inside Followable as a focused travel community.",
        ownerUserId: viewerId,
        accessType: input.accessType,
        joinMode: input.joinMode,
        inviteCode: input.inviteCode?.trim() || null,
        password: input.password?.trim() || null,
        passwordHint: input.passwordHint?.trim() || null,
        questionnaire: input.questionnaire ?? null,
        priceCzk: input.accessType === "paid" ? input.priceCzk ?? null : null,
        perks: (input.perks ?? []).map((value) => value.trim()).filter(Boolean),
        countryCodes: input.countryCodes.map((code) => code.trim().toUpperCase()).filter(Boolean),
        topicSlugs: input.topicSlugs,
        searchTags: (input.searchTags ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean),
        memberUserIds: [viewerId],
        featuredPostIds: input.featuredPostIds ?? [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      updateState((current) => ({
        ...current,
        joinedGroupSlugs: current.joinedGroupSlugs.includes(nextGroup.slug)
          ? current.joinedGroupSlugs
          : [nextGroup.slug, ...current.joinedGroupSlugs],
        createdTravelGroups: [nextGroup, ...(current.createdTravelGroups ?? [])],
      }));
      return nextGroup.slug;
    },
    [updateState, viewerId],
  );

  const createItinerary = useCallback(
    (input: { title: string; description?: string; countryCode?: string | null; shareMode?: ItineraryShareMode }) => {
      if (!viewerId || !input.title.trim()) return null;
      const itineraryId = `local_itinerary_${Date.now()}`;
      const shareSlug = createItineraryShareSlug(input.title, itineraryId);
      const nextItinerary: UserItinerary = {
        id: itineraryId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        countryCode: input.countryCode ?? null,
        shareMode: input.shareMode ?? "private",
        shareSlug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entries: [],
      };
      updateState((current) => ({
        ...current,
        itineraries: [nextItinerary, ...(current.itineraries ?? [])],
      }));
      return itineraryId;
    },
    [updateState, viewerId],
  );

  const addToItinerary = useCallback(
    (input: {
      postId: string;
      itineraryId?: string | null;
      createTitle?: string | null;
      description?: string | null;
      countryCode?: string | null;
      dayLabel: string;
      timeLabel?: string | null;
      note?: string | null;
      tags?: string[];
    }) => {
      if (!viewerId || !input.postId || !input.dayLabel.trim()) return null;

      const ensuredItineraryId =
        input.itineraryId && input.itineraryId !== "__new__"
          ? input.itineraryId
          : createItinerary({
              title: input.createTitle?.trim() || "New trip",
              description: input.description ?? undefined,
              countryCode: input.countryCode ?? null,
            });

      if (!ensuredItineraryId) return null;

      const entryId = `local_itinerary_entry_${Date.now()}`;
      updateState((current) => ({
        ...current,
        itineraries: (current.itineraries ?? []).map((itinerary) =>
          itinerary.id !== ensuredItineraryId
            ? itinerary
            : {
                ...itinerary,
                updatedAt: new Date().toISOString(),
                entries: [
                  ...itinerary.entries,
                  {
                    id: entryId,
                    postId: input.postId,
                    dayLabel: input.dayLabel.trim(),
                    sortOrder: itinerary.entries.length,
                    timeLabel: input.timeLabel?.trim() || null,
                    note: input.note?.trim() || null,
                    tags: (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
                    createdAt: new Date().toISOString(),
                  },
                ],
              },
        ),
      }));

      return ensuredItineraryId;
    },
    [createItinerary, updateState, viewerId],
  );

  const updateItineraryEntry = useCallback(
    (input: {
      itineraryId: string;
      entryId: string;
      dayLabel: string;
      timeLabel?: string | null;
      note?: string | null;
    }) => {
      if (!input.dayLabel.trim()) return;
      updateState((current) => ({
        ...current,
        itineraries: (current.itineraries ?? []).map((itinerary) =>
          itinerary.id !== input.itineraryId
            ? itinerary
            : {
                ...itinerary,
                updatedAt: new Date().toISOString(),
                entries: itinerary.entries.map((entry) =>
                  entry.id !== input.entryId
                    ? entry
                    : {
                        ...entry,
                        dayLabel: input.dayLabel.trim(),
                        timeLabel: input.timeLabel?.trim() || null,
                        note: input.note?.trim() || null,
                      },
                ),
              },
        ),
      }));
    },
    [updateState],
  );

  const moveItineraryEntry = useCallback(
    (itineraryId: string, entryId: string, direction: "up" | "down") => {
      updateState((current) => ({
        ...current,
        itineraries: (current.itineraries ?? []).map((itinerary) => {
          if (itinerary.id !== itineraryId) return itinerary;

          const sortedEntries = sortItineraryEntries(itinerary.entries);
          const currentIndex = sortedEntries.findIndex((entry) => entry.id === entryId);
          if (currentIndex === -1) return itinerary;

          const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
          if (targetIndex < 0 || targetIndex >= sortedEntries.length) return itinerary;
          if (sortedEntries[targetIndex]?.dayLabel !== sortedEntries[currentIndex]?.dayLabel) return itinerary;

          const reordered = [...sortedEntries];
          const [movedEntry] = reordered.splice(currentIndex, 1);
          reordered.splice(targetIndex, 0, movedEntry);

          const nextOrderById = new Map(reordered.map((entry, index) => [entry.id, index]));
          return {
            ...itinerary,
            updatedAt: new Date().toISOString(),
            entries: itinerary.entries.map((entry) => ({
              ...entry,
              sortOrder: nextOrderById.get(entry.id) ?? entry.sortOrder,
            })),
          };
        }),
      }));
    },
    [updateState],
  );

  const reorderItineraryEntry = useCallback(
    (itineraryId: string, entryId: string, targetEntryId: string) => {
      if (entryId === targetEntryId) return;

      updateState((current) => ({
        ...current,
        itineraries: (current.itineraries ?? []).map((itinerary) => {
          if (itinerary.id !== itineraryId) return itinerary;

          const sortedEntries = sortItineraryEntries(itinerary.entries);
          const sourceIndex = sortedEntries.findIndex((entry) => entry.id === entryId);
          const targetIndex = sortedEntries.findIndex((entry) => entry.id === targetEntryId);

          if (sourceIndex === -1 || targetIndex === -1) return itinerary;
          if (sortedEntries[sourceIndex]?.dayLabel !== sortedEntries[targetIndex]?.dayLabel) return itinerary;

          const reordered = [...sortedEntries];
          const [movedEntry] = reordered.splice(sourceIndex, 1);
          const targetIndexAfterRemoval = reordered.findIndex((entry) => entry.id === targetEntryId);
          if (targetIndexAfterRemoval === -1) return itinerary;

          reordered.splice(targetIndexAfterRemoval, 0, movedEntry);

          const nextOrderById = new Map(reordered.map((entry, index) => [entry.id, index]));
          return {
            ...itinerary,
            updatedAt: new Date().toISOString(),
            entries: itinerary.entries.map((entry) => ({
              ...entry,
              sortOrder: nextOrderById.get(entry.id) ?? entry.sortOrder,
            })),
          };
        }),
      }));
    },
    [updateState],
  );

  const moveItineraryEntryToDayEdge = useCallback(
    (itineraryId: string, entryId: string, dayLabel: string, edge: "start" | "end") => {
      updateState((current) => ({
        ...current,
        itineraries: (current.itineraries ?? []).map((itinerary) => {
          if (itinerary.id !== itineraryId) return itinerary;

          const sortedEntries = sortItineraryEntries(itinerary.entries);
          const sourceIndex = sortedEntries.findIndex((entry) => entry.id === entryId);
          if (sourceIndex === -1) return itinerary;
          if (sortedEntries[sourceIndex]?.dayLabel !== dayLabel) return itinerary;

          const sameDayEntries = sortedEntries.filter((entry) => entry.dayLabel === dayLabel);
          if (sameDayEntries.length < 2) return itinerary;

          const reordered = [...sortedEntries];
          const [movedEntry] = reordered.splice(sourceIndex, 1);
          const dayIndexesAfterRemoval = reordered
            .map((entry, index) => (entry.dayLabel === dayLabel ? index : -1))
            .filter((index) => index >= 0);

          if (dayIndexesAfterRemoval.length === 0) return itinerary;

          const insertionIndex =
            edge === "start"
              ? dayIndexesAfterRemoval[0]
              : dayIndexesAfterRemoval[dayIndexesAfterRemoval.length - 1] + 1;

          reordered.splice(insertionIndex, 0, movedEntry);

          const nextOrderById = new Map(reordered.map((entry, index) => [entry.id, index]));
          return {
            ...itinerary,
            updatedAt: new Date().toISOString(),
            entries: itinerary.entries.map((entry) => ({
              ...entry,
              sortOrder: nextOrderById.get(entry.id) ?? entry.sortOrder,
            })),
          };
        }),
      }));
    },
    [updateState],
  );

  const removeItineraryEntry = useCallback(
    (itineraryId: string, entryId: string) => {
      updateState((current) => ({
        ...current,
        itineraries: (current.itineraries ?? []).map((itinerary) =>
          itinerary.id !== itineraryId
            ? itinerary
            : {
                ...itinerary,
                updatedAt: new Date().toISOString(),
                entries: itinerary.entries.filter((entry) => entry.id !== entryId),
              },
        ),
      }));
    },
    [updateState],
  );

  const updateItinerarySharing = useCallback(
    (itineraryId: string, shareMode: ItineraryShareMode) => {
      updateState((current) => ({
        ...current,
        itineraries: (current.itineraries ?? []).map((itinerary) =>
          itinerary.id !== itineraryId
            ? itinerary
            : {
                ...itinerary,
                shareMode,
                shareSlug: itinerary.shareSlug || createItineraryShareSlug(itinerary.title, itinerary.id),
                updatedAt: new Date().toISOString(),
              },
        ),
      }));
    },
    [updateState],
  );

  const toggleUnlock = useCallback(
    (postId: string) => {
      if (!viewerId) return;
      updateState((current) => ({
        ...current,
        unlockedPostIds: current.unlockedPostIds.includes(postId)
          ? current.unlockedPostIds
          : [...current.unlockedPostIds, postId],
      }));
    },
    [updateState, viewerId],
  );

  const toggleReaction = useCallback(
    async (postId: string, type: ReactionType) => {
      if (!viewerId) return;

      if (featureModes.appMode === "database") {
        try {
          const response = await fetch("/api/reactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId, type }),
          });

          if (!response.ok) {
            throw new Error("Reaction persistence failed.");
          }

          await refreshSnapshot();
          return;
        } catch (error) {
          console.warn("Falling back to local reactions.", error);
        }
      }

      updateState((current) => {
        const reactionByPostId = { ...current.reactionByPostId };
        if (reactionByPostId[postId] === type) {
          delete reactionByPostId[postId];
        } else {
          reactionByPostId[postId] = type;
        }

        return {
          ...current,
          reactionByPostId,
        };
      });
    },
    [featureModes.appMode, refreshSnapshot, updateState, viewerId],
  );

  const toggleSave = useCallback(
    async (postId: string) => {
      if (!viewerId) return;

      if (featureModes.appMode === "database") {
        try {
          const response = await fetch("/api/saves", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId }),
          });

          if (!response.ok) {
            throw new Error("Save persistence failed.");
          }

          await refreshSnapshot();
          return;
        } catch (error) {
          console.warn("Falling back to local saves.", error);
        }
      }

      updateState((current) => ({
        ...current,
        savedPostIds: current.savedPostIds.includes(postId)
          ? current.savedPostIds.filter((entry) => entry !== postId)
          : [...current.savedPostIds, postId],
      }));
    },
    [featureModes.appMode, refreshSnapshot, updateState, viewerId],
  );

  const geocode = useCallback(async (query: string) => {
    if (!query.trim()) return [];
    const response = await fetch(`/api/geocode?query=${encodeURIComponent(query.trim())}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { results?: GeocodeCandidate[] };
    return payload.results ?? [];
  }, []);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: GeocodeCandidate | null };
    return payload.result ?? null;
  }, []);

  const uploadMedia = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return [];

    const formData = new FormData();
    fileArray.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed.");
    }

    const payload = (await response.json()) as { files?: UploadedMediaInput[] };
    return payload.files ?? [];
  }, []);

  const appendMediaToPost = useCallback(
    async (postId: string, files: FileList | File[]) => {
      if (!viewerId || featureModes.appMode !== "demo") return;
      const post = baseSnapshot.posts.find((p) => p.id === postId);
      if (!post || post.authorId !== viewerId) return;
      const uploaded = await uploadMedia(files);
      if (uploaded.length === 0) return;
      const ts = Date.now();
      const newItems = uploaded.map((u, i) => ({
        id: `local_append_${postId}_${ts}_${i}`,
        postId,
        type: u.type,
        url: u.url,
        alt: u.alt ?? `Upload ${i + 1}`,
        order: 500 + i,
        blurDataUrl: u.blurDataUrl ?? null,
      }));
      updateState((current) => ({
        ...current,
        appendedPostMedia: [...(current.appendedPostMedia ?? []), ...newItems],
      }));
    },
    [baseSnapshot.posts, featureModes.appMode, updateState, uploadMedia, viewerId],
  );

  const addComment = useCallback(
    async (input: { postId: string; body: string; parentCommentId?: string | null }) => {
      if (!viewerId || !input.body.trim()) return;
      const nextComment = {
        id: `local_comment_${Date.now()}`,
        postId: input.postId,
        authorId: viewerId,
        parentCommentId: input.parentCommentId ?? null,
        body: input.body.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (featureModes.appMode === "database") {
        try {
          const response = await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });

          if (!response.ok) {
            throw new Error("Comment persistence failed.");
          }
          await refreshSnapshot();
          return;
        } catch (error) {
          console.warn("Falling back to local comment storage.", error);
        }
      }

      updateState((current) => ({
        ...current,
        createdComments: [...current.createdComments, nextComment],
      }));
    },
    [featureModes.appMode, refreshSnapshot, updateState, viewerId],
  );

  const createPost = useCallback(
    async (input: {
      title: string;
      body: string;
      teaser: string;
      topicId: string | null;
      visibilityType: VisibilityType;
      latitude: number;
      longitude: number;
      address: string;
      placeName: string;
      placeId?: string | null;
      placeKey?: string | null;
      city: string;
      district: string;
      region: string;
      country: string;
      specialPrice?: number | null;
      tags: string[];
      visibilityStart?: string | null;
      visibilityEnd?: string | null;
      media?: UploadedMediaInput[];
    }) => {
      if (!viewerId) return null;

      if (featureModes.appMode === "database") {
        try {
          const response = await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (!response.ok) {
            throw new Error("Post persistence failed.");
          }
          const payload = (await response.json()) as { bundle: ReturnType<typeof makeCreatedPostBundle> };
          await refreshSnapshot();
          return payload.bundle.post.id;
        } catch (error) {
          console.warn("Falling back to local post creation.", error);
        }
      }

      const bundle = makeCreatedPostBundle({ ...input, viewerId });
      updateState((current) => ({
        ...current,
        createdPosts: [bundle, ...current.createdPosts],
      }));
      return bundle.post.id;
    },
    [featureModes.appMode, refreshSnapshot, updateState, viewerId],
  );

  const updateCreatedPost = useCallback(
    async (input: {
      postId: string;
      title: string;
      body: string;
      teaser: string;
      topicId: string | null;
      visibilityType: VisibilityType;
      latitude: number;
      longitude: number;
      address: string;
      placeName: string;
      city: string;
      district: string;
      region: string;
      country: string;
      specialPrice?: number | null;
      tags: string[];
      visibilityStart?: string | null;
      visibilityEnd?: string | null;
    }) => {
      if (!viewerId || featureModes.appMode !== "demo") return false;

      let didUpdate = false;
      updateState((current) => ({
        ...current,
        createdPosts: current.createdPosts.map((bundle) => {
          if (bundle.post.id !== input.postId) return bundle;
          if (bundle.post.authorId !== viewerId) return bundle;

          didUpdate = true;
          const nowIso = new Date().toISOString();
          return {
            ...bundle,
            location: {
              ...bundle.location,
              latitude: input.latitude,
              longitude: input.longitude,
              address: input.address || null,
              placeName: input.placeName || null,
              city: input.city || null,
              district: input.district || null,
              region: input.region || null,
              country: input.country || null,
              geokey: `${input.latitude.toFixed(3)}:${input.longitude.toFixed(3)}`,
              updatedAt: nowIso,
            },
            post: {
              ...bundle.post,
              title: input.title,
              body: input.body,
              teaser: input.teaser,
              topicId: input.topicId,
              visibilityType: input.visibilityType,
              visibilityStart: input.visibilityStart || null,
              visibilityEnd: input.visibilityEnd || null,
              specialPrice: input.visibilityType === "special_hidden_place" ? input.specialPrice ?? 149 : null,
              currency: input.visibilityType === "special_hidden_place" ? "CZK" : null,
              updatedAt: nowIso,
            },
            tags: input.tags.map((tag, index) => ({
              id: bundle.tags[index]?.id ?? `local_tag_${bundle.post.id}_${index + 1}`,
              postId: bundle.post.id,
              tag,
            })),
          };
        }),
      }));

      return didUpdate;
    },
    [featureModes.appMode, updateState, viewerId],
  );

  const sharePostToTravelGroup = useCallback(
    (groupSlug: string, postId: string) => {
      if (!viewerId || !groupSlug.trim() || !postId.trim()) return false;

      let didUpdate = false;
      updateState((current) => ({
        ...current,
        createdTravelGroups: (current.createdTravelGroups ?? []).map((group) => {
          if (group.slug !== groupSlug) return group;

          const canShare = group.ownerUserId === viewerId || group.memberUserIds.includes(viewerId);
          if (!canShare) return group;
          if (group.featuredPostIds.includes(postId)) return group;

          didUpdate = true;
          return {
            ...group,
            featuredPostIds: [...group.featuredPostIds, postId],
            updatedAt: new Date().toISOString(),
          };
        }),
      }));

      return didUpdate;
    },
    [updateState, viewerId],
  );

  const blockUser = useCallback(
    async (userId: string) => {
      if (!viewerId || viewerId === userId) return;

      if (featureModes.appMode === "database") {
        try {
          const response = await fetch("/api/blocks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: userId }),
          });

          if (!response.ok) {
            throw new Error("Block persistence failed.");
          }

          await refreshSnapshot();
          return;
        } catch (error) {
          console.warn("Falling back to local block state.", error);
        }
      }

      updateState((current) => ({
        ...current,
        blockedUserIds: current.blockedUserIds.includes(userId)
          ? current.blockedUserIds
          : [...current.blockedUserIds, userId],
      }));
    },
    [featureModes.appMode, refreshSnapshot, updateState, viewerId],
  );

  const reportTarget = useCallback(
    async (targetType: "post" | "user", targetId: string, reason: string) => {
      if (!viewerId || !reason.trim()) return;

      if (featureModes.appMode === "database") {
        try {
          const response = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetType,
              targetId,
              reason: reason.trim(),
            }),
          });

          if (!response.ok) {
            throw new Error("Report persistence failed.");
          }

          await refreshSnapshot();
          return;
        } catch (error) {
          console.warn("Falling back to local reports.", error);
        }
      }

      updateState((current) => ({
        ...current,
        reports: [
          ...current.reports,
          {
            id: `local_report_${Date.now()}`,
            reporterId: viewerId,
            targetType,
            targetId,
            reason: reason.trim(),
            status: "open",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }));
    },
    [featureModes.appMode, refreshSnapshot, updateState, viewerId],
  );

  const connectWallet = useCallback(async () => {
    const providerType = detectWalletProvider();
    if (!providerType || !window.ethereum) return null;

    const walletConnection = await requestWalletConnection();

    updateState((current) => ({
      ...current,
      walletConnection,
    }));

    return walletConnection;
  }, [updateState]);

  const disconnectWallet = useCallback(() => {
    updateState((current) => ({
      ...current,
      walletConnection: null,
    }));
  }, [updateState]);

  const value = useMemo<DemoStoreContextValue>(
    () => ({
      viewerId,
      viewer,
      snapshot,
      hydratedPosts,
      localState,
      featureModes,
      walletConnection: localState.walletConnection ?? null,
      search: (query: string) => searchSnapshot(snapshot, viewerId, query, localState),
      geocode,
      reverseGeocode,
      uploadMedia,
      refreshSnapshot,
      toggleFollow,
      toggleSubscription,
      toggleGroupMembership,
      createTravelGroup,
      createItinerary,
      addToItinerary,
      updateItineraryEntry,
      moveItineraryEntry,
      moveItineraryEntryToDayEdge,
      reorderItineraryEntry,
      removeItineraryEntry,
      updateItinerarySharing,
      toggleUnlock,
      toggleReaction,
      toggleSave,
      addComment,
      createPost,
      updateCreatedPost,
      sharePostToTravelGroup,
      blockUser,
      reportTarget,
      connectWallet,
      disconnectWallet,
      appendMediaToPost,
    }),
    [
      addComment,
      appendMediaToPost,
      blockUser,
      addToItinerary,
      connectWallet,
      createTravelGroup,
      createItinerary,
      moveItineraryEntry,
      moveItineraryEntryToDayEdge,
      reorderItineraryEntry,
      updateItineraryEntry,
      updateItinerarySharing,
      createPost,
      updateCreatedPost,
      disconnectWallet,
      featureModes,
      geocode,
      hydratedPosts,
      localState,
      refreshSnapshot,
      reportTarget,
      removeItineraryEntry,
      reverseGeocode,
      snapshot,
      sharePostToTravelGroup,
      toggleFollow,
      toggleGroupMembership,
      toggleReaction,
      toggleSave,
      toggleSubscription,
      toggleUnlock,
      uploadMedia,
      viewer,
      viewerId,
    ],
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore() {
  const context = useContext(DemoStoreContext);
  if (!context) {
    throw new Error("useDemoStore must be used within DemoStoreProvider");
  }
  return context;
}
