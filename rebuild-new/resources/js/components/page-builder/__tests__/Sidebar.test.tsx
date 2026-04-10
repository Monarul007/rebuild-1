import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { usePageStore } from '../store/PageStore';

// ---------------------------------------------------------------------------
// Mock DnD kit — useDraggable is not available in jsdom
// ---------------------------------------------------------------------------

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    isDragging: false,
  }),
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock HtmlImportModal so it doesn't pull in heavy dependencies
// ---------------------------------------------------------------------------

vi.mock('../HtmlImportModal', () => ({
  HtmlImportModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="html-import-modal" /> : null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
  usePageStore.temporal.getState().clear();
}

// ---------------------------------------------------------------------------
// Tests — Requirement 4.1: Sidebar preset listing
// ---------------------------------------------------------------------------

describe('Sidebar — preset and primitive listing', () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it('renders all three preset section cards (Hero, Features, CTA)', () => {
    render(<Sidebar />);

    expect(screen.getByText('Hero')).toBeTruthy();
    expect(screen.getByText('Features')).toBeTruthy();
    expect(screen.getByText('CTA')).toBeTruthy();
  });

  it('renders all eight primitive elements (Requirement 9.1)', () => {
    render(<Sidebar />);

    expect(screen.getByText('Text')).toBeTruthy();
    expect(screen.getByText('Heading')).toBeTruthy();
    expect(screen.getByText('Image')).toBeTruthy();
    expect(screen.getByText('Video')).toBeTruthy();
    expect(screen.getByText('Button')).toBeTruthy();
    expect(screen.getByText('Divider')).toBeTruthy();
    expect(screen.getByText('Container')).toBeTruthy();
    expect(screen.getByText('Spacer')).toBeTruthy();
  });

  it('renders the "Paste HTML" button', () => {
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: /paste html/i })).toBeTruthy();
  });

  it('renders preset add buttons with accessible labels', () => {
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: /add hero section/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /add features section/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /add cta section/i })).toBeTruthy();
  });
});
