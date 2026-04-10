/**
 * Sanitises raw HTML strings before they enter the SectionNode tree.
 *
 * Transformations applied (in order):
 *  1. Strip all <script>…</script> blocks (including content).
 *  2. Remove all on* event attributes (e.g. onclick, onerror, onmouseover).
 *  3. Replace javascript: URI schemes in href/src attributes with #.
 */
export function sanitiseHtml(raw: string): string {
  // 1. Remove <script> blocks (case-insensitive, dotAll for multi-line content)
  let result = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');

  // 2. Remove on* event attributes (e.g. onclick="...", onmouseover='...', onerror=handler)
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // 3. Replace javascript: URI schemes in href and src attributes with #
  result = result.replace(
    /((?:href|src)\s*=\s*)(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi,
    '$1"#"',
  );

  return result;
}
