import * as React from "react";
import { GlossaryTerm } from "@/components/lessons/glossary-term";
import { GLOSSARY_RE, GLOSSARY_VARIANT_TO_DEF } from "@/lib/glossary";

/**
 * Elements we never descend into. Links and code are skipped so glossary
 * markers never nest inside interactive elements or monospace snippets, and
 * images/inputs have no meaningful text.
 */
const SKIP_TAGS = new Set([
  "a",
  "code",
  "pre",
  "img",
  "input",
  "button",
  "textarea",
  "select",
]);

function splitText(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(GLOSSARY_RE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const variant = match[0];
    const def = GLOSSARY_VARIANT_TO_DEF.get(variant.toLowerCase());
    nodes.push(
      def ? (
        <GlossaryTerm key={`${keyBase}:${index}`} defId={def.id} lesson={def.lesson}>
          {variant}
        </GlossaryTerm>
      ) : (
        variant
      )
    );
    last = index + variant.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function transformNode(node: React.ReactNode, keyBase: string): React.ReactNode[] {
  if (typeof node === "string" || typeof node === "number") {
    return splitText(String(node), keyBase);
  }
  if (Array.isArray(node)) {
    const out: React.ReactNode[] = [];
    node.forEach((child, index) => {
      out.push(...transformNode(child, `${keyBase}[${index}]`));
    });
    return out;
  }
  if (React.isValidElement(node)) {
    const type = node.type;
    // Custom MDX components (callouts, activities, links) are left untouched.
    if (typeof type !== "string" || SKIP_TAGS.has(type)) return [node];
    const props = node.props as { children?: React.ReactNode };
    if (props.children == null) return [node];
    const children = transformNode(props.children, `${keyBase}.ch`);
    return [
      React.cloneElement(
        node as React.ReactElement<{ children?: React.ReactNode }>,
        { key: `${keyBase}.el`, children }
      ),
    ];
  }
  return [node];
}

/** `p` MDX override: renders the paragraph with glossary terms linked. */
export function GlossaryP(props: React.HTMLAttributes<HTMLParagraphElement>) {
  const { children, ...rest } = props;
  return <p {...rest}>{transformNode(children, "p")}</p>;
}

/** `li` MDX override: renders the list item with glossary terms linked. */
export function GlossaryLi(props: React.HTMLAttributes<HTMLLIElement>) {
  const { children, ...rest } = props;
  return <li {...rest}>{transformNode(children, "li")}</li>;
}
