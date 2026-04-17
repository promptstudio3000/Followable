"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type MediaLike = {
  type: "image" | "video";
  url: string;
  alt?: string | null;
  blurDataUrl?: string | null;
};

export function ResponsiveMedia({
  media,
  alt,
  fill = false,
  width = 1200,
  height = 900,
  sizes,
  className,
  controls = false,
  priority = false,
}: {
  media: MediaLike;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  controls?: boolean;
  priority?: boolean;
}) {
  if (media.type === "video") {
    return (
      <video
        src={media.url}
        className={cn("h-full w-full object-cover", className)}
        controls={controls}
        playsInline
      />
    );
  }

  const skipOptimization =
    media.url.startsWith("data:") ||
    media.url.includes("blob.vercel-storage.com");

  if (fill) {
    return (
      <Image
        src={media.url}
        alt={media.alt || alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholder={media.blurDataUrl ? "blur" : "empty"}
        blurDataURL={media.blurDataUrl ?? undefined}
        unoptimized={skipOptimization}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={media.url}
      alt={media.alt || alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      placeholder={media.blurDataUrl ? "blur" : "empty"}
      blurDataURL={media.blurDataUrl ?? undefined}
      unoptimized={skipOptimization}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
