"use client";

import * as React from "react";
import JSZip from "jszip";
import { CheckCircle2, FileArchive, Loader2, XCircle } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";
import {
  CODE_LANGS,
  MAX_AUTHOR,
  MAX_CODE,
  MAX_DESCRIPTION,
  MAX_RESOURCE_NAME,
  MAX_URL,
  MAX_ZIP_BYTES,
  MAX_ZIP_ENTRIES,
  MAX_UNCOMPRESSED_TOTAL,
  RESOURCE_KINDS,
  ZIP_ALLOWED_EXTENSIONS,
  type ResourceKind,
} from "@/lib/resources-shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Mode = "file" | "code" | "url";
type Status = "idle" | "uploading" | "submitting" | "success" | "error";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

function validateZip(file: File): Promise<string | null> {
  return (async () => {
    if (!/\.zip$/i.test(file.name)) return "Only .zip files are allowed.";
    if (file.size > MAX_ZIP_BYTES) {
      return `That zip is too large (max ${MAX_ZIP_BYTES / 1024 / 1024} MB).`;
    }
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch {
      return "That file isn't a valid zip archive.";
    }
    const entries = Object.values(zip.files);
    if (entries.length > MAX_ZIP_ENTRIES) {
      return `That zip has too many files (max ${MAX_ZIP_ENTRIES}).`;
    }
    let total = 0;
    for (const entry of entries) {
      if (entry.dir) continue;
      const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ZIP_ALLOWED_EXTENSIONS.has(ext)) {
        return `"${entry.name}" is not an allowed file type. Zips may only contain images and 3D/model files.`;
      }
      const zipEntry = entry as unknown as { uncompressedSize?: number };
      const size =
        typeof zipEntry.uncompressedSize === "number"
          ? zipEntry.uncompressedSize
          : (await entry.async("uint8array")).length;
      total += size;
    }
    if (total > MAX_UNCOMPRESSED_TOTAL) {
      return "That zip is too large once unpacked.";
    }
    return null;
  })();
}

export function SubmitForm() {
  const [kind, setKind] = React.useState<ResourceKind>("script");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [rights, setRights] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("file");
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [codeLang, setCodeLang] = React.useState<string>("luau");
  const [url, setUrl] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFileError(null);
    if (selected) {
      const problem = await validateZip(selected);
      if (problem) {
        setFileError(problem);
        setFile(null);
        event.target.value = "";
      }
    }
  };

  const submit = async () => {
    if (status === "uploading" || status === "submitting") return;
    setError(null);

    if (mode === "file") {
      if (!file) {
        setError("Choose a .zip file to submit.");
        return;
      }
      setStatus("uploading");
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/resources/upload",
        });
        await post({ fileUrl: blob.url });
      } catch {
        setStatus("error");
        setError("Uploading the file failed. Try again in a moment.");
      }
    } else if (mode === "url") {
      const trimmed = url.trim();
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        setStatus("error");
        setError("Enter a valid website link (e.g. https://example.com).");
        return;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setStatus("error");
        setError("Only http and https links are allowed.");
        return;
      }
      setStatus("submitting");
      await post({ url: trimmed });
    } else {
      if (code.trim().length === 0) {
        setError("Paste some code to submit.");
        return;
      }
      setStatus("submitting");
      await post({ code: code.trim(), codeLang });
    }
  };

  const post = async (extra: {
    fileUrl?: string;
    code?: string;
    codeLang?: string;
    url?: string;
  }) => {
    try {
      const response = await fetch("/api/resources/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name: name.trim(),
          description: description.trim(),
          author: author.trim(),
          rights,
          fileUrl: extra.fileUrl ?? "",
          code: extra.code ?? "",
          codeLang: extra.codeLang ?? "",
          url: extra.url ?? "",
        }),
      });
      if (response.ok) {
        setStatus("success");
      } else if (response.status === 429) {
        setStatus("error");
        setError("You've submitted too many resources recently. Try again tomorrow.");
      } else {
        setStatus("error");
        setError("Something went wrong. Please try again in a moment.");
      }
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again in a moment.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="text-lg font-semibold">Submitted for review!</p>
        <p className="max-w-md text-sm text-muted-foreground">
          The course author will review it. If it gets accepted it will show up
          on the Resources page.
        </p>
      </div>
    );
  }

  const canSubmit =
    rights &&
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    (mode === "file"
      ? file !== null
      : mode === "code"
        ? code.trim().length > 0
        : url.trim().length > 0) &&
    (status === "idle" || status === "error");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="rc-kind">Resource type</Label>
        <select
          id="rc-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as ResourceKind)}
          className={cn(inputClass, "h-9")}
        >
          {RESOURCE_KINDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rc-name">Name</Label>
        <Input
          id="rc-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_RESOURCE_NAME}
          placeholder="e.g. Simple save system"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rc-desc">Description</Label>
        <textarea
          id="rc-desc"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_DESCRIPTION}
          rows={4}
          required
          placeholder="What is it, and what does it help people build?"
          className={cn(inputClass, "resize-none")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rc-author">
          Credit name <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="rc-author"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          maxLength={MAX_AUTHOR}
          placeholder="How you want to be credited"
        />
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <div className="inline-flex rounded-md border bg-muted/40 p-1">
          {(["file", "code", "url"] as Mode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                mode === option
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option === "file"
                ? "Upload a .zip"
                : option === "code"
                  ? "Paste code"
                  : "Website link"}
            </button>
          ))}
        </div>

        {mode === "file" ? (
          <div className="space-y-2">
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center transition-colors",
                fileError ? "border-destructive" : "hover:bg-muted/40"
              )}
            >
              <FileArchive className="h-6 w-6 text-muted-foreground" />
              {file ? (
                <>
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB — contents checked
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">Choose a .zip file</span>
                  <span className="max-w-sm text-xs text-muted-foreground">
                    Zips may only contain images and 3D/model files (png, jpg,
                    fbx, obj, and similar). Code is shared by pasting it instead.
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="sr-only"
                onChange={(event) => void handleFileChange(event)}
              />
            </label>
            {fileError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                {fileError}
              </p>
            )}
          </div>
        ) : mode === "url" ? (
          <div className="space-y-2">
            <Input
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              maxLength={MAX_URL}
              placeholder="https://example.com/your-tool"
            />
            <p className="text-xs text-muted-foreground">
              A website that helps people build — a tool, docs page, or
              resource hub.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={codeLang}
              onChange={(event) => setCodeLang(event.target.value)}
              className={cn(inputClass, "h-9")}
            >
              {CODE_LANGS.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={MAX_CODE}
              rows={12}
              placeholder="Paste your code here. It's stored as plain text — never executed."
              className={cn(inputClass, "resize-none font-mono text-[13px]")}
            />
            <p className="text-right font-mono text-xs text-muted-foreground">
              {code.length.toLocaleString()} / {MAX_CODE.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <label className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-3 py-3 text-sm">
        <input
          type="checkbox"
          checked={rights}
          onChange={(event) => setRights(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-muted-foreground">
          I confirm I created this myself and have the rights to share it.
        </span>
      </label>

      {(status === "error" || error) && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          {error ?? "Something went wrong. Please try again."}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit}
        >
          {status === "uploading" || status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {status === "uploading" ? "Uploading…" : "Submitting…"}
            </>
          ) : (
            "Submit for review"
          )}
        </Button>
      </div>
    </div>
  );
}
