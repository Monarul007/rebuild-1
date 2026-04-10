import { nanoid } from 'nanoid';
import type { SectionNode } from '../types';

/**
 * Converts a DOM Element into a SectionNode recursively.
 * Skips script elements and whitespace-only text nodes.
 * Handles mixed content (text nodes interleaved with element children).
 */
function domElementToNode(el: Element): SectionNode {
  const tag = el.tagName.toLowerCase();

  // Collect attrs (excluding class)
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name !== 'class') {
      attrs[attr.name] = attr.value;
    }
  }

  // Classes from class attribute
  const classAttr = el.getAttribute('class') ?? '';
  const classes = classAttr.trim() ? classAttr.trim().split(/\s+/) : [];

  // Check if there are any element children (ignoring script)
  const elementChildren = Array.from(el.childNodes).filter(
    (child) =>
      child.nodeType === 1 &&
      (child as Element).tagName.toLowerCase() !== 'script',
  );

  // Mixed content: element has both text nodes and element children.
  // Represent each child node (text or element) as a SectionNode so nothing is lost.
  const hasMixedContent =
    elementChildren.length > 0 &&
    Array.from(el.childNodes).some(
      (child) =>
        child.nodeType === 3 /* TEXT_NODE */ &&
        child.textContent?.trim(),
    );

  if (hasMixedContent || elementChildren.length > 0) {
    const children: SectionNode[] = [];
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 1 /* ELEMENT_NODE */) {
        const childEl = child as Element;
        if (childEl.tagName.toLowerCase() === 'script') continue;
        children.push(domElementToNode(childEl));
      } else if (child.nodeType === 3 /* TEXT_NODE */) {
        const text = child.textContent ?? '';
        if (text.trim()) {
          // Represent bare text nodes as <span> wrappers so they render correctly
          children.push({
            id: nanoid(10),
            type: 'custom-html',
            tag: 'span',
            textContent: text,
            attrs: {},
            classes: [],
            overrides: {},
            children: [],
          });
        }
      }
    }
    return {
      id: nanoid(10),
      type: 'custom-html',
      tag,
      attrs,
      classes,
      overrides: {},
      children,
    };
  }

  // Leaf node: no element children — store textContent directly
  const text = el.textContent ?? '';
  return {
    id: nanoid(10),
    type: 'custom-html',
    tag,
    ...(text.trim() ? { textContent: text } : {}),
    attrs,
    classes,
    overrides: {},
    children: [],
  };
}

/**
 * Parses an HTML string using htmlparser2 (works in Node/test environments).
 * Returns an array of top-level SectionNodes.
 */
async function parseWithHtmlParser2(html: string): Promise<SectionNode[]> {
  const { parseDocument } = await import('htmlparser2');
  const { Element, Text } = await import('domhandler');

  const doc = parseDocument(html);
  const nodes: SectionNode[] = [];

  function processNode(node: unknown): SectionNode | null {
    if (node instanceof Element) {
      const tag = node.name.toLowerCase();
      if (tag === 'script') return null;

      const attrs: Record<string, string> = {};
      for (const [key, val] of Object.entries(node.attribs ?? {})) {
        if (key !== 'class') {
          attrs[key] = val ?? '';
        }
      }

      const classAttr = node.attribs?.class ?? '';
      const classes = classAttr.trim() ? classAttr.trim().split(/\s+/) : [];

      // Check for mixed content (text nodes alongside element children)
      const elementKids = (node.children ?? []).filter((c) => c instanceof Element);
      const hasTextKids = (node.children ?? []).some(
        (c) => c instanceof Text && c.data.trim(),
      );
      const hasMixed = elementKids.length > 0 && hasTextKids;

      if (hasMixed || elementKids.length > 0) {
        const children: SectionNode[] = [];
        for (const child of node.children ?? []) {
          if (child instanceof Element) {
            const parsed = processNode(child);
            if (parsed) children.push(parsed);
          } else if (child instanceof Text) {
            const text = child.data.trim();
            if (text) {
              children.push({
                id: nanoid(10),
                type: 'custom-html',
                tag: 'span',
                textContent: child.data,
                attrs: {},
                classes: [],
                overrides: {},
                children: [],
              });
            }
          }
        }
        return {
          id: nanoid(10),
          type: 'custom-html',
          tag,
          attrs,
          classes,
          overrides: {},
          children,
        };
      }

      // Leaf: gather direct text content
      const textParts: string[] = [];
      for (const child of node.children ?? []) {
        if (child instanceof Text) {
          textParts.push(child.data);
        }
      }
      const text = textParts.join('').trim();

      return {
        id: nanoid(10),
        type: 'custom-html',
        tag,
        ...(text ? { textContent: text } : {}),
        attrs,
        classes,
        overrides: {},
        children: [],
      };
    }

    if (node instanceof Text) {
      const text = node.data.trim();
      if (text) {
        return {
          id: nanoid(10),
          type: 'custom-html',
          tag: 'span',
          textContent: node.data,
          attrs: {},
          classes: [],
          overrides: {},
          children: [],
        };
      }
    }

    return null;
  }

  for (const child of doc.children) {
    const parsed = processNode(child);
    if (parsed) nodes.push(parsed);
  }

  return nodes;
}

/**
 * Parses an HTML string into a SectionNode array.
 *
 * Strategy:
 *  1. Try browser-native DOMParser.
 *  2. If DOMParser throws or returns a parseerror document, fall back to htmlparser2.
 *
 * Works in both browser and Node/test environments.
 */
export async function parseHtmlToNodes(html: string): Promise<SectionNode[]> {
  // Attempt DOMParser (browser environment)
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Check for parse error
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        return parseWithHtmlParser2(html);
      }

      // Convert body children to SectionNodes (skip script tags)
      const nodes: SectionNode[] = [];
      for (const child of Array.from(doc.body.childNodes)) {
        if (child.nodeType === 1 /* ELEMENT_NODE */) {
          const el = child as Element;
          if (el.tagName.toLowerCase() === 'script') continue;
          nodes.push(domElementToNode(el));
        } else if (child.nodeType === 3 /* TEXT_NODE */) {
          const text = child.textContent ?? '';
          if (text.trim()) {
            nodes.push({
              id: nanoid(10),
              type: 'custom-html',
              tag: 'span',
              textContent: text,
              attrs: {},
              classes: [],
              overrides: {},
              children: [],
            });
          }
        }
      }
      return nodes;
    } catch {
      // DOMParser threw — fall through to htmlparser2
    }
  }

  // Fallback: htmlparser2 (Node/test environment or DOMParser failure)
  return parseWithHtmlParser2(html);
}
