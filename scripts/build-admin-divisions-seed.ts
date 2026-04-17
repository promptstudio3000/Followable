import { createWriteStream, existsSync, mkdirSync, rmSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { createInterface } from "readline";
import { spawn } from "child_process";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const GEO_NAMES_URL = "https://download.geonames.org/export/dump/allCountries.zip";
const CACHE_DIR = resolve(process.cwd(), ".cache", "geonames");
const ZIP_PATH = resolve(CACHE_DIR, "allCountries.zip");
const OUTPUT_DIR = resolve(process.cwd(), "src", "server", "data", "generated");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "admin-divisions.seed.json");

type Level = 0 | 1 | 2 | 3 | 4;

type RecordTuple = [
  id: string,
  geonameId: number,
  countryCode: string,
  level: Level,
  featureCode: string,
  code: string,
  parentCode: string | null,
  name: string,
  asciiName: string,
  latitude: number,
  longitude: number,
];

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

async function downloadIfMissing() {
  if (existsSync(ZIP_PATH)) return;

  ensureDir(CACHE_DIR);
  console.log(`Downloading GeoNames archive from ${GEO_NAMES_URL} ...`);

  const response = await fetch(GEO_NAMES_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download GeoNames archive: ${response.status}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(ZIP_PATH));
}

function normalizeCountryCode(raw: string) {
  return raw.trim().toUpperCase();
}

function buildAdminCode(countryCode: string, parts: string[]) {
  return [countryCode, ...parts].join(".");
}

function makeCountryTuple(fields: string[]): RecordTuple | null {
  const geonameId = Number(fields[0]);
  const countryCode = normalizeCountryCode(fields[8] ?? "");
  if (!countryCode || !Number.isInteger(geonameId)) return null;

  return [
    `adm_${geonameId}`,
    geonameId,
    countryCode,
    0,
    fields[7]!,
    countryCode,
    null,
    fields[1]!,
    fields[2]!,
    Number(fields[4]),
    Number(fields[5]),
  ];
}

function makeAdminTuple(fields: string[], level: Exclude<Level, 0>): RecordTuple | null {
  const geonameId = Number(fields[0]);
  const countryCode = normalizeCountryCode(fields[8] ?? "");
  const admin1 = (fields[10] ?? "").trim();
  const admin2 = (fields[11] ?? "").trim();
  const admin3 = (fields[12] ?? "").trim();
  const admin4 = (fields[13] ?? "").trim();
  const allParts = [admin1, admin2, admin3, admin4];
  const codeParts = allParts.slice(0, level);

  if (!countryCode || !Number.isInteger(geonameId)) return null;
  if (codeParts.some((part) => part.length === 0 || part === "00")) return null;

  const code = buildAdminCode(countryCode, codeParts);
  const parentCode = level === 1 ? null : buildAdminCode(countryCode, codeParts.slice(0, -1));

  return [
    `adm_${geonameId}`,
    geonameId,
    countryCode,
    level,
    fields[7]!,
    code,
    parentCode,
    fields[1]!,
    fields[2]!,
    Number(fields[4]),
    Number(fields[5]),
  ];
}

function isCountryFeature(featureClass: string, featureCode: string) {
  return featureClass === "A" && (featureCode.startsWith("PCL") || featureCode === "TERR");
}

function detectAdminLevel(featureClass: string, featureCode: string): Exclude<Level, 0> | null {
  if (featureClass !== "A") return null;
  if (featureCode === "ADM1") return 1;
  if (featureCode === "ADM2") return 2;
  if (featureCode === "ADM3") return 3;
  if (featureCode === "ADM4") return 4;
  return null;
}

async function buildSeed() {
  await downloadIfMissing();

  const unzip = spawn("unzip", ["-p", ZIP_PATH], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "inherit"],
  });

  const rl = createInterface({ input: unzip.stdout!, crlfDelay: Infinity });
  const byCode = new Map<string, RecordTuple>();
  const byCountryCode = new Map<string, RecordTuple>();

  for await (const line of rl) {
    if (!line) continue;
    const fields = line.split("\t");
    if (fields.length < 14) continue;

    const featureClass = fields[6] ?? "";
    const featureCode = fields[7] ?? "";

    if (isCountryFeature(featureClass, featureCode)) {
      const tuple = makeCountryTuple(fields);
      if (tuple && !byCountryCode.has(tuple[2])) {
        byCountryCode.set(tuple[2], tuple);
      }
      continue;
    }

    const level = detectAdminLevel(featureClass, featureCode);
    if (!level) continue;

    const tuple = makeAdminTuple(fields, level);
    if (tuple && !byCode.has(tuple[5])) {
      byCode.set(tuple[5], tuple);
    }
  }

  const exitCode = await new Promise<number>((resolvePromise, rejectPromise) => {
    unzip.on("close", resolvePromise);
    unzip.on("error", rejectPromise);
  });

  if (exitCode !== 0) {
    throw new Error(`unzip exited with code ${exitCode}`);
  }

  const rows = [...byCountryCode.values(), ...byCode.values()].sort((left, right) => {
    return left[2].localeCompare(right[2], "en") ||
      left[3] - right[3] ||
      left[5].localeCompare(right[5], "en");
  });

  ensureDir(OUTPUT_DIR);
  await writeFile(OUTPUT_PATH, `${JSON.stringify(rows)}\n`, "utf-8");

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[`level${row[3]}`] = (acc[`level${row[3]}`] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Wrote ${rows.length} admin-division rows to ${OUTPUT_PATH}`);
  console.log(counts);
}

async function main() {
  if (process.argv.includes("--refresh") && existsSync(ZIP_PATH)) {
    rmSync(ZIP_PATH);
  }
  await buildSeed();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
