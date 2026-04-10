import type { SectionNode } from '../types';

const SELF_CLOSING_TAGS = new Set(['img', 'hr', 'br', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr']);

/**
 * Serialises a single SectionNode to an HTML string at the given indent depth.
 */
function serialiseNode(node: SectionNode, depth: number): string {
  const indent = '  '.repeat(depth);
  const { tag, classes, attrs = {}, textContent, children } = node;

  // Build attribute string
  const attrParts: string[] = [];

  if (classes.length > 0) {
    attrParts.push(`class="${classes.join(' ')}"`);
  }

  for (const [key, val] of Object.entries(attrs)) {
    // Escape double quotes in attribute values
    attrParts.push(`${key}="${val.replace(/"/g, '&quot;')}"`);
  }

  const attrStr = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';

  if (SELF_CLOSING_TAGS.has(tag)) {
    return `${indent}<${tag}${attrStr} />`;
  }

  // No children and no text content
  if (children.length === 0 && !textContent) {
    return `${indent}<${tag}${attrStr}></${tag}>`;
  }

  // Has text content only (no element children)
  if (children.length === 0 && textContent) {
    return `${indent}<${tag}${attrStr}>${textContent}</${tag}>`;
  }

  // Has element children — pretty-print with indentation
  const childLines = children.map((child) => serialiseNode(child, depth + 1));
  const inner = childLines.join('\n');
  return `${indent}<${tag}${attrStr}>\n${inner}\n${indent}</${tag}>`;
}

/**
 * Serialises a SectionNode array back to a pretty-printed HTML string.
 * Uses 2-space indentation per depth level.
 * Self-closing tags (img, hr, br, input, meta, link, …) are rendered as `<tag attrs />`.
 */
export function serialiseNodes(nodes: SectionNode[]): string {
  return nodes.map((node) => serialiseNode(node, 0)).join('\n');
}
