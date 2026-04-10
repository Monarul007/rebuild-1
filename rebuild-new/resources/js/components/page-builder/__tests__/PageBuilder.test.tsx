import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { usePageStore } from '../store/PageStore';
import { PageBuilder } from '../PageBuilder';

// ---------------------------------------------------------------------------
// Mock heavy sub-components so the test only exercises PageBuilder's own logic
// ---------------------------------------------------------------------------

vi.mock('../Toolbar', () => ({
  Toolbar: () => <div data-testid="toolbar" />,
}));

vi.mock('../Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock('../Canvas', () => ({
  Canvas: () => <div data-testid="canvas" />,
}));

vi.mock('../Inspector', () => ({
  Inspector: () => <div data-testid="inspector" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
  usePageStore.temporal.getState().clear();
}

// ---------------------------------------------------------------------------
// Tests — keyboard shortcuts (Requirements 3.6, 3.7)
// ---------------------------------------------------------------------------

describe('PageBuilder keyboard shortcuts', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it('Ctrl+Z triggers undo on the temporal store', () => {
    const undoSpy = vi.spyOn(usePageStore.temporal.getState(), 'undo');

    render(<PageBuilder publishUrl="/pages/publish" aiSuggestUrl="/ai/suggest" />);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: false });

    expect(undoSpy).toHaveBeenCalledTimes(1);

    undoSpy.mockRestore();
  });

  it('Ctrl+Shift+Z triggers redo on the temporal store', () => {
    const redoSpy = vi.spyOn(usePageStore.temporal.getState(), 'redo');

    render(<PageBuilder publishUrl="/pages/publish" aiSuggestUrl="/ai/suggest" />);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });

    expect(redoSpy).toHaveBeenCalledTimes(1);

    redoSpy.mockRestore();
  });

  it('Ctrl+Z does not trigger redo', () => {
    const redoSpy = vi.spyOn(usePageStore.temporal.getState(), 'redo');

    render(<PageBuilder publishUrl="/pages/publish" aiSuggestUrl="/ai/suggest" />);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: false });

    expect(redoSpy).not.toHaveBeenCalled();

    redoSpy.mockRestore();
  });

  it('Ctrl+Shift+Z does not trigger undo', () => {
    const undoSpy = vi.spyOn(usePageStore.temporal.getState(), 'undo');

    render(<PageBuilder publishUrl="/pages/publish" aiSuggestUrl="/ai/suggest" />);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });

    expect(undoSpy).not.toHaveBeenCalled();

    undoSpy.mockRestore();
  });

  it('keydown without Ctrl does not trigger undo or redo', () => {
    const undoSpy = vi.spyOn(usePageStore.temporal.getState(), 'undo');
    const redoSpy = vi.spyOn(usePageStore.temporal.getState(), 'redo');

    render(<PageBuilder publishUrl="/pages/publish" aiSuggestUrl="/ai/suggest" />);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: false, shiftKey: false });

    expect(undoSpy).not.toHaveBeenCalled();
    expect(redoSpy).not.toHaveBeenCalled();

    undoSpy.mockRestore();
    redoSpy.mockRestore();
  });

  it('keyboard listener is removed when PageBuilder unmounts', () => {
    const undoSpy = vi.spyOn(usePageStore.temporal.getState(), 'undo');

    const { unmount } = render(
      <PageBuilder publishUrl="/pages/publish" aiSuggestUrl="/ai/suggest" />,
    );

    unmount();

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: false });

    expect(undoSpy).not.toHaveBeenCalled();

    undoSpy.mockRestore();
  });
});
