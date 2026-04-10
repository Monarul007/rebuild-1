import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { usePageStore } from './store/PageStore';
import { createHeroSection, createFeaturesSection, createCtaSection } from './presets';
import { HtmlImportModal } from './HtmlImportModal';
import type { PrimitiveType } from './primitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarProps {
  onOpenHtmlModal?: () => void;
}

// ---------------------------------------------------------------------------
// Preset cards config
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: 'Hero', factory: createHeroSection },
  { label: 'Features', factory: createFeaturesSection },
  { label: 'CTA', factory: createCtaSection },
] as const;

// ---------------------------------------------------------------------------
// Primitives config
// ---------------------------------------------------------------------------

const PRIMITIVES: { label: string; tag: string; primitiveType: PrimitiveType }[] = [
  { label: 'Text',      tag: 'p',      primitiveType: 'text' },
  { label: 'Heading',   tag: 'h1',     primitiveType: 'heading' },
  { label: 'Image',     tag: 'img',    primitiveType: 'image' },
  { label: 'Video',     tag: 'video',  primitiveType: 'video' },
  { label: 'Button',    tag: 'button', primitiveType: 'button' },
  { label: 'Divider',   tag: 'hr',     primitiveType: 'divider' },
  { label: 'Container', tag: 'div',    primitiveType: 'container' },
  { label: 'Spacer',    tag: 'div',    primitiveType: 'spacer' },
];

// ---------------------------------------------------------------------------
// DraggablePrimitive
// ---------------------------------------------------------------------------

interface DraggablePrimitiveProps {
  label: string;
  tag: string;
  primitiveType: PrimitiveType;
}

function DraggablePrimitive({ label, tag, primitiveType }: DraggablePrimitiveProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `primitive-${primitiveType}`,
    data: { type: 'primitive', primitiveType },
  });

  return (
    <div
      ref={setNodeRef}
      role="listitem"
      aria-label={`${label} element`}
      {...listeners}
      {...attributes}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 10px',
        borderRadius: '6px',
        cursor: isDragging ? 'grabbing' : 'grab',
        fontSize: '13px',
        color: '#374151',
        userSelect: 'none',
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? '#f3f4f6' : 'transparent',
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#9ca3af',
          width: '36px',
          flexShrink: 0,
        }}
      >
        {`<${tag}>`}
      </span>
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sidebar({ onOpenHtmlModal }: SidebarProps) {
  const addSection = usePageStore((s) => s.addSection);
  const [htmlModalOpen, setHtmlModalOpen] = useState(false);

  function handleOpenHtmlModal() {
    if (onOpenHtmlModal) {
      onOpenHtmlModal();
    } else {
      setHtmlModalOpen(true);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' }}>
      {/* Presets section */}
      <section aria-label="Preset sections">
        <h2
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#6b7280',
            marginBottom: '8px',
          }}
        >
          Presets
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
          {PRESETS.map(({ label, factory }) => (
            <button
              key={label}
              aria-label={`Add ${label} section`}
              onClick={() => addSection(factory())}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#111827',
                textAlign: 'left',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  background: '#eef2ff',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  flexShrink: 0,
                }}
              >
                {label === 'Hero' ? '🦸' : label === 'Features' ? '✨' : '📣'}
              </span>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Primitives section */}
      <section aria-label="Primitive elements" style={{ flex: 1 }}>
        <h2
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#6b7280',
            marginBottom: '8px',
          }}
        >
          Elements
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {PRIMITIVES.map(({ label, tag, primitiveType }) => (
            <DraggablePrimitive
              key={primitiveType}
              label={label}
              tag={tag}
              primitiveType={primitiveType}
            />
          ))}
        </div>
      </section>

      {/* Paste HTML button */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb', marginTop: '12px' }}>
        <button
          aria-label="Paste HTML"
          onClick={handleOpenHtmlModal}
          style={{
            width: '100%',
            padding: '9px 12px',
            background: 'transparent',
            border: '1px dashed #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1';
            (e.currentTarget as HTMLButtonElement).style.color = '#6366f1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db';
            (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
          }}
        >
          <span>{'</>'}</span>
          Paste HTML
        </button>
      </div>

      <HtmlImportModal
        isOpen={htmlModalOpen}
        onClose={() => setHtmlModalOpen(false)}
      />
    </div>
  );
}
