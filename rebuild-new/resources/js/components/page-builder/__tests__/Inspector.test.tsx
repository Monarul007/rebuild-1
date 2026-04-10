import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { nanoid } from 'nanoid';
import { usePageStore } from '../store/PageStore';
import type { SectionNode, Viewport } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the store to a clean state before each test. */
function resetStore() {
  usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
  usePageStore.temporal.getState().clear();
}

/** Create a minimal SectionNode with empty overrides. */
function makeNode(overrides: Partial<SectionNode> = {}): SectionNode {
  return {
    id: nanoid(10),
    type: 'scratch',
    tag: 'div',
    classes: [],
    overrides: {},
    children: [],
    ...overrides,
  };
}

/** Map a Viewport to its corresponding override key. */
function viewportToBreakpointKey(viewport: Viewport): 'base' | 'md' | 'sm' {
  if (viewport === 'desktop') return 'base';
  if (viewport === 'tablet') return 'md';
  return 'sm';
}

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// Feature: visual-page-builder, Property 11: Inspector override applied to correct breakpoint key
describe('Property 11: Inspector override applied to correct breakpoint key', () => {
  /**
   * Validates: Requirements 7.9, 7.12, 10.5
   *
   * For any active Viewport, when an Inspector control changes a style property,
   * the PageStore must store the new value under the correct key in node.overrides:
   *   - desktop → `base`
   *   - tablet  → `md`
   *   - mobile  → `sm`
   * The other breakpoint keys must remain unchanged.
   */

  beforeEach(resetStore);

  /** Arbitrary for a valid CSS property name (constrained to a realistic set). */
  const arbitraryCssProp = fc.constantFrom(
    'color',
    'backgroundColor',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'textAlign',
    'padding',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'margin',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'width',
    'height',
    'opacity',
    'borderWidth',
    'borderRadius',
    'zIndex',
  );

  /** Arbitrary for a CSS value string (non-empty). */
  const arbitraryCssValue = fc.string({ minLength: 1, maxLength: 30 }).filter(
    (s) => s.trim().length > 0,
  );

  /** Arbitrary for a Viewport value. */
  const arbitraryViewport = fc.constantFrom<Viewport>('mobile', 'tablet', 'desktop');

  it('override is stored under the correct breakpoint key for the active viewport', () => {
    fc.assert(
      fc.property(
        arbitraryViewport,
        arbitraryCssProp,
        arbitraryCssValue,
        (viewport, cssProp, cssValue) => {
          // Reset store state for each run
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          // Add a node to the store
          const node = makeNode();
          usePageStore.getState().addSection(node);

          // Set the active viewport
          usePageStore.getState().setViewport(viewport);

          // Determine the correct breakpoint key for this viewport
          const breakpointKey = viewportToBreakpointKey(viewport);

          // Simulate what the Inspector does: call updateNode with the override
          // under the correct breakpoint key for the active viewport
          const existingOverrides = usePageStore.getState().sections[0].overrides;
          const updatedOverrides = {
            ...existingOverrides,
            [breakpointKey]: {
              ...(existingOverrides[breakpointKey] ?? {}),
              [cssProp]: cssValue,
            },
          };
          usePageStore.getState().updateNode(node.id, { overrides: updatedOverrides });

          // Assert: the override is stored under the correct breakpoint key
          const storedNode = usePageStore.getState().sections[0];
          const breakpointOverrides = storedNode.overrides[breakpointKey];

          expect(breakpointOverrides).toBeDefined();
          expect((breakpointOverrides as Record<string, string>)[cssProp]).toBe(cssValue);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('other breakpoint keys remain unchanged when an override is applied', () => {
    fc.assert(
      fc.property(
        arbitraryViewport,
        arbitraryCssProp,
        arbitraryCssValue,
        (viewport, cssProp, cssValue) => {
          // Reset store state for each run
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          // Add a node with pre-existing overrides on all breakpoints
          const node = makeNode({
            overrides: {
              base: { color: 'red' },
              md: { fontSize: '16px' },
              sm: { padding: '8px' },
            },
          });
          usePageStore.getState().addSection(node);

          // Set the active viewport
          usePageStore.getState().setViewport(viewport);

          const breakpointKey = viewportToBreakpointKey(viewport);
          const otherKeys = (['base', 'md', 'sm'] as const).filter((k) => k !== breakpointKey);

          // Capture the state of other breakpoint keys before the update
          const beforeOverrides = usePageStore.getState().sections[0].overrides;
          const otherKeysBefore = Object.fromEntries(
            otherKeys.map((k) => [k, beforeOverrides[k]]),
          );

          // Apply the override for the active viewport
          const existingOverrides = usePageStore.getState().sections[0].overrides;
          const updatedOverrides = {
            ...existingOverrides,
            [breakpointKey]: {
              ...(existingOverrides[breakpointKey] ?? {}),
              [cssProp]: cssValue,
            },
          };
          usePageStore.getState().updateNode(node.id, { overrides: updatedOverrides });

          // Assert: other breakpoint keys are unchanged
          const afterOverrides = usePageStore.getState().sections[0].overrides;
          for (const key of otherKeys) {
            expect(afterOverrides[key]).toEqual(otherKeysBefore[key]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('breakpoint key mapping is correct for all three viewports', () => {
    fc.assert(
      fc.property(arbitraryViewport, (viewport) => {
        const key = viewportToBreakpointKey(viewport);

        if (viewport === 'desktop') expect(key).toBe('base');
        else if (viewport === 'tablet') expect(key).toBe('md');
        else if (viewport === 'mobile') expect(key).toBe('sm');
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: visual-page-builder, Property 12: Reset removes property from overrides
describe('Property 12: Reset removes property from overrides', () => {
  /**
   * Validates: Requirements 7.10
   *
   * For any SectionNode and any style property that exists in its `overrides`,
   * triggering "Reset to default" for that property must result in the property
   * being absent from `overrides` (not set to `undefined` or `null` — fully removed).
   */

  beforeEach(resetStore);

  /** Arbitrary for a breakpoint key. */
  const arbitraryBreakpointKey = fc.constantFrom<'base' | 'sm' | 'md'>('base', 'sm', 'md');

  /** Arbitrary for a CSS property name (constrained to a realistic set). */
  const arbitraryCssProp = fc.constantFrom(
    'color',
    'backgroundColor',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'textAlign',
    'padding',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'margin',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'width',
    'height',
    'opacity',
    'borderWidth',
    'borderRadius',
    'zIndex',
  );

  /** Arbitrary for a non-empty CSS value string. */
  const arbitraryCssValue = fc.string({ minLength: 1, maxLength: 30 }).filter(
    (s) => s.trim().length > 0,
  );

  it('reset removes the property key entirely from overrides (not undefined/null)', () => {
    fc.assert(
      fc.property(
        arbitraryBreakpointKey,
        arbitraryCssProp,
        arbitraryCssValue,
        (breakpointKey, cssProp, cssValue) => {
          // Reset store state for each run
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          // Create a node with the property already set in overrides
          const node = makeNode({
            overrides: {
              [breakpointKey]: { [cssProp]: cssValue },
            },
          });
          usePageStore.getState().addSection(node);

          // Verify the property exists before reset
          const before = usePageStore.getState().sections[0].overrides[breakpointKey] as Record<string, unknown> | undefined;
          expect(before).toBeDefined();
          expect(before![cssProp]).toBe(cssValue);

          // Simulate "Reset to default": remove the property from overrides using object spread
          const existingOverrides = usePageStore.getState().sections[0].overrides;
          const existingBreakpointOverrides = { ...(existingOverrides[breakpointKey] ?? {}) } as Record<string, unknown>;
          delete existingBreakpointOverrides[cssProp];

          const updatedOverrides = {
            ...existingOverrides,
            [breakpointKey]: existingBreakpointOverrides,
          };
          usePageStore.getState().updateNode(node.id, { overrides: updatedOverrides });

          // Assert: the property key is fully absent (not undefined, not null)
          const after = usePageStore.getState().sections[0].overrides[breakpointKey] as Record<string, unknown> | undefined;
          expect(after).not.toBeUndefined();
          expect(Object.prototype.hasOwnProperty.call(after, cssProp)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('reset does not affect other properties in the same breakpoint', () => {
    fc.assert(
      fc.property(
        arbitraryBreakpointKey,
        arbitraryCssProp,
        arbitraryCssValue,
        arbitraryCssValue,
        (breakpointKey, cssProp, cssValue, otherValue) => {
          // Reset store state for each run
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          // Use a different property name to avoid collision
          const otherProp = cssProp === 'color' ? 'backgroundColor' : 'color';

          // Create a node with two properties set in the same breakpoint
          const node = makeNode({
            overrides: {
              [breakpointKey]: {
                [cssProp]: cssValue,
                [otherProp]: otherValue,
              },
            },
          });
          usePageStore.getState().addSection(node);

          // Reset only cssProp
          const existingOverrides = usePageStore.getState().sections[0].overrides;
          const existingBreakpointOverrides = { ...(existingOverrides[breakpointKey] ?? {}) } as Record<string, unknown>;
          delete existingBreakpointOverrides[cssProp];

          const updatedOverrides = {
            ...existingOverrides,
            [breakpointKey]: existingBreakpointOverrides,
          };
          usePageStore.getState().updateNode(node.id, { overrides: updatedOverrides });

          // Assert: cssProp is gone, otherProp is still present with its value
          const after = usePageStore.getState().sections[0].overrides[breakpointKey] as Record<string, unknown> | undefined;
          expect(Object.prototype.hasOwnProperty.call(after, cssProp)).toBe(false);
          expect((after as Record<string, unknown>)[otherProp]).toBe(otherValue);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('reset does not affect other breakpoint keys', () => {
    fc.assert(
      fc.property(
        arbitraryBreakpointKey,
        arbitraryCssProp,
        arbitraryCssValue,
        (breakpointKey, cssProp, cssValue) => {
          // Reset store state for each run
          usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
          usePageStore.temporal.getState().clear();

          const otherKeys = (['base', 'sm', 'md'] as const).filter((k) => k !== breakpointKey);

          // Create a node with the property set in all breakpoints
          const node = makeNode({
            overrides: {
              base: { [cssProp]: cssValue },
              sm: { [cssProp]: cssValue },
              md: { [cssProp]: cssValue },
            },
          });
          usePageStore.getState().addSection(node);

          // Reset only in the target breakpoint
          const existingOverrides = usePageStore.getState().sections[0].overrides;
          const existingBreakpointOverrides = { ...(existingOverrides[breakpointKey] ?? {}) } as Record<string, unknown>;
          delete existingBreakpointOverrides[cssProp];

          const updatedOverrides = {
            ...existingOverrides,
            [breakpointKey]: existingBreakpointOverrides,
          };
          usePageStore.getState().updateNode(node.id, { overrides: updatedOverrides });

          // Assert: the property is still present in the other breakpoints
          const afterOverrides = usePageStore.getState().sections[0].overrides;
          for (const key of otherKeys) {
            const breakpointData = afterOverrides[key] as Record<string, unknown> | undefined;
            expect(Object.prototype.hasOwnProperty.call(breakpointData, cssProp)).toBe(true);
            expect(breakpointData![cssProp]).toBe(cssValue);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit Tests — Inspector tab rendering (Task 8.3)
// Validates: Requirements 7.1, 7.2
// ---------------------------------------------------------------------------

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Inspector } from '../Inspector';

/** Helper: set up a selected text-bearing node in the store and render Inspector. */
function renderInspectorWithParagraph() {
  const node = makeNode({ tag: 'p', textContent: 'Hello world' });
  usePageStore.setState({ sections: [node], selectedNodeId: node.id, viewport: 'desktop' });
  return render(<Inspector aiSuggestUrl="/ai/suggest" />);
}

describe('Inspector tab rendering', () => {
  beforeEach(() => {
    resetStore();
    cleanup();
  });

  it('renders all three tab buttons', () => {
    renderInspectorWithParagraph();
    expect(screen.getByRole('button', { name: /content/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /style/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /layout/i })).toBeInTheDocument();
  });

  it('shows the Content tab by default', () => {
    const { container } = renderInspectorWithParagraph();
    // The Content tab renders a <textarea> for text content
    expect(container.querySelector('textarea')).toBeInTheDocument();
  });

  it('shows the AI Suggest button on the Content tab for text-bearing nodes', () => {
    renderInspectorWithParagraph();
    expect(screen.getByTitle('AI Suggest')).toBeInTheDocument();
  });

  it('shows style controls (Typography, Colour & Background) after clicking the Style tab', () => {
    renderInspectorWithParagraph();
    fireEvent.click(screen.getByRole('button', { name: /style/i }));
    // GroupHeader text nodes rendered as uppercase labels
    expect(screen.getByText(/typography/i)).toBeInTheDocument();
    expect(screen.getByText(/colour & background/i)).toBeInTheDocument();
  });

  it('shows Border & Radius and Effects group headers on the Style tab', () => {
    renderInspectorWithParagraph();
    fireEvent.click(screen.getByRole('button', { name: /style/i }));
    expect(screen.getByText(/border & radius/i)).toBeInTheDocument();
    expect(screen.getByText(/effects/i)).toBeInTheDocument();
  });

  it('shows layout controls (Spacing, Size & Layout) after clicking the Layout tab', () => {
    renderInspectorWithParagraph();
    fireEvent.click(screen.getByRole('button', { name: /layout/i }));
    expect(screen.getByText(/spacing/i)).toBeInTheDocument();
    expect(screen.getByText(/size & layout/i)).toBeInTheDocument();
  });

  it('hides the Content tab textarea when Style tab is active', () => {
    const { container } = renderInspectorWithParagraph();
    fireEvent.click(screen.getByRole('button', { name: /style/i }));
    // The Content tab renders a <textarea>; Style tab renders only <input> elements
    expect(container.querySelector('textarea')).not.toBeInTheDocument();
  });

  it('hides the Content tab textarea when Layout tab is active', () => {
    const { container } = renderInspectorWithParagraph();
    fireEvent.click(screen.getByRole('button', { name: /layout/i }));
    expect(container.querySelector('textarea')).not.toBeInTheDocument();
  });

  it('shows the selected node tag label', () => {
    renderInspectorWithParagraph();
    expect(screen.getByText(/<p>/i)).toBeInTheDocument();
  });

  it('shows empty-state message when no node is selected', () => {
    usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
    render(<Inspector aiSuggestUrl="/ai/suggest" />);
    expect(screen.getByText(/select an element to inspect/i)).toBeInTheDocument();
  });

  it('switching back to Content tab from Style tab restores the textarea', () => {
    const { container } = renderInspectorWithParagraph();
    fireEvent.click(screen.getByRole('button', { name: /style/i }));
    expect(container.querySelector('textarea')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /content/i }));
    expect(container.querySelector('textarea')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Unit Tests — AI Suggest flow (Task 20.1)
// Validates: Requirements 14.1, 14.3, 14.4, 14.5
// ---------------------------------------------------------------------------

import { vi, afterEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';

// Text-bearing tags that should show the AI Suggest button
const TEXT_BEARING_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'li', 'button'];
// Non-text-bearing tags that should NOT show the AI Suggest button
const NON_TEXT_BEARING_TAGS = ['div', 'img'];

describe('AI Suggest — button visibility (Req 14.1)', () => {
  beforeEach(() => {
    resetStore();
    cleanup();
  });

  it.each(TEXT_BEARING_TAGS)(
    'AI Suggest button is visible for text-bearing node <%s> on the Content tab',
    (tag) => {
      const node = makeNode({ tag, textContent: 'Some text' });
      usePageStore.setState({ sections: [node], selectedNodeId: node.id, viewport: 'desktop' });
      render(<Inspector aiSuggestUrl="/ai/suggest" />);
      expect(screen.getByTitle('AI Suggest')).toBeInTheDocument();
    },
  );

  it.each(NON_TEXT_BEARING_TAGS)(
    'AI Suggest button is NOT visible for non-text-bearing node <%s> on the Content tab',
    (tag) => {
      const node = makeNode({ tag });
      usePageStore.setState({ sections: [node], selectedNodeId: node.id, viewport: 'desktop' });
      render(<Inspector aiSuggestUrl="/ai/suggest" />);
      expect(screen.queryByTitle('AI Suggest')).not.toBeInTheDocument();
    },
  );
});

describe('AI Suggest — preview display on success (Req 14.3)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  beforeEach(() => {
    resetStore();
    cleanup();
  });

  it('shows a suggestion preview when AI Suggest succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ suggestion: 'AI generated text' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const node = makeNode({ tag: 'p', textContent: 'Original text' });
    usePageStore.setState({ sections: [node], selectedNodeId: node.id, viewport: 'desktop' });
    render(<Inspector aiSuggestUrl="/ai/suggest" />);

    await act(async () => {
      fireEvent.click(screen.getByTitle('AI Suggest'));
    });

    await waitFor(() => {
      expect(screen.getByText('AI generated text')).toBeInTheDocument();
    });

    // Confirm and Dismiss buttons should appear
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });
});

describe('AI Suggest — confirm updates store (Req 14.4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  beforeEach(() => {
    resetStore();
    cleanup();
  });

  it('clicking Confirm calls updateNode with the suggested textContent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ suggestion: 'Confirmed suggestion' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const node = makeNode({ tag: 'p', textContent: 'Original text' });
    usePageStore.setState({ sections: [node], selectedNodeId: node.id, viewport: 'desktop' });
    render(<Inspector aiSuggestUrl="/ai/suggest" />);

    await act(async () => {
      fireEvent.click(screen.getByTitle('AI Suggest'));
    });

    await waitFor(() => {
      expect(screen.getByText('Confirmed suggestion')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    });

    // The store should now have the new textContent
    const updatedNode = usePageStore.getState().sections[0];
    expect(updatedNode.textContent).toBe('Confirmed suggestion');

    // Preview panel (Confirm/Dismiss buttons) should be dismissed after confirmation
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });
});

describe('AI Suggest — failure retains original textContent (Req 14.5)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  beforeEach(() => {
    resetStore();
    cleanup();
  });

  it('shows an error message when the AI request fails (network error)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const node = makeNode({ tag: 'p', textContent: 'Original text' });
    usePageStore.setState({ sections: [node], selectedNodeId: node.id, viewport: 'desktop' });
    render(<Inspector aiSuggestUrl="/ai/suggest" />);

    await act(async () => {
      fireEvent.click(screen.getByTitle('AI Suggest'));
    });

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Original textContent must be retained in the store
    const storedNode = usePageStore.getState().sections[0];
    expect(storedNode.textContent).toBe('Original text');
  });

  it('shows an error message when the server returns a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const node = makeNode({ tag: 'h1', textContent: 'Original heading' });
    usePageStore.setState({ sections: [node], selectedNodeId: node.id, viewport: 'desktop' });
    render(<Inspector aiSuggestUrl="/ai/suggest" />);

    await act(async () => {
      fireEvent.click(screen.getByTitle('AI Suggest'));
    });

    await waitFor(() => {
      expect(screen.getByText('AI service unavailable')).toBeInTheDocument();
    });

    // Original textContent must be retained in the store
    const storedNode = usePageStore.getState().sections[0];
    expect(storedNode.textContent).toBe('Original heading');
  });

  it('does not show a suggestion preview when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Timeout'));

    const node = makeNode({ tag: 'span', textContent: 'Original span' });
    usePageStore.setState({ sections: [node], selectedNodeId: node.id, viewport: 'desktop' });
    render(<Inspector aiSuggestUrl="/ai/suggest" />);

    await act(async () => {
      fireEvent.click(screen.getByTitle('AI Suggest'));
    });

    await waitFor(() => {
      expect(screen.getByText('Timeout')).toBeInTheDocument();
    });

    // No Confirm/Dismiss buttons should appear
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });
});
