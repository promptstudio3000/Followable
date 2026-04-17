import { coordsToGeokey, slugify } from "@/lib/utils";
import type { CanonicalPlaceLinkage, HydratedPost, Location } from "@/lib/types";

type LocationPlaceFields = Pick<
  Location,
  "latitude" | "longitude" | "address" | "placeName" | "placeId" | "placeKey" | "city" | "district" | "region" | "country" | "geokey"
>;

function normalizeSegment(value?: string | null) {
  if (!value) return null;
  const normalized = slugify(value);
  return normalized.length > 0 ? normalized : null;
}

function leftRotate(value: number, shift: number) {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function wordToLittleEndianHex(word: number) {
  let result = "";
  for (let byteIndex = 0; byteIndex < 4; byteIndex += 1) {
    result += ((word >>> (byteIndex * 8)) & 0xff).toString(16).padStart(2, "0");
  }
  return result;
}

function md5Hex(value: string) {
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const table = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0,
  );
  const input = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const buffer = new Uint8Array(paddedLength);
  buffer.set(input);
  buffer[input.length] = 0x80;

  const bitLengthLow = (input.length * 8) >>> 0;
  const bitLengthHigh = Math.floor((input.length * 8) / 0x100000000) >>> 0;
  buffer[paddedLength - 8] = bitLengthLow & 0xff;
  buffer[paddedLength - 7] = (bitLengthLow >>> 8) & 0xff;
  buffer[paddedLength - 6] = (bitLengthLow >>> 16) & 0xff;
  buffer[paddedLength - 5] = (bitLengthLow >>> 24) & 0xff;
  buffer[paddedLength - 4] = bitLengthHigh & 0xff;
  buffer[paddedLength - 3] = (bitLengthHigh >>> 8) & 0xff;
  buffer[paddedLength - 2] = (bitLengthHigh >>> 16) & 0xff;
  buffer[paddedLength - 1] = (bitLengthHigh >>> 24) & 0xff;

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < buffer.length; offset += 64) {
    const chunk = new Uint32Array(16);
    for (let index = 0; index < 16; index += 1) {
      const base = offset + index * 4;
      chunk[index] =
        (buffer[base] ?? 0) |
        ((buffer[base + 1] ?? 0) << 8) |
        ((buffer[base + 2] ?? 0) << 16) |
        ((buffer[base + 3] ?? 0) << 24);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f = 0;
      let g = 0;

      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      const nextD = d;
      d = c;
      c = b;
      b = (b + leftRotate((a + f + table[index]! + chunk[g]!) >>> 0, shifts[index]!)) >>> 0;
      a = nextD;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return `${wordToLittleEndianHex(a0)}${wordToLittleEndianHex(b0)}${wordToLittleEndianHex(c0)}${wordToLittleEndianHex(d0)}`;
}

export function buildCanonicalPlaceKey(location: LocationPlaceFields) {
  const localitySegments = [
    normalizeSegment(location.country),
    normalizeSegment(location.region),
    normalizeSegment(location.district),
    normalizeSegment(location.city),
  ].filter(Boolean);

  const namedAnchor = normalizeSegment(location.placeName) ?? normalizeSegment(location.address);
  const geoAnchor =
    normalizeSegment(location.geokey) ??
    normalizeSegment(coordsToGeokey(location.latitude, location.longitude)) ??
    `${location.latitude.toFixed(4)}-${location.longitude.toFixed(4)}`;

  const anchorSegments = namedAnchor ? ["named", namedAnchor] : ["geo", geoAnchor];
  return ["place", ...localitySegments, ...anchorSegments].join("/");
}

export function buildCanonicalPlaceId(placeKey: string) {
  return `place_${md5Hex(placeKey).slice(0, 10)}`;
}

export function resolveCanonicalPlaceLinkage(location: LocationPlaceFields): CanonicalPlaceLinkage {
  const storedPlaceKey = location.placeKey?.trim();
  const placeKey = storedPlaceKey && storedPlaceKey.length > 0 ? storedPlaceKey : buildCanonicalPlaceKey(location);
  const storedPlaceId = location.placeId?.trim();
  const placeId = storedPlaceId && storedPlaceId.length > 0 ? storedPlaceId : buildCanonicalPlaceId(placeKey);

  return {
    placeId,
    placeKey,
    source: storedPlaceId || storedPlaceKey ? "stored" : "derived",
  };
}

export function withCanonicalPlaceLinkage<TLocation extends LocationPlaceFields>(location: TLocation) {
  const linkage = resolveCanonicalPlaceLinkage(location);
  return {
    ...location,
    placeId: linkage.placeId,
    placeKey: linkage.placeKey,
  };
}

export function getPostPlaceMetadata(post: Pick<HydratedPost, "location">) {
  const linkage = resolveCanonicalPlaceLinkage(post.location);
  return {
    ...linkage,
    locationId: post.location.id,
  };
}

export function getCollectionPlaceMetadata(posts: Array<Pick<HydratedPost, "location">>) {
  const byPlaceId = new Map<string, CanonicalPlaceLinkage & { locationId: string }>();

  posts.forEach((post) => {
    const linkage = getPostPlaceMetadata(post);
    if (!byPlaceId.has(linkage.placeId)) {
      byPlaceId.set(linkage.placeId, linkage);
    }
  });

  const places = [...byPlaceId.values()];
  return {
    places,
    placeIds: places.map((place) => place.placeId),
    placeKeys: places.map((place) => place.placeKey),
  };
}
