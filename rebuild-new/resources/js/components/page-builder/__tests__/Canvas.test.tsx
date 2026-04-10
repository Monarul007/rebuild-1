import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { usePageStore } from '../store/PageStore';
import { SectionRenderer } from '../SectionRenderer';
import { Canvas } from '../Canvas';
import type { SectionNode } from '../types';
import { nanoid } from 'nanoid';

// ---------------------------------------------------------------------------
// Mock @dnd-kit dependencies — not available in jsdom
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
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: () => null,
  useSensor: () => ({}),
  useSensors: (...args: unknown[]) => args,
  PointerSensor: class {},
  useDroppable: () => ({ isOver: false, setNodeRef: () => {} }),
}));

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

function makeTextNode(tag = 'p', overrides: Partial<SectionNode> = {}): SectionNode {
  return {
    id: nanoid(10),
    type: 'scratch',
    tag,
    classes: [],
    overrides: {},
    children: [],
    textContent: 'initial text',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Requirement 6.5 — blur commits textContent
// ---------------------------------------------------------------------------

describe('inline editing — blur commits textContent (Req 6.5)', () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it('dispatches updateNode with the new textContent when a contenteditable element loses focus', () => {
    const node = makeTextNode('p');
    usePageStore.setState({ sections: [node], selectedNodeId: node.id });

    const updateNode = vi.spyOn(usePageStore.getState(), 'updateNode');

    const { container } = render(<SectionRenderer node={node} />);
    const el = container.querySelector('p') as HTMLElement;

    // Simulate the browser setting textContent during editing
    el.textContent = 'updated text';
    fireEvent.blur(el);

    expect(updateNode).toHaveBeenCalledWith(node.id, { textContent: 'updated text' });

    updateNode.mockRestore();
  });

  it('blur clears any pending debounce timer and commits immediately', () => {
    vi.useFakeTimers();

    const node = makeTextNode('h2');
    usePageStore.setState({ sections: [node], selectedNodeId: node.id });

    const updateNode = vi.spyOn(usePageStore.getState(), 'updateNode');

    const { container } = render(<SectionRenderer node={node} />);
    const el = container.querySelector('h2') as HTMLElement;

    // Fire an input event (starts the 150ms debounce)
    el.textContent = 'typing...';
    fireEvent.input(el);

    // Blur before the debounce fires
    el.textContent = 'final text';
    fireEvent.blur(el);

    // updateNode should have been called once (from blur), not from the debounce
    expect(updateNode).toHaveBeenCalledTimes(1);
    expect(updateNode).toHaveBeenCalledWith(node.id, { textContent: 'final text' });

    // Advance past 150ms — no additional call should happen
    vi.advanceTimersByTime(200);
    expect(updateNode).toHaveBeenCalledTimes(1);

    updateNode.mockRestore();
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Requirement 6.6 — debounce fires at 150ms
// ---------------------------------------------------------------------------

describe('inline editing — debounce fires at 150ms (Req 6.6)', () => {
  beforeEach(resetStore);
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not call updateNode before 150ms have elapsed after an input event', () => {
    vi.useFakeTimers();

    const node = makeTextNode('span');
    usePageStore.setState({ sections: [node], selectedNodeId: node.id });

    const updateNode = vi.spyOn(usePageStore.getState(), 'updateNode');

    const { container } = render(<SectionRenderer node={node} />);
    const el = container.querySelector('span') as HTMLElement;

    el.textContent = 'hello';
    fireEvent.input(el);

    // Not yet called before 150ms
    vi.advanceTimersByTime(149);
    expect(updateNode).not.toHaveBeenCalled();

    updateNode.mockRestore();
  });

  it('calls updateNode with the current textContent exactly at 150ms', () => {
    vi.useFakeTimers();

    const node = makeTextNode('button');
    usePageStore.setState({ sections: [node], selectedNodeId: node.id });

    const updateNode = vi.spyOn(usePageStore.getState(), 'updateNode');

    const { container } = render(<SectionRenderer node={node} />);
    const el = container.querySelector('button') as HTMLElement;

    el.textContent = 'click me';
    fireEvent.input(el);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(updateNode).toHaveBeenCalledTimes(1);
    expect(updateNode).toHaveBeenCalledWith(node.id, { textContent: 'click me' });

    updateNode.mockRestore();
  });

  it('resets the debounce timer on each keystroke — only fires once after the last input', () => {
    vi.useFakeTimers();

    const node = makeTextNode('p');
    usePageStore.setState({ sections: [node], selectedNodeId: node.id });

    const updateNode = vi.spyOn(usePageStore.getState(), 'updateNode');

    const { container } = render(<SectionRenderer node={node} />);
    const el = container.querySelector('p') as HTMLElement;

    // Three rapid inputs within 150ms of each other
    el.textContent = 'a';
    fireEvent.input(el);
    vi.advanceTimersByTime(100);

    el.textContent = 'ab';
    fireEvent.input(el);
    vi.advanceTimersByTime(100);

    el.textContent = 'abc';
    fireEvent.input(el);

    // Still not called — last input was just now
    expect(updateNode).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Called exactly once with the final value
    expect(updateNode).toHaveBeenCalledTimes(1);
    expect(updateNode).toHaveBeenCalledWith(node.id, { textContent: 'abc' });

    updateNode.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Requirement 6.7 — click-outside deselects
// ---------------------------------------------------------------------------

describe('click-outside deselects (Req 6.7)', () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it('calls deselectNode when clicking directly on the canvas background', () => {
    const node = makeTextNode('p');
    usePageStore.setState({ sections: [node], selectedNodeId: node.id });

    const deselectNode = vi.spyOn(usePageStore.getState(), 'deselectNode');

    const { getByLabelText } = render(<Canvas viewport="desktop" />);

    // Click the canvas element itself (the background), not a child
    const canvasEl = getByLabelText('Page canvas');
    fireEvent.click(canvasEl);

    expect(deselectNode).toHaveBeenCalledTimes(1);

    deselectNode.mockRestore();
  });

  it('does not call deselectNode when clicking on a child element inside the canvas', () => {
    const node = makeTextNode('p', { textContent: 'hello' });
    usePageStore.setState({ sections: [node], selectedNodeId: node.id });

    const deselectNode = vi.spyOn(usePageStore.getState(), 'deselectNode');

    const { container } = render(<Canvas viewport="desktop" />);

    // Click on the rendered paragraph (a child, not the canvas background)
    const pEl = container.querySelector('p');
    if (pEl) {
      fireEvent.click(pEl);
    }

    expect(deselectNode).not.toHaveBeenCalled();

    deselectNode.mockRestore();
  });

  it('selectedNodeId becomes null after clicking the canvas background', () => {
    const node = makeTextNode('p');
    usePageStore.setState({ sections: [node], selectedNodeId: node.id });

    // Confirm it starts selected
    expect(usePageStore.getState().selectedNodeId).toBe(node.id);

    const { getByLabelText } = render(<Canvas viewport="desktop" />);
    const canvasEl = getByLabelText('Page canvas');
    fireEvent.click(canvasEl);

    expect(usePageStore.getState().selectedNodeId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Requirements 10.1, 10.2 — viewport width constraints
// ---------------------------------------------------------------------------

describe('viewport width constraints (Req 10.1, 10.2)', () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it('applies width 100% for desktop viewport', () => {
    const { getByLabelText } = render(<Canvas viewport="desktop" />);
    const canvasEl = getByLabelText('Page canvas') as HTMLElement;
    expect(canvasEl.style.width).toBe('100%');
  });

  it('applies width 768px for tablet viewport', () => {
    const { getByLabelText } = render(<Canvas viewport="tablet" />);
    const canvasEl = getByLabelText('Page canvas') as HTMLElement;
    expect(canvasEl.style.width).toBe('768px');
  });

  it('applies width 375px for mobile viewport', () => {
    const { getByLabelText } = render(<Canvas viewport="mobile" />);
    const canvasEl = getByLabelText('Page canvas') as HTMLElement;
    expect(canvasEl.style.width).toBe('375px');
  });
});

// ---------------------------------------------------------------------------
// Requirements 5.5, 5.6 — drag-and-drop reorder (store-level unit tests)
// ---------------------------------------------------------------------------

describe('reorderSections — store order (Req 5.5, 5.6)', () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it('moves a section from index 0 to index 2 correctly', () => {
    const [a, b, c] = [makeTextNode('p'), makeTextNode('h1'), makeTextNode('h2')];
    usePageStore.setState({ sections: [a, b, c] });

    usePageStore.getState().reorderSections(0, 2);

    const ids = usePageStore.getState().sections.map((s) => s.id);
    expect(ids).toEqual([b.id, c.id, a.id]);
  });

  it('moves a section from index 2 to index 0 correctly', () => {
    const [a, b, c] = [makeTextNode('p'), makeTextNode('h1'), makeTextNode('h2')];
    usePageStore.setState({ sections: [a, b, c] });

    usePageStore.getState().reorderSections(2, 0);

    const ids = usePageStore.getState().sections.map((s) => s.id);
    expect(ids).toEqual([c.id, a.id, b.id]);
  });

  it('is a no-op when from === to', () => {
    const [a, b, c] = [makeTextNode('p'), makeTextNode('h1'), makeTextNode('h2')];
    usePageStore.setState({ sections: [a, b, c] });

    usePageStore.getState().reorderSections(1, 1);

    const ids = usePageStore.getState().sections.map((s) => s.id);
    expect(ids).toEqual([a.id, b.id, c.id]);
  });

  it('preserves all sections — no sections are lost after reorder', () => {
    const [a, b, c] = [makeTextNode('p'), makeTextNode('h1'), makeTextNode('h2')];
    usePageStore.setState({ sections: [a, b, c] });

    usePageStore.getState().reorderSections(0, 2);

    expect(usePageStore.getState().sections).toHaveLength(3);
    const ids = usePageStore.getState().sections.map((s) => s.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
    expect(ids).toContain(c.id);
  });

  it('reorderSections with a single section is a no-op', () => {
    const a = makeTextNode('p');
    usePageStore.setState({ sections: [a] });

    usePageStore.getState().reorderSections(0, 0);

    const ids = usePageStore.getState().sections.map((s) => s.id);
    expect(ids).toEqual([a.id]);
  });
});
