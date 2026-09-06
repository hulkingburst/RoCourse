"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { getPathname } from "@/i18n/navigation";
import { copyText } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";

interface ShareLinkButtonProps {
  /** Internal (locale-agnostic) route, e.g. `/u/alex` or `/certificate/alex/course-x`. */
  path: string;
  /** Label key under the `share` namespace, e.g. `shareProfile`. */
  labelKey: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon" | "iconSm";
  className?: string;
}

/**
 * Copies a public link to the clipboard. The absolute URL is computed at click
 * time from the current origin + locale-prefixed path, so the copied link
 * always works in the viewer's own language.
 */
export function ShareLinkButton({
  path,
  labelKey,
  variant = "outline",
  size = "default",
  className,
}: ShareLinkButtonProps) {
  const t = useTranslations("share");
  const locale = useLocale();
  const [copied, setCopied] = React.useState(false);
  const iconOnly = size === "icon" || size === "iconSm";

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleClick = async () => {
    const url = `${window.location.origin}${getPathname({ href: path, locale })}`;
    const ok = await copyText(url);
    if (ok) setCopied(true);
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-label={t(labelKey)}
      title={t(copied ? "copied" : labelKey)}
      className={className}
    >
      {copied ? <Check /> : <Copy />}
      {!iconOnly && <span>{copied ? t("copied") : t(labelKey)}</span>}
    </Button>
  );
}