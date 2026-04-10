import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { SectionRenderer } from '../SectionRenderer';
import { usePageStore } from '../store/PageStore';
import type { SectionNode } from '../types';
import { nanoid } from 'nanoid';

// ---------------------------------------------------------------------------
// Mock @dnd-kit/sortable — useSortable is not available in jsdom
// ---------------------------------------------------------------------------

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock SectionHeader to avoid pulling in extra dependencies
// ---------------------------------------------------------------------------

vi.mock('../SectionHeader', () => ({
  SectionHeader: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
  usePageStore.temporal.getState().clear();
}

function makeNode(tag: string, overrides: Partial<SectionNode> = {}): SectionNode {
  return {
    id: nanoid(10),
    type: 'scratch',
    tag,
    classes: [],
    overrides: {},
    children: [],
    textContent: 'sample text',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Property 10: contenteditable applied to text-bearing nodes only
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 10: contenteditable applied to text-bearing nodes only
describe('Property 10: contenteditable applied to text-bearing nodes only', () => {
  /**
   * Validates: Requirements 6.1, 6.3
   *
   * For any rendered SectionNode, if its `tag` is one of h1–h6, p, span, a, li, button
   * then the rendered DOM element must have contenteditable="true".
   * If its `tag` is img, video, or div, the rendered element must NOT have contenteditable.
   */

  const TEXT_BEARING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'li', 'button'] as const;
  const NON_TEXT_TAGS = ['img', 'video', 'div'] as const;

  beforeEach(resetStore);
  afterEach(cleanup);

  it('text-bearing tags always have contenteditable="true"', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TEXT_BEARING_TAGS),
        fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
        (tag, textContent) => {
          cleanup();
          const node = makeNode(tag, { textContent });
          const { container } = render(<SectionRenderer node={node} />);
          const el = container.querySelector(tag);
          expect(el).not.toBeNull();
          expect(el!.getAttribute('contenteditable')).toBe('true');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-text-bearing tags never have contenteditable', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NON_TEXT_TAGS),
        (tag) => {
          cleanup();
          // img and video are void/media elements — no textContent needed
          const node = makeNode(tag, { textContent: undefined, children: [] });
          const { container } = render(<SectionRenderer node={node} />);
          const el = container.querySelector(tag);
          expect(el).not.toBeNull();
          expect(el!.hasAttribute('contenteditable')).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
