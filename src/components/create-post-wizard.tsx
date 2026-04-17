"use client";

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from "@/components/icons";
import { MapView } from "@/components/map-view";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { ResponsiveMedia } from "@/components/responsive-media";
import type { GeocodeCandidate, UploadedMediaInput, VisibilityType } from "@/lib/types";
import { createPostSchema } from "@/lib/validation";
import { cn, formatMoney } from "@/lib/utils";

const steps = [
  { label: "Location", hint: "Set the exact point" },
  { label: "Content", hint: "Title, teaser, topic" },
  { label: "Media", hint: "Photo or upload" },
] as const;

type ComposerMode = "quick" | "full";

export function CreatePostWizard() {
  const router = useRouter();
  const { snapshot, viewerId, createPost, geocode, reverseGeocode, uploadMedia, featureModes } = useDemoStore();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [composerMode, setComposerMode] = useState<ComposerMode>("quick");
  const [stepIndex, setStepIndex] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationResults, setLocationResults] = useState<GeocodeCandidate[]>([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMediaInput[]>([]);
  const [locationDetailsExpanded, setLocationDetailsExpanded] = useState(false);
  const [accessExpanded, setAccessExpanded] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [mapCenter, setMapCenter] = useState({ latitude: 49.7475, longitude: 13.3776 });
  const [form, setForm] = useState({
    placeName: "",
    address: "",
    city: "Plzen",
    district: "Plzen-mesto",
    region: "Plzensky kraj",
    country: "CZ",
    latitude: 49.7475,
    longitude: 13.3776,
    title: "",
    body: "",
    topicId: snapshot.topics[0]?.id ?? "",
    collectionId: "",
    visibilityType: "public" as VisibilityType,
    specialPrice: 149,
    visibilityStart: "",
    visibilityEnd: "",
  });

  useEffect(() => {
    if (!locationQuery.trim() || locationQuery.trim().length < 2) {
      setLocationResults([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const results = await geocode(locationQuery);
        if (!cancelled) {
          setLocationResults(results);
        }
      } catch {
        if (!cancelled) {
          setLocationResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearchingLocation(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [geocode, locationQuery]);

  const viewerCollections = useMemo(
    () => snapshot.collections.filter((collection) => collection.ownerId === viewerId),
    [snapshot.collections, viewerId],
  );

  const selectedTopic = useMemo(
    () => snapshot.topics.find((topic) => topic.id === form.topicId) ?? null,
    [form.topicId, snapshot.topics],
  );

  const selectedCollection = useMemo(
    () => viewerCollections.find((collection) => collection.id === form.collectionId) ?? null,
    [form.collectionId, viewerCollections],
  );

  const generatedQuickTitle = useMemo(() => {
    if (form.title.trim()) return form.title.trim();
    const locationAnchor = form.placeName.trim() || form.city.trim() || form.region.trim() || "Pinned place";
    const prefix = selectedTopic?.name ? `${selectedTopic.name}: ` : "Quick note: ";
    return `${prefix}${locationAnchor}`.slice(0, 120);
  }, [form.city, form.placeName, form.region, form.title, selectedTopic?.name]);

  const teaserText = useMemo(() => form.body.trim().slice(0, 220), [form.body]);
  const derivedTags = useMemo(() => {
    const fromTopic = selectedTopic?.slug?.trim();
    const fromTitle = (form.title.trim() || generatedQuickTitle)
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((part) => part.length >= 4)
      .slice(0, 2);
    return [fromTopic, ...fromTitle, "place"].filter(Boolean).slice(0, 8) as string[];
  }, [form.title, generatedQuickTitle, selectedTopic?.slug]);

  const exactLocationReady = Number.isFinite(form.latitude) && Number.isFinite(form.longitude);
  const locationReady = exactLocationReady && Boolean(form.city.trim() && form.region.trim() && form.country.trim());
  const fullContentReady = Boolean(form.title.trim().length >= 3 && form.body.trim().length >= 20);
  const quickContentReady = Boolean(form.body.trim().length >= 20);
  const contentReady = composerMode === "quick" ? quickContentReady : fullContentReady;
  const canContinue = stepIndex === 0 ? locationReady : stepIndex === 1 ? contentReady : true;
  const canPublish = locationReady && contentReady && !isUploadingMedia;

  const applyLocationCandidate = (candidate: GeocodeCandidate) => {
    setForm((current) => ({
      ...current,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      address: candidate.address ?? current.address,
      placeName: candidate.placeName ?? candidate.label,
      city: candidate.city ?? current.city,
      district: candidate.district ?? current.district,
      region: candidate.region ?? current.region,
      country: candidate.country ?? current.country,
    }));
    setMapCenter({ latitude: candidate.latitude, longitude: candidate.longitude });
    setLocationQuery(candidate.label);
    setLocationResults([]);
    setLocationError(null);
  };

  const handlePointSelect = async (point: { latitude: number; longitude: number }) => {
    setForm((current) => ({
      ...current,
      latitude: point.latitude,
      longitude: point.longitude,
    }));
    setMapCenter(point);
    setLocationError(null);

    try {
      const result = await reverseGeocode(point.latitude, point.longitude);
      if (result) {
        applyLocationCandidate(result);
      }
    } catch {
      setLocationError("Point selected, but reverse geocoding could not fill the place details.");
    }
  };

  const handleUseCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("This browser cannot access your location.");
      return;
    }

    setIsLocatingUser(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setMapCenter(point);
        try {
          await handlePointSelect(point);
        } finally {
          setIsLocatingUser(false);
        }
      },
      () => {
        setLocationError("Location access was denied or unavailable.");
        setIsLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const handleMediaSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingMedia(true);
    setUploadError(null);
    try {
      const remainingSlots = Math.max(0, 6 - uploadedMedia.length);
      if (remainingSlots === 0) {
        setUploadError("You can upload up to 6 files.");
        return;
      }
      const nextMedia = await uploadMedia(files);
      setUploadedMedia((current) => [...current, ...nextMedia.slice(0, remainingSlots)]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleInputFiles = (event: ChangeEvent<HTMLInputElement>) => {
    void handleMediaSelection(event.target.files);
    event.target.value = "";
  };

  const removeMedia = (index: number) => {
    setUploadedMedia((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const publish = async (mode: ComposerMode = composerMode) => {
    if (!viewerId) {
      router.push("/sign-in?next=/create");
      return;
    }

    const normalizedTitle = mode === "quick" ? generatedQuickTitle : form.title.trim();

    const parsed = createPostSchema.safeParse({
      title: normalizedTitle,
      body: form.body.trim(),
      teaser: teaserText || null,
      topicId: form.topicId || null,
      visibilityType: form.visibilityType,
      latitude: form.latitude,
      longitude: form.longitude,
      address: form.address.trim() || null,
      placeName: form.placeName.trim() || null,
      city: form.city.trim(),
      district: form.district.trim() || null,
      region: form.region.trim(),
      country: form.country.trim(),
      specialPrice: form.visibilityType === "special_hidden_place" ? form.specialPrice : null,
      tags: derivedTags,
      visibilityStart: form.visibilityStart ? new Date(form.visibilityStart).toISOString() : null,
      visibilityEnd: form.visibilityEnd ? new Date(form.visibilityEnd).toISOString() : null,
      media: uploadedMedia,
    });

    if (!parsed.success) {
      setAccessExpanded(true);
      setReviewExpanded(true);
      window.alert(parsed.error.issues[0]?.message ?? "Please fix the post form.");
      return;
    }

    setIsPublishing(true);
    try {
      const postId = await createPost({
        ...parsed.data,
        teaser: parsed.data.teaser ?? "",
        address: parsed.data.address ?? "",
        placeName: parsed.data.placeName ?? "",
        city: parsed.data.city,
        district: parsed.data.district ?? "",
        region: parsed.data.region,
        country: parsed.data.country,
        media: parsed.data.media ?? [],
      });

      if (postId) {
        router.push(`/post/${postId}`);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const accessSummary =
    form.visibilityType === "special_hidden_place"
      ? `${humanizeVisibility(form.visibilityType)} · ${formatMoney(form.specialPrice, "CZK")}`
      : humanizeVisibility(form.visibilityType);

  const reviewSummary = [(composerMode === "quick" ? generatedQuickTitle : form.title.trim()) || "Untitled", uploadedMedia.length > 0 ? `${uploadedMedia.length} media` : "No media yet"].join(
    " · ",
  );

  return (
    <div className="space-y-5 pb-32 lg:pb-8">
      <section className="rounded-3xl border border-stone-200 bg-[linear-gradient(140deg,#fffdfa_0%,#ffffff_38%,#f4efe4_100%)] p-5 shadow-[0_20px_60px_rgba(27,24,19,0.08)] sm:p-6">
        <div className="text-sm font-medium text-stone-500">Create post</div>
        <h1 className="mt-3 max-w-4xl font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
          Start with the place, keep the rest simple.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
          Set the location first, add a title and a short teaser, then attach media. Access and review stay tucked away until you need them.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {([
            {
              value: "quick" as const,
              label: "Quick post",
              copy: "One-screen note with map, media, and instant publish.",
            },
            {
              value: "full" as const,
              label: "Full place post",
              copy: "The existing structured flow for precise place publishing.",
            },
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setComposerMode(option.value)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition",
                composerMode === option.value
                  ? "border-stone-950 bg-stone-950 text-white"
                  : "border-stone-200 bg-white/80 text-stone-700",
              )}
            >
              <div className="text-sm font-semibold">{option.label}</div>
              <div className="mt-1 text-xs opacity-80">{option.copy}</div>
            </button>
          ))}
        </div>
        {composerMode === "full" ? (
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {steps.map((step, index) => (
              <button
                key={step.label}
                type="button"
                onClick={() => setStepIndex(index)}
                className={cn(
                  "min-h-16 rounded-2xl border px-3 py-3 text-left transition sm:min-h-20 sm:px-4 sm:py-4",
                  index === stepIndex
                    ? "border-stone-950 bg-stone-950 text-white"
                    : index < stepIndex
                      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                      : "border-stone-200 bg-stone-50 text-stone-600",
                )}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] sm:text-xs">Step {index + 1}</div>
                <div className="mt-1.5 text-sm font-semibold sm:mt-2 sm:text-base">{step.label}</div>
                <div className="mt-1 text-xs opacity-80">{step.hint}</div>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {composerMode === "quick" ? (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_340px]">
            <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4 shadow-sm backdrop-blur-md sm:p-6">
              <div className="space-y-5">
                <SectionTitle icon={CheckCircle2} title="Quick post" />
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 text-sm leading-6 text-stone-600">
                  Use this when the place is already clear and you mainly want to capture a useful note, a photo, and the exact pin without stepping through the full wizard.
                </div>

                <TextArea
                  label="Quick note"
                  value={form.body}
                  placeholder="What should someone know about this place right now? Timing, vibe, access, or why it matters."
                  onChange={(value) => setForm((current) => ({ ...current, body: value }))}
                />
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>The quick composer still expects one substantial note so the feed stays useful.</span>
                  <span>{form.body.trim().length}/20 min</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Title (optional)"
                    value={form.title}
                    placeholder={generatedQuickTitle}
                    onChange={(value) => setForm((current) => ({ ...current, title: value }))}
                  />
                  <SelectField
                    label="Topic"
                    value={form.topicId}
                    onChange={(value) => setForm((current) => ({ ...current, topicId: value }))}
                    options={snapshot.topics.map((topic) => ({
                      value: topic.id,
                      label: topic.name,
                    }))}
                    placeholder="No topic"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Collection (optional)"
                    value={form.collectionId}
                    onChange={(value) => setForm((current) => ({ ...current, collectionId: value }))}
                    options={viewerCollections.map((collection) => ({
                      value: collection.id,
                      label: collection.title,
                    }))}
                    placeholder={viewerCollections.length > 0 ? "Leave outside collections" : "No collections yet"}
                  />
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Generated title</div>
                    <div className="mt-1 font-medium text-stone-900">{generatedQuickTitle}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <label className="block space-y-2 text-sm font-medium text-stone-700">
                    <span>Search place or address</span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      <input
                        value={locationQuery}
                        onChange={(event) => setLocationQuery(event.target.value)}
                        placeholder="Search a place, address, trailhead, campsite..."
                        className="h-13 w-full rounded-2xl border border-[color:var(--glass-border)] bg-white px-11 py-3 text-sm outline-none"
                      />
                    </div>
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="inline-flex min-h-12 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
                    >
                      {isLocatingUser ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                      Use my location
                    </button>
                    <div className="inline-flex min-h-12 items-center rounded-full border border-dashed border-stone-200 px-4 py-2 text-sm text-stone-500">
                      Or drag the pin on the map below
                    </div>
                  </div>
                  {isSearchingLocation ? (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
                      <LoaderCircle className="h-4 w-4 animate-spin" /> Looking up places...
                    </div>
                  ) : null}
                  {locationResults.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {locationResults.map((candidate, index) => (
                        <button
                          key={`${candidate.label}-${index}`}
                          type="button"
                          onClick={() => applyLocationCandidate(candidate)}
                          className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm transition hover:border-stone-900 hover:bg-stone-50"
                        >
                          <div className="font-medium text-stone-900">{candidate.label}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{candidate.source}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="overflow-hidden rounded-3xl">
                  <MapView
                    posts={[]}
                    selectable
                    showGeolocateWhenSelectable
                    selectedPoint={{ latitude: form.latitude, longitude: form.longitude }}
                    onSelectPoint={handlePointSelect}
                    center={mapCenter}
                    className="h-[40vh] min-h-[320px] sm:min-h-[380px]"
                  />
                </div>

                {locationError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{locationError}</div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Place name"
                    value={form.placeName}
                    placeholder="A short human-readable place label"
                    onChange={(value) => setForm((current) => ({ ...current, placeName: value }))}
                  />
                  <Field
                    label="Address"
                    value={form.address}
                    placeholder="Street, number, landmark, or leave blank"
                    onChange={(value) => setForm((current) => ({ ...current, address: value }))}
                  />
                  <Field
                    label="City"
                    value={form.city}
                    placeholder="Required"
                    onChange={(value) => setForm((current) => ({ ...current, city: value }))}
                  />
                </div>

                <AccordionSection
                  title="Precise location details"
                  summary={`${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`}
                  expanded={locationDetailsExpanded}
                  onToggle={() => setLocationDetailsExpanded((current) => !current)}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="District / county"
                      value={form.district}
                      onChange={(value) => setForm((current) => ({ ...current, district: value }))}
                    />
                    <Field
                      label="Region / state"
                      value={form.region}
                      onChange={(value) => setForm((current) => ({ ...current, region: value }))}
                    />
                    <Field
                      label="Country"
                      value={form.country}
                      onChange={(value) => setForm((current) => ({ ...current, country: value }))}
                    />
                    <NumberField
                      label="Latitude"
                      value={form.latitude}
                      onChange={(value) => {
                        setForm((current) => ({ ...current, latitude: value }));
                        setMapCenter((current) => ({ ...current, latitude: value }));
                      }}
                    />
                    <NumberField
                      label="Longitude"
                      value={form.longitude}
                      onChange={(value) => {
                        setForm((current) => ({ ...current, longitude: value }));
                        setMapCenter((current) => ({ ...current, longitude: value }));
                      }}
                    />
                  </div>
                </AccordionSection>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-stone-900">Media staging</div>
                      <div className="mt-1 text-sm text-stone-500">
                        Add one or more files without leaving the quick composer.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Take photo
                      </button>
                      <button
                        type="button"
                        onClick={() => uploadInputRef.current?.click()}
                        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
                      >
                        {isUploadingMedia ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        Upload files
                      </button>
                    </div>
                  </div>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleInputFiles}
                  />
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleInputFiles}
                  />

                  {uploadError ? <div className="mt-3 text-sm text-rose-700">{uploadError}</div> : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {uploadedMedia.length === 0 ? (
                      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white text-sm text-stone-500">
                        <div className="flex items-center gap-2">
                          <ImagePlus className="h-4 w-4" /> No media uploaded yet
                        </div>
                      </div>
                    ) : (
                      uploadedMedia.map((media, index) => (
                        <div
                          key={`${media.url}-${index}`}
                          className="overflow-hidden rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)]"
                        >
                          <div className="relative h-48">
                            <button
                              type="button"
                              onClick={() => removeMedia(index)}
                              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-950/80 text-white backdrop-blur"
                              aria-label={`Remove media ${index + 1}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <ResponsiveMedia
                              media={media}
                              alt={media.alt || `Uploaded media ${index + 1}`}
                              fill
                              controls
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <AccordionSection
                  title="Access settings"
                  summary={accessSummary}
                  icon={ShieldCheck}
                  expanded={accessExpanded}
                  onToggle={() => setAccessExpanded((current) => !current)}
                >
                  <div className="grid gap-3">
                    {(["public", "subscriber_only", "special_hidden_place"] as VisibilityType[]).map((visibility) => (
                      <button
                        key={visibility}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, visibilityType: visibility }))}
                        className={cn(
                          "min-h-14 rounded-2xl border px-4 py-4 text-left transition",
                          form.visibilityType === visibility
                            ? "border-stone-950 bg-stone-950 text-white"
                            : "border-stone-200 bg-stone-50 text-stone-700",
                        )}
                      >
                        <div className="font-medium">{humanizeVisibility(visibility)}</div>
                        <div className="mt-1 text-sm opacity-80">{visibilityDescription(visibility)}</div>
                      </button>
                    ))}
                  </div>
                  {form.visibilityType === "special_hidden_place" ? (
                    <div className="mt-4">
                      <NumberField
                        label="Special unlock price (CZK)"
                        value={form.specialPrice}
                        onChange={(value) => setForm((current) => ({ ...current, specialPrice: value }))}
                      />
                    </div>
                  ) : null}
                </AccordionSection>

                <AccordionSection
                  title="Review before publish"
                  summary={reviewSummary}
                  icon={CheckCircle2}
                  expanded={reviewExpanded}
                  onToggle={() => setReviewExpanded((current) => !current)}
                >
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Preview</div>
                    <div className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-stone-950">
                      {generatedQuickTitle}
                    </div>
                    <div className="mt-2 text-sm text-stone-500">
                      {[form.placeName, form.city, form.region, form.country].filter(Boolean).join(", ")}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-stone-600">
                      {teaserText || "Add context to help visitors understand the place."}
                    </p>
                  </div>
                </AccordionSection>
              </div>
            </div>

            <div className="hidden space-y-4 lg:block">
              <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 shadow-sm backdrop-blur-md">
                <div className="text-sm font-medium text-stone-500">Quick summary</div>
                <div className="mt-4 space-y-3 text-sm text-stone-600">
                  <SummaryRow
                    label="Mode"
                    value="Quick post"
                  />
                  <SummaryRow
                    label="Location"
                    value={locationReady ? [form.placeName || form.city, form.country].filter(Boolean).join(", ") : "Pin the exact place first"}
                  />
                  <SummaryRow label="Headline" value={generatedQuickTitle} />
                  <SummaryRow
                    label="Media"
                    value={uploadedMedia.length > 0 ? `${uploadedMedia.length} file${uploadedMedia.length === 1 ? "" : "s"} added` : "No media yet"}
                  />
                  <SummaryRow label="Access" value={accessSummary} />
                </div>
              </div>

              <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 shadow-sm backdrop-blur-md">
                <QuickPublishRail
                  canPublish={canPublish}
                  isPublishing={isPublishing}
                  onPublish={() => void publish("quick")}
                  viewerId={viewerId}
                  onSwitchToFull={() => setComposerMode("full")}
                />
              </div>
            </div>
          </section>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-[rgba(248,245,239,0.96)] px-4 py-3 backdrop-blur lg:hidden">
            <QuickPublishRail
              canPublish={canPublish}
              isPublishing={isPublishing}
              onPublish={() => void publish("quick")}
              viewerId={viewerId}
              onSwitchToFull={() => setComposerMode("full")}
              mobile
            />
          </div>
        </>
      ) : null}

      {composerMode === "full" ? (
        <>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_340px]">
        <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4 shadow-sm backdrop-blur-md sm:p-6">
          {stepIndex === 0 ? (
            <div className="space-y-5">
              <SectionTitle icon={MapPin} title="Choose the exact place" />
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <label className="block space-y-2 text-sm font-medium text-stone-700">
                  <span>Search place or address</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      value={locationQuery}
                      onChange={(event) => setLocationQuery(event.target.value)}
                      placeholder="Search a place, address, trailhead, campsite..."
                      className="h-13 w-full rounded-2xl border border-[color:var(--glass-border)] bg-white px-11 py-3 text-sm outline-none"
                    />
                  </div>
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="inline-flex min-h-12 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
                  >
                    {isLocatingUser ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                    Use my location
                  </button>
                  <div className="inline-flex min-h-12 items-center rounded-full border border-dashed border-stone-200 px-4 py-2 text-sm text-stone-500">
                    Or drag the pin on the map below
                  </div>
                </div>
                {isSearchingLocation ? (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Looking up places...
                  </div>
                ) : null}
                {locationResults.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {locationResults.map((candidate, index) => (
                      <button
                        key={`${candidate.label}-${index}`}
                        type="button"
                        onClick={() => applyLocationCandidate(candidate)}
                        className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm transition hover:border-stone-900 hover:bg-stone-50"
                      >
                        <div className="font-medium text-stone-900">{candidate.label}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{candidate.source}</div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-3xl">
                <MapView
                  posts={[]}
                  selectable
                  showGeolocateWhenSelectable
                  selectedPoint={{ latitude: form.latitude, longitude: form.longitude }}
                  onSelectPoint={handlePointSelect}
                  center={mapCenter}
                  className="h-[48vh] min-h-[360px] sm:min-h-[420px]"
                />
              </div>

              {locationError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{locationError}</div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Place name"
                  value={form.placeName}
                  placeholder="A short human-readable place label"
                  onChange={(value) => setForm((current) => ({ ...current, placeName: value }))}
                />
                <Field
                  label="Address"
                  value={form.address}
                  placeholder="Street, number, landmark, or leave blank"
                  onChange={(value) => setForm((current) => ({ ...current, address: value }))}
                />
                <Field
                  label="City"
                  value={form.city}
                  placeholder="Required"
                  onChange={(value) => setForm((current) => ({ ...current, city: value }))}
                />
              </div>

              <AccordionSection
                title="Precise location details"
                summary={`${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`}
                expanded={locationDetailsExpanded}
                onToggle={() => setLocationDetailsExpanded((current) => !current)}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="District / county"
                    value={form.district}
                    onChange={(value) => setForm((current) => ({ ...current, district: value }))}
                  />
                  <Field
                    label="Region / state"
                    value={form.region}
                    onChange={(value) => setForm((current) => ({ ...current, region: value }))}
                  />
                  <Field
                    label="Country"
                    value={form.country}
                    onChange={(value) => setForm((current) => ({ ...current, country: value }))}
                  />
                  <NumberField
                    label="Latitude"
                    value={form.latitude}
                    onChange={(value) => {
                      setForm((current) => ({ ...current, latitude: value }));
                      setMapCenter((current) => ({ ...current, latitude: value }));
                    }}
                  />
                  <NumberField
                    label="Longitude"
                    value={form.longitude}
                    onChange={(value) => {
                      setForm((current) => ({ ...current, longitude: value }));
                      setMapCenter((current) => ({ ...current, longitude: value }));
                    }}
                  />
                </div>
              </AccordionSection>
            </div>
          ) : null}

          {stepIndex === 1 ? (
            <div className="space-y-5">
              <SectionTitle icon={CheckCircle2} title="Add the essential context" />
              <Field
                label="Title"
                value={form.title}
                placeholder="Give the place a clear name"
                onChange={(value) => setForm((current) => ({ ...current, title: value }))}
              />
              <TextArea
                label="Teaser / short description"
                value={form.body}
                placeholder="What makes this place worth opening? Keep it short and readable."
                onChange={(value) => setForm((current) => ({ ...current, body: value }))}
              />
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>The teaser becomes the review text and fills the post body for now.</span>
                <span>{form.body.trim().length}/20 min</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Topic"
                  value={form.topicId}
                  onChange={(value) => setForm((current) => ({ ...current, topicId: value }))}
                  options={snapshot.topics.map((topic) => ({
                    value: topic.id,
                    label: topic.name,
                  }))}
                  placeholder="No topic"
                />
                <SelectField
                  label="Collection (optional)"
                  value={form.collectionId}
                  onChange={(value) => setForm((current) => ({ ...current, collectionId: value }))}
                  options={viewerCollections.map((collection) => ({
                    value: collection.id,
                    label: collection.title,
                  }))}
                  placeholder={viewerCollections.length > 0 ? "Leave outside collections" : "No collections yet"}
                />
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                Keep this step lean: title, teaser, topic, and optional collection grouping. Tags are derived automatically from the selected topic and title.
              </div>
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div className="space-y-5">
              <SectionTitle icon={ImagePlus} title="Add photos or uploads" />
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-stone-900">Media staging</div>
                    <div className="mt-1 text-sm text-stone-500">
                      Use the camera on mobile or upload from any device. Storage mode:{" "}
                      {featureModes.storageMode === "vercel-blob" ? "Vercel Blob" : "inline demo storage"}.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex min-h-12 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Take photo
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="inline-flex min-h-12 items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
                    >
                      {isUploadingMedia ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      Upload files
                    </button>
                  </div>
                </div>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleInputFiles}
                />
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleInputFiles}
                />

                {uploadError ? <div className="mt-3 text-sm text-rose-700">{uploadError}</div> : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {uploadedMedia.length === 0 ? (
                    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white text-sm text-stone-500">
                      <div className="flex items-center gap-2">
                        <ImagePlus className="h-4 w-4" /> No media uploaded yet
                      </div>
                    </div>
                  ) : (
                    uploadedMedia.map((media, index) => (
                      <div
                        key={`${media.url}-${index}`}
                        className="overflow-hidden rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)]"
                      >
                        <div className="relative h-48">
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-950/80 text-white backdrop-blur"
                            aria-label={`Remove media ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <ResponsiveMedia
                            media={media}
                            alt={media.alt || `Uploaded media ${index + 1}`}
                            fill
                            controls
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <AccordionSection
                title="Access settings"
                summary={accessSummary}
                icon={ShieldCheck}
                expanded={accessExpanded}
                onToggle={() => setAccessExpanded((current) => !current)}
              >
                <div className="grid gap-3">
                  {(["public", "subscriber_only", "special_hidden_place"] as VisibilityType[]).map((visibility) => (
                    <button
                      key={visibility}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, visibilityType: visibility }))}
                      className={cn(
                        "min-h-14 rounded-2xl border px-4 py-4 text-left transition",
                        form.visibilityType === visibility
                          ? "border-stone-950 bg-stone-950 text-white"
                          : "border-stone-200 bg-stone-50 text-stone-700",
                      )}
                    >
                      <div className="font-medium">{humanizeVisibility(visibility)}</div>
                      <div className="mt-1 text-sm opacity-80">{visibilityDescription(visibility)}</div>
                    </button>
                  ))}
                </div>
                {form.visibilityType === "special_hidden_place" ? (
                  <div className="mt-4">
                    <NumberField
                      label="Special unlock price (CZK)"
                      value={form.specialPrice}
                      onChange={(value) => setForm((current) => ({ ...current, specialPrice: value }))}
                    />
                  </div>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DateField
                    label="Visible from"
                    value={form.visibilityStart}
                    onChange={(value) => setForm((current) => ({ ...current, visibilityStart: value }))}
                  />
                  <DateField
                    label="Visible until"
                    value={form.visibilityEnd}
                    onChange={(value) => setForm((current) => ({ ...current, visibilityEnd: value }))}
                  />
                </div>
              </AccordionSection>

              <AccordionSection
                title="Review before publish"
                summary={reviewSummary}
                icon={CheckCircle2}
                expanded={reviewExpanded}
                onToggle={() => setReviewExpanded((current) => !current)}
              >
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Preview</div>
                  <div className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-stone-950">
                    {form.title || "Untitled place"}
                  </div>
                  <div className="mt-2 text-sm text-stone-500">
                    {[form.placeName, form.city, form.region, form.country].filter(Boolean).join(", ")}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-stone-600">
                    {teaserText || "Add context to help visitors understand the place."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedTopic ? (
                      <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">
                        {selectedTopic.name}
                      </span>
                    ) : null}
                    {selectedCollection ? (
                      <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">
                        {selectedCollection.title}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">
                      {humanizeVisibility(form.visibilityType)}
                    </span>
                    {form.visibilityType === "special_hidden_place" ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">
                        {formatMoney(form.specialPrice, "CZK")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 text-sm text-stone-500">
                    Exact point: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                  </div>
                  {uploadedMedia.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {uploadedMedia.slice(0, 2).map((media, index) => (
                        <div
                          key={`${media.url}-${index}`}
                          className="overflow-hidden rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)]"
                        >
                          <div className="relative h-40">
                            <ResponsiveMedia
                              media={media}
                              alt={media.alt || `Preview media ${index + 1}`}
                              fill
                              controls
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {!viewerId ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                      Sign in first so the demo can attribute the post to your creator profile.
                    </div>
                  ) : null}
                  {selectedCollection ? (
                    <div className="mt-4 text-xs text-stone-500">
                      Collection selection is shown in the flow, but publishing into collections still needs wiring.
                    </div>
                  ) : null}
                </div>
              </AccordionSection>
            </div>
          ) : null}
        </div>

        <div className="hidden space-y-4 lg:block">
          <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 shadow-sm backdrop-blur-md">
            <div className="text-sm font-medium text-stone-500">Quick summary</div>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <SummaryRow
                label="Location"
                value={locationReady ? [form.placeName || form.city, form.country].filter(Boolean).join(", ") : "Not ready yet"}
              />
              <SummaryRow label="Content" value={contentReady ? form.title : "Add title and teaser"} />
              <SummaryRow
                label="Media"
                value={uploadedMedia.length > 0 ? `${uploadedMedia.length} file${uploadedMedia.length === 1 ? "" : "s"} added` : "No media yet"}
              />
              <SummaryRow label="Access" value={accessSummary} />
            </div>
          </div>

          <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 shadow-sm backdrop-blur-md">
            <ActionRail
              canContinue={canContinue}
              canPublish={canPublish}
              isPublishing={isPublishing}
              stepIndex={stepIndex}
              onBack={() => setStepIndex((current) => current - 1)}
              onContinue={() => setStepIndex((current) => current + 1)}
              onPublish={() => void publish()}
              viewerId={viewerId}
            />
          </div>
        </div>
      </section>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-[rgba(248,245,239,0.96)] px-4 py-3 backdrop-blur lg:hidden">
          <ActionRail
            canContinue={canContinue}
            canPublish={canPublish}
            isPublishing={isPublishing}
            stepIndex={stepIndex}
            onBack={() => setStepIndex((current) => current - 1)}
            onContinue={() => setStepIndex((current) => current + 1)}
            onPublish={() => void publish()}
            viewerId={viewerId}
          />
        </div>
        </>
      ) : null}
    </div>
  );
}

function ActionRail({
  canContinue,
  canPublish,
  isPublishing,
  stepIndex,
  onBack,
  onContinue,
  onPublish,
  viewerId,
}: {
  canContinue: boolean;
  canPublish: boolean;
  isPublishing: boolean;
  stepIndex: number;
  onBack: () => void;
  onContinue: () => void;
  onPublish: () => void;
  viewerId: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {stepIndex > 0 ? (
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          Back
        </button>
      ) : null}
      {stepIndex < steps.length - 1 ? (
        <button
          type="button"
          onClick={onContinue}
          className="min-h-12 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!canContinue}
        >
          <span className="inline-flex items-center gap-2">
            Continue <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish || isPublishing}
          className="min-h-12 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2">
            {isPublishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Publish
          </span>
        </button>
      )}
      {!viewerId ? (
        <Link
          href="/sign-in?next=/create"
          className="inline-flex min-h-12 items-center rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          Sign in
        </Link>
      ) : null}
    </div>
  );
}

function QuickPublishRail({
  canPublish,
  isPublishing,
  onPublish,
  viewerId,
  onSwitchToFull,
  mobile = false,
}: {
  canPublish: boolean;
  isPublishing: boolean;
  onPublish: () => void;
  viewerId: string | null;
  onSwitchToFull: () => void;
  mobile?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSwitchToFull}
        className={cn(
          "min-h-12 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700",
          mobile && "flex-1",
        )}
      >
        Full flow
      </button>
      <button
        type="button"
        onClick={onPublish}
        disabled={!canPublish || isPublishing}
        className={cn(
          "min-h-12 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50",
          mobile && "flex-1",
        )}
      >
        <span className="inline-flex items-center gap-2">
          {isPublishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Publish quick post
        </span>
      </button>
      {!viewerId ? (
        <Link
          href="/sign-in?next=/create"
          className={cn(
            "inline-flex min-h-12 items-center rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700",
            mobile && "w-full justify-center",
          )}
        >
          Sign in
        </Link>
      ) : null}
    </div>
  );
}

function AccordionSection({
  title,
  summary,
  expanded,
  onToggle,
  icon: Icon,
  children,
}: {
  title: string;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  icon?: typeof MapPin;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/70">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            {Icon ? <Icon className="h-4 w-4 text-stone-500" /> : null}
            <span>{title}</span>
          </div>
          {summary ? <div className="mt-1 truncate text-xs text-stone-500">{summary}</div> : null}
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-stone-500 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded ? <div className="border-t border-stone-200 px-4 py-4">{children}</div> : null}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof MapPin; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
      <Icon className="h-4 w-4" /> {title}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-stone-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-stone-900">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-stone-700">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-13 w-full rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-4 py-3 text-sm outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-stone-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-13 w-full rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-4 py-3 text-sm outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2 text-sm font-medium text-stone-700">
      <span>{label}</span>
      <input
        type="number"
        step="0.00001"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-13 w-full rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-4 py-3 text-sm outline-none"
      />
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm font-medium text-stone-700">
      <span>{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-13 w-full rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-4 py-3 text-sm outline-none"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-stone-700">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[160px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-4 py-3 text-sm outline-none"
      />
    </label>
  );
}

function humanizeVisibility(visibility: VisibilityType) {
  const label = visibility.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function visibilityDescription(visibility: VisibilityType) {
  if (visibility === "public") return "Visible to everyone.";
  if (visibility === "subscriber_only") return "Unlocked for active creator subscribers.";
  return "Prepared for one-off hidden place unlocks.";
}
