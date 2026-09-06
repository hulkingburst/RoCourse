export type ResourceKind =
  | "plugin"
  | "script"
  | "asset-pack"
  | "ui-module"
  | "model"
  | "website"
  | "other";

export interface Resource {
  title: string;
  kind: ResourceKind;
  author: string | null;
  description: string;
  fileUrl: string | null;
  url: string | null;
  code: string | null;
  codeLang: string;
  acceptedAt: string;
  /** Marked by the course author as an owner pick (see the GitHub issue label). */
  recommended: boolean;
}

export const RESOURCE_KINDS: { value: ResourceKind; labelKey: string }[] = [
  { value: "plugin", labelKey: "plugin" },
  { value: "script", labelKey: "script" },
  { value: "asset-pack", labelKey: "asset-pack" },
  { value: "ui-module", labelKey: "ui-module" },
  { value: "model", labelKey: "model" },
  { value: "website", labelKey: "website" },
  { value: "other", labelKey: "other" },
];

export const CODE_LANGS = ["luau", "lua", "json", "markdown", "typescript", "css"] as const;

export const MAX_RESOURCE_NAME = 100;
export const MAX_DESCRIPTION = 2000;
export const MAX_AUTHOR = 80;
export const MAX_CODE = 48_000;
export const MAX_URL = 2048;

// Client-side zip upload limits.
export const MAX_ZIP_BYTES = 50 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 1000;
export const MAX_UNCOMPRESSED_TOTAL = 300 * 1024 * 1024;

/**
 * Only these file types are allowed inside submitted zips. Everything else —
 * executables, scripts, archives, web files — is rejected before upload.
 */
export const ZIP_ALLOWED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tga",
  "tif",
  "tiff",
  "fbx",
  "obj",
  "mtl",
  "glb",
  "gltf",
  "blend",
  "dds",
  "dae",
  "stl",
  "rbxl",
  "rbxlx",
  "rbxm",
  "rbxmx",
]);
