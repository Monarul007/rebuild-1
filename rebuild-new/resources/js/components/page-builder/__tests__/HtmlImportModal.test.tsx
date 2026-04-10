import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { HtmlImportModal } from '../HtmlImportModal';
import { Sidebar } from '../Sidebar';
import { usePageStore } from '../store/PageStore';

// ---------------------------------------------------------------------------
// Mock usePageStore so HtmlImportModal doesn't need a real store
// ---------------------------------------------------------------------------

vi.mock('../store/PageStore', () => ({
  usePageStore: vi.fn(),
}));

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
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
  usePageStore.temporal.getState().clear();
}

// ---------------------------------------------------------------------------
// Tests — Requirement 8.1: HtmlImportModal open/close behaviour
// ---------------------------------------------------------------------------

describe('HtmlImportModal — open/close behaviour (Req 8.1)', () => {
  beforeEach(() => {
    // Provide a no-op importHtmlSection to the modal
    (usePageStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (s: { importHtmlSection: () => Promise<void> }) => unknown) =>
        selector({ importHtmlSection: vi.fn().mockResolvedValue(undefined) }),
    );
  });

  afterEach(cleanup);

  it('renders the textarea and Import button when isOpen=true', () => {
    const onClose = vi.fn();
    render(<HtmlImportModal isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByRole('button', { name: /import/i })).toBeTruthy();
  });

  it('renders nothing when isOpen=false', () => {
    const onClose = vi.fn();
    render(<HtmlImportModal isOpen={false} onClose={onClose} />);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('calls onClose when the Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<HtmlImportModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop (outside the modal panel)', () => {
    const onClose = vi.fn();
    render(<HtmlImportModal isOpen={true} onClose={onClose} />);

    // The dialog element itself is the backdrop
    fireEvent.click(screen.getByRole('dialog'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests — Sidebar "Paste HTML" opens the modal (Req 8.1)
// ---------------------------------------------------------------------------

describe('Sidebar — "Paste HTML" opens HtmlImportModal (Req 8.1)', () => {
  beforeEach(() => {
    (usePageStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (s: { addSection: () => void; importHtmlSection: () => Promise<void> }) => unknown) =>
        selector({
          addSection: vi.fn(),
          importHtmlSection: vi.fn().mockResolvedValue(undefined),
        }),
    );
  });

  afterEach(cleanup);

  it('modal is not visible before clicking "Paste HTML"', () => {
    render(<Sidebar />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('modal becomes visible after clicking "Paste HTML"', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: /paste html/i }));

    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('modal closes when Cancel is clicked after opening via "Paste HTML"', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: /paste html/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
