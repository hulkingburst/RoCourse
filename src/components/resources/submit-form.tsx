"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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

function validateZip(
  file: File,
  t: ReturnType<typeof useTranslations>
): Promise<string | null> {
  return (async () => {
    if (!/\.zip$/i.test(file.name)) return t("zipOnlyZip");
    if (file.size > MAX_ZIP_BYTES) {
      return t("zipTooLarge", { max: MAX_ZIP_BYTES / 1024 / 1024 });
    }
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch {
      return t("zipInvalid");
    }
    const entries = Object.values(zip.files);
    if (entries.length > MAX_ZIP_ENTRIES) {
      return t("zipTooManyFiles", { max: MAX_ZIP_ENTRIES });
    }
    let total = 0;
    for (const entry of entries) {
      if (entry.dir) continue;
      const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ZIP_ALLOWED_EXTENSIONS.has(ext)) {
        return t("zipBadFile", { name: entry.name });
      }
      const zipEntry = entry as unknown as { uncompressedSize?: number };
      const size =
        typeof zipEntry.uncompressedSize === "number"
          ? zipEntry.uncompressedSize
          : (await entry.async("uint8array")).length;
      total += size;
    }
    if (total > MAX_UNCOMPRESSED_TOTAL) {
      return t("zipTooLargeUnpacked");
    }
    return null;
  })();
}

export function SubmitForm() {
  const t = useTranslations("resources");
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
      const problem = await validateZip(selected, t);
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
        setError(t("errorChooseZip"));
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
        setError(t("errorUploadFailed"));
      }
    } else if (mode === "url") {
      const trimmed = url.trim();
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        setStatus("error");
        setError(t("errorInvalidUrl"));
        return;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setStatus("error");
        setError(t("errorProtocol"));
        return;
      }
      setStatus("submitting");
      await post({ url: trimmed });
    } else {
      if (code.trim().length === 0) {
        setError(t("errorNoCode"));
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
        setError(t("errorTooMany"));
      } else {
        setStatus("error");
        setError(t("errorGeneric"));
      }
    } catch {
      setStatus("error");
      setError(t("errorGeneric"));
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="text-lg font-semibold">{t("submittedTitle")}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("submittedBody")}
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
        <Label htmlFor="rc-kind">{t("resourceType")}</Label>
        <select
          id="rc-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as ResourceKind)}
          className={cn(inputClass, "h-9")}
        >
          {RESOURCE_KINDS.map((option) => (
            <option key={option.value} value={option.value} className="bg-white text-black">
              {t(`kinds.${option.labelKey}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rc-name">{t("nameLabel")}</Label>
        <Input
          id="rc-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_RESOURCE_NAME}
          placeholder={t("namePlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rc-desc">{t("descriptionLabel")}</Label>
        <textarea
          id="rc-desc"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_DESCRIPTION}
          rows={4}
          required
          placeholder={t("descriptionPlaceholder")}
          className={cn(inputClass, "resize-none")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rc-author">
          {t("creditName")}{" "}
          <span className="font-normal text-muted-foreground">
            {t("optional")}
          </span>
        </Label>
        <Input
          id="rc-author"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          maxLength={MAX_AUTHOR}
          placeholder={t("creditPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("contentLabel")}</Label>
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
                ? t("modeFile")
                : option === "code"
                  ? t("modeCode")
                  : t("modeUrl")}
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
                    {t("zipChecked", {
                      size: (file.size / 1024 / 1024).toFixed(2),
                    })}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">{t("chooseZip")}</span>
                  <span className="max-w-sm text-xs text-muted-foreground">
                    {t("zipHint")}
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
              placeholder={t("urlPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("urlHint")}
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
                <option key={language} value={language} className="bg-white text-black">
                  {language}
                </option>
              ))}
            </select>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={MAX_CODE}
              rows={12}
              placeholder={t("codePlaceholder")}
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
          {t("rightsNote")}
        </span>
      </label>

      {(status === "error" || error) && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          {error ?? t("errorGeneric")}
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
              {status === "uploading" ? t("uploading") : t("submitting")}
            </>
          ) : (
            t("submitForReview")
          )}
        </Button>
      </div>
    </div>
  );
}
