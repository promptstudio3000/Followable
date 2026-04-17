"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, X } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import type { HydratedPost, VisibilityType } from "@/lib/types";
import { createPostSchema } from "@/lib/validation";
import { cn, formatMoney } from "@/lib/utils";

export function EditPostDialog({
  open,
  post,
  onClose,
}: {
  open: boolean;
  post: HydratedPost | null;
  onClose: () => void;
}) {
  const { snapshot, updateCreatedPost } = useDemoStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [form, setForm] = useState({
    title: "",
    body: "",
    topicId: "",
    visibilityType: "public" as VisibilityType,
    specialPrice: 149,
    visibilityStart: "",
    visibilityEnd: "",
    placeName: "",
    address: "",
    city: "",
    district: "",
    region: "",
    country: "",
    latitude: 0,
    longitude: 0,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !post) return;
    setForm({
      title: post.post.title,
      body: post.post.body,
      topicId: post.post.topicId ?? "",
      visibilityType: post.post.visibilityType,
      specialPrice: post.post.specialPrice ?? 149,
      visibilityStart: post.post.visibilityStart ? post.post.visibilityStart.slice(0, 16) : "",
      visibilityEnd: post.post.visibilityEnd ? post.post.visibilityEnd.slice(0, 16) : "",
      placeName: post.location.placeName ?? "",
      address: post.location.address ?? "",
      city: post.location.city ?? "",
      district: post.location.district ?? "",
      region: post.location.region ?? "",
      country: post.location.country ?? "",
      latitude: post.location.latitude,
      longitude: post.location.longitude,
    });
    setTagsInput(post.tags.join(", "));
    setError(null);
  }, [open, post]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const teaserText = useMemo(() => form.body.trim().slice(0, 220), [form.body]);

  if (!open || !post || !isMounted) return null;

  const save = async () => {
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 8);

    const parsed = createPostSchema.safeParse({
      title: form.title.trim(),
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
      tags,
      visibilityStart: form.visibilityStart ? new Date(form.visibilityStart).toISOString() : null,
      visibilityEnd: form.visibilityEnd ? new Date(form.visibilityEnd).toISOString() : null,
      media: [],
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please fix the post fields.");
      return;
    }

    setIsSaving(true);
    try {
      const ok = await updateCreatedPost({
        postId: post.id,
        ...parsed.data,
        teaser: parsed.data.teaser ?? "",
        address: parsed.data.address ?? "",
        placeName: parsed.data.placeName ?? "",
        city: parsed.data.city,
        district: parsed.data.district ?? "",
        region: parsed.data.region,
        country: parsed.data.country,
      });
      if (!ok) {
        setError("Only locally created posts can be edited right now.");
        return;
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const dialog = (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-stone-950/55 backdrop-blur-sm"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 z-0 h-full w-full cursor-pointer"
        aria-label="Close edit dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_80px_rgba(18,16,12,0.22)] dark:border-stone-700 dark:bg-stone-950"
      >
        <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-4 dark:border-stone-800">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
              Edit post
            </div>
            <div className="mt-1 text-lg font-semibold text-stone-950 dark:text-stone-100">
              Update your place without leaving the detail flow
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.95fr)]">
            <section className="space-y-4 rounded-[24px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                />
              </Field>

              <Field label="Updated note">
                <textarea
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  className="min-h-[140px] w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 py-3 text-sm outline-none"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Topic">
                  <select
                    value={form.topicId}
                    onChange={(event) => setForm((current) => ({ ...current, topicId: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  >
                    <option value="">No topic</option>
                    {snapshot.topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Tags">
                  <input
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="sunrise, vanlife, swim"
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Place name">
                  <input
                    value={form.placeName}
                    onChange={(event) => setForm((current) => ({ ...current, placeName: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  />
                </Field>
                <Field label="Address">
                  <input
                    value={form.address}
                    onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  />
                </Field>
                <Field label="City">
                  <input
                    value={form.city}
                    onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  />
                </Field>
                <Field label="Region">
                  <input
                    value={form.region}
                    onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  />
                </Field>
                <Field label="District">
                  <input
                    value={form.district}
                    onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  />
                </Field>
                <Field label="Country">
                  <input
                    value={form.country}
                    onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  />
                </Field>
                <Field label="Latitude">
                  <input
                    type="number"
                    step="0.00001"
                    value={form.latitude}
                    onChange={(event) => setForm((current) => ({ ...current, latitude: Number(event.target.value) }))}
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  />
                </Field>
                <Field label="Longitude">
                  <input
                    type="number"
                    step="0.00001"
                    value={form.longitude}
                    onChange={(event) => setForm((current) => ({ ...current, longitude: Number(event.target.value) }))}
                    className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-[24px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">Visibility</div>
                <div className="mt-4 space-y-3">
                  {(["public", "subscriber_only", "special_hidden_place"] as VisibilityType[]).map((visibility) => (
                    <button
                      key={visibility}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, visibilityType: visibility }))}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-4 text-left transition",
                        form.visibilityType === visibility
                          ? "border-stone-950 bg-stone-950 text-white"
                          : "border-[color:var(--glass-border)] text-stone-700 dark:text-stone-200",
                      )}
                    >
                      <div className="font-medium">{humanizeVisibility(visibility)}</div>
                      <div className="mt-1 text-sm opacity-80">{visibilityDescription(visibility)}</div>
                    </button>
                  ))}
                </div>
                {form.visibilityType === "special_hidden_place" ? (
                  <div className="mt-4">
                    <Field label="Special unlock price">
                      <input
                        type="number"
                        min="1"
                        value={form.specialPrice}
                        onChange={(event) => setForm((current) => ({ ...current, specialPrice: Number(event.target.value) }))}
                        className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                      />
                    </Field>
                    <div className="mt-2 text-xs text-stone-500">Current unlock: {formatMoney(form.specialPrice, "CZK")}</div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[24px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">Visibility window</div>
                <div className="mt-4 grid gap-3">
                  <Field label="Visible from">
                    <input
                      type="datetime-local"
                      value={form.visibilityStart}
                      onChange={(event) => setForm((current) => ({ ...current, visibilityStart: event.target.value }))}
                      className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                    />
                  </Field>
                  <Field label="Visible until">
                    <input
                      type="datetime-local"
                      value={form.visibilityEnd}
                      onChange={(event) => setForm((current) => ({ ...current, visibilityEnd: event.target.value }))}
                      className="h-12 w-full rounded-2xl border border-[color:var(--glass-border)] bg-transparent px-4 text-sm outline-none"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-[24px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 backdrop-blur-md">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">Update note</div>
                <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
                  This first edit slice updates locally created posts in demo mode. Media remains managed in the detail view.
                </p>
                {error ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={save}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-stone-950"
                  >
                    {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium text-stone-700 dark:text-stone-200">
      <span>{label}</span>
      {children}
    </label>
  );
}

function humanizeVisibility(value: VisibilityType) {
  if (value === "subscriber_only") return "Subscribers only";
  if (value === "special_hidden_place") return "Special unlock";
  return "Public";
}

function visibilityDescription(value: VisibilityType) {
  if (value === "subscriber_only") return "Visible to people subscribed to the creator.";
  if (value === "special_hidden_place") return "Requires a one-off paid unlock before exact access appears.";
  return "Open in feeds, maps, and standard discovery surfaces.";
}
