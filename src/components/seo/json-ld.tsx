export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // `JSON.stringify` leaves `<` untouched, so a string containing `</script>`
  // would close this tag and turn the rest into HTML. Only repo-authored data
  // reaches this sink today, but the escape costs nothing and makes the sink
  // safe by construction. `\u003c` is valid inside a JSON string and decodes
  // back to `<`.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
