import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDivisionSeedChildren } from "@/server/data/admin-divisions";
import { getDatabase, isDatabaseConfigured } from "@/server/db/client";
import { adminDivisions } from "@/server/db/schema";

function normalizeCountryCode(value: string | null) {
  return value?.trim().toUpperCase() || null;
}

function normalizeLevel(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const countryCode = normalizeCountryCode(request.nextUrl.searchParams.get("country"));
  const parentCode = request.nextUrl.searchParams.get("parentCode")?.trim() || null;
  const query = request.nextUrl.searchParams.get("query")?.trim() || null;
  const requestedLevel = normalizeLevel(request.nextUrl.searchParams.get("level"));
  const level = requestedLevel ?? (countryCode && !parentCode ? 1 : null);

  if (isDatabaseConfigured()) {
    try {
      const { db } = getDatabase();
      const clauses = [];

      if (countryCode) clauses.push(eq(adminDivisions.countryCode, countryCode));
      if (parentCode !== null) clauses.push(eq(adminDivisions.parentCode, parentCode));
      if (level !== null) clauses.push(eq(adminDivisions.level, level));

      const rows = clauses.length > 0
        ? await db.select().from(adminDivisions).where(and(...clauses))
        : await db.select().from(adminDivisions).where(eq(adminDivisions.level, 0));

      const needle = query?.toLocaleLowerCase("en") ?? "";
      const items = rows
        .filter((row) => {
          if (!needle) return true;
          return (
            row.name.toLocaleLowerCase("en").includes(needle) ||
            row.asciiName.toLocaleLowerCase("en").includes(needle)
          );
        })
        .sort((left, right) =>
          left.name.localeCompare(right.name, "cs", { sensitivity: "base" }) ||
          left.code.localeCompare(right.code, "en"),
        )
        .slice(0, 250);

      return NextResponse.json({ source: "database", count: items.length, items });
    } catch (error) {
      console.warn(
        "[followable] admin-divisions database read failed, falling back to seed data.",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const items = getAdminDivisionSeedChildren({
    countryCode,
    parentCode,
    level,
    query,
  }).slice(0, 250);

  return NextResponse.json({ source: "seed", count: items.length, items });
}
