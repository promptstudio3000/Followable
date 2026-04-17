"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "@/components/icons";
import { PostDetailView } from "@/components/post-detail-view";

export function PostDetailDialog({
  postId,
  onClose,
}: {
  postId: string | null;
  onClose: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!postId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, postId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!postId) return null;
  if (!isMounted) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/50 backdrop-blur-sm"
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
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_60px_rgba(18,16,12,0.2)]"
      >
        <div className="flex shrink-0 items-center justify-end px-3 py-2 sm:px-4 sm:py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
            aria-label="Close"
          >
            <X className="h-8 w-8" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4">
          <PostDetailView postId={postId} variant="dialog" />
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
