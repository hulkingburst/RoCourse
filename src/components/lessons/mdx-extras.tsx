import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ChevronRight,
  Flame,
  Info,
  Lightbulb,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn, extractText, slugify } from "@/lib/utils";

/* ----------------------------------------------------------------------------
 * Callouts
 * ------------------------------------------------------------------------- */

type CalloutType = "note" | "tip" | "warning" | "mistake";

const calloutStyles: Record<
  CalloutType,
  { icon: LucideIcon; accent: string }
> = {
  note: {
    icon: Info,
    accent: "text-sky-400",
  },
  tip: {
    icon: Lightbulb,
    accent: "text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    accent: "text-amber-400",
  },
  mistake: {
    icon: Flame,
    accent: "text-rose-400",
  },
};

export function Callout({
  type,
  title,
  children,
}: {
  type: CalloutType;
  title?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("mdx");
  const config = calloutStyles[type];
  const Icon = config.icon;
  return (
    <div className="my-6 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className={cn("flex items-center gap-2 text-sm font-semibold", config.accent)}>
        <Icon className="h-4 w-4 shrink-0" />
        {title ?? t(`callouts.${type}`)}
      </div>
      <div className="prose prose-sm mt-2 max-w-none text-[15px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function Note(props: { title?: string; children: React.ReactNode }) {
  return <Callout type="note" {...props} />;
}

export function Tip(props: { title?: string; children: React.ReactNode }) {
  return <Callout type="tip" {...props} />;
}

export function Warning(props: { title?: string; children: React.ReactNode }) {
  return <Callout type="warning" {...props} />;
}

export function Mistake(props: { title?: string; children: React.ReactNode }) {
  return <Callout type="mistake" {...props} />;
}

/* ----------------------------------------------------------------------------
 * Challenge
 * ------------------------------------------------------------------------- */

export function Challenge({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("mdx");
  return (
    <div className="my-8 rounded-xl border-2 border-dashed border-border bg-accent/30 px-5 py-5">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold uppercase tracking-wide">
          {title ?? t("challenge")}
        </span>
      </div>
      <div className="prose prose-sm max-w-none text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Expandable
 * ------------------------------------------------------------------------- */

export function Expandable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group my-6 rounded-xl border border-border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none select-none items-center gap-2 px-5 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
        {title}
      </summary>
      <div className="prose prose-sm max-w-none px-5 pb-5 text-[15px] leading-relaxed">
        {children}
      </div>
    </details>
  );
}

/* ----------------------------------------------------------------------------
 * Headings (with anchor ids for the table of contents)
 * ------------------------------------------------------------------------- */

export function MdxHeading({
  level,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { level: 2 | 3 | 4 }) {
  const text = extractText(children);
  const id = slugify(text);
  const href = `#${id}`;
  const tag = `h${level}` as const;
  const t = useTranslations("mdx");

  return React.createElement(
    tag,
    {
      id,
      ...props,
      className: cn(
        "group relative scroll-mt-24",
        level === 2 && "mt-10 mb-4",
        level === 3 && "mt-8 mb-3",
        level === 4 && "mt-6 mb-3",
        props.className
      ),
    },
    <a
      key="anchor"
      href={href}
      aria-label={t("linkTo", { text })}
      className="absolute -left-6 hidden h-full w-6 items-start pt-1 text-muted-foreground opacity-0 transition-opacity no-underline group-hover:opacity-100 hover:text-primary sm:flex"
    >
      #
    </a>,
    <span key="content">{children}</span>
  );
}

/* ----------------------------------------------------------------------------
 * Links
 * ------------------------------------------------------------------------- */

export function MdxLink({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = typeof href === "string" && /^https?:\/\//.test(href);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
