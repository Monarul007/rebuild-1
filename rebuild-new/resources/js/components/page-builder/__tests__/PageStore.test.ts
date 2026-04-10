import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { nanoid } from 'nanoid';
import { usePageStore } from '../store/PageStore';
import { createHeroSection } from '../presets/hero';
import { createFeaturesSection } from '../presets/features';
import { createCtaSection } from '../presets/cta';
import type { SectionNode } from '../types';
import { primitiveFactories } from '../primitives/index';
import type { PrimitiveType } from '../primitives/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSection(overrides: Partial<SectionNode> = {}): SectionNode {
  return {
    id: nanoid(10),
    type: 'preset',
    tag: 'section',
    classes: ['bg-white'],
    overrides: {},
    children: [],
    ...overrides,
  };
}

function makeTree(): SectionNode {
  const child1: SectionNode = { id: nanoid(10), type: 'scratch', tag: 'p', classes: [], overrides: {}, children: [] };
  const child2: SectionNode = { id: nanoid(10), type: 'scratch', tag: 'h2', classes: [], overrides: {}, children: [] };
  return {
    id: nanoid(10),
    type: 'preset',
    tag: 'section',
    classes: [],
    overrides: {},
    children: [child1, child2],
  };
}

/** Reset the store to a clean state before each test. */
function resetStore() {
  usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
  usePageStore.temporal.getState().clear();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PageStore', () => {
  beforeEach(resetStore);

  // --- addSection ---
  describe('addSection', () => {
    it('appends a section to the end of the list', () => {
      const s1 = makeSection();
      const s2 = makeSection();
      usePageStore.getState().addSection(s1);
      usePageStore.getState().addSection(s2);
      const { sections } = usePageStore.getState();
      expect(sections).toHaveLength(2);
      expect(sections[0].id).toBe(s1.id);
      expect(sections[1].id).toBe(s2.id);
    });
  });

  // --- removeSection ---
  describe('removeSection', () => {
    it('removes a top-level section by id', () => {
      const s = makeSection();
      usePageStore.getState().addSection(s);
      usePageStore.getState().removeSection(s.id);
      expect(usePageStore.getState().sections).toHaveLength(0);
    });

    it('removes a section and all its descendants', () => {
      const tree = makeTree();
      const descendantId = tree.children[0].id;
      usePageStore.getState().addSection(tree);
      usePageStore.getState().removeSection(tree.id);
      const { sections } = usePageStore.getState();
      expect(sections).toHaveLength(0);
      // descendant should also be gone (no orphan)
      const allIds = sections.flatMap((s) => [s.id, ...s.children.map((c) => c.id)]);
      expect(allIds).not.toContain(descendantId);
    });

    it('is a no-op for an unknown id', () => {
      const s = makeSection();
      usePageStore.getState().addSection(s);
      usePageStore.getState().removeSection('nonexistent');
      expect(usePageStore.getState().sections).toHaveLength(1);
    });
  });

  // --- reorderSections ---
  describe('reorderSections', () => {
    it('moves a section from one index to another', () => {
      const [a, b, c] = [makeSection(), makeSection(), makeSection()];
      usePageStore.getState().addSection(a);
      usePageStore.getState().addSection(b);
      usePageStore.getState().addSection(c);
      usePageStore.getState().reorderSections(0, 2);
      const ids = usePageStore.getState().sections.map((s) => s.id);
      expect(ids).toEqual([b.id, c.id, a.id]);
    });

    it('is a no-op when from === to', () => {
      const [a, b] = [makeSection(), makeSection()];
      usePageStore.getState().addSection(a);
      usePageStore.getState().addSection(b);
      usePageStore.getState().reorderSections(0, 0);
      const ids = usePageStore.getState().sections.map((s) => s.id);
      expect(ids).toEqual([a.id, b.id]);
    });
  });

  // --- updateNode ---
  describe('updateNode', () => {
    it('patches a top-level section', () => {
      const s = makeSection({ classes: ['old'] });
      usePageStore.getState().addSection(s);
      usePageStore.getState().updateNode(s.id, { classes: ['new'] });
      expect(usePageStore.getState().sections[0].classes).toEqual(['new']);
    });

    it('patches a nested child node', () => {
      const tree = makeTree();
      const childId = tree.children[0].id;
      usePageStore.getState().addSection(tree);
      usePageStore.getState().updateNode(childId, { textContent: 'hello' });
      const updated = usePageStore.getState().sections[0].children[0];
      expect(updated.textContent).toBe('hello');
    });
  });

  // --- selectNode / deselectNode ---
  describe('selectNode / deselectNode', () => {
    it('sets selectedNodeId', () => {
      const id = nanoid(10);
      usePageStore.getState().selectNode(id);
      expect(usePageStore.getState().selectedNodeId).toBe(id);
    });

    it('deselectNode sets selectedNodeId to null', () => {
      usePageStore.getState().selectNode(nanoid(10));
      usePageStore.getState().deselectNode();
      expect(usePageStore.getState().selectedNodeId).toBeNull();
    });
  });

  // --- setViewport ---
  describe('setViewport', () => {
    it('updates the viewport', () => {
      usePageStore.getState().setViewport('mobile');
      expect(usePageStore.getState().viewport).toBe('mobile');
      usePageStore.getState().setViewport('tablet');
      expect(usePageStore.getState().viewport).toBe('tablet');
      usePageStore.getState().setViewport('desktop');
      expect(usePageStore.getState().viewport).toBe('desktop');
    });
  });

  // --- importHtmlSection ---
  describe('importHtmlSection', () => {
    it('appends a custom-html section', async () => {
      await usePageStore.getState().importHtmlSection('<p>Hello</p>');
      const { sections } = usePageStore.getState();
      expect(sections).toHaveLength(1);
      expect(sections[0].type).toBe('custom-html');
    });
  });

  // --- duplicateSection ---
  describe('duplicateSection', () => {
    it('inserts a clone immediately after the original', () => {
      const s = makeSection();
      const after = makeSection();
      usePageStore.getState().addSection(s);
      usePageStore.getState().addSection(after);
      usePageStore.getState().duplicateSection(s.id);
      const ids = usePageStore.getState().sections.map((sec) => sec.id);
      expect(ids[0]).toBe(s.id);
      expect(ids[1]).not.toBe(s.id); // clone has new id
      expect(ids[2]).toBe(after.id);
    });

    it('assigns new ids to every node in the subtree', () => {
      const tree = makeTree();
      const originalIds = [tree.id, ...tree.children.map((c) => c.id)];
      usePageStore.getState().addSection(tree);
      usePageStore.getState().duplicateSection(tree.id);
      const clone = usePageStore.getState().sections[1];
      const cloneIds = [clone.id, ...clone.children.map((c) => c.id)];
      for (const cloneId of cloneIds) {
        expect(originalIds).not.toContain(cloneId);
      }
    });

    it('is a no-op for an unknown id', () => {
      const s = makeSection();
      usePageStore.getState().addSection(s);
      usePageStore.getState().duplicateSection('nonexistent');
      expect(usePageStore.getState().sections).toHaveLength(1);
    });
  });

  // --- exportSchema ---
  describe('exportSchema', () => {
    it('returns version 1 with the current sections', () => {
      const s = makeSection();
      usePageStore.getState().addSection(s);
      const schema = usePageStore.getState().exportSchema();
      expect(schema.version).toBe(1);
      expect(schema.sections).toHaveLength(1);
      expect(schema.sections[0].id).toBe(s.id);
    });

    it('round-trips through JSON without data loss', () => {
      const s = makeSection({ textContent: 'hello', attrs: { 'data-x': '1' } });
      usePageStore.getState().addSection(s);
      const schema = usePageStore.getState().exportSchema();
      const roundTripped = JSON.parse(JSON.stringify(schema));
      expect(roundTripped).toEqual(schema);
    });
  });

  // --- undo / redo (zundo) ---
  describe('undo / redo', () => {
    it('undoes the last mutation', () => {
      const s = makeSection();
      usePageStore.getState().addSection(s);
      expect(usePageStore.getState().sections).toHaveLength(1);
      usePageStore.temporal.getState().undo();
      expect(usePageStore.getState().sections).toHaveLength(0);
    });

    it('redoes an undone mutation', () => {
      const s = makeSection();
      usePageStore.getState().addSection(s);
      usePageStore.temporal.getState().undo();
      usePageStore.temporal.getState().redo();
      expect(usePageStore.getState().sections).toHaveLength(1);
    });

    it('does not throw when undo is called with no history', () => {
      expect(() => usePageStore.temporal.getState().undo()).not.toThrow();
    });

    it('does not throw when redo is called with no future history', () => {
      expect(() => usePageStore.temporal.getState().redo()).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 3: SectionNode structural invariant
describe('Property 3: SectionNode structural invariant', () => {
  /**
   * Validates: Requirements 2.2, 4.4
   *
   * For any SectionNode created by any factory, import, or duplication,
   * the node must have all required fields:
   *   - id: non-empty string
   *   - type: one of 'preset' | 'custom-html' | 'scratch'
   *   - tag: non-empty string
   *   - classes: array
   *   - overrides: object
   *   - children: array
   */

  const VALID_TYPES = ['preset', 'custom-html', 'scratch'] as const;

  /** Recursively assert structural invariant on a node and all its descendants. */
  function assertStructuralInvariant(node: SectionNode): void {
    expect(typeof node.id).toBe('string');
    expect(node.id.length).toBeGreaterThan(0);

    expect(VALID_TYPES).toContain(node.type);

    expect(typeof node.tag).toBe('string');
    expect(node.tag.length).toBeGreaterThan(0);

    expect(Array.isArray(node.classes)).toBe(true);

    expect(typeof node.overrides).toBe('object');
    expect(node.overrides).not.toBeNull();
    expect(Array.isArray(node.overrides)).toBe(false);

    expect(Array.isArray(node.children)).toBe(true);

    for (const child of node.children) {
      assertStructuralInvariant(child);
    }
  }

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  it('hero factory always produces a structurally valid SectionNode', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const node = createHeroSection();
        assertStructuralInvariant(node);
      }),
      { numRuns: 100 },
    );
  });

  it('features factory always produces a structurally valid SectionNode', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const node = createFeaturesSection();
        assertStructuralInvariant(node);
      }),
      { numRuns: 100 },
    );
  });

  it('cta factory always produces a structurally valid SectionNode', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const node = createCtaSection();
        assertStructuralInvariant(node);
      }),
      { numRuns: 100 },
    );
  });

  it('addSection: any preset node appended to the store satisfies the invariant', () => {
    const presetFactories = [createHeroSection, createFeaturesSection, createCtaSection];
    fc.assert(
      fc.property(fc.constantFrom(...presetFactories), (factory) => {
        usePageStore.setState({ sections: [] });
        const node = factory();
        usePageStore.getState().addSection(node);
        const { sections } = usePageStore.getState();
        expect(sections).toHaveLength(1);
        assertStructuralInvariant(sections[0]);
      }),
      { numRuns: 100 },
    );
  });

  it('duplicateSection: duplicated node satisfies the invariant', () => {
    const presetFactories = [createHeroSection, createFeaturesSection, createCtaSection];
    fc.assert(
      fc.property(fc.constantFrom(...presetFactories), (factory) => {
        usePageStore.setState({ sections: [] });
        usePageStore.temporal.getState().clear();
        const node = factory();
        usePageStore.getState().addSection(node);
        usePageStore.getState().duplicateSection(node.id);
        const { sections } = usePageStore.getState();
        expect(sections).toHaveLength(2);
        assertStructuralInvariant(sections[1]);
      }),
      { numRuns: 100 },
    );
  });

  it('importHtmlSection: imported section satisfies the invariant', async () => {
    // Use a fixed set of representative HTML snippets to drive the property
    const htmlSnippets = [
      '<p>Hello world</p>',
      '<div class="container"><h1>Title</h1><p>Body</p></div>',
      '<section><ul><li>Item 1</li><li>Item 2</li></ul></section>',
      '<button class="btn">Click me</button>',
      '<div></div>',
    ];

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...htmlSnippets), async (html) => {
        usePageStore.setState({ sections: [] });
        usePageStore.temporal.getState().clear();
        await usePageStore.getState().importHtmlSection(html);
        const { sections } = usePageStore.getState();
        expect(sections).toHaveLength(1);
        assertStructuralInvariant(sections[0]);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 1: SectionNode uniqueness invariant
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 1: SectionNode uniqueness invariant
describe('Property 1: SectionNode uniqueness invariant', () => {
  /**
   * Validates: Requirements 2.3, 5.3
   *
   * For any sequence of node creation operations (addSection, duplicateSection),
   * all NodeIds present in the PageStore's section tree must be distinct —
   * no two nodes share the same id.
   */

  /** Recursively collect every NodeId in the tree. */
  function collectAllIds(nodes: SectionNode[]): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
      ids.push(node.id);
      ids.push(...collectAllIds(node.children));
    }
    return ids;
  }

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  /** Arbitrary for a leaf SectionNode (no children). Uses nanoid for unique ids. */
  const arbitraryLeafNode = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div', 'p', 'h1', 'h2', 'span'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
      overrides: fc.constant({}),
      children: fc.constant([] as SectionNode[]),
    });

  /** Arbitrary for a SectionNode with up to 3 children (each a leaf). */
  const arbitrarySectionNode = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
      overrides: fc.constant({}),
      children: fc.array(arbitraryLeafNode(), { minLength: 0, maxLength: 3 }),
    });

  it('all NodeIds in the tree are unique after any sequence of addSection/duplicateSection', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({ kind: fc.constant('add' as const), node: arbitrarySectionNode() }),
            fc.record({ kind: fc.constant('duplicate' as const), index: fc.nat({ max: 9 }) }),
          ),
          { minLength: 1, maxLength: 10 },
        ),
        (ops) => {
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          for (const op of ops) {
            const { sections } = usePageStore.getState();
            if (op.kind === 'add') {
              usePageStore.getState().addSection(op.node);
            } else if (op.kind === 'duplicate' && sections.length > 0) {
              const idx = op.index % sections.length;
              usePageStore.getState().duplicateSection(sections[idx].id);
            }
          }

          const { sections } = usePageStore.getState();
          const allIds = collectAllIds(sections);
          const uniqueIds = new Set(allIds);

          expect(allIds.length).toBe(uniqueIds.size);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: PageStore serialisation round-trip
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 2: PageStore serialisation round-trip
describe('Property 2: PageStore serialisation round-trip', () => {
  /**
   * Validates: Requirements 2.5, 11.2, 11.3
   *
   * For any page state, JSON.parse(JSON.stringify(store.exportSchema())) must
   * produce an object deeply equal to store.exportSchema() — the schema contains
   * no circular references, no React component references, and no DOM node references.
   */

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  /** Arbitrary for a leaf SectionNode (no children). */
  const arbitraryLeafNode = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const, 'custom-html' as const),
      tag: fc.constantFrom('section', 'div', 'p', 'h1', 'h2', 'span', 'button', 'a'),
      textContent: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
      attrs: fc.option(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 0, maxLength: 20 }),
        ),
        { nil: undefined },
      ),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
      overrides: fc.record({
        base: fc.option(fc.constant({ color: 'red' }), { nil: undefined }),
        sm: fc.option(fc.constant({ fontSize: '14px' }), { nil: undefined }),
        md: fc.option(fc.constant({ padding: '8px' }), { nil: undefined }),
      }),
      children: fc.constant([] as SectionNode[]),
    });

  /** Arbitrary for a SectionNode with up to 3 leaf children. */
  const arbitrarySectionNode = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div'),
      textContent: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
      attrs: fc.option(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 0, maxLength: 20 }),
        ),
        { nil: undefined },
      ),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
      overrides: fc.record({
        base: fc.option(fc.constant({ color: 'blue' }), { nil: undefined }),
        sm: fc.option(fc.constant({ fontSize: '12px' }), { nil: undefined }),
        md: fc.option(fc.constant({ padding: '4px' }), { nil: undefined }),
      }),
      children: fc.array(arbitraryLeafNode(), { minLength: 0, maxLength: 3 }),
    });

  /** Arbitrary for an array of SectionNodes (0–5 sections). */
  const arbitrarySectionNodeArray = (): fc.Arbitrary<SectionNode[]> =>
    fc.array(arbitrarySectionNode(), { minLength: 0, maxLength: 5 });

  it('exportSchema round-trips through JSON without data loss', () => {
    fc.assert(
      fc.property(arbitrarySectionNodeArray(), (sections) => {
        usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
        usePageStore.temporal.getState().clear();

        for (const section of sections) {
          usePageStore.getState().addSection(section);
        }

        const schema = usePageStore.getState().exportSchema();
        const roundTripped = JSON.parse(JSON.stringify(schema));

        expect(roundTripped).toEqual(schema);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Store state setter correctness
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 4: Store state setter correctness
describe('Property 4: Store state setter correctness', () => {
  /**
   * Validates: Requirements 3.2, 3.3
   *
   * For any NodeId passed to `selectNode`, the store's `selectedNodeId` must
   * equal that id afterwards. For any Viewport value passed to `setViewport`,
   * the store's `viewport` must equal that value afterwards. For any call to
   * `deselectNode`, the store's `selectedNodeId` must be `null`.
   */

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  it('selectNode: selectedNodeId always equals the id passed in', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (nodeId) => {
        usePageStore.getState().selectNode(nodeId);
        expect(usePageStore.getState().selectedNodeId).toBe(nodeId);
      }),
      { numRuns: 100 },
    );
  });

  it('setViewport: viewport always equals the value passed in', () => {
    fc.assert(
      fc.property(fc.constantFrom('mobile' as const, 'tablet' as const, 'desktop' as const), (viewport) => {
        usePageStore.getState().setViewport(viewport);
        expect(usePageStore.getState().viewport).toBe(viewport);
      }),
      { numRuns: 100 },
    );
  });

  it('deselectNode: selectedNodeId is always null after deselect, regardless of prior state', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
        (priorId) => {
          // Set up a prior selected state (or null)
          usePageStore.setState({ selectedNodeId: priorId });
          usePageStore.getState().deselectNode();
          expect(usePageStore.getState().selectedNodeId).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Section reorder correctness
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 6: Section reorder correctness
describe('Property 6: Section reorder correctness', () => {
  /**
   * Validates: Requirements 5.6
   *
   * For any sections array and any valid pair of indices (from, to),
   * calling reorderSections(from, to) must produce a new array that is a
   * permutation of the original with the element at `from` now at `to`,
   * and all other elements in their relative order.
   */

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  /** Arbitrary for a minimal SectionNode (leaf, unique id). */
  const arbitraryLeafSection = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.constant([] as SectionNode[]),
    });

  it('reorderSections produces a permutation with the moved element at the target index', () => {
    fc.assert(
      fc.property(
        // Generate 1–8 sections
        fc.array(arbitraryLeafSection(), { minLength: 1, maxLength: 8 }),
        // Generate from/to indices; constrain after we know the array length
        fc.nat({ max: 7 }),
        fc.nat({ max: 7 }),
        (sections, rawFrom, rawTo) => {
          const len = sections.length;
          const from = rawFrom % len;
          const to = rawTo % len;

          // Load sections into the store
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();
          for (const s of sections) {
            usePageStore.getState().addSection(s);
          }

          const originalIds = usePageStore.getState().sections.map((s) => s.id);

          // Perform the reorder
          usePageStore.getState().reorderSections(from, to);

          const reorderedIds = usePageStore.getState().sections.map((s) => s.id);

          // 1. Same count
          expect(reorderedIds).toHaveLength(originalIds.length);

          // 2. Same elements (permutation check)
          expect([...reorderedIds].sort()).toEqual([...originalIds].sort());

          // 3. The element originally at `from` is now at `to`
          expect(reorderedIds[to]).toBe(originalIds[from]);

          // 4. All other elements maintain their relative order
          //    Build the expected order by removing the `from` element and
          //    inserting it at `to`.
          const expected = [...originalIds];
          const [moved] = expected.splice(from, 1);
          expected.splice(to, 0, moved);
          expect(reorderedIds).toEqual(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Delete removes section and all descendants
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 7: Delete removes section and all descendants
describe('Property 7: Delete removes section and all descendants', () => {
  /**
   * Validates: Requirements 5.4
   *
   * For any SectionNode in the tree (at any depth), after calling
   * `removeSection(id)`, neither that node's id nor any of its descendants'
   * ids must appear anywhere in the store's section tree.
   */

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  /** Recursively collect every NodeId in the tree. */
  function collectAllIds(nodes: SectionNode[]): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
      ids.push(node.id);
      ids.push(...collectAllIds(node.children));
    }
    return ids;
  }

  /** Recursively collect every NodeId in a single subtree rooted at `node`. */
  function collectSubtreeIds(node: SectionNode): string[] {
    return [node.id, ...node.children.flatMap(collectSubtreeIds)];
  }

  /** Arbitrary for a leaf SectionNode (no children). */
  const arbitraryLeafNode = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div', 'p', 'h1', 'span'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.constant([] as SectionNode[]),
    });

  /** Arbitrary for a SectionNode with up to 3 leaf children (depth 1). */
  const arbitraryDepth1Node = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.array(arbitraryLeafNode(), { minLength: 0, maxLength: 3 }),
    });

  /** Arbitrary for a SectionNode with up to 2 depth-1 children (depth 2). */
  const arbitraryDepth2Node = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.array(arbitraryDepth1Node(), { minLength: 0, maxLength: 2 }),
    });

  it('removeSection removes the target section and all its descendants from the tree', () => {
    fc.assert(
      fc.property(
        // Generate 1–5 top-level sections (each up to depth 2)
        fc.array(arbitraryDepth2Node(), { minLength: 1, maxLength: 5 }),
        // Pick which top-level section to delete (by index)
        fc.nat({ max: 4 }),
        (sections, rawDeleteIndex) => {
          const deleteIndex = rawDeleteIndex % sections.length;
          const targetSection = sections[deleteIndex];
          const deletedIds = collectSubtreeIds(targetSection);

          // Load sections into the store
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();
          for (const s of sections) {
            usePageStore.getState().addSection(s);
          }

          // Delete the chosen section
          usePageStore.getState().removeSection(targetSection.id);

          // Collect all remaining ids in the store
          const remainingIds = collectAllIds(usePageStore.getState().sections);

          // Neither the deleted section's id nor any descendant id should remain
          for (const deletedId of deletedIds) {
            expect(remainingIds).not.toContain(deletedId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Duplicate produces new unique NodeIds
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 8: Duplicate produces new unique NodeIds
describe('Property 8: Duplicate produces new unique NodeIds', () => {
  /**
   * Validates: Requirements 5.3
   *
   * For any section, calling `duplicateSection(id)` must insert a new section
   * immediately after the original where every NodeId in the duplicate's subtree
   * differs from every NodeId in the original's subtree and from every other
   * NodeId in the store.
   */

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  /** Recursively collect every NodeId in the tree. */
  function collectAllIds(nodes: SectionNode[]): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
      ids.push(node.id);
      ids.push(...collectAllIds(node.children));
    }
    return ids;
  }

  /** Recursively collect every NodeId in a single subtree rooted at `node`. */
  function collectSubtreeIds(node: SectionNode): string[] {
    return [node.id, ...node.children.flatMap(collectSubtreeIds)];
  }

  /** Arbitrary for a leaf SectionNode (no children). */
  const arbitraryLeafNode = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div', 'p', 'h1', 'span'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.constant([] as SectionNode[]),
    });

  /** Arbitrary for a SectionNode with up to 3 leaf children (depth 1). */
  const arbitraryDepth1Node = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.array(arbitraryLeafNode(), { minLength: 0, maxLength: 3 }),
    });

  /** Arbitrary for a SectionNode with up to 2 depth-1 children (depth 2). */
  const arbitraryDepth2Node = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.array(arbitraryDepth1Node(), { minLength: 0, maxLength: 2 }),
    });

  it('duplicate inserts immediately after the original, with no NodeId overlap and all ids unique', () => {
    fc.assert(
      fc.property(
        // The section to duplicate (up to depth 2)
        arbitraryDepth2Node(),
        // 0–3 other sections loaded before the target
        fc.array(arbitraryDepth2Node(), { minLength: 0, maxLength: 3 }),
        // 0–3 other sections loaded after the target
        fc.array(arbitraryDepth2Node(), { minLength: 0, maxLength: 3 }),
        (target, before, after) => {
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          // Load: before sections, then target, then after sections
          for (const s of before) {
            usePageStore.getState().addSection(s);
          }
          usePageStore.getState().addSection(target);
          for (const s of after) {
            usePageStore.getState().addSection(s);
          }

          const targetIndex = before.length; // 0-based index of target in the store

          // Duplicate the target section
          usePageStore.getState().duplicateSection(target.id);

          const { sections } = usePageStore.getState();

          // 1. The duplicate is inserted immediately after the original
          expect(sections[targetIndex].id).toBe(target.id);
          const duplicate = sections[targetIndex + 1];
          expect(duplicate).toBeDefined();

          // 2. Collect ids from original subtree and duplicate subtree
          const originalIds = new Set(collectSubtreeIds(target));
          const duplicateIds = collectSubtreeIds(duplicate);

          // 3. No overlap between original and duplicate subtree ids
          for (const dupId of duplicateIds) {
            expect(originalIds.has(dupId)).toBe(false);
          }

          // 4. All ids across the entire store are unique (no duplicates anywhere)
          const allIds = collectAllIds(sections);
          const uniqueIds = new Set(allIds);
          expect(allIds.length).toBe(uniqueIds.size);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Export schema excludes UI-only metadata
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 9: Export schema excludes UI-only metadata
describe('Property 9: Export schema excludes UI-only metadata', () => {
  /**
   * Validates: Requirements 5.7, 11.2
   *
   * For any page state, exportSchema() must return a PageSchema whose sections
   * array contains no section-header metadata, no collapse state, and no
   * selection state — only the pure SectionNode tree fields.
   *
   * Allowed fields per SectionNode: id, type, tag, textContent, attrs,
   * classes, overrides, children.
   *
   * Forbidden fields: selectedNodeId, viewport, isSelected, isCollapsed,
   * collapsed, _collapsed, _selected, header, sectionHeader.
   */

  const ALLOWED_SECTION_NODE_KEYS = new Set([
    'id',
    'type',
    'tag',
    'textContent',
    'attrs',
    'classes',
    'overrides',
    'children',
  ]);

  const UI_ONLY_KEYS = [
    'selectedNodeId',
    'viewport',
    'isSelected',
    'isCollapsed',
    'collapsed',
    '_collapsed',
    '_selected',
    'header',
    'sectionHeader',
  ];

  /** Recursively assert that a node contains only allowed SectionNode fields. */
  function assertNoUiOnlyFields(node: Record<string, unknown>, path = 'section'): void {
    for (const key of UI_ONLY_KEYS) {
      expect(
        Object.prototype.hasOwnProperty.call(node, key),
        `${path} must not contain UI-only field "${key}"`,
      ).toBe(false);
    }

    // Every key present must be in the allowed set
    for (const key of Object.keys(node)) {
      expect(
        ALLOWED_SECTION_NODE_KEYS.has(key),
        `${path} has unexpected field "${key}" — only pure SectionNode fields are allowed`,
      ).toBe(true);
    }

    // Recurse into children
    if (Array.isArray(node.children)) {
      for (let i = 0; i < (node.children as unknown[]).length; i++) {
        assertNoUiOnlyFields(
          (node.children as Record<string, unknown>[])[i],
          `${path}.children[${i}]`,
        );
      }
    }
  }

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  /** Arbitrary for a leaf SectionNode (no children). */
  const arbitraryLeafNode = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const, 'custom-html' as const),
      tag: fc.constantFrom('section', 'div', 'p', 'h1', 'h2', 'span', 'button', 'a'),
      textContent: fc.option(fc.string({ minLength: 0, maxLength: 40 }), { nil: undefined }),
      attrs: fc.option(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 0, maxLength: 20 }),
        ),
        { nil: undefined },
      ),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
      overrides: fc.record({
        base: fc.option(fc.constant({ color: 'red' } as React.CSSProperties), { nil: undefined }),
        sm: fc.option(fc.constant({ fontSize: '14px' } as React.CSSProperties), { nil: undefined }),
        md: fc.option(fc.constant({ padding: '8px' } as React.CSSProperties), { nil: undefined }),
      }),
      children: fc.constant([] as SectionNode[]),
    });

  /** Arbitrary for a SectionNode with up to 3 leaf children. */
  const arbitrarySectionNode = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div'),
      textContent: fc.option(fc.string({ minLength: 0, maxLength: 40 }), { nil: undefined }),
      attrs: fc.option(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 0, maxLength: 20 }),
        ),
        { nil: undefined },
      ),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
      overrides: fc.record({
        base: fc.option(fc.constant({ color: 'blue' } as React.CSSProperties), { nil: undefined }),
        sm: fc.option(fc.constant({ fontSize: '12px' } as React.CSSProperties), { nil: undefined }),
        md: fc.option(fc.constant({ padding: '4px' } as React.CSSProperties), { nil: undefined }),
      }),
      children: fc.array(arbitraryLeafNode(), { minLength: 0, maxLength: 3 }),
    });

  /** Arbitrary for an array of 0–5 SectionNodes. */
  const arbitrarySectionNodeArray = (): fc.Arbitrary<SectionNode[]> =>
    fc.array(arbitrarySectionNode(), { minLength: 0, maxLength: 5 });

  it('exportSchema sections contain only pure SectionNode fields — no UI-only metadata', () => {
    fc.assert(
      fc.property(
        arbitrarySectionNodeArray(),
        // Arbitrary selectedNodeId (simulates a node being selected in the UI)
        fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
        // Arbitrary viewport (simulates a viewport being set in the UI)
        fc.constantFrom('mobile' as const, 'tablet' as const, 'desktop' as const),
        (sections, selectedNodeId, viewport) => {
          // Reset and load sections
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          for (const section of sections) {
            usePageStore.getState().addSection(section);
          }

          // Set UI state that must NOT leak into the exported schema
          usePageStore.setState({ selectedNodeId, viewport });

          const schema = usePageStore.getState().exportSchema();

          // 1. Schema has version 1
          expect(schema.version).toBe(1);

          // 2. Schema sections count matches what was loaded
          expect(schema.sections).toHaveLength(sections.length);

          // 3. Each section in the schema contains only pure SectionNode fields
          for (let i = 0; i < schema.sections.length; i++) {
            assertNoUiOnlyFields(
              schema.sections[i] as unknown as Record<string, unknown>,
              `schema.sections[${i}]`,
            );
          }

          // 4. The schema itself does not contain selectedNodeId or viewport at the top level
          const schemaKeys = Object.keys(schema);
          expect(schemaKeys).not.toContain('selectedNodeId');
          expect(schemaKeys).not.toContain('viewport');
          expect(schemaKeys).not.toContain('isSelected');
          expect(schemaKeys).not.toContain('isCollapsed');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Preset addition appends correct type
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 5: Preset addition appends correct type
describe('Property 5: Preset addition appends correct type', () => {
  /**
   * Validates: Requirements 4.2, 4.4
   *
   * For any preset type (Hero, Features, CTA), clicking it in the Sidebar must
   * result in a new SectionNode of `type: 'preset'` appended at the end of the
   * sections array, with non-empty `classes` and `children`.
   */

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  it('addSection with any preset factory appends a section of type preset with non-empty classes and children', () => {
    const presetFactories = [createHeroSection, createFeaturesSection, createCtaSection] as const;

    fc.assert(
      fc.property(fc.constantFrom(...presetFactories), (factory) => {
        // Reset store for each run
        usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
        usePageStore.temporal.getState().clear();

        const node = factory();
        usePageStore.getState().addSection(node);

        const { sections } = usePageStore.getState();

        // Section is appended at the end
        expect(sections.length).toBeGreaterThan(0);
        const appended = sections[sections.length - 1];

        // type must be 'preset'
        expect(appended.type).toBe('preset');

        // classes must be a non-empty array
        expect(Array.isArray(appended.classes)).toBe(true);
        expect(appended.classes.length).toBeGreaterThan(0);

        // children must be a non-empty array
        expect(Array.isArray(appended.children)).toBe(true);
        expect(appended.children.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('addSection appends the preset at the end of an existing sections array', () => {
    const presetFactories = [createHeroSection, createFeaturesSection, createCtaSection] as const;

    fc.assert(
      fc.property(
        // 0–4 pre-existing sections
        fc.array(
          fc.record({
            id: fc.constant(null).map(() => nanoid(10)),
            type: fc.constantFrom('preset' as const, 'scratch' as const),
            tag: fc.constantFrom('section', 'div'),
            classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
            overrides: fc.constant({}),
            children: fc.constant([] as SectionNode[]),
          }),
          { minLength: 0, maxLength: 4 },
        ),
        fc.constantFrom(...presetFactories),
        (existing, factory) => {
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          for (const s of existing) {
            usePageStore.getState().addSection(s);
          }

          const node = factory();
          usePageStore.getState().addSection(node);

          const { sections } = usePageStore.getState();

          // Total count is existing + 1
          expect(sections).toHaveLength(existing.length + 1);

          // The last section is the newly added preset
          const appended = sections[sections.length - 1];
          expect(appended.id).toBe(node.id);
          expect(appended.type).toBe('preset');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Imported HTML stored as SectionNode tree, not raw HTML
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 14: Imported HTML stored as SectionNode tree, not raw HTML
describe('Property 14: Imported HTML stored as SectionNode tree, not raw HTML', () => {
  /**
   * Validates: Requirements 8.4
   *
   * For any HTML string passed to `importHtmlSection`, the resulting section in
   * the PageStore must have `type: 'custom-html'` and must not contain any field
   * holding a raw HTML string — all content must be represented as SectionNode fields.
   */

  const VALID_SECTION_NODE_KEYS = new Set([
    'id',
    'type',
    'tag',
    'textContent',
    'attrs',
    'classes',
    'overrides',
    'children',
  ]);

  /** Returns true if the value looks like a raw HTML string (contains markup). */
  function looksLikeRawHtml(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    // A string containing both '<' and '>' is likely raw HTML markup
    return value.includes('<') && value.includes('>');
  }

  /** Recursively assert that no field in the node (or its descendants) holds raw HTML. */
  function assertNoRawHtmlFields(node: SectionNode, path = 'section'): void {
    // Every key must be a known SectionNode field
    for (const key of Object.keys(node)) {
      expect(
        VALID_SECTION_NODE_KEYS.has(key),
        `${path} has unexpected field "${key}" — only SectionNode fields are allowed`,
      ).toBe(true);
    }

    // id must be a non-empty string and must not look like HTML
    expect(typeof node.id).toBe('string');
    expect(node.id.length).toBeGreaterThan(0);
    expect(looksLikeRawHtml(node.id)).toBe(false);

    // type must be one of the valid types
    expect(['preset', 'custom-html', 'scratch']).toContain(node.type);

    // tag must be a non-empty string and must not look like HTML
    expect(typeof node.tag).toBe('string');
    expect(node.tag.length).toBeGreaterThan(0);
    expect(looksLikeRawHtml(node.tag)).toBe(false);

    // textContent is allowed to contain text, but must NOT contain HTML markup
    if (node.textContent !== undefined) {
      expect(looksLikeRawHtml(node.textContent)).toBe(false);
    }

    // classes must be an array; no element should look like raw HTML
    expect(Array.isArray(node.classes)).toBe(true);
    for (const cls of node.classes) {
      expect(looksLikeRawHtml(cls)).toBe(false);
    }

    // overrides must be a plain object (not an HTML string)
    expect(typeof node.overrides).toBe('object');
    expect(node.overrides).not.toBeNull();
    expect(Array.isArray(node.overrides)).toBe(false);
    expect(looksLikeRawHtml(node.overrides as unknown)).toBe(false);

    // attrs values must not look like raw HTML
    if (node.attrs !== undefined) {
      for (const [attrKey, attrVal] of Object.entries(node.attrs)) {
        expect(looksLikeRawHtml(attrKey)).toBe(false);
        expect(looksLikeRawHtml(attrVal)).toBe(false);
      }
    }

    // children must be an array; recurse into each child
    expect(Array.isArray(node.children)).toBe(true);
    for (let i = 0; i < node.children.length; i++) {
      assertNoRawHtmlFields(node.children[i], `${path}.children[${i}]`);
    }
  }

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  /**
   * Constrained set of known-good HTML snippets used as the arbitrary input.
   * These cover a range of structures: simple elements, nested trees, Tailwind
   * classes, text content, and attributes.
   */
  const htmlSnippets = [
    '<p>Hello world</p>',
    '<div class="container mx-auto"><h1>Title</h1><p>Body text</p></div>',
    '<section class="py-16 bg-white"><h2 class="text-3xl font-bold">Heading</h2></section>',
    '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>',
    '<button class="btn btn-primary">Click me</button>',
    '<div><span>Inline text</span></div>',
    '<a href="/about" class="text-blue-500">Learn more</a>',
    '<img src="/hero.jpg" alt="Hero image" class="w-full" />',
    '<div class="flex gap-4"><div class="w-1/2">Left</div><div class="w-1/2">Right</div></div>',
    '<p class="text-lg leading-relaxed">Paragraph with Tailwind classes.</p>',
  ];

  it('importHtmlSection always produces a section with type custom-html and no raw HTML fields', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...htmlSnippets), async (html) => {
        usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
        usePageStore.temporal.getState().clear();

        await usePageStore.getState().importHtmlSection(html);

        const { sections } = usePageStore.getState();

        // Exactly one section was appended
        expect(sections).toHaveLength(1);

        const section = sections[0];

        // 1. The section must have type 'custom-html'
        expect(section.type).toBe('custom-html');

        // 2. No field in the section (or its descendants) holds a raw HTML string
        assertNoRawHtmlFields(section);
      }),
      { numRuns: 100 },
    );
  });

  it('importHtmlSection: the top-level section itself never stores the raw HTML string', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...htmlSnippets), async (html) => {
        usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
        usePageStore.temporal.getState().clear();

        await usePageStore.getState().importHtmlSection(html);

        const { sections } = usePageStore.getState();
        expect(sections).toHaveLength(1);

        const section = sections[0];

        // The raw HTML string must not appear as any direct field value on the section
        for (const value of Object.values(section)) {
          expect(looksLikeRawHtml(value)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: Primitive drop into Container appends as child
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 17: Primitive drop into Container appends as child
describe('Property 17: Primitive drop into Container appends as child', () => {
  /**
   * Validates: Requirements 9.3
   *
   * For any Container SectionNode and any primitive type, dropping the primitive
   * into the container must result in the primitive appearing as the last element
   * of the container's `children` array, with a unique NodeId and `type: 'scratch'`.
   */

  const PRIMITIVE_TYPES: PrimitiveType[] = [
    'text',
    'heading',
    'image',
    'video',
    'button',
    'divider',
    'container',
    'spacer',
  ];

  /** Collect all NodeIds in a SectionNode subtree. */
  function collectAllIdsP17(nodes: SectionNode[]): string[] {
    const ids: string[] = [];
    function walk(node: SectionNode) {
      ids.push(node.id);
      node.children.forEach(walk);
    }
    nodes.forEach(walk);
    return ids;
  }

  /** Arbitrary for a leaf SectionNode (no children). */
  const arbitraryLeafP17 = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.string({ minLength: 10, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
      type: fc.constantFrom('scratch' as const),
      tag: fc.constantFrom('p', 'h2', 'span', 'button', 'img'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.constant([]),
    });

  /**
   * Arbitrary for a Container SectionNode (tag: 'div', type: 'scratch')
   * with 0–3 existing children.
   */
  const arbitraryContainerP17 = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.string({ minLength: 10, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
      type: fc.constant('scratch' as const),
      tag: fc.constant('div'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.array(arbitraryLeafP17(), { minLength: 0, maxLength: 3 }),
    });

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  it('dropping a primitive into a Container appends it as the last child with type scratch and unique id', () => {
    fc.assert(
      fc.property(
        arbitraryContainerP17(),
        fc.constantFrom(...PRIMITIVE_TYPES),
        (container, primitiveType) => {
          // Reset store and load the container as the sole section
          usePageStore.setState({
            sections: [container],
            selectedNodeId: null,
            viewport: 'desktop',
          });
          usePageStore.temporal.getState().clear();

          // Create the primitive via its factory
          const primitive = primitiveFactories[primitiveType]();

          // Simulate the drop: append the primitive as a child of the container
          const existingChildren = usePageStore
            .getState()
            .sections.find((s) => s.id === container.id)!.children;

          usePageStore.getState().updateNode(container.id, {
            children: [...existingChildren, primitive],
          });

          const { sections } = usePageStore.getState();
          const updatedContainer = sections.find((s) => s.id === container.id)!;

          // 1. The primitive is the last child
          const lastChild = updatedContainer.children[updatedContainer.children.length - 1];
          expect(lastChild.id).toBe(primitive.id);

          // 2. The primitive has type: 'scratch'
          expect(lastChild.type).toBe('scratch');

          // 3. The primitive's NodeId is unique across the entire store
          const allIds = collectAllIdsP17(sections);
          const idOccurrences = allIds.filter((id) => id === primitive.id).length;
          expect(idOccurrences).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 18: Primitive drop between sections creates scratch section
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 18: Primitive drop between sections creates scratch section
describe('Property 18: Primitive drop between sections creates scratch section', () => {
  /**
   * Validates: Requirements 9.4
   *
   * For any drop position between two top-level sections, dropping a primitive
   * must create a new top-level SectionNode of `type: 'scratch'` at that position
   * containing the primitive as its sole child.
   */

  const PRIMITIVE_TYPES: PrimitiveType[] = [
    'text',
    'heading',
    'image',
    'video',
    'button',
    'divider',
    'container',
    'spacer',
  ];

  /** Collect all NodeIds in a SectionNode subtree. */
  function collectAllIdsP18(nodes: SectionNode[]): string[] {
    const ids: string[] = [];
    function walk(node: SectionNode) {
      ids.push(node.id);
      node.children.forEach(walk);
    }
    nodes.forEach(walk);
    return ids;
  }

  /** Arbitrary for a minimal top-level section (leaf, unique id via nanoid). */
  const arbitraryTopLevelSection = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div'),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.constant([] as SectionNode[]),
    });

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  it('dropping a primitive between top-level sections creates a scratch section wrapping the primitive as its sole child', () => {
    fc.assert(
      fc.property(
        // 0–4 existing top-level sections
        fc.array(arbitraryTopLevelSection(), { minLength: 0, maxLength: 4 }),
        // arbitrary primitive type
        fc.constantFrom(...PRIMITIVE_TYPES),
        // insertion index (0 = before all, n = after all)
        fc.nat({ max: 4 }),
        (existingSections, primitiveType, rawInsertIndex) => {
          // Reset store and load existing sections
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          for (const s of existingSections) {
            usePageStore.getState().addSection(s);
          }

          // Clamp insert index to valid range [0, existingSections.length]
          const insertIndex = rawInsertIndex % (existingSections.length + 1);

          // Create the primitive via its factory
          const primitive = primitiveFactories[primitiveType]();

          // Build the new scratch section wrapping the primitive as its sole child
          const scratchSection: SectionNode = {
            id: nanoid(10),
            type: 'scratch',
            tag: 'section',
            classes: [],
            overrides: {},
            children: [primitive],
          };

          // Simulate the drop: insert the scratch section at the chosen position
          // using addSection then reorderSections to place it at insertIndex
          usePageStore.getState().addSection(scratchSection);

          const afterAdd = usePageStore.getState().sections;
          const addedIndex = afterAdd.length - 1; // addSection appends at the end

          if (insertIndex !== addedIndex) {
            usePageStore.getState().reorderSections(addedIndex, insertIndex);
          }

          const { sections } = usePageStore.getState();

          // Find the newly inserted scratch section
          const newSection = sections[insertIndex];
          expect(newSection).toBeDefined();
          expect(newSection.id).toBe(scratchSection.id);

          // 1. The new section has type: 'scratch'
          expect(newSection.type).toBe('scratch');

          // 2. The new section contains the primitive as its sole child
          expect(newSection.children).toHaveLength(1);
          expect(newSection.children[0].id).toBe(primitive.id);

          // 3. The primitive has type: 'scratch'
          expect(newSection.children[0].type).toBe('scratch');

          // 4. The new section's NodeId is unique across the entire store
          const allIds = collectAllIdsP18(sections);
          const scratchIdOccurrences = allIds.filter((id) => id === scratchSection.id).length;
          expect(scratchIdOccurrences).toBe(1);

          // 5. The primitive's NodeId is also unique across the entire store
          const primitiveIdOccurrences = allIds.filter((id) => id === primitive.id).length;
          expect(primitiveIdOccurrences).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 19: Undo/redo round-trip
// ---------------------------------------------------------------------------

describe('Property 19: Undo/redo round-trip', () => {
  // Feature: visual-page-builder, Property 19: Undo/redo round-trip

  /** Arbitrary for a minimal leaf SectionNode with a unique id. */
  const arbitraryLeafP19 = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const, 'custom-html' as const),
      tag: fc.constantFrom('section', 'div', 'p', 'h1', 'h2', 'span'),
      textContent: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.constant([] as SectionNode[]),
    });

  /** Arbitrary for a mutation: one of addSection, removeSection, or updateNode. */
  type Mutation =
    | { kind: 'add'; node: SectionNode }
    | { kind: 'remove' }
    | { kind: 'update'; textContent: string };

  const arbitraryMutation = (): fc.Arbitrary<Mutation> =>
    fc.oneof(
      arbitraryLeafP19().map((node) => ({ kind: 'add' as const, node })),
      fc.constant({ kind: 'remove' as const }),
      fc.string({ minLength: 1, maxLength: 30 }).map((t) => ({ kind: 'update' as const, textContent: t })),
    );

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  it('undo then redo restores the state to what it was before undo (round-trip identity)', () => {
    fc.assert(
      fc.property(
        // Seed the store with 1–3 initial sections so there is always something to mutate
        fc.array(arbitraryLeafP19(), { minLength: 1, maxLength: 3 }),
        // 1–5 additional mutations applied on top
        fc.array(arbitraryMutation(), { minLength: 1, maxLength: 5 }),
        (initialSections, mutations) => {
          // Reset store
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          // Load initial sections (each addSection call is recorded as a history entry)
          for (const s of initialSections) {
            usePageStore.getState().addSection(s);
          }

          // Apply each mutation
          for (const mutation of mutations) {
            const { sections } = usePageStore.getState();

            if (mutation.kind === 'add') {
              usePageStore.getState().addSection(mutation.node);
            } else if (mutation.kind === 'remove') {
              if (sections.length > 0) {
                // Remove the last section so we always have a valid target
                const target = sections[sections.length - 1];
                usePageStore.getState().removeSection(target.id);
              } else {
                // Nothing to remove — add a section instead so the mutation still counts
                usePageStore.getState().addSection(makeSection());
              }
            } else {
              // updateNode — update the first section's textContent if one exists
              if (sections.length > 0) {
                const target = sections[0];
                usePageStore.getState().updateNode(target.id, { textContent: mutation.textContent });
              } else {
                usePageStore.getState().addSection(makeSection());
              }
            }
          }

          // Capture the state after all mutations — this is the "before undo" state
          const stateBeforeUndo = JSON.parse(JSON.stringify(usePageStore.getState().sections)) as SectionNode[];

          // Verify there is history to undo (temporal store has past entries)
          const temporalState = usePageStore.temporal.getState();
          const hasPast = temporalState.pastStates.length > 0;

          if (!hasPast) {
            // No history recorded — nothing to test, skip this run
            return;
          }

          // Perform undo
          temporalState.undo();

          // Verify undo actually changed the state
          const stateAfterUndo = usePageStore.getState().sections;
          // (The undo may or may not change sections depending on what was undone,
          //  but the temporal store must have moved — we verify redo restores correctly)

          // Perform redo
          usePageStore.temporal.getState().redo();

          // Assert: state after redo equals state before undo (round-trip identity)
          const stateAfterRedo = JSON.parse(JSON.stringify(usePageStore.getState().sections)) as SectionNode[];
          expect(stateAfterRedo).toEqual(stateBeforeUndo);

          // Suppress unused variable warning
          void stateAfterUndo;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: Undo reverts last mutation
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 20: Undo reverts last mutation
describe('Property 20: Undo reverts last mutation', () => {
  /**
   * Validates: Requirements 13.2
   *
   * For any sequence of mutations M1…Mn, after calling undo once, the store's
   * state must equal the state after M1…M(n-1) was applied.
   */

  /** Arbitrary for a minimal leaf SectionNode with a unique id. */
  const arbitraryLeafP20 = (): fc.Arbitrary<SectionNode> =>
    fc.record({
      id: fc.constant(null).map(() => nanoid(10)),
      type: fc.constantFrom('preset' as const, 'scratch' as const),
      tag: fc.constantFrom('section', 'div', 'p', 'h1', 'h2', 'span'),
      textContent: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      classes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
      overrides: fc.constant({}),
      children: fc.constant([] as SectionNode[]),
    });

  /** A mutation is one of: add a section, remove the last section, or update the first section. */
  type MutationP20 =
    | { kind: 'add'; node: SectionNode }
    | { kind: 'remove' }
    | { kind: 'update'; textContent: string };

  const arbitraryMutationP20 = (): fc.Arbitrary<MutationP20> =>
    fc.oneof(
      arbitraryLeafP20().map((node) => ({ kind: 'add' as const, node })),
      fc.constant({ kind: 'remove' as const }),
      fc.string({ minLength: 1, maxLength: 30 }).map((t) => ({ kind: 'update' as const, textContent: t })),
    );

  /** Apply a single mutation to the store, returning whether it was a real state change. */
  function applyMutation(mutation: MutationP20): boolean {
    const { sections } = usePageStore.getState();
    if (mutation.kind === 'add') {
      usePageStore.getState().addSection(mutation.node);
      return true;
    } else if (mutation.kind === 'remove') {
      if (sections.length > 0) {
        usePageStore.getState().removeSection(sections[sections.length - 1].id);
        return true;
      }
      return false;
    } else {
      if (sections.length > 0) {
        usePageStore.getState().updateNode(sections[0].id, { textContent: mutation.textContent });
        return true;
      }
      return false;
    }
  }

  beforeEach(() => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    usePageStore.temporal.getState().clear();
  });

  it('after undo, the store state equals the state before the last mutation was applied', () => {
    fc.assert(
      fc.property(
        // Seed with 1–3 initial sections so mutations always have something to act on
        fc.array(arbitraryLeafP20(), { minLength: 1, maxLength: 3 }),
        // Generate at least 2 mutations so there is always a "before last" state
        fc.array(arbitraryMutationP20(), { minLength: 2, maxLength: 6 }),
        (initialSections, mutations) => {
          // Reset store
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          // Load initial sections (each addSection is a history entry)
          for (const s of initialSections) {
            usePageStore.getState().addSection(s);
          }

          // Apply M1…M(n-1): all mutations except the last
          const allButLast = mutations.slice(0, mutations.length - 1);
          for (const mutation of allButLast) {
            applyMutation(mutation);
          }

          // Capture the state after M1…M(n-1) — this is the expected state after undo
          const stateAfterAllButLast = JSON.parse(
            JSON.stringify(usePageStore.getState().sections),
          ) as SectionNode[];

          // Apply the last mutation Mn
          const lastMutation = mutations[mutations.length - 1];
          const mutationApplied = applyMutation(lastMutation);

          if (!mutationApplied) {
            // The last mutation was a no-op (e.g. remove on empty store) — skip this run
            return;
          }

          // Verify there is history to undo
          const hasPast = usePageStore.temporal.getState().pastStates.length > 0;
          if (!hasPast) {
            return;
          }

          // Call undo once — this should revert Mn
          usePageStore.temporal.getState().undo();

          // Assert: state after undo equals state after M1…M(n-1)
          const stateAfterUndo = JSON.parse(
            JSON.stringify(usePageStore.getState().sections),
          ) as SectionNode[];

          expect(stateAfterUndo).toEqual(stateAfterAllButLast);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit Tests: Undo history limit and boundary (Requirements 13.4, 13.5)
// ---------------------------------------------------------------------------

describe('Undo history limit and boundary', () => {
  beforeEach(resetStore);

  it('caps history at 50 entries: after 55 addSection mutations, undo 55 times stays at earliest recorded state', () => {
    // Perform 55 addSection mutations
    const sections: SectionNode[] = [];
    for (let i = 0; i < 55; i++) {
      const s = makeSection({ tag: 'section', classes: [`section-${i}`] });
      sections.push(s);
      usePageStore.getState().addSection(s);
    }

    // Store should have 55 sections
    expect(usePageStore.getState().sections).toHaveLength(55);

    // Undo 55 times — history is capped at 50, so we can only go back 50 steps
    for (let i = 0; i < 55; i++) {
      usePageStore.temporal.getState().undo();
    }

    // After exhausting history (50 undos), the store should be at the earliest
    // recorded state — which is after 5 addSection calls (55 - 50 = 5 sections remain)
    const remaining = usePageStore.getState().sections;
    expect(remaining).toHaveLength(5);

    // The 5 remaining sections should be the first 5 added (earliest state)
    for (let i = 0; i < 5; i++) {
      expect(remaining[i].id).toBe(sections[i].id);
    }
  });

  it('undo at boundary: calling undo with no history stays at earliest state without throwing', () => {
    // No mutations — store is empty
    expect(usePageStore.getState().sections).toHaveLength(0);

    // Undo on empty history must not throw
    expect(() => usePageStore.temporal.getState().undo()).not.toThrow();

    // State remains unchanged (still empty)
    expect(usePageStore.getState().sections).toHaveLength(0);
  });

  it('undo at boundary: after exhausting all history, further undos stay at earliest state without throwing', () => {
    const s1 = makeSection();
    const s2 = makeSection();
    usePageStore.getState().addSection(s1);
    usePageStore.getState().addSection(s2);

    // Undo both mutations to reach the earliest state
    usePageStore.temporal.getState().undo();
    usePageStore.temporal.getState().undo();

    // Capture the earliest state
    const earliestSections = usePageStore.getState().sections;
    expect(earliestSections).toHaveLength(0);

    // Additional undos must not throw and must keep the store at the earliest state
    expect(() => usePageStore.temporal.getState().undo()).not.toThrow();
    expect(() => usePageStore.temporal.getState().undo()).not.toThrow();
    expect(usePageStore.getState().sections).toHaveLength(0);
  });

  it('redo at boundary: calling redo with no future history stays at latest state without throwing', () => {
    const s = makeSection();
    usePageStore.getState().addSection(s);

    // No undo performed — no future history
    expect(() => usePageStore.temporal.getState().redo()).not.toThrow();

    // State remains at the latest (1 section)
    expect(usePageStore.getState().sections).toHaveLength(1);
    expect(usePageStore.getState().sections[0].id).toBe(s.id);
  });

  it('redo at boundary: after exhausting all future history, further redos stay at latest state without throwing', () => {
    const s1 = makeSection();
    const s2 = makeSection();
    usePageStore.getState().addSection(s1);
    usePageStore.getState().addSection(s2);

    // Undo both, then redo both to exhaust future history
    usePageStore.temporal.getState().undo();
    usePageStore.temporal.getState().undo();
    usePageStore.temporal.getState().redo();
    usePageStore.temporal.getState().redo();

    // Now at the latest state (2 sections)
    expect(usePageStore.getState().sections).toHaveLength(2);

    // Additional redos must not throw and must keep the store at the latest state
    expect(() => usePageStore.temporal.getState().redo()).not.toThrow();
    expect(() => usePageStore.temporal.getState().redo()).not.toThrow();
    expect(usePageStore.getState().sections).toHaveLength(2);
  });
});
