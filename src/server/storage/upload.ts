import { put } from "@vercel/blob";
import type { UploadedMediaInput } from "@/lib/types";

const INLINE_MAX_BYTES = 1_500_000;
const BLOB_MAX_BYTES = 8_000_000;

function isAllowedMimeType(type: string) {
  return type.startsWith("image/") || type.startsWith("video/");
}

function typeFromMime(type: string): UploadedMediaInput["type"] {
  return type.startsWith("video/") ? "video" : "image";
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

async function storeInline(file: File): Promise<UploadedMediaInput> {
  if (file.size > INLINE_MAX_BYTES) {
    throw new Error("Demo inline storage supports files up to 1.5 MB. Configure Vercel Blob for larger uploads.");
  }

  const dataUrl = await fileToDataUrl(file);
  return {
    type: typeFromMime(file.type),
    url: dataUrl,
    alt: file.name,
    blurDataUrl: file.type.startsWith("image/") ? dataUrl : null,
  };
}

async function storeBlob(file: File): Promise<UploadedMediaInput> {
  if (file.size > BLOB_MAX_BYTES) {
    throw new Error("File is too large for the current upload limit.");
  }

  const blob = await put(`posts/${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: false,
  });

  return {
    type: typeFromMime(file.type),
    url: blob.url,
    alt: file.name,
    blurDataUrl: null,
  };
}

export async function uploadFiles(files: File[]): Promise<UploadedMediaInput[]> {
  if (files.length === 0) return [];

  for (const file of files) {
    if (!isAllowedMimeType(file.type)) {
      throw new Error(`Unsupported file type: ${file.type || file.name}`);
    }
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return Promise.all(files.map((file) => storeBlob(file)));
  }

  return Promise.all(files.map((file) => storeInline(file)));
}
