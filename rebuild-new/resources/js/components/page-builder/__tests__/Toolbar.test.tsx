import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { Toolbar } from '../Toolbar';
import { usePageStore } from '../store/PageStore';
import type { SectionNode } from '../types';
import { nanoid } from 'nanoid';

// ---------------------------------------------------------------------------
// Mock @inertiajs/react router
// ---------------------------------------------------------------------------

const { mockRouterPost } = vi.hoisted(() => ({
  mockRouterPost: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
  router: {
    post: mockRouterPost,
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  usePageStore.setState({ sections: [], selectedNodeId: null, viewport: 'desktop' });
  usePageStore.temporal.getState().clear();
}

function makeSection(overrides: Partial<SectionNode> = {}): SectionNode {
  return {
    id: nanoid(10),
    type: 'preset',
    tag: 'section',
    classes: ['bg-white'],
    overrides: {},
    children: [],
    textContent: 'Hello',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Publish flow — successful POST (Requirements 11.4)
// ---------------------------------------------------------------------------

describe('Toolbar — Publish: successful POST', () => {
  beforeEach(() => {
    resetStore();
    mockRouterPost.mockReset();
  });

  afterEach(cleanup);

  it('calls Inertia router.post with the correct URL on Publish click', () => {
    mockRouterPost.mockImplementation((_url: string, _data: unknown, callbacks: Record<string, () => void>) => {
      callbacks.onSuccess?.();
      callbacks.onFinish?.();
    });

    render(<Toolbar publishUrl="/pages/publish" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    expect(mockRouterPost).toHaveBeenCalledTimes(1);
    expect(mockRouterPost.mock.calls[0][0]).toBe('/pages/publish');
  });

  it('calls Inertia router.post with the exported schema as the payload', () => {
    const section = makeSection();
    usePageStore.setState({ sections: [section] });

    mockRouterPost.mockImplementation((_url: string, _data: unknown, callbacks: Record<string, () => void>) => {
      callbacks.onSuccess?.();
      callbacks.onFinish?.();
    });

    render(<Toolbar publishUrl="/pages/publish" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    const postedData = mockRouterPost.mock.calls[0][1];
    expect(postedData).toMatchObject({
      version: 1,
      sections: expect.arrayContaining([
        expect.objectContaining({ id: section.id }),
      ]),
    });
  });

  it('shows a success notification after a successful publish', async () => {
    mockRouterPost.mockImplementation((_url: string, _data: unknown, callbacks: Record<string, () => void>) => {
      callbacks.onSuccess?.();
      callbacks.onFinish?.();
    });

    render(<Toolbar publishUrl="/pages/publish" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByRole('alert').textContent).toMatch(/published successfully/i);
    });
  });
});

// ---------------------------------------------------------------------------
// Publish flow — error shows notification (Requirement 11.6)
// ---------------------------------------------------------------------------

describe('Toolbar — Publish: error shows notification', () => {
  beforeEach(() => {
    resetStore();
    mockRouterPost.mockReset();
  });

  afterEach(cleanup);

  it('displays an error notification when the POST fails', async () => {
    mockRouterPost.mockImplementation((_url: string, _data: unknown, callbacks: Record<string, () => void>) => {
      callbacks.onError?.();
      callbacks.onFinish?.();
    });

    render(<Toolbar publishUrl="/pages/publish" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByRole('alert').textContent).toMatch(/publish failed/i);
    });
  });

  it('error notification is visually distinct (red background)', async () => {
    mockRouterPost.mockImplementation((_url: string, _data: unknown, callbacks: Record<string, () => void>) => {
      callbacks.onError?.();
      callbacks.onFinish?.();
    });

    render(<Toolbar publishUrl="/pages/publish" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.style.background).toBe('rgb(220, 38, 38)');
    });
  });
});

// ---------------------------------------------------------------------------
// Publish flow — error retains store state (Requirement 11.6)
// ---------------------------------------------------------------------------

describe('Toolbar — Publish: error retains store state', () => {
  beforeEach(() => {
    resetStore();
    mockRouterPost.mockReset();
  });

  afterEach(cleanup);

  it('store sections are unchanged after a failed publish', async () => {
    const section = makeSection({ textContent: 'Keep me' });
    usePageStore.setState({ sections: [section] });

    mockRouterPost.mockImplementation((_url: string, _data: unknown, callbacks: Record<string, () => void>) => {
      callbacks.onError?.();
      callbacks.onFinish?.();
    });

    render(<Toolbar publishUrl="/pages/publish" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => screen.getByRole('alert'));

    const { sections } = usePageStore.getState();
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe(section.id);
    expect(sections[0].textContent).toBe('Keep me');
  });

  it('store selectedNodeId is unchanged after a failed publish', async () => {
    const section = makeSection();
    usePageStore.setState({ sections: [section], selectedNodeId: section.id });

    mockRouterPost.mockImplementation((_url: string, _data: unknown, callbacks: Record<string, () => void>) => {
      callbacks.onError?.();
      callbacks.onFinish?.();
    });

    render(<Toolbar publishUrl="/pages/publish" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => screen.getByRole('alert'));

    const { selectedNodeId } = usePageStore.getState();
    expect(selectedNodeId).toBe(section.id);
  });

  it('store viewport is unchanged after a failed publish', async () => {
    usePageStore.setState({ viewport: 'mobile' });

    mockRouterPost.mockImplementation((_url: string, _data: unknown, callbacks: Record<string, () => void>) => {
      callbacks.onError?.();
      callbacks.onFinish?.();
    });

    render(<Toolbar publishUrl="/pages/publish" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => screen.getByRole('alert'));

    const { viewport } = usePageStore.getState();
    expect(viewport).toBe('mobile');
  });
});
