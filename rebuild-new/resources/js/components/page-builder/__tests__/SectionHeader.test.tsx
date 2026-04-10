import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SectionHeader } from '../SectionHeader';
import { usePageStore } from '../store/PageStore';
import type { SectionNode } from '../types';
import { nanoid } from 'nanoid';

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
// SectionHeader — collapse toggle (Requirement 5.2)
// ---------------------------------------------------------------------------

describe('SectionHeader — collapse toggle', () => {
  afterEach(cleanup);

  it('calls onToggleCollapse when the collapse button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <SectionHeader
        id="test-id"
        tag="section"
        collapsed={false}
        onToggleCollapse={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /collapse section/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows expand button when collapsed=true', () => {
    render(
      <SectionHeader
        id="test-id"
        tag="section"
        collapsed={true}
        onToggleCollapse={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /expand section/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /collapse section/i })).toBeNull();
  });

  it('shows collapse button when collapsed=false', () => {
    render(
      <SectionHeader
        id="test-id"
        tag="section"
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /collapse section/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /expand section/i })).toBeNull();
  });

  it('toggles between expand and collapse labels on re-render', () => {
    const { rerender } = render(
      <SectionHeader
        id="test-id"
        tag="section"
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /collapse section/i })).toBeTruthy();

    rerender(
      <SectionHeader
        id="test-id"
        tag="section"
        collapsed={true}
        onToggleCollapse={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /expand section/i })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// SectionHeader — duplicate action (Requirement 5.3)
// ---------------------------------------------------------------------------

describe('SectionHeader — duplicate action', () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it('inserts a copy of the section after the original when duplicate is clicked', () => {
    const node = makeNode('section');
    usePageStore.setState({ sections: [node] });

    render(
      <SectionHeader
        id={node.id}
        tag={node.tag}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /duplicate section/i }));

    const { sections } = usePageStore.getState();
    expect(sections).toHaveLength(2);
    // Duplicate is inserted immediately after the original
    expect(sections[0].id).toBe(node.id);
    expect(sections[1].id).not.toBe(node.id);
  });

  it('assigns a new unique NodeId to the duplicate', () => {
    const node = makeNode('section');
    usePageStore.setState({ sections: [node] });

    render(
      <SectionHeader
        id={node.id}
        tag={node.tag}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /duplicate section/i }));

    const { sections } = usePageStore.getState();
    const allIds = sections.map((s) => s.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('preserves the original section when duplicating', () => {
    const node = makeNode('section', { textContent: 'original' });
    usePageStore.setState({ sections: [node] });

    render(
      <SectionHeader
        id={node.id}
        tag={node.tag}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /duplicate section/i }));

    const { sections } = usePageStore.getState();
    expect(sections[0].id).toBe(node.id);
    expect(sections[0].textContent).toBe('original');
  });
});

// ---------------------------------------------------------------------------
// SectionHeader — delete action (Requirement 5.4)
// ---------------------------------------------------------------------------

describe('SectionHeader — delete action', () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it('removes the section from the store when delete is clicked', () => {
    const node = makeNode('section');
    usePageStore.setState({ sections: [node] });

    render(
      <SectionHeader
        id={node.id}
        tag={node.tag}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /delete section/i }));

    const { sections } = usePageStore.getState();
    expect(sections).toHaveLength(0);
  });

  it('removes only the targeted section, leaving others intact', () => {
    const nodeA = makeNode('section');
    const nodeB = makeNode('section');
    usePageStore.setState({ sections: [nodeA, nodeB] });

    render(
      <SectionHeader
        id={nodeA.id}
        tag={nodeA.tag}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /delete section/i }));

    const { sections } = usePageStore.getState();
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe(nodeB.id);
  });

  it('removes the section and all its descendants', () => {
    const child = makeNode('p', { textContent: 'child' });
    const node = makeNode('section', { children: [child] });
    usePageStore.setState({ sections: [node] });

    render(
      <SectionHeader
        id={node.id}
        tag={node.tag}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /delete section/i }));

    const { sections } = usePageStore.getState();
    expect(sections).toHaveLength(0);

    // Verify neither the parent nor child id appears anywhere
    function collectIds(s: SectionNode): string[] {
      return [s.id, ...s.children.flatMap(collectIds)];
    }
    const allIds = sections.flatMap(collectIds);
    expect(allIds).not.toContain(node.id);
    expect(allIds).not.toContain(child.id);
  });
});
