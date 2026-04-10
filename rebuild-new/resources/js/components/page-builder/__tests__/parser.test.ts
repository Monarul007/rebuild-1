import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseHtmlToNodes } from '../utils/parser';
import { serialiseNodes } from '../utils/serialiser';
import type { SectionNode } from '../types';

// ---------------------------------------------------------------------------
// Structural equivalence helpers
// ---------------------------------------------------------------------------

/**
 * Compares two SectionNode arrays for structural equivalence:
 * same tags, textContent, classes, attrs, and tree structure.
 * NodeIds are intentionally excluded (they are regenerated on each parse).
 */
function structurallyEqual(a: SectionNode[], b: SectionNode[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((nodeA, i) => nodesEqual(nodeA, b[i]));
}

function nodesEqual(a: SectionNode, b: SectionNode): boolean {
  if (a.tag !== b.tag) return false;
  if ((a.textContent ?? '') !== (b.textContent ?? '')) return false;
  if (!classesEqual(a.classes, b.classes)) return false;
  if (!attrsEqual(a.attrs ?? {}, b.attrs ?? {})) return false;
  if (!structurallyEqual(a.children, b.children)) return false;
  return true;
}

function classesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((cls, i) => cls === b[i]);
}

function attrsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k, i) => k === keysB[i] && a[k] === b[k]);
}

// ---------------------------------------------------------------------------
// Constrained HTML snippet generators
// ---------------------------------------------------------------------------

// A set of known-good HTML templates that survive a parse → serialise → parse round-trip.
// We use fc.constantFrom to avoid arbitrary strings that may not be valid HTML.
const simpleSnippets = [
  '<p>Hello world</p>',
  '<h1>Title</h1>',
  '<h2 class="text-xl font-bold">Subtitle</h2>',
  '<div class="container"><p>Inner text</p></div>',
  '<section class="hero bg-blue-500"><h1>Hero</h1><p>Subtext</p></section>',
  '<ul><li>Item one</li><li>Item two</li></ul>',
  '<a href="https://example.com">Link text</a>',
  '<button class="btn btn-primary">Click me</button>',
  '<div><span>Span text</span></div>',
  '<article><h2>Article title</h2><p>Article body</p></article>',
  '<header class="flex items-center"><h1>Logo</h1></header>',
  '<footer><p>Footer text</p></footer>',
  '<div class="grid grid-cols-3"><div>Col 1</div><div>Col 2</div><div>Col 3</div></div>',
  '<p class="text-sm text-gray-500">Small muted text</p>',
  '<h3>Heading three</h3>',
];

const arbitraryHtmlSnippet = fc.constantFrom(...simpleSnippets);

// ---------------------------------------------------------------------------
// Property 15: HTML parser round-trip
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 15: HTML parser round-trip
describe('Property 15: HTML parser round-trip', () => {
  it('parseHtmlToNodes(serialiseNodes(parseHtmlToNodes(html))) is structurally equivalent to parseHtmlToNodes(html)', async () => {
    // Validates: Requirements 12.1, 12.2, 12.3
    await fc.assert(
      fc.asyncProperty(arbitraryHtmlSnippet, async (html) => {
        // First parse
        const nodes1 = await parseHtmlToNodes(html);

        // Serialise back to HTML
        const serialised = serialiseNodes(nodes1);

        // Second parse of the serialised HTML
        const nodes2 = await parseHtmlToNodes(serialised);

        // Assert structural equivalence
        expect(structurallyEqual(nodes1, nodes2)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Helpers for Property 16
// ---------------------------------------------------------------------------

/**
 * Recursively walks a SectionNode tree and returns true if any node has
 * tag === 'script' at any depth.
 */
function containsScriptNode(nodes: SectionNode[]): boolean {
  for (const node of nodes) {
    if (node.tag === 'script') return true;
    if (node.children.length > 0 && containsScriptNode(node.children)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Arbitrary HTML strings that contain <script> elements
// ---------------------------------------------------------------------------

// Base HTML snippets (without scripts) to inject scripts into
const baseSnippets = [
  '<p>Hello world</p>',
  '<div class="container"><p>Content</p></div>',
  '<section><h1>Title</h1></section>',
  '<article><p>Body text</p></article>',
  '<header><h1>Logo</h1></header>',
];

// Script injection positions: prepend, append, or wrap
const scriptVariants = [
  (base: string) => `<script>alert('xss')</script>${base}`,
  (base: string) => `${base}<script>document.cookie</script>`,
  (base: string) => `<script src="evil.js"></script>${base}`,
  (base: string) => `${base}<script type="text/javascript">var x=1;</script>`,
  (base: string) => `<div><script>evil()</script>${base}</div>`,
  (base: string) => `<SCRIPT>alert(1)</SCRIPT>${base}`,
  (base: string) => `${base}<script>\nvar a = 1;\n</script>`,
];

const arbitraryHtmlWithScript = fc
  .tuple(
    fc.constantFrom(...baseSnippets),
    fc.constantFrom(...scriptVariants),
  )
  .map(([base, inject]) => inject(base));

// ---------------------------------------------------------------------------
// Property 16: Script tags absent from parsed SectionNode tree
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 16: Script tags absent from parsed SectionNode tree
describe('Property 16: Script tags absent from parsed SectionNode tree', () => {
  it('no node has tag === "script" at any depth after sanitise + parse', async () => {
    // Validates: Requirements 12.4, 15.1, 15.3
    const { sanitiseHtml } = await import('../utils/sanitise');

    await fc.assert(
      fc.asyncProperty(arbitraryHtmlWithScript, async (html) => {
        const sanitised = sanitiseHtml(html);
        const nodes = await parseHtmlToNodes(sanitised);
        expect(containsScriptNode(nodes)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests: DOMParser fallback to htmlparser2 (Requirement 12.5)
// ---------------------------------------------------------------------------

describe('DOMParser fallback to htmlparser2', () => {
  const sampleHtml = '<div class="hero"><h1>Hello</h1><p>World</p></div>';

  it('falls back to htmlparser2 when DOMParser throws', async () => {
    // Simulate DOMParser failure by replacing the global with a throwing constructor
    const OriginalDOMParser = globalThis.DOMParser;
    globalThis.DOMParser = class {
      parseFromString(): Document {
        throw new Error('DOMParser simulated failure');
      }
    } as unknown as typeof DOMParser;

    try {
      const nodes = await parseHtmlToNodes(sampleHtml);

      // htmlparser2 should still produce a valid SectionNode array
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBeGreaterThan(0);

      // Root node should be the div
      const root = nodes[0];
      expect(root.tag).toBe('div');
      expect(root.classes).toContain('hero');

      // Children should include h1 and p
      const childTags = root.children.map((c) => c.tag);
      expect(childTags).toContain('h1');
      expect(childTags).toContain('p');

      // Every node must have the required SectionNode fields
      function assertValidNode(node: SectionNode): void {
        expect(typeof node.id).toBe('string');
        expect(node.id.length).toBeGreaterThan(0);
        expect(['preset', 'custom-html', 'scratch']).toContain(node.type);
        expect(typeof node.tag).toBe('string');
        expect(Array.isArray(node.classes)).toBe(true);
        expect(Array.isArray(node.children)).toBe(true);
        node.children.forEach(assertValidNode);
      }
      nodes.forEach(assertValidNode);
    } finally {
      // Restore original DOMParser
      globalThis.DOMParser = OriginalDOMParser;
    }
  });

  it('falls back to htmlparser2 when DOMParser returns a parseerror document', async () => {
    const OriginalDOMParser = globalThis.DOMParser;

    // Simulate a parseerror document: querySelector('parsererror') returns a truthy element
    globalThis.DOMParser = class {
      parseFromString(): Document {
        return {
          querySelector(selector: string) {
            if (selector === 'parsererror') {
              return { tagName: 'parsererror' }; // truthy — signals parse failure
            }
            return null;
          },
          body: { childNodes: [] },
        } as unknown as Document;
      }
    } as unknown as typeof DOMParser;

    try {
      const nodes = await parseHtmlToNodes(sampleHtml);

      // htmlparser2 fallback should produce a valid SectionNode array
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBeGreaterThan(0);

      const root = nodes[0];
      expect(root.tag).toBe('div');
      expect(root.classes).toContain('hero');

      const childTags = root.children.map((c) => c.tag);
      expect(childTags).toContain('h1');
      expect(childTags).toContain('p');
    } finally {
      globalThis.DOMParser = OriginalDOMParser;
    }
  });

  it('produces non-empty SectionNode array via htmlparser2 for various HTML snippets', async () => {
    const OriginalDOMParser = globalThis.DOMParser;
    globalThis.DOMParser = class {
      parseFromString(): Document {
        throw new Error('DOMParser unavailable');
      }
    } as unknown as typeof DOMParser;

    const snippets = [
      '<p>Simple paragraph</p>',
      '<h1 class="text-4xl">Big heading</h1>',
      '<section><h2>Section title</h2><p>Body</p></section>',
      '<ul><li>One</li><li>Two</li></ul>',
    ];

    try {
      for (const html of snippets) {
        const nodes = await parseHtmlToNodes(html);
        expect(Array.isArray(nodes)).toBe(true);
        expect(nodes.length).toBeGreaterThan(0);
        expect(typeof nodes[0].id).toBe('string');
        expect(nodes[0].id.length).toBeGreaterThan(0);
      }
    } finally {
      globalThis.DOMParser = OriginalDOMParser;
    }
  });
});
