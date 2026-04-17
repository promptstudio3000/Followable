import type { AppFeatureModes, AppMode, SeedData } from "@/lib/types";
import { getMapMode } from "@/lib/map-style";
import { walletAuthEnabled, walletPaymentsEnabled } from "@/lib/web3-config";
import { mergeSeedDataSearchPlaces } from "@/server/data/admin-divisions";
import { getDatabase, isDatabaseConfigured, resetDatabaseClient } from "@/server/db/client";
import { getDatabaseSnapshot } from "@/server/data/database";

function buildFeatureModes(appMode: AppMode): AppFeatureModes {
  return {
    appMode,
    geocodingMode: process.env.MAPBOX_ACCESS_TOKEN
      ? "mapbox"
      : process.env.NOMINATIM_BASE_URL
        ? "nominatim"
        : "seeded",
    storageMode: process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "inline-demo",
    walletMode: "injected",
    walletAuthStatus: walletAuthEnabled() ? "enabled" : "disabled",
    walletPaymentsEnabled: walletPaymentsEnabled(),
    mapMode: getMapMode(),
  };
}

/** One shared build — demo snapshot is heavy; concurrent requests wait on the same promise. */
let demoSnapshotBuild: Promise<SeedData> | null = null;

async function loadDemoSnapshot(): Promise<SeedData> {
  if (!demoSnapshotBuild) {
    demoSnapshotBuild = (async () => {
      try {
        const { seedData } = await import("@/lib/demo-data");
        return mergeSeedDataSearchPlaces(seedData);
      } catch (e) {
        demoSnapshotBuild = null;
        throw e;
      }
    })();
  }
  return demoSnapshotBuild;
}

const SNAPSHOT_TIMEOUT_MS = 45_000;

async function getDatabaseSnapshotWithTimeout(): Promise<SeedData> {
  return await Promise.race([
    getDatabaseSnapshot(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`database_snapshot_timeout_${SNAPSHOT_TIMEOUT_MS}ms`)), SNAPSHOT_TIMEOUT_MS),
    ),
  ]);
}

export async function getAppBootstrap(): Promise<{
  snapshot: SeedData;
  featureModes: AppFeatureModes;
}> {
  const forceDemoMode =
    process.env.USE_DEMO_MODE === "true" || process.env.USE_DEMO_MODE === "1";

  try {
    const databaseEnabled = !forceDemoMode && isDatabaseConfigured();

    if (!databaseEnabled) {
      return {
        snapshot: await loadDemoSnapshot(),
        featureModes: buildFeatureModes("demo"),
      };
    }

    try {
      const { sql } = getDatabase();
      await Promise.race([
        sql`SELECT 1`,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("database_connect_timeout")), 6000),
        ),
      ]);
    } catch (probeErr) {
      resetDatabaseClient();
      const msg = probeErr instanceof Error ? probeErr.message : String(probeErr);
      console.warn(
        `[followable] Database unreachable (${msg}). Running in demo mode — fix DATABASE_URL or set USE_DEMO_MODE=true.`,
      );
      return { snapshot: await loadDemoSnapshot(), featureModes: buildFeatureModes("demo") };
    }

    try {
      const dbSnapshot = await getDatabaseSnapshotWithTimeout();
      /* Snapshot already includes admin search places from Postgres; skip merge to avoid
       * parsing the large admin JSON (getGlobalSeedSearchPlaces) on every request. */
      return {
        snapshot: dbSnapshot,
        featureModes: buildFeatureModes("database"),
      };
    } catch (error) {
      resetDatabaseClient();
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[followable] Database bootstrap failed (${msg}). Using demo snapshot.`);
      return { snapshot: await loadDemoSnapshot(), featureModes: buildFeatureModes("demo") };
    }
  } catch (fatal) {
    resetDatabaseClient();
    console.warn(
      "[followable] Unexpected bootstrap error; demo mode.",
      fatal instanceof Error ? fatal.message : fatal,
    );
    return {
      snapshot: await loadDemoSnapshot(),
      featureModes: buildFeatureModes("demo"),
    };
  }
}
