"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase() || "?";
}

export function Avatar({
  src,
  alt,
  displayName,
  className,
  size = "md",
  ...props
}: {
  src: string | null | undefined;
  alt: string;
  displayName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
} & Omit<React.ComponentProps<typeof Image>, "src" | "alt">) {
  const [error, setError] = useState(false);
  const showImage = src && !error;

  const sizeClasses =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
        ? "h-14 w-14 text-lg"
        : "h-10 w-10 text-sm";

  if (showImage) {
    return (
      <span className={cn("relative block overflow-hidden rounded-full bg-stone-100", sizeClasses, className)}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          unoptimized
          onError={() => setError(true)}
          sizes={size === "sm" ? "32px" : size === "lg" ? "56px" : "40px"}
          {...props}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-stone-200 font-medium text-stone-600",
        sizeClasses,
        className,
      )}
      aria-hidden
    >
      {initials(displayName)}
    </span>
  );
}
