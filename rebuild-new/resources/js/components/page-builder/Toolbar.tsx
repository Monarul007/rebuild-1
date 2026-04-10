import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { usePageStore } from './store/PageStore';
import type { Viewport } from './types';

interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface ToolbarProps {
  publishUrl: string;
  publishMethod?: 'post' | 'put';
  initialTitle?: string;
}

// Simple SVG icons for viewport toggles
function MobileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function TabletIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function DesktopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

const VIEWPORT_BUTTONS: { viewport: Viewport; label: string; Icon: React.FC }[] = [
  { viewport: 'mobile', label: 'Mobile (375px)', Icon: MobileIcon },
  { viewport: 'tablet', label: 'Tablet (768px)', Icon: TabletIcon },
  { viewport: 'desktop', label: 'Desktop', Icon: DesktopIcon },
];

export function Toolbar({ publishUrl, publishMethod = 'post', initialTitle = 'Untitled Page' }: ToolbarProps) {
  const viewport = usePageStore((s) => s.viewport);
  const setViewport = usePageStore((s) => s.setViewport);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [title, setTitle] = useState(initialTitle);

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification) {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setNotification(null), 3000);
    }
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [notification]);

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message });
  }

  function handleUndo() {
    usePageStore.temporal.getState().undo();
  }

  function handleRedo() {
    usePageStore.temporal.getState().redo();
  }

  function handlePublish() {
    const schema = usePageStore.getState().exportSchema();
    setIsPublishing(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router[publishMethod](publishUrl, { schema, title } as any, {
      onSuccess: () => {
        setIsPublishing(false);
        showNotification('success', 'Page published successfully.');
      },
      onError: () => {
        setIsPublishing(false);
        showNotification('error', 'Publish failed. Please try again.');
      },
      onFinish: () => {
        setIsPublishing(false);
      },
    });
  }

  return (
    <>
      {/* Toast notification */}
      {notification && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            background: notification.type === 'success' ? '#16a34a' : '#dc2626',
            color: '#ffffff',
            fontWeight: 500,
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '360px',
          }}
        >
          {notification.message}
        </div>
      )}

      <div
        role="toolbar"
        aria-label="Page builder toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
          height: '48px',
          flexShrink: 0,
        }}
      >
        {/* Back Link */}
        <button
          onClick={() => router.get('/pages')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            color: '#6b7280',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            marginRight: '8px',
            borderRadius: '4px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          ← All Pages
        </button>

        <div style={{ width: '1px', height: '24px', background: '#e5e7eb', marginRight: '8px' }} />

        {/* Viewport toggles */}
        <div role="group" aria-label="Viewport" style={{ display: 'flex', gap: '4px' }}>
          {VIEWPORT_BUTTONS.map(({ viewport: vp, label, Icon }) => (
            <button
              key={vp}
              aria-label={label}
              aria-pressed={viewport === vp}
              onClick={() => setViewport(vp)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                border: '1px solid',
                borderColor: viewport === vp ? '#3b82f6' : '#d1d5db',
                borderRadius: '6px',
                background: viewport === vp ? '#eff6ff' : 'transparent',
                color: viewport === vp ? '#3b82f6' : '#6b7280',
                cursor: 'pointer',
              }}
            >
              <Icon />
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '24px', background: '#e5e7eb', margin: '0 4px' }} />

        {/* Undo / Redo */}
        <button
          aria-label="Undo"
          onClick={handleUndo}
          style={{
            padding: '4px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#374151',
          }}
        >
          ↩ Undo
        </button>
        <button
          aria-label="Redo"
          onClick={handleRedo}
          style={{
            padding: '4px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#374151',
          }}
        >
          ↪ Redo
        </button>

        {/* Title Input */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page Title"
            style={{
              padding: '4px 8px',
              border: '1px solid transparent',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#111827',
              background: 'transparent',
              outline: 'none',
              textAlign: 'center',
              width: '200px',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#d1d5db')}
            onBlur={(e) => (e.target.style.borderColor = 'transparent')}
          />
        </div>

        {/* Publish */}
        <button
          aria-label="Publish"
          onClick={handlePublish}
          disabled={isPublishing}
          style={{
            padding: '6px 16px',
            border: 'none',
            borderRadius: '6px',
            background: isPublishing ? '#93c5fd' : '#3b82f6',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            cursor: isPublishing ? 'not-allowed' : 'pointer',
            opacity: isPublishing ? 0.8 : 1,
          }}
        >
          {isPublishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </>
  );
}
